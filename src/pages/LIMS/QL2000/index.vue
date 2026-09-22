<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmQL2000（炉次成分录入）：DDH.Winforms.LIMS.Forms.FrmQL2000
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'CPoNo', headerName: '制造命令号', width: 120 },
      { field: 'CStove', headerName: '炉号', width: 120 },
      { field: 'CPStove', headerName: '母炉号', width: 120 },
      { field: 'CSgSign', headerName: '钢种', width: 120 },
      { field: 'CSgStd', headerName: '钢种标准', width: 120 },
      { field: 'CStNo', headerName: '炉号', width: 120 },
      { field: 'COrderNo', headerName: '订单号', width: 120 },
      { field: 'COrderTsyq', headerName: '合同特殊要求', width: 120 },
      { field: 'CLineCode', headerName: '产线', width: 120 },
      { field: 'CMachine', headerName: '机台', width: 120 },
      { field: 'CRouteCode', headerName: '精炼路径', width: 120 },
      { field: 'NThick', headerName: '厚度', width: 120 },
      { field: 'NWth', headerName: '宽度', width: 120 },
      { field: 'NLen', headerName: '长度', width: 120 },
      { field: 'NPlanWgt', headerName: '计划出钢重量', width: 120 },
      { field: 'CSpec', headerName: '规格', width: 120 },
      { field: 'CIngotCode', headerName: '锭坯型', width: 120 },
      { field: 'RecheckFlag', headerName: '复验标记', width: 120 },
      { field: 'CJudgeResult', headerName: '最终判定结果', width: 120 },
      { field: 'CJudgeRemark', headerName: '判定备注', width: 120 },
      { field: 'CJudgeUser', headerName: '判定人', width: 120 },
      { field: 'DJudgeTime', headerName: '判定时间', width: 120 },
      { field: 'DProdTime', headerName: '生产时间', width: 120 },
      { field: 'CConfirmUser', headerName: '成分确认人', width: 120 },
      { field: 'DConfirmTime', headerName: '成分确认时间', width: 120 },
]));

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }



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

    </div>
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
