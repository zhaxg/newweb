<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTqmts0x（炼钢工艺卡）：DDH.Winforms.SQM.Forms.Tqmts.FrmTqmts0x
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const ItemForFactoryId = ref("");
const ItemForStNo = ref("");
const ItemForSgStd = ref("");
const ItemForSgSign = ref("");
const ItemForProdClass = ref("");
const colDefs = ref<ColDef[]>(([
      { field: 'Properties', headerName: '关闭窗口时自动保存界面布局', width: 150 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },,
]));

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function onbtnQuery() { /* TODO: 接入业务逻辑 */ }
function onbtnAdd() { /* TODO: 接入业务逻辑 */ }
function onbtnEdit() { /* TODO: 接入业务逻辑 */ }
function onbtnDel() { /* TODO: 接入业务逻辑 */ }
function onbtnPreview() { /* TODO: 接入业务逻辑 */ }
function onbtnCopy() { /* TODO: 接入业务逻辑 */ }
function onbtnEnable() { /* TODO: 接入业务逻辑 */ }
function onbtnDisable() { /* TODO: 接入业务逻辑 */ }
function onbtnCancel() { /* TODO: 接入业务逻辑 */ }
function onbtnOk() { /* TODO: 接入业务逻辑 */ }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-2">
    <div class="flex flex-wrap items-center gap-3 rounded bg-white p-3 shadow-sm dark:bg-gray-900">
      <label class="whitespace-nowrap">厂别区分</label>
      <InputText v-model="ItemForFactoryId" class="w-40" />
      <label class="whitespace-nowrap">炼钢工艺号</label>
      <InputText v-model="ItemForStNo" class="w-40" />
      <label class="whitespace-nowrap">执行标准</label>
      <InputText v-model="ItemForSgStd" class="w-40" />
      <label class="whitespace-nowrap">钢种牌号</label>
      <InputText v-model="ItemForSgSign" class="w-40" />
      <label class="whitespace-nowrap">产品大类</label>
      <InputText v-model="ItemForProdClass" class="w-40" />
      <Button label="查询" icon="pi pi-search" :loading="querying" @click="onQuery" />
    </div>
    <div class="flex items-center gap-2 rounded bg-white p-2 shadow-sm dark:bg-gray-900">
      <Button label="查询" severity="secondary" @click="onbtnQuery" />
      <Button label="添加" severity="success" @click="onbtnAdd" />
      <Button label="编辑" severity="success" @click="onbtnEdit" />
      <Button label="删除" severity="danger" @click="onbtnDel" />
      <Button label="预览" severity="success" @click="onbtnPreview" />
      <Button label="复制" severity="success" @click="onbtnCopy" />
      <Button label="生效" severity="success" @click="onbtnEnable" />
      <Button label="禁用" severity="success" @click="onbtnDisable" />
      <Button label="取消" severity="success" @click="onbtnCancel" />
      <Button label="选择" severity="success" @click="onbtnOk" />
    </div>
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
