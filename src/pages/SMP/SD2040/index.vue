<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmSD2040（中厚板订单质量设计）：DDH.Winforms.SMP.Forms.FrmSD2040
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 120 },
      { field: 'COrderNo', headerName: '订单号', width: 120 },
      { field: 'COrderCustCname', headerName: '订货客户', width: 120 },
      { field: 'CSteelType', headerName: '品名', width: 120 },
      { field: 'CSgCode', headerName: '钢种', width: 120 },
      { field: 'NOrderProcFlag', headerName: '质量设计状态', width: 120 },
      { field: 'CDesignDesc', headerName: '设计描述', width: 120 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 120 },
      { field: 'NThick', headerName: '厚度', width: 120 },
      { field: 'NWidth', headerName: '宽度', width: 120 },
      { field: 'CLengthType', headerName: '长度类型', width: 120 },
      { field: 'NLenMin', headerName: '最小长度', width: 120 },
      { field: 'NLenMax', headerName: '最大长度', width: 120 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 120 },
      { field: 'CDelivyStatusDesc', headerName: '交货状态描述', width: 120 },
      { field: 'NNum', headerName: '件数', width: 120 },
      { field: 'CTol', headerName: '公差', width: 120 },
      { field: 'NWgt', headerName: '重量', width: 120 },
      { field: 'COverstepBl', headerName: '超差', width: 120 },
      { field: 'CDelivyQtyFlag', headerName: '交货数量标志', width: 120 },
      { field: 'CFlawDesc', headerName: '表面缺陷', width: 120 },
      { field: 'CConNo', headerName: '合同号', width: 120 },
      { field: 'CSgStd', headerName: '钢种标准', width: 120 },
      { field: 'DJhqTime', headerName: '计划日期', width: 120 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 120 },
      { field: 'CSpecialMarkGy', headerName: '特殊标记工艺', width: 120 },
      { field: 'NWtMax', headerName: '最大重量', width: 120 },
      { field: 'NWtMin', headerName: '最小重量', width: 120 },
      { field: 'CSpec', headerName: '规格', width: 120 },
      { field: 'CConRemark', headerName: '合同备注', width: 120 },
      { field: 'CInboundNo', headerName: '入库单号', width: 120 },
      { field: 'DTimeShipment', headerName: '发货时间', width: 120 },
      { field: 'CDeptCode', headerName: '部门编码', width: 120 },
      { field: 'CLineCode', headerName: '产线', width: 120 },
      { field: 'CSgCodeNk', headerName: '内控钢种', width: 120 },
      { field: 'DOrderProcTime', headerName: '合同处理时间', width: 120 },
      { field: 'DSendTime', headerName: '发送时间', width: 120 },
      { field: 'DPushTime', headerName: '下发生产时间', width: 120 },
      { field: 'NThickTolMin', headerName: '厚度公差最小', width: 120 },
      { field: 'NThickTolMax', headerName: '厚度公差最大', width: 120 },
      { field: 'NWidthTolMin', headerName: '宽度公差最小', width: 120 },
      { field: 'NWidthTolMax', headerName: '宽度公差最大', width: 120 },
      { field: 'NLenTolMin', headerName: '长度公差最小', width: 120 },
      { field: 'NLenTolMax', headerName: '长度公差最大', width: 120 },
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
