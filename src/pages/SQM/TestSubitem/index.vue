<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTestSubitem（试验子项目维护）：DDH.Winforms.SQM.Forms.Basic.FrmTestSubitem
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'TestItemType', headerName: '试验项目种类', width: 120 },
      { field: 'TestItemCode', headerName: '试验项目代码', width: 120 },
      { field: 'TestSubItemCode', headerName: '试验子项目代码', width: 120 },
      { field: 'TestSubItemName', headerName: '试验子项目名称', width: 120 },
      { field: 'DlDxFlag', headerName: '定量定性标识', width: 120 },
      { field: 'Unit', headerName: '单位', width: 120 },
      { field: 'Other1', headerName: '试验子项目描述', width: 120 },
      { field: 'Other2', headerName: '值来源', width: 120 },
      { field: 'Other3', headerName: '显示名称来源', width: 120 },
      { field: 'Other4', headerName: '试验子项目英文名称', width: 120 },
      { field: 'Other5', headerName: '精度', width: 120 },
      { field: 'Other6', headerName: '预留6', width: 120 },
      { field: 'Other7', headerName: '预留7', width: 120 },
      { field: 'Other8', headerName: '预留8', width: 120 },
      { field: 'Seq', headerName: '录入排序', width: 120 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },,
]));
function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function onbtnQuery() { /* TODO: 接入业务逻辑 */ }
function onbtnAdd() { /* TODO: 接入业务逻辑 */ }
function onbtnEdit() { /* TODO: 接入业务逻辑 */ }
function onbtnDelete() { /* TODO: 接入业务逻辑 */ }

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
      <Button label="删除" severity="danger" @click="onbtnDelete" />
    </div>
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
