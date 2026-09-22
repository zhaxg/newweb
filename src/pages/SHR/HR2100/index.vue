<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR2100（轧钢日计划查询）：DDH.Winforms.SHR.Forms.FrmHR2100
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 112 },
      { field: 'NOrder', headerName: '排序', width: 112 },
      { field: 'CPlanTime', headerName: '计划时间', width: 112 },
      { field: 'CCool', headerName: '冷却', width: 112 },
      { field: 'COrderNo', headerName: '订单号', width: 112 },
      { field: 'COrderNo1', headerName: '订单号1', width: 112 },
      { field: 'COrderNo2', headerName: '订单号2', width: 112 },
      { field: 'COrderNo3', headerName: '订单号3', width: 112 },
      { field: 'COrderNo4', headerName: '订单号4', width: 112 },
      { field: 'NLenTq1', headerName: '套切1', width: 112 },
      { field: 'NLenTq2', headerName: '套切2', width: 112 },
      { field: 'NLenTq3', headerName: '套切3', width: 112 },
      { field: 'NLenTq4', headerName: '套切4', width: 112 },
      { field: 'NBc', headerName: '倍尺', width: 112 },
      { field: 'CSgCode', headerName: '钢种', width: 112 },
      { field: 'CSgStd', headerName: '钢种标准', width: 112 },
      { field: 'CSpec', headerName: '规格', width: 112 },
      { field: 'NPlanedWgt', headerName: '计划重量', width: 112 },
      { field: 'NPlanZpWgt', headerName: '计划组批量', width: 112 },
      { field: 'NZpSyWgt', headerName: '剩余组批量', width: 112 },
      { field: 'CSteelType', headerName: '品名', width: 112 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 112 },
      { field: 'CRemark', headerName: '备注', width: 112 },
      { field: 'CSgCodeTl', headerName: '炼钢钢种', width: 112 },
      { field: 'CSgStdTl', headerName: '提料标准', width: 112 },
      { field: 'NThickTl', headerName: '坯厚', width: 112 },
      { field: 'NWidthTl', headerName: '坯宽', width: 112 },
      { field: 'NLenMinTl', headerName: '提料长度最小值', width: 112 },
      { field: 'NLenMaxTl', headerName: '提料长度最大值', width: 112 },
      { field: 'NQuaTl', headerName: '计划生产钢坯块数', width: 112 },
      { field: 'NWgtUnitTl', headerName: '钢坯单重', width: 112 },
      { field: 'NWgtTl', headerName: '生产钢坯重量', width: 112 },
      { field: 'NQuaZp', headerName: '组批支数', width: 112 },
      { field: 'NWgtZp', headerName: '组批重量', width: 112 },
      { field: 'NQuaFur', headerName: '入炉支数', width: 112 },
      { field: 'NWgtFur', headerName: '入炉量', width: 112 },
      { field: 'NQuaRoll', headerName: '轧制支数', width: 112 },
      { field: 'NWgtRoll', headerName: '轧制重量', width: 112 },
      { field: 'NQuaPlan', headerName: '计划收料支数', width: 112 },
      { field: 'NQuaFinish', headerName: '收料支数', width: 112 },
      { field: 'NWgtFinish', headerName: '收料重量', width: 112 },
      { field: 'NWidthWgt', headerName: '宽重', width: 112 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 112 },
      { field: 'CFlawDesc', headerName: '表面缺陷', width: 112 },
      { field: 'DStart', headerName: '开始时间', width: 112 },
      { field: 'DEnd', headerName: '结束时间', width: 112 },
      { field: 'CPieceNos', headerName: '批量件次号', width: 112 },
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
