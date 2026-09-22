<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR4300（计划产出查询）：DDH.Winforms.SHR.Forms.FrmHR4300
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CLineCode', headerName: '产线', width: 150 },
      { field: 'CSlabNo', headerName: '板坯号', width: 150 },
      { field: 'CPlateSlab', headerName: '大板号', width: 150 },
      { field: 'CPlateNo', headerName: '大板号', width: 150 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 150 },
      { field: 'NNum', headerName: '件数', width: 150 },
      { field: 'NWgt', headerName: '重量', width: 150 },
      { field: 'DRl', headerName: '入炉时间', width: 150 },
      { field: 'COrderNo', headerName: '订单号', width: 150 },
      { field: 'CSgCodePlan', headerName: '订单钢种', width: 150 },
      { field: 'CSpec', headerName: '规格', width: 150 },
      { field: 'NThickPlan', headerName: '轧制厚度', width: 150 },
      { field: 'NWidthPlan', headerName: '轧制宽度', width: 150 },
      { field: 'NLenPlan', headerName: '计划长度', width: 150 },
      { field: 'CInboundNoPlan', headerName: '计划入库标识', width: 150 },
      { field: 'NThick', headerName: '厚度', width: 150 },
      { field: 'NWidth', headerName: '宽度', width: 150 },
      { field: 'NLen', headerName: '长度', width: 150 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 150 },
      { field: 'CInboundNo', headerName: '入库单号', width: 150 },
      { field: 'NQua', headerName: '支数', width: 150 },
      { field: 'NWgtCc', headerName: '产出重量', width: 150 },
      { field: 'CPrint', headerName: '喷印完成标记', width: 150 },
      { field: 'CSlCode', headerName: '剪切线代码', width: 150 },
      { field: 'DProTime', headerName: '产出时间', width: 150 },
      { field: 'CProUser', headerName: '产出人', width: 150 },
      { field: 'CShiftNo', headerName: '结果录入班次', width: 150 },
      { field: 'CGroupNo', headerName: '结果录入班组', width: 150 },
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
