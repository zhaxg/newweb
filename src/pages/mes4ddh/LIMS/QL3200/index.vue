<script setup lang="ts">
/** 对应 FrmQL3200（检验委托接收→检验结果审核 / 窗体标题「委托管理」）：DDH.Winforms.LIMS.Forms.FrmQL3200
 *  布局：查询区（9 项 + 委托时间 + 登记时间；审核状态下拉）
 *       + stackPanel1（查询 / 审核报出 / 采集试验结果，右=标题「委托单信息」；左表无独立标题条）
 *       → 左右 Splitter 31%（委托单信息多选 | 右栏）
 *       → 右栏：上下 33%（试验项目 SampleRequires，行选择勾选（原 Selected 列，ui-rules §7）；
 *              表头一行共用：左=审核报出/驳回/撤销报出（原 stackPanel2），右=标题「试验项目」）
 *              → UCTestItemResult 左右 57%（试样信息 | 检验结果；复制/粘贴/保存默认 AllowEdit=false 隐藏）
 *  已接入：testJobApi.queryTestJob（Statuses=已接收+已完成）、querySampleRequires、collectTestData /
 *         qL3200Api.queryTestSamplesBySampleRequires、check、passMulti、revertCheck /
 *         tPa1000Api.queryLines
 *  默认：CheckStatus=待审核、登记时间近1月～明天、CreateTime 不过滤（原构造函数）
 *  待接入：复制结果/粘贴结果/保存结果（原 UC AllowEdit=false 本窗体不显示，无 BtnSaveClick 订阅）
 *  已知偏差：右栏检验结果只读展示（原即隐藏保存）；代码列显示原始代码 */
import { nextTick, onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconCheck, IconFlask, IconRefresh, IconSearch, IconX } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type {
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
  qL3200Api,
  testJobApi,
  TestJobCheckStatus,
  TestJobStatus,
  YesNo,
  type QueryTestJobInput,
  type SampleRequires,
  type TestItemValue,
  type TestSample,
  type TimeRange,
} from "@/api/mes4ddh/lims.swagger";
import { tPa1000Api, type Tpa1000 as LineRow } from "@/api/mes4ddh/shr.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

const statusFmt = (p: ValueFormatterParams) =>
  (
    ({
      [TestJobStatus.NotSend]: "未发送",
      [TestJobStatus.Sent]: "已发送未接收",
      20: "已接收",
      25: "已拒收",
      [TestJobStatus.Finished]: "已完成",
    }) as Record<string, string>
  )[String(p.value)] ?? (p.value == null ? "" : String(p.value));
const checkFmt = (p: ValueFormatterParams) =>
  (
    ({
      [TestJobCheckStatus.NotComplete]: "试验未完成",
      [TestJobCheckStatus.NotCheck]: "待审核",
      [TestJobCheckStatus.Pass]: "审核通过",
      [TestJobCheckStatus.NotPass]: "已驳回",
    }) as Record<string, string>
  )[String(p.value)] ?? (p.value == null ? "" : String(p.value));
const yesNoFmt = (p: ValueFormatterParams) => (p.value == null ? "" : Number(p.value) === 1 ? "是" : "否");
const sampleJudgeFmt = (p: ValueFormatterParams) =>
  (({ 0: "待判", 1: "不需判", 2: "合格", 3: "不合格" }) as Record<string, string>)[String(p.value)] ?? "";
const judgeFmt = (p: ValueFormatterParams) =>
  (({ 0: "待判", 2: "合格", 3: "不合格", 4: "人工放行" }) as Record<string, string>)[String(p.value)] ?? "";
const ctrlFmt = (p: ValueFormatterParams) => (Number(p.value) === 1 ? "内控" : "标准");
const rangeFmt = (p: ValueFormatterParams) => {
  const r = p.value as { min?: number | null; max?: number | null } | null;
  if (r?.min == null && r?.max == null) return "";
  return `${r?.min ?? ""} ~ ${r?.max ?? ""}`;
};
const intervalFmt = (p: ValueFormatterParams) =>
  (({ 1: "≤E≤", 2: "＜E≤", 4: "≤E＜", 6: "＜E＜" }) as Record<string, string>)[String(p.value)] ?? "";

/* ---------- 查询（原构造：CheckStatus=待审核、DReceiveTime 近1月～明天、CreateTime 注释掉） ---------- */
function defaultReceiveDates(): Date[] {
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
  cRecheckFlag: null as YesNo | null | "",
  cBatch: "",
  checkStatus: TestJobCheckStatus.NotCheck as TestJobCheckStatus | null | "",
  createDate: null as Date[] | null,
  receiveDate: defaultReceiveDates() as Date[] | null,
});

const checkStatusOptions = [
  { label: "待审核", value: TestJobCheckStatus.NotCheck },
  { label: "审核通过", value: TestJobCheckStatus.Pass },
  { label: "已驳回", value: TestJobCheckStatus.NotPass },
];
const recheckOptions = [
  { label: "否", value: YesNo.N },
  { label: "是", value: YesNo.Y },
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
    cOrderNo: input.cOrderNo?.trim() || undefined,
    cRecheckFlag: input.cRecheckFlag === "" || input.cRecheckFlag == null ? null : input.cRecheckFlag,
    cBatch: input.cBatch?.trim() || undefined,
    checkStatus: input.checkStatus === "" || input.checkStatus == null ? null : input.checkStatus,
    createTime: toTimeRange(input.createDate),
    dReceiveTime: toTimeRange(input.receiveDate),
    completeFlag: null,
    // 原 btnQuery_Click：Statuses 空则补 Finished+Received
    statuses: [TestJobStatus.Finished, 20 as TestJobStatus],
  };
}

/* ---------- 左表：委托单信息 ---------- */
const jobRows = shallowRef<any[]>([]);
const jobGridApi = ref<GridApi | null>(null);
const focusJob = ref<any | null>(null);
const querying = ref(false);
const loadingChild = ref(false);
let jobToken = 0;
let sampleToken = 0;

const jobColDefs = ref<ColDef[]>([
  { field: "selected", headerName: " ", width: 44, minWidth: 44, hide: true },
  { field: "cStove", headerName: "炉号", width: 100 },
  { field: "cBatch", headerName: "批号", width: 100 },
  { field: "cInternalNo", headerName: "内部编号", width: 100 },
  { field: "cTestNo", headerName: "委托单号", width: 120 },
  { field: "nTestTimes", headerName: "试验次数", width: 85 },
  { field: "cRecheckFlag", headerName: "复验标记", width: 85, valueFormatter: yesNoFmt },
  { field: "cStatus", headerName: "委托单状态", width: 110, valueFormatter: statusFmt },
  {
    field: "cLineCode",
    headerName: "产线代码",
    width: 95,
    valueFormatter: (p) => lineOptions.value.find((l) => l.value === p.value)?.label ?? p.value ?? "",
  },
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
    valueFormatter: judgeFmt,
    cellClass: (p) => judgeCell(p),
  },
  { field: "cJudgeUser", headerName: "判定人", width: 85 },
  { field: "dJudgeTime", headerName: "判定时间", width: 130 },
  {
    field: "cJudgeResult",
    headerName: "最终判定结果",
    width: 110,
    valueFormatter: judgeFmt,
    cellClass: (p) => judgeCell(p),
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
  { field: "cOrderNo", headerName: "订单号", width: 110 },
  { field: "orderCustCName", headerName: "订货客户", width: 110 },
  { field: "cCustStdCode", headerName: "加工用途代码", width: 110 },
  { field: "cDelivyStatusCode", headerName: "交货状态代码", width: 110 },
  { field: "cCzpFlag", headerName: "重组批标记", width: 95, valueFormatter: yesNoFmt },
  { field: "cPrevTestNo", headerName: "前委托单号", width: 110 },
  { field: "wgt", headerName: "重量", width: 75 },
  { field: "count", headerName: "件数", width: 70 },
  { field: "cJiaJi", headerName: "加急", width: 65, valueFormatter: yesNoFmt },
  { field: "cMatShape", headerName: "尺寸外形", width: 95 },
  { field: "cSpecialDesc", headerName: "特殊要求", width: 110 },
  { field: "cSpecialMarkHt", headerName: "技术要求特殊说明", width: 140 },
  { field: "cSpecialPackDesc", headerName: "特殊包装要求叙述", width: 150 },
  { field: "cWarrantyDesc", headerName: "质保书要求", width: 110 },
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
  { field: "cHeadFoot", headerName: "头尾坯标识", hide: true },
  { field: "cHeadFootStove", headerName: "头尾炉标识", hide: true },
  { field: "cException", headerName: "异常坯标识", hide: true },
]);

function judgeCell(p: ValueFormatterParams) {
  const v = Number(p.value);
  if (v === 2 || v === 4) return "judge-ok";
  if (v === 3) return "judge-ng";
  return "";
}
function jobRowClass(p: RowClassParams) {
  return Number((p.data as any)?.cJiaJi) === 1 ? "row-jiaji" : undefined;
}

/* ---------- 中表：试验项目（SampleRequires，ViewCaption 试验项目；原 Selected 勾选列改行选择，列隐藏保留） ---------- */
const sampleRows = shallowRef<SampleRequires[]>([]);
const sampleGridApi = ref<GridApi | null>(null);

const sampleColDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cTestItemName", headerName: "试验项目名称", width: 130 },
  {
    field: "cJudgeResult",
    headerName: "判定结果",
    width: 90,
    valueFormatter: sampleJudgeFmt,
    cellClass: (p) => judgeCell(p),
  },
  { field: "cCompleteFlag", headerName: "确认完成标记", width: 120, valueFormatter: yesNoFmt },
  { field: "dCompleteTime", headerName: "确认完成时间", width: 140 },
  { field: "cCompleteUser", headerName: "确认完成用户", width: 120 },
  { field: "cCheckStatus", headerName: "审核状态", width: 100, valueFormatter: checkFmt },
  { field: "cCheckUser", headerName: "审核人", width: 90 },
  { field: "dCheckTime", headerName: "审核时间", width: 140 },
  { field: "cReplaceSampleCode", headerName: "代样指示", width: 90 },
  { field: "cSamplePosDesc", headerName: "取样位置", width: 100 },
  { field: "cSampleLenDesc", headerName: "取样长度说明", width: 120 },
  { field: "cWholeBacklogCode", headerName: "全程工序代码", width: 120 },
  { field: "cTestItemTypeDesc", headerName: "试验项目种类描述", width: 140 },
  { field: "cTestItemType", headerName: "试验项目种类", width: 120 },
  { field: "cSampleLen", headerName: "取样长度", width: 95 },
  { field: "cSamplePos", headerName: "取样位置代码", width: 110 },
  { field: "cTestItem", headerName: "试验项目", width: 95 },
  { field: "id", headerName: "主键", hide: true },
  { field: "creator", headerName: "创建人", hide: true },
  { field: "createTime", headerName: "创建时间", hide: true },
  { field: "lastModifier", headerName: "最后更新人", hide: true },
  { field: "lastModifyTime", headerName: "最后更新时间", hide: true },
  { field: "fId", headerName: "检验委托ID", hide: true },
  { field: "cTestNo", headerName: "委托单号", hide: true },
  { field: "cJudgeRemark", headerName: "判定备注", hide: true },
  { field: "cTestDirect", headerName: "试验方向代码", hide: true },
  { field: "cTestCndCode", headerName: "试验条件代码", hide: true },
  { field: "nSampleNumRnd", headerName: "取样个数", hide: true },
  { field: "nTestNum", headerName: "试验项目组数", hide: true },
  { field: "cTestPurpose", headerName: "试验目的代码", hide: true },
  { field: "cFinishedPrdFlag", headerName: "过程成品标识", hide: true },
  { field: "cIdxNo", headerName: "试验子项要求索引号", hide: true },
  { field: "nRetestMulti", headerName: "复验倍数", hide: true },
  { field: "cTestDirectDesc", headerName: "试验方向", hide: true },
  { field: "cTestPurposeDesc", headerName: "试验目的说明", hide: true },
  { field: "nTestTimes", headerName: "试验次数", hide: true },
]);

/* ---------- 右下：试样信息 + 检验结果（UCTestItemResult，只读） ---------- */
const testSamples = shallowRef<TestSample[]>([]);
const sampleGrid2Api = ref<GridApi | null>(null);
const resultRows = shallowRef<TestItemValue[]>([]);
const resultGridApi = ref<GridApi | null>(null);

const testSampleColDefs = ref<ColDef[]>([
  { field: "cSampleNo", headerName: "试样号", width: 90 },
  { field: "cTestItemTypeDesc", headerName: "试验项目种类描述", width: 140 },
  { field: "cTestItemName", headerName: "试验项目名称", width: 130 },
  { field: "cSamplePosDesc", headerName: "取样位置", width: 100 },
  { field: "cSampleLenDesc", headerName: "取样长度说明", width: 120 },
  { field: "cTestDirectDesc", headerName: "试验方向", width: 100 },
  {
    field: "cJudgeResult",
    headerName: "判定结果",
    width: 90,
    valueFormatter: sampleJudgeFmt,
    cellClass: (p) => judgeCell(p),
  },
  { field: "cJudgeRemark", headerName: "判定备注", width: 110 },
  { field: "labRemark", headerName: "实验室备注", width: 120 },
  { field: "cTestItem", headerName: "试验项目", width: 95 },
  { field: "cTestItemType", headerName: "试验项目种类", width: 110 },
  { field: "cSamplePos", headerName: "取样位置代码", width: 110 },
  { field: "cSampleLen", headerName: "取样长度", width: 95 },
  { field: "cTestDirect", headerName: "试验方向代码", width: 110 },
  { field: "cTestAdditionDesc", headerName: "试验补充说明", width: 130 },
  { field: "cGroupNo", headerName: "结果录入班组", width: 110 },
  { field: "cShiftNo", headerName: "结果录入班次", width: 110 },
  { field: "cTestUser", headerName: "结果录入人", width: 100 },
  { field: "dTestTime", headerName: "结果录入时间", width: 140 },
  { field: "cRecheckFlag", headerName: "复验标记", width: 90, valueFormatter: yesNoFmt },
  { field: "creator", headerName: "创建人", width: 90 },
  { field: "createTime", headerName: "创建时间", width: 130 },
  { field: "cWholeBacklogCode", headerName: "全程工序代码", width: 120 },
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

const resultColDefs = ref<ColDef[]>([
  { field: "cTestSubItemName", headerName: "试验子项目名称", width: 130 },
  { field: "cTestSubItemDisplayName", headerName: "项目说明", width: 100 },
  { field: "valueDisplay", headerName: "试验结果", width: 100 },
  { field: "isJudge", headerName: "是否判定", width: 90, valueFormatter: yesNoFmt },
  { field: "ctrlMode", headerName: "管控模式", width: 90, valueFormatter: ctrlFmt },
  { field: "judgeRange", headerName: "标准范围", width: 110, valueFormatter: rangeFmt },
  { field: "judgeRangeNk", headerName: "内控范围", width: 110, valueFormatter: rangeFmt },
  { field: "cTargetValue", headerName: "目标值", width: 90 },
  { field: "cFormula", headerName: "计算公式", width: 110 },
  { field: "cTestSubItem", headerName: "试验子项代码", width: 120 },
  { field: "cValue", headerName: "原始结果", width: 100 },
  { field: "nItemAccuracy", headerName: "精度", width: 70 },
  { field: "isPrint", headerName: "是否打质保书", width: 120, valueFormatter: yesNoFmt },
  { field: "cJudgeFormula", headerName: "计算公式", width: 110 },
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
  { field: "cJudgeResult", headerName: "最终判定结果", hide: true },
  { field: "cRecheckFlag", headerName: "复验标记", hide: true },
  { field: "seq", headerName: "序号", hide: true },
]);

async function waitForGridRows(api: GridApi | null, min = 1): Promise<boolean> {
  for (let i = 0; i < 20; i++) {
    await nextTick();
    if (api && api.getDisplayedRowCount() >= min) return true;
    await new Promise((r) => setTimeout(r, 25));
  }
  return !!api && api.getDisplayedRowCount() >= min;
}

/* ---------- 查询（原 btnQuery_Click → testJobApi.queryTestJob） ---------- */
async function onQuery() {
  querying.value = true;
  try {
    const rows = ((await testJobApi.queryTestJob(buildQuery())) ?? []) as any[];
    jobRows.value = rows;
    focusJob.value = null;
    sampleRows.value = [];
    testSamples.value = [];
    resultRows.value = [];
    jobGridApi.value?.setGridOption("rowData", rows);
    if (rows.length) {
      await waitForGridRows(jobGridApi.value);
      const api = jobGridApi.value;
      if (api) {
        api.deselectAll();
        api.getDisplayedRowAtIndex(0)?.setSelected(true);
      }
    }
    requestAnimationFrame(() => jobGridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* ---------- 主表选中 → 试验项目（按 CheckStatus 客户端过滤，原 UcTestJob1_FocusedRowObjectChanged） ---------- */
async function onJobSelectionChanged(e: SelectionChangedEvent) {
  const nodes = e.api.getSelectedNodes();
  const row = (nodes[nodes.length - 1]?.data as any) ?? null;
  focusJob.value = row;
  const token = ++jobToken;
  sampleToken++;
  if (!row) {
    sampleRows.value = [];
    testSamples.value = [];
    resultRows.value = [];
    return;
  }
  loadingChild.value = true;
  try {
    let list = ((await testJobApi.querySampleRequires(row.id, undefined)) ?? []) as SampleRequires[];
    const cs = input.checkStatus;
    if (cs != null && cs !== ("" as unknown)) {
      list = list.filter((x) => Number(x.cCheckStatus) === Number(cs));
    }
    if (token !== jobToken) return;
    sampleRows.value = list;
    testSamples.value = [];
    resultRows.value = [];
    sampleGridApi.value?.setGridOption("rowData", list);
    await waitForGridRows(sampleGridApi.value);
    /* 原 Selected 列按数据字段渲染：回填后回灌勾选态（ui-rules §7，同 SS3040） */
    requestAnimationFrame(() =>
      sampleGridApi.value?.forEachNode((n) => n.setSelected(!!(n.data as SampleRequires | undefined)?.selected)),
    );
  } catch {
    /* 拦截层已 toast */
  } finally {
    if (token === jobToken) loadingChild.value = false;
  }
}

/* ---------- 试验项目选中 → 试样 + 检验结果（原 GridView2_FocusedRowObjectChanged） ---------- */
async function onSampleRequiresSelection(e: SelectionChangedEvent) {
  const nodes = e.api.getSelectedNodes();
  const row = (nodes[nodes.length - 1]?.data as SampleRequires) ?? null;
  const token = ++sampleToken;
  if (!row) {
    testSamples.value = [];
    resultRows.value = [];
    return;
  }
  loadingChild.value = true;
  try {
    const list = ((await qL3200Api.queryTestSamplesBySampleRequires(row)) ?? []) as TestSample[];
    const filtered = list.filter((x) => x.tql3110Id == null || x.tql3110Id === row.id);
    if (token !== sampleToken) return;
    const ordered = [...filtered].sort(
      (a, b) =>
        String(a.cTestItemType ?? "").localeCompare(String(b.cTestItemType ?? "")) ||
        String(a.cTestItem ?? "").localeCompare(String(b.cTestItem ?? "")) ||
        Number(a.cDisable ?? 0) - Number(b.cDisable ?? 0) ||
        String(a.cSampleNo ?? "").localeCompare(String(b.cSampleNo ?? "")),
    );
    testSamples.value = ordered;
    resultRows.value = (ordered[0]?.testItems ?? []) as TestItemValue[];
    sampleGrid2Api.value?.setGridOption("rowData", ordered);
    resultGridApi.value?.setGridOption("rowData", resultRows.value as any);
    await waitForGridRows(sampleGrid2Api.value);
    // 默认选中第一试样，带出检验结果
    if (ordered.length && sampleGrid2Api.value) {
      sampleGrid2Api.value.deselectAll();
      sampleGrid2Api.value.getDisplayedRowAtIndex(0)?.setSelected(true);
    }
  } catch {
    /* 拦截层已 toast */
  } finally {
    if (token === sampleToken) loadingChild.value = false;
  }
}

function onTestSampleSelection(e: SelectionChangedEvent) {
  const row = (e.api.getSelectedNodes()[0]?.data as TestSample) ?? null;
  resultRows.value = (row?.testItems ?? []) as TestItemValue[];
  resultGridApi.value?.setGridOption("rowData", resultRows.value as any);
  requestAnimationFrame(() => resultGridApi.value?.autoSizeAllColumns());
}

/** 中表勾选集合（原 data.Where(x => x.Selected)；ui-rules §7 改行选择 getSelectedRows） */
function checkedRequires(): SampleRequires[] {
  return (sampleGridApi.value?.getSelectedRows() ?? []) as SampleRequires[];
}
function selectedJobs(): any[] {
  const nodes = jobGridApi.value?.getSelectedNodes() ?? [];
  return nodes.map((n) => n.data).filter(Boolean);
}

/* ---------- ShowYesNo 受控确认 ---------- */
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

function namesOf(list: SampleRequires[]): string {
  return list.map((x) => x.cTestItemName ?? "").join("\n");
}

function ensureCheckable(selected: SampleRequires[], status: TestJobCheckStatus, failMsg: string): boolean {
  if (!selected.length) return false;
  if (selected.some((x) => Number(x.cCheckStatus) !== status)) {
    toast(failMsg, 2000, "warn");
    return false;
  }
  return true;
}

/* 原 btnPass_Click：选中且待审核 →「确认报出选中项目？」→ check(Pass) → 重查 */
function onPass() {
  const selected = checkedRequires();
  if (!ensureCheckable(selected, TestJobCheckStatus.NotCheck, "只有待审核状态的项目可以审核")) return;
  askConfirm(`确认报出选中项目？\n\n${namesOf(selected)}`, async () => {
    try {
      await qL3200Api.check(
        TestJobCheckStatus.Pass,
        selected.map((x) => x.id!),
      );
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    }
  });
}

/* 原 btnNotPass_Click */
function onNotPass() {
  const selected = checkedRequires();
  if (!ensureCheckable(selected, TestJobCheckStatus.NotCheck, "只有待审核状态的项目可以审核")) return;
  askConfirm(`确认驳回选中项目？\n\n${namesOf(selected)}`, async () => {
    try {
      await qL3200Api.check(
        TestJobCheckStatus.NotPass,
        selected.map((x) => x.id!),
      );
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    }
  });
}

/* 原 btnRevertCheck_Click */
function onRevertCheck() {
  const selected = checkedRequires();
  if (!ensureCheckable(selected, TestJobCheckStatus.Pass, "只有审核通过状态的项目可以撤销")) return;
  askConfirm(`确认撤销报出选中项目？\n\n${namesOf(selected)}`, async () => {
    try {
      await qL3200Api.revertCheck(selected.map((x) => x.id!));
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    }
  });
}

/* 原 btnPassMulti_Click：委托多选批量报出 */
function onPassMulti() {
  const selected = selectedJobs();
  if (!selected.length) return;
  askConfirm(`确认报出选中委托？已选择[${selected.length}]行`, async () => {
    try {
      await qL3200Api.passMulti(selected.map((x) => x.id));
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    }
  });
}

/* 原 simpleButton1_Click：逐单采集 */
function onCollect() {
  const rows = selectedJobs();
  if (!rows.length) return;
  askConfirm(`确认采集选中委托的试验结果？已选择[${rows.length}]行`, async () => {
    let success = 0;
    let error = 0;
    for (const item of rows) {
      try {
        await testJobApi.collectTestData(item.id);
        success++;
        toast(`采集委托单号：${item.cTestNo} 成功`, 1600, "success");
      } catch {
        error++;
        toast(`采集委托单号：${item.cTestNo} 失败`, 1600, "error");
      }
    }
    toast(`采集完成，共 ${rows.length} 条，成功 ${success} 条，失败 ${error} 条。`, 3000, error ? "warn" : "success");
  });
}

function onJobGridReady(e: GridReadyEvent) {
  jobGridApi.value = e.api;
}
function onSampleGridReady(e: GridReadyEvent) {
  sampleGridApi.value = e.api;
}
function onTestSampleGridReady(e: GridReadyEvent) {
  sampleGrid2Api.value = e.api;
}
function onResultGridReady(e: GridReadyEvent) {
  resultGridApi.value = e.api;
}

onMounted(() => {
  void loadLines();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区（原 dataLayoutControl：9 输入 + 委托时间 + 登记时间） -->
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
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
          <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" />
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
          <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
          <InputText v-model="input.cBatch" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">审核状态</label>
          <Select
            v-model="input.checkStatus"
            :options="checkStatusOptions"
            option-label="label"
            option-value="value"
            show-clear
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
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">登记时间</label>
          <DatePicker
            v-model="input.receiveDate"
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

    <!-- stackPanel1：查询 / 审核报出 / 采集试验结果；右=ViewCaption「委托单信息」（共用 h-9，左表不再单独标题条） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onPassMulti">
        <IconCheck class="h-3 w-3" />审核报出
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCollect">
        <IconFlask class="h-3 w-3" />采集试验结果
      </Button>
      <span class="ml-auto text-xs font-medium text-muted-foreground">委托单信息</span>
    </div>

    <!-- 左右分栏（原 splitContainerControl1 338/1079≈31%；无独立标题条，标题在上方工具栏右侧） -->
    <Splitter class="min-h-0 flex-1">
      <SplitterPanel :size="31" :minSize="18" class="flex flex-col overflow-hidden">
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
            :pagination="false"
            :animate-rows="false"
            :loading="querying"
            :get-row-class="jobRowClass"
            @grid-ready="onJobGridReady"
            @selection-changed="onJobSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :minSize="40" class="flex min-h-0 flex-col overflow-hidden">
        <!-- 上下：试验项目 | UCTestItemResult（原 147/447≈33%）
             表头共用一行：左=stackPanel2 三按钮，右=ViewCaption「试验项目」 -->
        <Splitter class="min-h-0 flex-1" layout="vertical">
          <SplitterPanel :size="33" :minSize="18" class="flex flex-col overflow-hidden">
            <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
              <Button variant="outlined" class="shrink-0 whitespace-nowrap" :disabled="loadingChild" @click="onPass">
                <IconCheck class="h-3 w-3" />审核报出
              </Button>
              <Button
                variant="outlined"
                severity="danger"
                class="shrink-0 whitespace-nowrap"
                :disabled="loadingChild"
                @click="onNotPass"
              >
                <IconX class="h-3 w-3" />驳回
              </Button>
              <Button
                variant="outlined"
                class="shrink-0 whitespace-nowrap"
                :disabled="loadingChild"
                @click="onRevertCheck"
              >
                <IconRefresh class="h-3 w-3" />撤销报出
              </Button>
              <span class="ml-auto text-xs font-medium text-muted-foreground">试验项目</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="sampleColDefs"
                :row-data="sampleRows"
                :row-selection="{
                  mode: 'multiRow',
                  checkboxes: true,
                  headerCheckbox: true,
                  enableClickSelection: true,
                  enableSelectionWithoutKeys: true,
                }"
                :pagination="false"
                :animate-rows="false"
                :loading="loadingChild"
                @grid-ready="onSampleGridReady"
                @selection-changed="onSampleRequiresSelection"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </div>
          </SplitterPanel>

          <SplitterPanel :minSize="30" class="flex min-h-0 flex-col overflow-hidden">
            <!-- UCTestItemResult：试样 | 检验结果（原 611/1064≈57%；复制/粘贴/保存默认隐藏） -->
            <Splitter class="min-h-0 flex-1">
              <SplitterPanel :size="57" :minSize="30" class="flex flex-col overflow-hidden">
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
                    :pagination="false"
                    :animate-rows="false"
                    :loading="loadingChild"
                    @grid-ready="onTestSampleGridReady"
                    @selection-changed="onTestSampleSelection"
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
                    :column-defs="resultColDefs"
                    :row-data="resultRows"
                    :pagination="false"
                    :animate-rows="false"
                    @grid-ready="onResultGridReady"
                    @first-data-rendered="autoSizeOnFirstData"
                  />
                </div>
              </SplitterPanel>
            </Splitter>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
    </Splitter>

    <!-- 确认（对应原 MsgBox.ShowYesNo） -->
    <Dialog
      :visible="confirmOpen"
      modal
      header="确认"
      :style="{ width: 'min(30rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event"
    >
      <p class="text-xs whitespace-pre-line">{{ confirmMsg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" variant="outlined" @click="onConfirmOk" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
:deep(.row-jiaji) {
  background-color: rgba(255, 255, 0, 0.35);
}
:deep(.judge-ok) {
  background-color: rgba(0, 255, 0, 0.247) !important;
}
:deep(.judge-ng) {
  background-color: rgba(255, 0, 0, 0.247) !important;
}
</style>
