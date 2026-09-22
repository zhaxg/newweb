<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTI1210（厚度负差实绩）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1210
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 112 },
      { field: 'CAuthor', headerName: '责任者', width: 112 },
      { field: 'CFmAuthorA', headerName: '精轧责任者A', width: 112 },
      { field: 'NQua', headerName: '支数', width: 112 },
      { field: 'AvgHitRate', headerName: '平均命中率', width: 112 },
      { field: 'CShiftNo', headerName: '结果录入班次', width: 112 },
      { field: 'CShiftGroup', headerName: '班组', width: 112 },
      { field: 'NOrderThickAvg', headerName: '合同平均厚度', width: 112 },
      { field: 'CBatchNo', headerName: '批号', width: 112 },
      { field: 'NThickAvg', headerName: '平均厚度', width: 112 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 112 },
      { field: 'CSgCode', headerName: '钢种', width: 112 },
      { field: 'NThickSj', headerName: '成品厚度', width: 112 },
      { field: 'HitRate', headerName: '命中率', width: 112 },
      { field: 'NThick', headerName: '厚度', width: 112 },
      { field: 'SuperMax', headerName: '超上限比例', width: 112 },
      { field: 'NWidth', headerName: '宽度', width: 112 },
      { field: 'SuperMin', headerName: '超下限比例', width: 112 },
      { field: 'NLen', headerName: '长度', width: 112 },
      { field: 'NPlanThickMin', headerName: '目标厚度下限', width: 112 },
      { field: 'NPlanThickMax', headerName: '目标厚度上限', width: 112 },
      { field: 'NThickHitrate', headerName: '厚度命中率', width: 112 },
      { field: 'NThickTol', headerName: '厚度公差', width: 112 },
      { field: 'NThicjTolSwitch', headerName: '厚度是否超内控公差范围', width: 112 },
      { field: 'CTol', headerName: '公差', width: 112 },
      { field: 'DRollingTimeStart', headerName: '轧制开始时间', width: 112 },
      { field: 'DRollingTimeEnd', headerName: '轧制结束时间', width: 112 },
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
