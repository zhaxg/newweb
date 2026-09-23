<script setup lang="ts">
/** 对应 FrmTag（自动化点位配置；2 菜单共用 LG01/LG02）：DDH.Winforms.SMS.Forms.Tag.FrmTag
 *  已接入：frmTagApi.queryTagInfo（查询：产线/机台强校验 + 自动化点位 + 加载所有数据；Load 默认选中首机台后自动查询
 *            ——照 ucLine1→ucMachine1.SelectedIndex=0→btnQuery 链）/
 *          frmTagApi.getRdbUseTypeEnumOF("O")+getRdbUseTypeEnumOF("F")+getRdbUseTypeEnumP("P")（Load 填
 *            CFunction 列转义字典）/ getAllTableFieldList（Load 填 CTableField 列转义字典）/
 *          frmTagApi.revemoData（删除：确认文案照抄 → ids 数组提交 → 重查）/
 *          frmTagApi.enableData + invalidData（启用/作废：状态前置校验 + 确认文案照抄 → ids 提交 → 重查）/
 *          tPa1000Api.queryLines+queryMachine（产线只读 code-name；机台变更自动查询）
 *  待接入：添加 → FrmTagEdit 二级弹窗占位（弹窗内 CheckSaveData/SaveData 与
 *          「确定提交编辑的数据？」随弹窗接入）；修改 → FrmTagEdit 占位（无行时静默返回，照 .cs）
 *  cQueryString：JSON {PlantCode, LineCode}（useMenuQuery；缺参文案照 FrmTag HandleQueryString 原文）
 *  列集：18 可见 + 17 隐藏（extract FrmTagViewDto；实体纠偏：CUnit→点位采集值单位、CMachineCode→机台、
 *        审计→最后更新人/最后更新时间）；原 gridView OptionsBehavior.Editable=false → 全列只读
 *  字段桥接：extract PascalCase → 后端 camelCase（bridge 双写） */
import { nextTick, onMounted, ref, type Ref } from "vue";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconPlus, IconPencil, IconSearch, IconTrash, IconCircleCheck, IconBan } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, ValueGetterParams, ValueSetterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { frmTagApi, tPa1000Api } from "@/api/mes4ddh/sms.swagger";

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

/* 原 RdbTagTypeEnumFormatter / RdbUseTypeEnumFormatter（列显示；值兼容名称与数值） */
const TAG_TYPE_FMT: Record<string, string> = {
  Instantaneous: "瞬时值",
  Difference: "差量",
  Cumulative: "累计值",
  "0": "瞬时值",
  "10": "差量",
  "20": "累计值",
};
const USAGE_FMT: Record<string, string> = {
  F: "投料",
  O: "开始/结束/产出/自定义实现",
  P: "工参",
  M: "广播",
  "0": "投料",
  "10": "开始/结束/产出/自定义实现",
  "20": "工参",
  "30": "广播",
};
/** 运行期字典（GetRdbUseTypeEnum* → repoCFunction；GetAllTableFieldList → repoCTableField） */
const functionMap = ref(new Map<string, string>());
const tableFieldMap = ref(new Map<string, string>());

function mapFmt(source: Ref<Map<string, string>>) {
  return (p: { value?: unknown }) => {
    const v = p.value == null ? "" : String(p.value);
    if (!v) return "";
    return source.value.get(v) ?? (USAGE_FMT[v] ?? TAG_TYPE_FMT[v] ?? v);
  };
}
const functionFmt = mapFmt(functionMap);
const tableFieldFmt = mapFmt(tableFieldMap);
const tagTypeFmt = (p: { value?: unknown }) => {
  const v = p.value == null ? "" : String(p.value);
  return v ? (TAG_TYPE_FMT[v] ?? v) : "";
};
const usageFmt = (p: { value?: unknown }) => {
  const v = p.value == null ? "" : String(p.value);
  return v ? (USAGE_FMT[v] ?? v) : "";
};

const colDefs = ref<ColDef[]>(
  bridge([
    { field: "CLineName", headerName: "产线名称", width: 120 },
    { field: "CMachineName", headerName: "机台名称", width: 120 },
    { field: "CSmnsTag", headerName: "自动化点位", width: 150 },
    { field: "CTagNm", headerName: "点位描述", width: 130 },
    { field: "CTagUsage", headerName: "点位用途", width: 170, valueFormatter: usageFmt },
    { field: "CStationNo", headerName: "站点编码", width: 110 },
    { field: "CStationDesc", headerName: "站点描述", width: 120 },
    { field: "CValueStyle", headerName: "数据类型", width: 110 },
    { field: "CFunction", headerName: "点位功能", width: 170, valueFormatter: functionFmt },
    { field: "CTableField", headerName: "存储位置", width: 150, valueFormatter: tableFieldFmt },
    { field: "NEnable", headerName: "是否启用", width: 100, cellRenderer: "agCheckboxCellRenderer" },
    { field: "CUnit", headerName: "点位采集值单位", width: 140 },
    { field: "NCovMom", headerName: "倍率", width: 90 },
    { field: "NDecimals", headerName: "修约", width: 90 },
    { field: "NAddRecord", headerName: "是否记录日志", width: 130, cellRenderer: "agCheckboxCellRenderer" },
    { field: "CBackup", headerName: "备注", width: 130 },
    { field: "Creator", headerName: "创建人", width: 112 },
    { field: "CreateTime", headerName: "创建时间", width: 150 },
    { field: "Id", headerName: "主键", width: 120, hide: true },
    { field: "CFactoryCode", headerName: "工厂", width: 120, hide: true },
    { field: "CFactoryName", headerName: "工厂名称", width: 120, hide: true },
    { field: "CLineCode", headerName: "产线", width: 120, hide: true },
    { field: "CMachineCode", headerName: "机台", width: 120, hide: true },
    { field: "CMesTag", headerName: "MES点位", width: 120, hide: true },
    { field: "CTagType", headerName: "点位类型", width: 110, valueFormatter: tagTypeFmt, hide: true },
    { field: "CTimestamp", headerName: "时间戳", width: 150, hide: true },
    { field: "LastModifier", headerName: "最后更新人", width: 112, hide: true },
    { field: "LastModifyTime", headerName: "最后更新时间", width: 150, hide: true },
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
const plcPoint = ref("");
const loadAll = ref(false);

const qsFormat = '{"PlantCode":null,"LineCode":null}';
function parseQs(): { LineCode?: string } | null {
  if (!qsRaw) {
    toast(`界面必须配置注入参数，请联系管理员！\n界面注入参数格式为：'${qsFormat}'`, 4000, "warn");
    return null;
  }
  try {
    return JSON.parse(qsRaw) as { LineCode?: string };
  } catch {
    toast(`界面参数错误应为:${qsFormat}`, 4000, "warn");
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

/** Load：CFunction 字典 = OF(O)+OF(F)+P(P) 合并；CTableField = GetAllTableFieldList */
async function loadDicts() {
  try {
    const [oList, fList, pList, fields] = await Promise.all([
      frmTagApi.getRdbUseTypeEnumOF("O") ?? [],
      frmTagApi.getRdbUseTypeEnumOF("F") ?? [],
      frmTagApi.getRdbUseTypeEnumP("P") ?? [],
      frmTagApi.getAllTableFieldList() ?? [],
    ]);
    const fn = new Map<string, string>();
    for (const x of [...((oList as unknown[]) ?? []), ...((fList as unknown[]) ?? []), ...((pList as unknown[]) ?? [])] as Array<
      Record<string, unknown>
    >) {
      const v = x.value ?? x.cCode;
      const d = x.displayName ?? x.cName;
      if (v != null) fn.set(String(v), String(d ?? v));
    }
    functionMap.value = fn;
    const tf = new Map<string, string>();
    for (const x of ((fields as unknown[]) ?? []) as Array<Record<string, unknown>>) {
      const v = x.value ?? x.cCode;
      const d = x.displayName ?? x.cName;
      if (v != null) tf.set(String(v), String(d ?? v));
    }
    tableFieldMap.value = tf;
  } catch {
    /* 拦截层已 toast */
  }
}

/** GetParamDto：_lineCode/_machineCode getter 恒校验 */
function paramDto() {
  if (!lineCode.value) {
    toast("产线不得为空", 2500, "warn");
    return null;
  }
  if (!machineCode.value) {
    toast("机台不得为空！", 2500, "warn");
    return null;
  }
  const mo = machineOptions.value.find((o) => o.value === machineCode.value);
  return {
    lineCode: lineCode.value,
    lineName: lineText.value,
    machineCode: machineCode.value,
    machineName: mo?.label ?? machineCode.value,
    loadAllData: loadAll.value,
    plcPoint: plcPoint.value,
  };
}

async function query() {
  const p = paramDto();
  if (!p) return;
  querying.value = true;
  try {
    const list = (await frmTagApi.queryTagInfo(p)) ?? [];
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

/** btnAdd_Click：_lineCode/_machineCode getter 校验（同 paramDto）→ FrmTagEdit 占位 → 重查（原 ShowDialog 后必重查） */
function onAdd() {
  if (!paramDto()) return;
  toast("FrmTagEdit：二级弹窗待接入（CheckSaveData/SaveData）", 2500, "warn");
  void query();
}

/** btnEdit_Click：无行静默返回（照 .cs），否则弹窗占位 → 重查 */
function onEdit() {
  if (!selected.value) return;
  toast("FrmTagEdit：二级弹窗待接入（CheckSaveData/SaveData）", 2500, "warn");
  void query();
}

async function onRemove() {
  const p = paramDto();
  if (!p) return;
  const row = selected.value;
  if (!row) return;
  const tag = String(gv(row, "CSmnsTag") ?? "");
  if (!window.confirm(`确定要删除配置的自动化点位为‘${tag}’的配置数据？`)) return;
  querying.value = true;
  try {
    await frmTagApi.revemoData([String(row.id ?? "")]);
    await query();
    toast("删除成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

async function onEnable() {
  const p = paramDto();
  if (!p) return;
  const row = selected.value;
  if (!row) return;
  const tag = String(gv(row, "CSmnsTag") ?? "");
  const enabled = Boolean(gv(row, "NEnable"));
  if (enabled) {
    toast(`禁止操作，自动化点位为‘${tag}’的配置数据已经是启用状态，无需重复启用！`, 3000, "warn");
    return;
  }
  if (!window.confirm(`确定要启用已经作废的自动化点位为‘${tag}’的配置数据？`)) return;
  querying.value = true;
  try {
    await frmTagApi.enableData([String(row.id ?? "")]);
    await query();
    toast("启用成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

async function onInvalid() {
  const p = paramDto();
  if (!p) return;
  const row = selected.value;
  if (!row) return;
  const tag = String(gv(row, "CSmnsTag") ?? "");
  const enabled = Boolean(gv(row, "NEnable"));
  if (!enabled) {
    toast(`禁止操作，自动化点位为‘${tag}’的配置数据已经是作废状态，无需重复作废！`, 3000, "warn");
    return;
  }
  if (!window.confirm(`确定要作废配置的自动化点位为‘${tag}’的配置数据？`)) return;
  querying.value = true;
  try {
    await frmTagApi.invalidData([String(row.id ?? "")]);
    await query();
    toast("作废成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

function onMachineChange() {
  void query();
}

onMounted(async () => {
  const qs = parseQs();
  lineCode.value = qs?.LineCode ?? "";
  await Promise.all([loadLines(), loadMachines(), loadDicts()]);
  // 原 ucLine1_EditValueChanged → ucMachine1.SelectedIndex = 0 → ucMachine1_EditValueChanged → 查询
  if (machineOptions.value.length) {
    machineCode.value = machineOptions.value[0].value;
    await query();
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- stackPanel1：产线/机台/自动化点位/加载所有数据 + 6 按钮（顺序照 Controls.Add） -->
    <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">产线</label>
      <InputText :model-value="lineText" disabled class="w-32 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">机台</label>
      <Select v-model="machineCode" :options="machineOptions" option-label="label" option-value="value" show-clear
        placeholder="请选择" class="w-36 shrink-0" @value-change="onMachineChange" />
      <label class="shrink-0 text-xs text-muted-foreground">自动化点位</label>
      <InputText v-model="plcPoint" placeholder="自动化点位" class="w-36 shrink-0" />
      <span class="flex shrink-0 items-center gap-1">
        <Checkbox v-model="loadAll" binary input-id="tagLoadAll" />
        <label for="tagLoadAll" class="text-xs text-muted-foreground">加载所有数据</label>
      </span>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onEdit">
        <IconPencil class="h-3 w-3" />修改
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onRemove">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onEnable">
        <IconCircleCheck class="h-3 w-3" />启用
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onInvalid">
        <IconBan class="h-3 w-3" />作废
      </Button>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows" :pagination="false"
        :loading="querying" :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
        @grid-ready="onGridReady" @selection-changed="onSelectionChanged" @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
