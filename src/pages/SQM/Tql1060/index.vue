<script setup lang="ts">
/** 对应 FrmTql1060（中厚板探伤判定）：DDH.Winforms.SQM.Forms.Tqmtq.FrmTql1060
 *  已接入：tql1060Api.queryStorage / queryRecord / setDisable；产线下拉 tPa1000Api.queryLines（原 ucLine1.RefreshData）
 *  待接入：探伤判定二级弹窗 FrmQZ6004（未勾选校验「请勾选需要判定的材料后在操作」照抄后 toast）
 *  菜单参数：cQueryString JSON {LineCode,NProType} 经 useMenuQuery 下发（产线单选项 + 库存分类；缺省回落 LG01/坯料）
 *  结构：上=库存 ucStorage1，下=stackPanel2（记录查询条）+ 判定记录（原 splitContainerControl1 上下 SplitterPosition 343）
 *  库存表：NProType=P→InitSlabColumns / C→InitP4Columns 置前可见，其余 Designer 列 hide:true
 *  记录表：extract 25 可见 + Id/审计 5 hide；Selected → 行选择勾选列
 *  偏差：原 SetCodeFormatterAsync 的 UserFormatter/KV 字典翻译未迁，web 显示原值；已内联翻译产线/库存分类 */

import { computed, reactive, ref } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import DatePicker from "primevue/datepicker";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconCheck, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { tql1060Api, type TimeRange } from "@/api/mes4ddh/lims.swagger";
import type { Tyd2000Dto } from "@/api/mes4ddh/syd.swagger";
import { NProTypeEnum } from "@/api/mes4ddh/sqm.swagger";
import { tPa1000Api, type Tpa1000 } from "@/api/mes4ddh/shr.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { json: menuJson } = useMenuQuery();

/* ---------- 菜单参数（原 FrmTql1060_Load：QueryInput.LineCode/NProType） ---------- */
const qsLineCode =
  typeof menuJson.LineCode === "string"
    ? menuJson.LineCode
    : typeof menuJson.lineCode === "string"
      ? menuJson.lineCode
      : "LG01";
const qsNProType =
  typeof menuJson.NProType === "number"
    ? menuJson.NProType
    : typeof menuJson.nProType === "number"
      ? menuJson.nProType
      : NProTypeEnum.P;

/* ---------- 时间（原 Load：TimeRange(今天-3, 今天+1)，ucTimeRange1/2 各一份） ---------- */
function defaultRange(): Date[] {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  a.setDate(a.getDate() - 3);
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

/* ---------- 产线（原 ucLine1：ShowLines=[qs.LineCode] 单选项） ---------- */
const allLines = ref<Tpa1000[]>([]);
const lineNameMap = computed(() => new Map(allLines.value.map((l) => [String(l.cCode ?? ""), String(l.cName ?? "")])));
const lineOptions = computed(() =>
  allLines.value
    .filter((l) => !qsLineCode || l.cCode === qsLineCode)
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

/* ---------- 库存查询条件（原 dataLayoutControl2 / bscInput→Tql1060InputDto） ---------- */
const storageQuery = reactive({
  lineCode: qsLineCode,
  stove: "",
  pieceNo: "",
  dates: defaultRange() as Date[] | null,
});

/* ---------- 记录查询条件（原 stackPanel2：ucTimeRange2 + textEdit1/textEdit2 → Tql1060QueryDto） ---------- */
const recordQuery = reactive({
  dates: defaultRange() as Date[] | null,
  stove: "",
  pieceNo: "",
});

/* ---------- 两表状态 ---------- */
const storageRows = ref<Tyd2000Dto[]>([]);
const storageLoading = ref(false);
const storageApi = ref<GridApi | null>(null);
const recordRows = ref<any[]>([]);
const recordLoading = ref(false);
const recordApi = ref<GridApi | null>(null);
function onStorageReady(e: GridReadyEvent) {
  storageApi.value = e.api;
}
function onRecordReady(e: GridReadyEvent) {
  recordApi.value = e.api;
}
function autosizeLater() {
  requestAnimationFrame(() => {
    storageApi.value?.autoSizeAllColumns();
    recordApi.value?.autoSizeAllColumns();
  });
}

/* ---------- 列头翻译（已内联部分） ---------- */
function mapFmt(map: Record<string, string>) {
  return (p: ValueFormatterParams) => {
    if (p.value === null || p.value === undefined || p.value === "") return "";
    return map[String(p.value)] ?? String(p.value);
  };
}
const lineFmt = (p: ValueFormatterParams) => {
  if (p.value === null || p.value === undefined || p.value === "") return "";
  const code = String(p.value);
  return lineNameMap.value.get(code) || code;
};
const nProTypeFmt = mapFmt({
  [NProTypeEnum.P]: "坯料",
  [NProTypeEnum.R]: "半成品",
  [NProTypeEnum.C]: "产成品",
});
const surfaceResultFmt = mapFmt({ 0: "待检", 10: "合格", 20: "不合格", 30: "让步放行", 40: "待处理" });

/* ---------- 库存表列：UCStorage 127 列全量；NProType 运行时模式置前可见，其余 hide:true ---------- */
const allStorageCols: ColDef[] = [
  { field: "id", headerName: "主键", width: 86 },
  { field: "cStove", headerName: "炉号", width: 86 },
  { field: "cPieceNo", headerName: "件次号", width: 99 },
  { field: "nProType", headerName: "库存分类", width: 112 },
  { field: "cPrintCode", headerName: "喷号", width: 86 },
  { field: "cLineCode", headerName: "产线", width: 86 },
  { field: "cProc", headerName: "工序代码", width: 112 },
  { field: "cMachine", headerName: "机台号", width: 99 },
  { field: "cStrandNo", headerName: "流号", width: 86 },
  { field: "cPlanId", headerName: "计划号", width: 99 },
  { field: "cConNo", headerName: "合同号", width: 99 },
  { field: "cOrderNo", headerName: "订单号", width: 99 },
  { field: "cMatCode", headerName: "物料编码", width: 112 },
  { field: "cSgCode", headerName: "钢种", width: 86 },
  { field: "cSgStd", headerName: "执行标准", width: 112 },
  { field: "nThick", headerName: "厚度", width: 86 },
  { field: "nWth", headerName: "宽度", width: 86 },
  { field: "nLen", headerName: "长度", width: 86 },
  { field: "cSpec", headerName: "规格", width: 86 },
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
  { field: "cArer", headerName: "区域", width: 86 },
  { field: "cStackNo", headerName: "垛位号", width: 99 },
  { field: "nStackNum", headerName: "层号", width: 86 },
  { field: "cSourceStoreCode", headerName: "原库区号", width: 112 },
  { field: "cSourceStackNo", headerName: "原垛位号", width: 112 },
  { field: "cSourceStackNum", headerName: "原层号", width: 99 },
  { field: "nStatus", headerName: "库存状态", width: 112 },
  { field: "cIsHot", headerName: "热送区分", width: 112 },
  { field: "cProRemark", headerName: "生产备注", width: 112 },
  { field: "nCastDivCode", headerName: "模连铸标识", width: 125 },
  { field: "cLockedLine", headerName: "占用产线", width: 112 },
  { field: "cLockedPlan", headerName: "占用计划", width: 112 },
  { field: "cMatType", headerName: "产品大类", width: 112 },
  { field: "cProdCode", headerName: "品名", width: 86 },
  { field: "cSteelType", headerName: "钢类", width: 86 },
  { field: "cDelivyStatusCode", headerName: "交货状态", width: 112 },
  { field: "cCustStdCode", headerName: "加工用途代码", width: 138 },
  { field: "cBatchNo", headerName: "批号", width: 86 },
  { field: "cOrderNoLast", headerName: "原始订单号", width: 125 },
  { field: "cDestination", headerName: "去向", width: 86 },
  { field: "cHotNo", headerName: "退火炉回号", width: 125 },
  { field: "cSlabType", headerName: "坯类", width: 86 },
  { field: "cPieceNoSlab", headerName: "板坯号", width: 99 },
  { field: "nQmStatus", headerName: "质量状态", width: 112 },
  { field: "nLockReason", headerName: "质量封锁原因", width: 138 },
  { field: "nQmLevel", headerName: "质量等级", width: 112 },
  { field: "cIsSurface", headerName: "是否表检", width: 112 },
  { field: "cSurfaceResult", headerName: "表检结果", width: 112 },
  { field: "cSurfaceDefectCode", headerName: "表面缺陷代码", width: 138 },
  { field: "cSurfaceDesc", headerName: "表检描述", width: 112 },
  { field: "cSurfaceUser", headerName: "表面判定人", width: 125 },
  { field: "dSurfaceTime", headerName: "表面判定时间", width: 138 },
  { field: "cDetectResultCode", headerName: "探伤判定结果", width: 138 },
  { field: "cDetectDefectLevel", headerName: "探伤等级", width: 112 },
  { field: "cDefectDefectCode", headerName: "探伤判定缺陷代码", width: 164 },
  { field: "cDefectDefectMark", headerName: "探伤判定缺陷描述", width: 164 },
  { field: "cDefectUser", headerName: "表面判定人", width: 125 },
  { field: "dDefectTime", headerName: "表面判定时间", width: 138 },
  { field: "cComplexDecideCode", headerName: "综判结果", width: 112 },
  { field: "cComplexDesc", headerName: "综判描述", width: 112 },
  { field: "cComplexUser", headerName: "综判人", width: 99 },
  { field: "dComplexTime", headerName: "综判时间", width: 112 },
  { field: "cQmHandleCode", headerName: "处置结果", width: 112 },
  { field: "cQmHandleDesc", headerName: "处置注释", width: 112 },
  { field: "cQmHandleUser", headerName: "处置人", width: 99 },
  { field: "dQmHandleTime", headerName: "处置时间", width: 112 },
  { field: "cSampleLotNo", headerName: "试批号", width: 99 },
  { field: "cSampleLotNoPre", headerName: "前试批号", width: 112 },
  { field: "cCutFlag", headerName: "切边方式", width: 112 },
  { field: "cInboundNo", headerName: "入库标识", width: 112 },
  { field: "cDelivyAddress", headerName: "流向", width: 86 },
  { field: "cWgtToler", headerName: "公差等级", width: 112 },
  { field: "cBilletTypeCode", headerName: "铸坯标识", width: 112 },
  { field: "cCusName", headerName: "客户名称", width: 112 },
  { field: "pLAN_CSpec", headerName: "剪切计划规格", width: 138 },
  { field: "pLAN_NThickPlan", headerName: "轧制厚", width: 99 },
  { field: "pLAN_NWidthPlan", headerName: "轧制宽", width: 99 },
  { field: "pLAN_NLlCleanLen", headerName: "轧制长", width: 99 },
  { field: "pLAN_COrderNo1", headerName: "订单号1", width: 112 },
  { field: "pLAN_COrderNo2", headerName: "订单号2", width: 112 },
  { field: "pLAN_COrderNo3", headerName: "订单号3", width: 112 },
  { field: "pLAN_COrderNo4", headerName: "订单号4", width: 112 },
  { field: "pLAN_COrderNo5", headerName: "订单号5", width: 112 },
  { field: "pLAN_COrderNo6", headerName: "订单号6", width: 112 },
  { field: "pLAN_NLenPlan1", headerName: "套切长度1", width: 125 },
  { field: "pLAN_NLenPlan2", headerName: "套切长度2", width: 125 },
  { field: "pLAN_NLenPlan3", headerName: "套切长度3", width: 125 },
  { field: "pLAN_NLenPlan4", headerName: "套切长度4", width: 125 },
  { field: "pLAN_NLenPlan5", headerName: "套切长度5", width: 125 },
  { field: "pLAN_NLenPlan6", headerName: "套切长度6", width: 125 },
  { field: "nKSgCode", headerName: "国标钢种", width: 112 },
  { field: "cPlanTime", headerName: "计划日期", width: 112 },
  { field: "cTol", headerName: "公差", width: 86 },
  { field: "typeValues", headerName: "钢板分类", width: 112 },
  { field: "cAutoJudgeResult", headerName: "委托自动判定结果", width: 164 },
  { field: "cJudgeRemark", headerName: "委托判定备注", width: 138 },
  { field: "cJudgeResult", headerName: "委托最终判定结果", width: 164 },
  { field: "cJudgeUser", headerName: "委托判定人", width: 125 },
  { field: "cRecheckFlag", headerName: "复验标记", width: 112 },
  { field: "cStatus", headerName: "委托单状态", width: 125 },
  { field: "dJudgeTime", headerName: "委托判定时间", width: 138 },
  { field: "cTlSgCode", headerName: "炼钢钢种", width: 112 },
  { field: "cOutUser", headerName: "出库人", width: 99 },
  { field: "dOutTime", headerName: "出库时间", width: 112 },
  { field: "cInboundNo1", headerName: "入库标识1", width: 125 },
  { field: "cInboundNo2", headerName: "入库标识2", width: 125 },
  { field: "cInboundNo3", headerName: "入库标识3", width: 125 },
  { field: "cInboundNo4", headerName: "入库标识4", width: 125 },
  { field: "cInboundNo5", headerName: "入库标识5", width: 125 },
  { field: "cInboundNo6", headerName: "入库标识6", width: 125 },
  { field: "cOrderCustCname", headerName: "订货客户中文名称", width: 164 },
  { field: "cSpecialMarkGy", headerName: "工艺/性能要求", width: 151 },
  { field: "nDbc", headerName: "倍尺", width: 86 },
  { field: "lastModifier", headerName: "最后修改人", width: 125 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 138 },
  { field: "cIsMatchOrder", headerName: "是否满足订单要求", width: 164 },
  { field: "nTransferNo", headerName: "吊号", width: 86 },
  { field: "cStackNum", headerName: "层号", width: 86 },
];
const p4Order: { field: string; pinned?: boolean }[] = [
  { field: "cIsMatchOrder", pinned: true },
  { field: "cOrderNo", pinned: true },
  { field: "cStove", pinned: true },
  { field: "cBatchNo", pinned: true },
  { field: "cPieceNo", pinned: true },
  { field: "cPieceNoSlab", pinned: true },
  { field: "cSpec", pinned: true },
  { field: "cSgCode", pinned: true },
  { field: "nKSgCode", pinned: false },
  { field: "cSgStd", pinned: false },
  { field: "cInboundNo", pinned: false },
  { field: "typeValues", pinned: false },
  { field: "nWgt", pinned: false },
  { field: "cCusName", pinned: false },
  { field: "cWgtToler", pinned: false },
  { field: "cDestination", pinned: false },
  { field: "cCutFlag", pinned: false },
  { field: "cArer", pinned: false },
  { field: "cStackNo", pinned: false },
  { field: "nStackNum", pinned: false },
  { field: "cInUser", pinned: false },
  { field: "dInTime", pinned: false },
  { field: "dOutTime", pinned: false },
  { field: "cOutUser", pinned: false },
  { field: "lastModifier", pinned: false },
  { field: "lastModifyTime", pinned: false },
  { field: "nQmLevel", pinned: false },
  { field: "nQmStatus", pinned: false },
  { field: "cSurfaceResult", pinned: false },
  { field: "cDetectResultCode", pinned: false },
  { field: "cSampleLotNo", pinned: false },
  { field: "cAutoJudgeResult", pinned: false },
  { field: "cJudgeUser", pinned: false },
  { field: "dJudgeTime", pinned: false },
  { field: "cJudgeResult", pinned: false },
  { field: "cJudgeRemark", pinned: false },
  { field: "cStatus", pinned: false },
  { field: "cRecheckFlag", pinned: false },
  { field: "cComplexDecideCode", pinned: false },
  { field: "cSurfaceDefectCode", pinned: false },
  { field: "nLockReason", pinned: false },
  { field: "cSurfaceDesc", pinned: false },
  { field: "cProRemark", pinned: false },
  { field: "nThick", pinned: false },
  { field: "nWth", pinned: false },
  { field: "nLen", pinned: false },
];
const slabOrder: { field: string; pinned?: boolean }[] = [
  { field: "cStackNo", pinned: true },
  { field: "nStackNum", pinned: true },
  { field: "cPieceNo", pinned: true },
  { field: "cSgCode", pinned: true },
  { field: "nThick", pinned: true },
  { field: "nWth", pinned: true },
  { field: "nLen", pinned: true },
  { field: "cPrintCode", pinned: false },
  { field: "nQmStatus", pinned: false },
  { field: "nLockReason", pinned: false },
  { field: "cStove", pinned: true },
  { field: "nWgt", pinned: false },
  { field: "nStatus", pinned: false },
  { field: "dProTime", pinned: false },
  { field: "cOrderNo", pinned: false },
  { field: "pLAN_NThickPlan", pinned: false },
  { field: "pLAN_NWidthPlan", pinned: false },
  { field: "pLAN_NLlCleanLen", pinned: false },
  { field: "nDbc", pinned: false },
  { field: "cCutFlag", pinned: false },
  { field: "cPlanTime", pinned: false },
  { field: "cProRemark", pinned: false },
  { field: "cSurfaceDesc", pinned: false },
  { field: "nKSgCode", pinned: false },
  { field: "cSgStd", pinned: false },
  { field: "cSpec", pinned: false },
  { field: "cInUser", pinned: false },
  { field: "dInTime", pinned: false },
  { field: "lastModifier", pinned: false },
  { field: "lastModifyTime", pinned: false },
  { field: "cSurfaceResult", pinned: false },
  { field: "cDetectResultCode", pinned: false },
  { field: "cComplexDecideCode", pinned: false },
  { field: "cSurfaceDefectCode", pinned: false },
  { field: "pLAN_COrderNo1", pinned: false },
  { field: "pLAN_COrderNo2", pinned: false },
  { field: "pLAN_COrderNo3", pinned: false },
  { field: "pLAN_COrderNo4", pinned: false },
  { field: "pLAN_NLenPlan1", pinned: false },
  { field: "pLAN_NLenPlan2", pinned: false },
  { field: "pLAN_NLenPlan3", pinned: false },
  { field: "pLAN_NLenPlan4", pinned: false },
  { field: "cInboundNo1", pinned: false },
  { field: "cInboundNo2", pinned: false },
  { field: "cInboundNo3", pinned: false },
  { field: "cInboundNo4", pinned: false },
  { field: "pLAN_CSpec", pinned: false },
];
const modeOrder = qsNProType === NProTypeEnum.C ? p4Order : slabOrder;
const modeFields = new Set(modeOrder.map((c) => c.field));
const modeCols: ColDef[] = modeOrder
  .filter((c) => allStorageCols.some((a) => a.field === c.field))
  .map((c) => {
    const base = allStorageCols.find((a) => a.field === c.field)!;
    return {
      ...base,
      ...(c.pinned ? { pinned: "left" as const } : {}),
      ...(base.field === "cSurfaceResult" || base.field === "cDetectResultCode"
        ? { valueFormatter: surfaceResultFmt }
        : {}),
    };
  });
const restCols: ColDef[] = allStorageCols
  .filter((a) => a.field != null && !modeFields.has(a.field))
  .map((a) => ({
    ...a,
    hide: true,
    ...(a.field === "nProType" ? { valueFormatter: nProTypeFmt } : {}),
    ...(a.field === "cLineCode" ? { valueFormatter: lineFmt } : {}),
  }));
const storageColDefs: ColDef[] = [...modeCols, ...restCols];

/* ---------- 判定记录表列（原 gvTql1050Record 按 VisibleIndex；Selected 由行选择承担） ---------- */
const recordColDefs: ColDef[] = [
  { field: "cStove", headerName: "炉号", width: 86, pinned: "left" },
  { field: "cPieceNo", headerName: "头侧件次号", width: 112, pinned: "left" },
  { field: "cSlabPieceNo", headerName: "板坯号", width: 99, pinned: "left" },
  { field: "cIsDisable", headerName: "作废标记", width: 112, pinned: "left" },
  { field: "cSgCode", headerName: "钢种", width: 86 },
  { field: "cInboundNo", headerName: "入库标识", width: 112 },
  { field: "cSgStd", headerName: "执行标准", width: 112 },
  { field: "cSpec", headerName: "规格", width: 86 },
  { field: "nNum", headerName: "提货件数", width: 99 },
  { field: "nCalWgt", headerName: "理重", width: 86 },
  { field: "cDetectResultCode", headerName: "探伤判定结果", width: 138, valueFormatter: surfaceResultFmt },
  { field: "cDetectDefectLevel", headerName: "探伤等级", width: 112 },
  { field: "cSurfaceUser", headerName: "表面判定人", width: 125 },
  { field: "dSurfaceTime", headerName: "表面判定时间", width: 138 },
  { field: "cShiftNo", headerName: "结果录入班次", width: 138 },
  { field: "cGroupNo", headerName: "结果录入班组", width: 138 },
  { field: "cLineCode", headerName: "产线", width: 86, valueFormatter: lineFmt },
  { field: "nProType", headerName: "库存类型", width: 112, valueFormatter: nProTypeFmt },
  { field: "nThick", headerName: "坯厚", width: 86 },
  { field: "nWth", headerName: "宽度", width: 86 },
  { field: "nLen", headerName: "坯长", width: 86 },
  { field: "nWgt", headerName: "坯重", width: 86 },
  { field: "cDefectDefectMark", headerName: "探伤判定缺陷描述", width: 164 },
  { field: "cOrderNo", headerName: "订单号", width: 99 },
  { field: "id", headerName: "主键", width: 86, hide: true },
  { field: "creator", headerName: "创建人", width: 99, hide: true },
  { field: "createTime", headerName: "创建时间", width: 138, hide: true },
  { field: "lastModifier", headerName: "最后修改人", width: 125, hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 138, hide: true },
];

/* ---------- 事件（原 btnQueryStorage / btnPD / btnQueryRecord / btnDisable） ---------- */
async function onQueryStorage() {
  storageLoading.value = true;
  try {
    storageRows.value =
      (await tql1060Api.queryStorage({
        lineCode: storageQuery.lineCode,
        stove: storageQuery.stove.trim(),
        pieceNo: storageQuery.pieceNo.trim(),
        nProType: qsNProType as NProTypeEnum,
        timeRange: toTimeRange(storageQuery.dates),
      })) ?? [];
    autosizeLater();
  } catch {
    /* 拦截层已 toast */
  } finally {
    storageLoading.value = false;
  }
}

async function onQueryRecord() {
  recordLoading.value = true;
  try {
    recordRows.value =
      (await tql1060Api.queryRecord({
        lineCode: qsLineCode,
        nProType: qsNProType as NProTypeEnum,
        timeRange: toTimeRange(recordQuery.dates),
        stove: recordQuery.stove.trim(),
        pieceNo: recordQuery.pieceNo.trim(),
      })) ?? [];
    autosizeLater();
  } catch {
    /* 拦截层已 toast */
  } finally {
    recordLoading.value = false;
  }
}

function onDetectJudge() {
  const selected = (storageApi.value?.getSelectedRows() ?? []) as Tyd2000Dto[];
  if (selected.length === 0) {
    toast("请勾选需要判定的材料后在操作", 2000, "warn");
    return;
  }
  // 原 new FrmQZ6004(tyds).ShowDialog()：二级弹窗待接入（见来源注释）
  toast("探伤判定弹窗（FrmQZ6004）待接入", 2000, "warn");
}

/* ---------- ShowYesNo 受控确认（原 btnDisable_Click） ---------- */
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

function onDisable() {
  const selected = (recordApi.value?.getSelectedRows() ?? []) as any[];
  const ids = selected
    .filter((w) => w.cIsDisable === "N")
    .map((w) => w.id)
    .filter((id): id is string => !!id);
  if (ids.length === 0) {
    toast("请勾选要作废的数据", 2000, "warn");
    return;
  }
  askConfirm("请确定作废判定记录？作废不影响现有判定结果", async () => {
    try {
      await tql1060Api.setDisable(ids);
    } catch {
      return; /* 拦截层已 toast，失败不重载 */
    }
    await onQueryRecord();
  });
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件（原 dataLayoutControl2 Dock=Top：产线/炉号/件次号/产出时间） -->
    <div class="shrink-0 border-b border-border/60 px-2 py-1.5">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产线</label>
          <Select
            v-model="storageQuery.lineCode"
            :options="lineOptions"
            option-label="label"
            option-value="value"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
          <InputText v-model="storageQuery.stove" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">件次号</label>
          <InputText v-model="storageQuery.pieceNo" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产出时间</label>
          <DatePicker
            v-model="storageQuery.dates"
            selection-mode="range"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-icon
            class="min-w-0 flex-1"
          />
        </div>
      </div>
    </div>

    <!-- 工具栏（原 stackPanel1，Dock=Top：查询 + 探伤判定） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="storageLoading" @click="onQueryStorage">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onDetectJudge">
        <IconCheck class="h-3 w-3" />探伤判定
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">中厚板探伤判定</span>
    </div>

    <!-- 上下分栏（原 splitContainerControl1 上下 SplitterPosition 343：上=库存 ucStorage1，下=stackPanel2+判定记录） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="43" :minSize="15" class="flex min-h-0 flex-col">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
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
            :suppress-column-virtualisation="true"
            :pagination="false"
            :animate-rows="false"
            :loading="storageLoading"
            @grid-ready="onStorageReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :size="57" :minSize="15" class="flex min-h-0 flex-col">
        <!-- 记录查询条（原 stackPanel2 Dock=Top：时间范围/炉号/材料号/查询/作废） -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <DatePicker
            v-model="recordQuery.dates"
            selection-mode="range"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-icon
            placeholder="时间范围"
            class="w-64 shrink-0"
          />
          <InputText v-model="recordQuery.stove" placeholder="请输入搜索炉号" class="w-44 shrink-0" />
          <InputText v-model="recordQuery.pieceNo" placeholder="请输入搜索材料号" class="w-44 shrink-0" />
          <Button text class="shrink-0 whitespace-nowrap" :loading="recordLoading" @click="onQueryRecord">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDisable">
            <IconTrash class="h-3 w-3" />作废
          </Button>
          <span class="ml-auto text-xs text-muted-foreground">判定记录（{{ recordRows.length }}）</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="recordColDefs"
            :row-data="recordRows"
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
            :loading="recordLoading"
            @grid-ready="onRecordReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>

    <!-- 确认（对应原 MsgBox.ShowYesNo("请确定作废判定记录？作废不影响现有判定结果")） -->
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
  </div>
</template>
