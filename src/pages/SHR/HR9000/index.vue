<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR9000（照核实绩）：DDH.Winforms.SHR.Forms.FrmHR9000
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'CStove', headerName: '炉号', width: 150 },
      { field: 'SlabNo', headerName: '坯料号', width: 150 },
      { field: 'PrintCode', headerName: '喷印号', width: 150 },
      { field: 'CSgCode', headerName: '钢种', width: 150 },
      { field: 'NThick', headerName: '厚度', width: 150 },
      { field: 'NWth', headerName: '宽度', width: 150 },
      { field: 'NLen', headerName: '长度', width: 150 },
      { field: 'NWgt', headerName: '重量', width: 150 },
      { field: 'MesCallBack', headerName: 'MES反馈', width: 150 },
      { field: 'L2CallBack', headerName: 'L2反馈', width: 150 },
      { field: 'NQmStatus', headerName: '质量状态', width: 150 },
      { field: 'CSurfaceResult', headerName: '表检结果', width: 150 },
      { field: 'CProRemark', headerName: '生产备注', width: 150 },
      { field: 'PLAN_NThickPlan', headerName: '轧制厚', width: 150 },
      { field: 'PLAN_NWidthPlan', headerName: '轧制宽', width: 150 },
      { field: 'PLAN_NLlCleanLen', headerName: '轧制长', width: 150 },
      { field: 'PLAN_CSpec', headerName: '剪切计划规格', width: 150 },
      { field: 'COrderNo', headerName: '订单号', width: 150 },
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
