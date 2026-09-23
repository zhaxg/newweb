<script setup lang="ts">
/** 对应 FrmQL3100（检验委托接收 / 窗体标题「炼钢检验委托接收」）：DDH.Winforms.LIMS.Forms.FrmQL3100
 *  布局：查询条件区（DataLayout 8 项 + 委托时间，无状态筛选——原 CStatus 下拉已注释）
 *       + stackPanel1（查询/登记/取消登记/拒收/打印）
 *       → 上下 Splitter（委托单信息 UCTestJob 多选，原 SplitterPosition 270/516≈52%）
 *       → stackPanel2（新增项目/删除项目/标为未打印/修改取样位置）
 *       → 试验项目/取样信息 UCSampleRequires（AllowEdit=false 只读）
 *  已接入：qL3100Api.queryTestJob / testJobApi.querySampleRequires、receive、
 *         batchCancelReceive、batchReject、deleteSampleRequires、reversePrint /
 *         tPa1000Api.queryLines（产线下拉）
 *  默认过滤：Statuses=[已发送未接收, 已接收, 已拒收]、委托时间近1月～明天（原构造函数）
 *  待接入：新增项目 → FrmQL3002；修改取样位置 → FrmSamplePosition；
 *         打印 → FrmQL3101（queryTestStds 仅打印用，未调）
 *  已知偏差：行多选用 AG Grid row-selection 取代 Selected 字段勾选（Selected 列 hide 保留）；
 *         代码类列显示原始代码（UserFormatter 未迁）；查询结果按 CStatus↑/DSendTime↓ 客户端排序（原同） */
import { nextTick, onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Textarea from "primevue/textarea";
import {
  IconBan,
  IconCheck,
  IconDeviceFloppy,
  IconPlus,
  IconPrinter,
  IconSearch,
  IconTrash,
  IconX,
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
  qL3100Api,
  testJobApi,
  TestJobStatus,
  YesNo,
  type QueryTestJobInput,
  type SampleRequires,
  type TimeRange,
} from "@/api/mes4ddh/lims.swagger";
import { tPa1000Api, type Tpa1000 as LineRow } from "@/api/mes4ddh/shr.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/* swagger 枚举未收录 已拒收=25（C# TestJobStatus.Rejected） */
const Rejected = 25 as TestJobStatus;

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

/* ---------- 查询条件（原构造函数：近1月～明天；Statuses=Sent/Received/Rejected；无 CStatus 下拉） ---------- */
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
  cRecheckFlag: null as YesNo | null | "",
  cBatch: "",
  dates: defaultDates() as Date[] | null,
});

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
    createTime: toTimeRange(input.dates),
    // 原构造函数 Statuses = { Sent, Received, Rejected }，CompleteFlag = null
    statuses: [TestJobStatus.Sent, 20 as TestJobStatus, Rejected],
    completeFlag: null,
  };
}

/* ---------- 主表：委托单信息（UCTestJob，45 可见 + 16 隐藏，多选登记/拒收） ---------- */
const jobRows = shallowRef<any[]>([]);
const jobGridApi = ref<GridApi | null>(null);
const focusJob = ref<any | null>(null);
const querying = ref(false);
const loadingChild = ref(false);
let focusToken = 0;

const jobColDefs = ref<ColDef[]>([
  // Selected 字段列：原窗体用 SelectedRows 批量勾选；web 改 AG row-selection，此列 hide 保留
  { field: "selected", headerName: " ", width: 44, minWidth: 44, hide: true },
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
function jobRowClass(p: RowClassParams) {
  return Number((p.data as any)?.cJiaJi) === 1 ? "row-jiaji" : undefined;
}

/* ---------- 取样要求（UCSampleRequires，AllowEdit=false 只读，ShowSelect=false） ---------- */
const sampleRows = shallowRef<any[]>([]);
const sampleGridApi = ref<GridApi | null>(null);

const sampleColDefs = ref<ColDef[]>([
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

/* ---------- 查询（原 btnQuery_Click：API 后 CStatus↑、DSendTime↓） ---------- */
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
    const raw = ((await qL3100Api.queryTestJob(buildQuery())) ?? []) as any[];
    const rows = [...raw].sort((a, b) => {
      const s = Number(a.cStatus ?? 0) - Number(b.cStatus ?? 0);
      if (s !== 0) return s;
      return String(b.dSendTime ?? "").localeCompare(String(a.dSendTime ?? ""));
    });
    jobRows.value = rows;
    focusJob.value = null;
    sampleRows.value = [];
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

/* ---------- 主表选中 → 取样子表（原 FocusedRowObjectChanged，多选取最后聚焦行） ---------- */
async function onJobSelectionChanged(e: SelectionChangedEvent) {
  const nodes = e.api.getSelectedNodes();
  const row = (nodes[nodes.length - 1]?.data as any) ?? null;
  focusJob.value = row;
  const token = ++focusToken;
  if (!row) {
    sampleRows.value = [];
    return;
  }
  loadingChild.value = true;
  try {
    const list = await testJobApi.querySampleRequires(row.id, undefined);
    if (token !== focusToken) return;
    sampleRows.value = list ?? [];
    await waitForGridRows(sampleGridApi.value);
  } catch {
    /* 拦截层已 toast */
  } finally {
    if (token === focusToken) loadingChild.value = false;
  }
}

function selectedJobs(): any[] {
  const nodes = jobGridApi.value?.getSelectedNodes() ?? [];
  return nodes.map((n) => n.data).filter(Boolean);
}
function selectedSample(): SampleRequires | null {
  const nodes = sampleGridApi.value?.getSelectedNodes() ?? [];
  return (nodes[0]?.data as SampleRequires) ?? null;
}
function requireReceived(job: any | null): boolean {
  if (!job) return false;
  if (Number(job.cStatus) < 20) {
    toast("委托未接收，不允许操作", 2000, "warn");
    return false;
  }
  return true;
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

/* 拒收原因输入（原 FrmConfirmValueDialog.ShowDialog，通用弹窗按 Dialog 组件实现） */
const rejectOpen = ref(false);
const rejectReason = ref("");
let rejectAction: ((reason: string) => Promise<void>) | null = null;
function askReject(count: number, action: (reason: string) => Promise<void>) {
  rejectReason.value = "";
  rejectAction = action;
  rejectOpen.value = true;
  void count;
}
async function onRejectOk() {
  rejectOpen.value = false;
  const act = rejectAction;
  rejectAction = null;
  if (act) await act(rejectReason.value);
}

/* 原 btnReceive_Click：选中且状态∈{Sent,Rejected} →「是否确认接收？」→ receive → 重查 */
function onReceive() {
  const selected = selectedJobs();
  if (!selected.length) return;
  const eligible = selected.filter(
    (x) => Number(x.cStatus) === TestJobStatus.Sent || Number(x.cStatus) === Rejected,
  );
  if (!eligible.length) {
    toast("委托不是已发送未接收或已拒收状态，不能接收", 2000, "warn");
    return;
  }
  askConfirm("是否确认接收？", async () => {
    try {
      await testJobApi.receive(eligible.map((x) => x.id));
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    }
  });
}

/* 原 btnCancelReceive_Click */
function onCancelReceive() {
  const selected = selectedJobs();
  if (!selected.length) return;
  const eligible = selected.filter((x) => Number(x.cStatus) === 20);
  if (!eligible.length) {
    toast("所选委托不是已接收状态，不能取消接收", 2000, "warn");
    return;
  }
  askConfirm(
    `是否确认取消接收选中的 ${eligible.length} 条委托？\n注意：\n委托单取消接收后，重新发送或者冶金规范检验项目更新会清空已录入的检验结果。`,
    async () => {
      try {
        await testJobApi.batchCancelReceive(eligible.map((x) => x.id));
        await onQuery();
      } catch {
        /* 拦截层已 toast */
      }
    },
  );
}

/* 原 btnReject_Click：状态=Sent → 输入拒收原因 → batchReject → 重查 */
function onReject() {
  const selected = selectedJobs();
  if (!selected.length) return;
  const eligible = selected.filter((x) => Number(x.cStatus) === TestJobStatus.Sent);
  if (!eligible.length) {
    toast("所选委托不是已发送未接收状态，不能拒收", 2000, "warn");
    return;
  }
  askReject(eligible.length, async (reason) => {
    try {
      await testJobApi.batchReject(eligible.map((x) => x.id), reason);
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    }
  });
}

/* 原 btnAddItem_Click：状态≥Received → FrmQL3002（占位） */
function onAddItem() {
  const job = focusJob.value;
  if (!job) return;
  if (!requireReceived(job)) return;
  toast("新增项目：选择试验项目弹窗（FrmQL3002）待接入", 2000, "warn");
}

/* 原 btnDeleteItem_Click：状态≥Received → 确认 → deleteSampleRequires → 刷子表 */
function onDeleteItem() {
  const job = focusJob.value;
  if (!job) return;
  const target = selectedSample();
  if (!target) return;
  if (!requireReceived(job)) return;
  askConfirm(
    `确认删除${target.cTestItemName ?? ""}？\n将同时删除试样和检验结果，数据删除后无法恢复!`,
    async () => {
      try {
        await testJobApi.deleteSampleRequires(target.id ?? undefined);
        const list = await testJobApi.querySampleRequires(job.id, undefined);
        sampleRows.value = list ?? [];
      } catch {
        /* 拦截层已 toast */
      }
    },
  );
}

/* 原 btnReversePrint_Click */
function onReversePrint() {
  const target = selectedSample();
  if (!target) return;
  askConfirm(`确认作废打印[${target.cTestItemName ?? ""}]?`, async () => {
    try {
      await testJobApi.reversePrint(target.id ?? undefined);
      toast("操作成功", 2000, "success");
    } catch {
      /* 拦截层已 toast */
    }
  });
}

/* 原 btnChangeSamplePosition_Click：FrmSamplePosition（占位） */
function onChangeSamplePosition() {
  const job = focusJob.value;
  if (!job) return;
  if (!requireReceived(job)) return;
  if (!sampleRows.value.length) {
    toast("没有检验项目，不允许操作", 2000, "warn");
    return;
  }
  toast("修改取样位置：取样位置弹窗（FrmSamplePosition）待接入", 2000, "warn");
}

/* 原 btnPrint_Click：FrmQL3101（占位，打印） */
function onPrint() {
  const job = focusJob.value;
  if (!job) return;
  if (!requireReceived(job)) return;
  toast("打印：委托单打印窗（FrmQL3101）待接入", 2000, "warn");
}

function onJobGridReady(e: GridReadyEvent) {
  jobGridApi.value = e.api;
}
function onSampleGridReady(e: GridReadyEvent) {
  sampleGridApi.value = e.api;
}

onMounted(() => {
  void loadLines();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 dataLayoutControl1：8 输入 + 委托时间；无状态筛选） -->
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

    <!-- stackPanel1：查询 / 登记 / 取消登记 / 拒收 / 打印（Controls.Add 原序） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onReceive">
        <IconCheck class="h-3 w-3" />登记
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCancelReceive">
        <IconX class="h-3 w-3" />取消登记
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onReject">
        <IconBan class="h-3 w-3" />拒收
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onPrint">
        <IconPrinter class="h-3 w-3" />打印
      </Button>
    </div>

    <!-- 上下分栏（原 splitContainerControl1 SplitterPosition 270/516≈52%） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="52" :minSize="20" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">委托单信息</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="jobColDefs" :row-data="jobRows"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :pagination="false" :animate-rows="false" :loading="querying" :get-row-class="jobRowClass"
            @grid-ready="onJobGridReady" @selection-changed="onJobSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <SplitterPanel :minSize="25" class="flex min-h-0 flex-col overflow-hidden">
        <!-- stackPanel2：新增项目 / 删除项目 / 标为未打印 / 修改取样位置 -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :disabled="loadingChild" @click="onAddItem">
            <IconPlus class="h-3 w-3" />新增项目
          </Button>
          <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" :disabled="loadingChild"
            @click="onDeleteItem">
            <IconTrash class="h-3 w-3" />删除项目
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :disabled="loadingChild" @click="onReversePrint">
            <IconPrinter class="h-3 w-3" />标为未打印
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :disabled="loadingChild"
            @click="onChangeSamplePosition">
            <IconDeviceFloppy class="h-3 w-3" />修改取样位置
          </Button>
        </div>

        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">试验项目/取样信息</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="sampleColDefs" :row-data="sampleRows"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false" :animate-rows="false" :loading="loadingChild"
            @grid-ready="onSampleGridReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>
    </Splitter>

    <!-- 确认（对应原 MsgBox.ShowYesNo） -->
    <Dialog :visible="confirmOpen" modal header="确认" :style="{ width: 'min(28rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event">
      <p class="text-xs whitespace-pre-line">{{ confirmMsg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" variant="outlined" @click="onConfirmOk" />
      </template>
    </Dialog>

    <!-- 拒收原因（对应原 FrmConfirmValueDialog） -->
    <Dialog :visible="rejectOpen" modal header="拒收" :style="{ width: 'min(28rem, calc(100vw - 2rem))' }"
      @update:visible="rejectOpen = $event">
      <div class="flex flex-col gap-2">
        <p class="text-xs">是否要拒收选中的委托</p>
        <label class="text-xs text-muted-foreground">拒收原因：</label>
        <Textarea v-model="rejectReason" rows="3" class="w-full" />
      </div>
      <template #footer>
        <Button label="取消" variant="outlined" @click="rejectOpen = false" />
        <Button label="确定" variant="outlined" @click="onRejectOk" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
/* 原 UCTestJob.RowCellStyle */
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
</style>
