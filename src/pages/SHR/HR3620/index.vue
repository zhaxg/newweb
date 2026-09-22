<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR3620（堆冷操作汇总统计）：DDH.Winforms.SHR.Forms.FrmHR3620
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'Date', headerName: '日期', width: 150 },
      { field: 'ShiftGroup', headerName: '班次组', width: 150 },
      { field: 'NQuaS', headerName: '开始堆冷数量', width: 150 },
      { field: 'NWgtS', headerName: '开始堆冷重量', width: 150 },
      { field: 'NQuaEnd', headerName: '结束堆冷数量', width: 150 },
      { field: 'NWgtEnd', headerName: '结束堆冷重量', width: 150 },
      { field: 'NQuaDd', headerName: '堆冷倒垛块数', width: 150 },
      { field: 'NWgtDd', headerName: '堆冷倒垛重量', width: 150 },
      { field: 'NQuaZy', headerName: '转运块数', width: 150 },
      { field: 'NWgtZy', headerName: '转运重量', width: 150 },
      { field: 'NQuaJs', headerName: '接收块数', width: 150 },
      { field: 'NWgtJs', headerName: '接收重量', width: 150 },
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
