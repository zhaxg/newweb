<script setup lang="ts">
/** 对应 FrmSD2040（中厚板订单质量设计）：DDH.Winforms.SMP.Forms.FrmSD2040
 *  已接入：tmp2000Api.queryOrdersForDesign（查询）/ pushOrderPlan（审核）
 *          qualityDesignApi.designZHB（质量设计/选择轧钢工艺后设计）/ updateZggy（更新轧钢工艺）
 *          qualityDesignApi.queryJggyDesignResult（轧钢工艺页签）/ queryTqmtdDesignResult（质量标准页签）
 *          + systemKeyValueApi.querySysKvItemList（原 JggyIdxRepo：A0100:JGGY.PROC.IDXGRP 指标分类、
 *            A0100:JGGY.INDEX 指标候选）
 *  待接入：FrmSD2041（选择轧钢工艺，二级弹窗占位）；bntPush「审核」原 Visible=false（保留入口）
 *  布局：查询区（8 条件）→ 工具栏 h-9（查询/质量设计/选择轧钢工艺/审核/更新轧钢工艺）
 *        → 上下 Splitter：主表 + 「质量设计结果」分组（轧钢工艺｜质量标准页签）
 *  偏差：原 SplitterPosition 281/424 ≈ 66%，按需求主表高度缩 40% → :size 66→40，下方 34→60
 *        原 UCTqmtdItemsTabView HeaderLocation=Left（成分/性能/取样/其他 页签在左侧），PrimeVue Tabs 在顶部
 *            UCTqmtd1x Editable=false → PanelVisibility=Panel2，左侧候选表不显示，<< 迁移列以 hide 收着
 *  列：主表 49 可见 + 14 hide（按提取摘要） */
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import SelectButton from "primevue/selectbutton";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import {
  IconCopy,
  IconRefresh,
  IconSearch,
  IconSend,
  IconSettings,
} from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type {
  AutoGroupColumnDef,
  ColDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
} from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { NextStrId } from "@/lib/yitIdHelper";
import {
  tmp2000Api,
  type QueryOrdersForDesignInputParameter,
  type Tmp2000,
} from "@/api/mes4ddh/smp.swagger";
import {
  qualityDesignApi,
  type JggyEntities,
  type QualityDesignOutput,
  type Tqmjg04,
  type Tqmtd11,
  type Tqmtd12,
  type Tqmtd13,
  type TqmtdEntities,
} from "@/api/mes4ddh/sqm.swagger";
import { systemKeyValueApi } from "@/api/admin/request";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/* ---------- 查询（原 QueryOrdersForDesignInputParameter：CLineCode=中厚板 ZG01、DBegin=今天-30、DEnd=今天+1） ---------- */
function defaultRange(): [Date, Date] {
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const end = new Date();
  end.setDate(end.getDate() + 1);
  return [start, end];
}

const q = reactive({
  cSgCode: "",
  cOrderCustCname: "",
  cLineCode: "ZG01",
  orderStatus: null as number | null,
  orderProcFlag: null as number | null,
  cOrderNo: "",
  dates: defaultRange() as [Date, Date],
});

/* 订单状态：原 Load 里 AddEnum(typeof(OrderStatusEnum)) */
const ORDER_STATUS_OPTIONS = [
  { label: "未下发", value: -1 },
  { label: "已下发", value: 0 },
  { label: "已排产", value: 10 },
  { label: "生产关闭", value: 30 },
  { label: "退回销售", value: 40 },
  { label: "结案", value: 50 },
  { label: "订单完成", value: 60 },
  { label: "拆分", value: 70 },
];
/* 质量设计状态：Designer Items（OrderProcEnum） */
const ORDER_PROC_OPTIONS = [
  { label: "未处理", value: 0 },
  { label: "处理中", value: 1 },
  { label: "处理成功", value: 8 },
  { label: "处理失败", value: -1 },
];

function buildQuery(): QueryOrdersForDesignInputParameter {
  return {
    cSgCode: q.cSgCode || null,
    cOrderCustCname: q.cOrderCustCname || null,
    dBegin: q.dates[0]?.toISOString() ?? null,
    dEnd: q.dates[1]?.toISOString() ?? null,
    cLineCode: q.cLineCode || null,
    orderStatus: (q.orderStatus ?? null) as QueryOrdersForDesignInputParameter["orderStatus"],
    orderProcFlag: (q.orderProcFlag ?? null) as QueryOrdersForDesignInputParameter["orderProcFlag"],
    cOrderNo: q.cOrderNo || null,
  };
}

/* ---------- 主表列（提取摘要：49 可见 + 14 hide） ---------- */
const colDefs = ref<ColDef[]>([
  { field: "selected", headerName: "选择", width: 70 },
  { field: "cOrderNo", headerName: "订单号", width: 140 },
  { field: "nStatus", headerName: "订单状态", width: 100 },
  { field: "cOrderCustCname", headerName: "订货客户中文名称", width: 160 },
  { field: "cSteelType", headerName: "钢类", width: 90 },
  { field: "cSgCode", headerName: "钢种", width: 100 },
  {
    field: "nOrderProcFlag",
    headerName: "质量设计状态",
    width: 120,
    /* 原 gridView1_CustomDrawCell：失败红底 / 成功绿底 */
    cellClassRules: {
      "bg-red-500/25": (p) => Number(p.value) === -1,
      "bg-green-500/25": (p) => Number(p.value) === 8,
    },
  },
  { field: "cDesignDesc", headerName: "质量设计失败说明", width: 170 },
  { field: "cTrimFlag", headerName: "切边方式", width: 100 },
  { field: "nThick", headerName: "厚度目标值", width: 110 },
  { field: "nWidth", headerName: "宽度目标值", width: 110 },
  { field: "cLengthType", headerName: "长度类型", width: 100 },
  { field: "nLenMin", headerName: "长度下限", width: 100 },
  { field: "nLenMax", headerName: "长度上限", width: 100 },
  { field: "cDelivyStatusCode", headerName: "交货状态", width: 100 },
  { field: "cDelivyStatusDesc", headerName: "交货状态说明", width: 130 },
  { field: "nNum", headerName: "订货件数", width: 100 },
  { field: "cTol", headerName: "公差标准", width: 100 },
  { field: "nWgt", headerName: "订单重量", width: 100 },
  { field: "cOverstepBl", headerName: "短溢装比例", width: 110 },
  { field: "cDelivyQtyFlag", headerName: "计重方式", width: 100 },
  { field: "cFlawDesc", headerName: "探伤等级", width: 100 },
  { field: "cConNo", headerName: "合同号", width: 120 },
  { field: "cSgStd", headerName: "执行标准", width: 110 },
  { field: "dJhqTime", headerName: "合同交货期", width: 130 },
  { field: "cDelivyAddress", headerName: "流向", width: 110 },
  { field: "cSpecialMarkGy", headerName: "工艺/性能要求", width: 150 },
  { field: "nWtMax", headerName: "单量上限", width: 100 },
  { field: "nWtMin", headerName: "单量下限", width: 100 },
  { field: "cSpec", headerName: "规格", width: 130 },
  { field: "cConRemark", headerName: "合同备注", width: 150 },
  { field: "cInboundNo", headerName: "入库标识", width: 110 },
  { field: "dTimeShipment", headerName: "预计船期", width: 130 },
  { field: "cDeptCode", headerName: "部门编码", width: 110 },
  { field: "creator", headerName: "创建人", width: 100 },
  { field: "createTime", headerName: "创建时间", width: 160 },
  { field: "lastModifier", headerName: "最后修改人", width: 110 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 160 },
  { field: "cLineCode", headerName: "产线代码", width: 100 },
  { field: "cSgCodeNk", headerName: "内控钢种", width: 110 },
  { field: "dOrderProcTime", headerName: "合同处理时间", width: 160 },
  { field: "dSendTime", headerName: "销售提报时间", width: 160 },
  { field: "dPushTime", headerName: "下发生产时间", width: 160 },
  { field: "nThickTolMin", headerName: "厚度下偏差", width: 110 },
  { field: "nThickTolMax", headerName: "厚度上偏差", width: 110 },
  { field: "nWidthTolMin", headerName: "宽度下偏差", width: 110 },
  { field: "nWidthTolMax", headerName: "宽度上偏差", width: 110 },
  { field: "nLenTolMin", headerName: "长度下偏差", width: 110 },
  { field: "nLenTolMax", headerName: "长度上偏差", width: 110 },
  /* 隐藏列（提取 hide 规则） */
  { field: "cOrderCustNo", headerName: "订货客户编码", hide: true },
  { field: "nThickMin", headerName: "厚度下限", hide: true },
  { field: "nThickMax", headerName: "厚度上限", hide: true },
  { field: "nWidthMin", headerName: "宽度下限", hide: true },
  { field: "nWidthMax", headerName: "宽度上限", hide: true },
  { field: "nWidthWgt", headerName: "边部宽度余量", hide: true },
  { field: "cJrzzgyCode", headerName: "加热轧制工艺编码", hide: true },
  { field: "cJqgyCode", headerName: "剪切工艺编码", hide: true },
  { field: "cOrderProcFlag", headerName: "合同处理标志", hide: true },
  { field: "cOrderProcUserId", headerName: "合同处理操作人", hide: true },
  { field: "cZgGyCode", headerName: "轧钢工艺编码", hide: true },
  { field: "cSendUserId", headerName: "销售提报人", hide: true },
  { field: "cPushUserId", headerName: "下发生产人", hide: true },
  { field: "id", headerName: "主键", hide: true },
]);

/* ---------- 轧钢工艺页签（原 UCTqmjgView → UCJggyView Panel2 = UCProcPageContainer_Tree） ---------- */
type ProcNode = {
  id: string;
  t3Id: string | null;
  name: string;
  proc: string;
  grp: string | null;
  path: string[];
};

type JggyIdx = { id: string; code: string; name: string; line: string; proc: string; idxGrp: string };

const treeRows = ref<ProcNode[]>([]);
const treeApi = ref<GridApi | null>(null);
const idxRows = ref<JggyIdx[]>([]);
const idxApi = ref<GridApi | null>(null);
const valRows = ref<Tqmjg04[]>([]);
const valApi = ref<GridApi | null>(null);
const currentProc = ref<ProcNode | null>(null);

const treeAutoGroupDef: AutoGroupColumnDef<ProcNode> = {
  headerName: " ",
  field: "name",
  minWidth: 150,
  flex: 1,
  sortable: false,
};
const treeColDefs = ref<ColDef[]>([]);

const xferRenderer = (p: ICellRendererParams) => (p.colDef?.colId === "xfer-in" ? ">>" : "<<");

/* 候选指标（原 UCTqmjg02 之外的 UCJggyIndexValueEditView gridView1：Code/Name/>>） */
const idxColDefs = ref<ColDef[]>([
  { field: "code", headerName: "编码", minWidth: 90, flex: 1 },
  { field: "name", headerName: "名称", minWidth: 110, flex: 1 },
  {
    colId: "xfer-in",
    headerName: ">>",
    width: 52,
    minWidth: 52,
    sortable: false,
    cellRenderer: xferRenderer,
  },
]);

/* 指标值（原 UCJggyIndexValueEditView gridView2：<< + 33 可见 + 12 hide） */
const valColDefs = ref<ColDef[]>([
  {
    colId: "xfer-out",
    headerName: "<<",
    width: 52,
    minWidth: 52,
    sortable: false,
    cellRenderer: xferRenderer,
  },
  { field: "cCode", headerName: "指标代码", width: 110 },
  { field: "cName", headerName: "指标名称", width: 130 },
  { field: "nSeq", headerName: "顺序号", width: 90 },
  { field: "cUnit", headerName: "单位", width: 80 },
  { field: "nTargetValue", headerName: "目标值", width: 90 },
  { field: "nMinValue", headerName: "最小值", width: 90 },
  { field: "nInterval", headerName: "开闭区间", width: 100 },
  { field: "nMaxValue", headerName: "最大值", width: 90 },
  { field: "cTextValue", headerName: "文本值", width: 100 },
  { field: "cIngotCode", headerName: "锭坯型", width: 90 },
  { field: "cSgSign", headerName: "钢种", width: 90 },
  { field: "cSgStd", headerName: "标准", width: 100 },
  { field: "nThickMin", headerName: "厚度下限", width: 100 },
  { field: "nThickMax", headerName: "厚度上偏差", width: 100 },
  { field: "nWidthMin", headerName: "宽度下限", width: 100 },
  { field: "nWidthMax", headerName: "宽度上限", width: 100 },
  { field: "nIngotWgtMin", headerName: "锭重下限", width: 100 },
  { field: "nIngotWgtMax", headerName: "锭重上限", width: 100 },
  { field: "nCgsjMin", headerName: "传搁时间下限", width: 120 },
  { field: "nCgsjMax", headerName: "传搁时间上限", width: 120 },
  { field: "nMinValueYellow", headerName: "黄色报警下限", width: 120 },
  { field: "nIntervalYellow", headerName: "开闭区间", width: 100 },
  { field: "nMaxValueYellow", headerName: "黄色报警上限", width: 120 },
  { field: "nDurationYellow", headerName: "黄色报警持续时间", width: 140 },
  { field: "nMinValueOrange", headerName: "橙色报警下限", width: 120 },
  { field: "nIntervalOrange", headerName: "开闭区间", width: 100 },
  { field: "nMaxValueOrange", headerName: "橙色报警上限", width: 120 },
  { field: "nDurationOrange", headerName: "橙色报警持续时间", width: 140 },
  { field: "nMinValueRed", headerName: "红色报警下限", width: 120 },
  { field: "nIntervalRed", headerName: "开闭区间", width: 100 },
  { field: "nMaxValueRed", headerName: "红色报警上限", width: 120 },
  { field: "nDurationRed", headerName: "红色报警持续时间", width: 140 },
  /* 隐藏列 */
  { field: "id", headerName: "主键", hide: true },
  { field: "cTqmjg01Id", headerName: "加工工艺要点ID", hide: true },
  { field: "cTqmjg01Code", headerName: "加工工艺要点编号", hide: true },
  { field: "cProc", headerName: "作业工序", hide: true },
  { field: "nProcSeq", headerName: "作业工序顺序号", hide: true },
  { field: "cTqmjg03Id", headerName: "TQMJG03", hide: true },
  { field: "cClass", headerName: "指标分类", hide: true },
  { field: "cClassDesc", headerName: "指标分类描述", hide: true },
  { field: "nValueType", headerName: "值类型", hide: true },
  { field: "cMachine", headerName: "机台", hide: true },
  { field: "selected", headerName: "选择", hide: true },
  { field: "cLineCode", headerName: "产线", hide: true },
]);

/* ---------- 质量标准页签（原 UCTqmtdItemsTabView：成分/性能/取样/其他，Editable=false 只显右表） ---------- */
/* 原 xtraTabControl1 两页签（轧钢工艺 / 质量标准）→ SelectButton 切换，不引 Tabs（ui-rules §6 模式切换工具栏） */
const mainTabOptions = [
  { label: "轧钢工艺", value: "jggy" },
  { label: "质量标准", value: "tqmtd" },
];
const mainTab = ref("jggy");
const tdTab = ref("comp");
/* 成分（UCTqmtd13EditView gridView2：17 可见 + 11 hide，<< 因 Editable=false 收着） */
const td13ColDefs = ref<ColDef[]>([
  { colId: "xfer-out", headerName: "<<", width: 52, minWidth: 52, hide: true, sortable: false, cellRenderer: xferRenderer },
  { field: "cItem", headerName: "元素代码", width: 110 },
  { field: "cItemName", headerName: "元素名称", width: 110 },
  { field: "cUnit", headerName: "单位", width: 80 },
  { field: "nDecimalPlaces", headerName: "小数位数", width: 100 },
  { field: "nMinValue", headerName: "最小值", width: 90 },
  { field: "nValueInterval", headerName: "开闭区间", width: 100 },
  { field: "nMaxValue", headerName: "最大值", width: 90 },
  { field: "nTargetValue", headerName: "目标值", width: 90 },
  { field: "cIsJudge", headerName: "是否判定", width: 100 },
  { field: "cIsPrint", headerName: "是否打印", width: 100 },
  { field: "cFormula", headerName: "计算公式", width: 150 },
  { field: "nThickMin", headerName: "厚高径最小", width: 110 },
  { field: "nThickInterval", headerName: "厚高径开闭区间", width: 140 },
  { field: "nThickMax", headerName: "厚高径最大", width: 110 },
  { field: "cJudgeFormula", headerName: "判定公式", width: 150 },
  { field: "cRemark", headerName: "备注", width: 150 },
  { field: "id", headerName: "主键", hide: true },
  { field: "cTqmtd10Id", headerName: "TQMTD10.ID", hide: true },
  { field: "nWidthMin", headerName: "宽度最小", hide: true },
  { field: "nWidthMax", headerName: "宽度最大", hide: true },
  { field: "nWidthInterval", headerName: "宽度开闭区间", hide: true },
  { field: "nLengthMin", headerName: "长度最小", hide: true },
  { field: "nLengthMax", headerName: "长度最大", hide: true },
  { field: "nLengthInterval", headerName: "长度开闭区间", hide: true },
  { field: "nTestTemperature", headerName: "试验温度", hide: true },
  { field: "cTestCondition", headerName: "试验条件", hide: true },
  { field: "selected", headerName: "选择", hide: true },
]);

/* 性能（UCTqmtd11EditView gridView2：23 可见 + 12 hide） */
const td11ColDefs = ref<ColDef[]>([
  { colId: "xfer-out", headerName: "<<", width: 52, minWidth: 52, hide: true, sortable: false, cellRenderer: xferRenderer },
  { field: "cTestSubItemName", headerName: "试验子项目名称", width: 150 },
  { field: "cUnit", headerName: "单位", width: 80 },
  { field: "cCtrlMode", headerName: "管控模式", width: 100 },
  { field: "nMinValue", headerName: "最小值", width: 90 },
  { field: "nValueInterval", headerName: "开闭区间", width: 100 },
  { field: "nMaxValue", headerName: "最大值", width: 90 },
  { field: "cTargetValue", headerName: "目标值", width: 90 },
  { field: "nMinValueNk", headerName: "内控最小值", width: 110 },
  { field: "nValueIntervalNk", headerName: "内控开闭区间", width: 130 },
  { field: "nMaxValueNk", headerName: "内控最大值", width: 110 },
  { field: "cIsJudge", headerName: "是否判定", width: 100 },
  { field: "cIsPrint", headerName: "是否打印", width: 100 },
  { field: "cFormula", headerName: "计算公式", width: 150 },
  { field: "decimalPlaces", headerName: "小数位数", width: 100 },
  { field: "nAccuracy", headerName: "精确到", width: 90 },
  { field: "nTestTemperature", headerName: "试验温度", width: 110 },
  { field: "cTestCondition", headerName: "试验条件", width: 120 },
  { field: "cJudgeFormula", headerName: "判定公式", width: 150 },
  { field: "nThickMin", headerName: "厚高径最小", width: 110 },
  { field: "nThickInterval", headerName: "厚高径开闭区间", width: 140 },
  { field: "nThickMax", headerName: "厚高径最大", width: 110 },
  { field: "cRemark", headerName: "备注", width: 150 },
  { field: "id", headerName: "主键", hide: true },
  { field: "cTqmtd10Id", headerName: "TQMTD10.ID", hide: true },
  { field: "nWidthMin", headerName: "宽度最小", hide: true },
  { field: "nWidthMax", headerName: "宽度最大", hide: true },
  { field: "nWidthInterval", headerName: "宽度开闭区间", hide: true },
  { field: "nLengthMin", headerName: "长度最小", hide: true },
  { field: "nLengthMax", headerName: "长度最大", hide: true },
  { field: "nLengthInterval", headerName: "长度开闭区间", hide: true },
  { field: "cTestItemType", headerName: "试验项目大类", hide: true },
  { field: "cTestItemTypeDesc", headerName: "试验项目大类描述", hide: true },
  { field: "cTestSubItem", headerName: "试验子项目", hide: true },
  { field: "selected", headerName: "选择", hide: true },
]);

/* 取样（UCTqmtd12EditView gridView2：13 可见 + 6 hide） */
const td12ColDefs = ref<ColDef[]>([
  { colId: "xfer-out", headerName: "<<", width: 52, minWidth: 52, hide: true, sortable: false, cellRenderer: xferRenderer },
  { field: "cTestItemName", headerName: "试验项目名称", width: 150 },
  { field: "cSmpThick", headerName: "取样规格", width: 110 },
  { field: "cSmpLength", headerName: "取样长度", width: 110 },
  { field: "cSmpWay", headerName: "取样方法", width: 110 },
  { field: "nTestNum", headerName: "试验组数", width: 100 },
  { field: "cSmpCount", headerName: "取样数量", width: 100 },
  { field: "cSmpCountRe", headerName: "复验倍数", width: 100 },
  { field: "cSmpUnit", headerName: "数量单位", width: 100 },
  { field: "nSmpWgt", headerName: "取样重量kg", width: 120 },
  { field: "cSmpPosition", headerName: "取样部位", width: 110 },
  { field: "cTestWay", headerName: "试验方法", width: 110 },
  { field: "cReamrk", headerName: "备注", width: 150 },
  { field: "id", headerName: "ID", hide: true },
  { field: "cTqmtd10Id", headerName: "TQMTD10.ID", hide: true },
  { field: "cTestItemType", headerName: "试验项目种类", hide: true },
  { field: "selected", headerName: "选择", hide: true },
  { field: "cTestItemTypeDesc", headerName: "试验项目大类描述", hide: true },
  { field: "cTestItem", headerName: "试验项目代码", hide: true },
]);

const td13Rows = ref<Tqmtd13[]>([]);
const td11Rows = ref<Tqmtd11[]>([]);
const td12Rows = ref<Tqmtd12[]>([]);
const td13Api = ref<GridApi | null>(null);
const td11Api = ref<GridApi | null>(null);
const td12Api = ref<GridApi | null>(null);

/* ---------- 字典与设计结果缓存 ---------- */
const grps = ref<{ classCode: string; classDesc: string; proc: string; line: string }[]>([]);
const allIdx = ref<JggyIdx[]>([]);
const jggy = ref<JggyEntities | null>(null);
const tdmtd = ref<TqmtdEntities | null>(null);

/* ---------- 状态 ---------- */
const rows = ref<Tmp2000[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}
function onTreeReady(e: GridReadyEvent) {
  treeApi.value = e.api;
}
function onIdxReady(e: GridReadyEvent) {
  idxApi.value = e.api;
}
function onValReady(e: GridReadyEvent) {
  valApi.value = e.api;
}
function onTd13Ready(e: GridReadyEvent) {
  td13Api.value = e.api;
}
function onTd11Ready(e: GridReadyEvent) {
  td11Api.value = e.api;
}
function onTd12Ready(e: GridReadyEvent) {
  td12Api.value = e.api;
}

function getRowId(p: GetRowIdParams): string {
  return String((p.data as ProcNode).id ?? "");
}

function getDataPath(d: ProcNode): string[] {
  return d.path;
}

function selectedRows(): Tmp2000[] {
  return (gridApi.value?.getSelectedRows() ?? []) as Tmp2000[];
}

function autoSizeAll() {
  requestAnimationFrame(() => {
    gridApi.value?.autoSizeAllColumns();
    valApi.value?.autoSizeAllColumns();
    idxApi.value?.autoSizeAllColumns();
    td13Api.value?.autoSizeAllColumns();
    td11Api.value?.autoSizeAllColumns();
    td12Api.value?.autoSizeAllColumns();
  });
}

/* ---------- 轧钢工艺页签：树 / 候选 / 指标值 ---------- */
function applyProcNode(node: ProcNode | null) {
  currentProc.value = node;
  const line = jggy.value?.tqmjg01?.cLineCode ?? "";
  if (!node) {
    idxRows.value = [];
    valRows.value = [];
    idxApi.value?.setGridOption("rowData", []);
    valApi.value?.setGridOption("rowData", []);
    return;
  }
  const idxes = allIdx.value.filter(
    (x) =>
      x.proc === node.proc &&
      x.line === line &&
      (node.grp == null || x.idxGrp === node.grp),
  );
  idxRows.value = idxes;
  idxApi.value?.setGridOption("rowData", idxes);

  const codes = new Set(idxes.map((x) => x.code));
  const list = (jggy.value?.tqmjg04s ?? [])
    .filter((t4) => t4.cTqmjg03Id === node.t3Id && codes.has(t4.cCode ?? ""))
    .slice()
    .sort((a, b) => (a.nSeq ?? 0) - (b.nSeq ?? 0));
  valRows.value = list;
  valApi.value?.setGridOption("rowData", list);
  requestAnimationFrame(() => {
    idxApi.value?.autoSizeAllColumns();
    valApi.value?.autoSizeAllColumns();
  });
}

function buildTree() {
  const t3s = (jggy.value?.tqmjg03s ?? [])
    .slice()
    .sort((a, b) => (a.nSeq ?? 0) - (b.nSeq ?? 0));
  const line = jggy.value?.tqmjg01?.cLineCode ?? "";
  const out: ProcNode[] = [];
  const seen = new Set<string>();
  for (const t3 of t3s) {
    const proc = t3.cProc ?? "";
    if (!proc || seen.has(proc)) continue;
    seen.add(proc);
    out.push({
      id: proc,
      t3Id: t3.id ?? null,
      name: t3.cProcName ?? proc,
      proc,
      grp: null,
      path: [proc],
    });
    for (const g of grps.value.filter((x) => x.line === line && x.proc === proc)) {
      out.push({
        id: `${proc}_${g.classCode}`,
        t3Id: t3.id ?? null,
        name: g.classDesc,
        proc,
        grp: g.classCode,
        path: [proc, `${proc}_${g.classCode}`],
      });
    }
  }
  treeRows.value = out;
  treeApi.value?.setGridOption("rowData", out);
  currentProc.value = null;
  applyProcNode(out[0] ?? null);
}

function onTreeSelectionChanged() {
  const node = (treeApi.value?.getSelectedNodes()[0]?.data as ProcNode | undefined) ?? null;
  applyProcNode(node);
}

/** 候选 → 候选值（原 GridDataMoveHelper LeftMoveToRight） */
function onCellClicked(e: { colDef?: ColDef; data?: unknown }) {
  const colId = e.colDef?.colId;
  if (colId === "xfer-in") {
    const idx = e.data as JggyIdx | undefined;
    const node = currentProc.value;
    if (!idx || !node) return;
    const t3 = (jggy.value?.tqmjg03s ?? []).find((x) => x.id === node.t3Id);
    const item: Tqmjg04 = {
      id: NextStrId(),
      selected: false,
      cClass: node.grp,
      cClassDesc: grps.value.find((g) => g.classCode === node.grp)?.classDesc ?? null,
      cCode: idx.code,
      cName: idx.name,
      cProc: node.proc,
      cTqmjg01Code: t3?.cGyCode ?? jggy.value?.tqmjg01?.cCode ?? null,
      cTqmjg01Id: t3?.cTqmjg01Id ?? jggy.value?.tqmjg01?.id ?? null,
      cTqmjg03Id: t3?.id ?? null,
      nSeq: valRows.value.length + 1,
      nProcSeq: t3?.nSeq ?? 0,
      nInterval: 1,
      nIntervalOrange: 1,
      nIntervalRed: 1,
      nIntervalYellow: 1,
    };
    valRows.value.push(item);
    valApi.value?.applyTransaction({ add: [item] });
    return;
  }
  if (colId === "xfer-out") {
    const item = e.data as Tqmjg04 | undefined;
    if (!item) return;
    valRows.value = valRows.value.filter((x) => x.id !== item.id);
    valApi.value?.applyTransaction({ remove: [item] });
  }
}

/** btnCopy 复制选中指标（原 UCJggyIndexValueEditView.btnCopy_Click） */
function onCopy() {
  const selected = (valApi.value?.getSelectedRows() ?? []) as Tqmjg04[];
  if (!selected.length) return;
  const copies = selected.map((item) => ({
    ...item,
    id: NextStrId(),
    nSeq: valRows.value.length + 1,
  }));
  for (const c of copies) valRows.value.push(c);
  valApi.value?.applyTransaction({ add: copies });
}

/* ---------- 主表与设计结果 ---------- */
async function refreshDetails(orderNo?: string | null) {
  if (!orderNo) {
    jggy.value = null;
    tdmtd.value = null;
    treeRows.value = [];
    treeApi.value?.setGridOption("rowData", []);
    applyProcNode(null);
    td13Rows.value = [];
    td11Rows.value = [];
    td12Rows.value = [];
    td13Api.value?.setGridOption("rowData", []);
    td11Api.value?.setGridOption("rowData", []);
    td12Api.value?.setGridOption("rowData", []);
    return;
  }
  try {
    const [a, b] = await Promise.all([
      qualityDesignApi.queryJggyDesignResult(orderNo),
      qualityDesignApi.queryTqmtdDesignResult(orderNo),
    ]);
    jggy.value = a ?? null;
    tdmtd.value = b ?? null;
    buildTree();
    td13Rows.value = (tdmtd.value?.tqmtd13s ?? []) as Tqmtd13[];
    td11Rows.value = (tdmtd.value?.tqmtd11s ?? []) as Tqmtd11[];
    td12Rows.value = (tdmtd.value?.tqmtd12s ?? []) as Tqmtd12[];
    td13Api.value?.setGridOption("rowData", td13Rows.value);
    td11Api.value?.setGridOption("rowData", td11Rows.value);
    td12Api.value?.setGridOption("rowData", td12Rows.value);
    autoSizeAll();
  } catch {
    /* 拦截层已 toast */
  }
}

async function bindData() {
  const list = (await tmp2000Api.queryOrdersForDesign(buildQuery())) ?? [];
  rows.value = list;
  gridApi.value?.setGridOption("rowData", list);
  requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
}

async function onQuery() {
  querying.value = true;
  try {
    await bindData();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* 主行切换 → RefreshDetails（queryJggyDesignResult + queryTqmtdDesignResult） */
async function onSelectionChanged() {
  const row = (gridApi.value?.getSelectedNodes()[0]?.data as Tmp2000 | undefined) ?? null;
  await refreshDetails(row?.cOrderNo ?? null);
}

/** btnDesign 质量设计（designZHB 逐单） */
async function onDesign() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择要质量设计的订单！", 2000, "warn");
    return;
  }
  if (!window.confirm(`确认对选中的 ${selected.length} 个订单进行质量设计？`)) return;
  querying.value = true;
  try {
    const res: QualityDesignOutput[] = [];
    for (const order of selected) {
      const output = (await qualityDesignApi.designZHB({ orderNo: order.cOrderNo ?? "" })) ?? {};
      order.nOrderProcFlag = output.success ? 8 : -1;
      order.cDesignDesc = output.message ?? null;
      res.push(output);
      gridApi.value?.refreshCells({ force: true });
    }
    const okCount = res.filter((x) => x.success).length;
    toast(`操作完成，成功：${okCount}，失败：${res.length - okCount}`, 2500, "info");
    await refreshDetails(selectedRows()[0]?.cOrderNo ?? rows.value[0]?.cOrderNo ?? null);
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** btnMatchZggy 选择轧钢工艺 → FrmSD2041（二级弹窗占位） */
function onMatchZggy() {
  const selected = selectedRows();
  if (selected.length > 1) {
    toast("仅支持单个订单进行匹配！", 2000, "warn");
    return;
  }
  if (!selected.length && !rows.value.length) {
    toast("请选择订单", 2000, "warn");
    return;
  }
  toast("选择轧钢工艺弹窗（FrmSD2041）待接入", 2500, "warn");
}

/** bntPush 审核（原 Visible=false，保留入口；pushOrderPlan） */
async function onPush() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择质量设计成功的订单！", 2000, "warn");
    return;
  }
  const failed = selected.filter((x) => Number(x.nOrderProcFlag) !== 8).map((x) => x.cOrderNo);
  if (failed.length) {
    toast(`所选订单中存在未质量设计成功的订单，订单号：${failed.join(",")}`, 3000, "warn");
    return;
  }
  if (!window.confirm(`确认对选中的 ${selected.length} 个订单进行审核操作吗？`)) return;
  querying.value = true;
  try {
    const orderNos = selected.map((x) => x.cOrderNo ?? "").filter(Boolean);
    const count = (await tmp2000Api.pushOrderPlan(orderNos)) ?? 0;
    await bindData();
    toast(`成功审核${count}条订单！`, 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** simpleButton1 更新轧钢工艺（updateZggy 逐单） */
async function onUpdateZggy() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择更新工艺的订单！", 2000, "warn");
    return;
  }
  if (!window.confirm(`确认对选中的 ${selected.length} 个订单进行更新？`)) return;
  querying.value = true;
  try {
    const res: QualityDesignOutput[] = [];
    for (const order of selected) {
      const output = (await qualityDesignApi.updateZggy({ orderNo: order.cOrderNo ?? "" })) ?? {};
      order.nOrderProcFlag = output.success ? 8 : -1;
      order.cDesignDesc = output.message ?? null;
      res.push(output);
      gridApi.value?.refreshCells({ force: true });
    }
    const okCount = res.filter((x) => x.success).length;
    toast(`操作完成，成功：${okCount}，失败：${res.length - okCount}`, 2500, "info");
    await refreshDetails(selectedRows()[0]?.cOrderNo ?? rows.value[0]?.cOrderNo ?? null);
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

async function loadDicts() {
  try {
    const [grpList, idxList] = await Promise.all([
      systemKeyValueApi.querySysKvItemList("A0100:JGGY.PROC.IDXGRP") ?? [],
      systemKeyValueApi.querySysKvItemList("A0100:JGGY.INDEX") ?? [],
    ]);
    grps.value = (grpList ?? []).map((x) => ({
      classCode: x.cCode ?? "",
      classDesc: x.cName ?? x.cCode ?? "",
      proc: x.cValue ?? "",
      line: x.cDesc ?? "",
    }));
    allIdx.value = (idxList ?? [])
      .filter((x) => x.cEnable === "1")
      .map((x) => ({
        id: x.id ?? "",
        code: x.cCode ?? "",
        name: x.cName ?? "",
        line: x.cGroup ?? "",
        proc: x.cDesc ?? "",
        idxGrp: x.cValue ?? "",
      }));
  } catch {
    /* 拦截层已 toast */
  }
}

onMounted(async () => {
  await loadDicts();
  await onQuery();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区（原 dataLayoutControl1：8 条件） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="q.cSgCode" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">订货客户</label>
        <InputText v-model="q.cOrderCustCname" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">产线</label>
        <InputText v-model="q.cLineCode" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">订单状态</label>
        <Select
          v-model="q.orderStatus"
          :options="ORDER_STATUS_OPTIONS"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="全部"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">质量设计状态</label>
        <Select
          v-model="q.orderProcFlag"
          :options="ORDER_PROC_OPTIONS"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="全部"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="q.cOrderNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">开始时间</label>
        <DatePicker
          v-model="q.dates[0]"
          :manual-input="false"
          date-format="yy-mm-dd"
          show-time
          hour-format="24"
          show-icon
          class="min-w-0 flex-1"
        />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">截止时间</label>
        <DatePicker
          v-model="q.dates[1]"
          :manual-input="false"
          date-format="yy-mm-dd"
          show-time
          hour-format="24"
          show-icon
          class="min-w-0 flex-1"
        />
      </div>
    </div>

    <!-- 工具栏（原 stackPanel2：查询/质量设计/选择轧钢工艺/审核/更新轧钢工艺） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDesign">
        <IconSettings class="h-3 w-3" />质量设计
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onMatchZggy">
        <IconCopy class="h-3 w-3" />选择轧钢工艺
      </Button>
      <!-- 原 bntPush Visible=false，按硬规则保留入口 -->
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onPush">
        <IconSend class="h-3 w-3" />审核
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onUpdateZggy">
        <IconRefresh class="h-3 w-3" />更新轧钢工艺
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">中厚板订单质量设计（{{ rows.length }}）</span>
    </div>

    <!-- 上下分栏（原 splitContainerControl1 Horizontal=false，SplitterPosition 281/424 ≈ 66% →
         按需求主表高度缩 40%：66×0.6≈40，下方「质量设计结果」34→60 吃掉让出的空间） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="40" :minSize="30" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="colDefs"
            :row-data="rows"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :suppress-column-virtualisation="true"
            :pagination="false"
            :animate-rows="false"
            :loading="querying"
            @grid-ready="onGridReady"
            @selection-changed="onSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <!-- 质量设计结果（原 groupControl1 + xtraTabControl1 两页签）
           → SelectButton 切换，标题并入同一 h-9 行最右（ui-rules §6 模式切换工具栏） -->
      <SplitterPanel :size="60" :minSize="20" class="flex flex-col overflow-hidden">
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <SelectButton
            v-model="mainTab"
            :options="mainTabOptions"
            option-label="label"
            option-value="value"
            class="shrink-0"
          />
          <span class="ml-auto text-xs text-muted-foreground">质量设计结果</span>
        </div>
        <div class="flex min-h-0 flex-1 flex-col">
          <div class="min-h-0 flex-1 overflow-hidden">
            <!-- 轧钢工艺（原 UCTqmjgView → UCProcPageContainer_Tree：工序树 | 指标候选+指标值） -->
            <div v-if="mainTab === 'jggy'" class="h-full min-h-0 overflow-hidden">
              <Splitter class="h-full min-h-0">
                <SplitterPanel :size="20" :minSize="12" class="flex flex-col overflow-hidden">
                  <div class="min-h-0 flex-1 overflow-hidden">
                    <AgGridVue
                      class="hmx-ag-grid h-full w-full"
                      :theme="theme"
                      :locale-text="AG_GRID_LOCALE_CN"
                      :default-col-def="hmxDefaultColDef"
                      :column-defs="treeColDefs"
                      :auto-group-column-def="treeAutoGroupDef"
                      :row-data="treeRows"
                      :get-row-id="getRowId"
                      :get-data-path="getDataPath"
                      :tree-data="true"
                      :group-default-expands-all="true"
                      :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
                      :suppress-column-virtualisation="true"
                      :pagination="false"
                      :animate-rows="false"
                      @grid-ready="onTreeReady"
                      @selection-changed="onTreeSelectionChanged"
                    />
                  </div>
                </SplitterPanel>

                <SplitterPanel :minSize="30" class="flex flex-col overflow-hidden">
                  <!-- 复制（原 UCJggyIndexValueEditView stackPanel1 + btnCopy） -->
                  <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
                    <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCopy">
                      <IconCopy class="h-3 w-3" />复制
                    </Button>
                    <span class="ml-auto text-xs text-muted-foreground">轧钢工艺要点（{{ valRows.length }}）</span>
                  </div>
                  <Splitter class="min-h-0 flex-1">
                    <SplitterPanel :size="28" :minSize="16" class="flex flex-col overflow-hidden">
                      <div class="min-h-0 flex-1 overflow-hidden">
                        <AgGridVue
                          class="hmx-ag-grid h-full w-full"
                          :theme="theme"
                          :locale-text="AG_GRID_LOCALE_CN"
                          :default-col-def="hmxDefaultColDef"
                          :column-defs="idxColDefs"
                          :row-data="idxRows"
                          :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
                          :suppress-column-virtualisation="true"
                          :pagination="false"
                          :animate-rows="false"
                          @grid-ready="onIdxReady"
                          @cell-clicked="onCellClicked"
                          @first-data-rendered="autoSizeOnFirstData"
                        />
                      </div>
                    </SplitterPanel>
                    <SplitterPanel :minSize="30" class="flex flex-col overflow-hidden">
                      <div class="min-h-0 flex-1 overflow-hidden">
                        <AgGridVue
                          class="hmx-ag-grid h-full w-full"
                          :theme="theme"
                          :locale-text="AG_GRID_LOCALE_CN"
                          :default-col-def="hmxDefaultColDef"
                          :column-defs="valColDefs"
                          :row-data="valRows"
                          :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
                          :suppress-column-virtualisation="true"
                          :pagination="false"
                          :animate-rows="false"
                          @grid-ready="onValReady"
                          @cell-clicked="onCellClicked"
                          @first-data-rendered="autoSizeOnFirstData"
                        />
                      </div>
                    </SplitterPanel>
                  </Splitter>
                </SplitterPanel>
              </Splitter>
            </div>

            <!-- 质量标准（原 UCTqmtdItemsTabView：成分/性能/取样/其他，HeaderLocation=Left → PrimeVue 顶部，已知偏差） -->
            <div v-else class="h-full min-h-0 overflow-hidden">
              <Tabs v-model:value="tdTab" class="h-full min-h-0 flex-col">
                <div class="flex shrink-0 items-center border-b border-border/60 px-2">
                  <TabList class="min-w-0 flex-1">
                    <Tab value="comp">成分</Tab>
                    <Tab value="perf">性能</Tab>
                    <Tab value="smp">取样</Tab>
                    <Tab value="other">其他</Tab>
                  </TabList>
                </div>
                <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
                  <TabPanel value="comp" class="h-full min-h-0 overflow-hidden">
                    <div class="h-full min-h-0 overflow-hidden">
                      <AgGridVue
                        class="hmx-ag-grid h-full w-full"
                        :theme="theme"
                        :locale-text="AG_GRID_LOCALE_CN"
                        :default-col-def="hmxDefaultColDef"
                        :column-defs="td13ColDefs"
                        :row-data="td13Rows"
                        :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
                        :suppress-column-virtualisation="true"
                        :pagination="false"
                        :animate-rows="false"
                        @grid-ready="onTd13Ready"
                        @first-data-rendered="autoSizeOnFirstData"
                      />
                    </div>
                  </TabPanel>
                  <TabPanel value="perf" class="h-full min-h-0 overflow-hidden">
                    <div class="h-full min-h-0 overflow-hidden">
                      <AgGridVue
                        class="hmx-ag-grid h-full w-full"
                        :theme="theme"
                        :locale-text="AG_GRID_LOCALE_CN"
                        :default-col-def="hmxDefaultColDef"
                        :column-defs="td11ColDefs"
                        :row-data="td11Rows"
                        :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
                        :suppress-column-virtualisation="true"
                        :pagination="false"
                        :animate-rows="false"
                        @grid-ready="onTd11Ready"
                        @first-data-rendered="autoSizeOnFirstData"
                      />
                    </div>
                  </TabPanel>
                  <TabPanel value="smp" class="h-full min-h-0 overflow-hidden">
                    <div class="h-full min-h-0 overflow-hidden">
                      <AgGridVue
                        class="hmx-ag-grid h-full w-full"
                        :theme="theme"
                        :locale-text="AG_GRID_LOCALE_CN"
                        :default-col-def="hmxDefaultColDef"
                        :column-defs="td12ColDefs"
                        :row-data="td12Rows"
                        :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
                        :suppress-column-virtualisation="true"
                        :pagination="false"
                        :animate-rows="false"
                        @grid-ready="onTd12Ready"
                        @first-data-rendered="autoSizeOnFirstData"
                      />
                    </div>
                  </TabPanel>
                  <!-- 原 xtraTabPage4「其他」无控件 -->
                  <TabPanel value="other" class="h-full min-h-0 overflow-auto" />
                </TabPanels>
              </Tabs>
            </div>
          </div>
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
