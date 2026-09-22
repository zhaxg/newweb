<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTI1060（轮廓仪数据查询）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1060
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 84 },
      { field: 'NQua', headerName: '支数', width: 112 },
      { field: 'DDateTime', headerName: '日期', width: 112 },
      { field: 'PlateNo', headerName: '板号', width: 84 },
      { field: 'CBatchNo', headerName: '批号', width: 84 },
      { field: 'NSickleBend', headerName: '镰刀弯量', width: 112 },
      { field: 'PlateLen', headerName: '钢板长度', width: 84 },
      { field: 'NSickleBendRate', headerName: '镰刀弯比例', width: 112 },
      { field: 'PlateHead', headerName: '板头', width: 84 },
      { field: 'PlateLast', headerName: '板尾', width: 84 },
      { field: 'CYcCode', headerName: '异常代码', width: 84 },
      { field: 'NOpSickleBend', headerName: 'OP侧镰刀弯量', width: 84 },
      { field: 'NDrSickleBend', headerName: 'DR侧镰刀弯量', width: 84 },
      { field: 'CIfSickleBend', headerName: '是否镰刀弯', width: 84 },
      { field: 'NOpSicklePosition', headerName: 'OP侧镰刀弯量坐标', width: 84 },
      { field: 'NDrSicklePosition', headerName: 'DR侧镰刀弯量坐标', width: 84 },
      { field: 'DInsertTime', headerName: '插入时间', width: 84 },
      { field: 'CShiftNo', headerName: '结果录入班次', width: 85 },
      { field: 'CShiftGroup', headerName: '班组', width: 97 },
      { field: 'CRmAuthorA', headerName: '粗轧责任者A', width: 84 },
      { field: 'CRmAuthorNameA', headerName: '粗轧责任者A姓名', width: 81 },
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
