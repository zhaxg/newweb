<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR3110（作业计划调整）：DDH.Winforms.SHR.Forms.FrmHR3110
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'NOrder', headerName: '排序', width: 149 },
      { field: 'Selected', headerName: '选择', width: 150 },
      { field: 'CPlanPieceNos', headerName: '计划材料', width: 150 },
      { field: 'CPlanTime', headerName: '计划时间', width: 150 },
      { field: 'CCool', headerName: '冷却', width: 150 },
      { field: 'CPos', headerName: '当前位置', width: 150 },
      { field: 'CIsGcd', headerName: '是否过称', width: 150 },
      { field: 'CBatchNo', headerName: '批号', width: 150 },
      { field: 'CStove', headerName: '炉号', width: 150 },
      { field: 'CBatchOrder', headerName: '组批号', width: 150 },
      { field: 'COrderNo', headerName: '订单号', width: 149 },
      { field: 'COrderNo1', headerName: '订单号1', width: 149 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 150 },
      { field: 'COrderNo2', headerName: '订单号2', width: 149 },
      { field: 'CPrintCode', headerName: '喷号', width: 150 },
      { field: 'COrderNo3', headerName: '订单号3', width: 149 },
      { field: 'COrderNo4', headerName: '订单号4', width: 149 },
      { field: 'NThick', headerName: '厚度', width: 150 },
      { field: 'NLenTq1', headerName: '套切1', width: 149 },
      { field: 'NWidth', headerName: '宽度', width: 150 },
      { field: 'NLenTq2', headerName: '套切2', width: 149 },
      { field: 'NLen', headerName: '长度', width: 150 },
      { field: 'NLenTq3', headerName: '套切3', width: 149 },
      { field: 'NWgt', headerName: '重量', width: 150 },
      { field: 'NLenTq4', headerName: '套切4', width: 149 },
      { field: 'NThickPlan', headerName: '轧制厚度', width: 150 },
      { field: 'NBc', headerName: '倍尺', width: 150 },
      { field: 'NWidthPlan', headerName: '轧制宽度', width: 150 },
      { field: 'CSgCode', headerName: '钢种', width: 149 },
      { field: 'NLenPlan', headerName: '计划长度', width: 150 },
      { field: 'CSgStd', headerName: '钢种标准', width: 149 },
      { field: 'CSgCodePlan', headerName: '订单钢种', width: 150 },
      { field: 'CSpec', headerName: '规格', width: 149 },
      { field: 'CSgStdPlan', headerName: '订单标准', width: 150 },
      { field: 'NPlanedWgt', headerName: '计划重量', width: 149 },
      { field: 'NRateLl', headerName: '理论成材率', width: 150 },
      { field: 'NPlanZpWgt', headerName: '计划组批量', width: 149 },
      { field: 'CTol', headerName: '公差', width: 150 },
      { field: 'NZpSyWgt', headerName: '剩余组批量', width: 149 },
      { field: 'CDn', headerName: '需要堆冷', width: 150 },
      { field: 'CSteelType', headerName: '品名', width: 149 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 149 },
      { field: 'CRemark', headerName: '备注', width: 149 },
      { field: 'CSpecialMarkGy', headerName: '特殊标记工艺', width: 150 },
      { field: 'CSgCodeTl', headerName: '炼钢钢种', width: 149 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 150 },
      { field: 'CSgStdTl', headerName: '提料标准', width: 149 },
      { field: 'NThickTl', headerName: '坯厚', width: 149 },
      { field: 'NWidthTl', headerName: '坯宽', width: 149 },
      { field: 'NLenMinTl', headerName: '提料长度最小值', width: 149 },
      { field: 'NLenMaxTl', headerName: '提料长度最大值', width: 149 },
      { field: 'NQuaTl', headerName: '计划生产钢坯块数', width: 149 },
      { field: 'NWgtUnitTl', headerName: '钢坯单重', width: 149 },
      { field: 'NWgtTl', headerName: '生产钢坯重量', width: 149 },
      { field: 'NQuaZp', headerName: '组批支数', width: 150 },
      { field: 'NWgtZp', headerName: '组批重量', width: 150 },
      { field: 'CBilletTypeCode', headerName: '铸坯标识', width: 150 },
      { field: 'NQuaFur', headerName: '入炉支数', width: 150 },
      { field: 'CProRemark', headerName: '生产备注', width: 150 },
      { field: 'NWgtFur', headerName: '入炉量', width: 150 },
      { field: 'NQuaRoll', headerName: '轧制支数', width: 150 },
      { field: 'NWgtRoll', headerName: '轧制重量', width: 150 },
      { field: 'NQuaPlan', headerName: '计划收料支数', width: 150 },
      { field: 'NQuaFinish', headerName: '收料支数', width: 150 },
      { field: 'NWgtFinish', headerName: '收料重量', width: 150 },
      { field: 'NWidthWgt', headerName: '宽重', width: 149 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 149 },
      { field: 'CFlawDesc', headerName: '表面缺陷', width: 149 },
      { field: 'DStart', headerName: '开始时间', width: 150 },
      { field: 'DEnd', headerName: '结束时间', width: 150 },
      { field: 'CPieceNos', headerName: '批量件次号', width: 150 },
      { field: 'CConRemark', headerName: '合同备注', width: 149 },
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
