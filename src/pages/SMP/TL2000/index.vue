<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTL2000（中厚板提料）：DDH.Winforms.SMP.Forms.FrmTL2000
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'IsTl', headerName: '是否提料', width: 150 },
      { field: 'Selected', headerName: '选择', width: 150 },
      { field: 'COrderNo', headerName: '订单号', width: 150 },
      { field: 'CCool', headerName: '冷却', width: 150 },
      { field: 'COrderCustNo', headerName: '订货客户编号', width: 150 },
      { field: 'CCheckRemark', headerName: '备注说明', width: 150 },
      { field: 'COrderCustCname', headerName: '订货客户', width: 150 },
      { field: 'CPlanTime', headerName: '计划时间', width: 150 },
      { field: 'CSteelType', headerName: '品名', width: 150 },
      { field: 'CSgCode', headerName: '钢种', width: 150 },
      { field: 'CSgCodeNk', headerName: '内控钢种', width: 150 },
      { field: 'COrderNo1', headerName: '订单号1', width: 150 },
      { field: 'NThick', headerName: '厚度', width: 150 },
      { field: 'COrderNo2', headerName: '订单号2', width: 150 },
      { field: 'NThickMin', headerName: '最小厚度', width: 150 },
      { field: 'COrderNo3', headerName: '订单号3', width: 150 },
      { field: 'NThickMax', headerName: '最大厚度', width: 150 },
      { field: 'COrderNo4', headerName: '订单号4', width: 150 },
      { field: 'NWidth', headerName: '宽度', width: 150 },
      { field: 'NWidthMin', headerName: '最小宽度', width: 150 },
      { field: 'NWidthMax', headerName: '最大宽度', width: 150 },
      { field: 'NWidthWgt', headerName: '宽重', width: 150 },
      { field: 'CLengthType', headerName: '长度类型', width: 150 },
      { field: 'NLenMin', headerName: '最小长度', width: 150 },
      { field: 'NLen', headerName: '长度', width: 150 },
      { field: 'NLenMax', headerName: '最大长度', width: 150 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 150 },
      { field: 'CDelivyStatusDesc', headerName: '交货状态描述', width: 150 },
      { field: 'NNum', headerName: '件数', width: 150 },
      { field: 'NWgt', headerName: '重量', width: 150 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 150 },
      { field: 'COverstepBl', headerName: '超差', width: 150 },
      { field: 'CDelivyQtyFlag', headerName: '交货数量标志', width: 150 },
      { field: 'CTol', headerName: '公差', width: 150 },
      { field: 'CTlSgCode', headerName: '提料钢种', width: 150 },
      { field: 'CFlawDesc', headerName: '表面缺陷', width: 150 },
      { field: 'NSlabThick', headerName: '坯料厚度', width: 150 },
      { field: 'CConNo', headerName: '合同号', width: 150 },
      { field: 'NSlabWidth', headerName: '坯料宽度', width: 150 },
      { field: 'CSgStd', headerName: '钢种标准', width: 150 },
      { field: 'NSlabLenMin', headerName: '坯料最小长度', width: 150 },
      { field: 'DJhqTime', headerName: '计划日期', width: 150 },
      { field: 'NSlabQua', headerName: '坯料数量', width: 150 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 150 },
      { field: 'NWgtUnit', headerName: '单位重量', width: 150 },
      { field: 'CSpecialMarkGy', headerName: '特殊标记工艺', width: 150 },
      { field: 'NSlabWgt', headerName: '坯料重量', width: 150 },
      { field: 'NWtMax', headerName: '最大重量', width: 150 },
      { field: 'NThickPlan', headerName: '轧制厚度', width: 150 },
      { field: 'NWtMin', headerName: '最小重量', width: 150 },
      { field: 'NWidthPlan', headerName: '轧制宽度', width: 150 },
      { field: 'CSpec', headerName: '规格', width: 150 },
      { field: 'NLenPlan', headerName: '计划长度', width: 150 },
      { field: 'CConRemark', headerName: '合同备注', width: 150 },
      { field: 'NDbc', headerName: '单重', width: 150 },
      { field: 'CInboundNo', headerName: '入库单号', width: 150 },
      { field: 'NSteelSingleWgt', headerName: '单支重量', width: 150 },
      { field: 'CExitem1', headerName: '是否工程单', width: 150 },
      { field: 'NPlanedBoardNum', headerName: '计划块数', width: 150 },
      { field: 'DTimeShipment', headerName: '发货时间', width: 150 },
      { field: 'NPlanedWgt', headerName: '计划重量', width: 150 },
      { field: 'CLineCode', headerName: '产线', width: 150 },
      { field: 'NConSteelKs', headerName: '连铸钢块数', width: 150 },
      { field: 'NConSteelNum', headerName: '连铸钢数量', width: 150 },
      { field: 'NTlTol', headerName: '提料公差', width: 150 },
      { field: 'NLlBoardWgt', headerName: '余量板重', width: 150 },
      { field: 'NLlBoardEndWgt', headerName: '余量板端重', width: 150 },
      { field: 'CSendUserId', headerName: '销售提报人', width: 150 },
      { field: 'NLlBoardEdge', headerName: '余量板边', width: 150 },
      { field: 'DSendTime', headerName: '发送时间', width: 150 },
      { field: 'NLlBoardEnd', headerName: '余量板端', width: 150 },
      { field: 'NLlBurnLoss', headerName: '余量烧损', width: 150 },
      { field: 'NLlCleanLen', headerName: '余量清洁长度', width: 150 },
      { field: 'NBoarCleanLen', headerName: '板清洁长度', width: 150 },
      { field: 'CThickRange', headerName: '厚度范围', width: 150 },
      { field: 'CFlawStand', headerName: '探伤标准', width: 150 },
      { field: 'CTransType', headerName: '运输类型', width: 150 },
      { field: 'CStoreRoom', headerName: '库房', width: 150 },
      { field: 'CRzFlag', headerName: '是否认证', width: 150 },
      { field: 'CSampleSpec', headerName: '样品规格', width: 150 },
      { field: 'CAddress', headerName: '地址', width: 150 },
      { field: 'CThickRangeDis', headerName: '厚度范围描述', width: 150 },
      { field: 'CSingleSlab', headerName: '单片钢坯', width: 150 },
      { field: 'NLenPlan1', headerName: '套切长度1', width: 150 },
      { field: 'NLenPlan2', headerName: '套切长度2', width: 150 },
      { field: 'NLenPlan3', headerName: '套切长度3', width: 150 },
      { field: 'NLenPlan4', headerName: '套切长度4', width: 150 },
      { field: 'NRate', headerName: '收得率', width: 150 },
      { field: 'NPlanBoarLen', headerName: '计划板长', width: 150 },
      { field: 'CRollType', headerName: '轧制方式', width: 150 },
      { field: 'NLlProduceKs', headerName: '余量生产块数', width: 150 },
      { field: 'NDcLen', headerName: '定尺长度', width: 150 },
      { field: 'CZWidth', headerName: 'Z宽度', width: 150 },
      { field: 'CRollNo', headerName: '补轧标识', width: 150 },
      { field: 'NColdSlabKs', headerName: '冷坯块数', width: 150 },
      { field: 'NColdSlabNum', headerName: '冷坯数量', width: 150 },
      { field: 'CRepairProduce', headerName: '补产', width: 150 },
]));


function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }



async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-2">
    <div class="flex flex-wrap items-center gap-3 rounded bg-white p-3 shadow-sm dark:bg-gray-900">

      <Button label="查询" icon="pi pi-search" :loading="querying" @click="onQuery" />
    </div>
    <div class="flex items-center gap-2 rounded bg-white p-2 shadow-sm dark:bg-gray-900">

    </div>
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
