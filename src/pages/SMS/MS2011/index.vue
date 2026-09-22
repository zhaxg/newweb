<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMS2011（一炼钢铁水倒灌记录）：DDH.Winforms.SMS.Forms.FrmMS2011
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'CIntrusionSign', headerName: '倒罐标识', width: 120 },
      { field: 'CIntrusionType', headerName: '倒罐类型', width: 120 },
      { field: 'NIntrusionWgt', headerName: '倒罐重量吨', width: 83 },
      { field: 'CTsId', headerName: '铁水数据id', width: 104 },
      { field: 'CIronNo', headerName: '铁次号', width: 83 },
      { field: 'CPotNo', headerName: '罐号', width: 120 },
      { field: 'CCarNo', headerName: '车号', width: 120 },
      { field: 'DTeamDate', headerName: '虚拟或占用炉号班次日期', width: 72 },
      { field: 'CShift', headerName: '班次', width: 120 },
      { field: 'CTeam', headerName: '班组', width: 120 },
      { field: 'CBackup', headerName: '备注', width: 120 },
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
