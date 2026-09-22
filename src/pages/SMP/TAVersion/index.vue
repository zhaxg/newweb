<script setup lang="ts">
/** 对应 FrmTAVersion（移动端管理）：DDH.Winforms.SMP.Forms.FrmTAVersion
 *  画面迁移，逻辑不迁移到 */

import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const CName = ref("");
const colDefs = ref<ColDef[]>([
      { field: 'NCode', headerName: '版本号', width: 120 },
      { field: 'CName', headerName: '名称', width: 180 },
      { field: 'CNote', headerName: '说明', width: 250 },
      { field: 'NType', headerName: '类型', width: 100 },
]);

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function onquery() { /* TODO */ }
function onadd() { /* TODO */ }
function onmodify() { /* TODO */ }
function ondelete() { /* TODO */ }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-2">
    <div class="flex flex-wrap items-center gap-3 rounded bg-white p-3 shadow-sm dark:bg-gray-900">
      <label class="whitespace-nowrap">名称</label>
      <InputText v-model="CName" class="w-40" />
      <Button label="查询" icon="pi pi-search" :loading="querying" @click="onQuery" />
    </div>
    <div class="flex items-center gap-2 rounded bg-white p-2 shadow-sm dark:bg-gray-900">
      <Button label="查询" severity="secondary" @click="onquery" />
      <Button label="添加" severity="success" @click="onadd" />
      <Button label="修改" severity="secondary" @click="onmodify" />
      <Button label="删除" severity="danger" @click="ondelete" />
    </div>
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
