<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTI1211（加热实绩信息）：DDH.Winforms.SHR.Forms.APILogViewer.FrmTI1211
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'MatNo', headerName: '材料号', width: 112 },
      { field: 'PlanNo', headerName: '计划号', width: 112 },
      { field: 'SlabFurTime', headerName: '板坯装炉时刻', width: 112 },
      { field: 'SlabFurBefTemp', headerName: '入炉前温度', width: 112 },
      { field: 'FurNo', headerName: '炉号', width: 112 },
      { field: 'FurType', headerName: '加热炉类型', width: 112 },
      { field: 'InFurnaceShiftNo', headerName: '入炉班次', width: 112 },
      { field: 'InFurnaceShiftGroup', headerName: '入炉班组', width: 112 },
      { field: 'OutFurnaceShiftNo', headerName: '出炉班次', width: 112 },
      { field: 'OutFurnaceShiftGroup', headerName: '出炉班组', width: 112 },
      { field: 'TapSlabTempAve', headerName: '出钢时板坯平均温度', width: 112 },
      { field: 'TapSlabTempSrfc', headerName: '出钢时板坯表面温度', width: 112 },
      { field: 'TapSlabTempCt', headerName: '出钢时板坯中心温度', width: 112 },
      { field: 'OutTime', headerName: '抽出时刻', width: 112 },
      { field: 'OutTempAvg', headerName: '抽出平均温度', width: 112 },
      { field: 'InFurnaceTime', headerName: '在炉时间', width: 112 },
      { field: 'PreHtTempAve', headerName: '预热段入口的平均板坯温度', width: 112 },
      { field: 'PreHtHotAve', headerName: '预热段入口的板坯均热温度', width: 112 },
      { field: 'PreHtTempSrf', headerName: '预热段入口的板坯表面温度', width: 112 },
      { field: 'PreHtTempCt', headerName: '预热段入口的板坯中心温度', width: 112 },
      { field: 'PreHtAveTemp', headerName: '在预热段时的平均温度', width: 112 },
      { field: 'PreHtFurPerd', headerName: '预热段在炉时间', width: 112 },
      { field: 'Ht1SlabTempAve', headerName: '加热段1入口板坯平均温度', width: 112 },
      { field: 'Ht1SlabHotAve', headerName: '加热段1入口板坯均热度', width: 112 },
      { field: 'Ht1SlabTempSrfc', headerName: '加热段1入口板坯表面温度', width: 112 },
      { field: 'Ht1SlabTempCt', headerName: '加热段1入口板坯中心温度', width: 112 },
      { field: 'Ht1AveTemp', headerName: '在加热段1时的平均温度', width: 112 },
      { field: 'Ht1InFurPerd', headerName: '加热段1在炉时段', width: 112 },
      { field: 'Ht2SlabTempAve', headerName: '加热段2入口板坯平均温度', width: 112 },
      { field: 'Ht2SlabHotAve', headerName: '加热段2入口板坯均热度', width: 112 },
      { field: 'Ht2SlabTempSrfc', headerName: '加热段2入口板坯表面温度', width: 112 },
      { field: 'Ht2SlabTempCt', headerName: '加热段2入口板坯中心温度', width: 112 },
      { field: 'Ht2AveTemp', headerName: '在加热段2时的平均温度', width: 112 },
      { field: 'Ht2InFurPerd', headerName: '加热段2在炉时段', width: 112 },
      { field: 'EqSlabTempAve', headerName: '均热段入口板坯平均温度', width: 112 },
      { field: 'EqSlabHotAve', headerName: '均热段入口板坯均热度', width: 112 },
      { field: 'EqSlabTempSrfc', headerName: '均热段入口板坯表面温度', width: 112 },
      { field: 'EqSlabTempCt', headerName: '均热段入口板坯中心温度', width: 112 },
      { field: 'EqAveTemp', headerName: '均热平均温度', width: 112 },
      { field: 'EqInFurPerd', headerName: '均热在炉时段', width: 112 },
      { field: 'DSlabFurTime', headerName: '板坯装炉时间', width: 112 },
      { field: 'DOutTime', headerName: '抽出时间', width: 112 },
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
