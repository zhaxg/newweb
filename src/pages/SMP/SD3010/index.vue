<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";

import DatePicker from "primevue/datepicker";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmSD3010（中厚板转挂订单）：DDH.Winforms.SMP.Forms.FrmSD3010
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const txtSettleUnit = ref('');
const txtOrderUnit = ref('');
const txtSteelType = ref('');
const txtOrderNo = ref('');
const txtStandard = ref('');
const txtSeqNo = ref('');
const txtFurnaceNo = ref('');
const txtThick = ref('');
const txtWidth = ref('');
const txtLen = ref('');
const txtTol = ref('');
const dtS = ref<Date | null>(null);
const dtE = ref<Date | null>(null);
const txtInboundFlag = ref('');
const txtFlawGrade = ref('');
const txtStackNo = ref('');
const txtTrimFlag = ref('');

const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 150 },
      { field: 'COrderNo', headerName: '订单号', width: 100 },
      { field: 'CInboundNo', headerName: '入库单号', width: 100 },
      { field: 'CConsignee', headerName: '订货单位', width: 100 },
      { field: 'CSettleCust', headerName: '结算客户', width: 100 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 100 },
      { field: 'CSgCode', headerName: '钢种', width: 100 },
      { field: 'CSpec', headerName: '规格', width: 100 },
      { field: 'CSgStd', headerName: '钢种标准', width: 100 },
      { field: 'NNum', headerName: '件数', width: 100 },
      { field: 'NCalWgt', headerName: '理重', width: 100 },
      { field: 'CComplexDecideCode', headerName: '综判结果', width: 100 },
      { field: 'CSurfaceResult', headerName: '表检结果', width: 100 },
      { field: 'CDetectResultCode', headerName: '探伤判定结果', width: 100 },
      { field: 'NQmLevel', headerName: '质量等级', width: 100 },
      { field: 'CProdCode', headerName: '产品代码', width: 100 },
      { field: 'CStackNo', headerName: '垛位号', width: 100 },
      { field: 'CStackNum', headerName: '层号', width: 100 },
      { field: 'NThick', headerName: '厚度', width: 100 },
      { field: 'NWth', headerName: '宽度', width: 100 },
      { field: 'NLen', headerName: '长度', width: 100 },
      { field: 'NQmStatus', headerName: '质量状态', width: 100 },
      { field: 'NLockReason', headerName: '质量封锁原因', width: 100 },
      { field: 'CWgtToler', headerName: '重量偏差等级', width: 100 },
      { field: 'CCutFlag', headerName: '切边方式', width: 100 },
      { field: 'CDetectDefectLevel', headerName: '探伤等级', width: 100 },
      { field: 'CSpecialMarkGy', headerName: '特殊标记工艺', width: 100 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 100 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 100 },
      { field: 'CProRemark', headerName: '生产备注', width: 100 },
      { field: 'DProTime', headerName: '产出时间', width: 100 },
      { field: 'CStoreCode', headerName: '库区号', width: 100 },
      { field: 'CStove', headerName: '炉号', width: 100 },
]));
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function onbtnQuery() { /* TODO: 接入业务逻辑 */ }
function onbtnCancelMatch() { /* TODO: 接入业务逻辑 */ }
function onbtnTransfer() { /* TODO: 接入业务逻辑 */ }

async function onQuery() {
  querying.value = true;
  try {
    // TODO: 接入真实查询
    rows.value = [];
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-2">
    <!-- 查询条件 -->
    <div class="flex flex-wrap items-center gap-3 rounded bg-white p-3 shadow-sm dark:bg-gray-900">

        <label class="whitespace-nowrap">结算单位</label>
        <InputText v-model="txtSettleUnit" class="w-44" />
        <label class="whitespace-nowrap">订货单位</label>
        <InputText v-model="txtOrderUnit" class="w-44" />
        <label class="whitespace-nowrap">钢种</label>
        <InputText v-model="txtSteelType" class="w-44" />
        <label class="whitespace-nowrap">订单号</label>
        <InputText v-model="txtOrderNo" class="w-44" />
        <label class="whitespace-nowrap">执行标准</label>
        <InputText v-model="txtStandard" class="w-44" />
        <label class="whitespace-nowrap">件次号</label>
        <InputText v-model="txtSeqNo" class="w-44" />
        <label class="whitespace-nowrap">炉号</label>
        <InputText v-model="txtFurnaceNo" class="w-44" />
        <label class="whitespace-nowrap">厚度</label>
        <InputText v-model="txtThick" class="w-44" />
        <label class="whitespace-nowrap">宽度</label>
        <InputText v-model="txtWidth" class="w-44" />
        <label class="whitespace-nowrap">长度</label>
        <InputText v-model="txtLen" class="w-44" />
        <label class="whitespace-nowrap">公差</label>
        <InputText v-model="txtTol" class="w-44" />
        <label class="whitespace-nowrap">产出时间</label>
        <DatePicker v-model="dtS" dateFormat="yy-mm-dd" showIcon />
        <span class="text-gray-400">~</span>
        <DatePicker v-model="dtE" dateFormat="yy-mm-dd" showIcon />
        <label class="whitespace-nowrap">入库标识</label>
        <InputText v-model="txtInboundFlag" class="w-44" />
        <label class="whitespace-nowrap">探伤等级</label>
        <InputText v-model="txtFlawGrade" class="w-44" />
        <label class="whitespace-nowrap">垛位号</label>
        <InputText v-model="txtStackNo" class="w-44" />
        <label class="whitespace-nowrap">切边方式</label>
        <InputText v-model="txtTrimFlag" class="w-44" />
      <Button label="查询" icon="pi pi-search" :loading="querying" @click="onQuery" />
    </div>

    <!-- 工具栏 -->
    <div class="flex items-center justify-between rounded bg-white p-2 shadow-sm dark:bg-gray-900">
      <div class="flex flex-wrap items-center gap-2">
      <Button label="查询" severity="secondary" @click="onbtnQuery" />
      <Button label="取消订单匹配" severity="secondary" @click="onbtnCancelMatch" />
      <Button label="转挂订单" severity="success" @click="onbtnTransfer" />
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue
        class="h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        row-selection="multiple"
        @grid-ready="onGridReady"
      />
    </div>
  </div>
</template>
