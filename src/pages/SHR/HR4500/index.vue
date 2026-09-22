<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR4500（日产量查询）：DDH.Winforms.SHR.Forms.FrmHR4500
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'Date', headerName: '日期', width: 150 },
      { field: 'ShiftGroup', headerName: '班次组', width: 150 },
      { field: 'NQuaCl', headerName: '出炉支数', width: 150 },
      { field: 'NWgtCl', headerName: '出炉重量', width: 150 },
      { field: 'NQuaRoll', headerName: '轧制支数', width: 150 },
      { field: 'NWgtRoll', headerName: '轧制重量', width: 150 },
      { field: 'NQuaJq', headerName: '剪切支数', width: 150 },
      { field: 'NWgtJq', headerName: '剪切重量', width: 150 },
      { field: 'NQuaHq', headerName: '火切支数', width: 150 },
      { field: 'NWgtHq', headerName: '火切重量', width: 150 },
      { field: 'NQuaCp', headerName: '成品支数', width: 150 },
      { field: 'NQuaRk', headerName: '入库支数', width: 150 },
      { field: 'NQuaWRk', headerName: '未入库支数', width: 150 },
      { field: 'NQuaFc', headerName: '非尺支数', width: 150 },
      { field: 'NPerFc', headerName: '非尺比例', width: 150 },
      { field: 'NAllDlQua', headerName: '总数量', width: 112 },
      { field: 'NAllDlWgt', headerName: '总重量', width: 112 },
      { field: 'NDlFinishQua', headerName: '到期数量', width: 112 },
      { field: 'NDlFinishWgt', headerName: '到期重量', width: 112 },
      { field: 'NDlNotQua', headerName: '未到期数量', width: 112 },
      { field: 'NDlNotWgt', headerName: '未到期重量', width: 112 },
      { field: 'NQuaDrk', headerName: '支数', width: 112 },
      { field: 'NWgtDrk', headerName: '重量', width: 112 },
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
