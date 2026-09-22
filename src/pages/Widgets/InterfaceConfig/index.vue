<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 接口配置：画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const CEndpointName = ref("");
const colDefs = ref<ColDef[]>([
      { field: 'CEndpointCode', headerName: '端点代码', width: 120 },
      { field: 'CEndpointName', headerName: '端点名称', width: 150 },
      { field: 'CSourceSystem', headerName: '发方系统', width: 120 },
      { field: 'CTargetSystem', headerName: '收方系统', width: 120 },
      { field: 'CWsdlUrl', headerName: 'WSDL地址', width: 250 },
      { field: 'CEndpointUrl', headerName: '端点地址', width: 250 },
      { field: 'CUserName', headerName: '用户名', width: 100 },
      { field: 'InterfaceStatus', headerName: '接口状态', width: 100 },
]);

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function on查询() { /* TODO */ }
function on添加() { /* TODO */ }
function on删除() { /* TODO */ }
function on保存() { /* TODO */ }
function on刷新() { /* TODO */ }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-2">
    <div class="flex flex-wrap items-center gap-3 rounded bg-white p-3 shadow-sm dark:bg-gray-900">
      <label class="whitespace-nowrap">端点名称</label>
      <InputText v-model="CEndpointName" class="w-40" />
      <Button label="查询" icon="pi pi-search" :loading="querying" @click="onQuery" />
    </div>
    <div class="flex items-center gap-2 rounded bg-white p-2 shadow-sm dark:bg-gray-900">
      <Button label="查询" severity="secondary" @click="on查询" />
      <Button label="添加" severity="success" @click="on添加" />
      <Button label="删除" severity="danger" @click="on删除" />
      <Button label="保存" severity="success" @click="on保存" />
      <Button label="刷新" severity="secondary" @click="on刷新" />
    </div>
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
