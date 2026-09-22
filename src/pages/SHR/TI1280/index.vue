<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTI1280（成材率实绩）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1280
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 112 },
      { field: 'CShiftNo', headerName: '结果录入班次', width: 112 },
      { field: 'CShiftGroup', headerName: '班组', width: 112 },
      { field: 'COrderNo', headerName: '订单号', width: 112 },
      { field: 'CZpNo', headerName: '组批号', width: 112 },
      { field: 'CSgCode', headerName: '钢种', width: 112 },
      { field: 'CPlateNo', headerName: '大板号', width: 112 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 112 },
      { field: 'CSpec', headerName: '规格', width: 112 },
      { field: 'NOrderThick', headerName: '订货厚', width: 112 },
      { field: 'NOrderWidth', headerName: '订货宽', width: 112 },
      { field: 'NOrderLen', headerName: '订货长mm', width: 112 },
      { field: 'CLengthType', headerName: '长度类型', width: 112 },
      { field: 'NLenMin', headerName: '最小长度', width: 112 },
      { field: 'NLenMax', headerName: '最大长度', width: 112 },
      { field: 'NPlateWgt', headerName: '重量', width: 112 },
      { field: 'CSlabNo', headerName: '板坯号', width: 112 },
      { field: 'CSpecSlab', headerName: '板坯规格', width: 112 },
      { field: 'NThickSlab', headerName: '坯料厚度', width: 112 },
      { field: 'NWidthSlab', headerName: '坯料宽度', width: 112 },
      { field: 'NLenSlab', headerName: '坯料长度', width: 112 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 112 },
      { field: 'NSlabWgt', headerName: '坯料重量', width: 112 },
      { field: 'DPrint', headerName: '喷印完成时间', width: 112 },
      { field: 'Date', headerName: '日期', width: 112 },
      { field: 'NSlabQua1', headerName: '支数', width: 112 },
      { field: 'NSlabWgt1', headerName: '重量', width: 112 },
      { field: 'NSlabQua2', headerName: '支数', width: 112 },
      { field: 'NSlabWgt2', headerName: '重量', width: 112 },
      { field: 'NSlabQua0', headerName: '支数', width: 112 },
      { field: 'NSlabWgt0', headerName: '重量', width: 112 },
      { field: 'NSlabQuaAll', headerName: '支数', width: 112 },
      { field: 'NSlabWgtAll', headerName: '重量', width: 112 },
      { field: 'NQua1', headerName: '支数', width: 112 },
      { field: 'NWgt1', headerName: '重量', width: 112 },
      { field: 'NQua2', headerName: '支数', width: 112 },
      { field: 'NWgt2', headerName: '重量', width: 112 },
      { field: 'NQua0', headerName: '支数', width: 112 },
      { field: 'NWgt0', headerName: '重量', width: 112 },
      { field: 'NQuaAll', headerName: '轧制支数', width: 112 },
      { field: 'NWgtAll', headerName: '钢板合计重量', width: 112 },
      { field: 'NRate1', headerName: '四切', width: 112 },
      { field: 'NRate2', headerName: '两切', width: 112 },
      { field: 'NRate0', headerName: '毛边', width: 112 },
      { field: 'NRateAll', headerName: '累计', width: 112 },
      { field: 'NTpDayAll', headerName: '日合计', width: 112 },
      { field: 'NTpMonthAll', headerName: '当月累计', width: 112 },
      { field: 'NTpBlAll', headerName: '所占比例', width: 112 },
      { field: 'NTpDayA', headerName: '当日', width: 112 },
      { field: 'NTpTotalA', headerName: '累计', width: 112 },
      { field: 'NTpDayB', headerName: '当日', width: 112 },
      { field: 'NTpTotalB', headerName: '累计', width: 112 },
      { field: 'NTpDayC', headerName: '当日', width: 112 },
      { field: 'NTpTotalC', headerName: '累计', width: 112 },
      { field: 'NSlabDayAll', headerName: '日合计', width: 112 },
      { field: 'NSlabMonthAll', headerName: '当月累计', width: 112 },
      { field: 'NSlabRateAll', headerName: '所占比例', width: 112 },
      { field: 'NSlabDayA', headerName: '当日', width: 112 },
      { field: 'NSlabTotalA', headerName: '累计', width: 112 },
      { field: 'NSlabDayB', headerName: '当日', width: 112 },
      { field: 'NSlabTotalB', headerName: '累计', width: 112 },
      { field: 'NSlabDayC', headerName: '当日', width: 112 },
      { field: 'NSlabTotalC', headerName: '累计', width: 112 },
      { field: 'NYieldDayAll', headerName: '日合计', width: 112 },
      { field: 'NYieldMonthAll', headerName: '当月累计', width: 112 },
      { field: 'NYieldRateAll', headerName: '所占比例', width: 112 },
      { field: 'NYieldDayA', headerName: '当日', width: 112 },
      { field: 'NYieldTotalA', headerName: '累计', width: 112 },
      { field: 'NYieldDayB', headerName: '当日', width: 112 },
      { field: 'NYieldTotalB', headerName: '累计', width: 112 },
      { field: 'NYieldDayC', headerName: '当日', width: 112 },
      { field: 'NYieldTotalC', headerName: '累计', width: 112 },
      { field: 'NQua', headerName: '支数', width: 112 },
      { field: 'NLlWgt', headerName: '理论重量', width: 112 },
      { field: 'NTol', headerName: '偏差', width: 112 },
      { field: 'NSjWgt', headerName: '实绩重量', width: 112 },
      { field: 'NDcQua', headerName: '支数', width: 112 },
      { field: 'NDcLlWgt', headerName: '理论重量', width: 112 },
      { field: 'NDcSjWgt', headerName: '实绩重量', width: 112 },
      { field: 'NDcTol', headerName: '偏差', width: 112 },
      { field: 'NDcBL', headerName: '比例', width: 112 },
      { field: 'NFwcQua', headerName: '支数', width: 112 },
      { field: 'NFwcLlWgt', headerName: '理论重量', width: 112 },
      { field: 'NFwcSjWgt', headerName: '实绩重量', width: 112 },
      { field: 'NFwcTol', headerName: '偏差', width: 112 },
      { field: 'NFwcBL', headerName: '比例', width: 112 },
      { field: 'NQtQua', headerName: '支数', width: 112 },
      { field: 'NQtLlWgt', headerName: '理论重量', width: 112 },
      { field: 'NQtSjWgt', headerName: '实绩重量', width: 112 },
      { field: 'NQtTol', headerName: '偏差', width: 112 },
      { field: 'NQtBL', headerName: '比例', width: 112 },
      { field: 'NWgtOkQua', headerName: '支数', width: 112 },
      { field: 'NWgtOkLlWgt', headerName: '理论重量', width: 112 },
      { field: 'NWgtOkSjWgt', headerName: '实绩重量', width: 112 },
      { field: 'NWgtOkTol', headerName: '偏差', width: 112 },
      { field: 'NWgtOkBL', headerName: '比例', width: 112 },
      { field: 'NSlabQua', headerName: '坯料数量', width: 112 },
      { field: 'NThickFcQua1', headerName: '支数', width: 112 },
      { field: 'NThickFcBL1', headerName: '比例', width: 112 },
      { field: 'NThickFcQua2', headerName: '支数', width: 112 },
      { field: 'NThickFcBL2', headerName: '比例', width: 112 },
      { field: 'NWidthFcQua1', headerName: '支数', width: 112 },
      { field: 'NWidthFcBL1', headerName: '比例', width: 112 },
      { field: 'NWidthFcQua2', headerName: '支数', width: 112 },
      { field: 'NWidthFcBL2', headerName: '比例', width: 112 },
      { field: 'NDcLenFcQua1', headerName: '支数', width: 112 },
      { field: 'NDcLenFcBL1', headerName: '比例', width: 112 },
      { field: 'NDcLenFcQua2', headerName: '支数', width: 110 },
      { field: 'NDcLenFcBL2', headerName: '比例', width: 112 },
      { field: 'NFwcLenFcQua1', headerName: '支数', width: 112 },
      { field: 'NFwcLenFcBL1', headerName: '比例', width: 112 },
      { field: 'NFwcLenFcQua2', headerName: '支数', width: 112 },
      { field: 'NFwcLenFcBL2', headerName: '比例', width: 112 },
      { field: 'NBL', headerName: '比例', width: 112 },
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
    <div class="flex items-center gap-2 rounded bg-white p-2 shadow-sm dark:bg-gray-900">

    </div>
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
