<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch, IconSettings, IconTrash, IconUpload } from "@tabler/icons-vue";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmSD2000SYL（中厚板试验料订单查询）：DDH.Winforms.SMP.Forms.FrmSD2000SYL
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const icboLine = ref('');
const txtSteelType = ref('');
const dtS = ref<Date | null>(null);
const dtE = ref<Date | null>(null);
const icboStatus = ref('');
const icboPlanType = ref('');
const txtCust = ref('');
const txtOrderNo = ref('');

const colDefs = ref<ColDef[]>(([
      { field: 'COrderNo', headerName: '订单号', width: 100 },
      { field: 'COrderCustNo', headerName: '订货客户编号', width: 100 },
      { field: 'COrderCustCname', headerName: '订货客户', width: 100 },
      { field: 'CSteelType', headerName: '品名', width: 100 },
      { field: 'CSgCode', headerName: '钢种', width: 100 },
      { field: 'NOrderProcFlag', headerName: '处理标志', width: 100 },
      { field: 'CDesignDesc', headerName: '质量设计失败说明', width: 100 },
      { field: 'NThick', headerName: '厚度', width: 100 },
      { field: 'NThickMin', headerName: '最小厚度', width: 100 },
      { field: 'NThickMax', headerName: '最大厚度', width: 100 },
      { field: 'NWidth', headerName: '宽度', width: 100 },
      { field: 'NWidthMin', headerName: '最小宽度', width: 100 },
      { field: 'NWidthMax', headerName: '最大宽度', width: 100 },
      { field: 'NWidthWgt', headerName: '宽重', width: 100 },
      { field: 'CLengthType', headerName: '长度类型', width: 100 },
      { field: 'NLenMin', headerName: '最小长度', width: 100 },
      { field: 'NLenMax', headerName: '最大长度', width: 100 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 100 },
      { field: 'CDelivyStatusDesc', headerName: '交货状态描述', width: 100 },
      { field: 'NNum', headerName: '件数', width: 100 },
      { field: 'NWgt', headerName: '重量', width: 100 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 100 },
      { field: 'COverstepBl', headerName: '超差', width: 100 },
      { field: 'CDelivyQtyFlag', headerName: '交货数量标志', width: 100 },
      { field: 'CTol', headerName: '公差', width: 100 },
      { field: 'CFlawDesc', headerName: '表面缺陷', width: 100 },
      { field: 'CConNo', headerName: '合同号', width: 100 },
      { field: 'CSgStd', headerName: '钢种标准', width: 100 },
      { field: 'DJhqTime', headerName: '计划日期', width: 100 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 100 },
      { field: 'CSpecialMarkGy', headerName: '特殊标记工艺', width: 100 },
      { field: 'NWtMax', headerName: '最大重量', width: 100 },
      { field: 'NWtMin', headerName: '最小重量', width: 100 },
      { field: 'CSpec', headerName: '规格', width: 100 },
      { field: 'CConRemark', headerName: '合同备注', width: 100 },
      { field: 'CInboundNo', headerName: '入库单号', width: 100 },
      { field: 'CExitem1', headerName: '是否工程单', width: 100 },
      { field: 'COrderTypeDesc', headerName: '订单性质说明', width: 60 },
      { field: 'DTimeShipment', headerName: '发货时间', width: 100 },
      { field: 'CLineCode', headerName: '产线', width: 100 },
      { field: 'DOrderProcTime', headerName: '合同处理时间', width: 100 },
      { field: 'CSendUserId', headerName: '销售提报人', width: 100 },
      { field: 'DSendTime', headerName: '发送时间', width: 100 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },
]));
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function onbtnQuery() { /* TODO: 接入业务逻辑 */ }
function onbtnDelete() { /* TODO: 接入业务逻辑 */ }
function onbtnSend() { /* TODO: 接入业务逻辑 */ }
function onbtnImport() { /* TODO: 接入业务逻辑 */ }
function onbtnQualityDesign() { /* TODO: 接入业务逻辑 */ }

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

        <label class="whitespace-nowrap">产线</label>
        <Select v-model="icboLine" :options="[]" placeholder="请选择" class="w-40" />
        <label class="whitespace-nowrap">钢种</label>
        <InputText v-model="txtSteelType" class="w-44" />
        <label class="whitespace-nowrap">开始时间</label>
        <DatePicker v-model="dtS" dateFormat="yy-mm-dd" showIcon />
        <label class="whitespace-nowrap">截止时间</label>
        <DatePicker v-model="dtE" dateFormat="yy-mm-dd" showIcon />
        <label class="whitespace-nowrap">状态</label>
        <Select v-model="icboStatus" :options="[]" placeholder="请选择" class="w-40" />
        <label class="whitespace-nowrap">计划类型</label>
        <Select v-model="icboPlanType" :options="[]" placeholder="请选择" class="w-40" />
        <label class="whitespace-nowrap">订货客户</label>
        <InputText v-model="txtCust" class="w-44" />
        <label class="whitespace-nowrap">订单号</label>
        <InputText v-model="txtOrderNo" class="w-44" />
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onQuery"><IconSearch class="h-3.5 w-3.5" />查询</Button>
    </div>

    <!-- 工具栏 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <div class="flex flex-wrap items-center gap-2">
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onbtnQuery"><IconSearch class="h-3.5 w-3.5" />查询</Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onbtnDelete"><IconTrash class="h-3.5 w-3.5" />删除订单</Button>
      <Button label="下发排产" severity="success" @click="onbtnSend" />
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onbtnImport"><IconUpload class="h-3.5 w-3.5" />批量导入订单</Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onbtnQualityDesign"><IconSettings class="h-3.5 w-3.5" />质量设计</Button>
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
