<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmYl01（炼钢工艺要点）：DDH.Winforms.SQM.Forms.Tqmyl.FrmYl01
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'CCode', headerName: '编码', width: 120 },
      { field: 'CName', headerName: '名称', width: 120 },
      { field: 'SgSignDesc', headerName: '钢种标准', width: 120 },
      { field: 'CPlanRouteDesc', headerName: '计划路线描述', width: 120 },
      { field: 'NValidFlag', headerName: '有效标志', width: 120 },
      { field: 'CLineCode', headerName: '产线', width: 120 },
      { field: 'CStNo', headerName: '炉号', width: 120 },
      { field: 'Selected', headerName: '选择', width: 120 },
]));

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function onbtnQuery() { /* TODO: 接入业务逻辑 */ }
function onbtnAdd() { /* TODO: 接入业务逻辑 */ }
function onbtnEdit() { /* TODO: 接入业务逻辑 */ }
function onbtnCopy() { /* TODO: 接入业务逻辑 */ }
function onbtnEnable() { /* TODO: 接入业务逻辑 */ }
function onbtnDisable() { /* TODO: 接入业务逻辑 */ }
function onsimpleButton2() { /* TODO: 接入业务逻辑 */ }
function onsimpleButton3() { /* TODO: 接入业务逻辑 */ }

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
      <Button label="添加" severity="success" @click="onbtnAdd" />
      <Button label="编辑" severity="success" @click="onbtnEdit" />
      <Button label="复制" severity="success" @click="onbtnCopy" />
      <Button label="生效" severity="success" @click="onbtnEnable" />
      <Button label="禁用" severity="success" @click="onbtnDisable" />
      <Button label="指标属性配置" severity="success" @click="onsimpleButton2" />
      <Button label="指标报警配置" severity="success" @click="onsimpleButton3" />
    </div>
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
