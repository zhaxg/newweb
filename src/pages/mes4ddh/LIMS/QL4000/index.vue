<script setup lang="ts">
/** 对应 FrmQL4000（检验结果录入）：DDH.Winforms.LIMS.Forms.FrmQL4000
 *  布局：查询条件区（DataLayout 9 项：产线/委托单号/炉号/钢种/执行标准/复验标记/试验项/批号 + 登记时间 UCTimeRange→DReceiveTime）
 *       + stackPanel1（查询/采集试验结果/提交审核/更新检验项目 + 右侧「委托单信息」标题，主表无独立标题条）
 *       → 上下 Splitter（检验委托 UCTestJob 144/690≈21%，无独立标题条 | 下=录入区）
 *       → 录入区：h-9 工具栏（SelectButton 批量录入/单行录入 + 右侧「检验结果录入」）
 *         → 左右 Splitter（左右面板均 h-9 按钮左+标题右 → 网格；
 *           批量 424/1091≈39%、单行 611/1091≈56%）
 *  已接入：testJobApi.queryTestJob / queryTestSample / saveSamples / completeItem / remark / updateTestJobItems /
 *         tqlLXCollectApi.getTensileCollectDataByBatch / getImpactCollectDataByBatch /
 *                  getTensileCollectDataBySampleNos / getImpactCollectDataBySampleNos /
 *         tPa1000Api.queryLines（产线下拉，原 LineFormatter）
 *  待接入：委托表「冶金规范码/制造标准」单元格点击查看（IMscView/IStNoView，同 QL3000）
 *  已知偏差：FrmConfirmValueDialog（增加备注输入）以页内单字段 Dialog 复刻；C# CalcFormula 公式引擎未迁——
 *         公式项判定依赖服务端下发的 formulaResult/范围，录入值按范围型 AutoJudge 等价判定；
 *         单行录入页签「复制结果/粘贴结果」原 C# 处理器为空，按原样无操作；
 *         cQueryString（type/item）目前未经路由下发，页面从 route.query 读取备用（原 Load 里 type 灌入后即清空控件，此处等价：试验项初始 null）；
 *         试验项下拉候选取自字典 A0100:TEST_ITEM_TYPE（kvs 种子 P1/P2/P3/PA），原为运行时 KeyValue 装载 */
import { computed, onMounted, reactive, ref, shallowRef } from "vue";
import { useRoute } from "vue-router";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import SelectButton from "primevue/selectbutton";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import {
  IconCheck,
  IconClipboard,
  IconCopy,
  IconDeviceFloppy,
  IconEraser,
  IconFlask,
  IconNote,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-vue";
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
  CtrlMode,
  EqualsFlag,
  SampleJudgeResult,
  YesNo,
  tqlLXCollectApi,
  testJobApi,
  type CompleteItemInput,
  type QueryTestJobInput,
  type TestItemValue,
  type TestJob,
  type TestSample,
  type TqlImpactCollect,
  type TqlLxCollect,
  type TimeRange,
} from "@/api/mes4ddh/lims.swagger";
import { tPa1000Api, type Tpa1000 as LineRow } from "@/api/mes4ddh/shr.swagger";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const route = useRoute();
const auth = useAuthStore();

/* ---------- 格式化（照原 LDisplay / 枚举显示） ---------- */
const yesNoFmt = (p: ValueFormatterParams) => (p.value == null ? "" : Number(p.value) === 1 ? "是" : "否");
const statusFmt = (p: ValueFormatterParams) =>
  (
    ({
      0: "未发送",
      1: "已发送未接收",
      20: "已接收",
      25: "已拒收",
      30: "已完成",
    }) as Record<string, string>
  )[String(p.value)] ?? (p.value == null ? "" : String(p.value));
const jobJudgeFmt = (p: ValueFormatterParams) =>
  (({ 0: "待判", 2: "合格", 3: "不合格", 4: "人工放行" }) as Record<string, string>)[String(p.value)] ?? "";
const sampleJudgeFmt = (p: ValueFormatterParams) =>
  (({ 0: "待判", 1: "不需判", 2: "合格", 3: "不合格" }) as Record<string, string>)[String(p.value)] ?? "";
const ctrlModeFmt = (p: ValueFormatterParams) =>
  (({ 0: "标准", 1: "内控" }) as Record<string, string>)[String(p.value)] ?? "";
/** DecimalRange.ToString（NumberRangeFormatter）：[min, max] / [min, ) / ( , max] */
const rangeFmt = (
  range: { min?: number | null; max?: number | null; equalsMethod?: EqualsFlag } | null | undefined,
) => {
  if (!range || (range.min == null && range.max == null)) return "";
  const eq = Number(range.equalsMethod ?? EqualsFlag.Default);
  const leftOpen = (eq & EqualsFlag.LeftOpen) !== 0;
  const rightOpen = (eq & EqualsFlag.RightOpen) !== 0;
  if (range.min != null && range.max != null)
    return `${leftOpen ? "(" : "["}${range.min}, ${range.max}${rightOpen ? ")" : "]"}`;
  if (range.min != null) return `${leftOpen ? "(" : "["}${range.min}, )`;
  return `( , ${range.max}${rightOpen ? ")" : "]"}`;
};
const rangeCellFmt = (p: ValueFormatterParams) => rangeFmt(p.value as never);

function str(v: unknown) {
  return v == null ? "" : String(v);
}
function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
/** RoundHelper.Round(cValue, nItemAccuracy) 等价显示值 */
function displayValue(item: TestItemValue | null | undefined): string {
  if (!item) return "";
  const raw = item.cValue;
  if (raw == null || raw === "") return str(item.valueDisplay);
  const acc = item.nItemAccuracy;
  if (acc == null) return raw;
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  let s = n.toFixed(Number(acc));
  if (s.includes(".")) s = s.replace(/\.?0+$/, "");
  return s;
}
/** DecimalRangeExtinsons.CheckInRange */
function checkInRange(
  range: { min?: number | null; max?: number | null; equalsMethod?: EqualsFlag } | null | undefined,
  value: number,
): boolean {
  if (!range) return true;
  const eq = Number(range.equalsMethod ?? EqualsFlag.Default);
  let ok = true;
  if (range.min != null) ok = ok && ((eq & EqualsFlag.LeftOpen) !== 0 ? value > range.min : value >= range.min);
  if (range.max != null) ok = ok && ((eq & EqualsFlag.RightOpen) !== 0 ? value < range.max : value <= range.max);
  return ok;
}
function rangeIsEmpty(range: { min?: number | null; max?: number | null } | null | undefined) {
  return !range || (range.min == null && range.max == null);
}

/* ---------- 客户端 AutoJudge（TestItemValue.AutoJudge / TestSample.AutoJudge；
     CalcFormula 公式求值未迁，公式项走服务端下发的 formulaResult） ---------- */
function autoJudgeItem(item: TestItemValue) {
  if (item.formulaResult != null) {
    item.cJudgeResult = item.formulaResult ? SampleJudgeResult.Qualified : SampleJudgeResult.Unqualified;
    return;
  }
  const range = Number(item.ctrlMode) === CtrlMode.Std ? item.judgeRange : item.judgeRangeNk;
  if (Number(item.isJudge) !== YesNo.Y) {
    item.cJudgeResult = SampleJudgeResult.NoNeedForJudgement;
    return;
  }
  const disp = displayValue(item);
  if (rangeIsEmpty(range)) {
    if (!str(item.cTargetValue) || !disp) item.cJudgeResult = SampleJudgeResult.None;
    else item.cJudgeResult = disp === item.cTargetValue ? SampleJudgeResult.Qualified : SampleJudgeResult.Unqualified;
    return;
  }
  const v = Number(disp);
  if (disp.trim() !== "" && Number.isFinite(v)) {
    item.cJudgeResult = checkInRange(range, v) ? SampleJudgeResult.Qualified : SampleJudgeResult.Unqualified;
    return;
  }
  if (str(item.cTargetValue) && disp === item.cTargetValue) item.cJudgeResult = SampleJudgeResult.Qualified;
  else item.cJudgeResult = SampleJudgeResult.None;
}
function autoJudgeSample(sample: TestSample) {
  for (const item of sample.testItems ?? []) autoJudgeItem(item);
  // 原 TestSample.AutoJudge：不合格子项名拼进 CJudgeRemark
  sample.cJudgeRemark = (sample.testItems ?? [])
    .filter((x) => Number(x.cJudgeResult) === SampleJudgeResult.Unqualified)
    .map((x) => `${x.cTestSubItemName}不合;`)
    .join("");
  const results = (sample.testItems ?? []).map((x) => Number(x.cJudgeResult));
  if (
    results.length > 0 &&
    results.every((r) => r === SampleJudgeResult.Qualified || r === SampleJudgeResult.NoNeedForJudgement)
  ) {
    sample.cJudgeResult = SampleJudgeResult.Qualified;
  } else if (results.some((r) => r === SampleJudgeResult.Unqualified)) {
    sample.cJudgeResult = SampleJudgeResult.Unqualified;
  } else if (results.some((r) => r === SampleJudgeResult.None)) {
    sample.cJudgeResult = SampleJudgeResult.None;
  }
  sample.dJudgeTime =
    Number(sample.cJudgeResult) === SampleJudgeResult.None
      ? null
      : new Date().toISOString().slice(0, 19).replace("T", " ");
}
function sortSamples(list: TestSample[]): TestSample[] {
  return [...list].sort(
    (a, b) =>
      str(a.cTestItemType).localeCompare(str(b.cTestItemType)) ||
      str(a.cTestItem).localeCompare(str(b.cTestItem)) ||
      num(a.cDisable) - num(b.cDisable) ||
      str(a.cSampleNo).localeCompare(str(b.cSampleNo)),
  );
}

/* ---------- 查询条件（原 queryTestJobInputBindingSource；登记时间绑定 DReceiveTime） ---------- */
const input = reactive({
  dates: null as Date[] | null,
  cLineCode: null as string | null,
  cTestNo: "",
  cStove: "",
  cSgSign: "",
  cSgStd: "",
  cRecheckFlag: null as YesNo | null | "",
  testItemType: null as string | null,
  cBatch: "",
});
/** 原 Load：QueryString 的 type/item —— item 常驻 Input.TestItems，type 灌下拉后即清空控件 */
const sessionTestItems: string[] = str(route.query.item)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const recheckOptions = [
  { label: "否", value: YesNo.N },
  { label: "是", value: YesNo.Y },
];
/** 字典 A0100:TEST_ITEM_TYPE（原 KeyValueFormatters.TestItemType 运行时装载） */
const testItemTypeOptions = [
  { label: "P1 拉伸", value: "P1" },
  { label: "P2 弯曲", value: "P2" },
  { label: "P3 冲击", value: "P3" },
  { label: "PA 金相", value: "PA" },
];
const lineOptions = ref<{ label: string; value: string }[]>([]);
async function loadLines() {
  try {
    const rows = (await tPa1000Api.queryLines()) ?? [];
    lineOptions.value = (rows as LineRow[])
      .filter((r) => r.cCode != null)
      .map((r) => ({ label: r.cName ?? r.cCode ?? "", value: r.cCode! }));
  } catch {
    /* 拦截层已 toast */
  }
}
function isoLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates?.[0]) return undefined;
  return { min: isoLocal(dates[0]), max: dates[1] ? isoLocal(dates[1]) : undefined };
}
function buildQuery(): QueryTestJobInput {
  return {
    cLineCode: input.cLineCode || undefined,
    cTestNo: input.cTestNo?.trim() || undefined,
    cStove: input.cStove?.trim() || undefined,
    cSgSign: input.cSgSign?.trim() || undefined,
    cSgStd: input.cSgStd?.trim() || undefined,
    cRecheckFlag: input.cRecheckFlag === "" || input.cRecheckFlag == null ? null : input.cRecheckFlag,
    testItemType: input.testItemType || undefined,
    cBatch: input.cBatch?.trim() || undefined,
    dReceiveTime: toTimeRange(input.dates),
    testItems: sessionTestItems.length ? [...sessionTestItems] : undefined,
  };
}

/* ---------- 状态 ---------- */
const jobRows = shallowRef<TestJob[]>([]);
const samples = shallowRef<TestSample[]>([]);
const detailRows = shallowRef<TestItemValue[]>([]);
const selectedJob = ref<TestJob | null>(null);
const focusedSample = ref<TestSample | null>(null);
const querying = ref(false);
const loadingSamples = ref(false);
const saving = ref(false);
/** 原 xtraTabControl1 两页签 → SelectButton 切换（批量录入 / 单行录入） */
const entryModes = ["批量录入", "单行录入"];
const activeTab = ref(entryModes[0]);
const jobGridApi = ref<GridApi | null>(null);
const singleGridApi = ref<GridApi | null>(null);
const mutiGridApi = ref<GridApi | null>(null);
const detailGridApi = ref<GridApi | null>(null);
const pivotGridApi = ref<GridApi | null>(null);

/* ---------- 列定义 ---------- */
/** UCTestJob.gridView1（TestJob，可见45+隐藏16，列序/中文头与 QL3000 同源） */
const jobColDefs = ref<ColDef[]>([
  // 原 colSelected 勾选列按 ui-rules §7 转隐藏列（行选择负责选中）；colCStove/colCBatch 仍 Fixed=Left
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cStove", headerName: "炉号", width: 110, pinned: "left" },
  { field: "cBatch", headerName: "批号", width: 110, pinned: "left" },
  { field: "cInternalNo", headerName: "内部编号", width: 110 },
  { field: "cTestNo", headerName: "委托单号", width: 130 },
  { field: "nTestTimes", headerName: "试验次数", width: 90 },
  { field: "cRecheckFlag", headerName: "复验标记", width: 90, valueFormatter: yesNoFmt },
  { field: "cStatus", headerName: "委托单状态", width: 120, valueFormatter: statusFmt },
  {
    field: "cLineCode",
    headerName: "产线代码",
    width: 100,
    valueFormatter: (p) => lineOptions.value.find((l) => l.value === p.value)?.label ?? p.value ?? "",
  },
  { field: "cSgSign", headerName: "钢种", width: 100 },
  { field: "cSgStd", headerName: "执行标准", width: 120 },
  { field: "cDeliveryStateDesc", headerName: "交货状态描述", width: 130 },
  { field: "cCustStd", headerName: "加工用途", width: 110 },
  { field: "cStNo", headerName: "制造标准", width: 110 },
  { field: "cSpec", headerName: "规格", width: 100 },
  { field: "nThick", headerName: "厚度mm", width: 90 },
  { field: "nWth", headerName: "宽度mm", width: 90 },
  { field: "nLen", headerName: "长度mm", width: 90 },
  {
    field: "cAutoJudgeResult",
    headerName: "自动判定结果",
    width: 120,
    valueFormatter: jobJudgeFmt,
    cellClass: (p) => jobJudgeCell(p),
  },
  { field: "cJudgeUser", headerName: "判定人", width: 90 },
  { field: "dJudgeTime", headerName: "判定时间", width: 140 },
  {
    field: "cJudgeResult",
    headerName: "最终判定结果",
    width: 120,
    valueFormatter: jobJudgeFmt,
    cellClass: (p) => jobJudgeCell(p),
  },
  { field: "cJudgeRemark", headerName: "判定备注", width: 120 },
  { field: "creator", headerName: "创建人", width: 90 },
  { field: "createTime", headerName: "创建时间", width: 140 },
  { field: "dReceiveTime", headerName: "确认接收时间", width: 140 },
  { field: "dReceiveUser", headerName: "确认接收人", width: 110 },
  { field: "cConfirmUser", headerName: "确认判定人", width: 110 },
  { field: "cSendUser", headerName: "确认发送人", width: 110 },
  { field: "dConfirmTime", headerName: "确认判定时间", width: 140 },
  { field: "dSendTime", headerName: "确认发送时间", width: 140 },
  { field: "cOrderNo", headerName: "订单号", width: 120 },
  { field: "orderCustCName", headerName: "订货客户", width: 120 },
  { field: "cCustStdCode", headerName: "加工用途代码", width: 120 },
  { field: "cDelivyStatusCode", headerName: "交货状态代码", width: 120 },
  { field: "cCzpFlag", headerName: "重组批标记", width: 100, valueFormatter: yesNoFmt },
  { field: "cPrevTestNo", headerName: "前委托单号", width: 120 },
  { field: "wgt", headerName: "重量", width: 80 },
  { field: "count", headerName: "件数", width: 80 },
  { field: "cJiaJi", headerName: "加急", width: 70, valueFormatter: yesNoFmt },
  { field: "cMatShape", headerName: "尺寸外形", width: 100 },
  { field: "cSpecialDesc", headerName: "特殊要求", width: 120 },
  { field: "cSpecialMarkHt", headerName: "技术要求特殊说明", width: 150 },
  { field: "cSpecialPackDesc", headerName: "特殊包装要求叙述", width: 160 },
  { field: "cWarrantyDesc", headerName: "质保书要求", width: 120 },
  { field: "id", headerName: "主键", hide: true },
  { field: "lastModifier", headerName: "最后更新人", hide: true },
  { field: "lastModifyTime", headerName: "最后更新时间", hide: true },
  { field: "cpStove", headerName: "母炉号", hide: true },
  { field: "cMsc", headerName: "冶金规范码", hide: true },
  { field: "cMscLineNo", headerName: "冶金规范产线号", hide: true },
  { field: "cWholeBacklogCode", headerName: "全程工序代码", hide: true },
  { field: "cDesignNo", headerName: "质量设计号", hide: true },
  { field: "currentItemCompleteFlag", headerName: "项目完成标记", hide: true },
  { field: "nCastDivCode", headerName: "模连铸标识", hide: true },
  { field: "cPlanRemark", headerName: "计划备注", hide: true },
  { field: "wgtD", headerName: "锭量", hide: true },
  { field: "wgtP", headerName: "坯量", hide: true },
  { field: "cHeadFoot", headerName: "头尾坯标识", hide: true, cellClass: (p) => (p.value ? "flag-bad" : "") },
  { field: "cHeadFootStove", headerName: "头尾炉标识", hide: true, cellClass: (p) => (p.value ? "flag-bad" : "") },
  { field: "cException", headerName: "异常坯标识", hide: true, cellClass: (p) => (p.value ? "flag-bad" : "") },
]);
function jobJudgeCell(p: CellClassParams) {
  const v = Number(p.value);
  if (v === 2 || v === 4) return "judge-ok";
  if (v === 3) return "judge-ng";
  return "";
}
/** 原 UCTestJob.RowCellStyle：加急整行黄底 */
function jobRowClass(p: RowClassParams) {
  return num((p.data as TestJob | undefined)?.cJiaJi) === YesNo.Y ? "row-jiaji" : undefined;
}

/** 单行录入 试样信息（UCTestItemResult.gridView2，TestSample 可见23+隐藏17：DJudgeTime/Selected 收隐藏） */
const singleSampleColDefs = ref<ColDef[]>([
  {
    field: "cSampleNo",
    headerName: "试样号",
    width: 100,
    cellClass: (p) => (Number(p.data?.cDisable) === YesNo.Y ? "smp-strike" : ""),
  },
  { field: "cTestItemTypeDesc", headerName: "试验项目种类描述", width: 150 },
  { field: "cTestItemName", headerName: "试验项目名称", width: 130 },
  { field: "cSamplePosDesc", headerName: "取样位置", width: 100 },
  { field: "cSampleLenDesc", headerName: "取样长度说明", width: 120 },
  { field: "cTestDirectDesc", headerName: "试验方向", width: 90 },
  {
    field: "cJudgeResult",
    headerName: "判定结果",
    width: 90,
    valueFormatter: sampleJudgeFmt,
    cellClass: (p) => sampleJudgeCell(p),
  },
  { field: "cJudgeRemark", headerName: "判定备注", width: 130 },
  { field: "labRemark", headerName: "实验室备注", width: 130 },
  { field: "cTestItem", headerName: "试验项目", width: 100 },
  { field: "cTestItemType", headerName: "试验项目种类", width: 120 },
  { field: "cSamplePos", headerName: "取样位置代码", width: 110 },
  { field: "cSampleLen", headerName: "取样长度", width: 100 },
  { field: "cTestDirect", headerName: "试验方向代码", width: 110 },
  { field: "cTestAdditionDesc", headerName: "试验补充说明", width: 130 },
  { field: "cGroupNo", headerName: "结果录入班组", width: 110 },
  { field: "cShiftNo", headerName: "结果录入班次", width: 110 },
  { field: "cTestUser", headerName: "结果录入人", width: 110 },
  { field: "dTestTime", headerName: "结果录入时间", width: 140 },
  { field: "cRecheckFlag", headerName: "复验标记", width: 90, valueFormatter: yesNoFmt },
  { field: "creator", headerName: "创建人", width: 90 },
  { field: "createTime", headerName: "创建时间", width: 140 },
  { field: "cWholeBacklogCode", headerName: "全程工序代码", width: 130 },
  { field: "id", headerName: "主键", hide: true },
  { field: "lastModifier", headerName: "最后更新人", hide: true },
  { field: "lastModifyTime", headerName: "最后更新时间", hide: true },
  { field: "fId", headerName: "检验委托ID", hide: true },
  { field: "cTestNo", headerName: "委托单号", hide: true },
  { field: "cStove", headerName: "炉号", hide: true },
  { field: "cpStove", headerName: "母炉号", hide: true },
  { field: "cSgSign", headerName: "钢种", hide: true },
  { field: "cSgStd", headerName: "执行标准", hide: true },
  { field: "cStNo", headerName: "制造标准", hide: true },
  { field: "cOrderNo", headerName: "订单号", hide: true },
  { field: "cLineCode", headerName: "产线代码", hide: true },
  { field: "cMsc", headerName: "冶金规范码", hide: true },
  { field: "cMscLineNo", headerName: "冶金规范产线号", hide: true },
  { field: "dJudgeTime", headerName: "判定时间", hide: true },
  { field: "nTestTimes", headerName: "试验次数", hide: true },
  { field: "selected", headerName: "选择", hide: true },
]);
/** 批量录入 试样信息（UCTestItemResultMuti.gridView2，可见24：DJudgeTime 在 11 位；无 Selected 列） */
const mutiSampleColDefs = ref<ColDef[]>([
  { field: "cSampleNo", headerName: "试样号", width: 100 },
  { field: "cTestItemTypeDesc", headerName: "试验项目种类描述", width: 150 },
  { field: "cTestItemName", headerName: "试验项目名称", width: 130 },
  { field: "cSamplePosDesc", headerName: "取样位置", width: 100 },
  { field: "cSampleLenDesc", headerName: "取样长度说明", width: 120 },
  { field: "cTestDirectDesc", headerName: "试验方向", width: 90 },
  {
    field: "cJudgeResult",
    headerName: "判定结果",
    width: 90,
    valueFormatter: sampleJudgeFmt,
    cellClass: (p) => sampleJudgeCell(p),
  },
  { field: "cJudgeRemark", headerName: "判定备注", width: 130 },
  { field: "labRemark", headerName: "实验室备注", width: 130 },
  { field: "cTestItem", headerName: "试验项目", width: 100 },
  { field: "cTestItemType", headerName: "试验项目种类", width: 120 },
  { field: "dJudgeTime", headerName: "判定时间", width: 140 },
  { field: "cSamplePos", headerName: "取样位置代码", width: 110 },
  { field: "cSampleLen", headerName: "取样长度", width: 100 },
  { field: "cTestDirect", headerName: "试验方向代码", width: 110 },
  { field: "cTestAdditionDesc", headerName: "试验补充说明", width: 130 },
  { field: "cGroupNo", headerName: "结果录入班组", width: 110 },
  { field: "cShiftNo", headerName: "结果录入班次", width: 110 },
  { field: "cTestUser", headerName: "结果录入人", width: 110 },
  { field: "dTestTime", headerName: "结果录入时间", width: 140 },
  { field: "cRecheckFlag", headerName: "复验标记", width: 90, valueFormatter: yesNoFmt },
  { field: "creator", headerName: "创建人", width: 90 },
  { field: "createTime", headerName: "创建时间", width: 140 },
  { field: "cWholeBacklogCode", headerName: "全程工序代码", width: 130 },
  { field: "id", headerName: "主键", hide: true },
  { field: "lastModifier", headerName: "最后更新人", hide: true },
  { field: "lastModifyTime", headerName: "最后更新时间", hide: true },
  { field: "fId", headerName: "检验委托ID", hide: true },
  { field: "cTestNo", headerName: "委托单号", hide: true },
  { field: "cStove", headerName: "炉号", hide: true },
  { field: "cpStove", headerName: "母炉号", hide: true },
  { field: "cSgSign", headerName: "钢种", hide: true },
  { field: "cSgStd", headerName: "执行标准", hide: true },
  { field: "cStNo", headerName: "制造标准", hide: true },
  { field: "cOrderNo", headerName: "订单号", hide: true },
  { field: "cLineCode", headerName: "产线代码", hide: true },
  { field: "cMsc", headerName: "冶金规范码", hide: true },
  { field: "cMscLineNo", headerName: "冶金规范产线号", hide: true },
  { field: "nTestTimes", headerName: "试验次数", hide: true },
]);
function sampleJudgeCell(p: CellClassParams) {
  const v = Number((p.data as TestSample | undefined)?.cJudgeResult);
  if (v === SampleJudgeResult.Unqualified) return "judge-ng";
  if (v === SampleJudgeResult.Qualified) return "judge-ok";
  return "";
}
/** 原 UCTestItemResult.gridView2.RowCellStyle：禁用斜体银底（试样号删除线）/ 实验室备注橙底 */
function singleSampleRowClass(p: RowClassParams) {
  const d = p.data as TestSample | undefined;
  const cls: string[] = [];
  if (d && Number(d.cDisable) === YesNo.Y) cls.push("smp-disabled");
  if (d?.labRemark?.trim()) cls.push("smp-remark");
  return cls.length ? cls.join(" ") : undefined;
}
/** 原 UCTestItemResultMuti.gridView2.RowCellStyle：实验室备注橙底 */
function mutiSampleRowClass(p: RowClassParams) {
  const d = p.data as TestSample | undefined;
  return d?.labRemark?.trim() ? "smp-remark" : undefined;
}

/** 单行录入 明细（UCTestItemResult.gridView3，TestItemValue 可见14+隐藏25；ValueDisplay 列可编辑、CValue 只读） */
const detailColDefs = ref<ColDef[]>([
  { field: "cTestSubItemName", headerName: "试验子项目名称", width: 140 },
  { field: "cTestSubItemDisplayName", headerName: "项目说明", width: 130 },
  {
    field: "valueDisplay",
    headerName: "试验结果",
    width: 100,
    editable: true,
    cellClass: (p) => valueCellClass(p.data as TestItemValue),
    valueGetter: (p) => displayValue(p.data as TestItemValue),
    valueSetter: (p) => {
      const row = p.data as TestItemValue;
      row.cValue = p.newValue == null ? null : String(p.newValue);
      row.valueDisplay = row.cValue;
      return true;
    },
  },
  { field: "isJudge", headerName: "是否判定", width: 90, valueFormatter: yesNoFmt },
  { field: "ctrlMode", headerName: "管控模式", width: 90, valueFormatter: ctrlModeFmt },
  { field: "judgeRange", headerName: "标准范围", width: 130, valueFormatter: rangeCellFmt },
  { field: "judgeRangeNk", headerName: "内控范围", width: 130, valueFormatter: rangeCellFmt },
  { field: "cTargetValue", headerName: "目标值", width: 90 },
  { field: "cFormula", headerName: "计算公式", width: 120 },
  { field: "cTestSubItem", headerName: "试验子项代码", width: 110 },
  { field: "cValue", headerName: "原始结果", width: 100 },
  { field: "nItemAccuracy", headerName: "精度", width: 70 },
  { field: "isPrint", headerName: "是否打质保书", width: 110, valueFormatter: yesNoFmt },
  {
    field: "cJudgeFormula",
    headerName: "计算公式",
    width: 120,
    cellClass: (p) => ((p.data as TestItemValue | undefined)?.formulaResult === false ? "judge-ng" : ""),
  },
  { field: "id", headerName: "主键", hide: true },
  { field: "creator", headerName: "创建人", hide: true },
  { field: "createTime", headerName: "创建时间", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { field: "cTestNo", headerName: "委托单号", hide: true },
  { field: "cStove", headerName: "炉号", hide: true },
  { field: "cpStove", headerName: "母炉号", hide: true },
  { field: "cSgSign", headerName: "钢种", hide: true },
  { field: "cSgStd", headerName: "执行标准", hide: true },
  { field: "cStNo", headerName: "制造标准号", hide: true },
  { field: "cOrderNo", headerName: "订单号", hide: true },
  { field: "cLineCode", headerName: "产线代码", hide: true },
  { field: "cMsc", headerName: "冶金规范码", hide: true },
  { field: "cMscLineNo", headerName: "冶金规范产线号", hide: true },
  { field: "cWholeBacklogCode", headerName: "全程工序代码", hide: true },
  { field: "fId", headerName: "试样ID", hide: true },
  { field: "cSampleNo", headerName: "试样号", hide: true },
  { field: "cTestItemType", headerName: "试验项目种类", hide: true },
  { field: "cTestItemTypeDesc", headerName: "试验项目种类描述", hide: true },
  { field: "cTestItem", headerName: "试验项目号", hide: true },
  { field: "cTestItemName", headerName: "试验项目名称", hide: true },
  { field: "cJudgeResult", headerName: "最终判定结果", hide: true, valueFormatter: sampleJudgeFmt },
  { field: "cRecheckFlag", headerName: "复验标记", hide: true, valueFormatter: yesNoFmt },
  { field: "seq", headerName: "序号", hide: true },
]);
/** 原 gridView3 / bandedGridView1.RowCellStyle：按判定着色 + 超限（≥10×标准下限）红底加粗 */
function valueCellClass(row: TestItemValue | undefined): string {
  if (!row) return "";
  const cv = Number(row.cValue);
  const min = row.judgeRange?.min;
  if (
    row.cValue != null &&
    row.cValue !== "" &&
    Number.isFinite(cv) &&
    min != null &&
    Number(min) > 0 &&
    cv >= Number(min) * 10
  ) {
    return "val-overflow";
  }
  switch (Number(row.cJudgeResult)) {
    case SampleJudgeResult.None:
    case SampleJudgeResult.Unqualified:
      return "judge-ng";
    case SampleJudgeResult.NoNeedForJudgement:
      return Number(row.needTest) === YesNo.Y ? "val-blue" : "";
    case SampleJudgeResult.Qualified: {
      const disp = displayValue(row);
      const v = Number(disp);
      if (disp.trim() !== "" && Number.isFinite(v) && !checkInRange(row.judgeRangeNk, v)) return "val-warn";
      return "judge-ok";
    }
    default:
      return "judge-ng";
  }
}

/* ---------- 批量录入 透视表（bandedGridView1：行=TestItemRow 子项，列=按试样动态生成、按试验项目分组） ---------- */
const pivotRows = computed(() => {
  const map = new Map<string, { code: string; name: string; seq: number }>();
  for (const s of samples.value) {
    for (const t of s.testItems ?? []) {
      const key = `${t.cTestSubItem}\u0000${t.cTestSubItemName}`;
      if (!map.has(key)) map.set(key, { code: str(t.cTestSubItem), name: str(t.cTestSubItemName), seq: num(t.seq) });
    }
  }
  return [...map.values()].sort((a, b) => a.seq - b.seq);
});
const pivotColDefs = computed<ColDef[]>(() => {
  const head: ColDef[] = [
    { field: "code", headerName: "试验子项", width: 100, minWidth: 80, pinned: "left" },
    { field: "name", headerName: "试验子项名称", width: 130, minWidth: 100, pinned: "left" },
    { field: "desc", headerName: "项目说明", hide: true },
  ];
  const ordered = [...samples.value].sort((a, b) => str(a.cSampleNo).localeCompare(str(b.cSampleNo)));
  const groupIdx = new Map<string, number>();
  const groups: { headerName: string; marryChildren: boolean; children: ColDef[] }[] = [];
  for (const smp of ordered) {
    const key = `${smp.cTestItemType}${smp.cTestItem}`;
    let gi = groupIdx.get(key);
    if (gi == null) {
      gi = groups.length;
      groupIdx.set(key, gi);
      groups.push({ headerName: str(smp.cTestItemName), marryChildren: true, children: [] });
    }
    const smpId = str(smp.id);
    groups[gi].children.push({
      colId: `smp-${smpId}`,
      headerName: str(smp.cSampleNo),
      minWidth: 100,
      width: 110,
      editable: true,
      cellClass: () => {
        const item = findItem(smpId, undefined);
        return item ? valueCellClass(item) : "";
      },
      valueGetter: (p) => {
        const item = findItem(smpId, str(p.data?.code));
        return item ? displayValue(item) : "";
      },
      valueSetter: (p) => {
        const item = findItem(smpId, str(p.data?.code));
        if (!item) return false;
        item.cValue = p.newValue == null ? null : String(p.newValue);
        item.valueDisplay = item.cValue;
        autoJudgeSample(smp);
        return true;
      },
    });
  }
  return [...head, ...groups];
});
function findItem(sampleId: string, code: string | undefined): TestItemValue | undefined {
  const smp = samples.value.find((s) => str(s.id) === sampleId);
  if (!smp || code == null) return undefined;
  return (smp.testItems ?? []).find((t) => str(t.cTestSubItem) === code);
}

/* ---------- 查询 / 行联动 ---------- */
async function onQuery() {
  querying.value = true;
  try {
    const rows = (await testJobApi.queryTestJob(buildQuery())) ?? [];
    jobRows.value = rows;
    selectedJob.value = null;
    focusedSample.value = null;
    samples.value = [];
    detailRows.value = [];
    requestAnimationFrame(() => jobGridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
/** 原 UcLgTestJob1_FocusedRowObjectChanged → QueryTestSample → 双 UC.BindData → Collect(overWrite=false) */
async function loadSamplesFor(job: TestJob) {
  loadingSamples.value = true;
  try {
    const data =
      (await testJobApi.queryTestSample(
        str(job.id),
        input.testItemType ?? undefined,
        sessionTestItems.length ? [...sessionTestItems] : undefined,
      )) ?? [];
    if (selectedJob.value?.id !== job.id) return;
    const sorted = sortSamples(data);
    for (const s of sorted) autoJudgeSample(s);
    samples.value = sorted;
    focusedSample.value = sorted[0] ?? null;
    detailRows.value = focusedSample.value?.testItems ?? [];
    // C# BindData 后焦点默认首行（FocusedRowObjectChanged 再查同一数据），web 直接选中首行等价
    requestAnimationFrame(() => {
      const firstId = str(sorted[0]?.id);
      singleGridApi.value?.forEachNode((n) => n.setSelected(str(n.data?.id) === firstId));
    });
    await collectInto(job, sorted, false);
  } catch {
    /* 拦截层已 toast */
  } finally {
    loadingSamples.value = false;
  }
}
function onJobSelectionChanged(e: SelectionChangedEvent) {
  const node = e.api.getSelectedNodes()[0];
  const job = (node?.data as TestJob | undefined) ?? null;
  if (str(job?.id) === str(selectedJob.value?.id)) return;
  selectedJob.value = job;
  if (!job) {
    samples.value = [];
    detailRows.value = [];
    focusedSample.value = null;
    return;
  }
  void loadSamplesFor(job);
}
function onSingleSelectionChanged(e: SelectionChangedEvent) {
  const node = e.api.getSelectedNodes()[0];
  const smp = (node?.data as TestSample | undefined) ?? null;
  focusedSample.value = smp;
  detailRows.value = smp?.testItems ?? [];
}
function onDetailEdited() {
  if (focusedSample.value) autoJudgeSample(focusedSample.value);
  refreshDataCells();
}
function onPivotEdited() {
  refreshDataCells();
}
function refreshDataCells() {
  for (const api of [singleGridApi, mutiGridApi, detailGridApi, pivotGridApi]) {
    api.value?.refreshCells({ force: true });
    api.value?.redrawRows();
  }
}
function autoSizeAll() {
  requestAnimationFrame(() => {
    for (const api of [jobGridApi, singleGridApi, mutiGridApi, detailGridApi, pivotGridApi])
      api.value?.autoSizeAllColumns();
  });
}
function onJobGridReady(e: GridReadyEvent) {
  jobGridApi.value = e.api;
}
function onSingleGridReady(e: GridReadyEvent) {
  singleGridApi.value = e.api;
}
function onMutiGridReady(e: GridReadyEvent) {
  mutiGridApi.value = e.api;
}
function onDetailGridReady(e: GridReadyEvent) {
  detailGridApi.value = e.api;
}
function onPivotGridReady(e: GridReadyEvent) {
  pivotGridApi.value = e.api;
}

/* ---------- 采集试验结果（btnCollect_Click → Collect / CollectCZY / FillCollectData） ---------- */
const TENSILE = "P1";
const IMPACT = "P3";
const Z_XIANG = "P1C";
const TENSILE_FILL: Record<string, keyof TqlLxCollect> = {
  P101: "nYieLdStrength", // 下屈服强度
  P102: "nMaxStrength", // 抗拉强度
  P103: "nFinalRate", // 断后伸长率
  P105: "nFinalShrink", // 断面收缩率
  P106: "nYieLdUpStrength", // 上屈服强度
};
const IMPACT_FILL: Record<string, keyof TqlImpactCollect> = {
  P301: "cEnergy1", // 冲击功1
  P302: "cEnergy2", // 冲击功2
  P303: "cEnergy3", // 冲击功3
  P310: "cAveEnergy", // 平均冲击功
  P327: "cDirection", // 试验方向
  P328: "cTemperature", // 试验温度
};
function fillFrom(
  sample: TestSample,
  data: Record<string, unknown> | null | undefined,
  table: Record<string, string>,
  overWrite: boolean,
) {
  if (!data) return;
  for (const item of sample.testItems ?? []) {
    const has = Object.prototype.hasOwnProperty.call(table, str(item.cTestSubItem));
    const raw = has ? data[table[str(item.cTestSubItem)]] : undefined;
    const newVal = has ? (raw == null ? null : String(raw)) : item.cValue;
    item.cValue = overWrite ? (newVal as string | null) : (item.cValue ?? (newVal as string | null));
  }
}
function bindCollected(list: TestSample[]) {
  for (const s of list) autoJudgeSample(s);
  samples.value = [...list];
  if (focusedSample.value) detailRows.value = focusedSample.value.testItems ?? [];
  refreshDataCells();
  autoSizeAll();
}
async function collectInto(job: TestJob, list: TestSample[], overWrite: boolean) {
  if (num(job.czyFlag) === YesNo.Y) {
    await collectCZY(job, list, overWrite);
    return;
  }
  const [p1, p3] = await Promise.all([
    tqlLXCollectApi.getTensileCollectDataByBatch(str(job.cBatch)),
    tqlLXCollectApi.getImpactCollectDataByBatch(str(job.cBatch)),
  ]);
  const p1Samps = list.filter((x) => x.cTestItemType === TENSILE && x.cTestItem !== Z_XIANG);
  const p3Samps = list.filter((x) => x.cTestItemType === IMPACT);
  for (let i = 0; i < Math.min(p1Samps.length, p1?.length ?? 0); i++)
    fillFrom(p1Samps[i], p1![i] as never, TENSILE_FILL, overWrite);
  for (let i = 0; i < Math.min(p3Samps.length, p3?.length ?? 0); i++)
    fillFrom(p3Samps[i], p3![i] as never, IMPACT_FILL, overWrite);
  bindCollected(list);
}
async function collectCZY(job: TestJob, list: TestSample[], overWrite: boolean) {
  const smpNos = [...new Set(list.map((x) => str(x.cSampleNo)))];
  let p1 = (await tqlLXCollectApi.getTensileCollectDataBySampleNos(smpNos)) ?? [];
  let p3 = (await tqlLXCollectApi.getImpactCollectDataBySampleNos(smpNos)) ?? [];
  const p1Samps = list.filter((x) => x.cTestItemType === TENSILE && x.cTestItem !== Z_XIANG);
  const p3Samps = list.filter((x) => x.cTestItemType === IMPACT);
  if (!p1.length) {
    p1 = (await tqlLXCollectApi.getTensileCollectDataByBatch(str(job.cBatch))) ?? [];
    for (let i = 0; i < Math.min(p1Samps.length, p1.length); i++)
      fillFrom(p1Samps[i], p1[i] as never, TENSILE_FILL, overWrite);
  } else {
    for (const smp of p1Samps) {
      const data = p1.find((x) => str(x.cSampleNo) === str(smp.cSampleNo));
      if (data) fillFrom(smp, data as never, TENSILE_FILL, overWrite);
    }
  }
  if (!p3.length) {
    p3 = (await tqlLXCollectApi.getImpactCollectDataByBatch(str(job.cBatch))) ?? [];
    for (let i = 0; i < Math.min(p3Samps.length, p3.length); i++)
      fillFrom(p3Samps[i], p3[i] as never, IMPACT_FILL, overWrite);
  } else {
    for (const smp of p3Samps) {
      const data = p3.find((x) => str(x.cSampleNo) === str(smp.cSampleNo));
      if (data) fillFrom(smp, data as never, IMPACT_FILL, overWrite);
    }
  }
  bindCollected(list);
}
/** btnCollect_Click：重查试样并覆盖采集 */
async function onCollect() {
  const job = selectedJob.value;
  if (!job) return;
  try {
    const data =
      (await testJobApi.queryTestSample(
        str(job.id),
        input.testItemType ?? undefined,
        sessionTestItems.length ? [...sessionTestItems] : undefined,
      )) ?? [];
    const sorted = sortSamples(data);
    await collectInto(job, sorted, true);
    toast("采集完成", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  }
}

/* ---------- 保存（两页签 BtnSaveClick → OnSave → SaveSamples） ---------- */
async function onSave() {
  if (!selectedJob.value) return;
  saving.value = true;
  try {
    await testJobApi.saveSamples(samples.value);
    toast("保存成功", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    saving.value = false;
  }
}

/* ---------- 提交审核（btnComplete_Click：校验 → SaveSamples → CompleteItem → 重查） ---------- */
async function onComplete() {
  const job = selectedJob.value;
  if (!job) return;
  if (Number(job.currentItemCompleteFlag) === YesNo.Y) {
    toast("当前项目已提交，不需要重复操作", 2000, "warn");
    return;
  }
  const list = samples.value;
  const blankLines: string[] = [];
  for (const smp of list) {
    const items = smp.testItems ?? [];
    if (items.every((x) => !str(x.cValue).trim())) {
      toast(`${smp.cTestItemName} - ${smp.cSampleNo} 未录入结果，请先录入结果后再提交`, 3000, "warn");
      return;
    }
    autoJudgeSample(smp);
    if (Number(smp.cJudgeResult) === SampleJudgeResult.None) {
      toast(`${smp.cTestItemName} - ${smp.cSampleNo} 待判，不允许提交`, 3000, "warn");
      return;
    }
    for (const w of items) {
      if (Number(w.needTest) === YesNo.Y && !str(w.cValue).trim()) {
        blankLines.push(`${smp.cTestItemName} ${smp.cSampleNo} - ${w.cTestSubItemName}`);
      }
    }
  }
  const run = async () => {
    saving.value = true;
    try {
      const inputDto: CompleteItemInput = {
        tql3100Id: str(job.id) || undefined,
        testItemType: input.testItemType ?? undefined,
        testItems: sessionTestItems.length ? [...sessionTestItems] : undefined,
      };
      await testJobApi.saveSamples(list);
      await testJobApi.completeItem(inputDto);
      toast("提交成功", 2000, "success");
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    } finally {
      saving.value = false;
    }
  };
  if (blankLines.length) {
    askConfirm(`有些项目似乎还没有填写结果，您确定要提交空值吗？\n${blankLines.join("\n")}`, () => void run());
    return;
  }
  await run();
}

/* ---------- 更新检验项目（btnUpdateItem_Click） ---------- */
function onUpdateItem() {
  const job = selectedJob.value;
  if (!job) {
    toast("请先选择一条委托记录", 2000, "warn");
    return;
  }
  askConfirm(`确认更新委托 ${job.cTestNo} 的检验项目？`, () => void doUpdateItem(job));
}
async function doUpdateItem(job: TestJob) {
  try {
    await testJobApi.updateTestJobItems([str(job.cTestNo)]);
    toast("更新成功", 2000, "success");
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  }
}

/* ---------- 批量页签：复制/粘贴/增加备注/清除备注（UCTestItemResultMuti） ---------- */
let copiedSample: TestSample | null = null;
/** 原 GetFocusedRow ∪ GetSelectedRows：AG 36 以选中行近似（点击即选中，与原 AllowSyncRowStateToCheckboxSelection 等价） */
function focusOrSelected(api: GridApi | null): TestSample[] {
  return (api?.getSelectedNodes() ?? []).map((n) => n.data as TestSample);
}
function onCopyResult() {
  const node = mutiGridApi.value?.getSelectedNodes()[0];
  const row = node?.data as TestSample | undefined;
  if (!row) return;
  copiedSample = JSON.parse(JSON.stringify(row)) as TestSample;
  toast(`已复制试样${row.cSampleNo}的结果，请选择试样进行粘贴。`, 2500, "success");
}
function onPasteResult() {
  if (!copiedSample) {
    toast("请先选择试样复制结果", 2000, "warn");
    return;
  }
  const selected = (mutiGridApi.value?.getSelectedNodes() ?? []).map((n) => n.data as TestSample);
  if (selected.some((x) => x.cTestItemType !== copiedSample!.cTestItemType)) return;
  for (const sample of selected) {
    for (const item of sample.testItems ?? []) {
      if (item.cTestSubItem === "d") continue; // 不能复制直径
      const val = (copiedSample.testItems ?? []).find((x) => x.cTestSubItem === item.cTestSubItem)?.cValue;
      if (val != null) {
        item.cValue = val;
        item.valueDisplay = val;
      }
    }
  }
  refreshDataCells();
  autoSizeAll();
}
function remarkTargets(): TestSample[] {
  return focusOrSelected(mutiGridApi.value);
}
/* 增加备注 → FrmConfirmValueDialog（页内单字段 Dialog 复刻） */
const remarkOpen = ref(false);
const remarkText = ref("");
const remarkTitle = ref("");
const remarkInvalid = ref(false);
function onAddRemark() {
  const list = remarkTargets();
  if (!list.length) return;
  remarkTitle.value = `备注-已选择${list.length}个试样`;
  remarkText.value = "";
  remarkInvalid.value = false;
  pendingRemark = list;
  remarkOpen.value = true;
}
let pendingRemark: TestSample[] = [];
async function submitRemark() {
  if (!remarkText.value.trim()) {
    remarkInvalid.value = true;
    return;
  }
  const list = pendingRemark;
  remarkOpen.value = false;
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  for (const item of list) {
    item.labRemark = remarkText.value;
    item.cRemarkUser = auth.session?.userId;
    item.dRemarkTime = now;
  }
  try {
    await testJobApi.remark(
      remarkText.value,
      list.map((x) => str(x.id)),
    );
  } catch {
    /* 拦截层已 toast */
  }
  refreshDataCells();
}
function onClearRemark() {
  const list = remarkTargets();
  if (!list.length) return;
  askConfirm(`确定要清除选择${list.length}个试样的备注吗？`, () => void doClearRemark(list));
}
async function doClearRemark(list: TestSample[]) {
  for (const item of list) {
    item.labRemark = null;
    item.cRemarkUser = null;
    item.dRemarkTime = null;
  }
  try {
    await testJobApi.remark(
      "",
      list.map((x) => str(x.id)),
    );
  } catch {
    /* 拦截层已 toast */
  }
  refreshDataCells();
}

/* ---------- 确认框（MsgBox.ShowYesNo → 受控 Dialog） ---------- */
const confirmOpen = ref(false);
const confirmMsg = ref("");
let confirmAction: (() => void) | null = null;
function askConfirm(msg: string, action: () => void) {
  confirmMsg.value = msg;
  confirmAction = action;
  confirmOpen.value = true;
}
function onConfirmOk() {
  confirmOpen.value = false;
  const act = confirmAction;
  confirmAction = null;
  act?.();
}

onMounted(() => {
  void loadLines();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 dataLayoutControl1，9 项 → grid-cols-6；登记时间 UCTimeRange col-span-2） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产线代码</label>
          <Select
            v-model="input.cLineCode"
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
          <label class="w-16 shrink-0 text-xs text-muted-foreground">委托单号</label>
          <InputText v-model="input.cTestNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
          <InputText v-model="input.cStove" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="input.cSgSign" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
          <InputText v-model="input.cSgStd" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">复验标记</label>
          <Select
            v-model="input.cRecheckFlag"
            :options="recheckOptions"
            option-label="label"
            option-value="value"
            show-clear
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">试验项</label>
          <Select
            v-model="input.testItemType"
            :options="testItemTypeOptions"
            option-label="label"
            option-value="value"
            show-clear
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
          <InputText v-model="input.cBatch" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">登记时间</label>
          <DatePicker
            v-model="input.dates"
            selection-mode="range"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-time
            hour-format="24"
            show-icon
            placeholder="开始 至 结束"
            class="min-w-0 flex-1"
          />
        </div>
      </div>
    </div>

    <!-- stackPanel1：查询 / 采集试验结果 / 提交审核 / 更新检验项目 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCollect">
        <IconFlask class="h-3 w-3" />采集试验结果
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="saving" @click="onComplete">
        <IconCheck class="h-3 w-3" />提交审核
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onUpdateItem">
        <IconRefresh class="h-3 w-3" />更新检验项目
      </Button>
      <!-- 原 gridView1.ViewCaption「委托单信息」并入顶部按钮行右侧，主表不再单设标题条 -->
      <span class="ml-auto text-xs text-muted-foreground">委托单信息（{{ jobRows.length }}）</span>
    </div>

    <!-- 上下 Splitter（原 splitContainerControl1 Orientation=Vertical，144/690≈21%） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <!-- Panel1：检验委托（ucTestJob1，无独立标题条） -->
      <SplitterPanel :size="21" :minSize="12" class="flex min-h-0 flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="jobColDefs"
            :row-data="jobRows"
            :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
            :get-row-class="jobRowClass"
            :suppress-column-virtualisation="true"
            :pagination="false"
            :animate-rows="false"
            :loading="querying"
            @grid-ready="onJobGridReady"
            @selection-changed="onJobSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <!-- Panel2：录入区工具栏（SelectButton 切换 + 右上「检验结果录入」）→ 左右双表 -->
      <SplitterPanel :minSize="40" class="flex min-h-0 flex-col overflow-hidden">
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <SelectButton v-model="activeTab" :options="entryModes" class="shrink-0" />
          <span class="ml-auto shrink-0 text-xs text-muted-foreground">检验结果录入</span>
        </div>

        <!-- 批量录入（ucTestItemResultMuti1，左右 424/1091≈39%）：
             左右面板表头条均 h-9，按钮左 + 标题右 -->
        <div v-if="activeTab === entryModes[0]" class="min-h-0 flex-1 overflow-hidden">
          <Splitter class="h-full !border-0" layout="horizontal">
            <SplitterPanel :size="39" :minSize="25" class="flex min-h-0 flex-col overflow-hidden">
              <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
                <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCopyResult">
                  <IconCopy class="h-3 w-3" />复制结果
                </Button>
                <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onPasteResult">
                  <IconClipboard class="h-3 w-3" />粘贴结果
                </Button>
                <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAddRemark">
                  <IconNote class="h-3 w-3" />增加备注
                </Button>
                <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onClearRemark">
                  <IconEraser class="h-3 w-3" />清除备注
                </Button>
                <span class="ml-auto shrink-0 text-xs font-medium text-muted-foreground"
                  >试样信息（{{ samples.length }}）</span
                >
              </div>
              <div class="min-h-0 flex-1 overflow-hidden">
                <AgGridVue
                  class="hmx-ag-grid h-full w-full"
                  :theme="theme"
                  :locale-text="AG_GRID_LOCALE_CN"
                  :default-col-def="hmxDefaultColDef"
                  :column-defs="mutiSampleColDefs"
                  :row-data="samples"
                  :row-selection="{
                    mode: 'multiRow',
                    checkboxes: true,
                    headerCheckbox: true,
                    enableClickSelection: true,
                    enableSelectionWithoutKeys: true,
                  }"
                  :get-row-class="mutiSampleRowClass"
                  :suppress-column-virtualisation="true"
                  :pagination="false"
                  :animate-rows="false"
                  :loading="loadingSamples"
                  @grid-ready="onMutiGridReady"
                  @first-data-rendered="autoSizeOnFirstData"
                />
              </div>
            </SplitterPanel>
            <SplitterPanel :minSize="35" class="flex min-h-0 flex-col overflow-hidden">
              <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
                <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="saving" @click="onSave">
                  <IconDeviceFloppy class="h-3 w-3" />保存结果
                </Button>
                <span class="ml-auto shrink-0 text-xs font-medium text-muted-foreground">检验结果</span>
              </div>
              <div class="min-h-0 flex-1 overflow-hidden">
                <AgGridVue
                  class="hmx-ag-grid h-full w-full"
                  :theme="theme"
                  :locale-text="AG_GRID_LOCALE_CN"
                  :default-col-def="hmxDefaultColDef"
                  :column-defs="pivotColDefs"
                  :row-data="pivotRows"
                  :suppress-column-virtualisation="true"
                  :pagination="false"
                  :animate-rows="false"
                  @grid-ready="onPivotGridReady"
                  @cell-value-changed="onPivotEdited"
                  @first-data-rendered="autoSizeOnFirstData"
                />
              </div>
            </SplitterPanel>
          </Splitter>
        </div>

        <!-- 单行录入（ucTestItemResult1，左右 611/1091≈56%） -->
        <div v-else class="min-h-0 flex-1 overflow-hidden">
          <Splitter class="h-full !border-0" layout="horizontal">
            <SplitterPanel :size="55" :minSize="30" class="flex min-h-0 flex-col overflow-hidden">
              <!-- C# btnCopy/btnPaste 处理器为空，按原样保留按钮 -->
              <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
                <Button variant="outlined" class="shrink-0 whitespace-nowrap">
                  <IconCopy class="h-3 w-3" />复制结果
                </Button>
                <Button variant="outlined" class="shrink-0 whitespace-nowrap">
                  <IconClipboard class="h-3 w-3" />粘贴结果
                </Button>
                <span class="ml-auto shrink-0 text-xs font-medium text-muted-foreground"
                  >试样信息（{{ samples.length }}）</span
                >
              </div>
              <div class="min-h-0 flex-1 overflow-hidden">
                <AgGridVue
                  class="hmx-ag-grid h-full w-full"
                  :theme="theme"
                  :locale-text="AG_GRID_LOCALE_CN"
                  :default-col-def="hmxDefaultColDef"
                  :column-defs="singleSampleColDefs"
                  :row-data="samples"
                  :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
                  :get-row-class="singleSampleRowClass"
                  :suppress-column-virtualisation="true"
                  :pagination="false"
                  :animate-rows="false"
                  :loading="loadingSamples"
                  @grid-ready="onSingleGridReady"
                  @selection-changed="onSingleSelectionChanged"
                  @first-data-rendered="autoSizeOnFirstData"
                />
              </div>
            </SplitterPanel>
            <SplitterPanel :minSize="35" class="flex min-h-0 flex-col overflow-hidden">
              <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
                <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="saving" @click="onSave">
                  <IconDeviceFloppy class="h-3 w-3" />保存结果
                </Button>
                <span class="ml-auto shrink-0 text-xs font-medium text-muted-foreground">检验结果</span>
              </div>
              <div class="min-h-0 flex-1 overflow-hidden">
                <AgGridVue
                  class="hmx-ag-grid h-full w-full"
                  :theme="theme"
                  :locale-text="AG_GRID_LOCALE_CN"
                  :default-col-def="hmxDefaultColDef"
                  :column-defs="detailColDefs"
                  :row-data="detailRows"
                  :suppress-column-virtualisation="true"
                  :pagination="false"
                  :animate-rows="false"
                  @grid-ready="onDetailGridReady"
                  @cell-value-changed="onDetailEdited"
                  @first-data-rendered="autoSizeOnFirstData"
                />
              </div>
            </SplitterPanel>
          </Splitter>
        </div>
      </SplitterPanel>
    </Splitter>

    <!-- 确认（对应原 MsgBox.ShowYesNo） -->
    <Dialog
      :visible="confirmOpen"
      modal
      header="确认"
      :style="{ width: 'min(32rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event"
    >
      <p class="text-xs whitespace-pre-wrap">{{ confirmMsg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" variant="outlined" @click="onConfirmOk" />
      </template>
    </Dialog>

    <!-- 增加备注（对应原 FrmConfirmValueDialog.ShowDialog） -->
    <Dialog
      :visible="remarkOpen"
      modal
      :header="remarkTitle"
      :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="remarkOpen = $event"
    >
      <div class="flex flex-col gap-2">
        <label class="text-xs text-muted-foreground">请输入备注</label>
        <InputText v-model="remarkText" class="w-full" :invalid="remarkInvalid" autofocus @keyup.enter="submitRemark" />
        <span v-if="remarkInvalid" class="text-xs text-destructive">请输入备注</span>
      </div>
      <template #footer>
        <Button label="取消" variant="outlined" @click="remarkOpen = false" />
        <Button label="确定" variant="outlined" @click="submitRemark" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
/* 原 UCTestJob.RowCellStyle：加急整行黄底 */
:deep(.row-jiaji) {
  background-color: rgba(255, 255, 0, 0.35);
}
:deep(.judge-ok) {
  background-color: rgba(0, 255, 0, 0.247) !important;
}
:deep(.judge-ng) {
  background-color: rgba(255, 0, 0, 0.247) !important;
}
:deep(.flag-bad) {
  background-color: red !important;
  color: white !important;
}
/* 原 UCTestItemResult.gridView2.RowCellStyle：禁用银底斜体（试样号删除线）/ 实验室备注橙底（备注规则后声明，覆盖银底） */
:deep(.smp-disabled) {
  background-color: rgba(192, 192, 192, 0.5) !important;
  font-style: italic;
}
:deep(.smp-remark) {
  background-color: rgba(255, 165, 0, 0.5) !important;
}
:deep(.smp-strike) {
  text-decoration: line-through;
}
/* 原 gridView3/bandedGridView1.RowCellStyle：判定着色 */
:deep(.val-blue) {
  background-color: rgba(0, 128, 255, 0.247) !important;
}
:deep(.val-warn) {
  background-color: rgba(255, 255, 0, 0.247) !important;
}
:deep(.val-overflow) {
  background-color: red !important;
  color: white !important;
  font-weight: 700;
}
</style>
