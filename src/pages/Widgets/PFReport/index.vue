<script setup lang="ts">
/** 对应 FrmPFReport（指标报表管理）：Hmx.WinForms.Widgets.CalculateItemForm.FrmPFReport
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

const CCode = ref("");
const CName = ref("");
const colDefs = ref<ColDef[]>([
      { field: 'CCode', headerName: '报表代码', width: 120 },
      { field: 'CName', headerName: '报表名称', width: 180 },
      { field: 'NTimeRange', headerName: '时间范围', width: 100 },
      { field: 'NShiftGroup', headerName: '班次组', width: 100 },
      { field: 'NStyle', headerName: '样式', width: 100 },
      { field: 'CDesc', headerName: '描述', width: 200 },
]);

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function onquery() { /* TODO */ }
function onaddReport() { /* TODO */ }
function oneditReport() { /* TODO */ }
function onconfigReportItems() { /* TODO */ }
function ondeleteReport() { /* TODO */ }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-2">
    <div class="flex flex-wrap items-center gap-3 rounded bg-white p-3 shadow-sm dark:bg-gray-900">
      <label class="whitespace-nowrap">报表代码</label>
      <InputText v-model="CCode" class="w-40" />
      <label class="whitespace-nowrap">报表名称</label>
      <InputText v-model="CName" class="w-40" />
      <Button label="查询" icon="pi pi-search" :loading="querying" @click="onQuery" />
    </div>
    <div class="flex items-center gap-2 rounded bg-white p-2 shadow-sm dark:bg-gray-900">
      <Button label="查询" severity="secondary" @click="onquery" />
      <Button label="添加报表" severity="success" @click="onaddReport" />
      <Button label="编辑报表" severity="secondary" @click="oneditReport" />
      <Button label="配置报表项目" severity="success" @click="onconfigReportItems" />
      <Button label="删除报表" severity="danger" @click="ondeleteReport" />
    </div>
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
