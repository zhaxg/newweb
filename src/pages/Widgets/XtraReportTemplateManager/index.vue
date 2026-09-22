<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 报表打印模板：画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>([
      { field: 'NTemplateType', headerName: '模板类型', width: 120 },
      { field: 'CDataType', headerName: '数据类型', width: 120 },
      { field: 'CComments', headerName: '说明', width: 200 },
      { field: 'Creator', headerName: '创建人', width: 100 },
      { field: 'CreateTime', headerName: '创建时间', width: 150 },
      { field: 'LastModifier', headerName: '更新人', width: 100 },
      { field: 'LastModifyTime', headerName: '更新时间', width: 150 },
]);

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function on查询() { /* TODO */ }
function on添加() { /* TODO */ }
function on编辑() { /* TODO */ }
function on删除() { /* TODO */ }
function on保存() { /* TODO */ }
function on打印模拟数据() { /* TODO */ }

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
      <Button label="查询" severity="secondary" @click="on查询" />
      <Button label="添加" severity="success" @click="on添加" />
      <Button label="编辑" severity="secondary" @click="on编辑" />
      <Button label="删除" severity="danger" @click="on删除" />
      <Button label="保存" severity="success" @click="on保存" />
      <Button label="打印模拟数据" severity="secondary" @click="on打印模拟数据" />
    </div>
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
