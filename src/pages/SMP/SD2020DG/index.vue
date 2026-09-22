<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconPlayerPlay, IconSearch, IconX } from "@tabler/icons-vue";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmSD2020DG（带钢/线材/棒材提料管理）：DDH.Winforms.SMP.Forms.FrmSD2020DG
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const txtOrderNo = ref('');
const txtStandard = ref('');
const txtCust = ref('');
const txtSteelType = ref('');
const icboStatus = ref('');
const icboPlanType = ref('');
const dtS = ref<Date | null>(null);
const dtE = ref<Date | null>(null);
const dtPlan = ref<Date | null>(null);
const icboSlabType = ref('');
const icboColdSlab = ref('');

const colDefs = ref<ColDef[]>(([
      { field: 'COrderNo', headerName: '订单号', width: 150 },
      { field: 'NFlag', headerName: '标志', width: 150 },
      { field: 'IsTl', headerName: '是否提料', width: 150 },
      { field: 'COrderCustCname', headerName: '订货客户', width: 150 },
      { field: 'CSteelType', headerName: '品名', width: 150 },
      { field: 'CSgCode', headerName: '钢种', width: 150 },
      { field: 'CSgCodeNk', headerName: '内控钢种', width: 150 },
      { field: 'CSpec', headerName: '规格', width: 150 },
      { field: 'NThick', headerName: '厚度', width: 150 },
      { field: 'NWidth', headerName: '宽度', width: 150 },
      { field: 'NLen', headerName: '长度', width: 150 },
      { field: 'CDelivyStatusDesc', headerName: '交货状态描述', width: 150 },
      { field: 'NNum', headerName: '件数', width: 150 },
      { field: 'NWgt', headerName: '重量', width: 150 },
      { field: 'CTol', headerName: '公差', width: 150 },
      { field: 'CSgStd', headerName: '钢种标准', width: 150 },
      { field: 'CConRemark', headerName: '备注', width: 150 },
      { field: 'NThickTolMin', headerName: '厚度公差最小', width: 150 },
      { field: 'NThickTolMax', headerName: '厚度公差最大', width: 150 },
      { field: 'NWidthTolMin', headerName: '宽度公差最小', width: 150 },
      { field: 'NWidthTolMax', headerName: '宽度公差最大', width: 150 },
      { field: 'CLineCode', headerName: '产线', width: 150 },
      { field: 'CSendUserId', headerName: '销售提报人', width: 150 },
      { field: 'DSendTime', headerName: '发送时间', width: 150 },
      { field: 'CGf', headerName: '平直度', width: 150 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },
]));
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function onbtnQuery() { /* TODO: 接入业务逻辑 */ }
function onbtnBack() { /* TODO: 接入业务逻辑 */ }
function onbtnGenerate() { /* TODO: 接入业务逻辑 */ }
function onbtnClose() { /* TODO: 接入业务逻辑 */ }
function onbtnCancelClose() { /* TODO: 接入业务逻辑 */ }

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
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">

        <label class="whitespace-nowrap">订单号</label>
        <InputText v-model="txtOrderNo" class="w-44" />
        <label class="whitespace-nowrap">执行标准</label>
        <InputText v-model="txtStandard" class="w-44" />
        <label class="whitespace-nowrap">订货客户</label>
        <InputText v-model="txtCust" class="w-44" />
        <label class="whitespace-nowrap">钢种</label>
        <InputText v-model="txtSteelType" class="w-44" />
        <label class="whitespace-nowrap">状态</label>
        <Select v-model="icboStatus" :options="[]" placeholder="请选择" class="w-40" />
        <label class="whitespace-nowrap">计划类型</label>
        <Select v-model="icboPlanType" :options="[]" placeholder="请选择" class="w-40" />
        <label class="whitespace-nowrap">开始时间</label>
        <DatePicker v-model="dtS" dateFormat="yy-mm-dd" showIcon />
        <label class="whitespace-nowrap">截止时间</label>
        <DatePicker v-model="dtE" dateFormat="yy-mm-dd" showIcon />
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onQuery"><IconSearch class="h-3.5 w-3.5" />查询</Button>
    </div>

    <!-- 工具栏 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <div class="flex flex-wrap items-center gap-2">
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onbtnQuery"><IconSearch class="h-3.5 w-3.5" />查询</Button>
      <Button label="退回销售" severity="secondary" @click="onbtnBack" />
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onbtnGenerate"><IconPlayerPlay class="h-3.5 w-3.5" />生成提料单</Button>
      <Button label="订单结案" severity="secondary" @click="onbtnClose" />
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onbtnCancelClose"><IconX class="h-3.5 w-3.5" />取消结案</Button>
      </div>
      <div class="flex items-center gap-3">
        <label class="whitespace-nowrap">计划日期</label>
        <DatePicker v-model="dtPlan" dateFormat="yy-mm-dd" showIcon />
        <label class="whitespace-nowrap">提料坯型</label>
        <InputText v-model="icboSlabType" class="w-44" />
        <label class="whitespace-nowrap">是否冷坯计划</label>
        <InputText v-model="icboColdSlab" class="w-44" />
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
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
