<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmQL8100（检验结果查询）：DDH.Winforms.LIMS.Forms.FrmQL8100
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'CTestNo', headerName: '委托单号', width: 120 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 120 },
      { field: 'CDeliveryStateDesc', headerName: '交货状态描述', width: 120 },
      { field: 'CStove', headerName: '炉号', width: 120 },
      { field: 'CBatch', headerName: '批号', width: 120 },
      { field: 'CSgSign', headerName: '钢种', width: 120 },
      { field: 'CSgStd', headerName: '钢种标准', width: 120 },
      { field: 'CJudgeResult', headerName: '最终判定结果', width: 120 },
      { field: 'JyTime', headerName: '检验时间', width: 120 },
      { field: 'CSampleNo', headerName: '试样号', width: 120 },
      { field: 'CRecheckFlag', headerName: '复验标记', width: 120 },
      { field: 'NTestTimes', headerName: '试验次数', width: 120 },
      { field: 'Thick', headerName: '厚度', width: 120 },
      { field: 'Width', headerName: '宽度', width: 120 },
      { field: 'Len', headerName: '长', width: 120 },
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
