<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmDM1060（能耗实绩）：DDH.Winforms.SHR.Forms.WorkPiece.FrmDM1060
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'NGasUseNum', headerName: '煤气', width: 112 },
      { field: 'DMonth', headerName: '月份', width: 112 },
      { field: 'NElecUseNum', headerName: '用电', width: 112 },
      { field: 'NWaterUseNum', headerName: '新水', width: 112 },
      { field: 'NGasNum', headerName: '入库量', width: 112 },
      { field: 'NAirUseNum', headerName: '压空', width: 112 },
      { field: 'NGasPrice', headerName: '单价', width: 112 },
      { field: 'NO2UseNum', headerName: '氧气', width: 112 },
      { field: 'NElecNum', headerName: '入库量', width: 112 },
      { field: 'NN2UseNum', headerName: '氮气', width: 112 },
      { field: 'NElecPrice', headerName: '单价', width: 112 },
      { field: 'NWaterNum', headerName: '入库量', width: 112 },
      { field: 'NWaterPrice', headerName: '单价', width: 112 },
      { field: 'NAirNum', headerName: '入库量', width: 112 },
      { field: 'NAirPrice', headerName: '单价', width: 112 },
      { field: 'NO2Num', headerName: '入库量', width: 112 },
      { field: 'NO2Price', headerName: '单价', width: 112 },
      { field: 'NN2Num', headerName: '入库量', width: 112 },
      { field: 'NN2Price', headerName: '氮气单价', width: 112 },
      { field: 'NGasSingleNum', headerName: '单耗', width: 112 },
      { field: 'NGasAmount', headerName: '金额', width: 112 },
      { field: 'NElecSingleNum', headerName: '单耗', width: 112 },
      { field: 'NElecAmount', headerName: '金额', width: 112 },
      { field: 'NWaterSingleNum', headerName: '单耗', width: 112 },
      { field: 'NWaterAmount', headerName: '金额', width: 112 },
      { field: 'NAirSingleNum', headerName: '单耗', width: 112 },
      { field: 'NAirAmount', headerName: '金额', width: 112 },
      { field: 'NO2SingleNum', headerName: '单耗', width: 112 },
      { field: 'NO2Amount', headerName: '金额', width: 112 },
      { field: 'NN2SingleNum', headerName: '单耗', width: 112 },
      { field: 'NN2Amount', headerName: '金额', width: 112 },
      { field: 'NAllPrice', headerName: '累计', width: 112 },
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
