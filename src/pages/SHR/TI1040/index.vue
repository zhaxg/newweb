<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTI1040（双边剪剪切实绩）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1040
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 112 },
      { field: 'CCustName', headerName: '客户名称', width: 112 },
      { field: 'CCon', headerName: '合同号', width: 112 },
      { field: 'CSonNo', headerName: '子板号', width: 112 },
      { field: 'CSgCode', headerName: '钢种', width: 112 },
      { field: 'DSonThick', headerName: '子板厚mm', width: 112 },
      { field: 'DSonWidth', headerName: '子板宽mm', width: 112 },
      { field: 'DSonLen', headerName: '子板长mm', width: 112 },
      { field: 'DSonWgt', headerName: '子板理重T', width: 112 },
      { field: 'NSlabThick', headerName: '坯料厚度', width: 112 },
      { field: 'NSlabWidth', headerName: '坯料宽度', width: 112 },
      { field: 'NSlabLen', headerName: '钢坯长', width: 112 },
      { field: 'NSlabWgt', headerName: '坯料重量', width: 112 },
      { field: 'NLlWgt', headerName: '理论重量', width: 112 },
      { field: 'CCrewCode', headerName: '机组代码', width: 112 },
      { field: 'DDssTime', headerName: '剪切时间', width: 112 },
      { field: 'DProductTime', headerName: '生产时间', width: 112 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 112 },
      { field: 'CInSlabNo', headerName: '入口材料号', width: 112 },
      { field: 'CInSlabWgt', headerName: '入口材料重', width: 112 },
      { field: 'DDssTemp', headerName: '剪切温度', width: 112 },
      { field: 'CCollectType', headerName: '收集方式', width: 112 },
      { field: 'CSlabNo', headerName: '板坯号', width: 112 },
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
