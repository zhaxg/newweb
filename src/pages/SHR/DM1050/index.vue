<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmDM1050（停机维护）：DDH.Winforms.SHR.Forms.WorkPiece.FrmDM1050
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'CDateTime', headerName: '日期', width: 112 },
      { field: 'NAllTime', headerName: '总时间', width: 112 },
      { field: 'NStopTime', headerName: '停机时间', width: 112 },
      { field: 'NChangeSlTime1', headerName: '1#剪切线换剪刃时间', width: 112 },
      { field: 'NStopType', headerName: '停机类型', width: 112 },
      { field: 'NChangeSlTime2', headerName: '2#剪切线换剪刃时间', width: 112 },
      { field: 'NRepairTime', headerName: '检修时间', width: 112 },
      { field: 'NCraftStopTime', headerName: '工艺停机时间', width: 112 },
      { field: 'NGzTime', headerName: '故障时间', width: 112 },
      { field: 'NOutStopTime', headerName: '外部停机时间', width: 112 },
      { field: 'NAllStopTime', headerName: '总停机时间', width: 112 },
      { field: 'NWorkTime', headerName: '作业时间', width: 112 },
      { field: 'NStartWorkRate', headerName: '设备可开工率', width: 112 },
      { field: 'NWorkRate', headerName: '设备作业率', width: 112 },
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
