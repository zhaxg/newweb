<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTqmtm08（基表挂靠标准配置）：DDH.Winforms.SQM.Forms.Tqmtm.FrmTqmtm08
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'CBasicTableCode', headerName: '基表代码', width: 66 },
      { field: 'CFacCode', headerName: '工厂', width: 120 },
      { field: 'CWorkTypeCode', headerName: '作业工序类型', width: 66 },
      { field: 'CBasicTableCName', headerName: '基表中文名称', width: 66 },
      { field: 'CBasicTableTypeCode', headerName: '基表类型', width: 66 },
      { field: 'CBasicTableEName', headerName: '基表英文名称', width: 66 },
      { field: 'ValidateFlag', headerName: 'ValidateFlag', width: 66 },
      { field: 'CProdClassCode', headerName: '产品大类代码', width: 66 },
      { field: 'CProdCode', headerName: '产品代码', width: 66 },
      { field: 'CSearchIdx', headerName: '检索索引', width: 66 },
]));


function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function onsimpleButton9() { /* TODO: 接入业务逻辑 */ }
function onsimpleButton11() { /* TODO: 接入业务逻辑 */ }
function onbtnQuery() { /* TODO: 接入业务逻辑 */ }
function onbtnAdd() { /* TODO: 接入业务逻辑 */ }
function onbtnDel() { /* TODO: 接入业务逻辑 */ }
function onbtnSave() { /* TODO: 接入业务逻辑 */ }

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
      <Button label="展开" severity="success" @click="onsimpleButton9" />
      <Button label="收缩" severity="success" @click="onsimpleButton11" />
      <Button label="查询" severity="secondary" @click="onbtnQuery" />
      <Button label="添加" severity="success" @click="onbtnAdd" />
      <Button label="删除" severity="danger" @click="onbtnDel" />
      <Button label="保存" severity="success" @click="onbtnSave" />
    </div>
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
