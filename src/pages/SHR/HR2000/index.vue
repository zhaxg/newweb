<script setup lang="ts">
/** 对应 FrmHR2000（轧钢日计划管理）：DDH.Winforms.SHR.Forms.FrmHR2000
 *  已接入：tmp2020Api.queryPlans / hR2000Api.queryThr2000Dtos / addPlans / closeThr2000s
 *  待接入：订单导入 btnImport（原 DevExpress Excel 导入 ImportHR2000Dto → importHR2000，web 暂无 xlsx 解析设施）
 *  偏差：上表拖拽排序（原 GridViewDragDropHelper）以 AG Grid rowDrag 复刻，仅本地重排序号后随「添加」提交；
 *        订单号含-B 或 合同备注含「加急」整行标红（原 gridView2 RowStyle）；colCSteelType/colCTrimFlag KV 翻译缺省显示原值；
 *        批量计划号原 MemoExEdit → Widgets/BatchIdInput（label=批量计划号） */

import { computed, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";
import BatchIdInput from "@/pages/Widgets/BatchIdInput/index.vue";
import { parseBatchIds } from "@/pages/Widgets/BatchIdInput/parse";
import { AgGridVue } from "ag-grid-vue3";
import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  RowClassParams,
  RowDragEndEvent,
  ValueFormatterParams,
} from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { tmp2020Api, type ZgPlanDto } from "@/api/mes4ddh/smp.swagger";
import { hR2000Api, Thr2000StatusEnum, type Thr2000Dto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { parts: menuQs } = useMenuQuery();
const cLineCode = menuQs[0] ?? "ZG01";

/* ---------- 时间（默认本月） ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
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

/* ---------- 上表查询条件（InputTmp2020Dto；规格原控件未绑定数据源，仅画面占位） ---------- */
const tmpInput = reactive({
  cOrderNo: "",
  cSgCode: "",
  cSpec: "",
  nStatus: 10 as number | null,
  dates: monthRange() as Date[] | null,
});
/* 计划状态（原 NStatusTextEdit AddEnum(PlanStatusEnum)） */
const tmpStatusOptions = [
  { label: "未下发", value: 0 },
  { label: "已下发", value: 10 },
  { label: "已生成日计划", value: 20 },
  { label: "关闭", value: 40 },
];

/* ---------- 下表查询条件（DtoQueryThr2000） ---------- */
const dayInput = reactive({
  cOrderNo: "",
  orders: "",
  cPieceNo: "",
  nStatus: Thr2000StatusEnum.Open as number,
  dates: monthRange() as Date[] | null,
});
const dayStatusOptions = [
  { label: "已开启", value: Thr2000StatusEnum.Open },
  { label: "已关闭", value: Thr2000StatusEnum.Close },
];
const addRemark = ref("");
const closeReason = ref("");

/* ---------- 批量计划号：Widgets/BatchIdInput（原 MemoExEdit）；查询时 parseBatchIds 拆串 ---------- */
const parseOrderList = parseBatchIds;

/* ---------- 上表：轧钢计划（gridView1 / ZgPlanDto，勾选=Selected，可拖拽排序） ---------- */
const tmpRows = ref<ZgPlanDto[]>([]);
const tmpLoading = ref(false);
const tmpApi = ref<GridApi | null>(null);
let nOrderMin = 0;
function onTmpReady(e: GridReadyEvent) {
  tmpApi.value = e.api;
}

/* 原 InitDrop：拖拽后按当前顺序从最小序号起重排 NOrder */
function onTmpRowDragEnd(e: RowDragEndEvent) {
  const rows: ZgPlanDto[] = [];
  e.api.forEachNodeAfterFilterAndSort((n) => rows.push(n.data as ZgPlanDto));
  rows.forEach((r, i) => {
    r.nOrder = nOrderMin + i;
  });
  tmpRows.value = [...rows];
}

/* ---------- 下表：日计划（gridView2 / Thr2000Dto，勾选=Selected） ---------- */
const dayRows = ref<Thr2000Dto[]>([]);
const dayLoading = ref(false);
const dayApi = ref<GridApi | null>(null);
function onDayReady(e: GridReadyEvent) {
  dayApi.value = e.api;
}

/* ---------- 列定义 ---------- */
const planStatusFmt = (p: ValueFormatterParams) =>
  (({ 0: "未下发", 10: "已下发", 20: "已生成日计划", 40: "关闭" }) as Record<string, string>)[String(p.value)] ?? "";
const dayStatusFmt = (p: ValueFormatterParams) =>
  (
    ({ [String(Thr2000StatusEnum.Open)]: "已开启", [String(Thr2000StatusEnum.Close)]: "已关闭" }) as Record<
      string,
      string
    >
  )[String(p.value)] ?? "";
const coolFmt = (p: ValueFormatterParams) =>
  (({ N: "热坯", Y: "冷坯" }) as Record<string, string>)[String(p.value)] ?? "";
const lengthTypeFmt = (p: ValueFormatterParams) =>
  (({ F: "范围尺", D: "定尺" }) as Record<string, string>)[String(p.value)] ?? "";
const orderRedClass = (p: { value: unknown }) => (String(p.value ?? "").includes("-B") ? "cell-danger" : "");

const tmpColDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
  { colId: "nOrder", field: "nOrder", headerName: "生产顺序", width: 112, rowDrag: true },
  { colId: "cPlanTime", field: "cPlanTime", headerName: "计划日期", width: 112 },
  { colId: "cCool", field: "cCool", headerName: "是否冷坯计划", width: 125, valueFormatter: coolFmt },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140 },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 120 },
  { colId: "cOrderNo1", field: "cOrderNo1", headerName: "订单号1", width: 112, cellClass: orderRedClass },
  { colId: "cOrderNo2", field: "cOrderNo2", headerName: "订单号2", width: 112, cellClass: orderRedClass },
  { colId: "cOrderNo3", field: "cOrderNo3", headerName: "订单号3", width: 112, cellClass: orderRedClass },
  { colId: "cOrderNo4", field: "cOrderNo4", headerName: "订单号4", width: 112, cellClass: orderRedClass },
  { colId: "nLenTq1", field: "nLenTq1", headerName: "套切1", width: 112 },
  { colId: "nLenTq2", field: "nLenTq2", headerName: "套切2", width: 112 },
  { colId: "nLenTq3", field: "nLenTq3", headerName: "套切3", width: 112 },
  { colId: "nLenTq4", field: "nLenTq4", headerName: "套切4", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112 },
  { colId: "nPlanedWgt", field: "nPlanedWgt", headerName: "计划重量", width: 112 },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 112 },
  { colId: "nThickMin", field: "nThickMin", headerName: "厚度下限", width: 164 },
  { colId: "nThickMax", field: "nThickMax", headerName: "厚度上限", width: 164 },
  { colId: "nWidth", field: "nWidth", headerName: "宽度", width: 112 },
  { colId: "nWidthMin", field: "nWidthMin", headerName: "宽度下限", width: 220 },
  { colId: "nWidthMax", field: "nWidthMax", headerName: "宽度上限", width: 220 },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 112 },
  { colId: "cLengthType", field: "cLengthType", headerName: "长度类型", width: 112, valueFormatter: lengthTypeFmt },
  { colId: "nLenMin", field: "nLenMin", headerName: "长度下限", width: 112 },
  { colId: "nLenMax", field: "nLenMax", headerName: "长度上限", width: 112 },
  { colId: "cSteelType", field: "cSteelType", headerName: "钢类", width: 112 },
  { colId: "cProdCode", field: "cProdCode", headerName: "品名代码", width: 112 },
  { colId: "nDbc", field: "nDbc", headerName: "倍尺", width: 112 },
  { colId: "nNum", field: "nNum", headerName: "订货件数", width: 112 },
  { colId: "cSlabSource", field: "cSlabSource", headerName: "供坯单位", width: 112 },
  { colId: "cTlSgCode", field: "cTlSgCode", headerName: "炼钢钢种", width: 112 },
  { colId: "cTlSgStd", field: "cTlSgStd", headerName: "炼钢标准", width: 112 },
  { colId: "cSlabSize", field: "cSlabSize", headerName: "钢坯规格", width: 112 },
  { colId: "nSlabThick", field: "nSlabThick", headerName: "坯厚", width: 112 },
  { colId: "nSlabWidth", field: "nSlabWidth", headerName: "坯宽", width: 112 },
  { colId: "nSlabLen", field: "nSlabLen", headerName: "冷态坯长", width: 112 },
  { colId: "nSlabQua", field: "nSlabQua", headerName: "计划生产钢坯块数", width: 112 },
  { colId: "nWgtUnit", field: "nWgtUnit", headerName: "钢坯单重", width: 138 },
  { colId: "nRate", field: "nRate", headerName: "理论成材率", width: 112 },
  { colId: "nSlabWgt", field: "nSlabWgt", headerName: "生产钢坯重量", width: 112 },
  { colId: "cDelivyStatusCode", field: "cDelivyStatusCode", headerName: "交货状态", width: 112 },
  { colId: "cCustStdCode", field: "cCustStdCode", headerName: "加工用途代码", width: 125 },
  { colId: "cOrderCustNo", field: "cOrderCustNo", headerName: "订货客户编码", width: 125 },
  { colId: "cOrderCustCname", field: "cOrderCustCname", headerName: "订货客户中文名称", width: 112 },
  { colId: "cExportFlag", field: "cExportFlag", headerName: "出口标志", width: 112 },
  { colId: "dOrderTime", field: "dOrderTime", headerName: "订单日期", width: 140 },
  { colId: "dJhqTime", field: "dJhqTime", headerName: "合同交货期", width: 140 },
  { colId: "cConRemark", field: "cConRemark", headerName: "合同备注", width: 112 },
  { colId: "cSpecialMarkGy", field: "cSpecialMarkGy", headerName: "工艺/性能要求", width: 112 },
  { colId: "cWarrantyDesc", field: "cWarrantyDesc", headerName: "质保书要求", width: 125 },
  { colId: "cPackCode", field: "cPackCode", headerName: "特殊包装要求", width: 138 },
  { colId: "cDelivyQtyFlag", field: "cDelivyQtyFlag", headerName: "计重方式", width: 112 },
  { colId: "cDeptCode", field: "cDeptCode", headerName: "部门编码", width: 112 },
  { colId: "nFlag", field: "nFlag", headerName: "计划类型", width: 112 },
  { colId: "cProdName", field: "cProdName", headerName: "品名名称", width: 112 },
  { colId: "cDelivyStatusDesc", field: "cDelivyStatusDesc", headerName: "交货状态说明", width: 138 },
  { colId: "cCustStdDesc", field: "cCustStdDesc", headerName: "加工用途说明", width: 138 },
  { colId: "nWtMax", field: "nWtMax", headerName: "单量上限", width: 112 },
  { colId: "nWtMin", field: "nWtMin", headerName: "单量下限", width: 112 },
  { colId: "nWidthWgt", field: "nWidthWgt", headerName: "边部宽度余量", width: 112 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式:四切", width: 112 },
  { colId: "cFlawDesc", field: "cFlawDesc", headerName: "探伤等级", width: 112 },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 112 },
  { colId: "cTol", field: "cTol", headerName: "公差", width: 112 },
  { colId: "cOverstepBl", field: "cOverstepBl", headerName: "短溢装比例", width: 125 },
  { colId: "cInboundNo", field: "cInboundNo", headerName: "入库标识", width: 112 },
  { colId: "cShape", field: "cShape", headerName: "形状代码", width: 112 },
  { colId: "cSlabRemark", field: "cSlabRemark", headerName: "提料备注", width: 112 },
  { colId: "nBoarCleanLen", field: "nBoarCleanLen", headerName: "母板净长", width: 112 },
  { colId: "nLlCleanLen", field: "nLlCleanLen", headerName: "理论毛长", width: 112 },
  { colId: "nPlanBoarLen", field: "nPlanBoarLen", headerName: "计划母板长", width: 125 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 120, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 140, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112, hide: true },
  { colId: "nStatus", field: "nStatus", headerName: "订单状态", width: 112, hide: true, valueFormatter: planStatusFmt },
  { colId: "cIsMerge", field: "cIsMerge", headerName: "是否合并提料", width: 125, hide: true },
  { colId: "cOrderCustEname", field: "cOrderCustEname", headerName: "订货客户英文名称", width: 164, hide: true },
  { colId: "cProductH", field: "cProductH", headerName: "重点品种", width: 112, hide: true },
  { colId: "cOrderTypeCode", field: "cOrderTypeCode", headerName: "合同性质QAA期货", width: 112, hide: true },
  { colId: "cTlOrderFlag", field: "cTlOrderFlag", headerName: "是否提料订单", width: 112, hide: true },
  { colId: "cStNo", field: "cStNo", headerName: "炼钢工艺卡", width: 112, hide: true },
];

const dayColDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
  { colId: "nOrder", field: "nOrder", headerName: "生产顺序", width: 112 },
  { colId: "cPlanTime", field: "cPlanTime", headerName: "计划日期", width: 112 },
  { colId: "cCool", field: "cCool", headerName: "是否冷坯计划", width: 125, valueFormatter: coolFmt },
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
  { colId: "nStatus", field: "nStatus", headerName: "计划状态", width: 112, hide: true, valueFormatter: dayStatusFmt },
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

/* 原 gridView2_RowStyle：订单号1~4 含 -B 或 合同备注含「加急」整行红 */
function dayRowStyle(p: RowClassParams<Thr2000Dto>) {
  const r = p.data;
  if (!r) return undefined;
  const hit =
    [r.cOrderNo1, r.cOrderNo2, r.cOrderNo3, r.cOrderNo4].some((v) => String(v ?? "").includes("-B")) ||
    String(r.cConRemark ?? "").includes("加急");
  return hit ? { backgroundColor: "#fee2e2", color: "#b91c1c" } : undefined;
}

/* ---------- 查询 ---------- */
async function queryTmp() {
  tmpLoading.value = true;
  try {
    const list =
      (await tmp2020Api.queryPlans({
        cLineCode,
        cOrderNo: tmpInput.cOrderNo.trim() || undefined,
        cSgCode: tmpInput.cSgCode.trim() || undefined,
        nStatus: tmpInput.nStatus ?? undefined,
        timeRange: toTimeRange(tmpInput.dates),
      })) ?? [];
    tmpRows.value = list;
    nOrderMin = list.length ? Math.min(...list.map((x) => x.nOrder ?? 0)) : 0;
    requestAnimationFrame(() => tmpApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    tmpLoading.value = false;
  }
}

async function queryDay() {
  dayLoading.value = true;
  try {
    const orders = parseOrderList(dayInput.orders);
    const list =
      (await hR2000Api.queryThr2000Dtos({
        cLineCode,
        cOrderNo: dayInput.cOrderNo.trim() || undefined,
        cOrderNos: orders.length ? orders : [],
        cPieceNo: dayInput.cPieceNo.trim() || undefined,
        nStatus: dayInput.nStatus,
        dTimeRange: toTimeRange(dayInput.dates),
      })) ?? [];
    dayRows.value = list;
    requestAnimationFrame(() => dayApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    dayLoading.value = false;
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

/* ---------- 添加日计划 ---------- */
async function doAdd() {
  const sel = (tmpApi.value?.getSelectedRows() ?? []) as ZgPlanDto[];
  const plans = sel.map((x) => ({ cOrderId: x.id, nOrder: Number(x.nOrder ?? 0) }));
  try {
    await hR2000Api.addPlans(cLineCode, addRemark.value || undefined, plans);
    toast("数据保存成功！", 2000, "success");
    await queryTmp();
    await queryDay();
  } catch {
    /* 拦截层已 toast */
  }
}
function btnAdd() {
  if (tmpRows.value.length === 0) {
    toast("请选择要添加的轧钢计划！", 2000, "warn");
    return;
  }
  const sel = (tmpApi.value?.getSelectedRows() ?? []) as ZgPlanDto[];
  if (sel.length === 0) {
    toast("请勾选要添加的轧钢计划！", 2000, "warn");
    return;
  }
  askConfirm("是否确认批量添加勾选轧钢计划的日计划？", doAdd);
}

/* ---------- 关闭日计划 ---------- */
async function doClose() {
  const sel = (dayApi.value?.getSelectedRows() ?? []) as Thr2000Dto[];
  const ids = sel.map((x) => x.id).filter((x): x is string => !!x);
  try {
    await hR2000Api.closeThr2000s(closeReason.value || undefined, ids);
    toast("日计划关闭成功！", 2000, "success");
    await queryTmp();
    await queryDay();
  } catch {
    /* 拦截层已 toast */
  }
}
function btnClose() {
  if (dayRows.value.length === 0) {
    toast("请勾选日计划再操作！", 2000, "warn");
    return;
  }
  const sel = (dayApi.value?.getSelectedRows() ?? []) as Thr2000Dto[];
  if (sel.length === 0) {
    toast("请勾选日计划再操作！", 2000, "warn");
    return;
  }
  askConfirm("是否确认关闭勾选的日计划？", doClose);
}

function btnImport() {
  // 原 DevExpress Excel 导入（ImportHR2000Dto → hR2000Api.importHR2000），web 暂无 xlsx 解析设施
  toast("订单导入（Excel）待接入", 2500, "warn");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 上下分栏：原 split1 494/1055 ≈ 47% -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="47" :minSize="20" class="flex flex-col overflow-hidden">
        <!-- 上：轧钢计划查询条件（6 项一行：label 统一 w-16，时间区间 col-span-2） -->
        <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">提料计划号</label>
            <InputText v-model="tmpInput.cOrderNo" class="min-w-0 flex-1" @keydown.enter="queryTmp" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
            <InputText v-model="tmpInput.cSgCode" class="min-w-0 flex-1" @keydown.enter="queryTmp" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">规格</label>
            <InputText v-model="tmpInput.cSpec" class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">状态</label>
            <Select
              v-model="tmpInput.nStatus"
              :options="tmpStatusOptions"
              option-label="label"
              option-value="value"
              class="min-w-0 flex-1"
            />
          </div>
          <div class="col-span-2 flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">时间区间</label>
            <DatePicker
              v-model="tmpInput.dates"
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
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="tmpLoading" @click="queryTmp">
            <IconSearch class="h-3 w-3" />查询
          </Button>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="tmpColDefs"
            :row-data="tmpRows"
            :row-selection="{
              mode: 'multiRow',
              checkboxes: true,
              headerCheckbox: true,
              enableClickSelection: true,
              enableSelectionWithoutKeys: true,
            }"
            :row-drag-multi-select="false"
            :pagination="false"
            :animate-rows="false"
            :loading="tmpLoading"
            @grid-ready="onTmpReady"
            @row-drag-end="onTmpRowDragEnd"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :minSize="20" class="flex flex-col overflow-hidden">
        <!-- 下：日计划查询条件（6 项一行：批量计划号占 1 列，弹出编辑） -->
        <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">提料计划号</label>
            <InputText v-model="dayInput.cOrderNo" class="min-w-0 flex-1" @keydown.enter="queryDay" />
          </div>
          <BatchIdInput v-model="dayInput.orders" label="批量计划号" />
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">熔炼号</label>
            <InputText v-model="dayInput.cPieceNo" class="min-w-0 flex-1" @keydown.enter="queryDay" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">计划状态</label>
            <Select
              v-model="dayInput.nStatus"
              :options="dayStatusOptions"
              option-label="label"
              option-value="value"
              class="min-w-0 flex-1"
            />
          </div>
          <div class="col-span-2 flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">时间区间</label>
            <DatePicker
              v-model="dayInput.dates"
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
        <!-- 工具栏：查询/关闭+关闭原因 ｜ 添加+备注/订单导入 -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="dayLoading" @click="queryDay">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <label class="ml-2 shrink-0 text-xs text-muted-foreground">关闭原因</label>
          <InputText v-model="closeReason" class="w-40 shrink-0" />
          <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="btnClose"
            >关闭</Button
          >
          <span class="mx-3 h-5 w-px shrink-0 bg-border/60" />
          <label class="shrink-0 text-xs text-muted-foreground">备注</label>
          <InputText v-model="addRemark" class="w-40 shrink-0" />
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="btnAdd">添加</Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="btnImport">订单导入</Button>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="dayColDefs"
            :row-data="dayRows"
            :row-selection="{
              mode: 'multiRow',
              checkboxes: true,
              headerCheckbox: true,
              enableClickSelection: true,
              enableSelectionWithoutKeys: true,
            }"
            :get-row-style="dayRowStyle"
            :pagination="false"
            :animate-rows="false"
            :loading="dayLoading"
            @grid-ready="onDayReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>

    <Dialog
      :visible="confirmOpen"
      modal
      header="确认"
      :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event"
    >
      <p class="text-xs">{{ confirmMsg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" variant="outlined" @click="onConfirmOk" />
      </template>
    </Dialog>
  </div>
</template>
