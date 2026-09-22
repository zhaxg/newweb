<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR3030（剪切计划调整）：DDH.Winforms.SHR.Forms.FrmHR3030
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'COrderNo', headerName: '订单号', width: 150 },
      { field: 'CLineCode', headerName: '产线', width: 150 },
      { field: 'CBatchNo', headerName: '批号', width: 150 },
      { field: 'CStove', headerName: '炉号', width: 150 },
      { field: 'COrderNo1', headerName: '订单号1', width: 150 },
      { field: 'CPieceNoSlab', headerName: '板坯号', width: 150 },
      { field: 'NThick', headerName: '厚度', width: 150 },
      { field: 'COrderNo2', headerName: '订单号2', width: 150 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 150 },
      { field: 'NWidth', headerName: '宽度', width: 150 },
      { field: 'COrderNo3', headerName: '订单号3', width: 150 },
      { field: 'CPrintCode', headerName: '喷号', width: 150 },
      { field: 'NLen', headerName: '长度', width: 150 },
      { field: 'COrderNo4', headerName: '订单号4', width: 150 },
      { field: 'CSgCode', headerName: '钢种', width: 150 },
      { field: 'NLenTq1', headerName: '套切1', width: 150 },
      { field: 'CSgStd', headerName: '钢种标准', width: 150 },
      { field: 'NLenTq2', headerName: '套切2', width: 150 },
      { field: 'CSpec', headerName: '规格', width: 150 },
      { field: 'NLenTq3', headerName: '套切3', width: 150 },
      { field: 'NNum', headerName: '件数', width: 150 },
      { field: 'NLenTq4', headerName: '套切4', width: 150 },
      { field: 'NWgt', headerName: '重量', width: 150 },
      { field: 'NPlanedWgt', headerName: '计划重量', width: 150 },
      { field: 'NPlanZpWgt', headerName: '计划组批量', width: 150 },
      { field: 'NZpWgt', headerName: '组批重量', width: 150 },
      { field: 'NZpSyWgt', headerName: '剩余组批量', width: 150 },
      { field: 'NFurWgt', headerName: '入炉量', width: 150 },
      { field: 'NRollWgt', headerName: '轧制板重t', width: 150 },
      { field: 'CSteelType', headerName: '品名', width: 150 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 150 },
      { field: 'CCustStdCode', headerName: '客户标准', width: 150 },
      { field: 'DJhqTime', headerName: '计划日期', width: 150 },
      { field: 'CConRemark', headerName: '合同备注', width: 150 },
      { field: 'CDesignNo', headerName: '设计编号', width: 150 },
      { field: 'CMsc', headerName: '冶金规范码', width: 150 },
      { field: 'CMscLineNo', headerName: '冶金规范产线号', width: 150 },
      { field: 'CRemark', headerName: '备注', width: 150 },
      { field: 'NOrder', headerName: '排序', width: 150 },
      { field: 'CSourceTl', headerName: '供坯单位', width: 150 },
      { field: 'CSgCodeTl', headerName: '炼钢钢种', width: 150 },
      { field: 'CSgStdTl', headerName: '提料标准', width: 150 },
      { field: 'NThickTl', headerName: '坯厚', width: 150 },
      { field: 'NWidthTl', headerName: '坯宽', width: 150 },
      { field: 'NLenMinTl', headerName: '提料长度最小值', width: 150 },
      { field: 'NLenMaxTl', headerName: '提料长度最大值', width: 150 },
      { field: 'NQuaTl', headerName: '计划生产钢坯块数', width: 150 },
      { field: 'NWgtMeterTl', headerName: '提料米单重', width: 150 },
      { field: 'NWgtUnitTl', headerName: '钢坯单重', width: 150 },
      { field: 'NWgtTl', headerName: '生产钢坯重量', width: 150 },
      { field: 'NWidthWgt', headerName: '宽重', width: 150 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 150 },
      { field: 'CFlawDesc', headerName: '表面缺陷', width: 150 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 150 },
      { field: 'CTol', headerName: '公差', width: 150 },
      { field: 'COverstepBl', headerName: '超差', width: 150 },
      { field: 'CInboundNo', headerName: '入库单号', width: 150 },
      { field: 'CShape', headerName: '形状', width: 150 },
      { field: 'CIsMerge', headerName: '合并', width: 150 },
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
