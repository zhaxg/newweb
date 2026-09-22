<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR4830（生产计划成材率统计汇总）：DDH.Winforms.SHR.Forms.FrmHR4830
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CDateTime', headerName: '日期', width: 112 },
      { field: 'CJc', headerName: '浇次', width: 112 },
      { field: 'CSgCode', headerName: '钢种', width: 112 },
      { field: 'Nbc', headerName: '倍尺', width: 112 },
      { field: 'CTrimFlagBC', headerName: '切割方式', width: 112 },
      { field: 'NBCTLRate', headerName: '提料成材率', width: 112 },
      { field: 'NQua', headerName: '支数', width: 112 },
      { field: 'NQuaAll', headerName: '轧制支数', width: 112 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 112 },
      { field: 'CQgJcRate', headerName: '浇次比例', width: 112 },
      { field: 'NQgTLRate', headerName: '提料成材率', width: 112 },
      { field: 'NRoll', headerName: '轧制规格', width: 112 },
      { field: 'CRollJcRate', headerName: '浇次比例', width: 112 },
      { field: 'NRollTLRate', headerName: '提料成材率', width: 112 },
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
