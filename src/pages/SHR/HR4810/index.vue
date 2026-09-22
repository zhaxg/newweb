<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR4810（实际成材率查询）：DDH.Winforms.SHR.Forms.FrmHR4810
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'Date', headerName: '日期', width: 150 },
      { field: 'Group', headerName: '班组', width: 150 },
      { field: 'CPieceSlabNo', headerName: '板坯号', width: 150 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 150 },
      { field: 'CSgCodeSlab', headerName: '钢坯钢种', width: 150 },
      { field: 'CSgCodeCp', headerName: '成品钢种', width: 150 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 150 },
      { field: 'CTol', headerName: '公差', width: 150 },
      { field: 'NThickFur', headerName: '照核厚度', width: 150 },
      { field: 'NWidthFur', headerName: '照核宽度', width: 150 },
      { field: 'NLenFur', headerName: '照核长度', width: 150 },
      { field: 'NWgtFur', headerName: '入炉量', width: 150 },
      { field: 'NThickJq', headerName: '剪切厚度', width: 150 },
      { field: 'NWidthJq', headerName: '剪切宽度', width: 150 },
      { field: 'NThick', headerName: '厚度', width: 150 },
      { field: 'NWidth', headerName: '宽度', width: 150 },
      { field: 'NThickSj', headerName: '成品厚度', width: 150 },
      { field: 'NWidthSj', headerName: '成品宽度', width: 150 },
      { field: 'NLenJq', headerName: '剪切长度', width: 150 },
      { field: 'NWgtCp', headerName: '成品重量', width: 150 },
      { field: 'NCclLl', headerName: '理论成材率', width: 150 },
      { field: 'NWgtLl', headerName: '理论子板重（含板边）', width: 150 },
      { field: 'NWgtZjb', headerName: '质计部重量', width: 150 },
      { field: 'NOrderThick', headerName: '订货厚', width: 112 },
      { field: 'NQuaSjSlab2', headerName: '钢坯支数', width: 112 },
      { field: 'NQuaSjSlabRate2', headerName: '钢坯支数比例', width: 112 },
      { field: 'NQuaSjCp2', headerName: '成品支数', width: 112 },
      { field: 'NFurWgtSj2', headerName: '入炉坯重', width: 112 },
      { field: 'NWgtLl2', headerName: '理论重量', width: 112 },
      { field: 'NWgtCpSj2', headerName: '成品重量', width: 112 },
      { field: 'NWgtZjb2', headerName: '质计部重量', width: 150 },
      { field: 'NRateLl2', headerName: '理论成材率', width: 112 },
      { field: 'NRateSj2', headerName: '实际成材率', width: 112 },
      { field: 'NRateZjb2', headerName: '质计部成材率', width: 150 },
      { field: 'NQuaSjSlab4', headerName: '钢坯支数', width: 112 },
      { field: 'NQuaSjSlabRate4', headerName: '钢坯支数比例', width: 112 },
      { field: 'NQuaSjCp4', headerName: '成品支数', width: 112 },
      { field: 'NFurWgtSj4', headerName: '入炉坯重', width: 112 },
      { field: 'NWgtLl4', headerName: '理论重量', width: 112 },
      { field: 'NWgtCpSj4', headerName: '成品重量', width: 112 },
      { field: 'NWgtZjb4', headerName: '质计部重量', width: 150 },
      { field: 'NRateLl4', headerName: '理论成材率', width: 112 },
      { field: 'NRateSj4', headerName: '实际成材率', width: 112 },
      { field: 'NRateZjb4', headerName: '质计部成材率', width: 150 },
      { field: 'NQuaSjSlab0', headerName: '钢坯支数', width: 112 },
      { field: 'NQuaSjSlabRate0', headerName: '钢坯支数比例', width: 112 },
      { field: 'NQuaSjCp0', headerName: '成品支数', width: 112 },
      { field: 'NFurWgtSj0', headerName: '入炉坯重', width: 112 },
      { field: 'NWgtLl0', headerName: '理论重量', width: 112 },
      { field: 'NWgtCpSj0', headerName: '成品重量', width: 112 },
      { field: 'NWgtZjb0', headerName: '质计部重量', width: 150 },
      { field: 'NRateLl0', headerName: '理论成材率', width: 112 },
      { field: 'NRateSj0', headerName: '实际成材率', width: 112 },
      { field: 'NRateZjb0', headerName: '质计部成材率', width: 150 },
      { field: 'NQuaSlab', headerName: '钢坯总支数', width: 112 },
      { field: 'NQuaCp', headerName: '成品支数', width: 112 },
      { field: 'NFurWgtSj', headerName: '入炉坯重', width: 112 },
      { field: 'NWgtCpSj', headerName: '成品重量', width: 112 },
      { field: 'NRateLl', headerName: '理论成材率', width: 112 },
      { field: 'NRateSj', headerName: '实际成材率', width: 112 },
      { field: 'NRateZjb', headerName: '质计部成材率', width: 150 },
      { field: 'CSgCode', headerName: '钢种', width: 112 },
      { field: 'DDateTime', headerName: '日期', width: 112 },
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
