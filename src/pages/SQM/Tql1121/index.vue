<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTql1121（表判缺陷描述）：DDH.Winforms.SQM.Forms.Tmptq.FrmTql1121
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const txtKeyword = ref("");

const colDefs = ref<ColDef[]>([
  { headerCheckboxSelection: true, checkboxSelection: true, width: 50, pinned: "left" as const },
  { field: "CTypeId", headerName: "类型代码", width: 112 },
  { field: "CDescCode", headerName: "缺陷代码", width: 112 },
  { field: "CDescName", headerName: "缺陷名称", width: 112 },
  { field: "CDescDetail", headerName: "缺陷详情", width: 112 },
  { field: "Creator", headerName: "创建人", width: 112 },
  { field: "CreateTime", headerName: "创建时间", width: 112 },
  { field: "LastModifier", headerName: "最后修改人", width: 112 },
  { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },
]);

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function onQuery() { /* TODO: 接入业务逻辑 */ }
function onAdd() { /* TODO: 接入业务逻辑 */ }
function onEdit() { /* TODO: 接入业务逻辑 */ }
function onDel() { /* TODO: 接入业务逻辑 */ }
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-2">
    <!-- 顶部工具栏：关键字 + 查询/添加/编辑/删除 -->
    <div class="flex items-center gap-3 rounded bg-white p-3 shadow-sm dark:bg-gray-900">
      <label class="whitespace-nowrap">关键字</label>
      <InputText v-model="txtKeyword" class="w-60" :maxlength="100" />
      <Button label="查询" icon="pi pi-search" @click="onQuery" />
      <Button label="添加" severity="success" icon="pi pi-plus" @click="onAdd" />
      <Button label="编辑" severity="secondary" icon="pi pi-pencil" @click="onEdit" />
      <Button label="删除" severity="danger" icon="pi pi-trash" @click="onDel" />
    </div>

    <!-- 数据表格 -->
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
