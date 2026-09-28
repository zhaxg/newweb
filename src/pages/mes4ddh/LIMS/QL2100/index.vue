<script setup lang="ts">
/** 对应 FrmQL2100（炼钢成分判定 / 窗体标题「炼钢成分判定」）：DDH.Winforms.LIMS.Forms.FrmQL2100
 *  布局：查询区（原 dataLayout 9 项：产线/炉号/制造命令号/计划号/钢种/执行标准/发送时间 UCTimeRange/复验标记/判定结果）
 *       + stackPanel1（查询/放行/判不合/试验室复验/质检复验/重新自动判定/添加炉次信息/同步成分信息）
 *       → 上下 Splitter 52%（原 283/544）：
 *         ┌ 左右 Splitter 53%（原 630/1198）：炉次信息 Tql2000 | 炉次钢种标准 Tql2001
 *         └ UCCfResult 左右 45%（原 541/1198）：炉次成分试样 | [保存结果]+炉次成分信息
 *  多菜单共享：useMenuQuery() 读 {Lines,HeadStr}（LG01/LG02/E/P），原 QueryString JSON
 *  已接入：tql2001Api.queryStoveInfo / queryStoveData、stoveChemicalCompositionTestApi.queryFinalOrDisableSamples /
 *         getSamplesItems / recheck / getStoveTestStds / stoveAutoJudge / queryFinalSample、
 *         tPa1000Api.queryLines（原 LineFormatter 产线下拉）
 *  待接入：放行/判不合 最终落库 → swagger 未生成 stoveChemicalCompositionTestApi.updateJudgeResult（且按约定禁改 src/api），
 *         FrmConfirmValueDialog 占位（放行原因/判定备注录入）、FrmQL2110 添加炉次弹窗占位、
 *         同步成分信息 → swagger 未生成 syncCfE、制造标准双击 IStNoView 占位；
 *         Mock 侧 queryStoveInfo/queryStoveData/queryFinalSample/recheck/getStoveTestStds/
 *         queryFinalOrDisableSamples/getSamplesItems/stoveAutoJudge 占位未登记（按约定禁改 src/mock）
 *  已知偏差：质管复检「炉次复验结果录入」以页内 UCCfResult 同构 Dialog 复刻（可编辑检验结果 + AutoJudge 等价范围判定）；
 *         AutoJudge 为范围型等价判定（C# CalcFormula 公式引擎未迁，同 QL4000）；
 *         保存结果按钮原 C# 未订阅 BtnSaveClick，按原样保留无操作 */
import { computed, nextTick, onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconFlask, IconPlus, IconRefresh, IconSearch, IconSend, IconX } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type {
  CellClassParams,
  ColDef,
  GridApi,
  GridReadyEvent,
  RowClassParams,
  SelectionChangedEvent,
  ValueFormatterParams,
} from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import {
  EqualsFlag,
  SampleJudgeResult,
  StoveChemResult,
  YesNo,
  stoveChemicalCompositionTestApi,
  tql2001Api,
  type QueryStoveChemicalCompositionInput,
  type StoveSampleTestItem,
  type StoveTestSample,
  type Tql2000,
  type Tql2001,
} from "@/api/mes4ddh/lims.swagger";
import { tPa1000Api, type Tpa1000 as LineRow } from "@/api/mes4ddh/shr.swagger";
import { useMenuQuery } from "@/lib/menuQuery";
import { NextStrId } from "@/lib/yitIdHelper";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const auth = useAuthStore();
const { json } = useMenuQuery();

/* ---------- 菜单参数（原 InputDto：{Lines, HeadStr}，HeadStr→Input.StoveLimit） ---------- */
const menuLines = (json?.Lines as string[] | undefined) ?? [];
const headStr = (json?.HeadStr as string | null | undefined) ?? null;

/* ---------- 查询条件（原构造函数：CreateTime 近7天～明天） ---------- */
function defaultDates(): Date[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 7);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);
  return [start, end];
}
const input = reactive({
  lineCode: null as string | null,
  stove: "",
  poNo: "",
  planNo: "",
  sgSign: "",
  sgStd: "",
  recheckFlag: null as YesNo | null | "",
  stoveChemResult: null as StoveChemResult | null | "",
  createDate: defaultDates() as Date[] | null,
});

const recheckOptions = [
  { label: "否", value: YesNo.N },
  { label: "是", value: YesNo.Y },
];
const chemResultOptions = [
  { label: "待判", value: StoveChemResult.None },
  { label: "合格", value: StoveChemResult.Qualified },
  { label: "不合格", value: StoveChemResult.Unqualified },
  { label: "放行", value: StoveChemResult.ManualRelease },
  { label: "判废", value: StoveChemResult.Waste },
];

const lineOptions = ref<{ label: string; value: string }[]>([]);
async function loadLines() {
  try {
    const rows = (await tPa1000Api.queryLines()) ?? [];
    // 原 SetCodeFormatterAsync<LineFormatter>(inputItem.Lines)：候选限定菜单 Lines
    const all = (rows as LineRow[]).filter((r) => r.cCode != null);
    const allowed = menuLines.length ? all.filter((r) => menuLines.includes(r.cCode!)) : all;
    lineOptions.value = allowed.map((r) => ({ label: `${r.cCode}-${r.cName ?? ""}`, value: r.cCode! }));
    if (menuLines.length === 1) input.lineCode = menuLines[0]; // 原 Lines.Count==1 时预选
  } catch {
    /* 拦截层已 toast */
  }
}

function isoLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null) {
  if (!dates?.[0]) return undefined;
  return { min: isoLocal(dates[0]), max: dates[1] ? isoLocal(dates[1]) : undefined };
}

/** 原 yyMMddHHmmss 试样号后缀 */
function ymdHms(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function buildQuery(): QueryStoveChemicalCompositionInput & { stoveLimit?: string | null } {
  return {
    lineCode: input.lineCode || undefined,
    stove: input.stove?.trim() || undefined,
    poNo: input.poNo?.trim() || undefined,
    planNo: input.planNo?.trim() || undefined,
    sgSign: input.sgSign?.trim() || undefined,
    sgStd: input.sgStd?.trim() || undefined,
    recheckFlag: input.recheckFlag === "" || input.recheckFlag == null ? null : input.recheckFlag,
    stoveChemResult: input.stoveChemResult === "" || input.stoveChemResult == null ? null : input.stoveChemResult,
    createTime: toTimeRange(input.createDate),
    // 原 Input.StoveLimit = QueryString.HeadStr（swagger 类型未收录该字段，按原样随 body 下发）
    stoveLimit: headStr,
  };
}

/* ---------- 主子表数据 ---------- */
const stoveRows = shallowRef<Tql2000[]>([]);
const detailRows = shallowRef<Tql2001[]>([]);
const cfSamples = shallowRef<StoveTestSample[]>([]);
const focusStove = shallowRef<Tql2000 | null>(null);
const focusDetail = shallowRef<Tql2001 | null>(null);
const focusSample = shallowRef<StoveTestSample | null>(null);
const cfItems = shallowRef<StoveSampleTestItem[]>([]);
const querying = ref(false);
const detailLoading = ref(false);
const cfLoading = ref(false);
const itemLoading = ref(false);

const stoveApi = ref<GridApi | null>(null);
const detailApi = ref<GridApi | null>(null);
const sampleApi = ref<GridApi | null>(null);
const itemApi = ref<GridApi | null>(null);

/* ---------- 格式化 ---------- */
const stoveJudgeFmt = (p: ValueFormatterParams) =>
  (({ 0: "待判", 2: "合格", 3: "不合格", 4: "放行", 5: "判废" }) as Record<string, string>)[String(p.value)] ??
  (p.value == null ? "" : String(p.value));
const sampleJudgeFmt = (p: ValueFormatterParams) =>
  (({ 0: "待判", 1: "不需判", 2: "合格", 3: "不合格" }) as Record<string, string>)[String(p.value)] ??
  (p.value == null ? "" : String(p.value));
const yesNoFmt = (p: ValueFormatterParams) => (p.value == null ? "" : Number(p.value) === 1 ? "是" : "否");

/* ---------- 列（提取基线：gridView1=Tql2000 可见9+隐藏21；gridView2=Tql2001 可见11+隐藏7） ---------- */
const stoveColDefs = ref<ColDef[]>([
  { field: "cStove", headerName: "炉号", width: 100, pinned: "left" },
  { field: "cpStove", headerName: "母炉号", width: 90 },
  { field: "cSgSign", headerName: "计划钢种", width: 95 },
  { field: "cSgStd", headerName: "计划执行标准", width: 120 },
  { field: "cStNo", headerName: "计划制造标准", width: 115 },
  {
    field: "cLineCode",
    headerName: "产线代码",
    width: 90,
    valueFormatter: (p) => lineOptions.value.find((l) => l.value === p.value)?.label ?? p.value ?? "",
  },
  { field: "cMachine", headerName: "炉台号", width: 85 },
  { field: "cConfirmFlag", headerName: "炉次成分确认状态", width: 130, valueFormatter: yesNoFmt },
  { field: "createTime", headerName: "创建时间", width: 130 },
  { field: "id", headerName: "主键", hide: true },
  { field: "creator", headerName: "创建人", hide: true },
  { field: "lastModifier", headerName: "最后更新人", hide: true },
  { field: "lastModifyTime", headerName: "最后更新时间", hide: true },
  { field: "cPoNo", headerName: "制造命令号", hide: true },
  { field: "cOrderNo", headerName: "订单号", hide: true },
  { field: "cOrderTsyq", headerName: "合同特殊要求", hide: true },
  { field: "cRouteCode", headerName: "精炼路径", hide: true },
  { field: "cSpec", headerName: "规格", hide: true },
  { field: "nThick", headerName: "厚度mm", hide: true },
  { field: "nWth", headerName: "宽度mm", hide: true },
  { field: "nLen", headerName: "长度mm", hide: true },
  { field: "cIngotCode", headerName: "锭坯型代码", hide: true },
  { field: "nPlanWgt", headerName: "计划出钢重量", hide: true },
  { field: "dProdTime", headerName: "生产时间", hide: true },
  { field: "cJudgeUser", headerName: "判定人", hide: true },
  { field: "dJudgeTime", headerName: "判定时间", hide: true },
  { field: "cJudgeResult", headerName: "判定结果", hide: true, valueFormatter: stoveJudgeFmt },
  { field: "cJudgeRemark", headerName: "判定备注", hide: true },
  { field: "cRecheckFlag", headerName: "复验标记", hide: true, valueFormatter: yesNoFmt },
  { field: "selected", headerName: "选择", hide: true },
]);

const detailColDefs = ref<ColDef[]>([
  { field: "cStove", headerName: "炉号", width: 100, pinned: "left" },
  { field: "cSgSign", headerName: "钢种", width: 95 },
  { field: "cSgStd", headerName: "执行标准", width: 115 },
  { field: "cStNo", headerName: "制造标准", width: 105 },
  { field: "cJudgeRemark", headerName: "判定备注", width: 130 },
  { field: "cAutoJudgeResult", headerName: "自动判定结果", width: 110, valueFormatter: stoveJudgeFmt },
  { field: "cAutoJudgeResultNk", headerName: "内控自动判定结果", width: 130, valueFormatter: stoveJudgeFmt },
  { field: "cJudgeResult", headerName: "判定结果", width: 95, valueFormatter: stoveJudgeFmt },
  { field: "cJudgeUser", headerName: "判定人", width: 85 },
  { field: "dJudgeTime", headerName: "判定时间", width: 130 },
  { field: "cLineCode", headerName: "产线代码", width: 90 },
  { field: "id", headerName: "主键", hide: true },
  { field: "creator", headerName: "创建人", hide: true },
  { field: "createTime", headerName: "创建时间", hide: true },
  { field: "lastModifier", headerName: "最后更新人", hide: true },
  { field: "lastModifyTime", headerName: "最后更新时间", hide: true },
  { field: "cpStove", headerName: "母炉号", hide: true },
  { field: "selected", headerName: "选择", hide: true },
]);

/* UCCfResult：试样（StoveTestSample 可见11+隐藏1）/ 成分（StoveSampleTestItem；ShowNkRange=true→工艺范围可见） */
const sampleColDefs = ref<ColDef[]>([
  {
    field: "cSampleNo",
    headerName: "试样号",
    width: 140,
    cellClass: (p) => (Number(p.data?.cDisable) === YesNo.Y ? "smp-no" : ""),
  },
  { field: "cGw", headerName: "工位", width: 70 },
  { field: "cStove", headerName: "炉号", width: 95 },
  { field: "cSendUser", headerName: "发送人", width: 90 },
  { field: "dSendTime", headerName: "发送时间", width: 130 },
  { field: "cJudgeResult", headerName: "判定结果", width: 90, valueFormatter: sampleJudgeFmt },
  { field: "cJudgeRemark", headerName: "判定备注", width: 120 },
  { field: "cRecheckFlag", headerName: "复验标记", width: 90, valueFormatter: yesNoFmt },
  { field: "cFinalFlag", headerName: "是否最终样", width: 95, valueFormatter: yesNoFmt },
  { field: "cTestUser", headerName: "结果录入人", width: 100 },
  { field: "dTestTime", headerName: "结果录入时间", width: 130 },
  { field: "dJudgeTime", headerName: "判定时间", width: 130, hide: true },
]);

/** UCCfResult.gridView3 列（editable=质管复检录入弹窗时可编辑检验结果） */
function makeItemColDefs(editable: boolean): ColDef[] {
  return [
    { field: "cName", headerName: "元素名称", width: 90 },
    {
      field: "valueDisplay",
      headerName: "检验结果",
      width: 100,
      editable,
      valueGetter: (p) => (p.data?.valueDisplay ?? p.data?.nValue ?? "") as string | number,
      valueSetter: (p) => {
        const r = p.data as StoveSampleTestItem;
        if (!editable) return false;
        r.valueDisplay = p.newValue == null ? null : String(p.newValue);
        const n = Number(p.newValue);
        r.nValue = p.newValue == null || p.newValue === "" || !Number.isFinite(n) ? null : n;
        autoJudgeItem(r);
        return true;
      },
      cellClass: valueCellClass,
    },
    { field: "stdRange", headerName: "标准范围", width: 120, valueFormatter: (p) => rangeFmt(p.value) },
    {
      field: "mainRange",
      headerName: "工艺范围",
      width: 120,
      valueFormatter: (p) => rangeFmt(p.value),
      cellClass: nkCellClass,
    },
    { field: "cFormula", headerName: "计算公式", width: 120 },
    { field: "stdAccuracy", headerName: "小数位数", width: 90 },
    { field: "nValue", headerName: "原始结果", width: 95 },
    { field: "isJudge", headerName: "是否判定", width: 85, valueFormatter: yesNoFmt },
    { field: "cCode", headerName: "元素代码", hide: true },
    { field: "cJudgeFlag", headerName: "判定标记", hide: true },
    { field: "accuracy", headerName: "Accuracy", hide: true },
    { field: "speRange", headerName: "放行范围", hide: true, valueFormatter: (p) => rangeFmt(p.value) },
    { field: "cCtrlFlag", headerName: "判定标记", hide: true },
    { field: "isPrint", headerName: "是否打质保书", hide: true, valueFormatter: yesNoFmt },
  ];
}
const itemColDefs = computed<ColDef[]>(() => makeItemColDefs(false));
const qmItemColDefs = computed<ColDef[]>(() => makeItemColDefs(true));

type Range = { min?: number | null; max?: number | null; equalsMethod?: EqualsFlag } | null | undefined;
function rangeFmt(v: unknown) {
  const r = v as Range;
  if (!r || (r.min == null && r.max == null)) return "";
  const eq = Number(r.equalsMethod ?? 0);
  const leftOpen = (eq & EqualsFlag.LeftOpen) !== 0;
  const rightOpen = (eq & EqualsFlag.RightOpen) !== 0;
  const left = r.min == null ? "" : `${leftOpen ? "(" : "["}${r.min}`;
  const right = r.max == null ? "" : `${r.max}${rightOpen ? ")" : "]"}`;
  if (r.min == null) return `( , ${right}`;
  if (r.max == null) return `${left}, )`;
  return `${left}, ${right}`;
}
function checkInRange(r: Range, v: number) {
  if (!r || (r.min == null && r.max == null)) return true;
  const eq = Number(r.equalsMethod ?? 0);
  const leftOpen = (eq & EqualsFlag.LeftOpen) !== 0;
  const rightOpen = (eq & EqualsFlag.RightOpen) !== 0;
  if (r.min != null && (leftOpen ? v <= Number(r.min) : v < Number(r.min))) return false;
  if (r.max != null && (rightOpen ? v >= Number(r.max) : v > Number(r.max))) return false;
  return true;
}
/** 原 StoveTestSample.AutoJudge 的范围型等价判定（公式引擎未迁，同 QL4000 纪律） */
function autoJudgeItem(it: StoveSampleTestItem) {
  if (Number(it.isJudge) !== YesNo.Y) return;
  const v = Number(it.nValue);
  if (it.nValue == null || !Number.isFinite(v)) {
    it.judgeResult = SampleJudgeResult.None;
    return;
  }
  it.judgeResult = checkInRange(it.stdRange, v) ? SampleJudgeResult.Qualified : SampleJudgeResult.Unqualified;
  if (it.mainRange) {
    (it as any).judgeResultNk = checkInRange(it.mainRange, v)
      ? SampleJudgeResult.Qualified
      : SampleJudgeResult.Unqualified;
  }
}
/** 原 GridView3_RowCellStyle：检验结果底色（不合格红/合格绿/其余黄） */
function valueCellClass(p: CellClassParams) {
  const row = p.data as StoveSampleTestItem | undefined;
  if (!row) return "";
  const jr = Number(row.judgeResult);
  if (jr === SampleJudgeResult.Unqualified) return "judge-bg-ng";
  if (Number(row.isJudge) !== YesNo.Y) return "";
  if (jr !== SampleJudgeResult.Qualified) return "judge-bg-warn";
  return "judge-bg-ok";
}
function nkCellClass(p: CellClassParams) {
  const row = p.data as StoveSampleTestItem | undefined;
  return row && Number((row as any).judgeResultNk) === SampleJudgeResult.Unqualified ? "judge-bg-warn" : "";
}
/** 原 GridView2_RowCellStyle：禁用样银底斜体 + 试样号删除线 */
function sampleRowClass(p: RowClassParams) {
  return Number((p.data as StoveTestSample | undefined)?.cDisable) === YesNo.Y ? "smp-disabled" : undefined;
}

/* ---------- 查询（原 btnQuery_Click → tql2001.queryStoveInfo） ---------- */
async function onQuery() {
  querying.value = true;
  try {
    const data = await tql2001Api.queryStoveInfo(buildQuery());
    stoveRows.value = (data as Tql2000[]) ?? [];
    detailRows.value = [];
    cfSamples.value = [];
    cfItems.value = [];
    focusStove.value = null;
    focusDetail.value = null;
    focusSample.value = null;
    requestAnimationFrame(() => stoveApi.value?.autoSizeAllColumns());
    await nextTick();
    const first = stoveApi.value?.getDisplayedRowAtIndex(0);
    if (first) {
      first.setSelected(true);
      // 选中态可能与上回同位而不再触发 selection-changed，主动联动首行（重复触发由 token 兜底）
      focusStove.value = first.data as Tql2000;
      void loadStoveDetail();
    } else {
      focusStove.value = null;
    }
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

function onStoveSelectionChanged(e: SelectionChangedEvent) {
  const nodes = e.api.getSelectedNodes();
  focusStove.value = (nodes[nodes.length - 1]?.data as Tql2000) ?? null;
  void loadStoveDetail();
}
function onDetailSelectionChanged(e: SelectionChangedEvent) {
  const nodes = e.api.getSelectedNodes();
  focusDetail.value = (nodes[nodes.length - 1]?.data as Tql2001) ?? null;
  void loadCfData();
}
function onSampleSelectionChanged(e: SelectionChangedEvent) {
  const nodes = e.api.getSelectedNodes();
  focusSample.value = (nodes[nodes.length - 1]?.data as StoveTestSample) ?? null;
  void loadSampleItems();
}

/** 原 gridView1_FocusedRowObjectChanged → QueryStoveData（焦点变化竞态保护照 current!==CurrentStove；seq 防重复触发叠跑） */
let stoveDetailSeq = 0;
let cfSeq = 0;
let itemSeq = 0;
async function loadStoveDetail() {
  const seq = ++stoveDetailSeq;
  const guard = focusStove.value;
  detailRows.value = [];
  cfSamples.value = [];
  cfItems.value = [];
  focusDetail.value = null;
  focusSample.value = null;
  const stove = guard?.cStove;
  if (!stove) return;
  detailLoading.value = true;
  try {
    const data = await tql2001Api.queryStoveData(stove);
    if (seq !== stoveDetailSeq || focusStove.value !== guard) return;
    detailRows.value = (data as Tql2001[]) ?? [];
    requestAnimationFrame(() => detailApi.value?.autoSizeAllColumns());
    await nextTick();
    const first = detailApi.value?.getDisplayedRowAtIndex(0);
    if (first) {
      first.setSelected(true);
      focusDetail.value = first.data as Tql2001;
      void loadCfData();
    } else {
      focusDetail.value = null;
      cfSamples.value = [];
      cfItems.value = [];
    }
  } catch {
    /* 拦截层已 toast */
  } finally {
    if (seq === stoveDetailSeq) detailLoading.value = false;
  }
}

/** 原 gridView2_FocusedRowObjectChanged → QueryFinalOrDisableSamples */
async function loadCfData() {
  const seq = ++cfSeq;
  const guard = focusDetail.value;
  cfSamples.value = [];
  cfItems.value = [];
  focusSample.value = null;
  if (!guard) return;
  cfLoading.value = true;
  try {
    const data = await stoveChemicalCompositionTestApi.queryFinalOrDisableSamples(guard.cStove ?? undefined, {
      stNo: guard.cStNo,
      stlGrd: guard.cSgSign,
      std: guard.cSgStd,
    });
    if (seq !== cfSeq || focusDetail.value !== guard) return;
    cfSamples.value = (data as StoveTestSample[]) ?? [];
    requestAnimationFrame(() => sampleApi.value?.autoSizeAllColumns());
    await nextTick();
    const first = sampleApi.value?.getDisplayedRowAtIndex(0);
    if (first) {
      first.setSelected(true);
      focusSample.value = first.data as StoveTestSample;
      void loadSampleItems();
    } else {
      focusSample.value = null;
      cfItems.value = [];
    }
  } catch {
    /* 拦截层已 toast */
  } finally {
    if (seq === cfSeq) cfLoading.value = false;
  }
}

/** 原 UCCfResult.GridView2_FocusedRowObjectChanged → GetSamplesItems + AutoJudge */
async function loadSampleItems() {
  const seq = ++itemSeq;
  const guard = focusSample.value;
  cfItems.value = [];
  if (!guard) return;
  itemLoading.value = true;
  try {
    if (!guard.testItems || guard.testItems.length === 0) {
      guard.testItems =
        (guard.id
          ? ((await stoveChemicalCompositionTestApi.getSamplesItems(guard.id)) as StoveSampleTestItem[])
          : []) ?? [];
    }
    if (seq !== itemSeq || focusSample.value !== guard) return;
    for (const it of guard.testItems ?? []) autoJudgeItem(it);
    cfItems.value = [...(guard.testItems ?? [])];
    requestAnimationFrame(() => itemApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    if (seq === itemSeq) itemLoading.value = false;
  }
}

/* ---------- 确认弹窗（原 MsgBox.ShowYesNo） ---------- */
const confirmOpen = ref(false);
const confirmMsg = ref("");
let confirmAction: (() => Promise<void>) | null = null;
function askConfirm(msg: string, action: () => Promise<void>) {
  confirmMsg.value = msg;
  confirmAction = action;
  confirmOpen.value = true;
}
async function onConfirmOk() {
  confirmOpen.value = false;
  const act = confirmAction;
  confirmAction = null;
  if (act) await act();
}

/* ---------- 按钮逻辑 ---------- */
/** 放行：校验照 .cs；FrmConfirmValueDialog 占位 + updateJudgeResult 未生成 → 待接入 */
async function onRelease() {
  const cur = focusDetail.value;
  if (!cur) return;
  if (Number(cur.cJudgeResult) === StoveChemResult.Qualified) {
    toast("炉次已经合格，不需放行", 2000, "warn");
    return;
  }
  let finalSamp: StoveTestSample | null | undefined;
  try {
    finalSamp = (await stoveChemicalCompositionTestApi.queryFinalSample(cur.cStove ?? undefined, {
      std: cur.cSgStd,
      stlGrd: cur.cSgSign,
    })) as StoveTestSample | null | undefined;
  } catch {
    return; /* 拦截层已 toast */
  }
  if (finalSamp == null) {
    toast(`炉次[${cur.cStove}]没有最终成分，不允许放行`, 2000, "warn");
    return;
  }
  toast("放行原因录入弹窗（FrmConfirmValueDialog）待接入：swagger 缺 updateJudgeResult", 2500, "warn");
}

/** 判不合：校验照 .cs；FrmConfirmValueDialog 占位 + updateJudgeResult 未生成 → 待接入 */
function onUnqualified() {
  const cur = focusDetail.value;
  if (!cur) return;
  toast(
    `炉次[${cur.cStove}-${cur.cSgSign}]判不合：录入弹窗（FrmConfirmValueDialog）待接入：swagger 缺 updateJudgeResult`,
    2500,
    "warn",
  );
}

/** 原 btnLabRecheck_Click：确认文案照抄 → Recheck(复验样) → 重查 → 操作成功 */
function onLabRecheck() {
  const stove = focusStove.value;
  if (!stove) return;
  askConfirm(`确认发送炉次[${stove.cStove}]复验试样？`, async () => {
    try {
      await stoveChemicalCompositionTestApi.recheck(buildSample(stove, null));
      await onQuery();
      toast("操作成功！", 2000, "success");
    } catch {
      /* 拦截层已 toast */
    }
  });
}

function buildSample(stove: Tql2000, remark: string | null): StoveTestSample {
  return {
    cConfirmFlag: YesNo.N,
    cFinalFlag: YesNo.Y,
    cGw: null,
    cJudgeRemark: remark,
    cJudgeResult: SampleJudgeResult.None,
    cRecheckFlag: YesNo.Y,
    cSampleNo: `${stove.cStove}_${ymdHms()}`,
    cSendUser: auth.session?.userId,
    cStNo: stove.cStNo,
    dJudgeTime: null,
    cStove: stove.cStove,
    cTestUser: null,
    dSendTime: new Date().toISOString(),
    dTestTime: null,
    id: NextStrId(),
    testItems: [],
    cDisable: YesNo.N,
  };
}

/* ---------- 质管复检（原 btnQMRecheck_Click：GetStoveTestStds → 「炉次复验结果录入」→ Recheck） ---------- */
const qmOpen = ref(false);
const qmSample = shallowRef<StoveTestSample | null>(null);
const qmSampleRows = computed<StoveTestSample[]>(() => (qmSample.value ? [qmSample.value] : []));
const qmFocus = shallowRef<StoveTestSample | null>(null);
const qmItems = shallowRef<StoveSampleTestItem[]>([]);
const qmLoading = ref(false);
const qmSampleApi = ref<GridApi | null>(null);
const qmItemApi = ref<GridApi | null>(null);

async function onQMRecheck() {
  const stove = focusStove.value;
  const cur = focusDetail.value;
  if (!stove || !cur) return;
  try {
    const stds = ((await stoveChemicalCompositionTestApi.getStoveTestStds(stove.cStove ?? undefined, {
      std: cur.cSgStd,
      stlGrd: cur.cSgSign,
      stNo: cur.cStNo,
    })) ?? []) as StoveSampleTestItem[];
    const sample = buildSample(stove, "评审放行");
    sample.testItems = stds;
    for (const it of stds) autoJudgeItem(it);
    qmSample.value = sample;
    qmFocus.value = sample;
    qmItems.value = [...stds];
    qmOpen.value = true;
    await nextTick();
    requestAnimationFrame(() => {
      qmSampleApi.value?.autoSizeAllColumns();
      qmItemApi.value?.autoSizeAllColumns();
      qmSampleApi.value?.getDisplayedRowAtIndex(0)?.setSelected(true);
    });
  } catch {
    /* 拦截层已 toast */
  }
}
function onQmSampleSelection(e: SelectionChangedEvent) {
  const nodes = e.api.getSelectedNodes();
  qmFocus.value = (nodes[nodes.length - 1]?.data as StoveTestSample) ?? null;
  qmItems.value = [...(qmFocus.value?.testItems ?? [])];
}
async function onQmOk() {
  const sample = qmSample.value;
  if (!sample) return;
  try {
    await stoveChemicalCompositionTestApi.recheck(sample);
    qmOpen.value = false;
    await onQuery();
    toast("操作成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  }
}

/* ---------- 重新自动判定（原 btnAutoJudge_Click） ---------- */
function onAutoJudge() {
  const stove = focusStove.value;
  if (!stove) return;
  askConfirm("确认重新执行自动判定？", async () => {
    try {
      await stoveChemicalCompositionTestApi.stoveAutoJudge(stove.cStove ?? undefined);
      await loadStoveDetail();
      toast("操作成功！", 2000, "success");
    } catch {
      /* 拦截层已 toast */
    }
  });
}

/* ---------- 添加炉次信息（原 FrmQL2110 占位） ---------- */
function onAddStove() {
  toast("添加炉次信息：录入弹窗（FrmQL2110）待接入", 2000, "warn");
}

/* ---------- 同步成分信息（原 btnSyncStove_Click：校验/确认照抄，SyncCfE 未生成 → 待接入） ---------- */
function onSyncStove() {
  const stove = focusStove.value;
  if (!stove) {
    toast("请选择炉次信息操作", 2000, "warn");
    return;
  }
  askConfirm(`即将同步炉号${stove.cStove}的成分，是否继续？`, async () => {
    toast("同步成分信息待接入：swagger 未生成 stoveChemicalCompositionTestApi.syncCfE", 2500, "warn");
  });
}

/** 原 gridView1_RowCellClick 双击制造标准 → IStNoView（占位，同 QL3000/QL4000 纪律） */
function onStoveCellDoubleClicked(e: any) {
  if (e.colDef?.field === "cStNo") {
    toast("制造标准查看（IStNoView）待接入", 2000, "warn");
  }
}

function onStoveGridReady(e: GridReadyEvent) {
  stoveApi.value = e.api;
}
function onDetailGridReady(e: GridReadyEvent) {
  detailApi.value = e.api;
}
function onSampleGridReady(e: GridReadyEvent) {
  sampleApi.value = e.api;
}
function onItemGridReady(e: GridReadyEvent) {
  itemApi.value = e.api;
}
function onQmSampleGridReady(e: GridReadyEvent) {
  qmSampleApi.value = e.api;
}
function onQmItemGridReady(e: GridReadyEvent) {
  qmItemApi.value = e.api;
}

onMounted(() => {
  void loadLines();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区（原 dataLayoutControl 9 项） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产线</label>
          <Select
            v-model="input.lineCode"
            :options="lineOptions"
            option-label="label"
            option-value="value"
            show-clear
            filter
            placeholder="全部"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
          <InputText v-model="input.stove" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">制造命令号</label>
          <InputText v-model="input.poNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">计划号</label>
          <InputText v-model="input.planNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="input.sgSign" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
          <InputText v-model="input.sgStd" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">发送时间</label>
          <DatePicker
            v-model="input.createDate"
            selectionMode="range"
            :manualInput="false"
            date-format="yy-mm-dd"
            show-time
            hour-format="24"
            show-icon
            placeholder="开始 至 结束"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">复验标记</label>
          <Select
            v-model="input.recheckFlag"
            :options="recheckOptions"
            option-label="label"
            option-value="value"
            show-clear
            placeholder="全部"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">判定结果</label>
          <Select
            v-model="input.stoveChemResult"
            :options="chemResultOptions"
            option-label="label"
            option-value="value"
            show-clear
            placeholder="全部"
            class="min-w-0 flex-1"
          />
        </div>
      </div>
    </div>

    <!-- stackPanel1：8 个按钮（原 Controls.Add 顺序） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onRelease">
        <IconSend class="h-3 w-3" />放行
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onUnqualified">
        <IconX class="h-3 w-3" />判不合
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onLabRecheck">
        <IconFlask class="h-3 w-3" />试验室复验
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onQMRecheck">
        <IconFlask class="h-3 w-3" />质检复验
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAutoJudge">
        <IconRefresh class="h-3 w-3" />重新自动判定
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAddStove">
        <IconPlus class="h-3 w-3" />添加炉次信息
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSyncStove">
        <IconRefresh class="h-3 w-3" />同步成分信息
      </Button>
    </div>

    <!-- splitContainerControl1：上下 52%（原 283/544） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="52" :minSize="30" class="flex min-h-0 flex-col overflow-hidden">
        <!-- Panel1：左右 53%（原 gridControl1 630 | splitter | gridControl2） -->
        <Splitter class="min-h-0 flex-1">
          <SplitterPanel :size="53" :minSize="25" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">炉次信息</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="stoveColDefs"
                :row-data="stoveRows"
                :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
                :suppress-column-virtualisation="true"
                :pagination="false"
                :animate-rows="false"
                :loading="querying"
                @grid-ready="onStoveGridReady"
                @selection-changed="onStoveSelectionChanged"
                @cell-double-clicked="onStoveCellDoubleClicked"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </div>
          </SplitterPanel>
          <SplitterPanel :minSize="25" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">炉次钢种标准</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="detailColDefs"
                :row-data="detailRows"
                :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
                :suppress-column-virtualisation="true"
                :pagination="false"
                :animate-rows="false"
                :loading="detailLoading"
                @grid-ready="onDetailGridReady"
                @selection-changed="onDetailSelectionChanged"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>

      <SplitterPanel :minSize="25" class="flex min-h-0 flex-col overflow-hidden">
        <!-- Panel2：UCCfResult 左右 45%（原 541/1198） -->
        <Splitter class="min-h-0 flex-1">
          <SplitterPanel :size="45" :minSize="25" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">炉次成分试样</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="sampleColDefs"
                :row-data="cfSamples"
                :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
                :get-row-class="sampleRowClass"
                :suppress-column-virtualisation="true"
                :pagination="false"
                :animate-rows="false"
                :loading="cfLoading"
                @grid-ready="onSampleGridReady"
                @selection-changed="onSampleSelectionChanged"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </div>
          </SplitterPanel>
          <SplitterPanel :minSize="25" class="flex flex-col overflow-hidden">
            <!-- stackPanel1（保存结果，原未订阅 BtnSaveClick → 无操作）+ ViewCaption -->
            <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
              <Button variant="outlined" class="shrink-0 whitespace-nowrap" disabled>保存结果</Button>
              <span class="ml-auto text-xs font-medium text-muted-foreground">炉次成分信息</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="itemColDefs"
                :row-data="cfItems"
                :suppress-column-virtualisation="true"
                :pagination="false"
                :animate-rows="false"
                :loading="itemLoading"
                @grid-ready="onItemGridReady"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
    </Splitter>

    <!-- 确认（原 MsgBox.ShowYesNo） -->
    <Dialog
      :visible="confirmOpen"
      modal
      header="确认"
      :style="{ width: 'min(28rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event"
    >
      <p class="text-xs whitespace-pre-line">{{ confirmMsg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" variant="outlined" @click="onConfirmOk" />
      </template>
    </Dialog>

    <!-- 质管复检录入（原 UCCfResult + FrmDialogBase「炉次复验结果录入」，ShowSaveButton=false） -->
    <Dialog
      :visible="qmOpen"
      modal
      header="炉次复验结果录入"
      :style="{ width: 'min(64rem, calc(100vw - 2rem))' }"
      @update:visible="qmOpen = $event"
    >
      <div class="flex h-[65vh] min-h-0 flex-col">
        <Splitter class="min-h-0 flex-1">
          <SplitterPanel :size="45" :minSize="25" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">炉次成分试样</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="sampleColDefs"
                :row-data="qmSampleRows"
                :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
                :get-row-class="sampleRowClass"
                :pagination="false"
                :animate-rows="false"
                @grid-ready="onQmSampleGridReady"
                @selection-changed="onQmSampleSelection"
              />
            </div>
          </SplitterPanel>
          <SplitterPanel :minSize="25" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">炉次成分信息</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="qmItemColDefs"
                :row-data="qmItems"
                :pagination="false"
                :animate-rows="false"
                :loading="qmLoading"
                @grid-ready="onQmItemGridReady"
                @cell-value-changed="() => qmItemApi?.refreshCells({ force: true })"
              />
            </div>
          </SplitterPanel>
        </Splitter>
      </div>
      <template #footer>
        <Button label="取消" variant="outlined" @click="qmOpen = false" />
        <Button label="确定" variant="outlined" @click="onQmOk" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
/* 原 UCCfResult.RowCellStyle：禁用样银底斜体 + 试样号删除线 */
:deep(.smp-disabled) {
  font-style: italic;
  background-color: rgba(192, 192, 192, 0.25);
}
:deep(.smp-no) {
  text-decoration: line-through;
}
/* 原 GridView3_RowCellStyle：检验结果底色（不合格红 / 合格绿 / 非合格黄）与内控超差黄 */
:deep(.judge-bg-ng) {
  background-color: rgba(255, 0, 0, 0.247) !important;
}
:deep(.judge-bg-ok) {
  background-color: rgba(0, 255, 0, 0.247) !important;
}
:deep(.judge-bg-warn) {
  background-color: rgba(255, 255, 0, 0.247) !important;
}
</style>
