<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR4510（堆冷台账）：DDH.Winforms.SHR.Forms.FrmHR4510
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 112 },
      { field: 'CStackType', headerName: '垛位类型', width: 150 },
      { field: 'CHlStack', headerName: '垛位', width: 112 },
      { field: 'CHlStackNum', headerName: '层号', width: 112 },
      { field: 'CBatchOrder', headerName: '组批号', width: 112 },
      { field: 'CInboundNo1', headerName: '入库标识1', width: 112 },
      { field: 'CInboundNo2', headerName: '入库标识2', width: 112 },
      { field: 'NThickOrder', headerName: '订单厚度', width: 112 },
      { field: 'CIsQy', headerName: '原取样板标记', width: 113 },
      { field: 'CSgCode', headerName: '钢种', width: 112 },
      { field: 'NThick', headerName: '厚度', width: 112 },
      { field: 'NWidth', headerName: '宽度', width: 112 },
      { field: 'NLen', headerName: '长度', width: 112 },
      { field: 'NWgt', headerName: '重量', width: 112 },
      { field: 'NLenPlan1', headerName: '套切长度1', width: 112 },
      { field: 'NLenPlan2', headerName: '套切长度2', width: 112 },
      { field: 'NWidthPlan1', headerName: '套切宽度1', width: 112 },
      { field: 'NWidthPlan2', headerName: '套切宽度2', width: 112 },
      { field: 'CExitem1', headerName: '是否工程单', width: 112 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 112 },
      { field: 'CHlGroupIn', headerName: '开始班组', width: 112 },
      { field: 'DLcIn', headerName: '上冷床时间', width: 150 },
      { field: 'NLcWd', headerName: '上冷床温度', width: 150 },
      { field: 'NLc', headerName: '冷床冷却时长', width: 150 },
      { field: 'DHlIn', headerName: '开始时间', width: 112 },
      { field: 'NWdIn', headerName: '开始温度', width: 112 },
      { field: 'NHlHour', headerName: '计划堆冷时间', width: 112 },
      { field: 'NHlHourSj', headerName: '实际堆冷时间', width: 112 },
      { field: 'NHlHourSy', headerName: '剩余堆冷时间', width: 112 },
      { field: 'CHlUserIn', headerName: '开始人', width: 112 },
      { field: 'DHlOut', headerName: '结束时间', width: 112 },
      { field: 'CHlGroupOut', headerName: '结束班组', width: 112 },
      { field: 'CHlUserOut', headerName: '结束人', width: 112 },
      { field: 'Date', headerName: '日期', width: 112 },
      { field: 'NAllDlQua', headerName: '总数量', width: 112 },
      { field: 'NAllDlWgt', headerName: '总重量', width: 112 },
      { field: 'NSlabDlFinishQua', headerName: '到期数量', width: 112 },
      { field: 'NSlabDlFinishWgt', headerName: '到期重量', width: 112 },
      { field: 'NSlabDlNotQua', headerName: '未到期数量', width: 112 },
      { field: 'NSlabDlNotWgt', headerName: '未到期重量', width: 112 },
      { field: 'NCpDlFinishQua', headerName: '到期数量', width: 112 },
      { field: 'NCpDlFinishWgt', headerName: '到期重量', width: 112 },
      { field: 'NCpDlNotQua', headerName: '未到期数量', width: 112 },
      { field: 'NCpDlNotWgt', headerName: '未到期重量', width: 112 },
      { field: 'NQuaHq', headerName: '支数', width: 112 },
      { field: 'NWgtHq', headerName: '重量', width: 112 },
      { field: 'NQuaJq', headerName: '剪切支数', width: 112 },
      { field: 'NWgtJq', headerName: '剪切重量', width: 112 },
      { field: 'NQuaDrk', headerName: '支数', width: 112 },
      { field: 'NWgtDrk', headerName: '重量', width: 112 },
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
