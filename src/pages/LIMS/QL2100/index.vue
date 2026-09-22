<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmQL2100（炉次成分判定）：DDH.Winforms.LIMS.Forms.FrmQL2100
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CStove', headerName: '炉号', width: 120 },
      { field: 'CSgSign', headerName: '钢种', width: 120 },
      { field: 'CPStove', headerName: '母炉号', width: 120 },
      { field: 'CSgStd', headerName: '钢种标准', width: 120 },
      { field: 'CStNo', headerName: '炉号', width: 120 },
      { field: 'CJudgeRemark', headerName: '判定备注', width: 120 },
      { field: 'CAutoJudgeResult', headerName: '自动判定结果', width: 120 },
      { field: 'CMachine', headerName: '机台', width: 120 },
      { field: 'CAutoJudgeResultNk', headerName: '内控自动判定结果', width: 120 },
      { field: 'CJudgeResult', headerName: '最终判定结果', width: 120 },
      { field: 'CConfirmFlag', headerName: '炉次成分确认状态', width: 120 },
      { field: 'CJudgeUser', headerName: '判定人', width: 120 },
      { field: 'DJudgeTime', headerName: '判定时间', width: 120 },
      { field: 'CLineCode', headerName: '产线', width: 120 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },,
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
        <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
