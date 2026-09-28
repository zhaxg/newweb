<script setup lang="ts">
/** 对应 FrmMS1030（钢包管理；4 菜单共用：LG01/LG02 × Type=GB/ZL，cQueryString JSON 驱动）：DDH.Winforms.SMS.Forms.FrmMS1030
 *  已接入：frmMS1030Api.query（查询：LineCode/Type/PackNo/LoadUnUsePackData；Type 枚举数值化，解析失败照
 *            「在转换包类型时发生了异常，请联系管理员！」toast）/
 *          checkRemoveData + removeData（删除前置校验 → 确认「确定删除？」→ 删除 → 重查）/
 *          checkUpdatePackState + updatePackState（备用/重砌/在线/报废：前置校验 →
 *            确认「是否更新所选数据的状态为‘{名称}？」→ 更新 → 重查；state 按 PackStateEnum 数值传）
 *  待接入：添加/修改 → FrmMS1030_Edit 二级弹窗占位（弹窗内 CheckAddData/SaveData）；维修 → FrmMS1030_Repair 占位；
 *          维修记录 → FrmMS1030_RepairLog 占位；烘烤 → FrmMS1030_HK 占位（确认后调 updatePackStateForBake，随弹窗接入）
 *  cQueryString：JSON {LineCode, Type}（useMenuQuery；GB/ZL 运行期列显隐照 Load：GB 隐藏炉座号/出钢口/滑板列，
 *    ZL 隐藏包况/包号/透气芯次数列）
 *  列集：24 可见 + 17 隐藏（extract FrmMS1030ViewDto；实体纠偏：CPotNo→包号、审计→最后更新人/最后更新时间）
 *  已知偏差：炉座号列原 MachineFormatter 转码显示名称未迁（无机台字典接入该列），显示原始编码
 *  字段桥接：extract PascalCase → 后端 camelCase（bridge 双写） */
import { computed, nextTick, onMounted, ref } from "vue";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconFlame, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  SelectionChangedEvent,
  ValueFormatterParams,
  ValueGetterParams,
  ValueSetterParams,
} from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { frmMS1030Api } from "@/api/mes4ddh/sms.swagger";

const { toast } = useToast();
const { raw: qsRaw, json: qsJson } = useMenuQuery();
const theme = makeHmxGridTheme();

/** extract 字段 PascalCase → 后端 JSON camelCase 桥接 */
function bridge(cols: ColDef[]): ColDef[] {
  return cols.map((c) => {
    if (!c.field) return c;
    const f = c.field;
    const ck = f.charAt(0).toLowerCase() + f.slice(1);
    return {
      ...c,
      valueGetter: (p: ValueGetterParams) => {
        const d = p.data as Record<string, unknown> | undefined;
        return d ? (d[ck] ?? d[f]) : undefined;
      },
      valueSetter: (p: ValueSetterParams) => {
        const d = p.data as Record<string, unknown> | undefined;
        if (!d) return false;
        d[ck] = p.newValue;
        d[f] = p.newValue;
        return true;
      },
    };
  });
}

/* PackTypeEnum：TB=0 铁包 / GB=1 钢包 / ZJB=2 中间包 / ZL=3 转炉（EnumCboxValueType.String → 名称值） */
const PACK_TYPE_OPTIONS = [
  { label: "铁包", value: "TB" },
  { label: "钢包", value: "GB" },
  { label: "中间包", value: "ZJB" },
  { label: "转炉", value: "ZL" },
];
const PACK_TYPE_NUM: Record<string, number> = { TB: 0, GB: 1, ZJB: 2, ZL: 3 };
/* PackStateEnum：行值为 ToString 名 */
const PACK_STATE_FMT: Record<string, string> = {
  Normal: "备用",
  Bake: "烘烤",
  OnLine: "在线",
  Used: "正在使用",
  Service: "维修",
  Scrapped: "报废",
  Rebuild: "重砌",
  DownLine: "下线",
};
const packStateFmt = (p: ValueFormatterParams) => {
  const v = p.value == null ? "" : String(p.value);
  return v ? (PACK_STATE_FMT[v] ?? v) : "";
};

const qsFormat = '{"LineCode":null,"Type":null}';
function parseQs(): { LineCode?: string; Type?: string } | null {
  if (!qsRaw) {
    toast(
      `界面必须配置注入参数，MES程序版本可能已严重落后，请退出并重新打开MES程序！\n若问题仍未得到解决，请联系管理员！\n界面注入参数格式为：'${qsFormat}'`,
      4000,
      "warn",
    );
    return null;
  }
  try {
    return JSON.parse(qsRaw) as { LineCode?: string; Type?: string };
  } catch {
    toast(`界面参数错误应为:${qsFormat}，\nMES程序版本可能已严重落后，请退出并重新打开MES程序！`, 4000, "warn");
    return null;
  }
}

const lineCode = ref("");
const packType = ref<string | null>(null);
const packNo = ref("");
const loadUnUse = ref(false);
/** isZL：cboBaoType 值固定来自 qs（原 ReadOnly=true）；列显隐在 Load 时按 Type 决定 */
const isZL = computed(() => packType.value === "ZL");

/** 列集：24 可见 + 17 隐藏；GB 隐藏炉座号/出钢口/滑板，ZL 隐藏包况/包号/透气芯（照 Load 运行期 Visible=false） */
const baseCols: ColDef[] = [
  { field: "CPotNo", headerName: "包号", width: 110 },
  { field: "CPotType", headerName: "包况", width: 100 },
  { field: "CBofNo", headerName: "炉座号", width: 110 },
  { field: "NCapacity", headerName: "容量", width: 90 },
  { field: "IUsetimes", headerName: "包龄", width: 90 },
  { field: "IFrcstTimes", headerName: "预警包龄", width: 100 },
  { field: "IMaxTimes", headerName: "最大包龄", width: 100 },
  { field: "NTqxTimes", headerName: "透气芯次数", width: 110 },
  { field: "CPackState", headerName: "设备状态", width: 100 },
  { field: "TBakeBeg", headerName: "烘烤开始时间", width: 150 },
  { field: "TBakeEnd", headerName: "烘烤结束时间", width: 150 },
  { field: "CBakeBackup", headerName: "烘烤备注", width: 130 },
  { field: "NServiceTime", headerName: "维修次数", width: 100 },
  { field: "NCgkA", headerName: "A出钢口使用次数", width: 140 },
  { field: "NCgkB", headerName: "B出钢口使用次数", width: 140 },
  { field: "NHuaban1", headerName: "1滑板使用次数", width: 130 },
  { field: "NHuaban2", headerName: "2滑板使用次数", width: 130 },
  { field: "CManufacturer", headerName: "生产厂家", width: 130 },
  { field: "CBackup", headerName: "备注", width: 130 },
  { field: "CEnable", headerName: "启用", width: 80 },
  { field: "Creator", headerName: "创建人", width: 112 },
  { field: "CreateTime", headerName: "创建时间", width: 150 },
  { field: "LastModifier", headerName: "最后更新人", width: 112 },
  { field: "LastModifyTime", headerName: "最后更新时间", width: 150 },
  { field: "Id", headerName: "主键", width: 120, hide: true },
  { field: "CFacNo", headerName: "工厂编码", width: 120, hide: true },
  { field: "CFacName", headerName: "工厂名称", width: 120, hide: true },
  { field: "CType", headerName: "类型", width: 100, hide: true },
  { field: "CIsUsed", headerName: "使用标识", width: 120, hide: true },
  { field: "DStartUseTime", headerName: "开始使用时间", width: 150, hide: true },
  { field: "CRepairId", headerName: "最新维修数据id", width: 140, hide: true },
  { field: "DScrapTime", headerName: "报废时间", width: 150, hide: true },
  { field: "CScrapUser", headerName: "报废操作人", width: 130, hide: true },
  { field: "CTimestamp", headerName: "时间戳", width: 150, hide: true },
  { field: "CSw01", headerName: "备用字段1", width: 120, hide: true },
  { field: "CSw02", headerName: "备用字段2", width: 120, hide: true },
  { field: "CSw03", headerName: "备用字段3", width: 120, hide: true },
  { field: "CSw04", headerName: "备用字段4", width: 120, hide: true },
  { field: "CSw05", headerName: "备用字段5", width: 120, hide: true },
  { field: "CSw06", headerName: "备用字段6", width: 120, hide: true },
  { field: "Selected", headerName: "选择", width: 80, hide: true },
];
const GB_HIDDEN = new Set(["CBofNo", "NCgkA", "NCgkB", "NHuaban1", "NHuaban2"]);
const ZL_HIDDEN = new Set(["CPotType", "CPotNo", "NTqxTimes"]);
// packType 在 onMounted 才由 qs 注入 → computed 保证 GB/ZL 列显隐随注入生效
const colDefs = computed<ColDef[]>(() =>
  bridge(
    baseCols.map((c) => {
      const f = c.field ?? "";
      const runtimeHide = isZL.value ? ZL_HIDDEN.has(f) : GB_HIDDEN.has(f);
      const extra: Partial<ColDef> = {};
      if (f === "CPackState") extra.valueFormatter = packStateFmt;
      if (f === "CEnable") extra.cellRenderer = "agCheckboxCellRenderer";
      return { ...c, ...(runtimeHide ? { hide: true } : {}), ...extra };
    }),
  ),
);

const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>();
const selected = ref<any | null>(null);

/** GetParamDto：包类型 TryParse 失败抛「在转换包类型时发生了异常，请联系管理员！」 */
function paramDto() {
  const t = packType.value ?? "";
  const num = PACK_TYPE_NUM[t];
  if (num == null) {
    toast("在转换包类型时发生了异常，请联系管理员！", 3000, "warn");
    return null;
  }
  return {
    lineCode: lineCode.value,
    type: num,
    packNo: packNo.value,
    loadUnUsePackData: loadUnUse.value,
  };
}

async function query() {
  const p = paramDto();
  if (!p) return;
  querying.value = true;
  try {
    const list = (await frmMS1030Api.query(p)) ?? [];
    rows.value = Array.isArray(list) ? list : [];
    selected.value = null;
    await nextTick();
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}
function onSelectionChanged(e: SelectionChangedEvent) {
  selected.value = e.api.getSelectedRows()[0] ?? null;
}

function gv(r: Record<string, unknown>, f: string) {
  const ck = f.charAt(0).toLowerCase() + f.slice(1);
  return r[ck] ?? r[f];
}

/** AddOrModify：GetParamDto 包类型校验 + 修改态行/报废校验 → 编辑弹窗占位 → 重查 */
async function addOrModify(modify: boolean) {
  const p = paramDto();
  if (!p) return;
  if (modify) {
    const row = selected.value;
    if (!row) {
      toast("请选择需要修改的数据！", 2500, "warn");
      return;
    }
    if (String(gv(row, "CPackState") ?? "") === "Scrapped") {
      toast("禁止修改，所选数据为报废状态！", 2500, "warn");
      return;
    }
  }
  toast("FrmMS1030_Edit：二级弹窗待接入", 2500, "warn");
  await query();
}

async function onRemove() {
  const row = selected.value;
  if (!row) return;
  await frmMS1030Api.checkRemoveData(row.id as string);
  if (!window.confirm("确定删除？")) return;
  querying.value = true;
  try {
    await frmMS1030Api.removeData(row.id as string);
    await query();
    toast("删除成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** 维修：报废态/状态域校验 → FrmMS1030_Repair 占位 */
async function onRepair() {
  const row = selected.value;
  if (!row) return;
  const st = String(gv(row, "CPackState") ?? "");
  if (st === "Scrapped") {
    toast("禁止操作，所选数据为报废状态！", 3000, "warn");
    return;
  }
  if (st !== "Normal" && st !== "Service") {
    toast(
      "禁止操作，当前包不是备用或维修状态！\n只有备用或维修状态的包才能执行维修操作！请先将包状态更新为备用或维修状态！",
      3500,
      "warn",
    );
    return;
  }
  toast("FrmMS1030_Repair：二级弹窗待接入", 2500, "warn");
}

function onRepairLog() {
  const row = selected.value;
  if (!row) return;
  toast("FrmMS1030_RepairLog：二级弹窗待接入", 2500, "warn");
}

/** 烘烤：报废态/状态域校验 → FrmMS1030_HK 占位（弹窗确认后原逻辑调 updatePackStateForBake） */
async function onHongKao() {
  const row = selected.value;
  if (!row) return;
  const st = String(gv(row, "CPackState") ?? "");
  if (st === "Scrapped") {
    toast("禁止操作，所选数据为报废状态！", 3000, "warn");
    return;
  }
  if (st !== "Normal" && st !== "Bake") {
    toast("禁止操作，只有备用状态或正在烘烤状态的包才能执行该操作！", 3000, "warn");
    return;
  }
  toast("FrmMS1030_HK：二级弹窗待接入（确认后调 updatePackStateForBake）", 3000, "warn");
}

/** UpdatePackSatate：备用/重砌/在线/报废 共用（checkUpdatePackState → 确认 → updatePackState → 重查） */
async function updatePackState(state: number, label: string) {
  const row = selected.value;
  if (!row) return;
  const id = row.id as string;
  await frmMS1030Api.checkUpdatePackState({ tms1030Id: id, state });
  if (!window.confirm(`是否更新所选数据的状态为‘${label}？`)) return;
  querying.value = true;
  try {
    await frmMS1030Api.updatePackState({ tms1030Id: id, state });
    await query();
    toast("操作成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

const onBeiYong = () => updatePackState(10, "备用");
const onChongQie = () => updatePackState(70, "重砌");
const onZaiXian = () => updatePackState(30, "在线");
const onBaoFei = () => updatePackState(60, "报废");

onMounted(() => {
  const qs = parseQs();
  lineCode.value = qs?.LineCode ?? "";
  packType.value = qs?.Type ?? null;
  // 原 Load 不自动查询（仅填充产线/包类别），查询由用户触发
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- stackPanel1：产线/包类别/包号/加载报废包数据 + 11 按钮（顺序照 Controls.Add） -->
    <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">产线</label>
      <InputText :model-value="lineCode" disabled class="w-24 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">包类别</label>
      <Select
        :model-value="packType"
        :options="PACK_TYPE_OPTIONS"
        option-label="label"
        option-value="value"
        disabled
        class="w-24 shrink-0"
      />
      <label class="shrink-0 text-xs text-muted-foreground">包号</label>
      <InputText v-model="packNo" placeholder="包号" class="w-28 shrink-0" />
      <span class="flex shrink-0 items-center gap-1">
        <Checkbox v-model="loadUnUse" binary input-id="ms1030LoadUnUse" />
        <label for="ms1030LoadUnUse" class="text-xs text-muted-foreground">加载报废包数据</label>
      </span>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="addOrModify(false)">添加</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="addOrModify(true)">修改</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onRemove">删除</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onBeiYong">备用</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onRepair">维修</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onRepairLog">维修记录</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onChongQie">重砌</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onHongKao">
        <IconFlame class="h-3 w-3" />烘烤
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onZaiXian">在线</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onBaoFei">报废</Button>
    </div>

    <!-- stackPanel4：原 Visible=false 的「占位控件」标签，按原样隐藏保留 -->
    <div class="hidden">
      <label class="text-xs text-muted-foreground">占位控件</label>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :pagination="false"
        :loading="querying"
        :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
