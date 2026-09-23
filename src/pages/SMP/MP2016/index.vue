<script setup lang="ts">
/** 对应 FrmMP2016（订单提料查询）：DDH.Winforms.SMP.Forms.FrmMP2016
 *  已接入：tLApi.queryOrderNew（原 Svc/dpc Proxy<ITLAppService>.QueryOrderNew(InputTmp2010Dto)）
 *         —— FrmMP2016.cs 全部后端调用仅此一处（tLApi.getOrderLst2 为 TL2000/SD2020 通路，本窗体台账未出现，不接）
 *  查询条件：原 stackPanel1 —— 提料时间 dtS~dtE、批量订单号 comOrder(MemoExEdit 多行)；
 *            LineCode 取菜单 cQueryString（原 QueryString），默认 dtS=今天-2 / dtE=今天+1 */

import { ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { useMenuQuery } from "@/lib/menuQuery";
import { tLApi, OrderTlEnum, type Tmp2005Dto, type InputTmp2010Dto } from "@/api/mes4ddh/smp.swagger";
import BatchIdInput from "@/pages/Widgets/BatchIdInput/index.vue";
import { parseBatchIds } from "@/pages/Widgets/BatchIdInput/parse";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { raw: menuQs } = useMenuQuery(); // 原 QueryString（产线代码）

function dayOffset(n: number): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

// 查询条件（原 dtS/dtE/comOrder；Load：dtS=今天-2、dtE=今天+1）
const query = ref<{ dates: Date[] | null; orders: string }>({
  dates: [dayOffset(-2), dayOffset(1)],
  orders: "",
});
const rows = ref<Tmp2005Dto[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

/* 列按 Designer VisibleIndex（可见 76）；其余 99 列以 hide: true 迁入 */
const colDefs = ref<ColDef[]>([
      { field: "cPlanTime", headerName: "计划日期", width: 150 },
      { field: "createTime", headerName: "提料时间", width: 150 },
      { field: "creator", headerName: "提料人", width: 150 },
      { field: "cOrderNo", headerName: "提料计划号", width: 150 },
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
      { field: "czWidth", headerName: "展宽比", width: 150 },
      { field: "cRollNo", headerName: "补轧标识", width: 150 },
      { field: "nColdSlabKs", headerName: "冷坯块数", width: 150 },
      { field: "nColdSlabNum", headerName: "冷坯吨数", width: 150 },
      { field: "cInboundNo", headerName: "入库标识", width: 150 },
      { field: "cDelivyAddress", headerName: "流向", width: 150 },
      { field: "cRepairProduce", headerName: "补产", width: 150 },
      { field: "selected", headerName: "选择", width: 150, hide: true },
      { field: "id", headerName: "主键", width: 150, hide: true },
      { field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
      { field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
      { field: "nStatus", headerName: "订单状态", width: 150, hide: true },
      { field: "cTlOrderNo", headerName: "提料订单号", width: 150, hide: true },
      { field: "cIsMerge", headerName: "是否合并提料", width: 150, hide: true },
      { field: "cLineCode", headerName: "产线代码", width: 150, hide: true },
      { field: "cConNo", headerName: "合同号", width: 150, hide: true },
      { field: "nWgtSy", headerName: "剩余重量", width: 150, hide: true },
      { field: "nThickMin", headerName: "厚度下限", width: 150, hide: true },
      { field: "nThickMax", headerName: "厚度上限", width: 150, hide: true },
      { field: "nWidthMin", headerName: "宽度下限", width: 150, hide: true },
      { field: "nWidthMax", headerName: "宽度上限", width: 150, hide: true },
      { field: "cSteelType", headerName: "钢类", width: 150, hide: true },
      { field: "cProdCode", headerName: "品名代码", width: 150, hide: true },
      { field: "cMsc", headerName: "冶金规范", width: 150, hide: true },
      { field: "cPsc", headerName: "产品规范码", width: 150, hide: true },
      { field: "cMscLineNo", headerName: "冶金规范产线号", width: 150, hide: true },
      { field: "cMscLineDesc", headerName: "产线描述", width: 150, hide: true },
      { field: "cWholeBacklog", headerName: "全程工序码", width: 150, hide: true },
      { field: "cWholeBacklogDesc", headerName: "全程工序说明", width: 150, hide: true },
      { field: "cCustStdCode", headerName: "加工用途代码", width: 150, hide: true },
      { field: "cOrderCustNo", headerName: "订货客户编码", width: 150, hide: true },
      { field: "cOrderCustEname", headerName: "订货客户英文名称", width: 150, hide: true },
      { field: "cProductH", headerName: "重点品种", width: 150, hide: true },
      { field: "cOrderTypeCode", headerName: "合同性质QAA期货", width: 150, hide: true },
      { field: "cExportFlag", headerName: "出口标志", width: 150, hide: true },
      { field: "dOrderTime", headerName: "订单日期", width: 150, hide: true },
      { field: "cMatCode", headerName: "物料编码", width: 150, hide: true },
      { field: "cMatName", headerName: "物料名称", width: 150, hide: true },
      { field: "cSlabType", headerName: "自备坯R", width: 150, hide: true },
      { field: "cConRemark", headerName: "合同备注", width: 150, hide: true },
      { field: "cWarrantyDesc", headerName: "质保书要求", width: 150, hide: true },
      { field: "cPackCode", headerName: "特殊包装要求", width: 150, hide: true },
      { field: "cOrderProcFlag", headerName: "合同处理标志（", width: 150, hide: true },
      { field: "cDeptCode", headerName: "部门编码", width: 150, hide: true },
      { field: "nFlag", headerName: "计划类型", width: 150, hide: true },
      { field: "cProdName", headerName: "品名名称", width: 150, hide: true },
      { field: "cDelivyStatusDesc", headerName: "交货状态说明", width: 150, hide: true },
      { field: "cCustStdDesc", headerName: "加工用途说明", width: 150, hide: true },
      { field: "nApplyCloseStatus", headerName: "1待封锁", width: 150, hide: true },
      { field: "cApplyCloseEmp", headerName: "申请关闭人", width: 150, hide: true },
      { field: "dApplyCloseDt", headerName: "申请关闭时间", width: 150, hide: true },
      { field: "cApplyCloseRemark", headerName: "申请关闭说明", width: 150, hide: true },
      { field: "cDesignNo", headerName: "质量设计号", width: 150, hide: true },
      { field: "cDesignDesc", headerName: "质量设计失败说明", width: 150, hide: true },
      { field: "nWtMax", headerName: "单量上限", width: 150, hide: true },
      { field: "nWtMin", headerName: "单量下限", width: 150, hide: true },
      { field: "nSendNum", headerName: "发送次数", width: 150, hide: true },
      { field: "cOverstepBl", headerName: "短溢装比例", width: 150, hide: true },
      { field: "cShape", headerName: "形状代码", width: 150, hide: true },
      { field: "cSlabSource", headerName: "供坯单位", width: 150, hide: true },
      { field: "cTlSgStd", headerName: "炼钢标准", width: 150, hide: true },
      { field: "nSlabLenMax", headerName: "钢坯长度最大值", width: 150, hide: true },
      { field: "nWgtMeter", headerName: "钢坯米单重", width: 150, hide: true },
      { field: "nRate", headerName: "理论成材率", width: 150, hide: true },
      { field: "nSlabWgtSy", headerName: "坯料剩余重量", width: 150, hide: true },
      { field: "cSlabRemark", headerName: "提料备注", width: 150, hide: true },
      { field: "nTlStatus", headerName: "提料状态", width: 150, hide: true },
      { field: "cTlRemark", headerName: "提料失败说明", width: 150, hide: true },
      { field: "cTlName", headerName: "提料操作人", width: 150, hide: true },
      { field: "dTlTime", headerName: "提料时间", width: 150, hide: true },
      { field: "cTlOrderFlag", headerName: "是否提料订单", width: 150, hide: true },
      { field: "cCcmCode", headerName: "连铸机编码", width: 150, hide: true },
      { field: "nSfpj", headerName: "评审状态", width: 150, hide: true },
      { field: "cPjName", headerName: "评审人", width: 150, hide: true },
      { field: "dPjTime", headerName: "评审时间", width: 150, hide: true },
      { field: "cPjRemark", headerName: "评审失败原因", width: 150, hide: true },
      { field: "cSlabSize", headerName: "坯料规格", width: 150, hide: true },
      { field: "cStNo", headerName: "炼钢工艺卡", width: 150, hide: true },
      { field: "cZggyCode", headerName: "轧钢工艺编码", width: 150, hide: true },
      { field: "cOrderNoOld", headerName: "原始订单号", width: 150, hide: true },
      { field: "cOrderNo5", headerName: "订单号5", width: 150, hide: true },
      { field: "cOrderNo6", headerName: "订单号6", width: 150, hide: true },
      { field: "nLenPlan5", headerName: "套切长度5", width: 150, hide: true },
      { field: "nLenPlan6", headerName: "套切长度6", width: 150, hide: true },
      { field: "cJqgyCode", headerName: "剪切工艺编码", width: 150, hide: true },
      { field: "cJrzzgyCode", headerName: "加热轧制工艺编码", width: 150, hide: true },
      { field: "cSpecPlan", headerName: "生产规格", width: 150, hide: true },
      { field: "cStoreShift", headerName: "炉次", width: 150, hide: true },
      { field: "cThreading1", headerName: "套切1", width: 150, hide: true },
      { field: "cThreading2", headerName: "套切2", width: 150, hide: true },
      { field: "cThreading3", headerName: "套切3", width: 150, hide: true },
      { field: "cThreading4", headerName: "套切4", width: 150, hide: true },
      { field: "cVirtualStoreCode", headerName: "虚拟炉号", width: 150, hide: true },
      { field: "cYcAlert", headerName: "异常提醒", width: 150, hide: true },
      { field: "cZggyCode", headerName: "轧钢工艺编码", width: 150, hide: true },
      { field: "dTimeShipment", headerName: "预计船期", width: 150, hide: true },
      { field: "nLenTolMax", headerName: "长度上偏差", width: 150, hide: true },
      { field: "nLenTolMin", headerName: "长度下偏差", width: 150, hide: true },
      { field: "nLgPlanStatus", headerName: "炼钢计划状态", width: 150, hide: true },
      { field: "nThickTolMax", headerName: "厚度上偏差", width: 150, hide: true },
      { field: "nThickTolMin", headerName: "厚度下偏差", width: 150, hide: true },
      { field: "nWidthTolMax", headerName: "宽度上偏差", width: 150, hide: true },
      { field: "nWidthTolMin", headerName: "宽度下偏差", width: 150, hide: true },
      { field: "nZlWgt", headerName: "组炉重量", width: 150, hide: true },
      { field: "cCool", headerName: "是否冷坯计划", width: 150, hide: true },
      { field: "cPieceNo", headerName: "板坯号", width: 150, hide: true },
]);

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

/** 原 comOrder.EditValue 按 \r\n 拆分 */
function splitOrders(s: string): string[] | undefined {
  const list = parseBatchIds(s);
  return list.length ? list : undefined;
}

async function onQuery() {
  querying.value = true;
  try {
    const input: InputTmp2010Dto = {
      dTimeStart: query.value.dates?.[0]?.toISOString(),
      dTimeEnd: query.value.dates?.[1]?.toISOString(),
      cLineCode: menuQs,
      nTlStatus: OrderTlEnum.Checked,
      orderLst: splitOrders(query.value.orders),
    };
    rows.value = (await tLApi.queryOrderNew(input)) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
    if (!rows.value.length) toast("无符合条件的数据", 2000, "info");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 stackPanel1：提料时间 ~ + 批量订单号） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">提料时间</label>
        <DatePicker v-model="query.dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
          show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
      </div>
      <BatchIdInput v-model="query.orders" label="批量订单号" />
    </div>

    <!-- 工具栏（原 stackPanel1 内 simpleButton1 查询） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>

    <!-- 主表（gcCheck / gvCheck，绑定实体 Tmp2005Dto） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :pagination="false" :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        :loading="querying" @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
