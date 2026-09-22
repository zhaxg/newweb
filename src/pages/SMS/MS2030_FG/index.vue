<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMS2030_FG（炼钢总厂废钢配料）：DDH.Winforms.SMS.Forms.FrmMS2030_FG
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CContainerNo', headerName: '斗号', width: 120 },
      { field: 'NWgt', headerName: '重量', width: 120 },
      { field: 'CMtrlDesc', headerName: '物料描述', width: 120 },
      { field: 'CUnit', headerName: '单片钢坯', width: 120 },
      { field: 'CUseFactory', headerName: '配料使用工厂', width: 95 },
      { field: 'CUsedStoveNo', headerName: '使用炉号', width: 120 },
      { field: 'CUsedPono', headerName: '使用炉次制造命令号', width: 131 },
      { field: 'DTeamDate', headerName: '虚拟或占用炉号班次日期', width: 120 },
      { field: 'CShift', headerName: '班次', width: 120 },
      { field: 'CTeam', headerName: '班组', width: 120 },
      { field: 'CState', headerName: '铁水状态', width: 120 },
      { field: 'NWgtUse', headerName: '炉次耗用重量', width: 95 },
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
