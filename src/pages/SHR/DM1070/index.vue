<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmDM1070（油品备件）：DDH.Winforms.SHR.Forms.WorkPiece.FrmDM1070
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 112 },
      { field: 'DMonth', headerName: '日期', width: 112 },
      { field: 'NInBound', headerName: '油品入库量', width: 112 },
      { field: 'NBeforeInventory', headerName: '油品前库存', width: 112 },
      { field: 'NReceive', headerName: '油品本月领取', width: 112 },
      { field: 'NAfterInventory', headerName: '油品月底库存', width: 112 },
      { field: 'NSjUse', headerName: '油品实际消耗', width: 112 },
      { field: 'NUse', headerName: '油品单耗', width: 112 },
      { field: 'NAmount', headerName: '油品金额', width: 112 },
      { field: 'NWrollerUseAll', headerName: '工作辊消耗量', width: 112 },
      { field: 'NWrollerUse', headerName: '工作辊单耗', width: 112 },
      { field: 'NWrollerAmount', headerName: '工作辊金额', width: 112 },
      { field: 'NBrollerUseAll', headerName: '支撑辊消耗量', width: 112 },
      { field: 'NBrollerUse', headerName: '支撑辊单耗', width: 112 },
      { field: 'NBrollerAmount', headerName: '支撑辊金额', width: 112 },
      { field: 'NRollerUse', headerName: '轧辊累计单耗', width: 112 },
      { field: 'NRollerAmount', headerName: '轧辊累计金额', width: 112 },
      { field: 'NSpareReceiveAmount', headerName: '备件领取金额', width: 112 },
      { field: 'NSpareUse', headerName: '备件单耗', width: 112 },
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
