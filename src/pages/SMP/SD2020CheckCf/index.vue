<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmSD2020CheckCf（中厚板拆分订单审核）：DDH.Winforms.SMP.Forms.FrmSD2020CheckCf
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 150 },
      { field: 'COrderNo', headerName: '订单号', width: 200 },
      { field: 'NFlag', headerName: '标志', width: 150 },
      { field: 'CRemark', headerName: '备注', width: 200 },
      { field: 'COrderCustCname', headerName: '订货客户', width: 150 },
      { field: 'CSteelType', headerName: '品名', width: 150 },
      { field: 'CSgCode', headerName: '钢种', width: 150 },
      { field: 'NNum', headerName: '件数', width: 150 },
      { field: 'NWgt', headerName: '重量', width: 150 },
      { field: 'NLenMin', headerName: '最小长度', width: 150 },
      { field: 'NLenMax', headerName: '最大长度', width: 150 },
      { field: 'CExitem4', headerName: '变更说明', width: 150 },
      { field: 'NThick', headerName: '厚度', width: 150 },
      { field: 'NThickMin', headerName: '最小厚度', width: 150 },
      { field: 'NThickMax', headerName: '最大厚度', width: 150 },
      { field: 'NWidth', headerName: '宽度', width: 150 },
      { field: 'NWidthMin', headerName: '最小宽度', width: 150 },
      { field: 'NWidthMax', headerName: '最大宽度', width: 150 },
      { field: 'NWidthWgt', headerName: '宽重', width: 150 },
      { field: 'CLengthType', headerName: '长度类型', width: 150 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 150 },
      { field: 'CDelivyStatusDesc', headerName: '交货状态描述', width: 150 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 150 },
      { field: 'COverstepBl', headerName: '超差', width: 150 },
      { field: 'CDelivyQtyFlag', headerName: '交货数量标志', width: 150 },
      { field: 'CTol', headerName: '公差', width: 150 },
      { field: 'CFlawDesc', headerName: '表面缺陷', width: 150 },
      { field: 'CConNo', headerName: '合同号', width: 150 },
      { field: 'CSgStd', headerName: '钢种标准', width: 150 },
      { field: 'DJhqTime', headerName: '计划日期', width: 150 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 150 },
      { field: 'CSpecialMarkGy', headerName: '特殊标记工艺', width: 150 },
      { field: 'CSpec', headerName: '规格', width: 150 },
      { field: 'CConRemark', headerName: '合同备注', width: 150 },
      { field: 'CInboundNo', headerName: '入库单号', width: 150 },
      { field: 'DTimeShipment', headerName: '发货时间', width: 150 },
      { field: 'CExitem1', headerName: '是否工程单', width: 150 },
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
