<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmDM1040（换辊实绩）：DDH.Winforms.SHR.Forms.WorkPiece.FrmDM1040
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'CRollerNo', headerName: '轧辊号', width: 112 },
      { field: 'CStandNo', headerName: '机架号', width: 112 },
      { field: 'NRollerType', headerName: '轧辊类型', width: 112 },
      { field: 'DUpTime', headerName: '上机时间', width: 112 },
      { field: 'DDownTime', headerName: '下发时间', width: 112 },
      { field: 'NAllRollTime', headerName: '总轧制时间min', width: 112 },
      { field: 'NRollLen', headerName: '轧制长mm', width: 112 },
      { field: 'NRollWgt', headerName: '轧制板重t', width: 112 },
      { field: 'NAllRollRow', headerName: '总轧制道次', width: 112 },
      { field: 'NRollNum', headerName: '本次轧制块数', width: 112 },
      { field: 'CStartPlateNo', headerName: '起始钢板号', width: 112 },
      { field: 'CEndPlateNo', headerName: '结束钢板号', width: 112 },
      { field: 'CReason', headerName: '强制原因', width: 112 },
      { field: 'NOrderNum', headerName: '磨削序号', width: 112 },
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
