<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR9050（热矫直实绩）：DDH.Winforms.SHR.Forms.FrmHR9050
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'SlabNo', headerName: '坯料号', width: 150 },
      { field: 'CBatchOrder', headerName: '组批号', width: 150 },
      { field: 'TotalPass', headerName: '总道次', width: 150 },
      { field: 'CBilletTypeCode', headerName: '铸坯标识', width: 150 },
      { field: 'CurrPass', headerName: '当前道次', width: 150 },
      { field: 'CProRemark', headerName: '生产备注', width: 150 },
      { field: 'EntryTime', headerName: '入炉时间', width: 150 },
      { field: 'EndTime', headerName: '结束时间', width: 150 },
      { field: 'EntryTemp', headerName: '入炉温度', width: 150 },
      { field: 'LevelerSpeed', headerName: '矫直速度', width: 150 },
      { field: 'BitSpeed', headerName: '位速度', width: 150 },
      { field: 'EntryGap', headerName: '入口间隙', width: 150 },
      { field: 'ExitGap', headerName: '出口间隙', width: 150 },
      { field: 'EntrySideRollGap', headerName: '入口侧辊间隙', width: 150 },
      { field: 'ExitSideRollGap', headerName: '出口侧辊间隙', width: 150 },
      { field: 'Tilt1', headerName: '倾斜1', width: 150 },
      { field: 'Tilt2', headerName: '倾斜2', width: 150 },
      { field: 'L2Force', headerName: '矫直力', width: 150 },
      { field: 'BendPosition', headerName: '弯曲位置', width: 150 },
      { field: 'TorqueMotor', headerName: '扭矩电机', width: 150 },
      { field: 'EmptyFlag', headerName: '空标志', width: 150 },
      { field: 'Spare', headerName: '备用', width: 150 },
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
