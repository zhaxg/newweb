<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTqmhr01（加热轧制工艺(New)）：DDH.Winforms.Forms.FrmTqmhr01
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'Steelgrade', headerName: '钢种', width: 120 },
      { field: 'Thicklow', headerName: '厚度下限', width: 120 },
      { field: 'Thickup', headerName: '厚度上限', width: 120 },
      { field: 'Widthlow', headerName: '宽度下限', width: 120 },
      { field: 'Widthup', headerName: '宽度上限', width: 120 },
      { field: 'Season', headerName: '季节', width: 120 },
      { field: 'Gytype', headerName: '工艺分类', width: 120 },
      { field: 'Hot1low', headerName: '加热1段温度下限', width: 120 },
      { field: 'Hot1up', headerName: '加热1段温度上限', width: 120 },
      { field: 'Hot2low', headerName: '加热2段温度下限', width: 120 },
      { field: 'Hot2up', headerName: '加热2段温度上限', width: 120 },
      { field: 'Sf1low', headerName: '均热段1下限', width: 120 },
      { field: 'Sf1up', headerName: '均热段1上限', width: 120 },
      { field: 'Sf2low', headerName: '均热段2下限', width: 120 },
      { field: 'Sf2up', headerName: '均热段2上限', width: 120 },
      { field: 'Lasthour', headerName: '最小时长系数', width: 120 },
      { field: 'Coldtotalhour', headerName: '冷坯总时长系数', width: 120 },
      { field: 'Hottotalhour', headerName: '热坯总时长系数', width: 120 },
      { field: 'Rmstarttemp', headerName: '粗轧开轧温度', width: 120 },
      { field: 'Waitslabthick', headerName: '待坯厚度', width: 120 },
      { field: 'Waitslabtemp', headerName: '待坯温度', width: 120 },
      { field: 'Frmtempstd', headerName: '精轧终轧目标温度', width: 120 },
      { field: 'Frmtemplow', headerName: '精轧终轧温度下限', width: 120 },
      { field: 'Frmtempup', headerName: '精轧终轧温度上限', width: 120 },
      { field: 'Acctempstd', headerName: 'ACC返红目标温度', width: 120 },
      { field: 'Acctemplow', headerName: 'ACC返红温度下限', width: 120 },
      { field: 'Acctempup', headerName: 'ACC返红温度上限', width: 120 },
      { field: 'Stacking', headerName: '钢板是否堆垛', width: 120 },
      { field: 'Spare1', headerName: '是否探伤', width: 120 },
      { field: 'Spare2', headerName: '是否热处理', width: 120 },
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
