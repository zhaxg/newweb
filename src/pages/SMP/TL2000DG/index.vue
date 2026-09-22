<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTL2000DG（带钢/线材/棒材评审管理）：DDH.Winforms.SMP.Forms.FrmTL2000DG
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const txtOrderNo = ref('');
const dtS = ref<Date | null>(null);
const dtE = ref<Date | null>(null);
const txtSteelType = ref('');
const txtCust = ref('');
const icboStatus = ref('');

const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 116 },
      { field: 'CCool', headerName: '冷却', width: 114 },
      { field: 'NTlStatus', headerName: '提料状态', width: 100 },
      { field: 'CPlanTime', headerName: '计划时间', width: 114 },
      { field: 'COrderNo', headerName: '提料计划号', width: 150 },
      { field: 'COrderCustCname', headerName: '订货客户', width: 100 },
      { field: 'COrderNo1', headerName: '订单号1', width: 100 },
      { field: 'CSgCode', headerName: '钢种', width: 150 },
      { field: 'CSgStd', headerName: '钢种标准', width: 150 },
      { field: 'NThick', headerName: '厚度', width: 150 },
      { field: 'NWidth', headerName: '宽度', width: 116 },
      { field: 'CSpec', headerName: '成品规格', width: 150 },
      { field: 'NNum', headerName: '件数', width: 116 },
      { field: 'CTol', headerName: '公差', width: 100 },
      { field: 'CTlSgCode', headerName: '提料钢种', width: 100 },
      { field: 'NSlabThick', headerName: '坯料厚度', width: 100 },
      { field: 'NSlabWidth', headerName: '坯料宽度', width: 100 },
      { field: 'NSlabQua', headerName: '坯料数量', width: 100 },
      { field: 'NWgtUnit', headerName: '单位重量', width: 100 },
      { field: 'NSlabLenMin', headerName: '坯料最小长度', width: 100 },
      { field: 'NSlabWgt', headerName: '坯料重量', width: 100 },
      { field: 'CSlabSize', headerName: '钢坯尺寸', width: 100 },
      { field: 'NThickTolMin', headerName: '厚度公差最小', width: 100 },
      { field: 'NThickTolMax', headerName: '厚度公差最大', width: 100 },
      { field: 'NWidthTolMin', headerName: '宽度公差最小', width: 100 },
      { field: 'NWidthTolMax', headerName: '宽度公差最大', width: 100 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },,
]));
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function onbtnQuery() { /* TODO: 接入业务逻辑 */ }
function onbtnAudit() { /* TODO: 接入业务逻辑 */ }
function onbtnCancelAudit() { /* TODO: 接入业务逻辑 */ }
function onbtnDelete() { /* TODO: 接入业务逻辑 */ }
function onbtnClose() { /* TODO: 接入业务逻辑 */ }

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

        <label class="whitespace-nowrap">订单号</label>
        <InputText v-model="txtOrderNo" class="w-44" />
        <label class="whitespace-nowrap">开始时间</label>
        <DatePicker v-model="dtS" dateFormat="yy-mm-dd" showIcon />
        <label class="whitespace-nowrap">截止时间</label>
        <DatePicker v-model="dtE" dateFormat="yy-mm-dd" showIcon />
        <label class="whitespace-nowrap">钢种</label>
        <InputText v-model="txtSteelType" class="w-44" />
        <label class="whitespace-nowrap">订货客户</label>
        <InputText v-model="txtCust" class="w-44" />
        <label class="whitespace-nowrap">状态</label>
        <Select v-model="icboStatus" :options="[]" placeholder="请选择" class="w-40" />
      <Button label="查询" icon="pi pi-search" :loading="querying" @click="onQuery" />
    </div>

    <!-- 工具栏 -->
    <div class="flex items-center justify-between rounded bg-white p-2 shadow-sm dark:bg-gray-900">
      <div class="flex flex-wrap items-center gap-2">
      <Button label="查询" severity="secondary" @click="onbtnQuery" />
      <Button label="审核" severity="secondary" @click="onbtnAudit" />
      <Button label="取消审核" severity="secondary" @click="onbtnCancelAudit" />
      <Button label="删除" severity="danger" @click="onbtnDelete" />
      <Button label="已审提料生产关闭" severity="secondary" @click="onbtnClose" />
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
