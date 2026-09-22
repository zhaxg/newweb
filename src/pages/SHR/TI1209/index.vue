<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTI1209（热矫直信息）：DDH.Winforms.SHR.Forms.APILogViewer.FrmTI1209
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'SlabNo', headerName: '坯料号', width: 112 },
      { field: 'TotalPass', headerName: '总道次', width: 112 },
      { field: 'CurrPass', headerName: '当前道次', width: 112 },
      { field: 'EntryTime', headerName: '入炉时间', width: 112 },
      { field: 'EndTime', headerName: '结束时间', width: 112 },
      { field: 'EntryTemp', headerName: '入炉温度', width: 112 },
      { field: 'LevelerSpeed', headerName: '矫直速度', width: 112 },
      { field: 'BitSpeed', headerName: '位速度', width: 112 },
      { field: 'EntryGap', headerName: '入口间隙', width: 112 },
      { field: 'ExitGap', headerName: '出口间隙', width: 112 },
      { field: 'EntrySideRollGap', headerName: '入口侧辊间隙', width: 112 },
      { field: 'ExitSideRollGap', headerName: '出口侧辊间隙', width: 112 },
      { field: 'Tilt1', headerName: '倾斜1', width: 112 },
      { field: 'Tilt2', headerName: '倾斜2', width: 112 },
      { field: 'L2Force', headerName: '矫直力', width: 112 },
      { field: 'BendPosition', headerName: '弯曲位置', width: 112 },
      { field: 'TorqueMotor', headerName: '扭矩电机', width: 112 },
      { field: 'EmptyFlag', headerName: '空标志', width: 112 },
      { field: 'Spare', headerName: '备用', width: 112 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },
]));
function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">

      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onQuery"><IconSearch class="h-3.5 w-3.5" />查询</Button>
    </div>
        <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
