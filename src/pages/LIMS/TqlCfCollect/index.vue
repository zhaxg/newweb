<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTqlCfCollect（成分信息）：DDH.Winforms.LIMS.Forms.FrmTqlCfCollect
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CSampNo', headerName: '样号', width: 60 },
      { field: 'CMeltingNo', headerName: '熔炼号', width: 60 },
      { field: 'CStove', headerName: '炉号', width: 60 },
      { field: 'CSgCode', headerName: '钢种', width: 60 },
      { field: 'CSgStd', headerName: '钢种标准', width: 120 },
      { field: 'CStaCode', headerName: '工位', width: 120 },
      { field: 'CCheckTime', headerName: '检验时间', width: 120 },
      { field: 'CShift', headerName: '班次', width: 120 },
      { field: 'CGroup', headerName: '班组', width: 120 },
      { field: 'C', headerName: '碳', width: 120 },
      { field: 'Si', headerName: '硅', width: 120 },
      { field: 'Mn', headerName: '锰', width: 120 },
      { field: 'P', headerName: '磷', width: 120 },
      { field: 'S', headerName: '硫', width: 120 },
      { field: 'Cr', headerName: '铬', width: 120 },
      { field: 'Ni', headerName: '镍', width: 120 },
      { field: 'Mo', headerName: '钼', width: 120 },
      { field: 'Cu', headerName: '铜', width: 120 },
      { field: 'Al', headerName: '铝', width: 120 },
      { field: 'Ti', headerName: '钛', width: 120 },
      { field: 'Nb', headerName: '铌', width: 120 },
      { field: 'V', headerName: '钒', width: 120 },
      { field: 'Als', headerName: 'ALS', width: 120 },
      { field: 'Ca', headerName: '钙', width: 120 },
      { field: 'Ceq', headerName: '碳当量', width: 120 },
      { field: 'B', headerName: '硼', width: 120 },
      { field: 'Alins', headerName: 'ALINS', width: 120 },
      { field: 'W', headerName: '钨', width: 120 },
      { field: 'As', headerName: '砷', width: 120 },
      { field: 'Sn', headerName: '锡', width: 120 },
      { field: 'Co', headerName: '钴', width: 120 },
      { field: 'Pb', headerName: '铅', width: 120 },
      { field: 'Sb', headerName: '锑', width: 120 },
      { field: 'Ta', headerName: '钽', width: 120 },
      { field: 'Zr', headerName: '锆', width: 120 },
      { field: 'Bi', headerName: '铋', width: 120 },
      { field: 'Se', headerName: '硒', width: 120 },
      { field: 'Te', headerName: '碲', width: 120 },
      { field: 'Ce', headerName: '铈', width: 120 },
      { field: 'La', headerName: '镧', width: 120 },
      { field: 'N', headerName: '氮', width: 120 },
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
