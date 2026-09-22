<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 接口日志：画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const InterfaceName = ref("");
const Status = ref("");
const colDefs = ref<ColDef[]>([
      { field: 'InterfaceName', headerName: '接口名称', width: 180 },
      { field: 'Status', headerName: '请求状态', width: 100 },
      { field: 'ExcuteTime', headerName: '请求时间', width: 180 },
      { field: 'SourceSystem', headerName: '发方系统', width: 120 },
      { field: 'TargetSystem', headerName: '收方系统', width: 120 },
      { field: 'RequestId', headerName: '请求ID', width: 200 },
      { field: 'MessageId', headerName: '消息ID', width: 200 },
]);

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function on查询() { /* TODO */ }
function on重试接口() { /* TODO */ }
function on配置() { /* TODO */ }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-2">
    <div class="flex flex-wrap items-center gap-3 rounded bg-white p-3 shadow-sm dark:bg-gray-900">
      <label class="whitespace-nowrap">接口名称</label>
      <InputText v-model="InterfaceName" class="w-40" />
      <label class="whitespace-nowrap">请求状态</label>
      <InputText v-model="Status" class="w-40" />
      <Button label="查询" icon="pi pi-search" :loading="querying" @click="onQuery" />
    </div>
    <div class="flex items-center gap-2 rounded bg-white p-2 shadow-sm dark:bg-gray-900">
      <Button label="查询" severity="secondary" @click="on查询" />
      <Button label="重试接口" severity="success" @click="on重试接口" />
      <Button label="配置" severity="secondary" @click="on配置" />
    </div>
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
