<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTsMatrl（物料查询）：DDH.Winforms.SMP.Forms.FrmTsMatrl
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'CMatCode', headerName: '钢坯物料号', width: 149 },
      { field: 'CMatName', headerName: '钢坯物料名称', width: 149 },
      { field: 'CMatGroupCode', headerName: '物料组编码', width: 149 },
      { field: 'CMatGroupName', headerName: '物料组名称', width: 149 },
      { field: 'CSgCode', headerName: '钢种', width: 149 },
      { field: 'CSpec', headerName: '规格', width: 149 },
      { field: 'NThick', headerName: '厚度', width: 149 },
      { field: 'NWidth', headerName: '宽度', width: 149 },
      { field: 'NLen', headerName: '长度', width: 149 },
      { field: 'NWeight', headerName: '重量', width: 149 },
]));


function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function onbtnQuery() { /* TODO: 接入业务逻辑 */ }
function onbtnSync() { /* TODO: 接入业务逻辑 */ }

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
      <Button label="查询" severity="secondary" @click="onbtnQuery" />
      <Button label="同步物料" severity="success" @click="onbtnSync" />
    </div>
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
