<script setup lang="ts">
/** 对应 FrmTL2000（中厚板提料，菜单 cQueryString=ZG01）：DDH.Winforms.SMP.Forms.FrmTL2000
 *  已接入：tLApi.getOrderLst2（销售订单，BindOrder——COrderNo=批量订单号整串）
 *          + tLApi.queryOrderNew（未审核=OrderTlEnum.YesTl / 已审核=Checked，OrderLst=批量订单号按换行拆）
 *          + tLApi.checkedTlNew(lineCode, ...)（审核，读未审核表；长度校验文案逐字照抄 .cs 两级确认）
 *          + tLApi.cancleCheckedTlNew（取消审核，读已审核表去重单号）
 *          + tLApi.delTl（删除，读未审核表）
 *          + tLApi.tlProdClose（已审提料生产关闭，读已审核整行、.cs 不回查 → 「执行成功{n}条！」）
 *  列集：三表按 extract 全列——gvCheck 79可见+96隐藏（页签「已审核提料单」）/ gvTlNoCheck 78+98（「未审核提料单」）
 *        / gridView1 45+19（「销售订单」，无 Selected 列照原样）；
 *        原 Selected 勾选列由 AG Grid row-selection 复选框呈现（ui-rules §7），原列以 hide:true 保留在两表列面板
 *  页签：tabPage1 销售订单 → tabPage2 未审核提料单 → tabPage3 已审核提料单（PrimeVue Tabs，页签在顶部，与原 XtraTabControl HeaderLocation 默认一致）
 *  输入：时间 dtS~dtE（Load 默认今天-2/+1）、批量订单号 comOrder、提料状态 icboTlStatus（label=提料状态，与下拉成对可见）
 *  待接入：提料导入/冷坯提料导入（原 FrmTL2000Date → Excel ImportDataHelper → FrmTL2000Import → tLApi.importTmp2005，二级弹窗按 skill 占位）
 *  字段桥接：extract 为 C# PascalCase，后端 JSON 为 camelCase —— valueGetter/valueSetter 双写 */
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Select from "primevue/select";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { IconCheck, IconSearch, IconTrash, IconX } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueGetterParams, ValueSetterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import {
  tLApi,
  OrderTlEnum,
  type InputTmp2000Dto,
  type InputTmp2010Dto,
  type QueryTmp2000Dto,
  type Tmp2005Dto,
} from "@/api/mes4ddh/smp.swagger";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import BatchIdInput from "@/pages/Widgets/BatchIdInput/index.vue";
import { parseBatchIds } from "@/pages/Widgets/BatchIdInput/parse";

const { toast } = useToast();
const { raw: menuQs } = useMenuQuery();
const lineCode = menuQs || undefined;

const theme = makeHmxGridTheme();
const querying = ref(false);
const activeTab = ref<"order" | "nocheck" | "check">("order");
const orderApi = ref<GridApi | null>(null);
const noCheckApi = ref<GridApi | null>(null);
const checkApi = ref<GridApi | null>(null);

/** extract 字段为 PascalCase、后端 JSON 为 camelCase：统一桥接读写 */
function bridge(cols: ColDef[]): ColDef[] {
  return cols.map((c) => {
    if (!c.field) return c;
    const f = c.field;
    const ck = f.charAt(0).toLowerCase() + f.slice(1);
    return {
      ...c,
      valueGetter: (p: ValueGetterParams) => (p.data as Record<string, unknown> | undefined)?.[ck] ?? (p.data as Record<string, unknown> | undefined)?.[f],
      valueSetter: (p: ValueSetterParams) => {
        const d = p.data as Record<string, unknown> | undefined;
        if (!d) return false;
        d[ck] = p.newValue;
        d[f] = p.newValue;
        return true;
      },
    };
  });
}

type OrderRow = QueryTmp2000Dto & { COrderNo?: string };
type TlRow = Tmp2005Dto & { Selected?: boolean; COrderNo?: string; NSlabLenMin?: number | null };
const orderRows = ref<OrderRow[]>([]);
const noCheckRows = ref<TlRow[]>([]);
const checkRows = ref<TlRow[]>([]);

/* ===== tabPage1 销售订单（gridControl1/gridView1：45 可见 + 19 隐藏，无 Selected 列） ===== */
const orderCols = ref<ColDef[]>(bridge([
      { field: "IsTl", headerName: "是否已提料", width: 150 },
      { field: "COrderNo", headerName: "订单号", width: 150 },
      { field: "COrderCustNo", headerName: "客户编码", width: 150 },
      { field: "COrderCustCname", headerName: "订货客户", width: 150 },
      { field: "CSteelType", headerName: "品名", width: 150 },
      { field: "CSgCode", headerName: "钢种", width: 150 },
      { field: "CSgCodeNk", headerName: "内控钢种", width: 150 },
      { field: "NThick", headerName: "厚度", width: 150 },
      { field: "NThickMin", headerName: "厚度下限", width: 150 },
      { field: "NThickMax", headerName: "厚度上限", width: 150 },
      { field: "NWidth", headerName: "宽度", width: 150 },
      { field: "NWidthMin", headerName: "宽度下限", width: 150 },
      { field: "NWidthMax", headerName: "宽度上限", width: 150 },
      { field: "NWidthWgt", headerName: "边部宽度余量", width: 150 },
      { field: "CLengthType", headerName: "长度类型", width: 150 },
      { field: "NLenMin", headerName: "长度下限", width: 150 },
      { field: "NLenMax", headerName: "长度上限", width: 150 },
      { field: "CDelivyStatusCode", headerName: "交货状态", width: 150 },
      { field: "CDelivyStatusDesc", headerName: "交货状态说明", width: 150 },
      { field: "NNum", headerName: "订货件数", width: 150 },
      { field: "NWgt", headerName: "订单重量", width: 150 },
      { field: "CTrimFlag", headerName: "切边方式", width: 150 },
      { field: "COverstepBl", headerName: "短溢装比例", width: 150 },
      { field: "CDelivyQtyFlag", headerName: "计重方式", width: 150 },
      { field: "CTol", headerName: "公差", width: 150 },
      { field: "CFlawDesc", headerName: "探伤等级", width: 150 },
      { field: "CConNo", headerName: "合同号", width: 150 },
      { field: "CSgStd", headerName: "执行标准", width: 150 },
      { field: "DJhqTime", headerName: "交货期", width: 150 },
      { field: "CDelivyAddress", headerName: "流向", width: 150 },
      { field: "CSpecialMarkGy", headerName: "性能要求", width: 150 },
      { field: "NWtMax", headerName: "单量上限", width: 150 },
      { field: "NWtMin", headerName: "单量下限", width: 150 },
      { field: "CSpec", headerName: "规格", width: 150 },
      { field: "CConRemark", headerName: "特殊要求", width: 150 },
      { field: "CInboundNo", headerName: "入库标识", width: 150 },
      { field: "CExitem1", headerName: "是否工程单", width: 150 },
      { field: "DTimeShipment", headerName: "预计船期", width: 150 },
      { field: "CLineCode", headerName: "产线代码", width: 150 },
      { field: "Creator", headerName: "创建人", width: 150 },
      { field: "CreateTime", headerName: "创建时间", width: 150 },
      { field: "LastModifier", headerName: "最后修改人", width: 150 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 150 },
      { field: "CSendUserId", headerName: "销售提报人", width: 150 },
      { field: "DSendTime", headerName: "销售提报时间", width: 150 },
      { field: "NStatus", headerName: "订单状态", hide: true },
      { field: "NThickTolMin", headerName: "厚度下偏差", hide: true },
      { field: "NThickTolMax", headerName: "厚度上偏差", hide: true },
      { field: "NWidthTolMin", headerName: "宽度下偏差", hide: true },
      { field: "NWidthTolMax", headerName: "宽度上偏差", hide: true },
      { field: "NLenTolMin", headerName: "长度下偏差", hide: true },
      { field: "NLenTolMax", headerName: "长度上偏差", hide: true },
      { field: "CJrzzgyCode", headerName: "加热轧制工艺编码", hide: true },
      { field: "CJqgyCode", headerName: "剪切工艺编码", hide: true },
      { field: "CDeptCode", headerName: "部门编码", hide: true },
      { field: "COrderProcFlag", headerName: "合同处理标志（", hide: true },
      { field: "COrderProcUserId", headerName: "合同处理操作人", hide: true },
      { field: "DOrderProcTime", headerName: "合同处理时间", hide: true },
      { field: "CZgGyCode", headerName: "轧钢工艺编码", hide: true },
      { field: "CPushUserId", headerName: "下发生产人", hide: true },
      { field: "DPushTime", headerName: "下发生产时间", hide: true },
      { field: "NSfpj", headerName: "评审状态", hide: true },
      { field: "CPjName", headerName: "评审人", hide: true },
      { field: "Id", headerName: "主键", hide: true },
]));

/* ===== tabPage2 未审核提料单（gcTlNoCheck/gvTlNoCheck：78 可见 + 98 隐藏） ===== */
const noCheckCols = ref<ColDef[]>(bridge([
      { field: "Selected", headerName: "选择", hide: true },
      { field: "CCool", headerName: "是否冷坯计划", width: 150 },
      { field: "CCheckRemark", headerName: "备注说明", width: 150 },
      { field: "CPlanTime", headerName: "计划日期", width: 150 },
      { field: "COrderNo", headerName: "提料计划号", width: 150 },
      { field: "COrderCustCname", headerName: "订货客户中文名称", width: 150 },
      { field: "COrderNo1", headerName: "订单号1", width: 150 },
      { field: "COrderNo2", headerName: "订单号2", width: 150 },
      { field: "COrderNo3", headerName: "订单号3", width: 150 },
      { field: "COrderNo4", headerName: "订单号4", width: 150 },
      { field: "CSgCode", headerName: "钢种", width: 150 },
      { field: "CSgStd", headerName: "执行标准", width: 150 },
      { field: "NThick", headerName: "厚度", width: 150 },
      { field: "NWidth", headerName: "宽度", width: 150 },
      { field: "NWidthWgt", headerName: "边部宽度余量", width: 150 },
      { field: "NLen", headerName: "长度", width: 150 },
      { field: "CLengthType", headerName: "长度类型", width: 150 },
      { field: "NLenMax", headerName: "长度上限", width: 150 },
      { field: "NLenMin", headerName: "长度下限", width: 150 },
      { field: "CDelivyStatusCode", headerName: "交货状态", width: 150 },
      { field: "NNum", headerName: "订货件数", width: 150 },
      { field: "NWgt", headerName: "订单重量", width: 150 },
      { field: "CTrimFlag", headerName: "切边方式", width: 150 },
      { field: "CSpec", headerName: "规格", width: 150 },
      { field: "CTlSgCode", headerName: "炼钢钢种", width: 150 },
      { field: "NSlabThick", headerName: "钢坯厚度", width: 150 },
      { field: "NSlabWidth", headerName: "钢坯宽度", width: 150 },
      { field: "NSlabLenMin", headerName: "钢坯长度最小值", width: 150 },
      { field: "NSlabQua", headerName: "钢坯支数", width: 150 },
      { field: "NWgtUnit", headerName: "钢坯单支重量", width: 150 },
      { field: "NSlabWgt", headerName: "坯料重量", width: 150 },
      { field: "NThickPlan", headerName: "生产板厚", width: 150 },
      { field: "NWidthPlan", headerName: "生产板宽", width: 150 },
      { field: "NLenPlan", headerName: "生产板长", width: 150 },
      { field: "NDbc", headerName: "单倍尺", width: 150 },
      { field: "NSteelSingleWgt", headerName: "钢板单重", width: 150 },
      { field: "NPlanedBoardNum", headerName: "排产子板数", width: 150 },
      { field: "NPlanedWgt", headerName: "排产净重", width: 150 },
      { field: "NConSteelKs", headerName: "合同带出钢板块数", width: 150 },
      { field: "NConSteelNum", headerName: "合同带出钢板数量", width: 150 },
      { field: "NTlTol", headerName: "提料公差", width: 150 },
      { field: "NLlBoardWgt", headerName: "理论子板重（含板边）", width: 150 },
      { field: "NLlBoardEndWgt", headerName: "理论板头重", width: 150 },
      { field: "NLlBoardEdge", headerName: "理论板边", width: 150 },
      { field: "NLlBoardEnd", headerName: "理论板头", width: 150 },
      { field: "NLlBurnLoss", headerName: "理论烧损", width: 150 },
      { field: "NLlCleanLen", headerName: "理论毛长", width: 150 },
      { field: "NBoarCleanLen", headerName: "母板净长", width: 150 },
      { field: "CThickRange", headerName: "厚度区间", width: 150 },
      { field: "CDelivyQtyFlag", headerName: "计重方式", width: 150 },
      { field: "CTol", headerName: "公差", width: 150 },
      { field: "CFlawStand", headerName: "探伤标准", width: 150 },
      { field: "CFlawDesc", headerName: "探伤等级", width: 150 },
      { field: "CTransType", headerName: "运输方式", width: 150 },
      { field: "CStoreRoom", headerName: "库房", width: 150 },
      { field: "CRzFlag", headerName: "是否认证", width: 150 },
      { field: "CSampleSpec", headerName: "样品规格", width: 150 },
      { field: "CSpecialMarkGy", headerName: "工艺/性能要求", width: 150 },
      { field: "CAddress", headerName: "到货地址", width: 150 },
      { field: "CThickRangeDis", headerName: "厚度区分", width: 150 },
      { field: "CSingleSlab", headerName: "单片钢坯", width: 150 },
      { field: "NLenPlan1", headerName: "套切长度1", width: 150 },
      { field: "NLenPlan2", headerName: "套切长度2", width: 150 },
      { field: "NLenPlan3", headerName: "套切长度3", width: 150 },
      { field: "NLenPlan4", headerName: "套切长度4", width: 150 },
      { field: "NRate", headerName: "理论成材率", width: 150 },
      { field: "NPlanBoarLen", headerName: "计划母板长", width: 150 },
      { field: "CRollType", headerName: "轧制方式", width: 150 },
      { field: "NLlProduceKs", headerName: "理论生产块数", width: 150 },
      { field: "NDcLen", headerName: "带出长度", width: 150 },
      { field: "DJhqTime", headerName: "合同交货期", width: 150 },
      { field: "CZWidth", headerName: "展宽比", width: 150 },
      { field: "CRollNo", headerName: "补轧标识", width: 150 },
      { field: "NColdSlabKs", headerName: "冷坯块数", width: 150 },
      { field: "NColdSlabNum", headerName: "冷坯吨数", width: 150 },
      { field: "CInboundNo", headerName: "入库标识", width: 150 },
      { field: "CDelivyAddress", headerName: "流向", width: 150 },
      { field: "CRepairProduce", headerName: "补产", width: 150 },
      { field: "Id", headerName: "主键", hide: true },
      { field: "Creator", headerName: "创建人", hide: true },
      { field: "CreateTime", headerName: "创建时间", hide: true },
      { field: "LastModifier", headerName: "最后修改人", hide: true },
      { field: "LastModifyTime", headerName: "最后修改时间", hide: true },
      { field: "NStatus", headerName: "订单状态", hide: true },
      { field: "CTlOrderNo", headerName: "提料订单号", hide: true },
      { field: "CIsMerge", headerName: "是否合并提料", hide: true },
      { field: "CLineCode", headerName: "产线代码", hide: true },
      { field: "CConNo", headerName: "合同号", hide: true },
      { field: "NWgtSy", headerName: "剩余重量", hide: true },
      { field: "NThickMin", headerName: "厚度下限", hide: true },
      { field: "NThickMax", headerName: "厚度上限", hide: true },
      { field: "NWidthMin", headerName: "宽度下限", hide: true },
      { field: "NWidthMax", headerName: "宽度上限", hide: true },
      { field: "CSteelType", headerName: "钢类", hide: true },
      { field: "CProdCode", headerName: "品名代码", hide: true },
      { field: "CMsc", headerName: "冶金规范", hide: true },
      { field: "CPsc", headerName: "产品规范码", hide: true },
      { field: "CMscLineNo", headerName: "冶金规范产线号", hide: true },
      { field: "CMscLineDesc", headerName: "产线描述", hide: true },
      { field: "CWholeBacklog", headerName: "全程工序码", hide: true },
      { field: "CWholeBacklogDesc", headerName: "全程工序说明", hide: true },
      { field: "CCustStdCode", headerName: "加工用途代码", hide: true },
      { field: "COrderCustNo", headerName: "订货客户编码", hide: true },
      { field: "COrderCustEname", headerName: "订货客户英文名称", hide: true },
      { field: "CProductH", headerName: "重点品种", hide: true },
      { field: "COrderTypeCode", headerName: "合同性质QAA期货", hide: true },
      { field: "CExportFlag", headerName: "出口标志", hide: true },
      { field: "DOrderTime", headerName: "订单日期", hide: true },
      { field: "CMatCode", headerName: "物料编码", hide: true },
      { field: "CMatName", headerName: "物料名称", hide: true },
      { field: "CSlabType", headerName: "自备坯R", hide: true },
      { field: "CConRemark", headerName: "合同备注", hide: true },
      { field: "CWarrantyDesc", headerName: "质保书要求", hide: true },
      { field: "CPackCode", headerName: "特殊包装要求", hide: true },
      { field: "COrderProcFlag", headerName: "合同处理标志（", hide: true },
      { field: "CDeptCode", headerName: "部门编码", hide: true },
      { field: "NFlag", headerName: "计划类型", hide: true },
      { field: "CProdName", headerName: "品名名称", hide: true },
      { field: "CDelivyStatusDesc", headerName: "交货状态说明", hide: true },
      { field: "CCustStdDesc", headerName: "加工用途说明", hide: true },
      { field: "NApplyCloseStatus", headerName: "1待封锁", hide: true },
      { field: "CApplyCloseEmp", headerName: "申请关闭人", hide: true },
      { field: "DApplyCloseDt", headerName: "申请关闭时间", hide: true },
      { field: "CApplyCloseRemark", headerName: "申请关闭说明", hide: true },
      { field: "CDesignNo", headerName: "质量设计号", hide: true },
      { field: "CDesignDesc", headerName: "质量设计失败说明", hide: true },
      { field: "NWtMax", headerName: "单量上限", hide: true },
      { field: "NWtMin", headerName: "单量下限", hide: true },
      { field: "NSendNum", headerName: "发送次数", hide: true },
      { field: "COverstepBl", headerName: "短溢装比例", hide: true },
      { field: "CShape", headerName: "形状代码", hide: true },
      { field: "CSlabSource", headerName: "供坯单位", hide: true },
      { field: "CTlSgStd", headerName: "炼钢标准", hide: true },
      { field: "NSlabLenMax", headerName: "钢坯长度最大值", hide: true },
      { field: "NWgtMeter", headerName: "钢坯米单重", hide: true },
      { field: "NSlabWgtSy", headerName: "坯料剩余重量", hide: true },
      { field: "CSlabRemark", headerName: "提料备注", hide: true },
      { field: "NTlStatus", headerName: "提料状态", hide: true },
      { field: "CTlRemark", headerName: "提料失败说明", hide: true },
      { field: "CTlName", headerName: "提料操作人", hide: true },
      { field: "DTlTime", headerName: "提料时间", hide: true },
      { field: "CTlOrderFlag", headerName: "是否提料订单", hide: true },
      { field: "CCcmCode", headerName: "连铸机编码", hide: true },
      { field: "NSfpj", headerName: "评审状态", hide: true },
      { field: "CPjName", headerName: "评审人", hide: true },
      { field: "DPjTime", headerName: "评审时间", hide: true },
      { field: "CPjRemark", headerName: "评审失败原因", hide: true },
      { field: "CSlabSize", headerName: "坯料规格", hide: true },
      { field: "CStNo", headerName: "炼钢工艺卡", hide: true },
      { field: "CZgGyCode", headerName: "轧钢工艺编码", hide: true },
      { field: "COrderNoOld", headerName: "原始订单号", hide: true },
      { field: "COrderNo5", headerName: "订单号5", hide: true },
      { field: "COrderNo6", headerName: "订单号6", hide: true },
      { field: "NLenPlan5", headerName: "套切长度5", hide: true },
      { field: "NLenPlan6", headerName: "套切长度6", hide: true },
      { field: "CJqgyCode", headerName: "剪切工艺编码", hide: true },
      { field: "CJrzzgyCode", headerName: "加热轧制工艺编码", hide: true },
      { field: "CSpecPlan", headerName: "生产规格", hide: true },
      { field: "CStoreShift", headerName: "炉次", hide: true },
      { field: "CThreading1", headerName: "套切1", hide: true },
      { field: "CThreading2", headerName: "套切2", hide: true },
      { field: "CThreading3", headerName: "套切3", hide: true },
      { field: "CThreading4", headerName: "套切4", hide: true },
      { field: "CVirtualStoreCode", headerName: "虚拟炉号", hide: true },
      { field: "CYcAlert", headerName: "异常提醒", hide: true },
      { field: "CZggyCode", headerName: "轧钢工艺编码", hide: true },
      { field: "DTimeShipment", headerName: "预计船期", hide: true },
      { field: "NLenTolMax", headerName: "长度上偏差", hide: true },
      { field: "NLenTolMin", headerName: "长度下偏差", hide: true },
      { field: "NLgPlanStatus", headerName: "炼钢计划状态", hide: true },
      { field: "NThickTolMax", headerName: "厚度上偏差", hide: true },
      { field: "NThickTolMin", headerName: "厚度下偏差", hide: true },
      { field: "NWidthTolMax", headerName: "宽度上偏差", hide: true },
      { field: "NWidthTolMin", headerName: "宽度下偏差", hide: true },
      { field: "NZlWgt", headerName: "组炉重量", hide: true },
      { field: "CPieceNo", headerName: "板坯号", hide: true },
]));

/* ===== tabPage3 已审核提料单（gcCheck/gvCheck：79 可见 + 96 隐藏；CreateTime/Creator 列头被 Designer 改为提料时间/提料人） ===== */
const checkCols = ref<ColDef[]>(bridge([
      { field: "Selected", headerName: "选择", hide: true },
      { field: "CCool", headerName: "是否冷坯计划", width: 150 },
      { field: "CPlanTime", headerName: "计划日期", width: 150 },
      { field: "CreateTime", headerName: "提料时间", width: 150 },
      { field: "Creator", headerName: "提料人", width: 150 },
      { field: "COrderNo", headerName: "提料计划号", width: 150 },
      { field: "COrderCustCname", headerName: "订货客户中文名称", width: 150 },
      { field: "COrderNo1", headerName: "订单号1", width: 150 },
      { field: "COrderNo2", headerName: "订单号2", width: 150 },
      { field: "COrderNo3", headerName: "订单号3", width: 150 },
      { field: "COrderNo4", headerName: "订单号4", width: 150 },
      { field: "CSgCode", headerName: "钢种", width: 150 },
      { field: "CSgStd", headerName: "执行标准", width: 150 },
      { field: "NThick", headerName: "厚度", width: 150 },
      { field: "NWidth", headerName: "宽度", width: 150 },
      { field: "NWidthWgt", headerName: "边部宽度余量", width: 150 },
      { field: "NLen", headerName: "长度", width: 150 },
      { field: "CLengthType", headerName: "长度类型", width: 150 },
      { field: "NLenMax", headerName: "长度上限", width: 150 },
      { field: "NLenMin", headerName: "长度下限", width: 150 },
      { field: "CDelivyStatusCode", headerName: "交货状态", width: 150 },
      { field: "NNum", headerName: "订货件数", width: 150 },
      { field: "NWgt", headerName: "订单重量", width: 150 },
      { field: "CTrimFlag", headerName: "切边方式", width: 150 },
      { field: "CSpec", headerName: "规格", width: 150 },
      { field: "CTlSgCode", headerName: "炼钢钢种", width: 150 },
      { field: "NSlabThick", headerName: "钢坯厚度", width: 150 },
      { field: "NSlabWidth", headerName: "钢坯宽度", width: 150 },
      { field: "NSlabLenMin", headerName: "钢坯长度最小值", width: 150 },
      { field: "NSlabQua", headerName: "钢坯支数", width: 150 },
      { field: "NWgtUnit", headerName: "钢坯单支重量", width: 150 },
      { field: "NSlabWgt", headerName: "坯料重量", width: 150 },
      { field: "NThickPlan", headerName: "生产板厚", width: 150 },
      { field: "NWidthPlan", headerName: "生产板宽", width: 150 },
      { field: "NLenPlan", headerName: "生产板长", width: 150 },
      { field: "NDbc", headerName: "单倍尺", width: 150 },
      { field: "NSteelSingleWgt", headerName: "钢板单重", width: 150 },
      { field: "NPlanedBoardNum", headerName: "排产子板数", width: 150 },
      { field: "NPlanedWgt", headerName: "排产净重", width: 150 },
      { field: "NConSteelKs", headerName: "合同带出钢板块数", width: 150 },
      { field: "NConSteelNum", headerName: "合同带出钢板数量", width: 150 },
      { field: "NTlTol", headerName: "提料公差", width: 150 },
      { field: "NLlBoardWgt", headerName: "理论子板重（含板边）", width: 150 },
      { field: "NLlBoardEndWgt", headerName: "理论板头重", width: 150 },
      { field: "NLlBoardEdge", headerName: "理论板边", width: 150 },
      { field: "NLlBoardEnd", headerName: "理论板头", width: 150 },
      { field: "NLlBurnLoss", headerName: "理论烧损", width: 150 },
      { field: "NLlCleanLen", headerName: "理论毛长", width: 150 },
      { field: "NBoarCleanLen", headerName: "母板净长", width: 150 },
      { field: "CThickRange", headerName: "厚度区间", width: 150 },
      { field: "CDelivyQtyFlag", headerName: "计重方式", width: 150 },
      { field: "CTol", headerName: "公差", width: 150 },
      { field: "CFlawStand", headerName: "探伤标准", width: 150 },
      { field: "CFlawDesc", headerName: "探伤等级", width: 150 },
      { field: "CTransType", headerName: "运输方式", width: 150 },
      { field: "CStoreRoom", headerName: "库房", width: 150 },
      { field: "CRzFlag", headerName: "是否认证", width: 150 },
      { field: "CSampleSpec", headerName: "样品规格", width: 150 },
      { field: "CSpecialMarkGy", headerName: "工艺/性能要求", width: 150 },
      { field: "CAddress", headerName: "到货地址", width: 150 },
      { field: "CThickRangeDis", headerName: "厚度区分", width: 150 },
      { field: "CSingleSlab", headerName: "单片钢坯", width: 150 },
      { field: "NLenPlan1", headerName: "套切长度1", width: 150 },
      { field: "NLenPlan2", headerName: "套切长度2", width: 150 },
      { field: "NLenPlan3", headerName: "套切长度3", width: 150 },
      { field: "NLenPlan4", headerName: "套切长度4", width: 150 },
      { field: "NRate", headerName: "理论成材率", width: 150 },
      { field: "NPlanBoarLen", headerName: "计划母板长", width: 150 },
      { field: "CRollType", headerName: "轧制方式", width: 150 },
      { field: "NLlProduceKs", headerName: "理论生产块数", width: 150 },
      { field: "NDcLen", headerName: "带出长度", width: 150 },
      { field: "DJhqTime", headerName: "合同交货期", width: 150 },
      { field: "CZWidth", headerName: "展宽比", width: 150 },
      { field: "CRollNo", headerName: "补轧标识", width: 150 },
      { field: "NColdSlabKs", headerName: "冷坯块数", width: 150 },
      { field: "NColdSlabNum", headerName: "冷坯吨数", width: 150 },
      { field: "CInboundNo", headerName: "入库标识", width: 150 },
      { field: "CDelivyAddress", headerName: "流向", width: 150 },
      { field: "CRepairProduce", headerName: "补产", width: 150 },
      { field: "Id", headerName: "主键", hide: true },
      { field: "LastModifier", headerName: "最后修改人", hide: true },
      { field: "LastModifyTime", headerName: "最后修改时间", hide: true },
      { field: "NStatus", headerName: "订单状态", hide: true },
      { field: "CTlOrderNo", headerName: "提料订单号", hide: true },
      { field: "CIsMerge", headerName: "是否合并提料", hide: true },
      { field: "CLineCode", headerName: "产线代码", hide: true },
      { field: "CConNo", headerName: "合同号", hide: true },
      { field: "NWgtSy", headerName: "剩余重量", hide: true },
      { field: "NThickMin", headerName: "厚度下限", hide: true },
      { field: "NThickMax", headerName: "厚度上限", hide: true },
      { field: "NWidthMin", headerName: "宽度下限", hide: true },
      { field: "NWidthMax", headerName: "宽度上限", hide: true },
      { field: "CSteelType", headerName: "钢类", hide: true },
      { field: "CProdCode", headerName: "品名代码", hide: true },
      { field: "CMsc", headerName: "冶金规范", hide: true },
      { field: "CPsc", headerName: "产品规范码", hide: true },
      { field: "CMscLineNo", headerName: "冶金规范产线号", hide: true },
      { field: "CMscLineDesc", headerName: "产线描述", hide: true },
      { field: "CWholeBacklog", headerName: "全程工序码", hide: true },
      { field: "CWholeBacklogDesc", headerName: "全程工序说明", hide: true },
      { field: "CCustStdCode", headerName: "加工用途代码", hide: true },
      { field: "COrderCustNo", headerName: "订货客户编码", hide: true },
      { field: "COrderCustEname", headerName: "订货客户英文名称", hide: true },
      { field: "CProductH", headerName: "重点品种", hide: true },
      { field: "COrderTypeCode", headerName: "合同性质QAA期货", hide: true },
      { field: "CExportFlag", headerName: "出口标志", hide: true },
      { field: "DOrderTime", headerName: "订单日期", hide: true },
      { field: "CMatCode", headerName: "物料编码", hide: true },
      { field: "CMatName", headerName: "物料名称", hide: true },
      { field: "CSlabType", headerName: "自备坯R", hide: true },
      { field: "CConRemark", headerName: "合同备注", hide: true },
      { field: "CWarrantyDesc", headerName: "质保书要求", hide: true },
      { field: "CPackCode", headerName: "特殊包装要求", hide: true },
      { field: "COrderProcFlag", headerName: "合同处理标志（", hide: true },
      { field: "CDeptCode", headerName: "部门编码", hide: true },
      { field: "NFlag", headerName: "计划类型", hide: true },
      { field: "CProdName", headerName: "品名名称", hide: true },
      { field: "CDelivyStatusDesc", headerName: "交货状态说明", hide: true },
      { field: "CCustStdDesc", headerName: "加工用途说明", hide: true },
      { field: "NApplyCloseStatus", headerName: "1待封锁", hide: true },
      { field: "CApplyCloseEmp", headerName: "申请关闭人", hide: true },
      { field: "DApplyCloseDt", headerName: "申请关闭时间", hide: true },
      { field: "CApplyCloseRemark", headerName: "申请关闭说明", hide: true },
      { field: "CDesignNo", headerName: "质量设计号", hide: true },
      { field: "CDesignDesc", headerName: "质量设计失败说明", hide: true },
      { field: "NWtMax", headerName: "单量上限", hide: true },
      { field: "NWtMin", headerName: "单量下限", hide: true },
      { field: "NSendNum", headerName: "发送次数", hide: true },
      { field: "COverstepBl", headerName: "短溢装比例", hide: true },
      { field: "CShape", headerName: "形状代码", hide: true },
      { field: "CSlabSource", headerName: "供坯单位", hide: true },
      { field: "CTlSgStd", headerName: "炼钢标准", hide: true },
      { field: "NSlabLenMax", headerName: "钢坯长度最大值", hide: true },
      { field: "NWgtMeter", headerName: "钢坯米单重", hide: true },
      { field: "NSlabWgtSy", headerName: "坯料剩余重量", hide: true },
      { field: "CSlabRemark", headerName: "提料备注", hide: true },
      { field: "NTlStatus", headerName: "提料状态", hide: true },
      { field: "CTlRemark", headerName: "提料失败说明", hide: true },
      { field: "CTlName", headerName: "提料操作人", hide: true },
      { field: "DTlTime", headerName: "提料时间", hide: true },
      { field: "CTlOrderFlag", headerName: "是否提料订单", hide: true },
      { field: "CCcmCode", headerName: "连铸机编码", hide: true },
      { field: "NSfpj", headerName: "评审状态", hide: true },
      { field: "CPjName", headerName: "评审人", hide: true },
      { field: "DPjTime", headerName: "评审时间", hide: true },
      { field: "CPjRemark", headerName: "评审失败原因", hide: true },
      { field: "CSlabSize", headerName: "坯料规格", hide: true },
      { field: "CStNo", headerName: "炼钢工艺卡", hide: true },
      { field: "CZgGyCode", headerName: "轧钢工艺编码", hide: true },
      { field: "COrderNoOld", headerName: "原始订单号", hide: true },
      { field: "COrderNo5", headerName: "订单号5", hide: true },
      { field: "COrderNo6", headerName: "订单号6", hide: true },
      { field: "NLenPlan5", headerName: "套切长度5", hide: true },
      { field: "NLenPlan6", headerName: "套切长度6", hide: true },
      { field: "CJqgyCode", headerName: "剪切工艺编码", hide: true },
      { field: "CJrzzgyCode", headerName: "加热轧制工艺编码", hide: true },
      { field: "CSpecPlan", headerName: "生产规格", hide: true },
      { field: "CStoreShift", headerName: "炉次", hide: true },
      { field: "CThreading1", headerName: "套切1", hide: true },
      { field: "CThreading2", headerName: "套切2", hide: true },
      { field: "CThreading3", headerName: "套切3", hide: true },
      { field: "CThreading4", headerName: "套切4", hide: true },
      { field: "CVirtualStoreCode", headerName: "虚拟炉号", hide: true },
      { field: "CYcAlert", headerName: "异常提醒", hide: true },
      { field: "CZggyCode", headerName: "轧钢工艺编码", hide: true },
      { field: "DTimeShipment", headerName: "预计船期", hide: true },
      { field: "NLenTolMax", headerName: "长度上偏差", hide: true },
      { field: "NLenTolMin", headerName: "长度下偏差", hide: true },
      { field: "NLgPlanStatus", headerName: "炼钢计划状态", hide: true },
      { field: "NThickTolMax", headerName: "厚度上偏差", hide: true },
      { field: "NThickTolMin", headerName: "厚度下偏差", hide: true },
      { field: "NWidthTolMax", headerName: "宽度上偏差", hide: true },
      { field: "NWidthTolMin", headerName: "宽度下偏差", hide: true },
      { field: "NZlWgt", headerName: "组炉重量", hide: true },
      { field: "CPieceNo", headerName: "板坯号", hide: true },
]));

/* 查询条件（原 stackPanel1：时间 dtS~dtE、批量订单号 comOrder、提料状态 icboTlStatus+label「提料状态」） */
const q = reactive({
  dBegin: null as Date | null,
  dEnd: null as Date | null,
  cOrderNo: "",
  nTlStatus: null as number | null,
});
const tlStatusOptions = [
  { label: "未提料", value: OrderTlEnum.NoTl },
  { label: "已提料", value: OrderTlEnum.YesTl },
  { label: "已审核", value: OrderTlEnum.Checked },
];

function fmt(d?: Date | null): string | undefined {
  if (!d) return undefined;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function splitOrders(): string[] | undefined {
  const list = parseBatchIds(q.cOrderNo);
  return list.length ? list : undefined;
}

function onOrderReady(e: GridReadyEvent) {
  orderApi.value = e.api;
}
function onNoCheckReady(e: GridReadyEvent) {
  noCheckApi.value = e.api;
}
function onCheckReady(e: GridReadyEvent) {
  checkApi.value = e.api;
}
function autosizeAll() {
  requestAnimationFrame(() => {
    orderApi.value?.autoSizeAllColumns();
    noCheckApi.value?.autoSizeAllColumns();
    checkApi.value?.autoSizeAllColumns();
  });
}

function pickedRows(api: GridApi | null): TlRow[] {
  return (api?.getSelectedRows() ?? []) as TlRow[];
}
function ord(r: TlRow): string {
  return r.cOrderNo ?? r.COrderNo ?? "";
}
function distinctNos(list: TlRow[]): string[] {
  return [...new Set(list.map(ord).filter(Boolean))];
}

async function bindTl() {
  const common = {
    dTimeStart: fmt(q.dBegin),
    dTimeEnd: fmt(q.dEnd),
    cLineCode: lineCode,
    orderLst: splitOrders(),
  };
  const [nc, c] = await Promise.all([
    tLApi.queryOrderNew({ ...common, nTlStatus: OrderTlEnum.YesTl } as InputTmp2010Dto),
    tLApi.queryOrderNew({ ...common, nTlStatus: OrderTlEnum.Checked } as InputTmp2010Dto),
  ]);
  noCheckRows.value = (nc ?? []) as TlRow[];
  checkRows.value = (c ?? []) as TlRow[];
}

/** 查询：simpleButton1_Click——三表齐查（BindOrder + BindNoCheck + BindCheck） */
async function query() {
  querying.value = true;
  try {
    const orders = await tLApi.getOrderLst2({
      cLineCode: lineCode,
      dBegin: fmt(q.dBegin),
      dEnd: fmt(q.dEnd),
      cOrderNo: parseBatchIds(q.cOrderNo).join("\n") || undefined,
    } as InputTmp2000Dto);
    orderRows.value = (orders ?? []) as OrderRow[];
    await bindTl();
    autosizeAll();
  } finally {
    querying.value = false;
  }
}

/** 审核：simpleButton7_Click——读未审核表；长度=0 拦截 + 2290-3650 两级确认（文案逐字照抄） */
async function onCheck() {
  const sel = pickedRows(noCheckApi.value);
  if (sel.length <= 0) {
    toast("没有选择需要审核的订单！", 2500, "warn");
    return;
  }
  const noLens = sel.filter((x) => (x.nSlabLenMin ?? x.NSlabLenMin ?? 0) === 0);
  if (noLens.length > 0) {
    toast("以下提料计划号的钢坯长度小于0，不允许审核！\n" + noLens.map(ord).join(","), 4000, "warn");
    return;
  }
  let msg = "";
  for (const item of sel) {
    const len = item.nSlabLenMin ?? item.NSlabLenMin;
    if (len != null && (len < 2290 || len > 3650)) {
      msg = msg + "提料计划号：" + ord(item) + "的钢坯长度为：" + len + "\n";
    }
  }
  if (msg) {
    if (!window.confirm("以下提料计划，钢坯长度不符合2290-3650\n是否继续审核\n" + msg)) return;
  }
  if (window.confirm("是否确认审核已选中的提料订单？")) {
    await tLApi.checkedTlNew(lineCode, distinctNos(sel));
    await bindTl();
    autosizeAll();
  }
}

/** 取消审核：simpleButton4_Click——读已审核表 */
async function onCancelCheck() {
  const nos = distinctNos(pickedRows(checkApi.value));
  if (nos.length <= 0) {
    toast("没有选择需要取消审核的订单！", 2500, "warn");
    return;
  }
  if (window.confirm("是否确认取消审核已选中的提料订单？")) {
    await tLApi.cancleCheckedTlNew(nos);
    await bindTl();
    autosizeAll();
  }
}

/** 删除：simpleButton2_Click——读未审核表 */
async function onDel() {
  const nos = distinctNos(pickedRows(noCheckApi.value));
  if (nos.length <= 0) {
    toast("没有选择需要删除的提料信息！", 2500, "warn");
    return;
  }
  if (window.confirm("是否确认删除已选中的提料信息？")) {
    await tLApi.delTl(nos);
    await bindTl();
    autosizeAll();
  }
}

/** 已审提料生产关闭：btnProdClose_Click——读已审核整行，.cs 成功后不回查 */
async function onProdClose() {
  const sel = pickedRows(checkApi.value);
  if (sel.length <= 0) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  const count = (await tLApi.tlProdClose(sel as Tmp2005Dto[])) ?? 0;
  toast(`执行成功${count}条！`, 2000, "success");
}

/** 提料导入：btnImport_Click——FrmTL2000Date → Excel → FrmTL2000Import → importTmp2005，二级弹窗占位 */
function onImport() {
  toast("提料导入弹窗（FrmTL2000Date/FrmTL2000Import）待接入", 2500, "warn");
}

/** 冷坯提料导入：simpleButton3_Click——先确认「是否确认导入冷坯计划？」，弹窗占位（YN.Y） */
function onColdImport() {
  if (!window.confirm("是否确认导入冷坯计划？")) return;
  toast("冷坯提料导入弹窗（FrmTL2000Date/FrmTL2000Import，YN.Y）待接入", 2500, "warn");
}

onMounted(() => {
  const now = new Date();
  q.dBegin = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
  q.dEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件行（原 stackPanel1 Dock=Top：时间 dtS~dtE / 批量订单号 comOrder / 提料状态 icboTlStatus+Label） -->
    <div class="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/60 px-2 py-1.5">
      <label class="shrink-0 text-xs text-muted-foreground">时间</label>
      <DatePicker v-model="q.dBegin" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">~</label>
      <DatePicker v-model="q.dEnd" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <BatchIdInput v-model="q.cOrderNo" label="批量订单号" class="w-80 shrink-0" />
      <!-- 原 icboTlStatus + LabelControl「提料状态」（成对出现，label 不得单独隐藏） -->
      <label class="shrink-0 text-xs text-muted-foreground">提料状态</label>
      <Select v-model="q.nTlStatus" :options="tlStatusOptions" option-label="label" option-value="value"
        placeholder="请选择" show-clear class="w-40 shrink-0" />
    </div>

    <!-- 工具栏（原 stackPanel3 Dock=Top：查询/提料导入/审核/取消审核/删除/冷坯提料导入/已审提料生产关闭） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onImport">提料导入</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onCheck">
        <IconCheck class="h-3 w-3" />审核
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onCancelCheck">
        <IconX class="h-3 w-3" />取消审核
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onDel">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onColdImport">冷坯提料导入</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onProdClose">已审提料生产关闭</Button>
    </div>

    <!-- 三页签三表（原 tabControl1：销售订单/未审核提料单/已审核提料单） -->
    <Tabs v-model:value="activeTab" class="min-h-0 flex-1 flex-col">
      <TabList>
        <Tab value="order">销售订单</Tab>
        <Tab value="nocheck">未审核提料单</Tab>
        <Tab value="check">已审核提料单</Tab>
      </TabList>
      <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
        <TabPanel value="order" class="h-full p-0">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="orderCols"
            :row-data="orderRows"
            :pagination="false"
            :loading="querying"
            @grid-ready="onOrderReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </TabPanel>
        <TabPanel value="nocheck" class="h-full p-0">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="noCheckCols"
            :row-data="noCheckRows"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :pagination="false"
            :loading="querying"
            @grid-ready="onNoCheckReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </TabPanel>
        <TabPanel value="check" class="h-full p-0">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="checkCols"
            :row-data="checkRows"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :pagination="false"
            :loading="querying"
            @grid-ready="onCheckReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
