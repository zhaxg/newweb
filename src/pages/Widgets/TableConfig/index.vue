<script setup lang="ts">
/** 对应 FrmTableConfig（配置表管理）：Hmx.WinForms.Widgets.TableConfig.FrmTableConfig
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

const CTbCode = ref("");
const CTbName = ref("");
const colDefs = ref<ColDef[]>([
      { field: 'CTbCode', headerName: '表编码', width: 150 },
      { field: 'CTbName', headerName: '表名称', width: 200 },
      { field: 'CLoaderFullName', headerName: '加载器', width: 250 },
      { field: 'CRemark', headerName: '备注', width: 150 },
]);

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function onquery() { /* TODO */ }
function onaddBaseTable() { /* TODO */ }
function ondeleteBaseTable() { /* TODO */ }
function onsaveBaseTable() { /* TODO */ }
function onhandler32() { /* TODO */ }
function ondelete() { /* TODO */ }
function onsave() { /* TODO */ }
function onapplyChange() { /* TODO */ }
function onpreviewConfig() { /* TODO */ }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-2">
    <div class="flex flex-wrap items-center gap-3 rounded bg-white p-3 shadow-sm dark:bg-gray-900">
      <label class="whitespace-nowrap">表编码</label>
      <InputText v-model="CTbCode" class="w-40" />
      <label class="whitespace-nowrap">表名称</label>
      <InputText v-model="CTbName" class="w-40" />
      <Button label="查询" icon="pi pi-search" :loading="querying" @click="onQuery" />
    </div>
    <div class="flex items-center gap-2 rounded bg-white p-2 shadow-sm dark:bg-gray-900">
      <Button label="查询" severity="secondary" @click="onquery" />
      <Button label="添加基表" severity="success" @click="onaddBaseTable" />
      <Button label="删除基表" severity="danger" @click="ondeleteBaseTable" />
      <Button label="保存基表" severity="success" @click="onsaveBaseTable" />
      <Button label="添加属性" severity="success" @click="onhandler37" />
      <Button label="删除" severity="danger" @click="ondelete" />
      <Button label="保存" severity="success" @click="onsave" />
      <Button label="修改生效" severity="secondary" @click="onapplyChange" />
      <Button label="预览配置表" severity="secondary" @click="onpreviewConfig" />
    </div>
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
