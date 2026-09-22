<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR3010（已组批计划管理）：DDH.Winforms.SHR.Forms.FrmHR3010
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CLineCode', headerName: '产线', width: 120 },
      { field: 'COrderNo', headerName: '订单号', width: 120 },
      { field: 'CPlateNo', headerName: '大板号', width: 120 },
      { field: 'COrderNo1', headerName: '订单号1', width: 120 },
      { field: 'COrderNo2', headerName: '订单号2', width: 120 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 150 },
      { field: 'COrderNo3', headerName: '订单号3', width: 120 },
      { field: 'COrderNo4', headerName: '订单号4', width: 120 },
      { field: 'NLenTq1', headerName: '套切1', width: 120 },
      { field: 'NLenTq2', headerName: '套切2', width: 120 },
      { field: 'NLenTq3', headerName: '套切3', width: 120 },
      { field: 'NLenTq4', headerName: '套切4', width: 120 },
      { field: 'NBc', headerName: '倍尺', width: 120 },
      { field: 'NNum', headerName: '件数', width: 120 },
      { field: 'CConNo', headerName: '合同号', width: 120 },
      { field: 'CBatchNo', headerName: '批号', width: 120 },
      { field: 'NOrder', headerName: '排序', width: 150 },
      { field: 'CStove', headerName: '炉号', width: 120 },
      { field: 'CSgCode', headerName: '钢种', width: 120 },
      { field: 'CPrintCode', headerName: '喷号', width: 120 },
      { field: 'CSgStd', headerName: '钢种标准', width: 120 },
      { field: 'CSpec', headerName: '规格', width: 120 },
      { field: 'NThick', headerName: '厚度', width: 120 },
      { field: 'NWidth', headerName: '宽度', width: 120 },
      { field: 'NLen', headerName: '长度', width: 120 },
      { field: 'NQua', headerName: '支数', width: 120 },
      { field: 'NWgt', headerName: '重量', width: 120 },
      { field: 'NWgtOrder', headerName: '订单重量', width: 120 },
      { field: 'NRateLl', headerName: '理论成材率', width: 120 },
      { field: 'NRateSj', headerName: '实际成材率', width: 120 },
      { field: 'NFurType', headerName: '装炉方式', width: 120 },
      { field: 'CRemark', headerName: '备注', width: 120 },
      { field: 'CSampleLotNo', headerName: '样批号', width: 120 },
      { field: 'CDesignNo', headerName: '设计编号', width: 120 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 120 },
      { field: 'CFlawDesc', headerName: '表面缺陷', width: 120 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 120 },
      { field: 'CTol', headerName: '公差', width: 120 },
      { field: 'COverstepBl', headerName: '超差', width: 120 },
      { field: 'CInboundNo', headerName: '入库单号', width: 120 },
      { field: 'CShape', headerName: '形状', width: 120 },
      { field: 'NWidthWgt', headerName: '宽重', width: 120 },
      { field: 'CConfirmStatus', headerName: '确认判定状态', width: 120 },
      { field: 'CConfirmEmp', headerName: '收料人', width: 120 },
      { field: 'DConfirm', headerName: '收料时间', width: 120 },
      { field: 'CConfirmShift', headerName: '收料班次', width: 120 },
      { field: 'CConfirmGroup', headerName: '收料班组', width: 120 },
      { field: 'CCustCode', headerName: '客户编号', width: 120 },
      { field: 'CCustName', headerName: '客户名称', width: 120 },
      { field: 'DDeliveryDate', headerName: '交货日期', width: 120 },
      { field: 'DOrdDate', headerName: '订单日期', width: 120 },
      { field: 'CSpecReqText', headerName: '客户特殊要求', width: 120 },
      { field: 'CSteelType', headerName: '品名', width: 120 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 120 },
      { field: 'CCustStdCode', headerName: '客户标准', width: 120 },
      { field: 'COrderCustCname', headerName: '订货客户', width: 120 },
      { field: 'CConsigneeCustCname', headerName: '收货客户中文名称', width: 120 },
      { field: 'CIsMerge', headerName: '合并', width: 120 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },
]));
function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">

      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onQuery"><IconSearch class="h-3.5 w-3.5" />查询</Button>
    </div>
        <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
