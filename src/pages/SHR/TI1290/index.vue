<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTI1290（热装率）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1290
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 112 },
      { field: 'COrderNo', headerName: '订单号', width: 112 },
      { field: 'CBatchNo', headerName: '批号', width: 112 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 112 },
      { field: 'CPlateNo', headerName: '大板号', width: 112 },
      { field: 'CSgCode', headerName: '钢种', width: 112 },
      { field: 'NThick', headerName: '厚度', width: 112 },
      { field: 'NWidth', headerName: '宽度', width: 112 },
      { field: 'NLen', headerName: '长度', width: 112 },
      { field: 'NLenMin', headerName: '最小长度', width: 112 },
      { field: 'NLenMax', headerName: '最大长度', width: 112 },
      { field: 'CLengthType', headerName: '长度类型', width: 112 },
      { field: 'NInFurTemp', headerName: '入炉温度', width: 112 },
      { field: 'CTol', headerName: '公差', width: 112 },
      { field: 'CInFurShiftGroup', headerName: '入炉班组', width: 112 },
      { field: 'CInFurShiftNo', headerName: '入炉班次', width: 112 },
      { field: 'DFurTime', headerName: '入炉时间', width: 112 },
      { field: 'DExitfurTime', headerName: '出炉时间', width: 112 },
      { field: 'CDateTime', headerName: '日期', width: 112 },
      { field: 'NQuaAll', headerName: '轧制支数', width: 112 },
      { field: 'NQua1', headerName: '支数', width: 112 },
      { field: 'HitRate1', headerName: '命中率', width: 112 },
      { field: 'NQua2', headerName: '支数', width: 112 },
      { field: 'HitRate2', headerName: '命中率', width: 112 },
      { field: 'NQua3', headerName: '支数', width: 112 },
      { field: 'HitRate3', headerName: '命中率', width: 112 },
      { field: 'NQua4', headerName: '支数', width: 112 },
      { field: 'HitRate4', headerName: '命中率', width: 112 },
      { field: 'NQua5', headerName: '支数', width: 112 },
      { field: 'HitRate5', headerName: '命中率', width: 112 },
      { field: 'NQua6', headerName: '支数', width: 112 },
      { field: 'HitRate6', headerName: '命中率', width: 112 },
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
