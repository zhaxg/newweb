<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMS1030（炼钢总厂钢包管理）：DDH.Winforms.SMS.Forms.FrmMS1030
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'CPotNo', headerName: '罐号', width: 120 },
      { field: 'CPotType', headerName: '包况', width: 120 },
      { field: 'CBofNo', headerName: '炉座号', width: 120 },
      { field: 'NCapacity', headerName: '容量', width: 120 },
      { field: 'IUsetimes', headerName: '包龄', width: 120 },
      { field: 'IFrcstTimes', headerName: '预警包龄', width: 120 },
      { field: 'IMaxTimes', headerName: '最大包龄', width: 120 },
      { field: 'NTqxTimes', headerName: '透气芯次数', width: 120 },
      { field: 'CPackState', headerName: '设备状态', width: 120 },
      { field: 'TBakeBeg', headerName: '烘烤开始时间', width: 95 },
      { field: 'TBakeEnd', headerName: '烘烤结束时间', width: 95 },
      { field: 'CBakeBackup', headerName: '烘烤备注', width: 120 },
      { field: 'NServiceTime', headerName: '维修次数', width: 120 },
      { field: 'NCgkA', headerName: 'A出钢口使用次数', width: 115 },
      { field: 'NCgkB', headerName: 'B出钢口使用次数', width: 114 },
      { field: 'NHuaban1', headerName: '1滑板使用次数', width: 102 },
      { field: 'NHuaban2', headerName: '2滑板使用次数', width: 102 },
      { field: 'CManufacturer', headerName: '生产厂家', width: 120 },
      { field: 'CBackup', headerName: '备注', width: 120 },
      { field: 'CEnable', headerName: '启用', width: 120 },
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
