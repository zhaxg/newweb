<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import { IconRefresh, IconRotate, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { useMenuQuery } from "@/lib/menuQuery";
import { tmp2010Api, OrderReviewEnum, type InputTmp2010Dto, type Tmp2010Dto } from "@/api/mes4ddh/smp.swagger";
import BatchIdInput from "@/pages/Widgets/BatchIdInput/index.vue";
import { parseBatchIds } from "@/pages/Widgets/BatchIdInput/parse";

/** 对应 FrmMP2010（计划评审）：DDH.Winforms.SMP.Forms.FrmMP2010
 *  已接入：tmp2010Api.queryOrder（查询）/ reviewOrder（评审）/ cancleReviewOrder（撤销评审）/
 *          setStaCode+cancleReviewOrder（设置·连铸机，原 simpleButton2 Visible=false）/ updateSpec（更新规格）/ changePlanDate（修改计划日期）
 *  待接入：UCMachine 连铸机候选（原 tpa1000.queryMachine，swagger 未生成，下拉暂空）；mock 缺 tmp2010/queryOrder、reviewOrder、cancleReviewOrder、setStaCode
 *  菜单 cQueryString（ZG01）经 useMenuQuery 作 cLineCode；列集按 extract（可见77+隐藏97=174，Selected 转移勾选列） */

const { toast } = useToast();
const { raw: menuQs } = useMenuQuery();
const theme = makeHmxGridTheme();
const rows = ref<Tmp2010Dto[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function monthEnd() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function fmtDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* 原 stackPanel1：销售下发时间 dtS~dtE、批量订单号 comOrder、评审状态 icboReview、钢种 txtGz */
const dtS = ref<Date | null>(monthStart());
const dtE = ref<Date | null>(monthEnd());
const comOrder = ref("");
const icboReview = ref<number | null>(null);
const txtGz = ref("");
/* 原 stackPanel2 内 UCMachine（连铸机，Proc=LZ / 炼钢二厂）——候选接口未生成，先占位 */
const icboMachine = ref<string | null>(null);
const machineOptions = ref<{ label: string; value: string }[]>([]);
/* 原 dtPlan 默认当天 */
const dtPlan = ref<Date | null>(new Date());

const reviewOptions = [
  { label: "未评审", value: OrderReviewEnum.NoReview },
  { label: "已评审", value: OrderReviewEnum.YesReview },
];

const colDefs: ColDef[] = [
      { field: "selected", headerName: "选择", hide: true },
      { field: "nSfpj", headerName: "评审状态", width: 150 },
      { field: "cPlanTime", headerName: "计划日期", width: 150 },
      { field: "cCool", headerName: "是否冷坯计划", width: 150 },
      { field: "cOrderNo", headerName: "订单号", width: 150 },
      { field: "cOrderCustCname", headerName: "订货客户中文名称", width: 150 },
      { field: "cOrderNo1", headerName: "订单号1", width: 150 },
      { field: "cOrderNo2", headerName: "订单号2", width: 150 },
      { field: "cOrderNo3", headerName: "订单号3", width: 150 },
      { field: "cOrderNo4", headerName: "订单号4", width: 150 },
      { field: "cSgCode", headerName: "钢种", width: 150 },
      { field: "cSgStd", headerName: "执行标准", width: 150 },
      { field: "nThick", headerName: "厚度", width: 150 },
      { field: "nWidth", headerName: "宽度", width: 150 },
      { field: "nWidthWgt", headerName: "边部宽度余量", width: 150 },
      { field: "nLen", headerName: "长度", width: 150 },
      { field: "cLengthType", headerName: "长度类型", width: 150 },
      { field: "nLenMax", headerName: "长度上限", width: 150 },
      { field: "nLenMin", headerName: "长度下限", width: 150 },
      { field: "cDelivyStatusCode", headerName: "交货状态", width: 150 },
      { field: "nNum", headerName: "订货件数", width: 150 },
      { field: "nWgt", headerName: "订单重量", width: 150 },
      { field: "cTrimFlag", headerName: "切边方式", width: 150 },
      { field: "cSpec", headerName: "规格", width: 150 },
      { field: "cTlSgCode", headerName: "炼钢钢种", width: 150 },
      { field: "nSlabThick", headerName: "钢坯厚度", width: 150 },
      { field: "nSlabWidth", headerName: "钢坯宽度", width: 150 },
      { field: "nSlabLenMin", headerName: "钢坯长度最小值", width: 150 },
      { field: "nSlabQua", headerName: "钢坯支数", width: 150 },
      { field: "nWgtUnit", headerName: "钢坯单支重量", width: 150 },
      { field: "nSlabWgt", headerName: "坯料重量", width: 150 },
      { field: "nThickPlan", headerName: "生产板厚", width: 150 },
      { field: "nWidthPlan", headerName: "生产板宽", width: 150 },
      { field: "nLenPlan", headerName: "生产板长", width: 150 },
      { field: "nDbc", headerName: "单倍尺", width: 150 },
      { field: "nSteelSingleWgt", headerName: "钢板单重", width: 150 },
      { field: "nPlanedBoardNum", headerName: "排产子板数", width: 150 },
      { field: "nPlanedWgt", headerName: "排产净重", width: 150 },
      { field: "nConSteelKs", headerName: "合同带出钢板块数", width: 150 },
      { field: "nConSteelNum", headerName: "合同带出钢板数量", width: 150 },
      { field: "nTlTol", headerName: "提料公差", width: 150 },
      { field: "nLlBoardWgt", headerName: "理论子板重（含板边）", width: 150 },
      { field: "nLlBoardEndWgt", headerName: "理论板头重", width: 150 },
      { field: "nLlBoardEdge", headerName: "理论板边", width: 150 },
      { field: "nLlBoardEnd", headerName: "理论板头", width: 150 },
      { field: "nLlBurnLoss", headerName: "理论烧损", width: 150 },
      { field: "nLlCleanLen", headerName: "理论毛长", width: 150 },
      { field: "nBoarCleanLen", headerName: "母板净长", width: 150 },
      { field: "cThickRange", headerName: "厚度区间", width: 150 },
      { field: "cDelivyQtyFlag", headerName: "计重方式", width: 150 },
      { field: "cTol", headerName: "公差", width: 150 },
      { field: "cFlawStand", headerName: "探伤标准", width: 150 },
      { field: "cFlawDesc", headerName: "探伤等级", width: 150 },
      { field: "cTransType", headerName: "运输方式", width: 150 },
      { field: "cStoreRoom", headerName: "库房", width: 150 },
      { field: "cRzFlag", headerName: "是否认证", width: 150 },
      { field: "cSampleSpec", headerName: "样品规格", width: 150 },
      { field: "cSpecialMarkGy", headerName: "工艺/性能要求", width: 150 },
      { field: "cAddress", headerName: "到货地址", width: 150 },
      { field: "cThickRangeDis", headerName: "厚度区分", width: 150 },
      { field: "cSingleSlab", headerName: "单片钢坯", width: 150 },
      { field: "nLenPlan1", headerName: "套切长度1", width: 150 },
      { field: "nLenPlan2", headerName: "套切长度2", width: 150 },
      { field: "nLenPlan3", headerName: "套切长度3", width: 150 },
      { field: "nLenPlan4", headerName: "套切长度4", width: 150 },
      { field: "nPlanBoarLen", headerName: "计划母板长", width: 150 },
      { field: "cRollType", headerName: "轧制方式", width: 150 },
      { field: "nLlProduceKs", headerName: "理论生产块数", width: 150 },
      { field: "nDcLen", headerName: "带出长度", width: 150 },
      { field: "dJhqTime", headerName: "合同交货期", width: 150 },
      { field: "cZWidth", headerName: "展宽比", width: 150 },
      { field: "cRollNo", headerName: "补轧标识", width: 150 },
      { field: "nColdSlabKs", headerName: "冷坯块数", width: 150 },
      { field: "nColdSlabNum", headerName: "冷坯吨数", width: 150 },
      { field: "cInboundNo", headerName: "入库标识", width: 150 },
      { field: "cDelivyAddress", headerName: "流向", width: 150 },
      { field: "cRepairProduce", headerName: "补产", width: 150 },
      { field: "id", headerName: "主键", width: 100, hide: true },
      { field: "creator", headerName: "创建人", width: 100, hide: true },
      { field: "createTime", headerName: "创建时间", width: 100, hide: true },
      { field: "lastModifier", headerName: "最后修改人", width: 100, hide: true },
      { field: "lastModifyTime", headerName: "最后修改时间", width: 100, hide: true },
      { field: "nStatus", headerName: "订单状态", width: 100, hide: true },
      { field: "cTlOrderNo", headerName: "提料订单号", width: 100, hide: true },
      { field: "cIsMerge", headerName: "是否合并提料", width: 100, hide: true },
      { field: "cLineCode", headerName: "产线代码", width: 100, hide: true },
      { field: "cConNo", headerName: "合同号", width: 100, hide: true },
      { field: "nWgtSy", headerName: "剩余重量", width: 100, hide: true },
      { field: "nThickMin", headerName: "厚度下限", width: 100, hide: true },
      { field: "nThickMax", headerName: "厚度上限", width: 100, hide: true },
      { field: "nWidthMin", headerName: "宽度下限", width: 100, hide: true },
      { field: "nWidthMax", headerName: "宽度上限", width: 100, hide: true },
      { field: "cSteelType", headerName: "钢类", width: 100, hide: true },
      { field: "cProdCode", headerName: "品名代码", width: 100, hide: true },
      { field: "cMsc", headerName: "冶金规范", width: 100, hide: true },
      { field: "cPsc", headerName: "产品规范码", width: 100, hide: true },
      { field: "cMscLineNo", headerName: "冶金规范产线号", width: 100, hide: true },
      { field: "cMscLineDesc", headerName: "产线描述", width: 100, hide: true },
      { field: "cWholeBacklog", headerName: "全程工序码", width: 100, hide: true },
      { field: "cWholeBacklogDesc", headerName: "全程工序说明", width: 100, hide: true },
      { field: "cCustStdCode", headerName: "加工用途代码", width: 100, hide: true },
      { field: "cOrderCustNo", headerName: "订货客户编码", width: 100, hide: true },
      { field: "cOrderCustEname", headerName: "订货客户英文名称", width: 100, hide: true },
      { field: "cProductH", headerName: "重点品种", width: 100, hide: true },
      { field: "cOrderTypeCode", headerName: "合同性质QAA期货", width: 100, hide: true },
      { field: "cExportFlag", headerName: "出口标志", width: 100, hide: true },
      { field: "dOrderTime", headerName: "订单日期", width: 100, hide: true },
      { field: "cMatCode", headerName: "物料编码", width: 100, hide: true },
      { field: "cMatName", headerName: "物料名称", width: 100, hide: true },
      { field: "cSlabType", headerName: "自备坯R", width: 100, hide: true },
      { field: "cConRemark", headerName: "合同备注", width: 100, hide: true },
      { field: "cWarrantyDesc", headerName: "质保书要求", width: 100, hide: true },
      { field: "cPackCode", headerName: "特殊包装要求", width: 100, hide: true },
      { field: "cOrderProcFlag", headerName: "合同处理标志（", width: 100, hide: true },
      { field: "cDeptCode", headerName: "部门编码", width: 100, hide: true },
      { field: "nFlag", headerName: "计划类型", width: 100, hide: true },
      { field: "cProdName", headerName: "品名名称", width: 100, hide: true },
      { field: "cDelivyStatusDesc", headerName: "交货状态说明", width: 100, hide: true },
      { field: "cCustStdDesc", headerName: "加工用途说明", width: 100, hide: true },
      { field: "nApplyCloseStatus", headerName: "1待封锁", width: 100, hide: true },
      { field: "cApplyCloseEmp", headerName: "申请关闭人", width: 100, hide: true },
      { field: "dApplyCloseDt", headerName: "申请关闭时间", width: 100, hide: true },
      { field: "cApplyCloseRemark", headerName: "申请关闭说明", width: 100, hide: true },
      { field: "cDesignNo", headerName: "质量设计号", width: 100, hide: true },
      { field: "cDesignDesc", headerName: "质量设计失败说明", width: 100, hide: true },
      { field: "nWtMax", headerName: "单量上限", width: 100, hide: true },
      { field: "nWtMin", headerName: "单量下限", width: 100, hide: true },
      { field: "nSendNum", headerName: "发送次数", width: 100, hide: true },
      { field: "cOverstepBl", headerName: "短溢装比例", width: 100, hide: true },
      { field: "cShape", headerName: "形状代码", width: 100, hide: true },
      { field: "cSlabSource", headerName: "供坯单位", width: 100, hide: true },
      { field: "cTlSgStd", headerName: "炼钢标准", width: 100, hide: true },
      { field: "nSlabLenMax", headerName: "钢坯长度最大值", width: 100, hide: true },
      { field: "nWgtMeter", headerName: "钢坯米单重", width: 100, hide: true },
      { field: "nRate", headerName: "理论成材率", width: 100, hide: true },
      { field: "nSlabWgtSy", headerName: "坯料剩余重量", width: 100, hide: true },
      { field: "cSlabRemark", headerName: "提料备注", width: 100, hide: true },
      { field: "nTlStatus", headerName: "提料状态", width: 100, hide: true },
      { field: "cTlRemark", headerName: "提料失败说明", width: 100, hide: true },
      { field: "cTlName", headerName: "提料操作人", width: 100, hide: true },
      { field: "dTlTime", headerName: "提料时间", width: 100, hide: true },
      { field: "cTlOrderFlag", headerName: "是否提料订单", width: 100, hide: true },
      { field: "cCcmCode", headerName: "连铸机编码", width: 100, hide: true },
      { field: "cPjName", headerName: "评审人", width: 100, hide: true },
      { field: "dPjTime", headerName: "评审时间", width: 100, hide: true },
      { field: "cPjRemark", headerName: "评审失败原因", width: 100, hide: true },
      { field: "cSlabSize", headerName: "坯料规格", width: 100, hide: true },
      { field: "cStNo", headerName: "炼钢工艺卡", width: 100, hide: true },
      { field: "cZgGyCode", headerName: "轧钢工艺编码", width: 100, hide: true },
      { field: "cOrderNoOld", headerName: "原始订单号", width: 100, hide: true },
      { field: "cOrderNo5", headerName: "订单号5", width: 100, hide: true },
      { field: "cOrderNo6", headerName: "订单号6", width: 100, hide: true },
      { field: "nLenPlan5", headerName: "套切长度5", width: 100, hide: true },
      { field: "nLenPlan6", headerName: "套切长度6", width: 100, hide: true },
      { field: "cJqgyCode", headerName: "剪切工艺编码", width: 100, hide: true },
      { field: "cJrzzgyCode", headerName: "加热轧制工艺编码", width: 100, hide: true },
      { field: "cSpecPlan", headerName: "生产规格", width: 100, hide: true },
      { field: "cStoreShift", headerName: "炉次", width: 100, hide: true },
      { field: "cThreading1", headerName: "套切1", width: 100, hide: true },
      { field: "cThreading2", headerName: "套切2", width: 100, hide: true },
      { field: "cThreading3", headerName: "套切3", width: 100, hide: true },
      { field: "cThreading4", headerName: "套切4", width: 100, hide: true },
      { field: "cVirtualStoreCode", headerName: "虚拟炉号", width: 100, hide: true },
      { field: "cYcAlert", headerName: "异常提醒", width: 100, hide: true },
      { field: "cZggyCode", headerName: "轧钢工艺编码", width: 100, hide: true },
      { field: "dTimeShipment", headerName: "预计船期", width: 100, hide: true },
      { field: "nLenTolMax", headerName: "长度上偏差", width: 100, hide: true },
      { field: "nLenTolMin", headerName: "长度下偏差", width: 100, hide: true },
      { field: "nLgPlanStatus", headerName: "炼钢计划状态", width: 100, hide: true },
      { field: "nThickTolMax", headerName: "厚度上偏差", width: 100, hide: true },
      { field: "nThickTolMin", headerName: "厚度下偏差", width: 100, hide: true },
      { field: "nWidthTolMax", headerName: "宽度上偏差", width: 100, hide: true },
      { field: "nWidthTolMin", headerName: "宽度下偏差", width: 100, hide: true },
      { field: "nZlWgt", headerName: "组炉重量", width: 100, hide: true },
];

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function selectedRows(): Tmp2010Dto[] {
  return (gridApi.value?.getSelectedRows() ?? []) as Tmp2010Dto[];
}
function selectedIds(): string[] {
  return selectedRows()
    .map((x) => x.id ?? "")
    .filter(Boolean);
}

function buildInput(): InputTmp2010Dto {
  const input: InputTmp2010Dto = {
    dTimeStart: dtS.value?.toISOString(),
    dTimeEnd: dtE.value?.toISOString(),
    nReviewStatus: (icboReview.value ?? null) as OrderReviewEnum | null,
    cSgCode: txtGz.value.trim() || null,
    cIsTlOrder: "Y",
    cLineCode: menuQs || null,
  };
  const lst = parseBatchIds(comOrder.value);
  if (lst.length) input.orderLst = lst;
  return input;
}

/* simpleButton1 查询 → BindData → QueryOrder */
async function onQuery() {
  querying.value = true;
  try {
    rows.value = (await tmp2010Api.queryOrder(buildInput())) ?? [];
    /* 原勾选列 Selected 字段：查询回填后按数据字段回灌行选择勾选态 */
    requestAnimationFrame(() => {
      gridApi.value?.forEachNode((node) => node.setSelected(!!(node.data as Tmp2010Dto).selected));
      gridApi.value?.autoSizeAllColumns();
    });
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* simpleButton5 评审 → ReviewOrder */
async function onReview() {
  const ids = selectedIds();
  if (!ids.length) {
    toast("没有选择需要评审的订单！", 2000, "warn");
    return;
  }
  querying.value = true;
  try {
    await tmp2010Api.reviewOrder(ids);
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* simpleButton4 撤销评审 → CancleReviewOrder */
async function onCancelReview() {
  const ids = selectedIds();
  if (!ids.length) {
    toast("没有选择需要评审的订单！", 2000, "warn");
    return;
  }
  querying.value = true;
  try {
    await tmp2010Api.cancleReviewOrder(ids);
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* simpleButton2 设置（原 Visible=false）→ SetStaCode + CancleReviewOrder */
async function onSetStaCode() {
  const ids = selectedIds();
  if (!ids.length) {
    toast("没有选择需要调整连铸机的计划！", 2000, "warn");
    return;
  }
  if (!icboMachine.value) {
    toast("没有选择连铸机", 2000, "warn");
    return;
  }
  querying.value = true;
  try {
    await tmp2010Api.setStaCode(icboMachine.value, ids);
    await tmp2010Api.cancleReviewOrder(ids);
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnUpdateSpec 更新规格 → UpdateSpec（无勾选时原样静默返回） */
async function onUpdateSpec() {
  const ids = selectedIds();
  if (!ids.length) return;
  querying.value = true;
  try {
    await tmp2010Api.updateSpec(ids);
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnEditDate 修改 → ChangePlanDate */
async function onChangePlanDate() {
  const ids = selectedIds();
  if (!ids.length) return;
  if (!dtPlan.value) {
    toast("请选择计划日期！", 2000, "warn");
    return;
  }
  const planDate = fmtDate(dtPlan.value);
  if (!window.confirm(`是否确认修改勾选料单的计划日期为${planDate}?`)) return;
  querying.value = true;
  try {
    await tmp2010Api.changePlanDate(planDate, ids);
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件（原 stackPanel1，Dock.Top 单行：销售下发时间/批量订单号/评审状态/钢种） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">销售下发时间</label>
          <DatePicker v-model="dtS" date-format="yy-mm-dd" show-icon class="min-w-0 flex-1" />
          <span class="shrink-0 text-xs text-muted-foreground">~</span>
          <DatePicker v-model="dtE" date-format="yy-mm-dd" show-icon class="min-w-0 flex-1" />
        </div>
        <BatchIdInput v-model="comOrder" label="批量订单号" label-width="w-20" class="min-w-0" />
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">评审状态</label>
          <Select
            v-model="icboReview"
            :options="reviewOptions"
            option-label="label"
            option-value="value"
            show-clear
            placeholder="请选择"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="txtGz" class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- 工具栏（原 stackPanel2：查询/评审/撤销评审/连铸机/设置(hidden)/更新规格/计划日期/修改） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onReview">评审</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCancelReview">
        <IconRotate class="h-3 w-3" />撤销评审
      </Button>
      <label class="ml-2 shrink-0 text-xs text-muted-foreground">连铸机</label>
      <Select
        v-model="icboMachine"
        :options="machineOptions"
        option-label="label"
        option-value="value"
        show-clear
        placeholder="请选择"
        class="w-40 shrink-0"
      />
      <Button variant="outlined" class="hidden shrink-0 whitespace-nowrap" @click="onSetStaCode">设置</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onUpdateSpec">
        <IconRefresh class="h-3 w-3" />更新规格
      </Button>
      <label class="ml-2 shrink-0 text-xs text-muted-foreground">计划日期</label>
      <DatePicker v-model="dtPlan" date-format="yy-mm-dd" show-icon class="w-40 shrink-0" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onChangePlanDate">修改</Button>
    </div>

    <!-- 数据表格（原 gridControl1 Dock.Fill） -->
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
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
