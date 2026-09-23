<script setup lang="ts">
/** 对应 FrmQL3000（检验委托发送 / 窗体标题「炼钢试验委托发送」）：DDH.Winforms.LIMS.Forms.FrmQL3000
 *  布局：查询条件区（DataLayout 10 项）+ stackPanel1（查询/新建委托/撤销发送）
 *       → 上下 Splitter（委托单信息 UCTestJob，原 SplitterPosition 218/475≈46%）
 *       → stackPanel2（新增项目/保存/保存并发送/保存发送（加急）/删除项目）
 *       → 左右 Splitter（试验项目/取样信息 UCSampleRequires | 试验子项明细 Tql3200，877/1121≈78%）
 *  已接入：qL3000Api.queryTestJob / testJobApi.querySampleRequires、query3200s、
 *         saveSampleRequires、sendTestJob、sendTestJobJiaJi、cancelSendTestJob /
 *         tPa1000Api.queryLines（产线下拉，原 LineFormatter）
 *  待接入：新建委托 → FrmQL3001 弹窗（确认后连带迁移）→ testJobApi.addTestJob（已生成）；
 *         新增项目 → FrmQL3002 选试验项目弹窗；
 *         委托单表「冶金规范码/制造标准」单元格点击查看（IMscView/IStNoView）
 *  已知偏差：代码类列（判定人/接收人/创建人等）显示原始代码——原 UserFormatter 转义未迁；
 *         复验标记下拉原 Designer/运行时均未灌候选，按绑定类型 YesNo 提供 是/否 */
import { nextTick, onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import {
  IconArrowBackUp,
  IconBolt,
  IconDeviceFloppy,
  IconFilePlus,
  IconPlus,
  IconSearch,
  IconSend,
  IconTrash,
} from "@tabler/icons-vue";
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
  qL3000Api,
  testJobApi,
  TestJobStatus,
  YesNo,
  type QueryTestJobInput,
  type SampleRequires,
  type Tql3200,
  type TimeRange,
} from "@/api/mes4ddh/lims.swagger";
import { tPa1000Api, type Tpa1000 as LineRow } from "@/api/mes4ddh/shr.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/* ---------- 格式化 ---------- */
const statusFmt = (p: ValueFormatterParams) =>
  (({
    [TestJobStatus.NotSend]: "未发送",
    [TestJobStatus.Sent]: "已发送未接收",
    20: "已接收",
    25: "已拒收",
    [TestJobStatus.Finished]: "已完成",
  }) as Record<string, string>)[String(p.value)] ?? (p.value == null ? "" : String(p.value));
const yesNoFmt = (p: ValueFormatterParams) => (p.value == null ? "" : Number(p.value) === 1 ? "是" : "否");
const judgeFmt = (p: ValueFormatterParams) =>
  (({ 0: "待判", 2: "合格", 3: "不合格", 4: "人工放行" }) as Record<string, string>)[String(p.value)] ?? "";
const sampleJudgeFmt = (p: ValueFormatterParams) =>
  (({ 0: "待判", 1: "不需判", 2: "合格", 3: "不合格" }) as Record<string, string>)[String(p.value)] ?? "";
/** EqualsFlag 开闭区间显示串，与原 [LDisplay] 一致 */
const intervalFmt = (p: ValueFormatterParams) =>
  (({ 1: "≤E≤", 2: "＜E≤", 4: "≤E＜", 6: "＜E＜" }) as Record<string, string>)[String(p.value)] ?? "";

/* ---------- 查询条件（原 queryTestJobInputBindingSource 默认：近1月～明天、状态=未发送） ---------- */
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
  cSgSign: "",
  cSgStd: "",
  cOrderNo: "",
  cStatus: TestJobStatus.NotSend as TestJobStatus | null | "",
  cRecheckFlag: null as YesNo | null | "",
  cBatch: "",
  dates: defaultDates() as Date[] | null,
});

/** 原 CStatusImageComboBoxEdit.AddEnum&lt;TestJobStatus&gt;（含 swagger 枚举未收录的 已拒收=25） */
const statusOptions = [
  { label: "未发送", value: TestJobStatus.NotSend },
  { label: "已发送未接收", value: TestJobStatus.Sent },
  { label: "已接收", value: 20 as TestJobStatus },
  { label: "已拒收", value: 25 as TestJobStatus },
  { label: "已完成", value: TestJobStatus.Finished },
];
/** 原 CRecheckFlag 未灌 Items，按绑定类型 YesNo 提供候选 */
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
  // PrimeVue Select 清空后可能给 ""——归一成 null，避免空串被当成有效枚举过滤光
  return {
    cLineCode: input.cLineCode || undefined,
    cTestNo: input.cTestNo?.trim() || undefined,
    cStove: input.cStove?.trim() || undefined,
    cSgSign: input.cSgSign?.trim() || undefined,
    cSgStd: input.cSgStd?.trim() || undefined,
    cOrderNo: input.cOrderNo?.trim() || undefined,
    cStatus: input.cStatus === "" || input.cStatus == null ? null : input.cStatus,
    cRecheckFlag: input.cRecheckFlag === "" || input.cRecheckFlag == null ? null : input.cRecheckFlag,
    cBatch: input.cBatch?.trim() || undefined,
    createTime: toTimeRange(input.dates),
  };
}

/* ---------- 主表：委托单信息（UCTestJob gridView1，TestJob，可见45+隐藏16） ---------- */
const jobRows = shallowRef<any[]>([]);
const jobGridApi = ref<GridApi | null>(null);
const selectedJob = ref<any | null>(null);
const querying = ref(false);
const loadingChildren = ref(false);
let focusToken = 0;

const jobColDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cStove", headerName: "炉号", width: 110 },
  { field: "cBatch", headerName: "批号", width: 110 },
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
  { field: "cAutoJudgeResult", headerName: "自动判定结果", width: 120, valueFormatter: judgeFmt, cellClass: (p) => judgeCell(p) },
  { field: "cJudgeUser", headerName: "判定人", width: 90 },
  { field: "dJudgeTime", headerName: "判定时间", width: 140 },
  { field: "cJudgeResult", headerName: "最终判定结果", width: 120, valueFormatter: judgeFmt, cellClass: (p) => judgeCell(p) },
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

function judgeCell(p: ValueFormatterParams) {
  const v = Number(p.value);
  if (v === 2 || v === 4) return "judge-ok";
  if (v === 3) return "judge-ng";
  return "";
}
/** 原 UCTestJob.RowCellStyle：加急整行黄底 */
function jobRowClass(p: RowClassParams) {
  return Number((p.data as any)?.cJiaJi) === 1 ? "row-jiaji" : undefined;
}

/* ---------- 左下：试验项目/取样信息（UCSampleRequires，SampleRequires，可见21+隐藏20，AllowEdit=true） ---------- */
const sampleRows = shallowRef<any[]>([]);
const sampleGridApi = ref<GridApi | null>(null);

/** 可编辑可见列 = Designer 未写 AllowEdit=false 的：NTestNum / NSampleNumRnd / CTestAdditionDesc / CActualSamplePos */
const sampleColDefs = ref<ColDef[]>([
  { field: "cTestItemTypeDesc", headerName: "试验项目种类描述", width: 150 },
  { field: "cTestItemName", headerName: "试验项目名称", width: 140 },
  { field: "nTestNum", headerName: "试验项目组数", width: 121, editable: true },
  { field: "nSampleNumRnd", headerName: "取样个数", width: 100, editable: true, cellClass: "nsample-rnd" },
  { field: "cReplaceSampleCode", headerName: "代样指示", width: 94 },
  { field: "cSamplePosDesc", headerName: "取样位置", width: 110 },
  { field: "cActualSamplePos", headerName: "实际取样位置代码", width: 150, editable: true },
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
  { field: "cTestAdditionDesc", headerName: "试验补充说明", width: 140, editable: true },
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

/* ---------- 右下：试验子项明细（FrmQL3000 gridView1，Tql3200，14 列全可见，只读） ---------- */
const detailRows = shallowRef<Tql3200[]>([]);
const detailGridApi = ref<GridApi | null>(null);

const detailColDefs = ref<ColDef[]>([
  { field: "cTestSubItemCode", headerName: "试验子项目代码", width: 140 },
  { field: "cTestSubItemName", headerName: "试验子项目名称", width: 140 },
  { field: "cDisplayText", headerName: "项目说明", width: 110 },
  { field: "nValueMin", headerName: "检验标准下限", width: 120 },
  { field: "cInterval", headerName: "开闭区间", width: 90, valueFormatter: intervalFmt },
  { field: "nValueMax", headerName: "检验标准上限", width: 120 },
  { field: "cTargetValue", headerName: "目标值", width: 90 },
  { field: "nItemAccuracy", headerName: "精度", width: 70 },
  { field: "cFormula", headerName: "计算公式", width: 120 },
  { field: "cIsPrint", headerName: "是否打质保书", width: 120, valueFormatter: yesNoFmt },
  { field: "cIsJudge", headerName: "是否判定", width: 100, valueFormatter: yesNoFmt },
  { field: "nMinValueNk", headerName: "内控最小值", width: 110 },
  { field: "nValueIntervalNk", headerName: "内控开闭区间", width: 130, valueFormatter: intervalFmt },
  { field: "nMaxValueNk", headerName: "内控最大值", width: 110 },
]);

/* ---------- 查询（原 btnQuery_Click → qL3000Api.queryTestJob） ---------- */
/** 等 AG Grid 吃进 rowData（Vue prop → 网格节点常晚 1~N 帧），最多等 ~500ms */
async function waitForGridRows(api: GridApi | null, min = 1): Promise<boolean> {
  for (let i = 0; i < 20; i++) {
    await nextTick();
    if (api && api.getDisplayedRowCount() >= min) return true;
    await new Promise((r) => setTimeout(r, 25));
  }
  return !!api && api.getDisplayedRowCount() >= min;
}

async function onQuery() {
  querying.value = true;
  try {
    const rows = ((await qL3000Api.queryTestJob(buildQuery())) ?? []) as any[];
    jobRows.value = rows;
    // 双通道：prop 更新偶发不同步时，显式推一次 rowData
    jobGridApi.value?.setGridOption("rowData", rows);
    selectedJob.value = null;
    sampleRows.value = [];
    detailRows.value = [];
    if (rows.length) {
      const ok = await waitForGridRows(jobGridApi.value);
      const api = jobGridApi.value;
      if (ok && api) {
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

/* ---------- 主表选中 → 拉子表（原 UcLgTestJob1_FocusedRowObjectChanged，带过期令牌） ---------- */
async function onJobSelectionChanged(e: SelectionChangedEvent) {
  const row = (e.api.getSelectedNodes()[0]?.data as any) ?? null;
  selectedJob.value = row;
  const token = ++focusToken;
  if (!row) {
    sampleRows.value = [];
    detailRows.value = [];
    return;
  }
  loadingChildren.value = true;
  try {
    const [requires, t3200s] = await Promise.all([
      testJobApi.querySampleRequires(row.id, undefined),
      testJobApi.query3200s(row.cTestNo),
    ]);
    if (token !== focusToken) return; // 焦点已切换，丢弃过期响应
    sampleRows.value = requires ?? [];
    shelveTql3200s(t3200s ?? []);
    if (sampleRows.value.length) {
      const ok = await waitForGridRows(sampleGridApi.value);
      const api = sampleGridApi.value;
      if (ok && api && token === focusToken) {
        api.deselectAll();
        api.getDisplayedRowAtIndex(0)?.setSelected(true);
      }
    } else {
      detailRows.value = [];
    }
  } catch {
    /* 拦截层已 toast */
  } finally {
    if (token === focusToken) loadingChildren.value = false;
  }
}

let tql3200Cache: Tql3200[] = [];
function shelveTql3200s(list: Tql3200[]) {
  tql3200Cache = list;
}

/* ---------- 取样行选中 → 过滤试验子项明细（原 UcSampleRequires1_FocusedRowObjectChanged） ---------- */
function onSampleSelectionChanged(e: SelectionChangedEvent) {
  const row = (e.api.getSelectedNodes()[0]?.data as SampleRequires | undefined) ?? null;
  if (!row || !tql3200Cache.length) {
    detailRows.value = [];
    return;
  }
  const base = tql3200Cache.filter(
    (x) => x.cTestNo === row.cTestNo && x.cTestItem === row.cTestItem && x.cTestItemType === row.cTestItemType,
  );
  const list = base.some((x) => x.cIdxNo === row.cIdxNo)
    ? base.filter((x) => x.cIdxNo === row.cIdxNo)
    : tql3200Cache.filter(
        (x) =>
          x.cTestNo === row.cTestNo &&
          x.cWholeBacklogCode === row.cWholeBacklogCode &&
          x.cTestItem === row.cTestItem &&
          x.cTestItemType === row.cTestItemType &&
          x.cTestDirect === row.cTestDirect &&
          x.cSampleLen === row.cSampleLen &&
          x.cSamplePos === row.cSamplePos,
      );
  detailRows.value = [...list].sort((a, b) => String(a.cTestSubItemCode ?? "").localeCompare(String(b.cTestSubItemCode ?? "")));
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

function requireNotSendJob(): any | null {
  const row = selectedJob.value;
  if (!row) return null;
  if (row.cStatus !== TestJobStatus.NotSend) {
    toast("委托已发送，不能修改取样信息", 2000, "warn");
    return null;
  }
  return row;
}
function requireSendableJob(): any | null {
  const row = selectedJob.value;
  if (!row) return null;
  if (row.cStatus !== TestJobStatus.NotSend) {
    toast("委托已发送，不需要重新发送", 2000, "warn");
    return null;
  }
  return row;
}
/** 保存/发送取当前网格行：AG Grid 行内编辑可能只改 node.data，不回写 shallowRef 源数组 */
function currentSamples(): SampleRequires[] {
  const out: SampleRequires[] = [];
  sampleGridApi.value?.forEachNode((n) => {
    if (n.data) out.push(n.data as SampleRequires);
  });
  return out.length ? out : (sampleRows.value as SampleRequires[]);
}
function requireSamples(): SampleRequires[] | null {
  const list = currentSamples();
  if (!list.length) {
    toast("检验项目为空不能保存", 2000, "warn");
    return null;
  }
  return list;
}
function notSendGuardMsg(row: any): boolean {
  if (row.cStatus === TestJobStatus.NotSend) return true;
  toast("委托不是未发送状态，不允许操作", 2000, "warn");
  return false;
}

/* 原 btnSave_Click：状态/非空校验 → saveSampleRequires → 「保存成功」→ 重查 */
async function onSave() {
  const row = requireNotSendJob();
  if (!row) return;
  const list = requireSamples();
  if (!list) return;
  try {
    await testJobApi.saveSampleRequires(list);
    toast("保存成功", 2000, "success");
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  }
}

/* 原 btnSaveAndSend_Click */
function onSaveAndSend() {
  const row = requireSendableJob();
  if (!row) return;
  const list = requireSamples();
  if (!list) return;
  askConfirm("确认发送检验委托？", async () => {
    try {
      await testJobApi.sendTestJob(row.id, list);
      toast("发送成功", 2000, "success");
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    }
  });
}

/* 原 btnSend2_Click（保存发送 加急） */
function onSendJiaJi() {
  const row = requireSendableJob();
  if (!row) return;
  const list = requireSamples();
  if (!list) return;
  askConfirm("确认发送检验委托？", async () => {
    try {
      await testJobApi.sendTestJobJiaJi(row.id, list);
      toast("发送成功", 2000, "success");
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    }
  });
}

/* 原 btnCancelSend_Click */
function onCancelSend() {
  const row = selectedJob.value;
  if (!row) return;
  if (row.cStatus !== TestJobStatus.Sent) {
    toast("委托已发送，不需要重新发送", 2000, "warn");
    return;
  }
  askConfirm("确认撤销发送检验委托？", async () => {
    try {
      await testJobApi.cancelSendTestJob(row.id);
      toast("撤销成功", 2000, "success");
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    }
  });
}

/* 原 btnAddItem_Click：状态校验 → FrmQL3002（占位）→ 查重 → push */
function onAddItem() {
  const row = selectedJob.value;
  if (!row) return;
  if (!notSendGuardMsg(row)) return;
  toast("新增项目：选择试验项目弹窗（FrmQL3002）待接入", 2000, "warn");
}

/* 原 btnDeleteItem_Click：状态校验 → 确认 → 删选中取样行 */
function onDeleteItem() {
  const row = selectedJob.value;
  if (!row) return;
  if (!notSendGuardMsg(row)) return;
  const nodes = sampleGridApi.value?.getSelectedNodes() ?? [];
  const target = (nodes[0]?.data as SampleRequires | undefined) ?? null;
  if (!target) return;
  askConfirm(`确认删除${target.cTestItemName ?? ""}？`, async () => {
    sampleRows.value = sampleRows.value.filter((r) => r !== target);
    sampleGridApi.value?.deselectAll();
    detailRows.value = [];
  });
}

/* 原 btnAdd_Click_1：FrmQL3001（占位）→ addTestJob → 重查 */
function onAddJob() {
  toast("新建委托：录入弹窗（FrmQL3001）待接入", 2000, "warn");
}

function onJobGridReady(e: GridReadyEvent) {
  jobGridApi.value = e.api;
}
function onSampleGridReady(e: GridReadyEvent) {
  sampleGridApi.value = e.api;
}
function onDetailGridReady(e: GridReadyEvent) {
  detailGridApi.value = e.api;
  void e;
}

onMounted(() => {
  void loadLines();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 dataLayoutControl1，10 项 → grid-cols-6 两行；委托时间 col-span-2） -->
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
          <label class="w-16 shrink-0 text-xs text-muted-foreground">委托单状态</label>
          <Select v-model="input.cStatus" :options="statusOptions" option-label="label" option-value="value"
            show-clear class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">复验标记</label>
          <Select v-model="input.cRecheckFlag" :options="recheckOptions" option-label="label" option-value="value"
            show-clear class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
          <InputText v-model="input.cBatch" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">委托时间</label>
          <DatePicker v-model="input.dates" selectionMode="range" :manualInput="false" date-format="yy-mm-dd"
            show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- stackPanel1：查询 / 新建委托 / 撤销发送 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAddJob">
        <IconFilePlus class="h-3 w-3" />新建委托
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCancelSend">
        <IconArrowBackUp class="h-3 w-3" />撤销发送
      </Button>
    </div>

    <!-- 上下分栏（原 splitContainerControl1 SplitterPosition 218/475≈46%） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="46" :minSize="20" class="flex flex-col overflow-hidden">
        <!-- 委托单信息（UCTestJob ViewCaption） -->
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">委托单信息</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="jobColDefs" :row-data="jobRows"
            :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
            :pagination="false" :animate-rows="false" :loading="querying" :get-row-class="jobRowClass"
            @grid-ready="onJobGridReady" @selection-changed="onJobSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <SplitterPanel :minSize="25" class="flex min-h-0 flex-col overflow-hidden">
        <!-- stackPanel2：子表操作按钮 -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :disabled="loadingChildren" @click="onAddItem">
            <IconPlus class="h-3 w-3" />新增项目
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :disabled="loadingChildren" @click="onSave">
            <IconDeviceFloppy class="h-3 w-3" />保存
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :disabled="loadingChildren" @click="onSaveAndSend">
            <IconSend class="h-3 w-3" />保存并发送
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :disabled="loadingChildren" @click="onSendJiaJi">
            <IconBolt class="h-3 w-3" />保存发送（加急）
          </Button>
          <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" :disabled="loadingChildren"
            @click="onDeleteItem">
            <IconTrash class="h-3 w-3" />删除项目
          </Button>
        </div>

        <!-- 左右分栏（原 splitContainerControl3 SplitterPosition 877/1121≈78%） -->
        <Splitter class="min-h-0 flex-1">
          <SplitterPanel :size="78" :minSize="30" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">试验项目/取样信息</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="sampleColDefs" :row-data="sampleRows"
                :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
                :pagination="false" :animate-rows="false" :loading="loadingChildren"
                @grid-ready="onSampleGridReady" @selection-changed="onSampleSelectionChanged"
                @first-data-rendered="autoSizeOnFirstData" />
            </div>
          </SplitterPanel>
          <SplitterPanel :minSize="15" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">试验子项明细</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="detailColDefs" :row-data="detailRows"
                :pagination="false" :animate-rows="false"
                @grid-ready="onDetailGridReady" @first-data-rendered="autoSizeOnFirstData" />
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
    </Splitter>

    <!-- 确认（对应原 MsgBox.ShowYesNo） -->
    <Dialog :visible="confirmOpen" modal header="确认" :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event">
      <p class="text-xs">{{ confirmMsg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" variant="outlined" @click="onConfirmOk" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
/* 原 UCTestJob.RowCellStyle / UCSampleRequires.RowCellStyle / colNSampleNumRnd.AppearanceCell */
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
:deep(.nsample-rnd) {
  background-color: rgba(0, 255, 255, 0.247) !important;
}
</style>
