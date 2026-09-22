<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTsCust001（客户流向）：DDH.Winforms.SMP.Forms.FrmTsCust001
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const Root = ref("");
const ItemForCreateTime = ref("");
const ItemForLastModifier = ref("");
const ItemForLastModifyTime = ref("");
const ItemForCCustFlow = ref("");
const ItemForCCustEname = ref("");
const ItemForCInboundNo = ref("");
const ItemForCCustNo = ref("");
const colDefs = ref<ColDef[]>(([
      { field: 'CCustCode', headerName: '客户编号', width: 120 },
      { field: 'Selected', headerName: '选择', width: 112 },
      { field: 'CCustName', headerName: '客户名称', width: 120 },
      { field: 'CCustEname', headerName: '客户名称', width: 112 },
      { field: 'CCustNo', headerName: '客户编码', width: 112 },
      { field: 'CInboundNo', headerName: '入库单号', width: 112 },
      { field: 'CCustFlow', headerName: '客户流向', width: 112 },
      { field: 'CStatus', headerName: '状态', width: 112 },
      { field: 'CRemark', headerName: '备注', width: 112 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },,
]));

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function onbtnQuery() { /* TODO: 接入业务逻辑 */ }
function onbtnDel() { /* TODO: 接入业务逻辑 */ }
function onbtnAdd() { /* TODO: 接入业务逻辑 */ }
function onbtnSave() { /* TODO: 接入业务逻辑 */ }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-2">
    <div class="flex flex-wrap items-center gap-3 rounded bg-white p-3 shadow-sm dark:bg-gray-900">
      <label class="whitespace-nowrap">基本信息</label>
      <InputText v-model="Root" class="w-40" />
      <label class="whitespace-nowrap">创建时间</label>
      <InputText v-model="ItemForCreateTime" class="w-40" />
      <label class="whitespace-nowrap">最后修改人</label>
      <InputText v-model="ItemForLastModifier" class="w-40" />
      <label class="whitespace-nowrap">最后修改时间</label>
      <InputText v-model="ItemForLastModifyTime" class="w-40" />
      <label class="whitespace-nowrap">客户流向</label>
      <InputText v-model="ItemForCCustFlow" class="w-40" />
      <label class="whitespace-nowrap">客户名称</label>
      <InputText v-model="ItemForCCustEname" class="w-40" />
      <label class="whitespace-nowrap">入库标识</label>
      <InputText v-model="ItemForCInboundNo" class="w-40" />
      <label class="whitespace-nowrap">客户编码</label>
      <InputText v-model="ItemForCCustNo" class="w-40" />
      <Button label="查询" icon="pi pi-search" :loading="querying" @click="onQuery" />
    </div>
    <div class="flex items-center gap-2 rounded bg-white p-2 shadow-sm dark:bg-gray-900">
      <Button label="查询" severity="secondary" @click="onbtnQuery" />
      <Button label="删除" severity="danger" @click="onbtnDel" />
      <Button label="添加" severity="success" @click="onbtnAdd" />
      <Button label="保存" severity="success" @click="onbtnSave" />
    </div>
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
