<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR4720（宽不合台账）：DDH.Winforms.SHR.Forms.FrmHR4720
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CSlabNo', headerName: '板坯号', width: 150 },
      { field: 'CBatchOrder', headerName: '组批号', width: 150 },
      { field: 'CSgCode', headerName: '钢种', width: 150 },
      { field: 'DRollingTimeEnd', headerName: '轧制结束时间', width: 150 },
      { field: 'COrderNo', headerName: '订单号', width: 150 },
      { field: 'CTol', headerName: '公差', width: 150 },
      { field: 'NThickSlab', headerName: '坯料厚度', width: 150 },
      { field: 'NWidthSlab', headerName: '坯料宽度', width: 150 },
      { field: 'NLenSlab', headerName: '坯料长度', width: 150 },
      { field: 'NWgtSlab', headerName: '坯重', width: 150 },
      { field: 'NWgtZh', headerName: '称重重量', width: 150 },
      { field: 'NWgtBc', headerName: '磅差', width: 150 },
      { field: 'NThickOrder', headerName: '订单厚度', width: 150 },
      { field: 'NWidthOrder', headerName: '订单宽度', width: 150 },
      { field: 'NThickZh', headerName: '照核厚度', width: 150 },
      { field: 'NWidthZh', headerName: '照核宽度', width: 150 },
      { field: 'NLenZh', headerName: '照核长度', width: 150 },
      { field: 'NWidthBefore', headerName: '粗轧前测宽仪全长平均宽度[mm](冷态)', width: 150 },
      { field: 'NWidthAfter', headerName: '粗轧后测宽仪全长平均宽度[mm](冷态)', width: 150 },
      { field: 'NWidthRoll', headerName: '轧制宽', width: 150 },
      { field: 'NWidthAvg', headerName: '平直度仪平均宽度', width: 150 },
      { field: 'NWidthMax', headerName: '最大宽度', width: 150 },
      { field: 'NWidthMin', headerName: '最小宽度', width: 150 },
      { field: 'NWidthSbj', headerName: '双边剪剪切宽度', width: 150 },
      { field: 'NWidthPy', headerName: '喷印宽度', width: 150 },
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
