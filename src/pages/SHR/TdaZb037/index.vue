<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTdaZb037（精益水能耗）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTdaZb037
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 112 },
      { field: 'SendTime', headerName: '数据发送时间', width: 112 },
      { field: 'Water1ac', headerName: '综合泵房补充深井水上日累计流量', width: 112 },
      { field: 'Water2ac', headerName: '综合泵房补充库水上日累计流量', width: 112 },
      { field: 'Water3ac', headerName: '综合泵房补充中水上日累计流量', width: 112 },
      { field: 'Water4ac', headerName: 'ACC泵房补充深井水上日累计流量', width: 112 },
      { field: 'Water5ac', headerName: 'ACC泵房补充库水上日累计流量', width: 112 },
      { field: 'Water6ac', headerName: 'ACC泵房补充中水上日累计流量', width: 112 },
      { field: 'ShiftNum', headerName: '班次', width: 112 },
      { field: 'TeamGroup', headerName: '班组', width: 112 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },,
]));
function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function onbtnQuery() { /* TODO: 接入业务逻辑 */ }

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
    </div>
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
