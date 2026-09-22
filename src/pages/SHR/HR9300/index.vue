<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR9300（工艺判定报表）：DDH.Winforms.SHR.Forms.FrmHR9300
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CIsQy', headerName: '原取样板标记', width: 150 },
      { field: 'CBatchOrder', headerName: '组批号', width: 172 },
      { field: 'CPieceNoSlab', headerName: '板坯号', width: 112 },
      { field: 'CSgCode', headerName: '钢种', width: 100 },
      { field: 'DProductTime', headerName: '生产时间', width: 150 },
      { field: 'ShiftGroup', headerName: '班次组', width: 100 },
      { field: 'Author', headerName: '作者', width: 100 },
      { field: 'CFmAuthorA', headerName: '精轧责任者A', width: 112 },
      { field: 'CFmAuthorB', headerName: '精轧责任者B', width: 112 },
      { field: 'CRmAuthorA', headerName: '粗轧责任者A', width: 112 },
      { field: 'CRmAuthorB', headerName: '粗轧责任者B', width: 112 },
      { field: 'CAuthorACC', headerName: 'ACC责任者', width: 112 },
      { field: 'CSpecialMarkGy', headerName: '特殊标记工艺', width: 150 },
      { field: 'RmPass', headerName: '粗轧道次', width: 176 },
      { field: 'FmPass', headerName: '精轧道次', width: 176 },
      { field: 'FmEntThick', headerName: '精轧入口厚度', width: 200 },
      { field: 'CYxl', headerName: '压下率', width: 150 },
      { field: 'NThick', headerName: '厚度', width: 100 },
      { field: 'NWidth', headerName: '宽度', width: 100 },
      { field: 'NLen', headerName: '长度', width: 100 },
      { field: 'RmEntTempTar', headerName: '目标', width: 100 },
      { field: 'RmEntTempAvg', headerName: '实测', width: 100 },
      { field: 'RmEntTempPd', headerName: '判定', width: 100 },
      { field: 'FmEntTempTar', headerName: '目标', width: 100 },
      { field: 'FmEntTempAvg', headerName: '实测', width: 100 },
      { field: 'FmEntTempPd', headerName: '判定', width: 100 },
      { field: 'FmExitTempTar', headerName: '目标', width: 100 },
      { field: 'FmExitTempAvg', headerName: '实测', width: 100 },
      { field: 'FmExitTempPd', headerName: '判定', width: 100 },
      { field: 'TargetEntryTemp', headerName: '目标开冷温度', width: 112 },
      { field: 'EntryAveTemp', headerName: '实测', width: 100 },
      { field: 'EntryAveTempPd', headerName: '判定', width: 100 },
      { field: 'TargetFinishTemp', headerName: '目标', width: 100 },
      { field: 'FinishAveTemp', headerName: '实测', width: 100 },
      { field: 'FinishAveTempPd', headerName: '判定', width: 100 },
      { field: 'InFurTimePlan', headerName: '目标', width: 112 },
      { field: 'InFurTime', headerName: '实测', width: 112 },
      { field: 'InFurTimePd', headerName: '判定', width: 112 },
      { field: 'OutFurTempPlan', headerName: '目标', width: 112 },
      { field: 'OutFurTemp', headerName: '实测', width: 112 },
      { field: 'OutFurTempPd', headerName: '判定', width: 112 },
      { field: 'NQua', headerName: '支数', width: 112 },
      { field: 'NZcQua', headerName: '块数', width: 112 },
      { field: 'NZcRate', headerName: '比例', width: 112 },
      { field: 'NYbLowQua', headerName: '块数', width: 112 },
      { field: 'NYbLowRate', headerName: '比例', width: 112 },
      { field: 'NYzLowQua', headerName: '块数', width: 112 },
      { field: 'NYzLowRate', headerName: '比例', width: 112 },
      { field: 'NYbHotQua', headerName: '块数', width: 112 },
      { field: 'NYbHotRate', headerName: '比例', width: 112 },
      { field: 'NYzHotQua', headerName: '块数', width: 112 },
      { field: 'NYzHotRate', headerName: '比例', width: 112 },
      { field: 'CShiftGroup', headerName: '班组', width: 112 },
      { field: 'Date', headerName: '日期', width: 112 },
      { field: 'NZcQua2', headerName: '块数', width: 112 },
      { field: 'NZcRate2', headerName: '比例', width: 112 },
      { field: 'IsAutoUse', headerName: '是否投用自动', width: 140 },
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
