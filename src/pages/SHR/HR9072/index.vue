<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR9072（取样记录查询）：DDH.Winforms.SHR.Forms.FrmHR9072
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'CBatchNo', headerName: '批号', width: 200 },
      { field: 'CIsQy', headerName: '原取样板标记', width: 150 },
      { field: 'SampleTime', headerName: '取样时间', width: 150 },
      { field: 'SampleLth', headerName: '取样长度', width: 150 },
      { field: 'SamplePos', headerName: '取样位置', width: 150 },
      { field: 'COrderNo', headerName: '订单号', width: 200 },
      { field: 'CStove', headerName: '炉号', width: 200 },
      { field: 'CBatchOrder', headerName: '组批号', width: 200 },
      { field: 'CPlateNo', headerName: '大板号', width: 200 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 200 },
      { field: 'CPrintCode', headerName: '喷号', width: 200 },
      { field: 'CSgCode', headerName: '钢种', width: 200 },
      { field: 'CSgStd', headerName: '钢种标准', width: 200 },
      { field: 'CSpec', headerName: '规格', width: 200 },
      { field: 'NThick', headerName: '厚度', width: 200 },
      { field: 'NWidth', headerName: '宽度', width: 200 },
      { field: 'NLen', headerName: '长度', width: 200 },
      { field: 'NWgt', headerName: '重量', width: 200 },
      { field: 'NWgtCz', headerName: '称重重量', width: 200 },
      { field: 'CSgCodePlan', headerName: '订单钢种', width: 200 },
      { field: 'CSgStdPlan', headerName: '订单标准', width: 200 },
      { field: 'CSpecPlan', headerName: '轧制规格', width: 200 },
      { field: 'NThickPlan', headerName: '轧制厚度', width: 200 },
      { field: 'NWidthPlan', headerName: '轧制宽度', width: 200 },
      { field: 'NLenPlan', headerName: '计划长度', width: 200 },
      { field: 'NFurType', headerName: '装炉方式', width: 100 },
      { field: 'CCustName', headerName: '客户名称', width: 200 },
      { field: 'CIsGcd', headerName: '是否过称', width: 150 },
      { field: 'COrderNo1', headerName: '订单号1', width: 200 },
      { field: 'COrderNo2', headerName: '订单号2', width: 200 },
      { field: 'COrderNo3', headerName: '订单号3', width: 200 },
      { field: 'COrderNo4', headerName: '订单号4', width: 200 },
      { field: 'NLenTq1', headerName: '套切1', width: 200 },
      { field: 'NLenTq2', headerName: '套切2', width: 200 },
      { field: 'NLenTq3', headerName: '套切3', width: 200 },
      { field: 'NLenTq4', headerName: '套切4', width: 200 },
      { field: 'CInboundNo1', headerName: '入库标识1', width: 200 },
      { field: 'CInboundNo2', headerName: '入库标识2', width: 200 },
      { field: 'CInboundNo3', headerName: '入库标识3', width: 200 },
      { field: 'CInboundNo4', headerName: '入库标识4', width: 200 },
      { field: 'NBc', headerName: '倍尺', width: 200 },
      { field: 'NQuaPlan', headerName: '计划收料支数', width: 200 },
      { field: 'NWgtPlan', headerName: '计划重量', width: 200 },
      { field: 'NWgtOrder', headerName: '订单重量', width: 200 },
      { field: 'NWidthWgt', headerName: '宽重', width: 200 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 200 },
      { field: 'CFlawDesc', headerName: '表面缺陷', width: 200 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 200 },
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
