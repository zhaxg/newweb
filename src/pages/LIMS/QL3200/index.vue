<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmQL3200（检验结果审核）：DDH.Winforms.LIMS.Forms.FrmQL3200
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 60 },
      { field: 'CTestItemName', headerName: '试验项目名称', width: 60 },
      { field: 'CJudgeResult', headerName: '最终判定结果', width: 60 },
      { field: 'CCompleteFlag', headerName: '确认完成标记', width: 60 },
      { field: 'DCompleteTime', headerName: '确认完成时间', width: 60 },
      { field: 'CCompleteUser', headerName: '确认完成用户', width: 60 },
      { field: 'CCheckStatus', headerName: '审核状态', width: 120 },
      { field: 'CCheckUser', headerName: '审核人', width: 120 },
      { field: 'DCheckTime', headerName: '报出时间', width: 120 },
      { field: 'CReplaceSampleCode', headerName: '代样指示', width: 60 },
      { field: 'CSamplePosDesc', headerName: '取样位置', width: 60 },
      { field: 'CSampleLenDesc', headerName: '取样长度说明', width: 60 },
      { field: 'CWholeBacklogCode', headerName: '全程工序代码', width: 60 },
      { field: 'CTestItemTypeDesc', headerName: '试验项目种类描述', width: 60 },
      { field: 'CTestItemType', headerName: '试验项目种类', width: 60 },
      { field: 'CSampleLen', headerName: '取样长度', width: 60 },
      { field: 'CSamplePos', headerName: '取样位置代码', width: 60 },
      { field: 'CTestItem', headerName: '试验项目号', width: 67 },
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
