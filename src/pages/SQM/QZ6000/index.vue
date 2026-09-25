<script setup lang="ts">
/** 对应 FrmQZ6000（库内材料质量处置）：DDH.Winforms.SQM.Forms.QualityDisposition.FrmQZ6000
 *  已接入：inventoryJudgeApi.queryInventory / complexDecide（取消综判）；焦点行试样 testJobApi.queryAllSamples；
 *        同步成分 stoveChemicalCompositionTestApi.syncStoveCf（原 SyncStoveCf）；产线下拉 tPa1000Api.queryLines
 *  待接入：处置弹窗 FrmQZ6001、综判弹窗 FrmQZ6002、熔炼成分 UCCfView.ShowData（UC 内无 Proxy，台账未列接口）；
 *        FrmConfirmValueDialog（取消原因，window.prompt 简替）
 *  菜单参数：4 菜单共享 cQueryString 段 LG01/LG02/ZG01（useMenuQuery.parts；QZ6000 空串回落三线）；
 *           单段 LG02（炼钢二厂）时隐藏批号列（原 colCBatchNo.Visible=false）
 *  结构：查询条件 DataLayout Dock=Top + 工具栏 stackPanel1 h-9 + 上下 Splitter（Panel1=grid SplitterPosition 220，Panel2=XtraTabControl 熔炼成分/性能）
 *  列：extract 84 可见 + 8 hide；Selected → 行选择勾选列；字段 camelCase
 *  偏差：查询条件 19 项在 grid-cols-6 下约 4 行（原单 DataLayout）；原 SetCodeFormatterAsync 字典翻译未迁 */

import { computed, reactive, ref } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import DatePicker from "primevue/datepicker";
import Select from "primevue/select";
import MultiSelect from "primevue/multiselect";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";
import { IconCheck, IconRefresh, IconSearch, IconSend, IconX } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import {
  inventoryJudgeApi,
  ComplexDecideResult,
  QMStatuEnum,
  SurFaceResultEnum,
  type QueryInventoryInput,
  type InventoryInfo,
  type TimeRange,
} from "@/api/mes4ddh/sqm.swagger";
import {
  testJobApi,
  stoveChemicalCompositionTestApi,
  TestJobJudgeResult,
  type TestSample,
  type AddStoveChemTestInput,
} from "@/api/mes4ddh/lims.swagger";
import { InventoryStatusEnum } from "@/api/mes4ddh/syd.swagger";
import { tPa1000Api, type Tpa1000 } from "@/api/mes4ddh/shr.swagger";
import BatchIdInput from "@/pages/Widgets/BatchIdInput/index.vue";
import { parseBatchIds } from "@/pages/Widgets/BatchIdInput/parse";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { parts: qsParts } = useMenuQuery();

/* ---------- 菜单参数（原 FrmQZ6000_Load：QueryString.Split(',') → LineFormatter(lines)） ---------- */
const lineCodes = (qsParts.length ? qsParts : ["LG01", "LG02", "ZG01"]).map((s) => s.trim()).filter(Boolean);
const hideBatchCol = lineCodes.length === 1 && lineCodes[0] === "LG02"; // LineConst.炼钢二厂

/* ---------- 产线（原 LineCodeImageComboBoxEdit：SetCodeFormatterAsync<LineFormatter>(lines)） ---------- */
const allLines = ref<Tpa1000[]>([]);
const lineNameMap = computed(() => new Map(allLines.value.map((l) => [String(l.cCode ?? ""), String(l.cName ?? "")])));
const lineOptions = computed(() =>
  allLines.value
    .filter((l) => lineCodes.includes(String(l.cCode ?? "")))
    .map((l) => ({ label: `${l.cCode}${l.cName ? "-" + l.cName : ""}`, value: String(l.cCode ?? "") })),
);
async function loadLines() {
  try {
    allLines.value = (await tPa1000Api.queryLines()) ?? [];
  } catch {
    /* 拦截层已 toast */
  }
}
loadLines();
const lineFmt = (p: ValueFormatterParams) => {
  if (p.value === null || p.value === undefined || p.value === "") return "";
  const code = String(p.value);
  return lineNameMap.value.get(code) || code;
};

/* ---------- 枚举下拉（原 ImageComboBoxEdit 候选照抄） ---------- */
const qmStatusOptions = [
  { label: "未封锁", value: QMStatuEnum.Normal },
  { label: "质量封锁", value: QMStatuEnum.Locked },
  { label: "已处置", value: QMStatuEnum.Handled },
];
const surfaceOptions = [
  { label: "待检", value: SurFaceResultEnum.None },
  { label: "合格", value: SurFaceResultEnum.Pass },
  { label: "不合格", value: SurFaceResultEnum.NoPass },
  { label: "让步放行", value: SurFaceResultEnum.LetPass },
];
const complexOptions = [
  { label: "待判", value: ComplexDecideResult.None },
  { label: "合格", value: ComplexDecideResult.Qualified },
  { label: "不合格", value: ComplexDecideResult.Unqualified },
  { label: "放行", value: ComplexDecideResult.ManualRelease },
  { label: "不需要综判", value: ComplexDecideResult.NotNeedJudge },
];
const statusOptions = [
  { label: "待入库", value: InventoryStatusEnum.NotIn },
  { label: "在库", value: InventoryStatusEnum.Normal },
  { label: "库存锁定", value: InventoryStatusEnum.Locked },
  { label: "投料生产", value: InventoryStatusEnum.ConsumeLocked },
  { label: "在途", value: InventoryStatusEnum.Ing },
  { label: "装车中", value: InventoryStatusEnum.ZC },
  { label: "已消耗", value: InventoryStatusEnum.Consume },
  { label: "已发货", value: InventoryStatusEnum.Out },
];

/* ---------- 时间（原构造：ProdTime=今天-7 ~ 今天+1；入库时间 UCTimeRange） ---------- */
function prodDefaultRange(): Date[] {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  a.setDate(a.getDate() - 7);
  const b = new Date();
  b.setHours(0, 0, 0, 0);
  b.setDate(b.getDate() + 1);
  return [a, b];
}
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2 || !dates[0] || !dates[1]) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}

/* ---------- 查询条件（原 queryInputBindingSource→QueryInventoryInput + MemoExEdit 批量项） ---------- */
const q = reactive({
  lineCode: lineCodes[0] ?? "",
  stoveNo: "",
  batchNo: "",
  orderNo: "",
  pieceNo: "",
  sgSign: "",
  sgStd: "",
  qmStatus: null as QMStatuEnum | null,
  surFaceResult: null as SurFaceResultEnum | null,
  cDetectResultCode: null as SurFaceResultEnum | null,
  complexDecideResult: null as ComplexDecideResult | null,
  lstStove: "",
  lstBatch: "",
  lstOrder: "",
  lstPieceNo: "",
  statuses: [InventoryStatusEnum.NotIn, InventoryStatusEnum.Normal] as InventoryStatusEnum[],
  testNo: "",
  prodDates: prodDefaultRange() as Date[] | null,
  inDates: null as Date[] | null,
});

/* ---------- 主表 ---------- */
const rows = ref<InventoryInfo[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

/* ---------- 底部页签（原 XtraTabControl：熔炼成分 UCCfView / 性能 UCTestResultViewer） ---------- */
const activeTab = ref("cf");
const samples = ref<TestSample[]>([]);
const focusedStove = ref("");
const sampleCols: ColDef[] = [
  { field: "cTestNo", headerName: "试验委托号", width: 125 },
  { field: "cSampleNo", headerName: "试样编号", width: 112 },
  { field: "cTestItemName", headerName: "试验项目", width: 125 },
  { field: "cTestItemTypeDesc", headerName: "项目类型", width: 112 },
  { field: "cJudgeResult", headerName: "判定结果", width: 99 },
  { field: "cJudgeRemark", headerName: "判定备注", width: 138 },
  { field: "cTestUser", headerName: "试验人", width: 99 },
  { field: "dTestTime", headerName: "试验时间", width: 138 },
  { field: "cShiftNo", headerName: "班次", width: 86 },
  { field: "cGroupNo", headerName: "班组", width: 86 },
  { field: "id", headerName: "主键", width: 86, hide: true },
];

/* ---------- 列（extract 84 可见 + 8 hide；Selected 由行选择承担；camelCase） ---------- */
const colDefs: ColDef[] = [
  { field: "cStove", headerName: "炉号", width: 86 },
  { field: "cPieceNo", headerName: "件次号", width: 99 },
  { field: "cBatchNo", headerName: "批号", width: 86, hide: hideBatchCol },
  { field: "cSgCode", headerName: "钢种", width: 86 },
  { field: "cSgStd", headerName: "执行标准", width: 112 },
  { field: "cSpec", headerName: "规格", width: 86 },
  { field: "cOrderNo", headerName: "订单号", width: 99 },
  { field: "nQmStatus", headerName: "质量状态", width: 112 },
  { field: "cQmHandleCode", headerName: "处置结果", width: 112 },
  { field: "cProRemark", headerName: "生产备注", width: 112 },
  { field: "cSpecialMarkGy", headerName: "性能要求", width: 112 },
  { field: "nQmLevel", headerName: "质量等级", width: 112 },
  { field: "testJobJudgeResult", headerName: "理化结果", width: 112, cellClass },
  { field: "cSurfaceResult", headerName: "表检结果", width: 112, cellClass },
  { field: "cDetectResultCode", headerName: "探伤判定结果", width: 138, cellClass },
  { field: "cComplexDecideCode", headerName: "综判结果", width: 112 },
  { field: "cSampleLotNo", headerName: "试批号", width: 99 },
  { field: "notJudgeReason", headerName: "待判原因", width: 112 },
  { field: "nLockReason", headerName: "质量封锁原因", width: 138 },
  { field: "cSurfaceDefectCode", headerName: "表面缺陷代码", width: 138 },
  { field: "cSurfaceDesc", headerName: "表检描述", width: 112 },
  { field: "cSurfaceUser", headerName: "表面判定人", width: 125 },
  { field: "dSurfaceTime", headerName: "表面判定时间", width: 138 },
  { field: "cComplexUser", headerName: "综判人", width: 99 },
  { field: "dComplexTime", headerName: "综判时间", width: 112 },
  { field: "cCutFlag", headerName: "切边方式", width: 112 },
  { field: "cLineCode", headerName: "产线", width: 86 },
  { field: "nThick", headerName: "厚度", width: 86 },
  { field: "nWth", headerName: "宽度", width: 86 },
  { field: "nLen", headerName: "长度", width: 86 },
  { field: "nNum", headerName: "支数", width: 86 },
  { field: "nCalWgt", headerName: "理重", width: 86 },
  { field: "nWgt", headerName: "实重", width: 86 },
  { field: "dProTime", headerName: "产出时间", width: 112 },
  { field: "cProUser", headerName: "产出人", width: 99 },
  { field: "cShiftNo", headerName: "产出班次", width: 112 },
  { field: "cGroupNo", headerName: "产出班组", width: 112 },
  { field: "dInTime", headerName: "入库时间", width: 112 },
  { field: "cInUser", headerName: "入库人", width: 99 },
  { field: "cStoreCode", headerName: "库区号", width: 99 },
  { field: "cStackNo", headerName: "垛位号", width: 99 },
  { field: "cStackNum", headerName: "层号", width: 86 },
  { field: "cSourceStoreCode", headerName: "原库区号", width: 112 },
  { field: "cSourceStackNo", headerName: "原垛位号", width: 112 },
  { field: "cSourceStackNum", headerName: "原层号", width: 99 },
  { field: "nStatus", headerName: "库存状态", width: 112 },
  { field: "cIsHot", headerName: "热送区分", width: 112 },
  { field: "nCastDivCode", headerName: "模连铸标识", width: 125 },
  { field: "cLockedLine", headerName: "占用产线", width: 112 },
  { field: "cLockedPlan", headerName: "占用计划", width: 112 },
  { field: "cMatType", headerName: "产品大类", width: 112 },
  { field: "cProdCode", headerName: "品名", width: 86 },
  { field: "cSteelType", headerName: "钢类", width: 86 },
  { field: "cDelivyStatusCode", headerName: "交货状态", width: 112 },
  { field: "cCustStdCode", headerName: "加工用途代码", width: 138 },
  { field: "cOrderNoLast", headerName: "原始订单号", width: 125 },
  { field: "cDestination", headerName: "去向", width: 86 },
  { field: "cHotNo", headerName: "退火炉回号", width: 125 },
  { field: "cSlabType", headerName: "坯类", width: 86 },
  { field: "cPieceNoSlab", headerName: "板坯号", width: 99 },
  { field: "cIsSurface", headerName: "是否表检", width: 112 },
  { field: "cDetectDefectLevel", headerName: "探伤等级", width: 112 },
  { field: "cDefectDefectCode", headerName: "探伤判定缺陷代码", width: 164 },
  { field: "cDefectDefectMark", headerName: "探伤判定缺陷描述", width: 164 },
  { field: "cDefectUser", headerName: "探伤判定人", width: 125 },
  { field: "dDefectTime", headerName: "探伤判定时间", width: 138 },
  { field: "cComplexDesc", headerName: "综判描述", width: 112 },
  { field: "cQmHandleDesc", headerName: "处置注释", width: 112 },
  { field: "cQmHandleUser", headerName: "处置人", width: 99 },
  { field: "dQmHandleTime", headerName: "处置时间", width: 112 },
  { field: "cSampleLotNoPre", headerName: "前检验委托单号", width: 151 },
  { field: "cInboundNo", headerName: "入库标识", width: 112 },
  { field: "cDelivyAddress", headerName: "流向", width: 86 },
  { field: "cWgtToler", headerName: "重量偏差等级", width: 138 },
  { field: "cBilletTypeCode", headerName: "铸坯标识", width: 112 },
  { field: "cCusName", headerName: "客户名称", width: 112 },
  { field: "cQxDl", headerName: "缺陷大类", width: 112 },
  { field: "cQxXl", headerName: "缺陷小类", width: 112 },
  { field: "testJobReceiveUser", headerName: "检验委托接收人", width: 151 },
  { field: "testJobReceiveTime", headerName: "检验委托接收时间", width: 164 },
  { field: "testUser", headerName: "检验人", width: 99 },
  { field: "testCompeteTime", headerName: "检验完成时间", width: 138 },
  { field: "isRecheck", headerName: "是否复检", width: 112 },
  { field: "id", headerName: "主键", width: 86, hide: true },
  { field: "cPrintCode", headerName: "喷号", width: 86, hide: true },
  { field: "cProc", headerName: "工序代码", width: 112, hide: true },
  { field: "cMachine", headerName: "机台号", width: 99, hide: true },
  { field: "cStrandNo", headerName: "流号", width: 86, hide: true },
  { field: "cPlanId", headerName: "计划号", width: 99, hide: true },
  { field: "cConNo", headerName: "合同号", width: 99, hide: true },
  { field: "cMatCode", headerName: "物料编码", width: 112, hide: true },
];

/* ---------- 行样式（原 GridView1_RowCellStyle：理化/表检/探伤 绿/红底） ---------- */
function okVal(v: unknown) {
  return (
    v === SurFaceResultEnum.Pass ||
    v === SurFaceResultEnum.LetPass ||
    v === ComplexDecideResult.Qualified ||
    v === ComplexDecideResult.ManualRelease ||
    v === TestJobJudgeResult.Qualified ||
    v === TestJobJudgeResult.ManualRelease
  );
}

function cellClass(p: { colDef?: { field?: string }; value: unknown; data?: InventoryInfo }) {
  const field = p.colDef?.field ?? "";
  if (field === "testJobJudgeResult") {
    return okVal(p.value) ? "bg-emerald-500/15" : "bg-red-500/15";
  }
  if (field === "cSurfaceResult") {
    return okVal(p.value) ? "bg-emerald-500/15" : "bg-red-500/15";
  }
  if (field === "cDetectResultCode") {
    const lvl = String(p.data?.cDetectDefectLevel ?? "");
    if (lvl && lvl !== "无") {
      return okVal(p.value) ? "bg-emerald-500/15" : "bg-red-500/15";
    }
  }
  return undefined;
}

/* ---------- 查询（原 btnQuery_Click → QueryInventory） ---------- */
async function onQuery() {
  querying.value = true;
  try {
    const input = {
      lineCode: q.lineCode,
      stoveNo: q.stoveNo.trim(),
      batchNo: q.batchNo.trim(),
      orderNo: q.orderNo.trim(),
      pieceNo: q.pieceNo.trim(),
      sgSign: q.sgSign.trim(),
      sgStd: q.sgStd.trim(),
      qmStatus: q.qmStatus ?? undefined,
      surFaceResult: q.surFaceResult ?? undefined,
      cDetectResultCode: q.cDetectResultCode ?? undefined,
      complexDecideResult: q.complexDecideResult ?? undefined,
      inTime: toTimeRange(q.inDates),
      prodTime: toTimeRange(q.prodDates),
      lstStove: parseBatchIds(q.lstStove),
      lstBatchNo: parseBatchIds(q.lstBatch),
      lstOrder: parseBatchIds(q.lstOrder),
      /* 以下三项 swagger QueryInventoryInput 未列，C# Input 有对应属性，对象传递不触发字面量检查 */
      lstPieceNo: parseBatchIds(q.lstPieceNo),
      statuses: [...q.statuses],
      testNo: q.testNo.trim(),
    };
    rows.value = (await inventoryJudgeApi.queryInventory(input as QueryInventoryInput)) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

function getSelectedRows(): InventoryInfo[] {
  return (gridApi.value?.getSelectedRows() ?? []) as InventoryInfo[];
}

/* ---------- 焦点行（原 GridView1_FocusedRowObjectChanged：试样 + 熔炼成分） ---------- */
async function onRowClicked(e: { data?: InventoryInfo }) {
  const info = e.data;
  if (!info) return;
  focusedStove.value = String(info.cStove ?? "");
  activeTab.value = "cf";
  // UCCfView.ShowData（成分）UC 内无 Proxy，台账未列 → 成分面板占位（见来源注释）
  samples.value = [];
  try {
    if (info.cSampleLotNo && String(info.cSampleLotNo).trim()) {
      samples.value = (await testJobApi.queryAllSamples(String(info.cSampleLotNo).trim())) ?? [];
    }
  } catch {
    /* 拦截层已 toast */
  }
}

/* ---------- 处置（原 btnDisposal_Click 校验照抄 + FrmQZ6001 占位） ---------- */
function onDisposal() {
  const selected = getSelectedRows();
  if (selected.length === 0) {
    toast("请先选择要处置的库存", 2000, "warn");
    return;
  }
  const proTypes = new Set(selected.map((x) => x.nProType));
  if (proTypes.size > 1) {
    toast("库存分类不同，不能同时处置", 2000, "warn");
    return;
  }
  if (selected.some((x) => x.nStatus !== InventoryStatusEnum.Normal && x.nStatus !== InventoryStatusEnum.NotIn)) {
    toast("非在库/待入库状态不能处置", 2000, "warn");
    return;
  }
  const lockedFlags = new Set(selected.map((x) => x.nQmStatus === QMStatuEnum.Locked));
  if (lockedFlags.size !== 1) {
    toast("质量封锁与未封锁的不能同时处置", 2000, "warn");
    return;
  }
  if (
    selected.some(
      (x) =>
        x.cComplexDecideCode !== ComplexDecideResult.None && x.cComplexDecideCode !== ComplexDecideResult.NotNeedJudge,
    )
  ) {
    toast("已综判，不允许处置，请先取消综判", 2000, "warn");
    return;
  }
  // 原 new FrmQZ6001(selected).ShowDialog()：二级弹窗待接入
  toast("处置弹窗（FrmQZ6001）待接入", 2000, "warn");
}

/* ---------- 综判（原 btnDecide_Click 校验照抄 + FrmQZ6002 占位；空选原代码静默 return） ---------- */
function onDecide() {
  const selected = getSelectedRows();
  if (selected.length === 0) {
    return; // 原 btnDecide_Click：空选静默 return
  }
  if (selected.some((x) => x.nStatus !== InventoryStatusEnum.Normal)) {
    toast("非在库状态不能综判", 2000, "warn");
    return;
  }
  if (selected.some((x) => x.cComplexDecideCode !== ComplexDecideResult.None)) {
    toast("已综判的不能再次综判", 2000, "warn");
    return;
  }
  if (selected.some((x) => x.nQmStatus === QMStatuEnum.Locked)) {
    toast("质量封锁状态不能综判", 2000, "warn");
    return;
  }
  if (selected.some((x) => String(x.cStoreCode ?? "").endsWith("6"))) {
    toast("精整原料不能综判", 2000, "warn");
    return;
  }
  // 原 new FrmQZ6002(selected).ShowDialog()：二级弹窗待接入
  toast("综判弹窗（FrmQZ6002）待接入", 2000, "warn");
}

/* ---------- 取消综判（原 btnCancelDecide_Click：FrmConfirmValueDialog 占位 → complexDecide） ---------- */
async function onCancelDecide() {
  const selected = getSelectedRows();
  if (selected.length === 0) {
    return; // 原 btnCancelDecide_Click：空选静默 return
  }
  // 原 FrmConfirmValueDialog.ShowDialog("取消原因", ...)：二级弹窗占位，window.prompt 简替
  const remark = window.prompt("取消原因", "");
  if (remark === null) {
    return;
  }
  const pieceNos = [...new Set(selected.map((x) => String(x.cPieceNo ?? "")).filter(Boolean))];
  try {
    await inventoryJudgeApi.complexDecide({
      pieceNos,
      complexDecideResult: ComplexDecideResult.None,
      remark,
    });
  } catch {
    return; /* 拦截层已 toast，失败不重载 */
  }
  toast("操作成功！", 2000, "success");
  await onQuery();
}

/* ---------- 同步成分（原 simpleButton1_Click：SyncStoveCf；确认文案照抄） ---------- */
async function onSyncComponent() {
  const selected = getSelectedRows();
  if (selected.length === 0) {
    toast("请先选择要同步成分的库存", 2000, "warn");
    return;
  }
  const byStove = new Map<string, InventoryInfo>();
  for (const x of selected) {
    const k = String(x.cStove ?? "");
    if (k && !byStove.has(k)) byStove.set(k, x);
  }
  const inputs: AddStoveChemTestInput[] = [...byStove.entries()].map(([, x]) => ({
    cStove: String(x.cStove ?? ""),
    cLineCode: String(x.cLineCode ?? ""),
    cSgSign: String(x.cSgCode ?? ""),
    cSgStd: String(x.cSgStd ?? ""),
    dProdTime: x.dProTime ?? undefined,
    cSpec: x.cSpec ?? undefined,
    nLen: x.nLen ?? undefined,
    nWth: x.nWth ?? undefined,
    nThick: x.nThick ?? undefined,
  }));
  if (!window.confirm(`即将同步${inputs.length}个炉号的成分，是否继续？`)) {
    return;
  }
  try {
    for (const item of inputs) {
      await stoveChemicalCompositionTestApi.syncStoveCf(item);
    }
    toast("操作成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件（原 dataLayoutControl1 Dock=Top，19 项 → grid-cols-6） -->
    <div class="shrink-0 border-b border-border/60 px-2 py-1.5">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产线</label>
          <Select
            v-model="q.lineCode"
            :options="lineOptions"
            option-label="label"
            option-value="value"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
          <InputText v-model="q.stoveNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">批次号</label>
          <InputText v-model="q.batchNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
          <InputText v-model="q.orderNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">件次号</label>
          <InputText v-model="q.pieceNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="q.sgSign" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
          <InputText v-model="q.sgStd" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">质量状态</label>
          <Select
            v-model="q.qmStatus"
            :options="qmStatusOptions"
            option-label="label"
            option-value="value"
            show-clear
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">表面状态</label>
          <Select
            v-model="q.surFaceResult"
            :options="surfaceOptions"
            option-label="label"
            option-value="value"
            show-clear
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">探伤状态</label>
          <Select
            v-model="q.cDetectResultCode"
            :options="surfaceOptions"
            option-label="label"
            option-value="value"
            show-clear
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">综判状态</label>
          <Select
            v-model="q.complexDecideResult"
            :options="complexOptions"
            option-label="label"
            option-value="value"
            show-clear
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">库存状态</label>
          <MultiSelect
            v-model="q.statuses"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            placeholder="全部"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">检验委托</label>
          <InputText v-model="q.testNo" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">生产时间</label>
          <DatePicker
            v-model="q.prodDates"
            selection-mode="range"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-icon
            class="min-w-0 flex-1"
          />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">入库时间</label>
          <DatePicker
            v-model="q.inDates"
            selection-mode="range"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-icon
            class="min-w-0 flex-1"
          />
        </div>
        <BatchIdInput v-model="q.lstStove" label="批量炉号" />
        <BatchIdInput v-model="q.lstBatch" label="批量批号" />
        <BatchIdInput v-model="q.lstOrder" label="批量订单号" />
        <BatchIdInput v-model="q.lstPieceNo" label="批量件次号" />
      </div>
    </div>

    <!-- 工具栏（原 stackPanel1 Dock=Top：查询/处置/综判/取消综判/同步成分） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onDisposal"> <IconSend class="h-3 w-3" />处置 </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onDecide"> <IconCheck class="h-3 w-3" />综判 </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onCancelDecide">
        <IconX class="h-3 w-3" />取消综判
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onSyncComponent">
        <IconRefresh class="h-3 w-3" />同步成分
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">库内材料质量处置（{{ rows.length }}）</span>
    </div>

    <!-- 上下分栏（原 splitContainerControl1 上下 SplitterPosition 220：上=库存网格，下=页签） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="30" :minSize="15" class="flex min-h-0 flex-col">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="colDefs"
            :row-data="rows"
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
            :loading="querying"
            @grid-ready="onGridReady"
            @row-clicked="onRowClicked"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :size="70" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
        <!-- 页签（原 XtraTabControl Dock=Fill：熔炼成分 / 性能） -->
        <Tabs v-model:value="activeTab" class="min-h-0 flex-1 flex-col">
          <div class="flex shrink-0 items-center border-b border-border/60">
            <TabList class="min-w-0 flex-1">
              <Tab value="cf">熔炼成分</Tab>
              <Tab value="perf">性能</Tab>
            </TabList>
            <span class="ml-auto mr-2 text-xs text-muted-foreground">{{
              focusedStove ? "炉号 " + focusedStove : ""
            }}</span>
          </div>
          <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
            <TabPanel value="cf" class="h-full overflow-auto">
              <div class="flex h-full items-center justify-center bg-muted/30">
                <p class="text-xs text-muted-foreground">
                  熔炼成分（UCCfView.ShowData）待接入{{ focusedStove ? " · " + focusedStove : "" }}
                </p>
              </div>
            </TabPanel>
            <TabPanel value="perf" class="h-full overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="sampleCols"
                :row-data="samples"
                :suppress-column-virtualisation="true"
                :pagination="false"
                :animate-rows="false"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
