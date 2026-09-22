<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTql1070（精整库探伤判定）：DDH.Winforms.SQM.Forms.Tqmtq.FrmTql1070
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 112 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 112 },
      { field: 'CStove', headerName: '炉号', width: 112 },
      { field: 'CIsDisable', headerName: '作废标记', width: 112 },
      { field: 'CLineCode', headerName: '产线', width: 112 },
      { field: 'CStoreCode', headerName: '库区号', width: 112 },
      { field: 'NProType', headerName: '库存类型', width: 112 },
      { field: 'CSgCode', headerName: '钢种', width: 112 },
      { field: 'CSgStd', headerName: '钢种标准', width: 112 },
      { field: 'CSpec', headerName: '规格', width: 112 },
      { field: 'CSurfaceUser', headerName: '表面判定人', width: 112 },
      { field: 'DSurfaceTime', headerName: '表面判定时间', width: 112 },
      { field: 'CDetectResultCode', headerName: '探伤判定结果', width: 112 },
      { field: 'CDetectDefectLevel', headerName: '探伤等级', width: 112 },
      { field: 'CDefectDefectCode', headerName: '探伤判定缺陷代码', width: 112 },
      { field: 'CDefectDefectMark', headerName: '探伤判定缺陷描述', width: 112 },
      { field: 'CShiftNo', headerName: '结果录入班次', width: 112 },
      { field: 'CGroupNo', headerName: '结果录入班组', width: 112 },
      { field: 'CFaceHandleAdvice', headerName: '处置措施', width: 112 },
      { field: 'NThick', headerName: '厚度', width: 112 },
      { field: 'NWth', headerName: '宽度', width: 112 },
      { field: 'NLen', headerName: '长度', width: 112 },
      { field: 'NWgt', headerName: '重量', width: 112 },
      { field: 'NCalWgt', headerName: '理重', width: 112 },
      { field: 'NNum', headerName: '件数', width: 112 },
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
