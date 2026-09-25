<script setup lang="ts">
/** 对应 FrmMP3100（浇次计划跟踪查询）：DDH.Winforms.SMP.Forms.FrmMP3100
 *  页签：原 XtraTabControl 两页（浇次计划跟踪 / 浇次产出坯料跟踪）→ PrimeVue Tabs（独立内容页签）
 *  已接入：tmp2000Api.getTmp2005（页签1主表查询）/ getTmp2005Storages（主行聚焦联动下方「材料明细」，
 *          原 gridView1_FocusedRowChanged → ucStorage1.BindData）
 *          / getCptJc（页签2查询）
 *  布局：页签1 = 查询区 + h-9 查询 + 上下 Splitter（原 splitterControl1 Dock=Bottom，
 *        gridControl1 370 / ucStorage 497 ≈ 42:58）→ 上主表 QueryTmp2005Dto、下「材料明细」Tyd2000Dto
 *        页签2 = 查询区 + h-9 查询 + gridControl2 QueryCptJC
 *  查询条件：页签1 原 stackPanel1（计划号日期~、计划号、批量订单号、钢种、入库标识）；
 *            页签2 原 stackPanel2（产出时间、炉号、铸坯号、钢种、计划状态[原「坯料计划状态」，有计划=1|无计划=0]）；
 *  查询标签全页统一 w-16（原「坯料计划状态」6字=72px 装不下 w-16，按 ui-rules 阶梯顺位4 缩短为「计划状态」4字=48px）；
 *            CLineCode 取菜单 cQueryString（原 QueryString） */

import { ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { CellFocusedEvent, ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { useMenuQuery } from "@/lib/menuQuery";
import { tmp2000Api, type Tmp2005Dto, type QueryCptJC, type InputTmp2000Dto } from "@/api/mes4ddh/smp.swagger";
import type { Tyd2000Dto } from "@/api/mes4ddh/syd.swagger";
import BatchIdInput from "@/pages/Widgets/BatchIdInput/index.vue";
import { parseBatchIds } from "@/pages/Widgets/BatchIdInput/parse";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { raw: menuQs } = useMenuQuery(); // 原 QueryString（产线代码）

function monthStart(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function monthEnd(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function dayOffset(n: number): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/* 原 xtraTabControl1 两页签 */
const activeTab = ref("plan");

/* ---------- 页签1：浇次计划跟踪 ---------- */
// 查询条件（原 stackPanel1）
const q1 = ref<{ dates: Date[] | null; orders: string; planNo: string; cSgCode: string; cInboundNo: string }>({
  dates: [monthStart(), monthEnd()],
  orders: "",
  planNo: "",
  cSgCode: "",
  cInboundNo: "",
});
const rows1 = ref<Tmp2005Dto[]>([]);
const storageRows = ref<Tyd2000Dto[]>([]);
const querying1 = ref(false);
const api1 = ref<GridApi | null>(null);
const storageApi = ref<GridApi | null>(null);

/* 主表列（gridControl1 / gridView1，绑定实体 QueryTmp2005Dto；API 返回 Tmp2005Dto）：49 可见 + 2 hide */
const mainColDefs = ref<ColDef[]>([
  { field: "cCool", headerName: "是否冷坯计划", width: 150 },
  { field: "cPlanTime", headerName: "计划号", width: 150 },
  { field: "cOrderNo", headerName: "提料计划号", width: 150 },
  { field: "cOrderCustCname", headerName: "订货客户", width: 150 },
  { field: "cOrderNo1", headerName: "订单号1", width: 150 },
  { field: "cOrderNo2", headerName: "订单号2", width: 150 },
  { field: "cOrderNo3", headerName: "订单号3", width: 150 },
  { field: "cOrderNo4", headerName: "订单号4", width: 150 },
  { field: "cSgCode", headerName: "钢种", width: 150 },
  { field: "nNum", headerName: "订货件数", width: 150 },
  { field: "nWgt", headerName: "订单重量", width: 150 },
  { field: "nThick", headerName: "厚度", width: 150 },
  { field: "nWidth", headerName: "宽度", width: 150 },
  { field: "nWidthWgt", headerName: "边部宽度余量", width: 150 },
  { field: "nLen", headerName: "长度", width: 150 },
  { field: "cLengthType", headerName: "长度类型", width: 150 },
  { field: "nLenMin", headerName: "长度下限", width: 150 },
  { field: "nLenMax", headerName: "长度上限", width: 150 },
  { field: "cSpec", headerName: "规格", width: 150 },
  { field: "cTrimFlag", headerName: "切边方式", width: 150 },
  { field: "cTlSgCode", headerName: "炼钢钢种", width: 150 },
  { field: "nSlabThick", headerName: "钢坯厚度", width: 150 },
  { field: "nSlabWidth", headerName: "钢坯宽度", width: 150 },
  { field: "nSlabLenMin", headerName: "钢坯长度最小值", width: 150 },
  { field: "nSlabLenMax", headerName: "钢坯长度最大值", width: 150 },
  { field: "nSlabQua", headerName: "计划钢坯支数", width: 150 },
  { field: "nStorageNum", headerName: "已挂坯支数", width: 150 },
  { field: "nZzNum", headerName: "轧制实绩", width: 150 },
  { field: "nQZzNum", headerName: "欠轧支数", width: 150 },
  { field: "nZzWgt", headerName: "轧制重量", width: 150 },
  { field: "nThickPlan", headerName: "生产板厚", width: 150 },
  { field: "nWidthPlan", headerName: "生产板宽", width: 150 },
  { field: "nLenPlan", headerName: "生产板长", width: 150 },
  { field: "nDbc", headerName: "单倍尺", width: 150 },
  { field: "nPlanedBoardNum", headerName: "排产子板数", width: 150 },
  { field: "nPlanedWgt", headerName: "排产净重", width: 150 },
  { field: "nLenPlan1", headerName: "套切长度1", width: 150 },
  { field: "nLenPlan2", headerName: "套切长度2", width: 150 },
  { field: "nLenPlan3", headerName: "套切长度3", width: 150 },
  { field: "nLenPlan4", headerName: "套切长度4", width: 150 },
  { field: "nPlanBoarLen", headerName: "计划母板长", width: 150 },
  { field: "cDelivyStatusCode", headerName: "交货状态", width: 150 },
  { field: "cSpecialMarkGy", headerName: "性能要求", width: 150 },
  { field: "cDelivyQtyFlag", headerName: "计重方式", width: 150 },
  { field: "cFlawDesc", headerName: "探伤等级", width: 150 },
  { field: "cDelivyAddress", headerName: "流向", width: 150 },
  { field: "cTol", headerName: "公差", width: 150 },
  { field: "cOverstepBl", headerName: "短溢装比例", width: 150 },
  { field: "cInboundNo", headerName: "入库标识", width: 150 },
  { field: "nSlabWgt", headerName: "坯料重量", width: 150, hide: true },
  { field: "nStorageWgt", headerName: "已挂坯重量", width: 150, hide: true },
]);
/* 材料明细列（ucStorage1 / UCStorage gridView1，绑定实体 Tyd2000Dto）：127 可见 + 1 hide */
const rawStorageCols: ColDef[] = [
  { field: "selected", headerName: "选择", width: 149, hide: true },
  { field: "id", headerName: "主键", width: 149 },
  { field: "cStove", headerName: "炉号", width: 149 },
  { field: "cPieceNo", headerName: "件次号", width: 149 },
  { field: "nProType", headerName: "库存分类", width: 149 },
  { field: "cPrintCode", headerName: "喷号", width: 149 },
  { field: "cLineCode", headerName: "产线", width: 149 },
  { field: "cProc", headerName: "工序代码", width: 149 },
  { field: "cMachine", headerName: "机台号", width: 149 },
  { field: "cStrandNo", headerName: "流号", width: 149 },
  { field: "cPlanId", headerName: "计划号", width: 149 },
  { field: "cConNo", headerName: "合同号", width: 149 },
  { field: "cOrderNo", headerName: "订单号", width: 149 },
  { field: "cMatCode", headerName: "物料编码", width: 149 },
  { field: "cSgCode", headerName: "钢种", width: 149 },
  { field: "cSgStd", headerName: "执行标准", width: 149 },
  { field: "nThick", headerName: "厚度", width: 149 },
  { field: "nWth", headerName: "宽度", width: 149 },
  { field: "nLen", headerName: "长度", width: 149 },
  { field: "cSpec", headerName: "规格", width: 149 },
  { field: "nNum", headerName: "支数", width: 149 },
  { field: "nCalWgt", headerName: "理重", width: 149 },
  { field: "nWgt", headerName: "实重", width: 149 },
  { field: "dProTime", headerName: "产出时间", width: 149 },
  { field: "cProUser", headerName: "产出人", width: 149 },
  { field: "cShiftNo", headerName: "产出班次", width: 149 },
  { field: "cGroupNo", headerName: "产出班组", width: 149 },
  { field: "dInTime", headerName: "入库时间", width: 149 },
  { field: "cInUser", headerName: "入库人", width: 149 },
  { field: "cStoreCode", headerName: "库区号", width: 149 },
  { field: "cArer", headerName: "区域", width: 149 },
  { field: "cStackNo", headerName: "垛位号", width: 149 },
  { field: "nStackNum", headerName: "层号", width: 150 },
  { field: "cSourceStoreCode", headerName: "原库区号", width: 149 },
  { field: "cSourceStackNo", headerName: "原垛位号", width: 149 },
  { field: "cSourceStackNum", headerName: "原层号", width: 149 },
  { field: "nStatus", headerName: "库存状态", width: 149 },
  { field: "cIsHot", headerName: "热送区分", width: 149 },
  { field: "cProRemark", headerName: "生产备注", width: 149 },
  { field: "nCastDivCode", headerName: "模连铸标识", width: 149 },
  { field: "cLockedLine", headerName: "占用产线", width: 149 },
  { field: "cLockedPlan", headerName: "占用计划", width: 149 },
  { field: "cMatType", headerName: "产品大类", width: 149 },
  { field: "cProdCode", headerName: "品名", width: 149 },
  { field: "cSteelType", headerName: "钢类", width: 149 },
  { field: "cDelivyStatusCode", headerName: "交货状态", width: 149 },
  { field: "cCustStdCode", headerName: "加工用途代码", width: 149 },
  { field: "cBatchNo", headerName: "批号", width: 149 },
  { field: "cOrderNoLast", headerName: "原始订单号", width: 149 },
  { field: "cDestination", headerName: "去向", width: 149 },
  { field: "cHotNo", headerName: "退火炉回号", width: 149 },
  { field: "cSlabType", headerName: "坯类", width: 149 },
  { field: "cPieceNoSlab", headerName: "板坯号", width: 149 },
  { field: "nQmStatus", headerName: "质量状态", width: 149 },
  { field: "nLockReason", headerName: "质量封锁原因", width: 149 },
  { field: "nQmLevel", headerName: "质量等级", width: 149 },
  { field: "cIsSurface", headerName: "是否表检", width: 149 },
  { field: "cSurfaceResult", headerName: "表检结果", width: 149 },
  { field: "cSurfaceDefectCode", headerName: "表面缺陷代码", width: 149 },
  { field: "cSurfaceDesc", headerName: "表检描述", width: 149 },
  { field: "cSurfaceUser", headerName: "表面判定人", width: 149 },
  { field: "dSurfaceTime", headerName: "表面判定时间", width: 149 },
  { field: "cDetectResultCode", headerName: "探伤判定结果", width: 149 },
  { field: "cDetectDefectLevel", headerName: "探伤等级", width: 149 },
  { field: "cDefectDefectCode", headerName: "探伤判定缺陷代码", width: 149 },
  { field: "cDefectDefectMark", headerName: "探伤判定缺陷描述", width: 149 },
  { field: "cDefectUser", headerName: "表面判定人", width: 149 },
  { field: "dDefectTime", headerName: "表面判定时间", width: 149 },
  { field: "cComplexDecideCode", headerName: "综判结果", width: 149 },
  { field: "cComplexDesc", headerName: "综判描述", width: 149 },
  { field: "cComplexUser", headerName: "综判人", width: 149 },
  { field: "dComplexTime", headerName: "综判时间", width: 149 },
  { field: "cQmHandleCode", headerName: "处置结果", width: 149 },
  { field: "cQmHandleDesc", headerName: "处置注释", width: 149 },
  { field: "cQmHandleUser", headerName: "处置人", width: 149 },
  { field: "dQmHandleTime", headerName: "处置时间", width: 149 },
  { field: "cSampleLotNo", headerName: "试批号", width: 149 },
  { field: "cSampleLotNoPre", headerName: "前试批号", width: 149 },
  { field: "cCutFlag", headerName: "切边方式", width: 149 },
  { field: "cInboundNo", headerName: "入库标识", width: 149 },
  { field: "cDelivyAddress", headerName: "流向", width: 149 },
  { field: "cWgtToler", headerName: "公差等级", width: 149 },
  { field: "cBilletTypeCode", headerName: "铸坯标识", width: 149 },
  { field: "cCusName", headerName: "客户名称", width: 149 },
  { field: "pLAN_CSpec", headerName: "剪切计划规格", width: 149 },
  { field: "pLAN_NThickPlan", headerName: "轧制厚", width: 149 },
  { field: "pLAN_NWidthPlan", headerName: "轧制宽", width: 149 },
  { field: "pLAN_NLlCleanLen", headerName: "轧制长", width: 149 },
  { field: "pLAN_COrderNo1", headerName: "订单号1", width: 149 },
  { field: "pLAN_COrderNo2", headerName: "订单号2", width: 149 },
  { field: "pLAN_COrderNo3", headerName: "订单号3", width: 149 },
  { field: "pLAN_COrderNo4", headerName: "订单号4", width: 149 },
  { field: "pLAN_COrderNo5", headerName: "订单号5", width: 149 },
  { field: "pLAN_COrderNo6", headerName: "订单号6", width: 149 },
  { field: "pLAN_NLenPlan1", headerName: "套切长度1", width: 149 },
  { field: "pLAN_NLenPlan2", headerName: "套切长度2", width: 149 },
  { field: "pLAN_NLenPlan3", headerName: "套切长度3", width: 149 },
  { field: "pLAN_NLenPlan4", headerName: "套切长度4", width: 149 },
  { field: "pLAN_NLenPlan5", headerName: "套切长度5", width: 149 },
  { field: "pLAN_NLenPlan6", headerName: "套切长度6", width: 149 },
  { field: "nKSgCode", headerName: "国标钢种", width: 149 },
  { field: "cPlanTime", headerName: "计划日期", width: 149 },
  { field: "cTol", headerName: "公差", width: 149 },
  { field: "typeValues", headerName: "钢板分类", width: 73 },
  { field: "cAutoJudgeResult", headerName: "委托自动判定结果", width: 149 },
  { field: "cJudgeRemark", headerName: "委托判定备注", width: 149 },
  { field: "cJudgeResult", headerName: "委托最终判定结果", width: 149 },
  { field: "cJudgeUser", headerName: "委托判定人", width: 149 },
  { field: "cRecheckFlag", headerName: "复验标记", width: 149 },
  { field: "cStatus", headerName: "委托单状态", width: 149 },
  { field: "dJudgeTime", headerName: "委托判定时间", width: 149 },
  { field: "cTlSgCode", headerName: "炼钢钢种", width: 149 },
  { field: "cOutUser", headerName: "出库人", width: 100 },
  { field: "dOutTime", headerName: "出库时间", width: 100 },
  { field: "cInboundNo1", headerName: "入库标识1", width: 150 },
  { field: "cInboundNo2", headerName: "入库标识2", width: 150 },
  { field: "cInboundNo3", headerName: "入库标识3", width: 150 },
  { field: "cInboundNo4", headerName: "入库标识4", width: 150 },
  { field: "cInboundNo5", headerName: "入库标识5", width: 150 },
  { field: "cInboundNo6", headerName: "入库标识6", width: 150 },
  { field: "cOrderCustCname", headerName: "订货客户中文名称", width: 150 },
  { field: "cSpecialMarkGy", headerName: "工艺/性能要求", width: 150 },
  { field: "nDbc", headerName: "倍尺", width: 150 },
  { field: "lastModifier", headerName: "最后修改人", width: 150 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 150 },
  { field: "cIsMatchOrder", headerName: "是否满足订单要求", width: 150 },
  { field: "nTransferNo", headerName: "吊号", width: 150 },
  { field: "cStackNum", headerName: "层号", width: 149, hide: true },
];
/** ucStorage1.Selected（选择）列 = 原勾选列：改 hide 保留在列面板，勾选由 row-selection 呈现（ui-rules §7） */
const storageColDefs = ref<ColDef[]>(rawStorageCols);

/* ---------- 页签2：浇次产出坯料跟踪 ---------- */
// 查询条件（原 stackPanel2）
const q2 = ref<{
  dates: Date[] | null;
  cStove: string;
  cPieceNo: string;
  cSgCode: string;
  planStatus: number | null;
}>({
  dates: [dayOffset(-1), new Date(dayOffset(1).setHours(23, 59, 59))],
  cStove: "",
  cPieceNo: "",
  cSgCode: "",
  planStatus: null,
});
/** 原 cmbPlanStatus ImageComboBox：下拉[有计划=1 | 无计划=0] */
const planStatusOptions = [
  { label: "有计划", value: 1 },
  { label: "无计划", value: 0 },
];
const rows2 = ref<QueryCptJC[]>([]);
const querying2 = ref(false);
const api2 = ref<GridApi | null>(null);

/* 页签2列（gridControl2 / gridView2，绑定实体 QueryCptJC）：20 可见 */
const cptColDefs = ref<ColDef[]>([
  { field: "dProTime", headerName: "产出时间", width: 150 },
  { field: "cPlanNo", headerName: "计划号", width: 150 },
  { field: "cCool", headerName: "是否冷坯计划", width: 150 },
  { field: "cOrderNo", headerName: "提料计划号", width: 150 },
  { field: "cStove", headerName: "炉号", width: 150 },
  { field: "cPieceNo", headerName: "铸坯号", width: 150 },
  { field: "cSgCode", headerName: "钢种", width: 150 },
  { field: "nThick", headerName: "厚度", width: 150 },
  { field: "nWth", headerName: "宽度", width: 150 },
  { field: "nLen", headerName: "长度", width: 150 },
  { field: "cSpec", headerName: "规格", width: 150 },
  { field: "nNum", headerName: "支数", width: 150 },
  { field: "nCalWgt", headerName: "理重", width: 150 },
  { field: "cStackNo", headerName: "垛位号", width: 150 },
  { field: "cStackNum", headerName: "层号", width: 150 },
  { field: "nQmStatus", headerName: "质量状态", width: 150 },
  { field: "nLockReason", headerName: "质量封锁原因", width: 150 },
  { field: "cPrintCode", headerName: "喷号", width: 150 },
  { field: "nStatus", headerName: "库存状态", width: 150 },
  { field: "cProRemark", headerName: "生产备注", width: 150 },
]);

function onReady1(e: GridReadyEvent) {
  api1.value = e.api;
}
function onStorageReady(e: GridReadyEvent) {
  storageApi.value = e.api;
}
function onReady2(e: GridReadyEvent) {
  api2.value = e.api;
}

function autosizeAll() {
  requestAnimationFrame(() => {
    api1.value?.autoSizeAllColumns();
    storageApi.value?.autoSizeAllColumns();
    api2.value?.autoSizeAllColumns();
  });
}

/** 原 comOrder.EditValue 按 \r\n 拆分 */
function splitOrders(s: string): string[] | undefined {
  const list = parseBatchIds(s);
  return list.length ? list : undefined;
}

/* ---------- 页签1：原 BindData → GetTmp2005 ---------- */
async function onQuery1() {
  querying1.value = true;
  try {
    const input: InputTmp2000Dto & { cInboundNo?: string | null; cPlanNo?: string | null } = {
      dBegin: q1.value.dates?.[0]?.toISOString() ?? null,
      dEnd: q1.value.dates?.[1]?.toISOString() ?? null,
      cSgCode: q1.value.cSgCode,
      cInboundNo: q1.value.cInboundNo,
      cPlanNo: q1.value.planNo,
      cLineCode: menuQs,
      cOrderNoLst: splitOrders(q1.value.orders),
    };
    rows1.value = (await tmp2000Api.getTmp2005(input)) ?? [];
    storageRows.value = [];
    autosizeAll();
    if (!rows1.value.length) toast("无符合条件的数据", 2000, "info");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying1.value = false;
  }
}

/** 原 gridView1_FocusedRowChanged → LoadStorage(COrderNo) → getTmp2005Storages */
async function onCellFocused(e: CellFocusedEvent) {
  if (e.rowIndex == null) return;
  const row = api1.value?.getDisplayedRowAtIndex(e.rowIndex)?.data as Tmp2005Dto | undefined;
  if (!row) return;
  if (!row.cOrderNo) {
    storageRows.value = [];
    return;
  }
  try {
    storageRows.value = (await tmp2000Api.getTmp2005Storages({ cOrderNo: row.cOrderNo })) ?? [];
    requestAnimationFrame(() => storageApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  }
}

/* ---------- 页签2：原 BindData2 → GetCptJc ---------- */
async function onQuery2() {
  querying2.value = true;
  try {
    const input: InputTmp2000Dto & {
      cStove?: string | null;
      cPieceNo?: string | null;
      nPlanStatus?: number | null;
    } = {
      dBegin: q2.value.dates?.[0]?.toISOString() ?? null,
      dEnd: q2.value.dates?.[1]?.toISOString() ?? null,
      cSgCode: q2.value.cSgCode,
      cStove: q2.value.cStove,
      cPieceNo: q2.value.cPieceNo,
      nPlanStatus: q2.value.planStatus,
      cLineCode: menuQs,
    };
    rows2.value = (await tmp2000Api.getCptJc(input)) ?? [];
    requestAnimationFrame(() => api2.value?.autoSizeAllColumns());
    if (!rows2.value.length) toast("无符合条件的数据", 2000, "info");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying2.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 原 xtraTabControl1：页签「浇次计划跟踪」/「浇次产出坯料跟踪」 -->
    <Tabs v-model:value="activeTab" class="flex min-h-0 flex-1 flex-col">
      <div class="flex shrink-0 items-center border-b border-border/60 px-2">
        <TabList class="min-w-0 flex-1">
          <Tab value="plan">浇次计划跟踪</Tab>
          <Tab value="cpt">浇次产出坯料跟踪</Tab>
        </TabList>
      </div>
      <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
        <!-- ===== 页签1：浇次计划跟踪（原 xtraTabPage1） ===== -->
        <TabPanel value="plan" class="flex h-full min-h-0 flex-col overflow-hidden">
          <!-- 查询条件区（原 stackPanel1：计划号日期~、计划号、批量订单号、钢种、入库标识） -->
          <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
            <div class="col-span-2 flex min-w-0 items-center gap-1.5">
              <label class="w-16 shrink-0 text-xs text-muted-foreground">计划号</label>
              <DatePicker
                v-model="q1.dates"
                selection-mode="range"
                :manual-input="false"
                date-format="yy-mm-dd"
                show-icon
                placeholder="开始 至 结束"
                class="min-w-0 flex-1"
              />
            </div>
            <div class="flex min-w-0 items-center gap-1.5">
              <label class="w-16 shrink-0 text-xs text-muted-foreground">计划号</label>
              <InputText v-model="q1.planNo" class="min-w-0 flex-1" @keydown.enter="onQuery1" />
            </div>
            <BatchIdInput v-model="q1.orders" label="批量订单号" class="min-w-0" />
            <div class="flex min-w-0 items-center gap-1.5">
              <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
              <InputText v-model="q1.cSgCode" class="min-w-0 flex-1" @keydown.enter="onQuery1" />
            </div>
            <div class="flex min-w-0 items-center gap-1.5">
              <label class="w-16 shrink-0 text-xs text-muted-foreground">入库标识</label>
              <InputText v-model="q1.cInboundNo" class="min-w-0 flex-1" @keydown.enter="onQuery1" />
            </div>
          </div>

          <!-- 工具栏（原 stackPanel1 内 btnS 查询） -->
          <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
            <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying1" @click="onQuery1">
              <IconSearch class="h-3 w-3" />查询
            </Button>
          </div>

          <!-- 上下分栏（原 splitterControl1 Dock=Bottom：gridControl1 + ucStorage1「材料明细」） -->
          <Splitter class="min-h-0 flex-1" layout="vertical">
            <SplitterPanel :size="42" :minSize="20" class="flex flex-col overflow-hidden">
              <div class="min-h-0 flex-1 overflow-hidden">
                <AgGridVue
                  class="hmx-ag-grid h-full w-full"
                  :theme="theme"
                  :locale-text="AG_GRID_LOCALE_CN"
                  :pagination="false"
                  :default-col-def="hmxDefaultColDef"
                  :column-defs="mainColDefs"
                  :row-data="rows1"
                  :loading="querying1"
                  @grid-ready="onReady1"
                  @cell-focused="onCellFocused"
                  @first-data-rendered="autoSizeOnFirstData"
                />
              </div>
            </SplitterPanel>
            <SplitterPanel :size="58" :minSize="20" class="flex flex-col overflow-hidden">
              <!-- ucStorage1.ViewCaption「材料明细」纯标题 → h-8 -->
              <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
                <span class="text-xs font-medium text-muted-foreground">材料明细</span>
              </div>
              <div class="min-h-0 flex-1 overflow-hidden">
                <AgGridVue
                  class="hmx-ag-grid h-full w-full"
                  :theme="theme"
                  :locale-text="AG_GRID_LOCALE_CN"
                  :pagination="false"
                  :default-col-def="hmxDefaultColDef"
                  :column-defs="storageColDefs"
                  :row-data="storageRows"
                  :row-selection="{
                    mode: 'multiRow',
                    checkboxes: true,
                    headerCheckbox: true,
                    enableClickSelection: true,
                    enableSelectionWithoutKeys: true,
                  }"
                  @grid-ready="onStorageReady"
                  @first-data-rendered="autoSizeOnFirstData"
                />
              </div>
            </SplitterPanel>
          </Splitter>
        </TabPanel>

        <!-- ===== 页签2：浇次产出坯料跟踪（原 xtraTabPage2） ===== -->
        <TabPanel value="cpt" class="flex h-full min-h-0 flex-col overflow-hidden">
          <!-- 查询条件区（原 stackPanel2：产出时间、炉号、铸坯号、钢种、计划状态[原「坯料计划状态」]） -->
          <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
            <div class="col-span-2 flex min-w-0 items-center gap-1.5">
              <label class="w-16 shrink-0 text-xs text-muted-foreground">产出时间</label>
              <DatePicker
                v-model="q2.dates"
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
            <div class="flex min-w-0 items-center gap-1.5">
              <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
              <InputText v-model="q2.cStove" class="min-w-0 flex-1" @keydown.enter="onQuery2" />
            </div>
            <div class="flex min-w-0 items-center gap-1.5">
              <label class="w-16 shrink-0 text-xs text-muted-foreground">铸坯号</label>
              <InputText v-model="q2.cPieceNo" class="min-w-0 flex-1" @keydown.enter="onQuery2" />
            </div>
            <div class="flex min-w-0 items-center gap-1.5">
              <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
              <InputText v-model="q2.cSgCode" class="min-w-0 flex-1" @keydown.enter="onQuery2" />
            </div>
            <div class="flex min-w-0 items-center gap-1.5">
              <label class="w-16 shrink-0 text-xs text-muted-foreground">计划状态</label>
              <Select
                v-model="q2.planStatus"
                :options="planStatusOptions"
                option-label="label"
                option-value="value"
                show-clear
                placeholder="请选择"
                class="min-w-0 flex-1"
              />
            </div>
          </div>

          <!-- 工具栏（原 stackPanel2 内 simpleButton1 查询） -->
          <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
            <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying2" @click="onQuery2">
              <IconSearch class="h-3 w-3" />查询
            </Button>
          </div>

          <!-- 主表（gridControl2 / gridView2，绑定实体 QueryCptJC） -->
          <div class="min-h-0 flex-1 overflow-hidden">
            <AgGridVue
              class="hmx-ag-grid h-full w-full"
              :theme="theme"
              :locale-text="AG_GRID_LOCALE_CN"
              :pagination="false"
              :default-col-def="hmxDefaultColDef"
              :column-defs="cptColDefs"
              :row-data="rows2"
              :loading="querying2"
              @grid-ready="onReady2"
              @first-data-rendered="autoSizeOnFirstData"
            />
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
