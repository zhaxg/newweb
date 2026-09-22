<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMP3100（浇次计划跟踪查询）：DDH.Winforms.SMP.Forms.FrmMP3100
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CCool', headerName: '冷却', width: 150 },
      { field: 'DProTime', headerName: '产出时间', width: 150 },
      { field: 'CPlanTime', headerName: '计划号', width: 150 },
      { field: 'CPlanNo', headerName: '计划号', width: 150 },
      { field: 'COrderNo', headerName: '订单号', width: 150 },
      { field: 'COrderCustCname', headerName: '订货客户', width: 150 },
      { field: 'COrderNo1', headerName: '订单号1', width: 150 },
      { field: 'CStove', headerName: '炉号', width: 150 },
      { field: 'COrderNo2', headerName: '订单号2', width: 150 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 150 },
      { field: 'COrderNo3', headerName: '订单号3', width: 150 },
      { field: 'COrderNo4', headerName: '订单号4', width: 150 },
      { field: 'CSgCode', headerName: '钢种', width: 150 },
      { field: 'NWth', headerName: '宽度', width: 150 },
      { field: 'NNum', headerName: '件数', width: 150 },
      { field: 'NWgt', headerName: '重量', width: 150 },
      { field: 'NThick', headerName: '厚度', width: 150 },
      { field: 'NWidth', headerName: '宽度', width: 150 },
      { field: 'NCalWgt', headerName: '理重', width: 150 },
      { field: 'NWidthWgt', headerName: '宽重', width: 150 },
      { field: 'CStackNo', headerName: '垛位号', width: 150 },
      { field: 'NLen', headerName: '长度', width: 150 },
      { field: 'CStackNum', headerName: '层号', width: 150 },
      { field: 'CLengthType', headerName: '长度类型', width: 150 },
      { field: 'NQmStatus', headerName: '质量状态', width: 150 },
      { field: 'NLenMin', headerName: '最小长度', width: 150 },
      { field: 'NLockReason', headerName: '质量封锁原因', width: 150 },
      { field: 'NLenMax', headerName: '最大长度', width: 150 },
      { field: 'CPrintCode', headerName: '喷号', width: 150 },
      { field: 'CSpec', headerName: '规格', width: 150 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 150 },
      { field: 'CProRemark', headerName: '生产备注', width: 150 },
      { field: 'CTlSgCode', headerName: '提料钢种', width: 150 },
      { field: 'NSlabThick', headerName: '坯料厚度', width: 150 },
      { field: 'NSlabWidth', headerName: '坯料宽度', width: 150 },
      { field: 'NSlabLenMin', headerName: '坯料最小长度', width: 150 },
      { field: 'NSlabLenMax', headerName: '坯料最大长度', width: 150 },
      { field: 'NSlabQua', headerName: '计划钢坯支数', width: 150 },
      { field: 'NStorageNum', headerName: '已挂坯支数', width: 150 },
      { field: 'NZzNum', headerName: '轧制实绩', width: 150 },
      { field: 'NQZzNum', headerName: '欠轧支数', width: 150 },
      { field: 'NZzWgt', headerName: '轧制重量', width: 150 },
      { field: 'NThickPlan', headerName: '轧制厚度', width: 150 },
      { field: 'NWidthPlan', headerName: '轧制宽度', width: 150 },
      { field: 'NLenPlan', headerName: '计划长度', width: 150 },
      { field: 'NDbc', headerName: '单重', width: 150 },
      { field: 'NPlanedBoardNum', headerName: '计划块数', width: 150 },
      { field: 'NPlanedWgt', headerName: '计划重量', width: 150 },
      { field: 'NLenPlan1', headerName: '套切长度1', width: 150 },
      { field: 'NLenPlan2', headerName: '套切长度2', width: 150 },
      { field: 'NLenPlan3', headerName: '套切长度3', width: 150 },
      { field: 'NLenPlan4', headerName: '套切长度4', width: 150 },
      { field: 'NPlanBoarLen', headerName: '计划板长', width: 150 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 150 },
      { field: 'CSpecialMarkGy', headerName: '特殊标记工艺', width: 150 },
      { field: 'CDelivyQtyFlag', headerName: '交货数量标志', width: 150 },
      { field: 'CFlawDesc', headerName: '表面缺陷', width: 150 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 150 },
      { field: 'CTol', headerName: '公差', width: 150 },
      { field: 'COverstepBl', headerName: '超差', width: 150 },
      { field: 'CInboundNo', headerName: '入库单号', width: 150 },
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
