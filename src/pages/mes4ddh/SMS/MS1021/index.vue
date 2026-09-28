<script setup lang="ts">
/** 对应 FrmMS1021（炼钢总厂/一炼钢 机台物料信息维护，2 菜单共用）：DDH.Winforms.SMS.Forms.FrmMS1021
 *  已接入：frmMS1021Api.query（查询，GetParamDto 强校验产线+机台）/ checkSave + save（保存：先 CheckSave →
 *            确认「确定保存数据？」→ Save 整表 → 重查）/
 *          publicKVApi.getKvInfo（Load 拉 LF 喂线机专用物料 A0000:MS_LF_SPECIAL_MTRL → CMtrlName 列
 *            条件编辑器候选 + 吐丝机物料维护按钮显隐）/
 *          tPa1000Api.queryLines+queryMachine（产线只读 code-name，机台按产线过滤；机台变更 → ShowOperationButton+查询）
 *  待接入：吐丝机物料维护按钮 → FrmMS1021_SpecialMtrlInfo 二级弹窗占位（弹窗关闭后原逻辑会重拉 KV，web 占位后重拉）
 *  cQueryString：JSON {FactoryCode, LineCode}（useMenuQuery；缺参照 C# 文案 toast）
 *  列集：18 可见 + 28 隐藏（extract FrmMS1021ViewDto；实体纠偏：CUnit→计量单位、审计→最后更新人/最后更新时间、
 *        CMachineCode→机台、CType→时刻物料非唯一投料类型）
 *  已知偏差：换料时间/下次换料时间行内编辑未迁（datetime 单元格编辑器），两列只读展示
 *  字段桥接：extract PascalCase → 后端 camelCase（bridge 双写） */
import { computed, nextTick, onMounted, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconDeviceFloppy, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  SelectionChangedEvent,
  ValueGetterParams,
  ValueSetterParams,
} from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { NextStrId } from "@/lib/yitIdHelper";
import { frmMS1021Api, publicKVApi, tPa1000Api } from "@/api/mes4ddh/sms.swagger";

const { toast } = useToast();
const { raw: qsRaw } = useMenuQuery();
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

/** 原 MtrlTypeEnumFormatter（列显示）；行内新增默认值用 ToString 名 */
const MTRL_TYPE: Record<string, string> = {
  LiaoCangTouLiao: "料仓投料",
  RenGongTouLiao: "人工投料",
  HuiLuGangShui: "回炉钢水",
  FeiGang: "废钢",
  ZhaGang: "渣钢",
  TieShui: "铁水",
  "10": "料仓投料",
  "20": "人工投料",
  "30": "回炉钢水",
  "40": "废钢",
  "50": "渣钢",
  "60": "铁水",
};
const mtrlFmt = (p: { value?: unknown }) => {
  const v = p.value == null ? "" : String(p.value);
  return v ? (MTRL_TYPE[v] ?? v) : "";
};

const colDefs = ref<ColDef[]>(
  bridge([
    { field: "CLineName", headerName: "产线名称", width: 120 },
    { field: "CMachineName", headerName: "机台名称", width: 120 },
    { field: "CSiloCode", headerName: "料仓编码", width: 120, editable: true },
    { field: "CSiloName", headerName: "料仓描述", width: 130, editable: true },
    { field: "CMtrlCode", headerName: "物料编码", width: 120, editable: true },
    {
      field: "CMtrlName",
      headerName: "物料描述",
      width: 160,
      editable: true,
      // 原 gridView1_CustomRowCellEdit：机台编码含 LF/RH 且料仓名含「喂丝」时换成喂线机物料下拉
      cellEditorSelector: (p: { data?: Record<string, unknown> }) => {
        const mc = machineCode.value ?? "";
        const silo = String(p.data?.cSiloName ?? p.data?.CSiloName ?? "");
        if (mc.includes("LF") || mc.includes("RH")) {
          if (silo.includes("喂丝") && lfMtrlNames.value.length) {
            return { component: "agSelectCellEditor", params: { values: lfMtrlNames.value } };
          }
        }
        return { component: "agTextCellEditor" };
      },
    },
    { field: "CMtrlNameEn", headerName: "物料英文名称", width: 150, editable: true },
    { field: "CFeedingMtrlType", headerName: "投料物料种类", width: 130, valueFormatter: mtrlFmt },
    { field: "CUnit", headerName: "计量单位", width: 100, editable: true },
    { field: "CChangeTime", headerName: "换料时间", width: 150 },
    { field: "CNextTime", headerName: "下次换料时间", width: 150 },
    { field: "CSiloBackup", headerName: "料仓备注", width: 130, editable: true },
    { field: "CEnable", headerName: "启用", width: 80, editable: true, cellRenderer: "agCheckboxCellRenderer" },
    { field: "CBackup", headerName: "备注", width: 130, editable: true },
    { field: "Creator", headerName: "创建人", width: 112 },
    { field: "CreateTime", headerName: "创建时间", width: 150 },
    { field: "LastModifier", headerName: "最后更新人", width: 112 },
    { field: "LastModifyTime", headerName: "最后更新时间", width: 150 },
    { field: "Id", headerName: "主键", width: 120, hide: true },
    { field: "CSiloId", headerName: "料仓数据id", width: 120, hide: true },
    { field: "CFactoryCode", headerName: "工厂", width: 120, hide: true },
    { field: "CFactoryName", headerName: "工厂名称", width: 120, hide: true },
    { field: "CLineCode", headerName: "产线", width: 120, hide: true },
    { field: "CProc", headerName: "工序", width: 120, hide: true },
    { field: "CProcName", headerName: "工序名称", width: 120, hide: true },
    { field: "CMachineCode", headerName: "机台", width: 120, hide: true },
    { field: "CMachineNameShort", headerName: "机台名称简称", width: 130, hide: true },
    { field: "CSiloGrp", headerName: "料仓分组", width: 120, hide: true },
    { field: "CSiloGrpIdx", headerName: "料仓分组序号", width: 130, hide: true },
    { field: "CSiloGrpIdxShow", headerName: "料仓分组展示序号", width: 150, hide: true },
    { field: "CSiloVolume", headerName: "料仓容量", width: 120, hide: true },
    { field: "CTimeMtrlUnique", headerName: "时刻物料唯一", width: 130, hide: true },
    { field: "CQuick", headerName: "快捷换料", width: 120, hide: true },
    { field: "CStock", headerName: "关联库存", width: 120, hide: true },
    { field: "CType", headerName: "时刻物料非唯一投料类型", width: 170, hide: true },
    { field: "CTypeNums", headerName: "时刻物料非唯一投料量", width: 170, hide: true },
    { field: "CAdjustType", headerName: "投料调整类型", width: 130, hide: true },
    { field: "CAdjustTypeNums", headerName: "投料调整量", width: 130, hide: true },
    { field: "CTimestamp", headerName: "时间戳", width: 120, hide: true },
    { field: "CSw01", headerName: "备用字段1", width: 120, hide: true },
    { field: "CSw02", headerName: "备用字段2", width: 120, hide: true },
    { field: "CSw03", headerName: "备用字段3", width: 120, hide: true },
    { field: "CSw04", headerName: "备用字段4", width: 120, hide: true },
    { field: "CSw05", headerName: "备用字段5", width: 120, hide: true },
    { field: "CSw06", headerName: "备用字段6", width: 120, hide: true },
    { field: "Selected", headerName: "选择", width: 80, hide: true },
  ]),
);

const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>();
const selected = ref<any | null>(null);

const lineCode = ref("");
const lineText = ref("");
const machineCode = ref<string | null>(null);
const machineOptions = ref<{ label: string; value: string }[]>([]);
/** LF 喂线机专用物料（原 Full_lfMtrlDatas） */
const lfMtrlDatas = ref<Array<Record<string, unknown>>>([]);
const lfMtrlNames = computed(() => lfMtrlDatas.value.map((x) => String(x.cName ?? x.CName ?? "")).filter(Boolean));
/** ShowOperationButton：机台编码以 LF/RH 结尾且喂线物料非空时显示（原 Visible=false 默认隐藏） */
const showTuSiBtn = computed(() => {
  const mc = machineCode.value ?? "";
  return !!mc && (mc.endsWith("LF") || mc.endsWith("RH")) && lfMtrlNames.value.length > 0;
});

const tipStr = "注意：该操作并不会直接提交数据库，需通过“保存”将操作提交至数据库！";
const qsFormat = '{"FactoryCode":null,"LineCode":null}';
function parseQs(): { LineCode?: string } | null {
  if (!qsRaw) {
    toast(
      `界面必须配置注入参数，MES程序版本可能已严重落后，请退出并重新打开MES程序！\n若问题仍未得到解决，请联系管理员！\n界面注入参数格式为：'${qsFormat}'`,
      4000,
      "warn",
    );
    return null;
  }
  try {
    return JSON.parse(qsRaw) as { LineCode?: string };
  } catch {
    toast(`界面参数错误应为:${qsFormat}，\nMES程序版本可能已严重落后，请退出并重新打开MES程序！`, 4000, "warn");
    return null;
  }
}

async function loadLines() {
  try {
    const list = (await tPa1000Api.queryLines()) ?? [];
    const map = new Map<string, string>();
    for (const r of list as Array<Record<string, unknown>>) {
      const code = (r.cCode ?? r.cLineCode ?? "") as string;
      if (code) map.set(code, (r.cName ?? r.cLineName ?? "") as string);
    }
    const n = map.get(lineCode.value);
    lineText.value = n ? `${lineCode.value}-${n}` : lineCode.value;
  } catch {
    lineText.value = lineCode.value;
    /* 拦截层已 toast */
  }
}

async function loadMachines() {
  try {
    const list = (await tPa1000Api.queryMachine(lineCode.value || null)) ?? [];
    machineOptions.value = (list as Array<Record<string, unknown>>)
      .filter((r) => r.cCode != null)
      .map((r) => ({ label: (r.cSimpName ?? r.cName ?? r.cCode) as string, value: r.cCode as string }));
  } catch {
    machineOptions.value = [];
    /* 拦截层已 toast */
  }
}

/** Full_lfMtrlDatas：GetKvInfo(A0000:MS_LF_SPECIAL_MTRL) → 过滤空名 + 按 COrder 排序 */
async function loadLfMtrl() {
  try {
    const list = (await publicKVApi.getKvInfo({ kvPid: "A0000:MS_LF_SPECIAL_MTRL" })) ?? [];
    lfMtrlDatas.value = (list as Array<Record<string, unknown>>)
      .filter((x) => {
        const n = x.cName ?? x.CName;
        return n != null && String(n) !== "";
      })
      .sort((a, b) => Number(a.cOrder ?? a.COrder ?? 0) - Number(b.cOrder ?? b.COrder ?? 0));
  } catch {
    lfMtrlDatas.value = [];
    /* 拦截层已 toast */
  }
}

/** GetParamDto(checkCondition=true 默认)：产线与机台均不得为空 */
function paramDto(check = true) {
  if (check && (!lineCode.value || !machineCode.value)) {
    toast("禁止操作，产线和机台均不得为空！", 2500, "warn");
    return null;
  }
  const mo = machineOptions.value.find((o) => o.value === machineCode.value);
  return {
    lineCode: lineCode.value,
    lineName: lineText.value,
    machineCode: machineCode.value ?? "",
    machineName: mo?.label ?? machineCode.value ?? "",
  };
}

async function query() {
  const p = paramDto();
  if (!p) return;
  querying.value = true;
  try {
    const list = (await frmMS1021Api.query(p)) ?? [];
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

/** btnAdd_Click：按 .cs 默认值整行新增（枚举字段用 ToString 名） */
function onAdd() {
  const p = paramDto();
  if (!p) return;
  const mo = machineOptions.value.find((o) => o.value === machineCode.value);
  rows.value = [
    ...rows.value,
    {
      id: NextStrId(),
      cSiloId: "",
      cFactoryCode: "",
      cFactoryName: "",
      cLineCode: p.lineCode,
      cLineName: p.lineName,
      cProc: "",
      cProcName: "",
      cMachineCode: p.machineCode,
      cMachineName: p.machineName,
      cMachineNameShort: (mo?.label ?? "") as string,
      cSiloCode: "",
      cSiloName: "",
      cSiloGrp: "",
      cSiloGrpIdx: null,
      cSiloGrpIdxShow: "",
      cSiloVolume: null,
      cTimeMtrlUnique: true,
      cQuick: false,
      cSiloBackup: "",
      cFeedingMtrlType: "LiaoCangTouLiao",
      cEnable: true,
      cMtrlCode: "",
      cMtrlName: "",
      cMtrlNameEn: "",
      cUnit: "千克",
      cStock: false,
      cType: "Percentage",
      cTypeNums: 1,
      cAdjustType: "Fixed",
      cAdjustTypeNums: 0,
      cChangeTime: new Date().toISOString(),
    },
  ];
}

function gv(r: Record<string, unknown>, f: string) {
  const ck = f.charAt(0).toLowerCase() + f.slice(1);
  return r[ck] ?? r[f];
}

function onRemove() {
  const p = paramDto(true);
  if (!p) return;
  const row = selected.value;
  if (!row) return;
  const ok = window.confirm(
    `确定删除选择的机台为：‘${gv(row, "CMachineName") ?? ""}’，料仓名称为：‘${gv(row, "CSiloName") ?? ""}’的配置数据？`,
  );
  if (!ok) return;
  rows.value = rows.value.filter((r) => r !== row);
  selected.value = null;
}

async function onSave() {
  const p = paramDto();
  if (!p) return;
  querying.value = true;
  try {
    await frmMS1021Api.checkSave({ paramDto: p, datas: rows.value });
    if (!window.confirm("确定保存数据？")) return;
    await frmMS1021Api.save({ paramDto: p, datas: rows.value });
    await query();
    toast("保存成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** 吐丝机物料维护：原 FrmMS1021_SpecialMtrlInfo.ShowDialog() 后重拉 KV */
function onTuSiMtrl() {
  toast("FrmMS1021_SpecialMtrlInfo：二级弹窗待接入", 2500, "warn");
  void loadLfMtrl();
}

function onMachineChange() {
  void query();
}

onMounted(async () => {
  const qs = parseQs();
  lineCode.value = qs?.LineCode ?? "";
  await Promise.all([loadLines(), loadMachines(), loadLfMtrl()]);
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- stackPanel1：产线/机台 + 查询/添加/删除/保存/吐丝机物料维护（顺序照 Controls.Add） -->
    <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">产线</label>
      <InputText :model-value="lineText" disabled class="w-32 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">机台</label>
      <Select
        v-model="machineCode"
        :options="machineOptions"
        option-label="label"
        option-value="value"
        show-clear
        placeholder="请选择"
        class="w-36 shrink-0"
        @value-change="onMachineChange"
      />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :title="tipStr" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :title="tipStr" @click="onRemove">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
      <!-- 原 Designer Visible=false，运行期 ShowOperationButton 控制显隐 -->
      <Button v-if="showTuSiBtn" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onTuSiMtrl">
        吐丝机物料维护
      </Button>
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
