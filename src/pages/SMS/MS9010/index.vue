<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMS9010（库存坯料挂单）：DDH.Winforms.SMS.Forms.FrmMS9010
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'COrderNo', headerName: '订单号', width: 120 },
      { field: 'COrderCustCname', headerName: '订货客户', width: 120 },
      { field: 'COrderNo1', headerName: '订单号1', width: 120 },
      { field: 'COrderNo2', headerName: '订单号2', width: 120 },
      { field: 'COrderNo3', headerName: '订单号3', width: 120 },
      { field: 'COrderNo4', headerName: '订单号4', width: 120 },
      { field: 'CSgCode', headerName: '钢种', width: 120 },
      { field: 'CSgStd', headerName: '钢种标准', width: 120 },
      { field: 'NThick', headerName: '厚度', width: 120 },
      { field: 'NWidth', headerName: '宽度', width: 120 },
      { field: 'NWidthWgt', headerName: '宽重', width: 120 },
      { field: 'NLen', headerName: '长度', width: 120 },
      { field: 'CLengthType', headerName: '长度类型', width: 120 },
      { field: 'NLenMax', headerName: '最大长度', width: 120 },
      { field: 'NLenMin', headerName: '最小长度', width: 120 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 120 },
      { field: 'NNum', headerName: '件数', width: 120 },
      { field: 'NWgt', headerName: '重量', width: 120 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 120 },
      { field: 'CSpec', headerName: '规格', width: 120 },
      { field: 'CTlSgCode', headerName: '提料钢种', width: 120 },
      { field: 'NSlabThick', headerName: '坯料厚度', width: 120 },
      { field: 'NSlabWidth', headerName: '坯料宽度', width: 120 },
      { field: 'NSlabLenMin', headerName: '坯料最小长度', width: 120 },
      { field: 'NSlabQua', headerName: '坯料数量', width: 120 },
      { field: 'NWgtUnit', headerName: '单位重量', width: 120 },
      { field: 'NSlabWgt', headerName: '坯料重量', width: 120 },
      { field: 'NThickPlan', headerName: '轧制厚度', width: 120 },
      { field: 'NWidthPlan', headerName: '轧制宽度', width: 120 },
      { field: 'NLenPlan', headerName: '计划长度', width: 120 },
      { field: 'NDbc', headerName: '单重', width: 120 },
      { field: 'NSteelSingleWgt', headerName: '单支重量', width: 120 },
      { field: 'NPlanedBoardNum', headerName: '计划块数', width: 120 },
      { field: 'NPlanedWgt', headerName: '计划重量', width: 120 },
      { field: 'NConSteelKs', headerName: '连铸钢块数', width: 120 },
      { field: 'NConSteelNum', headerName: '连铸钢数量', width: 120 },
      { field: 'NTlTol', headerName: '提料公差', width: 120 },
      { field: 'NLlBoardWgt', headerName: '余量板重', width: 120 },
      { field: 'NLlBoardEndWgt', headerName: '余量板端重', width: 120 },
      { field: 'NLlBoardEdge', headerName: '余量板边', width: 120 },
      { field: 'NLlBoardEnd', headerName: '余量板端', width: 120 },
      { field: 'NLlBurnLoss', headerName: '余量烧损', width: 120 },
      { field: 'NLlCleanLen', headerName: '余量清洁长度', width: 120 },
      { field: 'NBoarCleanLen', headerName: '板清洁长度', width: 120 },
      { field: 'CThickRange', headerName: '厚度范围', width: 120 },
      { field: 'CDelivyQtyFlag', headerName: '交货数量标志', width: 120 },
      { field: 'CTol', headerName: '公差', width: 120 },
      { field: 'CFlawStand', headerName: '探伤标准', width: 120 },
      { field: 'CFlawDesc', headerName: '表面缺陷', width: 120 },
      { field: 'CTransType', headerName: '运输类型', width: 120 },
      { field: 'CStoreRoom', headerName: '库房', width: 120 },
      { field: 'CRzFlag', headerName: '是否认证', width: 120 },
      { field: 'CSampleSpec', headerName: '样品规格', width: 120 },
      { field: 'CSpecialMarkGy', headerName: '特殊标记工艺', width: 120 },
      { field: 'CAddress', headerName: '地址', width: 120 },
      { field: 'CThickRangeDis', headerName: '厚度范围描述', width: 120 },
      { field: 'CSingleSlab', headerName: '单片钢坯', width: 120 },
      { field: 'NLenPlan1', headerName: '套切长度1', width: 120 },
      { field: 'NLenPlan2', headerName: '套切长度2', width: 120 },
      { field: 'NLenPlan3', headerName: '套切长度3', width: 120 },
      { field: 'NLenPlan4', headerName: '套切长度4', width: 120 },
      { field: 'NPlanBoarLen', headerName: '计划板长', width: 120 },
      { field: 'CRollType', headerName: '轧制方式', width: 120 },
      { field: 'NLlProduceKs', headerName: '余量生产块数', width: 120 },
      { field: 'NDcLen', headerName: '定尺长度', width: 120 },
      { field: 'DJhqTime', headerName: '计划日期', width: 120 },
      { field: 'CZWidth', headerName: 'Z宽度', width: 120 },
      { field: 'CRollNo', headerName: '补轧标识', width: 120 },
      { field: 'NColdSlabKs', headerName: '冷坯块数', width: 120 },
      { field: 'NColdSlabNum', headerName: '冷坯数量', width: 120 },
      { field: 'CInboundNo', headerName: '入库单号', width: 120 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 120 },
      { field: 'CRepairProduce', headerName: '补产', width: 120 },
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
