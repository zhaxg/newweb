<script setup lang="ts">
/** 对应 FrmHR2200（改切计划生成）：DDH.Winforms.SHR.Forms.FrmHR2200
 *  已接入：hR2200Api.getSlabs / saveJQPlan + hR2000Api.queryThr2000Dtos
 *  待接入：无
 *  菜单参数：cQueryString JSON {"CLineCode":"ZG01","NStatus":0}（产线/库存状态）经 useMenuQuery 下发
 *  偏差：colCStoreCode/colCProdCode/colCShiftNo/colCGroupNo/colCSteelType/colCDelivyStatusCode/colCSurfaceDefectCode 原走 KV 字典翻译、
 *        colCComplexUser 等原走 UserFormatter，web 显示原值；colCAutoJudgeResult/colCJudgeResult/colCStatus 枚举翻译缺省 */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Textarea from "primevue/textarea";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import RangeInput from "@/components/common/RangeInput.vue";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { hR2000Api, hR2200Api, Thr2000StatusEnum, type Thr2000Dto, type TimeRange } from "@/api/mes4ddh/shr.swagger";
import type { Tyd2000Dto } from "@/api/mes4ddh/syd.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { json: menuJson } = useMenuQuery();
const cLineCode = typeof menuJson.CLineCode === "string" ? menuJson.CLineCode : typeof menuJson.cLineCode === "string" ? menuJson.cLineCode : "ZG01";
const cStoreCode = typeof menuJson.CStoreCode === "string" ? menuJson.CStoreCode : typeof menuJson.cStoreCode === "string" ? menuJson.cStoreCode : undefined;
const cStoreCodes = Array.isArray(menuJson.CStoreCodes) ? (menuJson.CStoreCodes as string[]) : Array.isArray(menuJson.cStoreCodes) ? (menuJson.cStoreCodes as string[]) : undefined;
const nStatus = typeof menuJson.NStatus === "number" ? menuJson.NStatus : typeof menuJson.nStatus === "number" ? menuJson.nStatus : undefined;

/* ---------- 时间 ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function proRange(): Date[] {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  a.setDate(a.getDate() - 1);
  const b = new Date();
  b.setDate(b.getDate() + 7);
  return [a, b];
}
function monthRange(): Date[] {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  last.setSeconds(last.getSeconds() - 1);
  return [first, last];
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}

/* ---------- 材料查询条件（DtoQuerySlabs） ---------- */
const slabInput = reactive({
  cOrderNo: "",
  cBatchNo: "",
  cPieceNo: "",
  cStove: "",
  cSgCode: "",
  cSpec: "",
  dates: proRange() as Date[] | null,
});

/* ---------- 订单查询条件（DtoQueryThr2000） ---------- */
const orderInput = reactive({
  cOrderNo: "",
  orders: "",
  cPieceNo: "",
  nStatus: Thr2000StatusEnum.Open as number,
  nThick: null as number | null,
  nWidth: null as number | null,
  nLen: null as number | null,
  thickMin: null as number | null | undefined,
  thickMax: null as number | null | undefined,
  widthMin: null as number | null | undefined,
  widthMax: null as number | null | undefined,
  lenMin: null as number | null | undefined,
  lenMax: null as number | null | undefined,
  dates: monthRange() as Date[] | null,
});
const statusOptions = [
  { label: "已开启", value: Thr2000StatusEnum.Open },
  { label: "已关闭", value: Thr2000StatusEnum.Close },
];

/* ---------- 上：材料信息（gridView1 / Tyd2000Dto） ---------- */
const slabRows = ref<Tyd2000Dto[]>([]);
const slabLoading = ref(false);
const slabApi = ref<GridApi | null>(null);
const slabCurrent = ref<Tyd2000Dto | null>(null);
function onSlabReady(e: GridReadyEvent) { slabApi.value = e.api; }
function onSlabSelectionChanged() {
  slabCurrent.value = (slabApi.value?.getSelectedRows()[0] as Tyd2000Dto | undefined) ?? null;
}

/* ---------- 下：订单信息（gridView2 / Thr2000Dto） ---------- */
const orderRows = ref<Thr2000Dto[]>([]);
const orderLoading = ref(false);
const orderApi = ref<GridApi | null>(null);
const orderCurrent = ref<Thr2000Dto | null>(null);
function onOrderReady(e: GridReadyEvent) { orderApi.value = e.api; }
function onOrderSelectionChanged() {
  orderCurrent.value = (orderApi.value?.getSelectedRows()[0] as Thr2000Dto | undefined) ?? null;
}

/* ---------- 列定义（列集/顺序按 Designer VisibleIndex） ---------- */
const slabColDefs: ColDef[] = [
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 120 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 112 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 112 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112 },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 112 },
  { colId: "cCutFlag", field: "cCutFlag", headerName: "切边方式", width: 112 },
  { colId: "cInboundNo", field: "cInboundNo", headerName: "入库标识", width: 112 },
  { colId: "cPieceNoSlab", field: "cPieceNoSlab", headerName: "板坯号", width: 112 },
  { colId: "dProTime", field: "dProTime", headerName: "产出时间", width: 140 },
  { colId: "cProUser", field: "cProUser", headerName: "产出人", width: 112 },
  { colId: "cShiftNo", field: "cShiftNo", headerName: "班次", width: 112 },
  { colId: "cGroupNo", field: "cGroupNo", headerName: "产出班组", width: 112 },
  { colId: "nStatus", field: "nStatus", headerName: "状态", width: 112 },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 112 },
  { colId: "cSteelType", field: "cSteelType", headerName: "钢种大类", width: 112 },
  { colId: "cDelivyStatusCode", field: "cDelivyStatusCode", headerName: "交货状态", width: 112 },
  { colId: "nQmStatus", field: "nQmStatus", headerName: "质量状态", width: 112 },
  { colId: "nLockReason", field: "nLockReason", headerName: "质量封锁原因", width: 138 },
  { colId: "nQmLevel", field: "nQmLevel", headerName: "质量等级", width: 112 },
  { colId: "cIsSurface", field: "cIsSurface", headerName: "是否表检", width: 112 },
  { colId: "cSurfaceResult", field: "cSurfaceResult", headerName: "表检结果", width: 112 },
  { colId: "cSurfaceDefectCode", field: "cSurfaceDefectCode", headerName: "表面缺陷代码", width: 138 },
  { colId: "cSurfaceDesc", field: "cSurfaceDesc", headerName: "缺陷原因", width: 112 },
  { colId: "cSurfaceUser", field: "cSurfaceUser", headerName: "表检人", width: 112 },
  { colId: "dSurfaceTime", field: "dSurfaceTime", headerName: "表检时间", width: 140 },
  { colId: "cDetectResultCode", field: "cDetectResultCode", headerName: "探伤判定结果", width: 138 },
  { colId: "cDetectDefectLevel", field: "cDetectDefectLevel", headerName: "探伤等级", width: 112 },
  { colId: "cDefectDefectCode", field: "cDefectDefectCode", headerName: "探伤判定缺陷代码", width: 164 },
  { colId: "cDefectDefectMark", field: "cDefectDefectMark", headerName: "探伤判定缺陷描述", width: 164 },
  { colId: "cDefectUser", field: "cDefectUser", headerName: "表面判定人", width: 125 },
  { colId: "dDefectTime", field: "dDefectTime", headerName: "表面判定时间", width: 138 },
  { colId: "cAutoJudgeResult", field: "cAutoJudgeResult", headerName: "委托自动判定结果", width: 164 },
  { colId: "cJudgeUser", field: "cJudgeUser", headerName: "委托判定人", width: 125 },
  { colId: "dJudgeTime", field: "dJudgeTime", headerName: "委托判定时间", width: 138 },
  { colId: "cJudgeResult", field: "cJudgeResult", headerName: "最终判定结果", width: 125 },
  { colId: "cJudgeRemark", field: "cJudgeRemark", headerName: "委托判定备注", width: 138 },
  { colId: "cStatus", field: "cStatus", headerName: "委托单状态", width: 125 },
  { colId: "cRecheckFlag", field: "cRecheckFlag", headerName: "复验标记", width: 112 },
  { colId: "cComplexDecideCode", field: "cComplexDecideCode", headerName: "综判结果", width: 112 },
  { colId: "cComplexDesc", field: "cComplexDesc", headerName: "综判描述", width: 112 },
  { colId: "cComplexUser", field: "cComplexUser", headerName: "综判人", width: 112 },
  { colId: "dComplexTime", field: "dComplexTime", headerName: "综判时间", width: 140 },
  { colId: "cQmHandleCode", field: "cQmHandleCode", headerName: "处置结果", width: 112 },
  { colId: "cQmHandleDesc", field: "cQmHandleDesc", headerName: "处置注释", width: 112 },
  { colId: "cQmHandleUser", field: "cQmHandleUser", headerName: "处置人", width: 112 },
  { colId: "dQmHandleTime", field: "dQmHandleTime", headerName: "处置时间", width: 140 },
  { colId: "cSampleLotNo", field: "cSampleLotNo", headerName: "试批号", width: 112 },
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
  { colId: "id", field: "id", headerName: "thr3010 id", width: 150, hide: true },
  { colId: "cBatchOrder", field: "cBatchOrder", headerName: "组批号", width: 112, hide: true },
  { colId: "nProType", field: "nProType", headerName: "库存分类", width: 112, hide: true },
  { colId: "cPrintCode", field: "cPrintCode", headerName: "喷印号", width: 112, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112, hide: true },
  { colId: "cProc", field: "cProc", headerName: "工序", width: 112, hide: true },
  { colId: "cMachine", field: "cMachine", headerName: "机台", width: 112, hide: true },
  { colId: "cStrandNo", field: "cStrandNo", headerName: "流道号", width: 112, hide: true },
  { colId: "cPlanId", field: "cPlanId", headerName: "日计划主键", width: 150, hide: true },
  { colId: "cConNo", field: "cConNo", headerName: "合同号", width: 112, hide: true },
  { colId: "cMatCode", field: "cMatCode", headerName: "物料编码", width: 112, hide: true },
  { colId: "cTlSgCode", field: "cTlSgCode", headerName: "坯料钢种", width: 112, hide: true },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 112, hide: true },
  { colId: "nWth", field: "nWth", headerName: "宽度", width: 112, hide: true },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 112, hide: true },
  { colId: "nNum", field: "nNum", headerName: "签订块数", width: 112, hide: true },
  { colId: "nCalWgt", field: "nCalWgt", headerName: "理重", width: 112, hide: true },
  { colId: "dInTime", field: "dInTime", headerName: "入库时间", width: 140, hide: true },
  { colId: "cInUser", field: "cInUser", headerName: "入库人", width: 112, hide: true },
  { colId: "dOutTime", field: "dOutTime", headerName: "抽出时刻", width: 140, hide: true },
  { colId: "cStoreCode", field: "cStoreCode", headerName: "库房", width: 112, hide: true },
  { colId: "cArer", field: "cArer", headerName: "区域", width: 112, hide: true },
  { colId: "cStackNo", field: "cStackNo", headerName: "垛位号", width: 112, hide: true },
  { colId: "cStackNum", field: "cStackNum", headerName: "层号", width: 112, hide: true },
  { colId: "cSourceStoreCode", field: "cSourceStoreCode", headerName: "来源库房", width: 125, hide: true },
  { colId: "cSourceStackNo", field: "cSourceStackNo", headerName: "来源垛位号", width: 125, hide: true },
  { colId: "cSourceStackNum", field: "cSourceStackNum", headerName: "来源层号", width: 125, hide: true },
  { colId: "cIsHot", field: "cIsHot", headerName: "热送区分", width: 112, hide: true },
  { colId: "nCastDivCode", field: "nCastDivCode", headerName: "浇区分", width: 112, hide: true },
  { colId: "cLockedLine", field: "cLockedLine", headerName: "封锁产线", width: 125, hide: true },
  { colId: "cLockedPlan", field: "cLockedPlan", headerName: "封锁计划", width: 125, hide: true },
  { colId: "cMatType", field: "cMatType", headerName: "物料类型", width: 112, hide: true },
  { colId: "cProdCode", field: "cProdCode", headerName: "品名代码", width: 112, hide: true },
  { colId: "cCustStdCode", field: "cCustStdCode", headerName: "加工用途代码", width: 125, hide: true },
  { colId: "cOrderNoLast", field: "cOrderNoLast", headerName: "原提料计划号", width: 138, hide: true },
  { colId: "cDestination", field: "cDestination", headerName: "去向", width: 112, hide: true },
  { colId: "cHotNo", field: "cHotNo", headerName: "热送号", width: 112, hide: true },
  { colId: "cSlabType", field: "cSlabType", headerName: "坯料类型", width: 112, hide: true },
  { colId: "cIsQy", field: "cIsQy", headerName: "取样板标记", width: 125, hide: true },
  { colId: "typeValues", field: "typeValues", headerName: "类型值", width: 112, hide: true },
  { colId: "cSampleLotNoPre", field: "cSampleLotNoPre", headerName: "前试批号", width: 125, hide: true },
  { colId: "cPlanTime", field: "cPlanTime", headerName: "计划日期", width: 112, hide: true },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 112, hide: true },
  { colId: "cWgtToler", field: "cWgtToler", headerName: "重量偏差等级", width: 138, hide: true },
  { colId: "cBilletTypeCode", field: "cBilletTypeCode", headerName: "铸坯标识", width: 112, hide: true },
  { colId: "cusName", field: "cusName", headerName: "客户名称", width: 112, hide: true },
  { colId: "planCSpec", field: "planCSpec", headerName: "计划规格", width: 112, hide: true },
  { colId: "planNThickPlan", field: "planNThickPlan", headerName: "计划厚度", width: 112, hide: true },
  { colId: "planNWidthPlan", field: "planNWidthPlan", headerName: "计划宽度", width: 112, hide: true },
  { colId: "planNLlCleanLen", field: "planNLlCleanLen", headerName: "理论毛长", width: 112, hide: true },
  { colId: "cOrderCustCname", field: "cOrderCustCname", headerName: "客户名称", width: 112, hide: true },
  { colId: "planCOrderNo1", field: "planCOrderNo1", headerName: "计划订单号1", width: 125, hide: true },
  { colId: "planCOrderNo2", field: "planCOrderNo2", headerName: "计划订单号2", width: 125, hide: true },
  { colId: "planCOrderNo3", field: "planCOrderNo3", headerName: "计划订单号3", width: 125, hide: true },
  { colId: "planCOrderNo4", field: "planCOrderNo4", headerName: "计划订单号4", width: 125, hide: true },
  { colId: "planCOrderNo5", field: "planCOrderNo5", headerName: "计划订单号5", width: 125, hide: true },
  { colId: "planCOrderNo6", field: "planCOrderNo6", headerName: "计划订单号6", width: 125, hide: true },
  { colId: "planNLenPlan1", field: "planNLenPlan1", headerName: "计划长度1", width: 112, hide: true },
  { colId: "planNLenPlan2", field: "planNLenPlan2", headerName: "计划长度2", width: 112, hide: true },
  { colId: "planNLenPlan3", field: "planNLenPlan3", headerName: "计划长度3", width: 112, hide: true },
  { colId: "planNLenPlan4", field: "planNLenPlan4", headerName: "计划长度4", width: 112, hide: true },
  { colId: "planNLenPlan5", field: "planNLenPlan5", headerName: "计划长度5", width: 112, hide: true },
  { colId: "planNLenPlan6", field: "planNLenPlan6", headerName: "计划长度6", width: 112, hide: true },
  { colId: "cInboundNo1", field: "cInboundNo1", headerName: "入库标识1", width: 112, hide: true },
  { colId: "cInboundNo2", field: "cInboundNo2", headerName: "入库标识2", width: 112, hide: true },
  { colId: "cInboundNo3", field: "cInboundNo3", headerName: "入库标识3", width: 112, hide: true },
  { colId: "cInboundNo4", field: "cInboundNo4", headerName: "入库标识4", width: 112, hide: true },
  { colId: "cInboundNo5", field: "cInboundNo5", headerName: "入库标识5", width: 112, hide: true },
  { colId: "cInboundNo6", field: "cInboundNo6", headerName: "入库标识6", width: 112, hide: true },
  { colId: "nKSgCode", field: "nKSgCode", headerName: "内控钢种", width: 112, hide: true },
  { colId: "cSpecialMarkGy", field: "cSpecialMarkGy", headerName: "性能要求", width: 112, hide: true },
  { colId: "nBoarCleanLen", field: "nBoarCleanLen", headerName: "母板净长", width: 112, hide: true },
  { colId: "cTol", field: "cTol", headerName: "公差类型", width: 112, hide: true },
  { colId: "nThickMin", field: "nThickMin", headerName: "目标厚度下限(内控)", width: 164, hide: true },
  { colId: "nThickMax", field: "nThickMax", headerName: "目标厚度上限(内控)", width: 164, hide: true },
  { colId: "nDbc", field: "nDbc", headerName: "倍尺", width: 112, hide: true },
];

const orderColDefs: ColDef[] = [
  { colId: "nOrder", field: "nOrder", headerName: "生产顺序", width: 112 },
  { colId: "cPlanTime", field: "cPlanTime", headerName: "计划日期", width: 112 },
  { colId: "cCool", field: "cCool", headerName: "是否冷坯计划", width: 125 },
  { colId: "cIsGcd", field: "cIsGcd", headerName: "是否工程单", width: 125 },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140 },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 120 },
  { colId: "cOrderNo1", field: "cOrderNo1", headerName: "订单号1", width: 112 },
  { colId: "cOrderNo2", field: "cOrderNo2", headerName: "订单号2", width: 112 },
  { colId: "cOrderNo3", field: "cOrderNo3", headerName: "订单号3", width: 112 },
  { colId: "cOrderNo4", field: "cOrderNo4", headerName: "订单号4", width: 112 },
  { colId: "nLenTq1", field: "nLenTq1", headerName: "套切1", width: 112 },
  { colId: "nLenTq2", field: "nLenTq2", headerName: "套切2", width: 112 },
  { colId: "nLenTq3", field: "nLenTq3", headerName: "套切3", width: 112 },
  { colId: "nLenTq4", field: "nLenTq4", headerName: "套切4", width: 112 },
  { colId: "nBc", field: "nBc", headerName: "倍尺", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112 },
  { colId: "nPlanedWgt", field: "nPlanedWgt", headerName: "排产量", width: 112 },
  { colId: "nPlanZpWgt", field: "nPlanZpWgt", headerName: "计划组批量", width: 125 },
  { colId: "nZpSyWgt", field: "nZpSyWgt", headerName: "剩余组批量", width: 125 },
  { colId: "cSteelType", field: "cSteelType", headerName: "钢种大类", width: 112 },
  { colId: "cDelivyStatusCode", field: "cDelivyStatusCode", headerName: "交货状态代码", width: 138 },
  { colId: "cRemark", field: "cRemark", headerName: "日计划备注", width: 125 },
  { colId: "cSgCodeTl", field: "cSgCodeTl", headerName: "提料钢种", width: 112 },
  { colId: "cSgStdTl", field: "cSgStdTl", headerName: "提料标准", width: 112 },
  { colId: "nThickTl", field: "nThickTl", headerName: "提料厚度", width: 112 },
  { colId: "nWidthTl", field: "nWidthTl", headerName: "提料宽度", width: 112 },
  { colId: "nLenMinTl", field: "nLenMinTl", headerName: "提料长度最小值", width: 151 },
  { colId: "nLenMaxTl", field: "nLenMaxTl", headerName: "提料长度最大值", width: 151 },
  { colId: "nQuaTl", field: "nQuaTl", headerName: "提料支数", width: 112 },
  { colId: "nWgtUnitTl", field: "nWgtUnitTl", headerName: "提料单支重量", width: 138 },
  { colId: "nWgtTl", field: "nWgtTl", headerName: "提料重量", width: 112 },
  { colId: "nQuaZp", field: "nQuaZp", headerName: "组批支数", width: 112 },
  { colId: "nWgtZp", field: "nWgtZp", headerName: "组批重量", width: 112 },
  { colId: "nQuaFur", field: "nQuaFur", headerName: "入炉支数", width: 112 },
  { colId: "nWgtFur", field: "nWgtFur", headerName: "入炉量", width: 112 },
  { colId: "nQuaRoll", field: "nQuaRoll", headerName: "轧制完成支数", width: 125 },
  { colId: "nWgtRoll", field: "nWgtRoll", headerName: "轧制完成量", width: 125 },
  { colId: "nQuaPlan", field: "nQuaPlan", headerName: "计划收料支数", width: 125 },
  { colId: "nQuaFinish", field: "nQuaFinish", headerName: "收料支数", width: 112 },
  { colId: "nWgtFinish", field: "nWgtFinish", headerName: "收料重量", width: 112 },
  { colId: "nWidthWgt", field: "nWidthWgt", headerName: "边部宽度余量", width: 138 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式:四切", width: 138 },
  { colId: "cFlawDesc", field: "cFlawDesc", headerName: "探伤等级", width: 112 },
  { colId: "dStart", field: "dStart", headerName: "开始产出", width: 140 },
  { colId: "dEnd", field: "dEnd", headerName: "最后产出", width: 140 },
  { colId: "cPieceNos", field: "cPieceNos", headerName: "已挂单材料", width: 125 },
  { colId: "cConRemark", field: "cConRemark", headerName: "合同备注", width: 112 },
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 120, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 140, hide: true },
  { colId: "cOrderId", field: "cOrderId", headerName: "TMP2020主键", width: 150, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112, hide: true },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 112, hide: true },
  { colId: "nWidth", field: "nWidth", headerName: "宽度", width: 112, hide: true },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 112, hide: true },
  { colId: "cLengthType", field: "cLengthType", headerName: "长度类型", width: 112, hide: true },
  { colId: "nLenMin", field: "nLenMin", headerName: "长度下限", width: 112, hide: true },
  { colId: "nLenMax", field: "nLenMax", headerName: "长度上限", width: 112, hide: true },
  { colId: "cCustStdCode", field: "cCustStdCode", headerName: "加工用途代码", width: 125, hide: true },
  { colId: "dJhqTime", field: "dJhqTime", headerName: "交货期", width: 140, hide: true },
  { colId: "cDesignNo", field: "cDesignNo", headerName: "质量设计号", width: 125, hide: true },
  { colId: "cMsc", field: "cMsc", headerName: "冶金规范", width: 112, hide: true },
  { colId: "cMscLineNo", field: "cMscLineNo", headerName: "冶金规范产线号", width: 138, hide: true },
  { colId: "nStatus", field: "nStatus", headerName: "计划状态", width: 112, hide: true },
  { colId: "cCloseEmp", field: "cCloseEmp", headerName: "关闭人", width: 112, hide: true },
  { colId: "dClose", field: "dClose", headerName: "关闭时间", width: 140, hide: true },
  { colId: "cSourceTl", field: "cSourceTl", headerName: "供坯单位", width: 112, hide: true },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 112, hide: true },
  { colId: "cTol", field: "cTol", headerName: "公差", width: 112, hide: true },
  { colId: "cOverstepBl", field: "cOverstepBl", headerName: "短溢装比例", width: 125, hide: true },
  { colId: "cInboundNo", field: "cInboundNo", headerName: "入库标识", width: 112, hide: true },
  { colId: "cShape", field: "cShape", headerName: "形状代码", width: 112, hide: true },
  { colId: "cIsMerge", field: "cIsMerge", headerName: "是否合并提料", width: 125, hide: true },
];

/* ---------- 查询 ---------- */
async function querySlab() {
  slabLoading.value = true;
  try {
    const list = (await hR2200Api.getSlabs({
      cLineCode,
      cStoreCode,
      cStoreCodes,
      nStatus: nStatus ?? undefined,
      cOrderNo: slabInput.cOrderNo.trim() || undefined,
      cBatchNo: slabInput.cBatchNo.trim() || undefined,
      cPieceNo: slabInput.cPieceNo.trim() || undefined,
      cStove: slabInput.cStove.trim() || undefined,
      cSgCode: slabInput.cSgCode.trim() || undefined,
      cSpec: slabInput.cSpec.trim() || undefined,
      dProTime: toTimeRange(slabInput.dates),
    })) ?? [];
    slabRows.value = list;
    slabCurrent.value = null;
    requestAnimationFrame(() => slabApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    slabLoading.value = false;
  }
}

async function queryOrder() {
  orderLoading.value = true;
  try {
    const orders = orderInput.orders
      .split(/[\r\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const list = (await hR2000Api.queryThr2000Dtos({
      cLineCode,
      cOrderNo: orderInput.cOrderNo.trim() || undefined,
      cOrderNos: orders.length ? orders : [],
      cPieceNo: orderInput.cPieceNo.trim() || undefined,
      nStatus: orderInput.nStatus,
      nThick: orderInput.nThick ?? undefined,
      nWidth: orderInput.nWidth ?? undefined,
      nLen: orderInput.nLen ?? undefined,
      nThickRange: orderInput.thickMin != null || orderInput.thickMax != null ? { min: orderInput.thickMin, max: orderInput.thickMax } : undefined,
      nWthRange: orderInput.widthMin != null || orderInput.widthMax != null ? { min: orderInput.widthMin, max: orderInput.widthMax } : undefined,
      nLenRange: orderInput.lenMin != null || orderInput.lenMax != null ? { min: orderInput.lenMin, max: orderInput.lenMax } : undefined,
      dTimeRange: toTimeRange(orderInput.dates),
    })) ?? [];
    orderRows.value = list;
    orderCurrent.value = null;
    requestAnimationFrame(() => orderApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    orderLoading.value = false;
  }
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

/* ---------- 保存（生成改切计划） ---------- */
async function doSave() {
  const slab = slabCurrent.value;
  const plan = orderCurrent.value;
  if (!slab || !plan) return;
  try {
    await hR2200Api.saveJQPlan(slab.id ?? undefined, plan.id ?? undefined);
    toast("保存成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  }
}
function btnSave() {
  const plan = orderCurrent.value;
  if (!plan) {
    toast("请选择日计划操作！", 2000, "warn");
    return;
  }
  const slab = slabCurrent.value;
  if (!slab) {
    toast("请选择材料操作！", 2000, "warn");
    return;
  }
  askConfirm(`是否确认把材料${slab.cPieceNo}按照提料计划${plan.cOrderNo}生成改切计划?`, doSave);
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 上下分栏：原 split1 417/1030 ≈ 40% -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="40" :minSize="20" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">材料信息</span>
        </div>
        <!-- 材料查询条件（订单号/批号/件次号/炉号/钢种/规格/产出时间 + 查询） -->
        <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
            <InputText v-model="slabInput.cOrderNo" class="min-w-0 flex-1" @keydown.enter="querySlab" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
            <InputText v-model="slabInput.cBatchNo" class="min-w-0 flex-1" @keydown.enter="querySlab" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">件次号</label>
            <InputText v-model="slabInput.cPieceNo" class="min-w-0 flex-1" @keydown.enter="querySlab" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
            <InputText v-model="slabInput.cStove" class="min-w-0 flex-1" @keydown.enter="querySlab" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
            <InputText v-model="slabInput.cSgCode" class="min-w-0 flex-1" @keydown.enter="querySlab" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">规格</label>
            <InputText v-model="slabInput.cSpec" class="min-w-0 flex-1" @keydown.enter="querySlab" />
          </div>
          <div class="col-span-2 flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">产出时间</label>
            <DatePicker v-model="slabInput.dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
              show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
          </div>
          <div class="col-span-2 flex min-w-0 items-center gap-1">
            <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="slabLoading" @click="querySlab">
              <IconSearch class="h-3 w-3" />查询
            </Button>
          </div>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="slabColDefs" :row-data="slabRows"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false" :animate-rows="false" :loading="slabLoading"
            @grid-ready="onSlabReady" @selection-changed="onSlabSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <SplitterPanel :minSize="20" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">订单信息</span>
        </div>
        <!-- 订单查询条件（提料计划号/批量计划号/熔炼号/计划状态/厚度/宽度/长度/区间/时间区间 + 查询/保存） -->
        <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-20 shrink-0 text-xs text-muted-foreground">提料计划号</label>
            <InputText v-model="orderInput.cOrderNo" class="min-w-0 flex-1" @keydown.enter="queryOrder" />
          </div>
          <div class="col-span-2 flex min-w-0 items-center gap-1.5">
            <label class="w-20 shrink-0 text-xs text-muted-foreground">批量计划号</label>
            <Textarea v-model="orderInput.orders" rows="2" class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">熔炼号</label>
            <InputText v-model="orderInput.cPieceNo" class="min-w-0 flex-1" @keydown.enter="queryOrder" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">计划状态</label>
            <Select v-model="orderInput.nStatus" :options="statusOptions" option-label="label" option-value="value"
              class="min-w-0 flex-1" />
          </div>
          <div class="col-span-2 flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">时间区间</label>
            <DatePicker v-model="orderInput.dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
              show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">厚度</label>
            <InputNumber v-model="orderInput.nThick" :show-buttons="false" :use-grouping="false" class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">宽度</label>
            <InputNumber v-model="orderInput.nWidth" :show-buttons="false" :use-grouping="false" class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">长度</label>
            <InputNumber v-model="orderInput.nLen" :show-buttons="false" :use-grouping="false" class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">厚度区间</label>
            <RangeInput v-model:min="orderInput.thickMin" v-model:max="orderInput.thickMax" class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">宽度区间</label>
            <RangeInput v-model:min="orderInput.widthMin" v-model:max="orderInput.widthMax" class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">长度区间</label>
            <RangeInput v-model:min="orderInput.lenMin" v-model:max="orderInput.lenMax" class="min-w-0 flex-1" />
          </div>
        </div>
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="orderLoading" @click="queryOrder">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="btnSave">保存</Button>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="orderColDefs" :row-data="orderRows"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false" :animate-rows="false" :loading="orderLoading"
            @grid-ready="onOrderReady" @selection-changed="onOrderSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>
    </Splitter>

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
