<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTI1240（出炉温度实绩）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1240
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 112 },
      { field: 'CShiftNo', headerName: '结果录入班次', width: 112 },
      { field: 'CShiftGroup', headerName: '班组', width: 112 },
      { field: 'CZpNo', headerName: '组批号', width: 112 },
      { field: 'CSlabNo', headerName: '板坯号', width: 112 },
      { field: 'NOrderThick', headerName: '订货厚', width: 112 },
      { field: 'NOrderWidth', headerName: '订货宽', width: 112 },
      { field: 'NOrderLen', headerName: '订货长mm', width: 112 },
      { field: 'NExitFurTempSj', headerName: '实绩出炉温度', width: 112 },
      { field: 'NPlanExitFurTemp', headerName: '目标出炉温度', width: 112 },
      { field: 'Tol', headerName: '公差数据', width: 112 },
      { field: 'DFurEndTime', headerName: '出炉时间', width: 112 },
      { field: 'DFurStartTime', headerName: '入炉时间', width: 112 },
      { field: 'NQuaAll', headerName: '轧制支数', width: 112 },
      { field: 'NQua1', headerName: '支数', width: 112 },
      { field: 'HitRate1', headerName: '命中率', width: 112 },
      { field: 'NQua2', headerName: '支数', width: 112 },
      { field: 'HitRate2', headerName: '命中率', width: 112 },
      { field: 'NQua3', headerName: '支数', width: 112 },
      { field: 'HitRate3', headerName: '命中率', width: 112 },
      { field: 'NQua4', headerName: '支数', width: 112 },
      { field: 'HitRate4', headerName: '命中率', width: 112 },
      { field: 'CDateTime', headerName: '日期', width: 112 },
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
