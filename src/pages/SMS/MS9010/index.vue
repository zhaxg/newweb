<script setup lang="ts">
/** 对应 FrmMS9010（库存坯料挂单/中间坯挂单，2 菜单共用 cQueryString=LG02/ZG01）：DDH.Winforms.SMS.Forms.FrmMS9010
 *  已接入：tLApi.queryOrderNew（订单查询 btnQueryOrder/BindData——DTimeStart/DTimeEnd/CLineCode=OrderLine、NTlStatus=Checked、CCool=Y、OrderLst 换行拆）
 *          + tms9001Api.queryStorages（库存查询 btnQueryStorage/LoadStorage——LineCode=StorageLine、CStoreCode、炉号/铸坯号/钢种、长度/厚/宽区间）
 *          + tms9001Api.mathPlan（匹配 btnMatch：勾选未匹配材料 + 焦点计划，超量拦截「已超量{n}/{支数}，不允许操作」、
 *            确认「确认匹配计划？数量{n}\n单号/钢种/规格」（描述串照 Tms9000PlanItemDto.ToString 逐字复刻）→ 成功后重查库存）
 *          + tms9001Api.cancelMathPlan（取消匹配 btnCancelMatch：勾选已匹配材料 → 取消原因 → 重查库存）
 *          + 按订单查询 btn（焦点计划行 → 长度/厚/宽区间与钢种回填 → 自动 LoadStorage，照构造函数 lambda）
 *  cQueryString：原 .cs 按 JSON {OrderLine,CStoreCode,StorageLine} 解析（解析失败弹「无法解析输入参数」）；
 *                菜单种子为裸产线码 LG02/ZG01 —— 裸码同时作为 OrderLine/StorageLine，JSON 串则按字段取（兼容两种）
 *  分栏：原 splitContainerControl1 Horizontal=false SplitterPosition=243——上=订单表(gridControl2)，下=库存过滤+按钮+材料明细(UCStorage)
 *  列集：双表按 extract 全列——订单表 74 可见+98 隐藏 / 材料表(UCStorage) 127 可见+1 隐藏(层号 CStackNum)；
 *        Selected 选择列由 row-selection 复选框呈现（ui-rules §7），原列 hide:true 保留在列面板
 *  待接入：取消原因字典下拉（原 QuerySysKvItemList(CANCEL_MATCH_REASON)→FrmConfirmValueDialog，swagger 未生成该方法，
 *          现以 window.prompt 复刻对话框，选项字典待补）；StorageMatchPlanRule 前端规则校验未迁（依赖 Hmx widget 规则库，交后端 mathPlan 校验）
 *  字段桥接：extract 为 C# PascalCase，后端 JSON 为 camelCase —— valueGetter/valueSetter 双写（PLAN_* 首字母小写即 pLAN_* 契约） */
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueGetterParams, ValueSetterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import RangeInput from "@/components/common/RangeInput.vue";
import { tms9001Api, type MS3000SjInputDto, type Tms9000MatchDto, type Tyd2000Dto } from "@/api/mes4ddh/sms.swagger";
import { tLApi, OrderTlEnum, type InputTmp2010Dto, type Tmp2005Dto } from "@/api/mes4ddh/smp.swagger";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import BatchIdInput from "@/pages/Widgets/BatchIdInput/index.vue";
import { parseBatchIds } from "@/pages/Widgets/BatchIdInput/parse";

const { toast } = useToast();
const { raw: menuQs, json: menuJson } = useMenuQuery();

/* cQueryString：JSON {OrderLine,CStoreCode,StorageLine} 优先，裸产线码兜底（LG02/ZG01 同时作订单/库存产线） */
const qsDto = menuJson as { OrderLine?: string; CStoreCode?: string; StorageLine?: string };
const plainLine = menuQs && !menuQs.startsWith("{") ? menuQs : undefined;
const orderLine = qsDto.OrderLine ?? plainLine;
const storageLine = qsDto.StorageLine ?? plainLine;
const storeCode = qsDto.CStoreCode;

const theme = makeHmxGridTheme();
const orderQuerying = ref(false);
const storageLoading = ref(false);
const orderApi = ref<GridApi | null>(null);
const storageApi = ref<GridApi | null>(null);

/** extract 字段为 PascalCase、后端 JSON 为 camelCase：统一桥接读写（PLAN_* → pLAN_*） */
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

type PlanRow = Tmp2005Dto & {
  Selected?: boolean;
  COrderNo?: string;
  NSlabThick?: number | null;
  NSlabWidth?: number | null;
  NSlabLenMin?: number | null;
  NSlabQua?: number | null;
  CTlSgCode?: string | null;
  CTlSgStd?: string | null;
};
type StorRow = Tyd2000Dto & { Selected?: boolean; COrderNo?: string | null; CPieceNo?: string };
const orderRows = ref<PlanRow[]>([]);
const storageRows = ref<StorRow[]>([]);
const focusedPlan = ref<PlanRow | null>(null);

/* ===== 订单表（原 gridControl2/gridView1：74 可见 + 98 隐藏） ===== */
const orderCols = ref<ColDef[]>(bridge([
      { field: "Selected", headerName: "选择", hide: true },
      { field: "COrderNo", headerName: "订单号", width: 130 },
      { field: "COrderCustCname", headerName: "订货客户中文名称", width: 130 },
      { field: "COrderNo1", headerName: "订单号1", width: 130 },
      { field: "COrderNo2", headerName: "订单号2", width: 130 },
      { field: "COrderNo3", headerName: "订单号3", width: 130 },
      { field: "COrderNo4", headerName: "订单号4", width: 130 },
      { field: "CSgCode", headerName: "钢种", width: 130 },
      { field: "CSgStd", headerName: "执行标准", width: 130 },
      { field: "NThick", headerName: "厚度", width: 130 },
      { field: "NWidth", headerName: "宽度", width: 130 },
      { field: "NWidthWgt", headerName: "边部宽度余量", width: 130 },
      { field: "NLen", headerName: "长度", width: 130 },
      { field: "CLengthType", headerName: "长度类型", width: 130 },
      { field: "NLenMax", headerName: "长度上限", width: 130 },
      { field: "NLenMin", headerName: "长度下限", width: 130 },
      { field: "CDelivyStatusCode", headerName: "交货状态", width: 130 },
      { field: "NNum", headerName: "订货件数", width: 130 },
      { field: "NWgt", headerName: "订单重量", width: 130 },
      { field: "CTrimFlag", headerName: "切边方式", width: 130 },
      { field: "CSpec", headerName: "规格", width: 130 },
      { field: "CTlSgCode", headerName: "炼钢钢种", width: 130 },
      { field: "NSlabThick", headerName: "钢坯厚度", width: 130 },
      { field: "NSlabWidth", headerName: "钢坯宽度", width: 130 },
      { field: "NSlabLenMin", headerName: "钢坯长度最小值", width: 130 },
      { field: "NSlabQua", headerName: "钢坯支数", width: 130 },
      { field: "NWgtUnit", headerName: "钢坯单支重量", width: 130 },
      { field: "NSlabWgt", headerName: "坯料重量", width: 130 },
      { field: "NThickPlan", headerName: "生产板厚", width: 130 },
      { field: "NWidthPlan", headerName: "生产板宽", width: 130 },
      { field: "NLenPlan", headerName: "生产板长", width: 130 },
      { field: "NDbc", headerName: "单倍尺", width: 130 },
      { field: "NSteelSingleWgt", headerName: "钢板单重", width: 130 },
      { field: "NPlanedBoardNum", headerName: "排产子板数", width: 130 },
      { field: "NPlanedWgt", headerName: "排产净重", width: 130 },
      { field: "NConSteelKs", headerName: "合同带出钢板块数", width: 130 },
      { field: "NConSteelNum", headerName: "合同带出钢板数量", width: 130 },
      { field: "NTlTol", headerName: "提料公差", width: 130 },
      { field: "NLlBoardWgt", headerName: "理论子板重（含板边）", width: 130 },
      { field: "NLlBoardEndWgt", headerName: "理论板头重", width: 130 },
      { field: "NLlBoardEdge", headerName: "理论板边", width: 130 },
      { field: "NLlBoardEnd", headerName: "理论板头", width: 130 },
      { field: "NLlBurnLoss", headerName: "理论烧损", width: 130 },
      { field: "NLlCleanLen", headerName: "理论毛长", width: 130 },
      { field: "NBoarCleanLen", headerName: "母板净长", width: 130 },
      { field: "CThickRange", headerName: "厚度区间", width: 130 },
      { field: "CDelivyQtyFlag", headerName: "计重方式", width: 130 },
      { field: "CTol", headerName: "公差", width: 130 },
      { field: "CFlawStand", headerName: "探伤标准", width: 130 },
      { field: "CFlawDesc", headerName: "探伤等级", width: 130 },
      { field: "CTransType", headerName: "运输方式", width: 130 },
      { field: "CStoreRoom", headerName: "库房", width: 130 },
      { field: "CRzFlag", headerName: "是否认证", width: 130 },
      { field: "CSampleSpec", headerName: "样品规格", width: 130 },
      { field: "CSpecialMarkGy", headerName: "工艺/性能要求", width: 130 },
      { field: "CAddress", headerName: "到货地址", width: 130 },
      { field: "CThickRangeDis", headerName: "厚度区分", width: 130 },
      { field: "CSingleSlab", headerName: "单片钢坯", width: 130 },
      { field: "NLenPlan1", headerName: "套切长度1", width: 130 },
      { field: "NLenPlan2", headerName: "套切长度2", width: 130 },
      { field: "NLenPlan3", headerName: "套切长度3", width: 130 },
      { field: "NLenPlan4", headerName: "套切长度4", width: 130 },
      { field: "NPlanBoarLen", headerName: "计划母板长", width: 130 },
      { field: "CRollType", headerName: "轧制方式", width: 130 },
      { field: "NLlProduceKs", headerName: "理论生产块数", width: 130 },
      { field: "NDcLen", headerName: "带出长度", width: 130 },
      { field: "DJhqTime", headerName: "合同交货期", width: 130 },
      { field: "CZWidth", headerName: "展宽比", width: 130 },
      { field: "CRollNo", headerName: "补轧标识", width: 130 },
      { field: "NColdSlabKs", headerName: "冷坯块数", width: 130 },
      { field: "NColdSlabNum", headerName: "冷坯吨数", width: 130 },
      { field: "CInboundNo", headerName: "入库标识", width: 130 },
      { field: "CDelivyAddress", headerName: "流向", width: 130 },
      { field: "CRepairProduce", headerName: "补产", width: 130 },
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
      { field: "NRate", headerName: "理论成材率", hide: true },
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
]));

/* ===== 材料明细表（原 UCStorage gridView1：127 可见 + 1 隐藏；PLAN_* → pLAN_* 契约由桥接自动完成） ===== */
const storageCols = ref<ColDef[]>(bridge([
      { field: "Selected", headerName: "选择", hide: true },
      { field: "Id", headerName: "主键", width: 149 },
      { field: "CStove", headerName: "炉号", width: 149 },
      { field: "CPieceNo", headerName: "件次号", width: 149 },
      { field: "NProType", headerName: "库存分类", width: 149 },
      { field: "CPrintCode", headerName: "喷号", width: 149 },
      { field: "CLineCode", headerName: "产线", width: 149 },
      { field: "CProc", headerName: "工序代码", width: 149 },
      { field: "CMachine", headerName: "机台号", width: 149 },
      { field: "CStrandNo", headerName: "流号", width: 149 },
      { field: "CPlanId", headerName: "计划号", width: 149 },
      { field: "CConNo", headerName: "合同号", width: 149 },
      { field: "COrderNo", headerName: "订单号", width: 149 },
      { field: "CMatCode", headerName: "物料编码", width: 149 },
      { field: "CSgCode", headerName: "钢种", width: 149 },
      { field: "CSgStd", headerName: "执行标准", width: 149 },
      { field: "NThick", headerName: "厚度", width: 149 },
      { field: "NWth", headerName: "宽度", width: 149 },
      { field: "NLen", headerName: "长度", width: 149 },
      { field: "CSpec", headerName: "规格", width: 149 },
      { field: "NNum", headerName: "支数", width: 149 },
      { field: "NCalWgt", headerName: "理重", width: 149 },
      { field: "NWgt", headerName: "实重", width: 149 },
      { field: "DProTime", headerName: "产出时间", width: 149 },
      { field: "CProUser", headerName: "产出人", width: 149 },
      { field: "CShiftNo", headerName: "产出班次", width: 149 },
      { field: "CGroupNo", headerName: "产出班组", width: 149 },
      { field: "DInTime", headerName: "入库时间", width: 149 },
      { field: "CInUser", headerName: "入库人", width: 149 },
      { field: "CStoreCode", headerName: "库区号", width: 149 },
      { field: "CArer", headerName: "区域", width: 149 },
      { field: "CStackNo", headerName: "垛位号", width: 149 },
      { field: "NStackNum", headerName: "层号", width: 150 },
      { field: "CSourceStoreCode", headerName: "原库区号", width: 149 },
      { field: "CSourceStackNo", headerName: "原垛位号", width: 149 },
      { field: "CSourceStackNum", headerName: "原层号", width: 149 },
      { field: "NStatus", headerName: "库存状态", width: 149 },
      { field: "CIsHot", headerName: "热送区分", width: 149 },
      { field: "CProRemark", headerName: "生产备注", width: 149 },
      { field: "NCastDivCode", headerName: "模连铸标识", width: 149 },
      { field: "CLockedLine", headerName: "占用产线", width: 149 },
      { field: "CLockedPlan", headerName: "占用计划", width: 149 },
      { field: "CMatType", headerName: "产品大类", width: 149 },
      { field: "CProdCode", headerName: "品名", width: 149 },
      { field: "CSteelType", headerName: "钢类", width: 149 },
      { field: "CDelivyStatusCode", headerName: "交货状态", width: 149 },
      { field: "CCustStdCode", headerName: "加工用途代码", width: 149 },
      { field: "CBatchNo", headerName: "批号", width: 149 },
      { field: "COrderNoLast", headerName: "原始订单号", width: 149 },
      { field: "CDestination", headerName: "去向", width: 149 },
      { field: "CHotNo", headerName: "退火炉回号", width: 149 },
      { field: "CSlabType", headerName: "坯类", width: 149 },
      { field: "CPieceNoSlab", headerName: "板坯号", width: 149 },
      { field: "NQmStatus", headerName: "质量状态", width: 149 },
      { field: "NLockReason", headerName: "质量封锁原因", width: 149 },
      { field: "NQmLevel", headerName: "质量等级", width: 149 },
      { field: "CIsSurface", headerName: "是否表检", width: 149 },
      { field: "CSurfaceResult", headerName: "表检结果", width: 149 },
      { field: "CSurfaceDefectCode", headerName: "表面缺陷代码", width: 149 },
      { field: "CSurfaceDesc", headerName: "表检描述", width: 149 },
      { field: "CSurfaceUser", headerName: "表面判定人", width: 149 },
      { field: "DSurfaceTime", headerName: "表面判定时间", width: 149 },
      { field: "CDetectResultCode", headerName: "探伤判定结果", width: 149 },
      { field: "CDetectDefectLevel", headerName: "探伤等级", width: 149 },
      { field: "CDefectDefectCode", headerName: "探伤判定缺陷代码", width: 149 },
      { field: "CDefectDefectMark", headerName: "探伤判定缺陷描述", width: 149 },
      { field: "CDefectUser", headerName: "表面判定人", width: 149 },
      { field: "DDefectTime", headerName: "表面判定时间", width: 149 },
      { field: "CComplexDecideCode", headerName: "综判结果", width: 149 },
      { field: "CComplexDesc", headerName: "综判描述", width: 149 },
      { field: "CComplexUser", headerName: "综判人", width: 149 },
      { field: "DComplexTime", headerName: "综判时间", width: 149 },
      { field: "CQmHandleCode", headerName: "处置结果", width: 149 },
      { field: "CQmHandleDesc", headerName: "处置注释", width: 149 },
      { field: "CQmHandleUser", headerName: "处置人", width: 149 },
      { field: "DQmHandleTime", headerName: "处置时间", width: 149 },
      { field: "CSampleLotNo", headerName: "试批号", width: 149 },
      { field: "CSampleLotNoPre", headerName: "前试批号", width: 149 },
      { field: "CCutFlag", headerName: "切边方式", width: 149 },
      { field: "CInboundNo", headerName: "入库标识", width: 149 },
      { field: "CDelivyAddress", headerName: "流向", width: 149 },
      { field: "CWgtToler", headerName: "公差等级", width: 149 },
      { field: "CBilletTypeCode", headerName: "铸坯标识", width: 149 },
      { field: "CCusName", headerName: "客户名称", width: 149 },
      { field: "PLAN_CSpec", headerName: "剪切计划规格", width: 149 },
      { field: "PLAN_NThickPlan", headerName: "轧制厚", width: 149 },
      { field: "PLAN_NWidthPlan", headerName: "轧制宽", width: 149 },
      { field: "PLAN_NLlCleanLen", headerName: "轧制长", width: 149 },
      { field: "PLAN_COrderNo1", headerName: "订单号1", width: 149 },
      { field: "PLAN_COrderNo2", headerName: "订单号2", width: 149 },
      { field: "PLAN_COrderNo3", headerName: "订单号3", width: 149 },
      { field: "PLAN_COrderNo4", headerName: "订单号4", width: 149 },
      { field: "PLAN_COrderNo5", headerName: "订单号5", width: 149 },
      { field: "PLAN_COrderNo6", headerName: "订单号6", width: 149 },
      { field: "PLAN_NLenPlan1", headerName: "套切长度1", width: 149 },
      { field: "PLAN_NLenPlan2", headerName: "套切长度2", width: 149 },
      { field: "PLAN_NLenPlan3", headerName: "套切长度3", width: 149 },
      { field: "PLAN_NLenPlan4", headerName: "套切长度4", width: 149 },
      { field: "PLAN_NLenPlan5", headerName: "套切长度5", width: 149 },
      { field: "PLAN_NLenPlan6", headerName: "套切长度6", width: 149 },
      { field: "NKSgCode", headerName: "国标钢种", width: 149 },
      { field: "CPlanTime", headerName: "计划日期", width: 149 },
      { field: "CTol", headerName: "公差", width: 149 },
      { field: "TypeValues", headerName: "钢板分类", width: 73 },
      { field: "CAutoJudgeResult", headerName: "委托自动判定结果", width: 149 },
      { field: "CJudgeRemark", headerName: "委托判定备注", width: 149 },
      { field: "CJudgeResult", headerName: "委托最终判定结果", width: 149 },
      { field: "CJudgeUser", headerName: "委托判定人", width: 149 },
      { field: "CRecheckFlag", headerName: "复验标记", width: 149 },
      { field: "CStatus", headerName: "委托单状态", width: 149 },
      { field: "DJudgeTime", headerName: "委托判定时间", width: 149 },
      { field: "CTlSgCode", headerName: "炼钢钢种", width: 130 },
      { field: "COutUser", headerName: "出库人", width: 100 },
      { field: "DOutTime", headerName: "出库时间", width: 100 },
      { field: "CInboundNo1", headerName: "入库标识1", width: 150 },
      { field: "CInboundNo2", headerName: "入库标识2", width: 150 },
      { field: "CInboundNo3", headerName: "入库标识3", width: 150 },
      { field: "CInboundNo4", headerName: "入库标识4", width: 150 },
      { field: "CInboundNo5", headerName: "入库标识5", width: 150 },
      { field: "CInboundNo6", headerName: "入库标识6", width: 150 },
      { field: "COrderCustCname", headerName: "订货客户中文名称", width: 150 },
      { field: "CSpecialMarkGy", headerName: "工艺/性能要求", width: 150 },
      { field: "NDbc", headerName: "倍尺", width: 150 },
      { field: "LastModifier", headerName: "最后修改人", width: 150 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 150 },
      { field: "CIsMatchOrder", headerName: "是否满足订单要求", width: 150 },
      { field: "NTransferNo", headerName: "吊号", width: 150 },
      { field: "CStackNum", headerName: "层号", hide: true },
]));

/* 订单查询条件（原 stackPanel1：时间 dtS~dtE、批量订单号 comOrder） */
const q = reactive({
  dBegin: null as Date | null,
  dEnd: null as Date | null,
  cOrderNo: "",
});

/* 库存过滤（原 dataLayoutControl1：炉号/铸坯号/钢种 + UCDecimalRange 长度/宽度/厚） */
const f = reactive({
  cStove: "",
  cPieceNo: "",
  cSgCode: "",
  lenMin: null as number | null,
  lenMax: null as number | null,
  thickMin: null as number | null,
  thickMax: null as number | null,
  wthMin: null as number | null,
  wthMax: null as number | null,
});

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
function onStorageReady(e: GridReadyEvent) {
  storageApi.value = e.api;
}
/** 勾选材料行（ui-rules §7：row-selection 复选框，替代原 Selected 手写勾选列） */
function pickedStorages(): StorRow[] {
  return (storageApi.value?.getSelectedRows() ?? []) as StorRow[];
}
function planNo(r: PlanRow): string {
  return r.cOrderNo ?? r.COrderNo ?? "";
}
function pieceNo(r: StorRow): string {
  return r.cPieceNo ?? r.CPieceNo ?? "";
}
function onPlanClick(e: { data?: PlanRow }) {
  if (e.data) focusedPlan.value = e.data;
}

/** 订单查询：btnQueryOrder_Click → BindData（NTlStatus=Checked + CCool=Y；原 Load 不自动查） */
async function queryOrders() {
  orderQuerying.value = true;
  try {
    const input = {
      dTimeStart: fmt(q.dBegin),
      dTimeEnd: fmt(q.dEnd),
      cLineCode: orderLine,
      nTlStatus: OrderTlEnum.Checked,
      cCool: "Y",
      orderLst: splitOrders(),
    } as unknown as InputTmp2010Dto;
    orderRows.value = ((await tLApi.queryOrderNew(input)) ?? []) as PlanRow[];
    requestAnimationFrame(() => orderApi.value?.autoSizeAllColumns());
  } finally {
    orderQuerying.value = false;
  }
}

/** 库存查询：btnQueryStorage_Click → LoadStorage */
async function loadStorage() {
  storageLoading.value = true;
  try {
    const input = {
      lineCode: storageLine,
      cStoreCode: storeCode,
      cStove: f.cStove.trim() || undefined,
      cPieceNo: f.cPieceNo.trim() || undefined,
      cSgCode: f.cSgCode.trim() || undefined,
      lenRange: { min: f.lenMin, max: f.lenMax },
      thickRange: { min: f.thickMin, max: f.thickMax },
      wthRange: { min: f.wthMin, max: f.wthMax },
    } as MS3000SjInputDto;
    storageRows.value = ((await tms9001Api.queryStorages(input)) ?? []) as StorRow[];
    requestAnimationFrame(() => storageApi.value?.autoSizeAllColumns());
  } finally {
    storageLoading.value = false;
  }
}

/** 按订单查询：构造函数 btn.Click——焦点计划回填长度/厚/宽区间与钢种后重查库存 */
function queryByOrder() {
  const plan = focusedPlan.value;
  if (!plan) {
    toast("请选择订单", 2000, "warn");
    return;
  }
  const len = plan.nSlabLenMin ?? plan.NSlabLenMin ?? null;
  f.lenMin = len;
  f.lenMax = len;
  f.thickMin = plan.nSlabThick ?? plan.NSlabThick ?? null;
  f.thickMax = plan.nSlabThick ?? plan.NSlabThick ?? null;
  f.wthMin = plan.nSlabWidth ?? plan.NSlabWidth ?? null;
  f.wthMax = plan.nSlabWidth ?? plan.NSlabWidth ?? null;
  f.cSgCode = plan.cTlSgCode ?? plan.CTlSgCode ?? "";
  void loadStorage();
}

/** 匹配：btnMatch_Click → Match(false)——勾选未匹配材料 + 焦点计划，超量拦截与确认文案照 .cs（描述=ToString 复刻） */
async function onMatch() {
  const stor = pickedStorages().filter((s) => !(s.cOrderNo ?? s.COrderNo));
  if (!stor.length) {
    toast("请选择未匹配的材料", 2500, "warn");
    return;
  }
  const plan = focusedPlan.value;
  if (!plan) {
    toast("请选择计划后再操作", 2500, "warn");
    return;
  }
  const planNum = plan.nSlabQua ?? plan.NSlabQua ?? 0;
  const count = stor.length;
  /* 原 planItem.NNum 未赋值（=0）→ 已超量 = 勾选数 > 计划支数 */
  if (count > planNum) {
    toast(`已超量${count}/${planNum}，不允许操作`, 3000, "warn");
    return;
  }
  const thick = plan.nSlabThick ?? plan.NSlabThick ?? 0;
  const width = plan.nSlabWidth ?? plan.NSlabWidth ?? 0;
  const lenMin = plan.nSlabLenMin ?? plan.NSlabLenMin ?? 0;
  const desc =
    `单号：${planNo(plan)}\n` +
    `钢种：${plan.cTlSgCode ?? plan.CTlSgCode ?? ""} ${plan.cTlSgStd ?? plan.CTlSgStd ?? ""}\n` +
    `规格：${thick}*${width}*${lenMin}`;
  if (!window.confirm(`确认匹配计划？数量${count}\n${desc}`)) return;
  const dto = {
    pieceNos: stor.map(pieceNo),
    matchPlanId: planNo(plan),
    isAllow: false,
  } as unknown as Tms9000MatchDto;
  await tms9001Api.mathPlan(dto);
  await loadStorage();
}

/** 取消匹配：btnCancelMatch_Click → CancelMathPlan——取消原因对话框（原 KV 字典下拉，现 prompt 复刻，文案照 .cs） */
async function onCancelMatch() {
  const stor = pickedStorages().filter((s) => !!(s.cOrderNo ?? s.COrderNo));
  if (!stor.length) {
    toast("请选择已匹配的材料", 2500, "warn");
    return;
  }
  const reason = window.prompt(`取消${stor.length}支,请选择取消原因`, "");
  if (reason == null) return;
  if (!reason.trim()) {
    toast("请选择取消原因", 2000, "warn");
    return;
  }
  const dto = {
    pieceNos: stor.map(pieceNo),
    reason: reason.trim(),
  } as unknown as Tms9000MatchDto;
  await tms9001Api.cancelMathPlan(dto);
  await loadStorage();
}

onMounted(() => {
  /* 原 Load：dtS=本月1日、dtE=月末；查询由按钮触发 */
  const now = new Date();
  q.dBegin = new Date(now.getFullYear(), now.getMonth(), 1);
  q.dEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 订单查询行（原 stackPanel1 Dock=Top：时间/批量订单号/查询） -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">时间</label>
      <DatePicker v-model="q.dBegin" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">~</label>
      <DatePicker v-model="q.dEnd" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <BatchIdInput v-model="q.cOrderNo" label="批量订单号" class="w-72 shrink-0" />
      <Button text class="shrink-0 whitespace-nowrap" :loading="orderQuerying" @click="queryOrders">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>

    <!-- 上下分栏（原 splitContainerControl1 Horizontal=false SplitterPosition=243：Panel1=订单表 / Panel2=库存过滤+按钮+材料明细） -->
    <Splitter layout="vertical" class="min-h-0 flex-1">
      <SplitterPanel :size="40" :minSize="15" class="flex flex-col overflow-hidden">
        <AgGridVue
          class="hmx-ag-grid h-full w-full"
          :theme="theme"
          :locale-text="AG_GRID_LOCALE_CN"
          :default-col-def="hmxDefaultColDef"
          :column-defs="orderCols"
          :row-data="orderRows"
          :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
          :pagination="false"
          :loading="orderQuerying"
          @grid-ready="onOrderReady"
          @row-clicked="onPlanClick"
          @first-data-rendered="autoSizeOnFirstData"
        />
      </SplitterPanel>
      <SplitterPanel :size="60" :minSize="20" class="flex flex-col overflow-hidden">
        <!-- 库存过滤行（原 dataLayoutControl1 Dock=Top：炉号/铸坯号/钢种 + 长度/宽度/厚 三个 UCDecimalRange） -->
        <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <label class="shrink-0 text-xs text-muted-foreground">炉号</label>
          <InputText v-model="f.cStove" class="w-28 shrink-0" />
          <label class="shrink-0 text-xs text-muted-foreground">铸坯号</label>
          <InputText v-model="f.cPieceNo" class="w-28 shrink-0" />
          <label class="shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="f.cSgCode" class="w-28 shrink-0" />
          <label class="shrink-0 text-xs text-muted-foreground">长度</label>
          <div class="w-40 shrink-0">
            <RangeInput v-model:min="f.lenMin" v-model:max="f.lenMax" :show-buttons="false" />
          </div>
          <label class="shrink-0 text-xs text-muted-foreground">宽度</label>
          <div class="w-40 shrink-0">
            <RangeInput v-model:min="f.wthMin" v-model:max="f.wthMax" :show-buttons="false" />
          </div>
          <label class="shrink-0 text-xs text-muted-foreground">厚</label>
          <div class="w-40 shrink-0">
            <RangeInput v-model:min="f.thickMin" v-model:max="f.thickMax" :show-buttons="false" />
          </div>
        </div>

        <!-- 库存工具栏 + 表标题（原 stackPanel3：查询/按订单查询/匹配/取消匹配；ucStorage1.ViewCaption=材料明细，按钮左标题右） -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button text class="shrink-0 whitespace-nowrap" :loading="storageLoading" @click="loadStorage">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <Button text class="shrink-0 whitespace-nowrap" @click="queryByOrder">按订单查询</Button>
          <Button text class="shrink-0 whitespace-nowrap" @click="onMatch">匹配</Button>
          <Button text class="shrink-0 whitespace-nowrap" @click="onCancelMatch">取消匹配</Button>
          <span class="ml-auto text-xs font-medium text-muted-foreground">材料明细</span>
        </div>

        <!-- 材料明细表（原 UCStorage gridControl1/gridView1） -->
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="storageCols"
            :row-data="storageRows"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :pagination="false"
            :loading="storageLoading"
            @grid-ready="onStorageReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
