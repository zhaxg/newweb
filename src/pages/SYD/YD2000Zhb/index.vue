<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmYD2000Zhb（中厚板原料统计）：DDH.Winforms.SYD.Forms.FrmYD2000Zhb
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'CType', headerName: '类型', width: 150 },
      { field: 'COrderNo', headerName: '订单号', width: 150 },
      { field: 'NNum', headerName: '件数', width: 150 },
      { field: 'CStove', headerName: '炉号', width: 150 },
      { field: 'NWgt', headerName: '重量', width: 150 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 150 },
      { field: 'NProType', headerName: '库存类型', width: 150 },
      { field: 'CPrintCode', headerName: '喷号', width: 150 },
      { field: 'CSgCode', headerName: '钢种', width: 150 },
      { field: 'NKSgCode', headerName: '国标钢种', width: 150 },
      { field: 'NThick', headerName: '厚度', width: 150 },
      { field: 'NWth', headerName: '宽度', width: 150 },
      { field: 'NLen', headerName: '长度', width: 150 },
      { field: 'DInTime', headerName: '入库时间', width: 150 },
      { field: 'CInUser', headerName: '入库人', width: 150 },
      { field: 'CStoreCode', headerName: '库区号', width: 150 },
      { field: 'CStackNo', headerName: '垛位号', width: 150 },
      { field: 'CStackNum', headerName: '层号', width: 150 },
      { field: 'CProRemark', headerName: '生产备注', width: 150 },
      { field: 'NQmStatus', headerName: '质量状态', width: 150 },
      { field: 'NLockReason', headerName: '质量封锁原因', width: 150 },
      { field: 'NQmLevel', headerName: '质量等级', width: 150 },
      { field: 'CSurfaceResult', headerName: '表检结果', width: 150 },
      { field: 'CCutFlag', headerName: '切边方式', width: 150 },
      { field: 'CPlanTime', headerName: '计划时间', width: 150 },
      { field: 'CInboundNo', headerName: '入库单号', width: 150 },
      { field: 'CBilletTypeCode', headerName: '铸坯标识', width: 150 },
      { field: 'PLAN_CSpec', headerName: '剪切计划规格', width: 150 },
      { field: 'PLAN_NThickPlan', headerName: '轧制厚', width: 150 },
      { field: 'PLAN_NWidthPlan', headerName: '轧制宽', width: 150 },
      { field: 'PLAN_NLlCleanLen', headerName: '轧制长', width: 150 },
      { field: 'COrderCustCname', headerName: '订货客户', width: 150 },
      { field: 'PLAN_COrderNo1', headerName: '订单号1', width: 150 },
      { field: 'PLAN_COrderNo2', headerName: '订单号2', width: 150 },
      { field: 'PLAN_COrderNo3', headerName: '订单号3', width: 150 },
      { field: 'PLAN_COrderNo4', headerName: '订单号4', width: 150 },
      { field: 'PLAN_COrderNo5', headerName: '订单号5', width: 150 },
      { field: 'PLAN_COrderNo6', headerName: '订单号6', width: 150 },
      { field: 'PLAN_NLenPlan1', headerName: '套切长度1', width: 150 },
      { field: 'PLAN_NLenPlan2', headerName: '套切长度2', width: 150 },
      { field: 'PLAN_NLenPlan3', headerName: '套切长度3', width: 150 },
      { field: 'PLAN_NLenPlan4', headerName: '套切长度4', width: 150 },
      { field: 'PLAN_NLenPlan5', headerName: '套切长度5', width: 150 },
      { field: 'PLAN_NLenPlan6', headerName: '套切长度6', width: 150 },
      { field: 'NBoarCleanLen', headerName: '板清洁长度', width: 150 },
      { field: 'CTol', headerName: '公差', width: 150 },
      { field: 'NDbc', headerName: '单重', width: 150 },
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
