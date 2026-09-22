<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR4800（理论成材率查询）：DDH.Winforms.SHR.Forms.FrmHR4800
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'Date', headerName: '日期', width: 150 },
      { field: 'Group', headerName: '班组', width: 150 },
      { field: 'NQua4', headerName: '支数', width: 150 },
      { field: 'NWgt4', headerName: '成品重量4', width: 150 },
      { field: 'NQuaCp4', headerName: '4切成品支数', width: 150 },
      { field: 'NWgtCp4', headerName: '成品重量', width: 150 },
      { field: 'NRate4', headerName: '理论成材率', width: 150 },
      { field: 'NQua2', headerName: '支数', width: 150 },
      { field: 'NWgt2', headerName: '重量', width: 150 },
      { field: 'NQuaCp2', headerName: '2切成品支数', width: 150 },
      { field: 'NWgtCp2', headerName: '成品重量', width: 150 },
      { field: 'NRate2', headerName: '两切', width: 150 },
      { field: 'NQua0', headerName: '支数', width: 150 },
      { field: 'NWgt0', headerName: '重量', width: 150 },
      { field: 'NQuaCp0', headerName: '毛边成品支数', width: 150 },
      { field: 'NWgtCp0', headerName: '成品重量', width: 150 },
      { field: 'NRate0', headerName: '毛边', width: 150 },
      { field: 'NQua', headerName: '支数', width: 150 },
      { field: 'NWgt', headerName: '重量', width: 150 },
      { field: 'NQuaCp', headerName: '成品支数', width: 150 },
      { field: 'NWgtCp', headerName: '成品重量', width: 150 },
      { field: 'NRate', headerName: '收得率', width: 150 },
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
