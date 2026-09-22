<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmQL2210（炉次过程成分查询）：DDH.Winforms.LIMS.Forms.FrmQL2210
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CStove', headerName: '炉号', width: 120 },
      { field: 'CSampleNo', headerName: '试样号', width: 120 },
      { field: 'CGw', headerName: '工位', width: 120 },
      { field: 'CSgSign', headerName: '钢种', width: 120 },
      { field: 'CLineCode', headerName: '产线', width: 120 },
      { field: 'CFinalFlag', headerName: '是否最终样', width: 120 },
      { field: 'CSpec', headerName: '规格', width: 120 },
      { field: 'NCount', headerName: '支数', width: 120 },
      { field: 'NWeight', headerName: '重量', width: 120 },
      { field: 'CJudgeRemark', headerName: '判定备注', width: 120 },
      { field: 'DLastTime', headerName: '判定时间', width: 120 },
      { field: 'CAutoJudgeResult', headerName: '自动判定结果', width: 120 },
      { field: 'DTestTime', headerName: '结果录入时间', width: 120 },
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
