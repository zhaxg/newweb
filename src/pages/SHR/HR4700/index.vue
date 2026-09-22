<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR4700（厚不合台账）：DDH.Winforms.SHR.Forms.FrmHR4700
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CSlabNo', headerName: '板坯号', width: 150 },
      { field: 'CBatchOrder', headerName: '组批号', width: 150 },
      { field: 'CSgCode', headerName: '钢种', width: 150 },
      { field: 'CSgStd', headerName: '钢种标准', width: 150 },
      { field: 'CThickWs', headerName: '工作侧厚度', width: 150 },
      { field: 'CThickDs', headerName: '传动侧厚度', width: 150 },
      { field: 'CThickHp', headerName: '中部厚度', width: 150 },
      { field: 'DRollingTimeEnd', headerName: '轧制结束时间', width: 150 },
      { field: 'ShiftNo', headerName: '班次号', width: 150 },
      { field: 'ShiftGroup', headerName: '班次组', width: 150 },
      { field: 'FmAuthorA', headerName: '精轧操作员A', width: 150 },
      { field: 'FmAuthorB', headerName: '精轧操作员B', width: 150 },
      { field: 'COrderNo', headerName: '订单号', width: 150 },
      { field: 'COrderCustCname', headerName: '订货客户', width: 150 },
      { field: 'CTol', headerName: '公差', width: 150 },
      { field: 'CInboundNo', headerName: '入库单号', width: 150 },
      { field: 'NThick', headerName: '厚度', width: 150 },
      { field: 'NWidth', headerName: '宽度', width: 150 },
      { field: 'NLen', headerName: '长度', width: 150 },
      { field: 'NThickTolMin', headerName: '厚度公差最小', width: 150 },
      { field: 'NThickTolMax', headerName: '厚度公差最大', width: 150 },
      { field: 'ExitThick', headerName: '出口厚度', width: 150 },
      { field: 'MeaThickWs', headerName: '西面测量厚度', width: 150 },
      { field: 'ThickHp', headerName: '厚度液压', width: 150 },
      { field: 'MeaThickDs', headerName: '南面测量厚度', width: 150 },
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
