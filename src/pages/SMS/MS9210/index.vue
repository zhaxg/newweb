<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMS9210（二炼钢3#连铸板坯电子台账）：DDH.Winforms.SMS.Forms.FrmMS9210
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'DTime', headerName: '时间', width: 112 },
      { field: 'CShiftNo', headerName: '结果录入班次', width: 112 },
      { field: 'CGroupNo', headerName: '结果录入班组', width: 112 },
      { field: 'CStove', headerName: '炉号', width: 112 },
      { field: 'CSgCode', headerName: '钢种', width: 112 },
      { field: 'C', headerName: '碳', width: 112 },
      { field: 'Si', headerName: '硅', width: 112 },
      { field: 'Mn', headerName: '锰', width: 112 },
      { field: 'P', headerName: '磷', width: 112 },
      { field: 'S', headerName: '硫', width: 112 },
      { field: 'Cr', headerName: '铬', width: 112 },
      { field: 'Ni', headerName: '镍', width: 112 },
      { field: 'Mo', headerName: '钼', width: 112 },
      { field: 'Cu', headerName: '铜', width: 112 },
      { field: 'Al', headerName: '铝', width: 112 },
      { field: 'Ti', headerName: '钛', width: 112 },
      { field: 'Nb', headerName: '铌', width: 112 },
      { field: 'V', headerName: '钒', width: 112 },
      { field: 'Als', headerName: 'ALS', width: 112 },
      { field: 'Ca', headerName: '钙', width: 112 },
      { field: 'Ceq', headerName: '碳当量', width: 112 },
      { field: 'B', headerName: '硼', width: 112 },
      { field: 'Alins', headerName: 'ALINS', width: 112 },
      { field: 'W', headerName: '钨', width: 112 },
      { field: 'As', headerName: '砷', width: 112 },
      { field: 'Sn', headerName: '锡', width: 112 },
      { field: 'Co', headerName: '钴', width: 112 },
      { field: 'Pb', headerName: '铅', width: 112 },
      { field: 'Sb', headerName: '锑', width: 112 },
      { field: 'Ta', headerName: '钽', width: 112 },
      { field: 'Zr', headerName: '锆', width: 112 },
      { field: 'Bi', headerName: '铋', width: 112 },
      { field: 'Se', headerName: '硒', width: 112 },
      { field: 'Te', headerName: '碲', width: 112 },
      { field: 'Ce', headerName: '铈', width: 112 },
      { field: 'La', headerName: '镧', width: 112 },
      { field: 'N', headerName: '氮', width: 112 },
      { field: 'CDcN', headerName: '合格定尺N', width: 112 },
      { field: 'CDcX', headerName: '合格定尺X', width: 112 },
      { field: 'Len', headerName: '长', width: 112 },
      { field: 'NQua', headerName: '支数', width: 112 },
      { field: 'NWgt', headerName: '重量', width: 112 },
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
