<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR9080（轧制异常实绩）：DDH.Winforms.SHR.Forms.FrmHR9080
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'PlateNo', headerName: '板号', width: 150 },
      { field: 'SlabNo', headerName: '坯料号', width: 150 },
      { field: 'Zone', headerName: '位置', width: 150 },
      { field: 'Reason', headerName: '异常原因', width: 150 },
      { field: 'ActPassNo', headerName: '当前实际道次号', width: 150 },
      { field: 'ActThick', headerName: '当前厚度', width: 150 },
      { field: 'ActWidth', headerName: '当前宽度', width: 150 },
      { field: 'ActLength', headerName: '当前长度', width: 150 },
      { field: 'ShiftNo', headerName: '班次号', width: 150 },
      { field: 'ShiftGroup', headerName: '班次组', width: 150 },
      { field: 'ProductTime', headerName: '生产时间', width: 150 },
      { field: 'Author', headerName: '作者', width: 150 },
      { field: 'SlabWeight', headerName: '坯料重量', width: 150 },
      { field: 'DiscAuthor', headerName: '责任者', width: 150 },
      { field: 'RmAuthorA', headerName: '粗轧责任者A', width: 150 },
      { field: 'RmAuthorB', headerName: '粗轧责任者B', width: 150 },
      { field: 'FmAuthorA', headerName: '精轧操作员A', width: 150 },
      { field: 'FmAuthorB', headerName: '精轧操作员B', width: 150 },
      { field: 'DProductTime', headerName: '生产时间', width: 150 },
      { field: 'CSgCode', headerName: '钢种', width: 150 },
      { field: 'CSgStd', headerName: '钢种标准', width: 150 },
      { field: 'CSpec', headerName: '规格', width: 150 },
      { field: 'NThick', headerName: '厚度', width: 150 },
      { field: 'NWidth', headerName: '宽度', width: 150 },
      { field: 'NLen', headerName: '长度', width: 150 },
      { field: 'FurNo', headerName: '炉号', width: 150 },
      { field: 'RowNo', headerName: '行号', width: 150 },
      { field: 'Spare2', headerName: '预留', width: 150 },
      { field: 'Spare3', headerName: '备用3', width: 150 },
      { field: 'Spare4', headerName: '备用4', width: 150 },
      { field: 'Spare5', headerName: '备用5', width: 150 },
      { field: 'Spare6', headerName: '备用6', width: 150 },
      { field: 'CSgCodePlan', headerName: '订单钢种', width: 150 },
      { field: 'CSgStdPlan', headerName: '订单标准', width: 150 },
      { field: 'CSpecPlan', headerName: '轧制规格', width: 150 },
      { field: 'NThickPlan', headerName: '轧制厚度', width: 150 },
      { field: 'NWidthPlan', headerName: '轧制宽度', width: 150 },
      { field: 'NLenPlan', headerName: '计划长度', width: 150 },
      { field: 'COrderNo1', headerName: '订单号1', width: 150 },
      { field: 'COrderNo2', headerName: '订单号2', width: 150 },
      { field: 'COrderNo3', headerName: '订单号3', width: 150 },
      { field: 'COrderNo4', headerName: '订单号4', width: 150 },
      { field: 'COrderNo5', headerName: '订单号5', width: 150 },
      { field: 'COrderNo6', headerName: '订单号6', width: 150 },
      { field: 'NLenPlan1', headerName: '套切长度1', width: 150 },
      { field: 'NLenPlan2', headerName: '套切长度2', width: 150 },
      { field: 'NLenPlan3', headerName: '套切长度3', width: 150 },
      { field: 'NLenPlan4', headerName: '套切长度4', width: 150 },
      { field: 'NLenPlan5', headerName: '套切长度5', width: 150 },
      { field: 'NLenPlan6', headerName: '套切长度6', width: 150 },
      { field: 'CInboundNo1', headerName: '入库标识1', width: 150 },
      { field: 'CInboundNo2', headerName: '入库标识2', width: 150 },
      { field: 'CInboundNo3', headerName: '入库标识3', width: 150 },
      { field: 'CInboundNo4', headerName: '入库标识4', width: 150 },
      { field: 'CInboundNo5', headerName: '入库标识5', width: 150 },
      { field: 'CInboundNo6', headerName: '入库标识6', width: 150 },
      { field: 'NBc', headerName: '倍尺', width: 150 },
      { field: 'CIsGcd', headerName: '是否过称', width: 150 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 150 },
      { field: 'CFlawDesc', headerName: '表面缺陷', width: 150 },
      { field: 'CSpecialMarkGy', headerName: '特殊标记工艺', width: 150 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 150 },
      { field: 'CTol', headerName: '公差', width: 150 },
      { field: 'CConRemark', headerName: '合同备注', width: 150 },
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
