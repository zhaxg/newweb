<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

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
