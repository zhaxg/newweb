<script setup lang="ts">
/** 对应 FrmQL9010（委托单信息查询）：DDH.Winforms.LIMS.Forms.FrmQL9010
 *  布局：查询条件区（DataLayout 11 项：产线/委托单号/炉号/钢种/执行标准/订单号/批号
 *         + 委托时间 CreateTime / 接收时间 DReceiveTime / 报出时间 DCheckTime / 打印时间 PrintTime）
 *       + stackPanel1（查询，右侧并入主表 ViewCaption「委托单信息」）
 *       → 上下 Splitter（委托单 UCTestJob 319/524≈61%）
 *         → 内层上下 Splitter（取样要求 UCSampleRequires 116/205≈57% | 检验结果 UCTestItemResult）
 *           → UCTestItemResult 左右（试样信息+复制/粘贴 | 检验结果明细+保存，611/1091≈56%）
 *  已接入：qL9010Api.queryTestJob / querySamples / querySampleRequires（swagger 本次新补）/
 *         tPa1000Api.queryLines（产线下拉，原 LineFormatter）
 *  待接入：无（本窗体仅 3 处查询；UC 的复制/粘贴/保存按钮原 C# 未订阅处理器，按原样保留无操作）
 *  已知偏差：取样要求 AllowEdit=false 只读（同原 ucSampleRequires1）；
 *         查询区时间默认 委托时间=近1月～明天（原构造函数 CreateTime 默认值） */
import { onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconClipboard, IconCopy, IconDeviceFloppy, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  ValueFormatterParams,
} from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import {
  qL9010Api,
  YesNo,
  type QueryTestJobInput,
  type SampleRequires,
  type TestJob,
  type TestSample,
  type TimeRange,
} from "@/api/mes4ddh/lims.swagger";
import { tPa1000Api, type Tpa1000 as LineRow } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();

/* ---------- 格式化 ---------- */
const yesNoFmt = (p: ValueFormatterParams) => (p.value == null ? "" : Number(p.value) === 1 ? "是" : "否");
const statusFmt = (p: ValueFormatterParams) =>
  (({ 0: "未发送", 10: "已发送未接收", 20: "已接收", 30: "已完成" }) as Record<string, string>)[String(p.value)] ??
  (p.value == null ? "" : String(p.value));
const jobJudgeFmt = (p: ValueFormatterParams) =>
  (({ 0: "待判", 2: "合格", 3: "不合格", 4: "人工放行" }) as Record<string, string>)[String(p.value)] ?? "";
const sampleJudgeFmt = (p: ValueFormatterParams) =>
  (({ 0: "待判", 1: "不需判", 2: "合格", 3: "不合格" }) as Record<string, string>)[String(p.value)] ?? "";
const rangeFmt = (range: { min?: number | null; max?: number | null; equalsMethod?: number } | null | undefined) => {
  if (!range || (range.min == null && range.max == null)) return "";
  const eq = Number(range.equalsMethod ?? 1);
  const leftOpen = (eq & 2) !== 0;
  const rightOpen = (eq & 4) !== 0;
  if (range.min != null && range.max != null) return `${leftOpen ? "(" : "["}${range.min}, ${range.max}${rightOpen ? ")" : "]"}`;
  if (range.min != null) return `${leftOpen ? "(" : "["}${range.min}, )`;
  return `( , ${range.max}${rightOpen ? ")" : "]"}`;
};
const rangeCellFmt = (p: ValueFormatterParams) => rangeFmt(p.value as never);
const ctrlModeFmt = (p: ValueFormatterParams) =>
  (({ 0: "标准", 1: "内控" }) as Record<string, string>)[String(p.value)] ?? "";

/* ---------- 查询条件（原 queryTestJobInputBindingSource；默认 CreateTime 近1月～明天） ---------- */
function defaultCreateDates(): Date[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setMonth(start.getMonth() - 1);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);
  return [start, end];
}
const input = reactive({
  cLineCode: null as string | null,
  cTestNo: "",
  cStove: "",
  cSgSign: "",
  cSgStd: "",
  cOrderNo: "",
  cBatch: "",
  createTime: defaultCreateDates() as Date[] | null,
  dReceiveTime: null as Date[] | null,
  dCheckTime: null as Date[] | null,
  printTime: null as Date[] | null,
});
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
    cOrderNo: input.cOrderNo?.trim() || undefined,
    cBatch: input.cBatch?.trim() || undefined,
    createTime: toTimeRange(input.createTime),
    dReceiveTime: toTimeRange(input.dReceiveTime),
    dCheckTime: toTimeRange(input.dCheckTime),
    printTime: toTimeRange(input.printTime),
  };
}

/* ---------- 状态 ---------- */
const jobRows = shallowRef<TestJob[]>([]);
const requireRows = shallowRef<SampleRequires[]>([]);
const sampleRows = shallowRef<TestSample[]>([]);
const detailRows = shallowRef<any[]>([]);
const selectedJob = ref<TestJob | null>(null);
const focusedSample = ref<TestSample | null>(null);
const querying = ref(false);
const loadingChildren = ref(false);
const jobGridApi = ref<GridApi | null>(null);
const requireGridApi = ref<GridApi | null>(null);
const sampleGridApi = ref<GridApi | null>(null);
const detailGridApi = ref<GridApi | null>(null);

/* ---------- 列定义 ---------- */
/** UCTestJob.gridView1（TestJob，可见45+隐藏16，列序同 Designer / QL4000） */
const jobColDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cStove", headerName: "炉号", width: 110, pinned: "left" },
  { field: "cBatch", headerName: "批号", width: 110, pinned: "left" },
  { field: "cInternalNo", headerName: "内部编号", width: 110 },
  { field: "cTestNo", headerName: "委托单号", width: 130 },
  { field: "nTestTimes", headerName: "试验次数", width: 90 },
  { field: "cRecheckFlag", headerName: "复验标记", width: 90, valueFormatter: yesNoFmt },
  { field: "cStatus", headerName: "委托单状态", width: 120, valueFormatter: statusFmt },
  { field: "cLineCode", headerName: "产线代码", width: 100, valueFormatter: (p) => lineOptions.value.find((l) => l.value === p.value)?.label ?? (p.value ?? "") },
  { field: "cSgSign", headerName: "钢种", width: 100 },
  { field: "cSgStd", headerName: "执行标准", width: 120 },
  { field: "cDeliveryStateDesc", headerName: "交货状态描述", width: 130 },
  { field: "cCustStd", headerName: "加工用途", width: 110 },
  { field: "cStNo", headerName: "制造标准", width: 110 },
  { field: "cSpec", headerName: "规格", width: 100 },
  { field: "nThick", headerName: "厚度mm", width: 90 },
  { field: "nWth", headerName: "宽度mm", width: 90 },
  { field: "nLen", headerName: "长度mm", width: 90 },
  { field: "cAutoJudgeResult", headerName: "自动判定结果", width: 120, valueFormatter: jobJudgeFmt, cellClass: (p) => jobJudgeCell(p) },
  { field: "cJudgeUser", headerName: "判定人", width: 90 },
  { field: "dJudgeTime", headerName: "判定时间", width: 140 },
  { field: "cJudgeResult", headerName: "最终判定结果", width: 120, valueFormatter: jobJudgeFmt, cellClass: (p) => jobJudgeCell(p) },
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
function jobJudgeCell(p: { value: unknown }) {
  const v = Number(p.value);
  if (v === 2 || v === 4) return "judge-ok";
  if (v === 3) return "judge-ng";
  return "";
}
function jobRowClass(p: { data?: TestJob | null }) {
  return Number(p.data?.cJiaJi) === YesNo.Y ? "row-jiaji" : undefined;
}

/** UCSampleRequires.gridView2（SampleRequires 可见21+隐藏20，AllowEdit=false 只读；列序同 QL3000） */
const requireColDefs = ref<ColDef[]>([
  { field: "cTestItemTypeDesc", headerName: "试验项目种类描述", width: 150 },
  { field: "cTestItemName", headerName: "试验项目名称", width: 140 },
  { field: "nTestNum", headerName: "试验项目组数", width: 121 },
  { field: "nSampleNumRnd", headerName: "取样个数", width: 100 },
  { field: "cReplaceSampleCode", headerName: "代样指示", width: 94 },
  { field: "cSamplePosDesc", headerName: "取样位置", width: 110 },
  { field: "cActualSamplePos", headerName: "实际取样位置代码", width: 150 },
  { field: "cSampleLenDesc", headerName: "取样长度说明", width: 130 },
  { field: "cTestDirectDesc", headerName: "试验方向", width: 100 },
  { field: "cWholeBacklogCode", headerName: "全程工序代码", width: 120 },
  { field: "cTestItemType", headerName: "试验项目种类", width: 120 },
  { field: "cTestPurposeDesc", headerName: "试验目的说明", width: 130 },
  { field: "cSampleLen", headerName: "取样长度", width: 100 },
  { field: "cTestCndCode", headerName: "试验条件代码", width: 130 },
  { field: "cFinishedPrdFlag", headerName: "过程成品标识", width: 120 },
  { field: "nRetestMulti", headerName: "复验倍数", width: 100 },
  { field: "cTestDirect", headerName: "试验方向代码", width: 120 },
  { field: "cSamplePos", headerName: "取样位置代码", width: 120 },
  { field: "cTestPurpose", headerName: "试验目的代码", width: 120 },
  { field: "cTestItem", headerName: "试验项目", width: 100 },
  { field: "cTestAdditionDesc", headerName: "试验补充说明", width: 140 },
  { field: "id", headerName: "主键", hide: true },
  { field: "creator", headerName: "创建人", hide: true },
  { field: "createTime", headerName: "创建时间", hide: true },
  { field: "lastModifier", headerName: "最后更新人", hide: true },
  { field: "lastModifyTime", headerName: "最后更新时间", hide: true },
  { field: "fId", headerName: "检验委托ID", hide: true },
  { field: "cTestNo", headerName: "委托单号", hide: true },
  { field: "cCompleteFlag", headerName: "确认完成标记", hide: true },
  { field: "dCompleteTime", headerName: "确认完成时间", hide: true },
  { field: "cCompleteUser", headerName: "确认完成用户", hide: true },
  { field: "cJudgeResult", headerName: "判定结果", hide: true, valueFormatter: sampleJudgeFmt },
  { field: "cJudgeRemark", headerName: "判定备注", hide: true },
  { field: "cIdxNo", headerName: "试验子项要求索引号", hide: true },
  { field: "selected", headerName: "选择", hide: true },
  { field: "nTestTimes", headerName: "试验次数", hide: true },
  { field: "cNeedSend", headerName: "是否发送实验室", hide: true, valueFormatter: yesNoFmt },
  { field: "cCheckStatus", headerName: "审核状态", hide: true },
  { field: "cCheckUser", headerName: "审核人", hide: true },
  { field: "dCheckTime", headerName: "审核时间", hide: true },
  { field: "cActualSamplePosDesc", headerName: "实际取样位置描述", hide: true },
]);

/** UCTestItemResult.gridView2 试样信息（TestSample 可见23+隐藏17） */
const sampleColDefs = ref<ColDef[]>([
  { field: "cSampleNo", headerName: "试样号", width: 100 },
  { field: "cTestItemTypeDesc", headerName: "试验项目种类描述", width: 150 },
  { field: "cTestItemName", headerName: "试验项目名称", width: 130 },
  { field: "cSamplePosDesc", headerName: "取样位置", width: 100 },
  { field: "cSampleLenDesc", headerName: "取样长度说明", width: 120 },
  { field: "cTestDirectDesc", headerName: "试验方向", width: 90 },
  { field: "cJudgeResult", headerName: "判定结果", width: 90, valueFormatter: sampleJudgeFmt, cellClass: (p) => sampleJudgeCell(p) },
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
function sampleJudgeCell(p: { data?: TestSample | null }) {
  const v = Number(p.data?.cJudgeResult);
  if (v === 3) return "judge-ng";
  if (v === 2) return "judge-ok";
  return "";
}
function sampleRowClass(p: { data?: TestSample | null }) {
  const d = p.data;
  const cls: string[] = [];
  if (d && Number(d.cDisable) === 1) cls.push("smp-disabled");
  if (d?.labRemark?.trim()) cls.push("smp-remark");
  return cls.length ? cls.join(" ") : undefined;
}

/** UCTestItemResult.gridView3 检验结果明细（TestItemValue 可见14+隐藏25；查询页只读展示） */
const detailColDefs = ref<ColDef[]>([
  { field: "cTestSubItemName", headerName: "试验子项目名称", width: 140 },
  { field: "cTestSubItemDisplayName", headerName: "项目说明", width: 130 },
  { field: "valueDisplay", headerName: "试验结果", width: 100 },
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
  { field: "cJudgeFormula", headerName: "计算公式", width: 120 },
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

/* ---------- 查询 / 行联动（原 btnQuery_Click → qL9010Api.queryTestJob） ---------- */
async function onQuery() {
  querying.value = true;
  try {
    const rows = (await qL9010Api.queryTestJob(buildQuery())) ?? [];
    jobRows.value = rows;
    selectedJob.value = null;
    requireRows.value = [];
    sampleRows.value = [];
    detailRows.value = [];
    requestAnimationFrame(() => jobGridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** 原 UcTestJob1_FocusedRowObjectChanged → QuerySamples + QuerySampleRequires 并行 */
async function onJobSelectionChanged(e: { api: GridApi }) {
  const node = e.api.getSelectedNodes()[0];
  const job = (node?.data as TestJob | undefined) ?? null;
  if (String(job?.id ?? "") === String(selectedJob.value?.id ?? "")) return;
  selectedJob.value = job;
  if (!job) {
    requireRows.value = [];
    sampleRows.value = [];
    detailRows.value = [];
    focusedSample.value = null;
    return;
  }
  loadingChildren.value = true;
  const token = String(job.id);
  try {
    const [samples, reqs] = await Promise.all([
      qL9010Api.querySamples(token),
      qL9010Api.querySampleRequires(token),
    ]);
    if (String(selectedJob.value?.id ?? "") !== token) return;
    const list = [...(samples ?? [])].sort(
      (a, b) =>
        String(a.cTestItemType ?? "").localeCompare(String(b.cTestItemType ?? "")) ||
        String(a.cTestItem ?? "").localeCompare(String(b.cTestItem ?? "")) ||
        String(a.cSampleNo ?? "").localeCompare(String(b.cSampleNo ?? "")),
    );
    sampleRows.value = list;
    requireRows.value = reqs ?? [];
    focusedSample.value = list[0] ?? null;
    detailRows.value = focusedSample.value?.testItems ?? [];
    requestAnimationFrame(() => {
      sampleGridApi.value?.forEachNode((n) =>
        n.setSelected(String((n.data as TestSample | undefined)?.id ?? "") === String(list[0]?.id ?? "")),
      );
    });
  } catch {
    /* 拦截层已 toast */
  } finally {
    loadingChildren.value = false;
  }
}
function onSampleSelectionChanged(e: { api: GridApi }) {
  const node = e.api.getSelectedNodes()[0];
  const smp = (node?.data as TestSample | undefined) ?? null;
  focusedSample.value = smp;
  detailRows.value = smp?.testItems ?? [];
}

function onJobGridReady(e: GridReadyEvent) {
  jobGridApi.value = e.api;
}
function onRequireGridReady(e: GridReadyEvent) {
  requireGridApi.value = e.api;
}
function onSampleGridReady(e: GridReadyEvent) {
  sampleGridApi.value = e.api;
}
function onDetailGridReady(e: GridReadyEvent) {
  detailGridApi.value = e.api;
}
onMounted(() => {
  void loadLines();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 dataLayoutControl1，11 项 → grid-cols-6 三行内；4 个 UCTimeRange 各占 col-span-2） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产线代码</label>
          <Select v-model="input.cLineCode" :options="lineOptions" option-label="label" option-value="value"
            show-clear filter placeholder="全部" class="min-w-0 flex-1" />
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
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
          <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
          <InputText v-model="input.cBatch" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">委托时间</label>
          <DatePicker v-model="input.createTime" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
            show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">接收时间</label>
          <DatePicker v-model="input.dReceiveTime" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
            show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">报出时间</label>
          <DatePicker v-model="input.dCheckTime" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
            show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">打印时间</label>
          <DatePicker v-model="input.printTime" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
            show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- stackPanel1：查询（原 ViewCaption「委托单信息」并入本行右侧） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <span class="ml-auto shrink-0 text-xs text-muted-foreground">委托单信息（{{ jobRows.length }}）</span>
      <span class="text-xs text-muted-foreground">取样要求（{{ requireRows.length }}）</span>
    </div>

    <!-- 上下 Splitter（原 splitContainerControl1，319/524≈61%） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <!-- Panel1：委托单（ucTestJob1，无独立标题条） -->
      <SplitterPanel :size="61" :minSize="30" class="flex min-h-0 flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="jobColDefs" :row-data="jobRows"
            :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
            :get-row-class="jobRowClass" :suppress-column-virtualisation="true" :pagination="false"
            :animate-rows="false" :loading="querying" @grid-ready="onJobGridReady"
            @selection-changed="onJobSelectionChanged" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <!-- Panel2 → 内层上下 Splitter（原 splitContainerControl2：取样要求 116/205≈57% | 检验结果） -->
      <SplitterPanel :minSize="30" class="flex min-h-0 flex-col overflow-hidden">
        <Splitter class="min-h-0 flex-1" layout="vertical">
          <SplitterPanel :size="57" :minSize="25" class="flex min-h-0 flex-col overflow-hidden">
            <!-- 原 ucSampleRequires1（AllowEdit=false 只读；无按钮纯标题 → h-8） -->
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">取样要求（{{ requireRows.length }}）</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="requireColDefs" :row-data="requireRows"
                :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
                :suppress-column-virtualisation="true" :pagination="false" :animate-rows="false"
                :loading="loadingChildren" @grid-ready="onRequireGridReady"
                @first-data-rendered="autoSizeOnFirstData" />
            </div>
          </SplitterPanel>

          <!-- 检验结果（ucTestItemReslut1 → 内嵌左右分栏 611/1091≈56%） -->
          <SplitterPanel :minSize="25" class="flex min-h-0 flex-col overflow-hidden">
            <Splitter class="min-h-0 flex-1" layout="horizontal">
              <SplitterPanel :size="56" :minSize="30" class="flex min-h-0 flex-col overflow-hidden">
                <!-- 原 stackPanel1 + ViewCaption；C# btnCopy/btnPaste 未订阅，按钮保留无操作 -->
                <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
                  <Button variant="outlined" class="shrink-0 whitespace-nowrap">
                    <IconCopy class="h-3 w-3" />复制结果
                  </Button>
                  <Button variant="outlined" class="shrink-0 whitespace-nowrap">
                    <IconClipboard class="h-3 w-3" />粘贴结果
                  </Button>
                  <span class="ml-auto shrink-0 text-xs font-medium text-muted-foreground">试样信息（{{ sampleRows.length }}）</span>
                </div>
                <div class="min-h-0 flex-1 overflow-hidden">
                  <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                    :default-col-def="hmxDefaultColDef" :column-defs="sampleColDefs" :row-data="sampleRows"
                    :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
                    :get-row-class="sampleRowClass" :suppress-column-virtualisation="true" :pagination="false"
                    :animate-rows="false" :loading="loadingChildren" @grid-ready="onSampleGridReady"
                    @selection-changed="onSampleSelectionChanged" @first-data-rendered="autoSizeOnFirstData" />
                </div>
              </SplitterPanel>
              <SplitterPanel :minSize="30" class="flex min-h-0 flex-col overflow-hidden">
                <!-- 原 stackPanel2 + ViewCaption；C# 未订阅 BtnSaveClick，按钮保留无操作 -->
                <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
                  <Button variant="outlined" class="shrink-0 whitespace-nowrap">
                    <IconDeviceFloppy class="h-3 w-3" />保存结果
                  </Button>
                  <span class="ml-auto shrink-0 text-xs font-medium text-muted-foreground">检验结果</span>
                </div>
                <div class="min-h-0 flex-1 overflow-hidden">
                  <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                    :default-col-def="hmxDefaultColDef" :column-defs="detailColDefs" :row-data="detailRows"
                    :suppress-column-virtualisation="true" :pagination="false" :animate-rows="false"
                    @grid-ready="onDetailGridReady" @first-data-rendered="autoSizeOnFirstData" />
                </div>
              </SplitterPanel>
            </Splitter>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
    </Splitter>
  </div>
</template>

<style scoped>
/* 原 UCTestJob.RowCellStyle / UCTestItemResult.RowCellStyle */
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
:deep(.smp-disabled) {
  background-color: rgba(192, 192, 192, 0.5) !important;
  font-style: italic;
}
:deep(.smp-remark) {
  background-color: rgba(255, 165, 0, 0.5) !important;
}
</style>
