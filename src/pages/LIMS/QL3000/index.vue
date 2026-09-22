<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmQL3000（检验委托发送）：DDH.Winforms.LIMS.Forms.FrmQL3000
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'CTestSubItemCode', headerName: '试验子项目代码', width: 120 },
      { field: 'CTestSubItemName', headerName: '试验子项目名称', width: 120 },
      { field: 'CDisplayText', headerName: '项目说明', width: 120 },
      { field: 'NValueMin', headerName: '检验标准下限', width: 120 },
      { field: 'CInterval', headerName: '开闭区间', width: 120 },
      { field: 'NValueMax', headerName: '检验标准上限', width: 120 },
      { field: 'CTargetValue', headerName: '目标值', width: 120 },
      { field: 'NItemAccuracy', headerName: '精度', width: 120 },
      { field: 'CFormula', headerName: '计算公式', width: 120 },
      { field: 'CIsPrint', headerName: '是否打质保书', width: 120 },
      { field: 'CIsJudge', headerName: '是否判定', width: 120 },
      { field: 'NMinValueNk', headerName: '内控最小值', width: 120 },
      { field: 'NValueIntervalNk', headerName: '内控开闭区间', width: 120 },
      { field: 'NMaxValueNk', headerName: '内控最大值', width: 120 },
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
