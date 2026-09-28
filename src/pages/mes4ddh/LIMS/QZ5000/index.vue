<script setup lang="ts">
/** 对应 FrmQZ5000（中厚板检验委托判定 / 菜单 QL5000，qs=ZG01）：DDH.Winforms.LIMS.Forms.FrmQZ5000
 *  布局：查询区（原 dataLayout 10 项：产线代码/委托单号/炉号/批号/委托单状态/钢种/订单号/执行标准/复验标记/委托时间 UCTimeRange）
 *       + stackPanel1（查询 + 判定备注 label/txtRemark + 判放行/判合格/判不合/实验室复验/质检复验/自动判定/重组样，右=ViewCaption「委托单信息」）
 *       → 上下 Splitter 45%（原 171/377）：委托单信息 UCTestJob（multiRow 行选择复刻原 Selected 勾选，ui-rules §7）| 页签（PrimeVue Tabs）：
 *         委托检验结果 UCTestResultViewer→UCTestItemResult（试样信息|检验结果）
 *         熔炼成分 UCCfView→UCCfResult（炉次成分试样|炉次成分信息）
 *         成品成分 gridControl1（ElementValue；原 PageVisible=false，queryCpcf 非空才显示）
 *  多菜单参数：useMenuQuery().parts 原 QueryString.Split(',') → Input.Lines（ZG01 过滤产线下拉）
 *  已接入（13 处台账逐条）：testJobApi.queryTestJobMainForJudge / changeJudgeResult / checkComplexDecide /
 *         queryRecheckSampleRequires / labRecheck / queryAllSamples / qMRecheck / batchAutoJudge / querySamplesByTestNo、
 *         qZ5000Api.queryCpcf、stoveChemicalCompositionTestApi.queryFinalOrDisableSamples / getSamplesItems、
 *         tPa1000Api.queryLines（原 LineFormatter）
 *  待接入：重组样 → FrmQZ5001 单元格双击 冶金规范码/制造标准 → IMscView/IStNoView（同 QL3000 纪律）；
 *         Mock 侧 queryTestJobMainForJudge/changeJudgeResult/checkComplexDecide/queryRecheckSampleRequires/
 *         labRecheck/queryAllSamples/qMRecheck/querySamplesByTestNo/queryFinalOrDisableSamples/getSamplesItems
 *         占位未登记（queryCpcf/batchAutoJudge 已登记；按约定禁改 src/mock）
 *  已知偏差：实验室复验选择弹窗（原 UCSampleRequires+FrmDialogBase）与质检复检录入弹窗（原 UCTestItemResult+
 *         AllowEditResult）以页内 Dialog 复刻；ConfirmJudge 的 <size>/<color> 富文本标记按纯文本还原；
 *         检验结果 AutoJudge 为范围型等价判定（公式引擎未迁，同 QL4000）；
 *         质检复检弹窗「保存结果」原 C# 未订阅 BtnSaveClick，按原样保留无操作 */
import { computed, nextTick, onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { IconCheck, IconFlask, IconPlus, IconRefresh, IconSearch, IconSend, IconX } from "@tabler/icons-vue";
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
  TestJobJudgeResult,
  TestJobStatus,
  YesNo,
  qZ5000Api,
  stoveChemicalCompositionTestApi,
  testJobApi,
  type QueryTestJobInput,
  type SampleRequires,
  type StoveSampleTestItem,
  type StoveTestSample,
  type TestItemValue,
  type TestJob,
  type TestSample,
} from "@/api/mes4ddh/lims.swagger";
import { tPa1000Api, type Tpa1000 as LineRow } from "@/api/mes4ddh/shr.swagger";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { parts } = useMenuQuery();

/* ---------- 查询条件（原构造函数：CreateTime 近1月～明天、CStatus=已完成） ---------- */
function defaultDates(): Date[] {
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
  cBatch: "",
  cSgSign: "",
  cSgStd: "",
  cOrderNo: "",
  cStatus: TestJobStatus.Finished as TestJobStatus | null | "",
  cRecheckFlag: null as YesNo | null | "",
  createDate: defaultDates() as Date[] | null,
});
const remark = ref(""); // 原 txtRemark（判定备注）

/* 原 CStatus 下拉（提取枚举：未发送/已发送未接收/已接收/已完成）；复验标记下拉 N/Y 照提取 */
const statusOptions = [
  { label: "未发送", value: TestJobStatus.NotSend },
  { label: "已发送未接收", value: TestJobStatus.Sent },
  { label: "已接收", value: TestJobStatus.Received },
  { label: "已完成", value: TestJobStatus.Finished },
];
const recheckOptions = [
  { label: "N", value: YesNo.N },
  { label: "Y", value: YesNo.Y },
];

const lineOptions = ref<{ label: string; value: string }[]>([]);
async function loadLines() {
  try {
    const rows = (await tPa1000Api.queryLines()) ?? [];
    // 原 SetCodeFormatterAsync<LineFormatter>(Input.Lines)：候选限定 QueryString 分段
    const all = (rows as LineRow[]).filter((r) => r.cCode != null);
    const allowed = parts.length ? all.filter((r) => parts.includes(r.cCode!)) : all;
    lineOptions.value = allowed.map((r) => ({ label: `${r.cCode}-${r.cName ?? ""}`, value: r.cCode! }));
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
function buildQuery(): QueryTestJobInput {
  return {
    cLineCode: input.cLineCode || undefined,
    cTestNo: input.cTestNo?.trim() || undefined,
    cStove: input.cStove?.trim() || undefined,
    cBatch: input.cBatch?.trim() || undefined,
    cSgSign: input.cSgSign?.trim() || undefined,
    cSgStd: input.cSgStd?.trim() || undefined,
    cOrderNo: input.cOrderNo?.trim() || undefined,
    cStatus: input.cStatus === "" || input.cStatus == null ? null : input.cStatus,
    cRecheckFlag: input.cRecheckFlag === "" || input.cRecheckFlag == null ? null : input.cRecheckFlag,
    createTime: toTimeRange(input.createDate),
    lines: parts.length ? [...parts] : undefined,
  };
}

/* ---------- 格式化 ---------- */
const statusFmt = (p: ValueFormatterParams) =>
  (
    ({
      [TestJobStatus.NotSend]: "未发送",
      [TestJobStatus.Sent]: "已发送未接收",
      [TestJobStatus.Received]: "已接收",
      [TestJobStatus.Finished]: "已完成",
    }) as Record<string, string>
  )[String(p.value)] ?? (p.value == null ? "" : String(p.value));
const yesNoFmt = (p: ValueFormatterParams) => (p.value == null ? "" : Number(p.value) === 1 ? "是" : "否");
const jobJudgeName = (v: unknown) =>
  (({ 0: "待判", 2: "合格", 3: "不合格", 4: "放行" }) as Record<string, string>)[String(v)] ?? "";
const jobJudgeFmt = (p: ValueFormatterParams) => jobJudgeName(p.value);
const sampleJudgeFmt = (p: ValueFormatterParams) =>
  (({ 0: "待判", 1: "不需判", 2: "合格", 3: "不合格" }) as Record<string, string>)[String(p.value)] ??
  (p.value == null ? "" : String(p.value));
const lineFmt = (p: ValueFormatterParams) => lineOptions.value.find((l) => l.value === p.value)?.label ?? p.value ?? "";

/* ---------- UCTestJob 委托单信息（共享 UC 设计器：原 Selected 勾选列→行选择、列隐藏保留 + 判定着色 + 加急黄底） ---------- */
const jobColDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cStove", headerName: "炉号", width: 100 },
  { field: "cBatch", headerName: "批号", width: 100 },
  { field: "cInternalNo", headerName: "内部编号", width: 110 },
  { field: "cTestNo", headerName: "委托单号", width: 125 },
  { field: "nTestTimes", headerName: "试验次数", width: 85 },
  { field: "cRecheckFlag", headerName: "复验标记", width: 85, valueFormatter: yesNoFmt },
  { field: "cStatus", headerName: "委托单状态", width: 115, valueFormatter: statusFmt },
  { field: "cLineCode", headerName: "产线代码", width: 95, valueFormatter: lineFmt },
  { field: "cSgSign", headerName: "钢种", width: 90 },
  { field: "cSgStd", headerName: "执行标准", width: 110 },
  { field: "cDeliveryStateDesc", headerName: "交货状态描述", width: 120 },
  { field: "cCustStd", headerName: "加工用途", width: 100 },
  { field: "cStNo", headerName: "制造标准", width: 100 },
  { field: "cSpec", headerName: "规格", width: 90 },
  { field: "nThick", headerName: "厚度mm", width: 85 },
  { field: "nWth", headerName: "宽度mm", width: 85 },
  { field: "nLen", headerName: "长度mm", width: 85 },
  {
    field: "cAutoJudgeResult",
    headerName: "自动判定结果",
    width: 110,
    valueFormatter: jobJudgeFmt,
    cellClass: jobJudgeCell,
  },
  { field: "cJudgeUser", headerName: "判定人", width: 85 },
  { field: "dJudgeTime", headerName: "判定时间", width: 130 },
  {
    field: "cJudgeResult",
    headerName: "最终判定结果",
    width: 110,
    valueFormatter: jobJudgeFmt,
    cellClass: jobJudgeCell,
  },
  { field: "cJudgeRemark", headerName: "判定备注", width: 110 },
  { field: "creator", headerName: "创建人", width: 85 },
  { field: "createTime", headerName: "创建时间", width: 130 },
  { field: "dReceiveTime", headerName: "确认接收时间", width: 130 },
  { field: "dReceiveUser", headerName: "确认接收人", width: 100 },
  { field: "cConfirmUser", headerName: "确认判定人", width: 100 },
  { field: "cSendUser", headerName: "确认发送人", width: 100 },
  { field: "dConfirmTime", headerName: "确认判定时间", width: 130 },
  { field: "dSendTime", headerName: "确认发送时间", width: 130 },
  { field: "cOrderNo", headerName: "订单号", width: 115 },
  { field: "orderCustCName", headerName: "订货客户", width: 110 },
  { field: "cCustStdCode", headerName: "加工用途代码", width: 120 },
  { field: "cDelivyStatusCode", headerName: "交货状态代码", width: 120 },
  { field: "cCzpFlag", headerName: "重组批标记", width: 95, valueFormatter: yesNoFmt },
  { field: "cPrevTestNo", headerName: "前委托单号", width: 115 },
  { field: "wgt", headerName: "重量", width: 80 },
  { field: "count", headerName: "件数", width: 75 },
  { field: "cJiaJi", headerName: "加急", width: 70, valueFormatter: yesNoFmt },
  { field: "cMatShape", headerName: "尺寸外形", width: 95 },
  { field: "cSpecialDesc", headerName: "特殊要求", width: 110 },
  { field: "cSpecialMarkHt", headerName: "技术要求特殊说明", width: 150 },
  { field: "cSpecialPackDesc", headerName: "特殊包装要求叙述", width: 160 },
  { field: "cWarrantyDesc", headerName: "质保书要求", width: 115 },
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
  return Number((p.data as TestJob | undefined)?.cJiaJi) === YesNo.Y ? "row-jiaji" : undefined;
}

/* ---------- UCTestItemResult 试样（UCTestItemResult.gridView2，TestSample） ---------- */
const testSampleColDefs = ref<ColDef[]>([
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
  { field: "cJudgeResult", headerName: "判定结果", width: 90, valueFormatter: sampleJudgeFmt },
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
function testSampleRowClass(p: RowClassParams) {
  const d = p.data as TestSample | undefined;
  return d && Number(d.cDisable) === YesNo.Y ? "smp-disabled" : undefined;
}

/* ---------- UCTestItemResult 检验结果（gridView3，TestItemValue；editable=质管复检录入弹窗） ---------- */
type Range = { min?: number | null; max?: number | null; equalsMethod?: EqualsFlag } | null | undefined;
function rangeFmt(v: unknown) {
  const r = v as Range;
  if (!r || (r.min == null && r.max == null)) return "";
  const eq = Number(r.equalsMethod ?? 0);
  const leftOpen = (eq & EqualsFlag.LeftOpen) !== 0;
  const rightOpen = (eq & EqualsFlag.RightOpen) !== 0;
  if (r.min == null) return `( , ${r.max}${rightOpen ? ")" : "]"}`;
  if (r.max == null) return `${leftOpen ? "(" : "["}${r.min}, )`;
  return `${leftOpen ? "(" : "["}${r.min}, ${r.max}${rightOpen ? ")" : "]"}`;
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
/** 原 TestSample.AutoJudge 范围型等价判定（公式引擎未迁，同 QL4000 纪律） */
function autoJudgeTestItem(it: TestItemValue) {
  if (Number(it.isJudge) !== YesNo.Y) return;
  const v = Number(it.cValue);
  if (it.cValue == null || it.cValue === "" || !Number.isFinite(v)) {
    it.cJudgeResult = SampleJudgeResult.None;
    return;
  }
  it.cJudgeResult = checkInRange(it.judgeRange, v) ? SampleJudgeResult.Qualified : SampleJudgeResult.Unqualified;
}
function valueCellClass(p: CellClassParams) {
  const row = p.data as TestItemValue | undefined;
  if (!row) return "";
  const jr = Number(row.cJudgeResult);
  if (jr === SampleJudgeResult.Unqualified) return "judge-ng";
  if (jr === SampleJudgeResult.Qualified) return "judge-ok";
  if (jr === SampleJudgeResult.None) return "judge-warn";
  return "";
}
function makeTestItemColDefs(editable: boolean): ColDef[] {
  return [
    { field: "cTestSubItemName", headerName: "试验子项目名称", width: 140 },
    { field: "cTestSubItemDisplayName", headerName: "项目说明", width: 130 },
    {
      field: "valueDisplay",
      headerName: "试验结果",
      width: 100,
      editable,
      valueGetter: (p) => (p.data?.valueDisplay ?? p.data?.cValue ?? "") as string | number,
      valueSetter: (p) => {
        if (!editable) return false;
        const row = p.data as TestItemValue;
        row.cValue = p.newValue == null ? null : String(p.newValue);
        row.valueDisplay = row.cValue;
        autoJudgeTestItem(row);
        return true;
      },
      cellClass: valueCellClass,
    },
    { field: "isJudge", headerName: "是否判定", width: 90, valueFormatter: yesNoFmt },
    { field: "judgeRange", headerName: "标准范围", width: 130, valueFormatter: (p) => rangeFmt(p.value) },
    { field: "judgeRangeNk", headerName: "内控范围", width: 130, valueFormatter: (p) => rangeFmt(p.value) },
    { field: "cTargetValue", headerName: "目标值", width: 90 },
    { field: "cFormula", headerName: "计算公式", width: 120 },
    { field: "cTestSubItem", headerName: "试验子项代码", width: 110 },
    { field: "cValue", headerName: "原始结果", width: 100 },
    { field: "nItemAccuracy", headerName: "精度", width: 70 },
    { field: "isPrint", headerName: "是否打质保书", width: 110, valueFormatter: yesNoFmt },
    { field: "cJudgeResult", headerName: "判定结果", width: 90, valueFormatter: sampleJudgeFmt },
    { field: "cRecheckFlag", headerName: "复验标记", width: 90, valueFormatter: yesNoFmt },
    { field: "seq", headerName: "序号", width: 70 },
    { field: "cTestItemType", headerName: "试验项目种类", width: 120, hide: true },
    { field: "cTestItem", headerName: "试验项目", width: 100, hide: true },
    { field: "cSampleNo", headerName: "试样号", width: 110, hide: true },
    { field: "cStove", headerName: "炉号", hide: true },
    { field: "cStNo", headerName: "制造标准", hide: true },
    { field: "cCtrlMode", headerName: "管控模式", hide: true },
  ];
}
const testItemColDefs = computed<ColDef[]>(() => makeTestItemColDefs(false));
const qmItemColDefs = computed<ColDef[]>(() => makeTestItemColDefs(true));

/* ---------- UCCfResult 熔炼成分（炉次成分试样 | 炉次成分信息） ---------- */
const cfSampleColDefs = ref<ColDef[]>([
  {
    field: "cSampleNo",
    headerName: "试样号",
    width: 140,
    cellClass: (p) => (Number(p.data?.cDisable) === YesNo.Y ? "smp-strike" : ""),
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
const cfItemColDefs = ref<ColDef[]>([
  { field: "cName", headerName: "元素名称", width: 90 },
  {
    field: "valueDisplay",
    headerName: "检验结果",
    width: 100,
    valueGetter: (p) => (p.data?.valueDisplay ?? p.data?.nValue ?? "") as string | number,
    cellClass: cfValueCellClass,
  },
  { field: "stdRange", headerName: "标准范围", width: 120, valueFormatter: (p) => rangeFmt(p.value) },
  {
    field: "mainRange",
    headerName: "工艺范围",
    width: 120,
    valueFormatter: (p) => rangeFmt(p.value),
    cellClass: cfNkCellClass,
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
]);
function autoJudgeCfItem(it: StoveSampleTestItem) {
  if (Number(it.isJudge) !== YesNo.Y) return;
  const v = Number(it.nValue);
  if (it.nValue == null || !Number.isFinite(v)) {
    it.judgeResult = SampleJudgeResult.None;
    return;
  }
  it.judgeResult = checkInRange(it.stdRange, v) ? SampleJudgeResult.Qualified : SampleJudgeResult.Unqualified;
}
function cfValueCellClass(p: CellClassParams) {
  const row = p.data as StoveSampleTestItem | undefined;
  if (!row) return "";
  const jr = Number(row.judgeResult);
  if (jr === SampleJudgeResult.Unqualified) return "judge-ng";
  if (Number(row.isJudge) !== YesNo.Y) return "";
  if (jr !== SampleJudgeResult.Qualified) return "judge-warn";
  return "judge-ok";
}
function cfNkCellClass(p: CellClassParams) {
  const row = p.data as StoveSampleTestItem | undefined;
  return row && Number((row as any).judgeResultNk) === SampleJudgeResult.Unqualified ? "judge-warn" : "";
}
function cfSampleRowClass(p: RowClassParams) {
  return Number((p.data as StoveTestSample | undefined)?.cDisable) === YesNo.Y ? "smp-disabled" : undefined;
}

/* ---------- 成品成分（gridView1，ElementValue） ---------- */
const cpcfColDefs = ref<ColDef[]>([
  { field: "name", headerName: "元素名称", width: 140 },
  { field: "value", headerName: "元素值", width: 120 },
]);

/* ---------- UCSampleRequires（实验室复验选择弹窗；ColCJudgeResult 照 .cs 提到第2列） ---------- */
const labColDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  {
    field: "cJudgeResult",
    headerName: "判定结果",
    width: 90,
    valueFormatter: sampleJudgeFmt,
    cellClass: (p) =>
      Number(p.value) === SampleJudgeResult.Qualified
        ? "judge-ok"
        : Number(p.value) === SampleJudgeResult.Unqualified
          ? "judge-ng"
          : "",
  },
  { field: "cTestItemTypeDesc", headerName: "试验项目种类描述", width: 150 },
  { field: "cTestItemName", headerName: "试验项目名称", width: 140 },
  { field: "nTestNum", headerName: "试验项目组数", width: 120 },
  { field: "nSampleNumRnd", headerName: "取样个数", width: 100 },
  { field: "cReplaceSampleCode", headerName: "代样指示", width: 95 },
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
  { field: "cJudgeRemark", headerName: "判定备注", hide: true },
  { field: "cIdxNo", headerName: "试验子项要求索引号", hide: true },
  { field: "nTestTimes", headerName: "试验次数", hide: true },
  { field: "cNeedSend", headerName: "是否发送实验室", hide: true, valueFormatter: yesNoFmt },
  { field: "cCheckStatus", headerName: "审核状态", hide: true },
  { field: "cCheckUser", headerName: "审核人", hide: true },
  { field: "dCheckTime", headerName: "审核时间", hide: true },
  { field: "cActualSamplePosDesc", headerName: "实际取样位置描述", hide: true },
]);

/* ---------- 查询与主子联动 ---------- */
const jobRows = shallowRef<TestJob[]>([]);
const jobApi = ref<GridApi | null>(null);
const focusJob = shallowRef<TestJob | null>(null);
const querying = ref(false);
const tabLoading = ref(false);

const testSamples = shallowRef<TestSample[]>([]);
const testFocus = shallowRef<TestSample | null>(null);
const testItems = shallowRef<TestItemValue[]>([]);
const cfSamples = shallowRef<StoveTestSample[]>([]);
const cfFocus = shallowRef<StoveTestSample | null>(null);
const cfItems = shallowRef<StoveSampleTestItem[]>([]);
const cpcfRows = shallowRef<any[]>([]);
const activeTab = ref("result");

const testSampleApi = ref<GridApi | null>(null);
const testItemApi = ref<GridApi | null>(null);
const cfSampleApi = ref<GridApi | null>(null);
const cfItemApi = ref<GridApi | null>(null);
const cpcfApi = ref<GridApi | null>(null);
const labApi = ref<GridApi | null>(null);
const qmSampleApi = ref<GridApi | null>(null);
const qmItemApi = ref<GridApi | null>(null);

let focusToken = 0;

/** 原 Query → ucTestJobViewer1.BindData（首行聚焦后触发 FocusedRowObjectChanged） */
async function onQuery() {
  querying.value = true;
  try {
    const data = await testJobApi.queryTestJobMainForJudge(buildQuery());
    jobRows.value = (data as TestJob[]) ?? [];
    focusJob.value = null;
    clearDetail();
    requestAnimationFrame(() => jobApi.value?.autoSizeAllColumns());
    await nextTick();
    const first = jobApi.value?.getDisplayedRowAtIndex(0);
    if (first) {
      first.setSelected(true);
      // 选中态可能与上回同位而不再触发 selection-changed，主动联动首行（重复触发由 token 兜底）
      focusJob.value = first.data as TestJob;
      void loadJobDetail();
    } else {
      focusJob.value = null;
    }
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

function clearDetail() {
  testSamples.value = [];
  testFocus.value = null;
  testItems.value = [];
  cfSamples.value = [];
  cfFocus.value = null;
  cfItems.value = [];
  cpcfRows.value = [];
  if (activeTab.value === "cpcf") activeTab.value = "result";
}

function onJobSelectionChanged(e: SelectionChangedEvent) {
  const nodes = e.api.getSelectedNodes();
  focusJob.value = (nodes[nodes.length - 1]?.data as TestJob) ?? null;
  void loadJobDetail();
}

/** 原 UcTestJobViewer1_FocusedRowObjectChanged：ShowData(熔炼) + QuerySamplesByTestNo + QueryCpcf（空则隐藏成品成分页签） */
async function loadJobDetail() {
  const guard = focusJob.value;
  const token = ++focusToken;
  clearDetail();
  if (!guard) return;
  tabLoading.value = true;
  try {
    const [cf, ts, cpcf] = await Promise.all([
      stoveChemicalCompositionTestApi.queryFinalOrDisableSamples(guard.cStove ?? undefined, {
        isPrd: true,
        orderNo: guard.cOrderNo,
        std: guard.cSgStd,
        stlGrd: guard.cSgSign,
        stNo: guard.cStNo,
      }),
      testJobApi.querySamplesByTestNo(guard.cTestNo ?? undefined),
      qZ5000Api.queryCpcf(guard.cTestNo),
    ]);
    if (token !== focusToken || focusJob.value !== guard) return;
    cfSamples.value = (cf as StoveTestSample[]) ?? [];
    testSamples.value = (ts as TestSample[]) ?? [];
    cpcfRows.value = (cpcf as any[]) ?? [];
    if (!cpcfRows.value.length && activeTab.value === "cpcf") activeTab.value = "result";
    await nextTick();
    // 首行聚焦（原 UC 内部首行 Focus；主动联动，事件重复触发由 token 兜底）
    const tsFirst = testSampleApi.value?.getDisplayedRowAtIndex(0);
    if (tsFirst) {
      tsFirst.setSelected(true);
      testFocus.value = tsFirst.data as TestSample;
      testItems.value = [...(testFocus.value?.testItems ?? [])];
    }
    const cfFirst = cfSampleApi.value?.getDisplayedRowAtIndex(0);
    if (cfFirst) {
      cfFirst.setSelected(true);
      cfFocus.value = cfFirst.data as StoveTestSample;
      void loadCfItems();
    }
    requestAnimationFrame(() => {
      testSampleApi.value?.autoSizeAllColumns();
      cfSampleApi.value?.autoSizeAllColumns();
      cpcfApi.value?.autoSizeAllColumns();
    });
  } catch {
    /* 拦截层已 toast */
  } finally {
    if (token === focusToken) tabLoading.value = false;
  }
}

function onTestSampleSelectionChanged(e: SelectionChangedEvent) {
  const nodes = e.api.getSelectedNodes();
  testFocus.value = (nodes[nodes.length - 1]?.data as TestSample) ?? null;
  // 原 gridView2 与 testItemsBindingSource 明细绑定（数据随试样下发，无接口）
  testItems.value = [...(testFocus.value?.testItems ?? [])];
  requestAnimationFrame(() => testItemApi.value?.autoSizeAllColumns());
}

function onCfSampleSelectionChanged(e: SelectionChangedEvent) {
  const nodes = e.api.getSelectedNodes();
  cfFocus.value = (nodes[nodes.length - 1]?.data as StoveTestSample) ?? null;
  void loadCfItems();
}

/** 原 UCCfResult.GridView2_FocusedRowObjectChanged → GetSamplesItems */
let cfItemSeq = 0;
async function loadCfItems() {
  const seq = ++cfItemSeq;
  const guard = cfFocus.value;
  cfItems.value = [];
  if (!guard) return;
  try {
    if (!guard.testItems || guard.testItems.length === 0) {
      guard.testItems = guard.id
        ? (((await stoveChemicalCompositionTestApi.getSamplesItems(guard.id)) as StoveSampleTestItem[]) ?? [])
        : [];
    }
    if (seq !== cfItemSeq || cfFocus.value !== guard) return;
    for (const it of guard.testItems ?? []) autoJudgeCfItem(it);
    cfItems.value = [...(guard.testItems ?? [])];
    requestAnimationFrame(() => cfItemApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  }
}

/* ---------- 确认弹窗（原 MsgBox.ShowYesNo / ConfirmJudge） ---------- */
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

/** 原 ConfirmJudge（<size>/<color> 富文本标记按纯文本还原） */
function confirmJudgeMsg(result: TestJobJudgeResult, row: TestJob) {
  return (
    `确定将[${row.cTestNo}]判定为[${jobJudgeName(result)}]？\n` +
    `系统自动判定结果为[${jobJudgeName(Number(row.cAutoJudgeResult))}]`
  );
}

async function doJudge(result: TestJobJudgeResult, row: TestJob) {
  try {
    await testJobApi.changeJudgeResult(row.id ?? undefined, remark.value, result);
    remark.value = ""; // 原判定成功后清空 txtRemark
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  }
}

/* 判放行（原 btnRelease_Click：两道状态校验 → ConfirmJudge → ChangeJudgeResult → 重查） */
function onRelease() {
  const row = focusJob.value;
  if (!row) return;
  if (Number(row.cJudgeResult) === TestJobJudgeResult.Qualified) {
    toast("委托已经合格，不需放行", 2000, "warn");
    return;
  }
  if (Number(row.cJudgeResult) === TestJobJudgeResult.ManualRelease) {
    toast("委托已经是放行状态，不需要再次判定", 2000, "warn");
    return;
  }
  askConfirm(confirmJudgeMsg(TestJobJudgeResult.ManualRelease, row), () =>
    doJudge(TestJobJudgeResult.ManualRelease, row),
  );
}

/* 判合格（原 btnQualify_Click） */
function onQualify() {
  const row = focusJob.value;
  if (!row) return;
  if (Number(row.cJudgeResult) === TestJobJudgeResult.Qualified) {
    toast("委托已经是合格状态，不需要再次判定", 2000, "warn");
    return;
  }
  askConfirm(confirmJudgeMsg(TestJobJudgeResult.Qualified, row), () => doJudge(TestJobJudgeResult.Qualified, row));
}

/* 判不合（原 btnUnqualify_Click） */
function onUnqualify() {
  const row = focusJob.value;
  if (!row) return;
  if (Number(row.cJudgeResult) === TestJobJudgeResult.Unqualified) {
    toast("委托已经是不合格状态，不需要再次判定", 2000, "warn");
    return;
  }
  askConfirm(confirmJudgeMsg(TestJobJudgeResult.Unqualified, row), () => doJudge(TestJobJudgeResult.Unqualified, row));
}

/* ---------- 实验室复验（原 btnLabRecheck_Click：综判校验 → QueryRecheckSampleRequires → UCSampleRequires 选择 → LabRecheck） ---------- */
const labOpen = ref(false);
const labRows = shallowRef<SampleRequires[]>([]);
const labLoading = ref(false);

async function onLabRecheck() {
  const row = focusJob.value;
  if (!row) return;
  try {
    if (await testJobApi.checkComplexDecide(row.cTestNo ?? undefined)) {
      toast("已综判，不允许操作", 2000, "warn");
      return;
    }
    const data = (await testJobApi.queryRecheckSampleRequires(row.cTestNo ?? undefined)) ?? [];
    labRows.value = data as SampleRequires[];
    labOpen.value = true;
    await nextTick();
    requestAnimationFrame(() => labApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  }
}
/** 勾选态回写 data.selected（labRecheck 按实体整行下发，保持后端契约，ui-rules §7 规则4） */
function onLabSelectionChanged(e: SelectionChangedEvent) {
  const ids = new Set((e.api.getSelectedRows() as SampleRequires[]).map((x) => x.id));
  e.api.forEachNode((n) => {
    const d = n.data as SampleRequires | undefined;
    if (d) d.selected = ids.has(d.id);
  });
}
async function onLabOk() {
  const row = focusJob.value;
  if (!row) return;
  const selected = (labApi.value?.getSelectedRows() ?? []) as SampleRequires[];
  if (!selected.length) {
    toast("请选择要复验的项目", 2000, "warn");
    return;
  }
  labLoading.value = true;
  try {
    await testJobApi.labRecheck(row.cTestNo ?? undefined, selected);
    labOpen.value = false;
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    labLoading.value = false;
  }
}

/* ---------- 质检复验（原 btnQMRecheck_Click：综判校验 → QueryAllSamples → UCTestItemResult 录入 → GetDiff → QMRecheck） ---------- */
const qmOpen = ref(false);
const qmBak = shallowRef<TestSample[]>([]);
const qmRows = shallowRef<TestSample[]>([]);
const qmFocus = shallowRef<TestSample | null>(null);
const qmItems = shallowRef<TestItemValue[]>([]);
const qmLoading = ref(false);

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

async function onQMRecheck() {
  const row = focusJob.value;
  if (!row) return;
  try {
    if (await testJobApi.checkComplexDecide(row.cTestNo ?? undefined)) {
      toast("已综判，不允许操作", 2000, "warn");
      return;
    }
    const bak = (await testJobApi.queryAllSamples(row.cTestNo ?? undefined)) ?? [];
    qmBak.value = deepClone(bak);
    qmRows.value = deepClone(bak);
    qmFocus.value = null;
    qmItems.value = [];
    qmOpen.value = true;
    await nextTick();
    const first = qmSampleApi.value?.getDisplayedRowAtIndex(0);
    if (first) first.setSelected(true);
    requestAnimationFrame(() => {
      qmSampleApi.value?.autoSizeAllColumns();
      qmItemApi.value?.autoSizeAllColumns();
    });
  } catch {
    /* 拦截层已 toast */
  }
}
function onQmSampleSelectionChanged(e: SelectionChangedEvent) {
  const nodes = e.api.getSelectedNodes();
  qmFocus.value = (nodes[nodes.length - 1]?.data as TestSample) ?? null;
  // 明细与试样同引用：录入直接改 qmRows 数据
  qmItems.value = [...(qmFocus.value?.testItems ?? [])];
  requestAnimationFrame(() => qmItemApi.value?.autoSizeAllColumns());
}

/** 原 GetDiff：按 Id 对齐，任一 TestItems.CValue 变化即提交该试样 */
function getDiff(oldData: TestSample[], newData: TestSample[]): TestSample[] {
  const editData: TestSample[] = [];
  for (const item of newData) {
    const bakItem = oldData.find((x) => x.id === item.id);
    if (!bakItem) {
      editData.push(item);
      continue;
    }
    const changed = (item.testItems ?? []).some(
      (x) => x.cValue !== (bakItem.testItems ?? []).find((w) => w.cTestSubItem === x.cTestSubItem)?.cValue,
    );
    if (changed) editData.push(item);
  }
  return editData;
}

async function onQmOk() {
  const editData = getDiff(qmBak.value, qmRows.value);
  if (editData.length === 0) {
    toast("未检测到任何修改", 2000, "warn");
    return;
  }
  qmLoading.value = true;
  try {
    await testJobApi.qMRecheck(editData);
    qmOpen.value = false;
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    qmLoading.value = false;
  }
}

/* ---------- 自动判定（原 btnAutoJudge_Click：SelectedRows → BatchAutoJudge；ui-rules §7 改 getSelectedRows） ---------- */
function onAutoJudge() {
  const selected = (jobApi.value?.getSelectedRows() ?? []) as TestJob[];
  if (!selected.length) {
    toast("请选择要自动判定的委托", 2000, "warn");
    return;
  }
  askConfirm(`是否对选中的 ${selected.length} 条委托进行自动判定？`, async () => {
    try {
      await testJobApi.batchAutoJudge(selected.map((x) => x.id));
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    }
  });
}

/* ---------- 重组样（原 FrmQZ5001 占位） ---------- */
function onReSample() {
  const row = focusJob.value;
  if (!row) {
    toast("请选择一个委托", 2000, "warn");
    return;
  }
  toast("重组样：录入弹窗（FrmQZ5001）待接入", 2000, "warn");
}

/** 原 UCTestJob.RowCellClick 双击 冶金规范码/制造标准 → IMscView/IStNoView（占位，同 QL3000 纪律） */
function onJobCellDoubleClicked(e: any) {
  const f = e.colDef?.field;
  if (f === "cMsc") toast("冶金规范码查看（IMscView）待接入", 2000, "warn");
  if (f === "cStNo") toast("制造标准查看（IStNoView）待接入", 2000, "warn");
}

function onJobGridReady(e: GridReadyEvent) {
  jobApi.value = e.api;
}
function onTestSampleGridReady(e: GridReadyEvent) {
  testSampleApi.value = e.api;
}
function onTestItemGridReady(e: GridReadyEvent) {
  testItemApi.value = e.api;
}
function onCfSampleGridReady(e: GridReadyEvent) {
  cfSampleApi.value = e.api;
}
function onCfItemGridReady(e: GridReadyEvent) {
  cfItemApi.value = e.api;
}
function onCpcfGridReady(e: GridReadyEvent) {
  cpcfApi.value = e.api;
}
function onLabGridReady(e: GridReadyEvent) {
  labApi.value = e.api;
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
    <!-- 查询区（原 dataLayoutControl 10 项） -->
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
          <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
          <InputText v-model="input.cBatch" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">委托单状态</label>
          <Select
            v-model="input.cStatus"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            show-clear
            placeholder="全部"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="input.cSgSign" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
          <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" />
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
            placeholder="全部"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">委托时间</label>
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
      </div>
    </div>

    <!-- stackPanel1：查询 + 判定备注 + 7 按钮；右=ViewCaption「委托单信息」 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <label class="ml-2 shrink-0 text-xs text-muted-foreground">判定备注</label>
      <InputText v-model="remark" class="w-48 shrink-0" />
      <span class="mx-1 h-4 w-px bg-border" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onRelease">
        <IconSend class="h-3 w-3" />判放行
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onQualify">
        <IconCheck class="h-3 w-3" />判合格
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onUnqualify">
        <IconX class="h-3 w-3" />判不合
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onLabRecheck">
        <IconFlask class="h-3 w-3" />实验室复验
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onQMRecheck">
        <IconFlask class="h-3 w-3" />质检复验
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAutoJudge">
        <IconRefresh class="h-3 w-3" />自动判定
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onReSample">
        <IconPlus class="h-3 w-3" />重组样
      </Button>
      <span class="ml-auto text-xs font-medium text-muted-foreground">委托单信息</span>
    </div>

    <!-- splitContainerControl1：上下 45%（原 171/377） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="45" :minSize="25" class="flex min-h-0 flex-col overflow-hidden">
        <!-- UCTestJob 委托单信息（行选择 multiRow = 原 SelectedRows 勾选，ui-rules §7） -->
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="jobColDefs"
            :row-data="jobRows"
            :row-selection="{
              mode: 'multiRow',
              checkboxes: true,
              headerCheckbox: true,
              enableClickSelection: true,
              enableSelectionWithoutKeys: true,
            }"
            :get-row-class="jobRowClass"
            :suppress-column-virtualisation="true"
            :pagination="false"
            :animate-rows="false"
            :loading="querying"
            @grid-ready="onJobGridReady"
            @selection-changed="onJobSelectionChanged"
            @cell-double-clicked="onJobCellDoubleClicked"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :minSize="30" class="flex min-h-0 flex-col overflow-hidden">
        <!-- xtraTabControl1：委托检验结果 | 熔炼成分 | 成品成分（queryCpcf 非空才显示） -->
        <Tabs v-model:value="activeTab" class="min-h-0 flex-1 flex-col">
          <TabList>
            <Tab value="result">委托检验结果</Tab>
            <Tab value="cf">熔炼成分</Tab>
            <Tab v-if="cpcfRows.length > 0" value="cpcf">成品成分</Tab>
          </TabList>
          <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
            <!-- ucTestResultViewer1（UCTestItemResult：试样信息 | 检验结果；AllowEdit=false 按钮隐藏） -->
            <TabPanel value="result" class="h-full min-h-0 overflow-hidden">
              <Splitter class="h-full min-h-0">
                <SplitterPanel :size="57" :minSize="25" class="flex flex-col overflow-hidden">
                  <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
                    <span class="text-xs font-medium text-muted-foreground">试样信息</span>
                  </div>
                  <div class="min-h-0 flex-1 overflow-hidden">
                    <AgGridVue
                      class="hmx-ag-grid h-full w-full"
                      :theme="theme"
                      :locale-text="AG_GRID_LOCALE_CN"
                      :default-col-def="hmxDefaultColDef"
                      :column-defs="testSampleColDefs"
                      :row-data="testSamples"
                      :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
                      :get-row-class="testSampleRowClass"
                      :pagination="false"
                      :animate-rows="false"
                      :loading="tabLoading"
                      @grid-ready="onTestSampleGridReady"
                      @selection-changed="onTestSampleSelectionChanged"
                      @first-data-rendered="autoSizeOnFirstData"
                    />
                  </div>
                </SplitterPanel>
                <SplitterPanel :minSize="22" class="flex flex-col overflow-hidden">
                  <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
                    <span class="text-xs font-medium text-muted-foreground">检验结果</span>
                  </div>
                  <div class="min-h-0 flex-1 overflow-hidden">
                    <AgGridVue
                      class="hmx-ag-grid h-full w-full"
                      :theme="theme"
                      :locale-text="AG_GRID_LOCALE_CN"
                      :default-col-def="hmxDefaultColDef"
                      :column-defs="testItemColDefs"
                      :row-data="testItems"
                      :pagination="false"
                      :animate-rows="false"
                      @grid-ready="onTestItemGridReady"
                      @first-data-rendered="autoSizeOnFirstData"
                    />
                  </div>
                </SplitterPanel>
              </Splitter>
            </TabPanel>

            <!-- ucCfView1（UCCfView → UCCfResult：炉次成分试样 | 炉次成分信息；ShowSaveButton=false） -->
            <TabPanel value="cf" class="h-full min-h-0 overflow-hidden">
              <Splitter class="h-full min-h-0">
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
                      :column-defs="cfSampleColDefs"
                      :row-data="cfSamples"
                      :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
                      :get-row-class="cfSampleRowClass"
                      :pagination="false"
                      :animate-rows="false"
                      :loading="tabLoading"
                      @grid-ready="onCfSampleGridReady"
                      @selection-changed="onCfSampleSelectionChanged"
                      @first-data-rendered="autoSizeOnFirstData"
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
                      :column-defs="cfItemColDefs"
                      :row-data="cfItems"
                      :pagination="false"
                      :animate-rows="false"
                      @grid-ready="onCfItemGridReady"
                      @first-data-rendered="autoSizeOnFirstData"
                    />
                  </div>
                </SplitterPanel>
              </Splitter>
            </TabPanel>

            <!-- xtraTabPage3 成品成分（原 PageVisible=false，QueryCpcf 非空才显示） -->
            <TabPanel v-if="cpcfRows.length > 0" value="cpcf" class="h-full min-h-0 overflow-hidden">
              <div class="h-full min-h-0 overflow-hidden">
                <AgGridVue
                  class="hmx-ag-grid h-full w-full"
                  :theme="theme"
                  :locale-text="AG_GRID_LOCALE_CN"
                  :default-col-def="hmxDefaultColDef"
                  :column-defs="cpcfColDefs"
                  :row-data="cpcfRows"
                  :pagination="false"
                  :animate-rows="false"
                  :loading="tabLoading"
                  @grid-ready="onCpcfGridReady"
                  @first-data-rendered="autoSizeOnFirstData"
                />
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </SplitterPanel>
    </Splitter>

    <!-- 确认（原 MsgBox.ShowYesNo / ConfirmJudge） -->
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

    <!-- 实验室复验选择（原 UCSampleRequires + FrmDialogBase「请选择要复验的项目」，ShowSelect=true、ColCJudgeResult 第2列） -->
    <Dialog
      :visible="labOpen"
      modal
      header="请选择要复验的项目"
      :style="{ width: 'min(70rem, calc(100vw - 2rem))' }"
      @update:visible="labOpen = $event"
    >
      <div class="h-[60vh] min-h-0 overflow-hidden">
        <AgGridVue
          class="hmx-ag-grid h-full w-full"
          :theme="theme"
          :locale-text="AG_GRID_LOCALE_CN"
          :default-col-def="hmxDefaultColDef"
          :column-defs="labColDefs"
          :row-data="labRows"
          :row-selection="{
            mode: 'multiRow',
            checkboxes: true,
            headerCheckbox: true,
            enableClickSelection: true,
            enableSelectionWithoutKeys: true,
          }"
          :suppress-column-virtualisation="true"
          :pagination="false"
          :animate-rows="false"
          @grid-ready="onLabGridReady"
          @selection-changed="onLabSelectionChanged"
          @first-data-rendered="autoSizeOnFirstData"
        />
      </div>
      <template #footer>
        <Button label="取消" variant="outlined" @click="labOpen = false" />
        <Button label="确定" variant="outlined" :loading="labLoading" @click="onLabOk" />
      </template>
    </Dialog>

    <!-- 质检复检录入（原 UCTestItemResult + AllowEditResult=true；保存结果原 C# 未订阅 → 无操作） -->
    <Dialog
      :visible="qmOpen"
      modal
      header="质检复验"
      :style="{ width: 'min(70rem, calc(100vw - 2rem))' }"
      @update:visible="qmOpen = $event"
    >
      <div class="flex h-[65vh] min-h-0 flex-col">
        <Splitter class="min-h-0 flex-1">
          <SplitterPanel :size="57" :minSize="25" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">试样信息</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="testSampleColDefs"
                :row-data="qmRows"
                :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
                :get-row-class="testSampleRowClass"
                :pagination="false"
                :animate-rows="false"
                @grid-ready="onQmSampleGridReady"
                @selection-changed="onQmSampleSelectionChanged"
              />
            </div>
          </SplitterPanel>
          <SplitterPanel :minSize="22" class="flex flex-col overflow-hidden">
            <!-- stackPanel2（AllowEditResult=true → 保存结果可见，原窗体未订阅处理 → 无操作） -->
            <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
              <Button variant="outlined" class="shrink-0 whitespace-nowrap" disabled>保存结果</Button>
              <span class="ml-auto text-xs font-medium text-muted-foreground">检验结果</span>
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
                @first-data-rendered="autoSizeOnFirstData"
              />
            </div>
          </SplitterPanel>
        </Splitter>
      </div>
      <template #footer>
        <Button label="取消" variant="outlined" @click="qmOpen = false" />
        <Button label="确定" variant="outlined" :loading="qmLoading" @click="onQmOk" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
/* 原 UCTestJob / UCTestItemResult / UCCfResult RowCellStyle */
:deep(.row-jiaji) {
  background-color: rgba(255, 255, 0, 0.35);
}
:deep(.judge-ok) {
  background-color: rgba(0, 255, 0, 0.247) !important;
}
:deep(.judge-ng) {
  background-color: rgba(255, 0, 0, 0.247) !important;
}
:deep(.judge-warn) {
  background-color: rgba(255, 255, 0, 0.247) !important;
}
:deep(.flag-bad) {
  color: red;
}
:deep(.smp-disabled) {
  font-style: italic;
  background-color: rgba(192, 192, 192, 0.25);
}
:deep(.smp-strike) {
  text-decoration: line-through;
}
</style>
