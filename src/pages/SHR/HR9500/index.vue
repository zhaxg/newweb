<script setup lang="ts">
/** 对应 FrmHR9500（销售订单跟踪查询）：DDH.Winforms.SHR.Forms.FrmHR9500
 *  已接入：hR9500Api.queryOrderGz / queryOrderKc（焦点行取订单库存，7 页签按 nProType/状态/库区 过滤同一缓存）
 *  偏差：产线/库区/班次/班组/状态等 KV/枚举列显示原值 */
import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import {
  hR9500Api,
  InventoryStatusEnum,
  NProTypeEnum,
  type QueryOrderDto,
  type TimeRange,
  type Tmp2000HzDto,
  type Tyd2000OrderDto,
} from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { parts: menuQs } = useMenuQuery();

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}
function monthRange(): Date[] {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  last.setSeconds(last.getSeconds() - 1);
  return [first, last];
}

const input = reactive({
  cOrderNo: "",
  cSgCode: "",
  cSgStd: "",
  cCustName: "",
  cInboundNo: "",
  dates: monthRange() as Date[] | null,
});

/* ---------- 上：销售订单列表 ---------- */
const rows = shallowRef<Tmp2000HzDto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}
const colDefs: ColDef[] = [
  /*  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 150 },
  { colId: "cInboundNo", field: "cInboundNo", headerName: "入库标识", width: 150 },
  { colId: "nFlag", field: "nFlag", headerName: "计划类型", width: 150 },
  { colId: "nStatus", field: "nStatus", headerName: "订单状态", width: 150 },
  { colId: "cExitem1", field: "cExitem1", headerName: "是否工程单", width: 150 },
  { colId: "isTl", field: "isTl", headerName: "是否已提料", width: 150 },
  { colId: "isDaliy", field: "isDaliy", headerName: "是否生成日计划", width: 150 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 150 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 150 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 150 },
  { colId: "nNum", field: "nNum", headerName: "订货件数", width: 150 },
  { colId: "nWgt", field: "nWgt", headerName: "订单重量", width: 150 },
  { colId: "nQuaLg", field: "nQuaLg", headerName: "炼钢产出块数", width: 150 },
  { colId: "nWgtLg", field: "nWgtLg", headerName: "炼钢产出重量", width: 150 },
  { colId: "nQuaZz", field: "nQuaZz", headerName: "轧制完成块数", width: 150 },
  { colId: "nWgtZz", field: "nWgtZz", headerName: "轧制完成重量", width: 150 },
  { colId: "nQuaDl", field: "nQuaDl", headerName: "堆冷中块数", width: 150 },
  { colId: "nWgtDl", field: "nWgtDl", headerName: "堆冷中重量", width: 150 },
  { colId: "nQuaJh", field: "nQuaJh", headerName: "计划生产块数", width: 150 },
  { colId: "nQuaYxFjh", field: "nQuaYxFjh", headerName: "允许非计划块数", width: 150 },
  { colId: "nQuaJq", field: "nQuaJq", headerName: "剪切完成块数", width: 150 },
  { colId: "nWgtJq", field: "nWgtJq", headerName: "剪切完成重量", width: 150 },
  { colId: "nQuaCc", field: "nQuaCc", headerName: "超长块数", width: 150 },
  { colId: "nQuaDc", field: "nQuaDc", headerName: "短尺块数", width: 150 },
  { colId: "nPerFjh", field: "nPerFjh", headerName: "非计划比例", width: 150 },
  { colId: "nQuaJz", field: "nQuaJz", headerName: "精整中块数", width: 150 },
  { colId: "nWgtJz", field: "nWgtJz", headerName: "精整中重量", width: 150 },
  { colId: "nQuaCp", field: "nQuaCp", headerName: "成品入库块数", width: 150 },
  { colId: "nWgtCp", field: "nWgtCp", headerName: "成品入库重量", width: 150 },
  { colId: "nQuaFh", field: "nQuaFh", headerName: "发货块数", width: 150 },
  { colId: "nWgtFh", field: "nWgtFh", headerName: "发货重量", width: 150 },
  { colId: "nThick", field: "nThick", headerName: "厚度目标值", width: 150 },
  { colId: "nThickMin", field: "nThickMin", headerName: "厚度下限", width: 150 },
  { colId: "nThickMax", field: "nThickMax", headerName: "厚度上限", width: 150 },
  { colId: "nWidth", field: "nWidth", headerName: "宽度目标值", width: 150 },
  { colId: "nWidthMin", field: "nWidthMin", headerName: "宽度下限", width: 150 },
  { colId: "nWidthMax", field: "nWidthMax", headerName: "宽度上限", width: 150 },
  { colId: "nLen", field: "nLen", headerName: "长度目标值", width: 150 },
  { colId: "cLengthType", field: "cLengthType", headerName: "长度类型", width: 150 },
  { colId: "nLenMin", field: "nLenMin", headerName: "长度下限", width: 150 },
  { colId: "nLenMax", field: "nLenMax", headerName: "长度上限", width: 150 },
  { colId: "cSteelType", field: "cSteelType", headerName: "钢类", width: 150 },
  { colId: "cProdCode", field: "cProdCode", headerName: "品名代码", width: 150 },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 150 },
  { colId: "nDbc", field: "nDbc", headerName: "单倍尺", width: 150 },
  { colId: "cDelivyStatusCode", field: "cDelivyStatusCode", headerName: "交货状态", width: 150 },
  { colId: "cCustStdCode", field: "cCustStdCode", headerName: "加工用途代码", width: 150 },
  { colId: "cOrderCustNo", field: "cOrderCustNo", headerName: "订货客户编码", width: 150 },
  { colId: "cOrderCustCname", field: "cOrderCustCname", headerName: "订货客户中文名称", width: 150 },
  { colId: "cOrderCustEname", field: "cOrderCustEname", headerName: "结算单位", width: 150 },
  { colId: "cProductH", field: "cProductH", headerName: "重点品种", width: 150 },
  { colId: "cOrderTypeCode", field: "cOrderTypeCode", headerName: "合同性质QAA期货", width: 150 },
  { colId: "cExportFlag", field: "cExportFlag", headerName: "出口标志", width: 150 },
  { colId: "dOrderTime", field: "dOrderTime", headerName: "订单日期", width: 150 },
  { colId: "dJhqTime", field: "dJhqTime", headerName: "合同交货期", width: 150 },
  { colId: "cMatCode", field: "cMatCode", headerName: "物料编码", width: 150 },
  { colId: "cMatName", field: "cMatName", headerName: "物料名称", width: 150 },
  { colId: "cSlabType", field: "cSlabType", headerName: "自备坯R", width: 150 },
  { colId: "cConRemark", field: "cConRemark", headerName: "合同备注", width: 150 },
  { colId: "cSpecialMarkGy", field: "cSpecialMarkGy", headerName: "工艺/性能要求", width: 150 },
  { colId: "cWarrantyDesc", field: "cWarrantyDesc", headerName: "质保书要求", width: 150 },
  { colId: "cPackCode", field: "cPackCode", headerName: "特殊包装要求", width: 150 },
  { colId: "nOrderProcFlag", field: "nOrderProcFlag", headerName: "合同处理标志（", width: 150 },
  { colId: "cDelivyQtyFlag", field: "cDelivyQtyFlag", headerName: "计重方式", width: 150 },
  { colId: "cDeptCode", field: "cDeptCode", headerName: "部门编码", width: 150 },
  { colId: "cProdName", field: "cProdName", headerName: "品名名称", width: 150 },
  { colId: "cDelivyStatusDesc", field: "cDelivyStatusDesc", headerName: "交货状态说明", width: 150 },
  { colId: "cCustStdDesc", field: "cCustStdDesc", headerName: "加工用途说明", width: 150 },
  { colId: "nApplyCloseStatus", field: "nApplyCloseStatus", headerName: "1待封锁", width: 150 },
  { colId: "cApplyCloseEmp", field: "cApplyCloseEmp", headerName: "申请关闭人", width: 150 },
  { colId: "dApplyCloseDt", field: "dApplyCloseDt", headerName: "申请关闭时间", width: 150 },
  { colId: "cApplyCloseRemark", field: "cApplyCloseRemark", headerName: "申请关闭说明", width: 150 },
  { colId: "cDesignNo", field: "cDesignNo", headerName: "质量设计号", width: 150 },
  { colId: "cDesignDesc", field: "cDesignDesc", headerName: "质量设计失败说明", width: 150 },
  { colId: "nWtMax", field: "nWtMax", headerName: "单量上限", width: 150 },
  { colId: "nWtMin", field: "nWtMin", headerName: "单量下限", width: 150 },
  { colId: "nSendNum", field: "nSendNum", headerName: "发送次数", width: 150 },
  { colId: "nWidthWgt", field: "nWidthWgt", headerName: "边部宽度余量", width: 150 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", width: 150 },
  { colId: "cFlawDesc", field: "cFlawDesc", headerName: "探伤等级", width: 150 },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 150 },
  { colId: "cTol", field: "cTol", headerName: "公差标准", width: 150 },
  { colId: "cOverstepBl", field: "cOverstepBl", headerName: "短溢装比例", width: 150 },
  { colId: "cShape", field: "cShape", headerName: "形状代码", width: 150 },
  { colId: "cSgCodeNk", field: "cSgCodeNk", headerName: "内控钢种", width: 150 },
  { colId: "cOrderProcUserid", field: "cOrderProcUserid", headerName: "合同处理操作人", width: 150 },
  { colId: "dOrderProcTime", field: "dOrderProcTime", headerName: "合同处理时间", width: 150 },
  { colId: "cZggyCode", field: "cZggyCode", headerName: "轧钢工艺编码", width: 150 },
  { colId: "cPushUserid", field: "cPushUserid", headerName: "下发生产人", width: 150 },
  { colId: "dPushTime", field: "dPushTime", headerName: "下发生产时间", width: 150 },
  { colId: "cSendUserid", field: "cSendUserid", headerName: "销售下提报人", width: 150 },
  { colId: "dSendTime", field: "dSendTime", headerName: "销售提报时间", width: 150 },
  { colId: "nThickTolMin", field: "nThickTolMin", headerName: "厚度下偏差", width: 150 },
  { colId: "nThickTolMax", field: "nThickTolMax", headerName: "厚度上偏差", width: 150 },
  { colId: "nWidthTolMin", field: "nWidthTolMin", headerName: "宽度下偏差", width: 150 },
  { colId: "nWidthTolMax", field: "nWidthTolMax", headerName: "宽度上偏差", width: 150 },
  { colId: "nLenTolMin", field: "nLenTolMin", headerName: "长度下偏差", width: 150 },
  { colId: "nLenTolMax", field: "nLenTolMax", headerName: "长度上偏差", width: 150 },
  { colId: "dTimeShipment", field: "dTimeShipment", headerName: "预计船期", width: 150 },
  { colId: "cJrzzgyCode", field: "cJrzzgyCode", headerName: "加热轧制工艺编码", width: 150 },
  { colId: "cJqgyCode", field: "cJqgyCode", headerName: "剪切工艺编码", width: 150 },
  { colId: "nExitem2", field: "nExitem2", headerName: "申请通知", width: 150 },
  { colId: "cExitem3", field: "cExitem3", headerName: "原始订单号", width: 150 },
  { colId: "cBackRemark", field: "cBackRemark", headerName: "生产退回销售订单原因", width: 150 },
  { colId: "cExitem4", field: "cExitem4", headerName: "变更原因", width: 150 },
  { colId: "cConRemark2", field: "cConRemark2", headerName: "合同备注2", width: 150 },
  { colId: "cGf", field: "cGf", headerName: "平直度", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "cConNo", field: "cConNo", headerName: "合同号", width: 150, hide: true },
  { colId: "cMsc", field: "cMsc", headerName: "冶金规范", width: 150, hide: true },
  { colId: "cPsc", field: "cPsc", headerName: "产品规范码", width: 150, hide: true },
  { colId: "cMscLineNo", field: "cMscLineNo", headerName: "冶金规范产线号", width: 150, hide: true },
  { colId: "cMscLineDesc", field: "cMscLineDesc", headerName: "产线描述", width: 150, hide: true },
  { colId: "cWholeBacklog", field: "cWholeBacklog", headerName: "全程工序码", width: 150, hide: true },
  { colId: "cWholeBacklogDesc", field: "cWholeBacklogDesc", headerName: "全程工序说明", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },*/
];

/* ---------- 下：7 个库存页签（同一份缓存按条件过滤） ---------- */
let kcList: Tyd2000OrderDto[] = [];
const tabCaptions = [
  "炼钢产出明细",
  "轧制完成明细",
  "堆冷材料明细",
  "剪切完成明细",
  "精整中材料明细",
  "成品库存明细",
  "发货明细",
];
const tabFilters = [
  (x: Tyd2000OrderDto) => x.nProType === NProTypeEnum.P,
  (x: Tyd2000OrderDto) => x.nProType === NProTypeEnum.R,
  (x: Tyd2000OrderDto) => x.nProType === NProTypeEnum.R && x.nStatus === InventoryStatusEnum.ConsumeLocked,
  (x: Tyd2000OrderDto) => x.nProType === NProTypeEnum.C,
  (x: Tyd2000OrderDto) => x.nProType === NProTypeEnum.C && x.cStoreCode === "ZG01-01",
  (x: Tyd2000OrderDto) => x.nProType === NProTypeEnum.C && x.cStoreCode === "ZG01-04",
  (x: Tyd2000OrderDto) =>
    x.nProType === NProTypeEnum.C && x.cStoreCode === "ZG01-04" && x.nStatus === InventoryStatusEnum.Out,
];
const kcColDefs: ColDef[][] = [
  /*[
  { colId: "cLineCode", field: "cLineCode", headerName: "产线", width: 150 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 150 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 150 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 150 },
  { colId: "nProType", field: "nProType", headerName: "库存分类", width: 150 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 150 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 150 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 150 },
  { colId: "nNum", field: "nNum", headerName: "支数", width: 150 },
  { colId: "nWgt", field: "nWgt", headerName: "实重", width: 150 },
  { colId: "dProTime", field: "dProTime", headerName: "产出时间", width: 150 },
  { colId: "cProUser", field: "cProUser", headerName: "产出人", width: 150 },
  { colId: "cShiftNo", field: "cShiftNo", headerName: "产出班次", width: 150 },
  { colId: "cGroupNo", field: "cGroupNo", headerName: "产出班组", width: 150 },
  { colId: "dInTime", field: "dInTime", headerName: "入库时间", width: 150 },
  { colId: "cInUser", field: "cInUser", headerName: "入库人", width: 150 },
  { colId: "cStoreCode", field: "cStoreCode", headerName: "库区号", width: 150 },
  { colId: "cStackNo", field: "cStackNo", headerName: "垛位号", width: 150 },
  { colId: "cStackNum", field: "cStackNum", headerName: "层号", width: 150 },
  { colId: "nStatus", field: "nStatus", headerName: "库存状态", width: 150 },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 150 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 150, hide: true },
  { colId: "cPieceNoSlab", field: "cPieceNoSlab", headerName: "板坯号", width: 150, hide: true },,
  ],*/
  /*[
  { colId: "cLineCode", field: "cLineCode", headerName: "产线", width: 150 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 150 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 150 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 150 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 150 },
  { colId: "nProType", field: "nProType", headerName: "库存分类", width: 150 },
  { colId: "cPieceNoSlab", field: "cPieceNoSlab", headerName: "板坯号", width: 150 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 150 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 150 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 150 },
  { colId: "nNum", field: "nNum", headerName: "支数", width: 150 },
  { colId: "nWgt", field: "nWgt", headerName: "实重", width: 150 },
  { colId: "dProTime", field: "dProTime", headerName: "产出时间", width: 150 },
  { colId: "cProUser", field: "cProUser", headerName: "产出人", width: 150 },
  { colId: "cShiftNo", field: "cShiftNo", headerName: "产出班次", width: 150 },
  { colId: "cGroupNo", field: "cGroupNo", headerName: "产出班组", width: 150 },
  { colId: "dInTime", field: "dInTime", headerName: "入库时间", width: 150 },
  { colId: "cInUser", field: "cInUser", headerName: "入库人", width: 150 },
  { colId: "cStoreCode", field: "cStoreCode", headerName: "库区号", width: 150 },
  { colId: "cStackNo", field: "cStackNo", headerName: "垛位号", width: 150 },
  { colId: "cStackNum", field: "cStackNum", headerName: "层号", width: 150 },
  { colId: "nStatus", field: "nStatus", headerName: "库存状态", width: 150 },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 150 },,
  ],*/
  /*[
  { colId: "cLineCode", field: "cLineCode", headerName: "产线", width: 150 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 150 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 150 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 150 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 150 },
  { colId: "nProType", field: "nProType", headerName: "库存分类", width: 150 },
  { colId: "cPieceNoSlab", field: "cPieceNoSlab", headerName: "板坯号", width: 150 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 150 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 150 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 150 },
  { colId: "nNum", field: "nNum", headerName: "支数", width: 150 },
  { colId: "nWgt", field: "nWgt", headerName: "实重", width: 150 },
  { colId: "dProTime", field: "dProTime", headerName: "产出时间", width: 150 },
  { colId: "cProUser", field: "cProUser", headerName: "产出人", width: 150 },
  { colId: "cShiftNo", field: "cShiftNo", headerName: "产出班次", width: 150 },
  { colId: "cGroupNo", field: "cGroupNo", headerName: "产出班组", width: 150 },
  { colId: "dInTime", field: "dInTime", headerName: "入库时间", width: 150 },
  { colId: "cInUser", field: "cInUser", headerName: "入库人", width: 150 },
  { colId: "cStoreCode", field: "cStoreCode", headerName: "库区号", width: 150 },
  { colId: "cStackNo", field: "cStackNo", headerName: "垛位号", width: 150 },
  { colId: "cStackNum", field: "cStackNum", headerName: "层号", width: 150 },
  { colId: "nStatus", field: "nStatus", headerName: "库存状态", width: 150 },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 150 },,
  ],*/
  /*[
  { colId: "cLineCode", field: "cLineCode", headerName: "产线", width: 150 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 150 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 150 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 150 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 150 },
  { colId: "cIsCc", field: "cIsCc", headerName: "是否超长", width: 150 },
  { colId: "cIsDc", field: "cIsDc", headerName: "是否短尺", width: 150 },
  { colId: "nProType", field: "nProType", headerName: "库存分类", width: 150 },
  { colId: "cPieceNoSlab", field: "cPieceNoSlab", headerName: "板坯号", width: 150 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 150 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 150 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 150 },
  { colId: "nNum", field: "nNum", headerName: "支数", width: 150 },
  { colId: "nWgt", field: "nWgt", headerName: "实重", width: 150 },
  { colId: "dProTime", field: "dProTime", headerName: "产出时间", width: 150 },
  { colId: "cProUser", field: "cProUser", headerName: "产出人", width: 150 },
  { colId: "cShiftNo", field: "cShiftNo", headerName: "产出班次", width: 150 },
  { colId: "cGroupNo", field: "cGroupNo", headerName: "产出班组", width: 150 },
  { colId: "dInTime", field: "dInTime", headerName: "入库时间", width: 150 },
  { colId: "cInUser", field: "cInUser", headerName: "入库人", width: 150 },
  { colId: "cStoreCode", field: "cStoreCode", headerName: "库区号", width: 150 },
  { colId: "cStackNo", field: "cStackNo", headerName: "垛位号", width: 150 },
  { colId: "cStackNum", field: "cStackNum", headerName: "层号", width: 150 },
  { colId: "nStatus", field: "nStatus", headerName: "库存状态", width: 150 },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 150 },,
  ],*/
  /*[
  { colId: "cLineCode", field: "cLineCode", headerName: "产线", width: 150 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 150 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 150 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 150 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 150 },
  { colId: "nProType", field: "nProType", headerName: "库存分类", width: 150 },
  { colId: "cPieceNoSlab", field: "cPieceNoSlab", headerName: "板坯号", width: 150 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 150 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 150 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 150 },
  { colId: "nNum", field: "nNum", headerName: "支数", width: 150 },
  { colId: "nWgt", field: "nWgt", headerName: "实重", width: 150 },
  { colId: "dProTime", field: "dProTime", headerName: "产出时间", width: 150 },
  { colId: "cProUser", field: "cProUser", headerName: "产出人", width: 150 },
  { colId: "cShiftNo", field: "cShiftNo", headerName: "产出班次", width: 150 },
  { colId: "cGroupNo", field: "cGroupNo", headerName: "产出班组", width: 150 },
  { colId: "dInTime", field: "dInTime", headerName: "入库时间", width: 150 },
  { colId: "cInUser", field: "cInUser", headerName: "入库人", width: 150 },
  { colId: "cStoreCode", field: "cStoreCode", headerName: "库区号", width: 150 },
  { colId: "cStackNo", field: "cStackNo", headerName: "垛位号", width: 150 },
  { colId: "cStackNum", field: "cStackNum", headerName: "层号", width: 150 },
  { colId: "nStatus", field: "nStatus", headerName: "库存状态", width: 150 },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 150 },,
  ],*/
  /*[
  { colId: "cLineCode", field: "cLineCode", headerName: "产线", width: 150 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 150 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 150 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 150 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 150 },
  { colId: "nProType", field: "nProType", headerName: "库存分类", width: 150 },
  { colId: "cPieceNoSlab", field: "cPieceNoSlab", headerName: "板坯号", width: 150 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 150 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 150 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 150 },
  { colId: "nNum", field: "nNum", headerName: "支数", width: 150 },
  { colId: "nWgt", field: "nWgt", headerName: "实重", width: 150 },
  { colId: "dProTime", field: "dProTime", headerName: "产出时间", width: 150 },
  { colId: "cProUser", field: "cProUser", headerName: "产出人", width: 150 },
  { colId: "cShiftNo", field: "cShiftNo", headerName: "产出班次", width: 150 },
  { colId: "cGroupNo", field: "cGroupNo", headerName: "产出班组", width: 150 },
  { colId: "dInTime", field: "dInTime", headerName: "入库时间", width: 150 },
  { colId: "cInUser", field: "cInUser", headerName: "入库人", width: 150 },
  { colId: "cStoreCode", field: "cStoreCode", headerName: "库区号", width: 150 },
  { colId: "cStackNo", field: "cStackNo", headerName: "垛位号", width: 150 },
  { colId: "cStackNum", field: "cStackNum", headerName: "层号", width: 150 },
  { colId: "nStatus", field: "nStatus", headerName: "库存状态", width: 150 },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 150 },,
  ],*/
  /*[
  { colId: "cLineCode", field: "cLineCode", headerName: "产线", width: 150 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 150 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 150 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 150 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 150 },
  { colId: "nProType", field: "nProType", headerName: "库存分类", width: 150 },
  { colId: "cPieceNoSlab", field: "cPieceNoSlab", headerName: "板坯号", width: 150 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 150 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 150 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 150 },
  { colId: "nNum", field: "nNum", headerName: "支数", width: 150 },
  { colId: "nWgt", field: "nWgt", headerName: "实重", width: 150 },
  { colId: "dProTime", field: "dProTime", headerName: "产出时间", width: 150 },
  { colId: "cProUser", field: "cProUser", headerName: "产出人", width: 150 },
  { colId: "cShiftNo", field: "cShiftNo", headerName: "产出班次", width: 150 },
  { colId: "cGroupNo", field: "cGroupNo", headerName: "产出班组", width: 150 },
  { colId: "dInTime", field: "dInTime", headerName: "入库时间", width: 150 },
  { colId: "cInUser", field: "cInUser", headerName: "入库人", width: 150 },
  { colId: "cStoreCode", field: "cStoreCode", headerName: "库区号", width: 150 },
  { colId: "cStackNo", field: "cStackNo", headerName: "垛位号", width: 150 },
  { colId: "cStackNum", field: "cStackNum", headerName: "层号", width: 150 },
  { colId: "nStatus", field: "nStatus", headerName: "库存状态", width: 150 },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 150 },
  { colId: "cIsCc", field: "cIsCc", headerName: "是否超长", width: 150, hide: true },
  { colId: "cIsDc", field: "cIsDc", headerName: "是否短尺", width: 150, hide: true },,
  ],*/
];
const activeTab = ref(0);
const kcRows = ref<Tyd2000OrderDto[][]>(tabCaptions.map(() => []));
const kcApis = ref<(GridApi | null)[]>(tabCaptions.map(() => null));
function onKcReady(i: number, e: GridReadyEvent) {
  kcApis.value[i] = e.api;
}

function applyKc(i: number) {
  kcRows.value[i] = kcList.filter(tabFilters[i]);
  requestAnimationFrame(() => kcApis.value[i]?.autoSizeAllColumns());
}
function onTabChange(v: string | number) {
  activeTab.value = Number(v);
  applyKc(activeTab.value);
}

async function query() {
  loading.value = true;
  try {
    const dto: QueryOrderDto = {
      cLineCode: menuQs[0] ?? "ZG01",
      timeRange: toTimeRange(input.dates),
      cOrderNo: input.cOrderNo.trim() || null,
      cSgCode: input.cSgCode.trim() || null,
      cSgStd: input.cSgStd.trim() || null,
      cCustName: input.cCustName.trim() || null,
      cInboundNo: input.cInboundNo.trim() || null,
    };
    rows.value = (await hR9500Api.queryOrderGz(dto)) ?? [];
    kcList = [];
    for (const arr of kcRows.value) arr.splice(0);
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

async function onSelected() {
  const row = (api.value?.getSelectedRows()[0] as Tmp2000HzDto | undefined) ?? null;
  loading.value = true;
  try {
    kcList = row ? ((await hR9500Api.queryOrderKc(row.cOrderNo ?? undefined)) ?? []) : [];
    for (let i = 0; i < tabCaptions.length; i++) applyKc(i);
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件 -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="input.cSgCode" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">执行标准</label>
        <InputText v-model="input.cSgStd" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">客户名称</label>
        <InputText v-model="input.cCustName" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">入库标识</label>
        <InputText v-model="input.cInboundNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">录入时间</label>
        <DatePicker
          v-model="input.dates"
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
      <div class="col-span-3 flex min-w-0 items-center gap-1">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
          <IconSearch class="h-3 w-3" />查询
        </Button>
      </div>
    </div>

    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="55" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">销售订单列表</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="colDefs"
            :row-data="rows"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false"
            :animate-rows="false"
            :loading="loading"
            @grid-ready="onReady"
            @selection-changed="onSelected"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
      <SplitterPanel :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
        <Tabs :value="activeTab" class="flex min-h-0 flex-1 flex-col" @update:value="onTabChange">
          <TabList class="flex-wrap">
            <Tab v-for="(c, i) in tabCaptions" :key="i" :value="i">{{ c }}</Tab>
          </TabList>
          <TabPanels class="min-h-0 flex-1">
            <TabPanel v-for="(c, i) in tabCaptions" :key="i" :value="i" class="h-full p-0">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="kcColDefs[i] ?? []"
                :row-data="kcRows[i]"
                :pagination="false"
                :animate-rows="false"
                :loading="loading"
                @grid-ready="(e: GridReadyEvent) => onKcReady(i, e)"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
