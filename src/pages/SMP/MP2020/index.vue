<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconPlayerPlay, IconSearch, IconTrash } from "@tabler/icons-vue";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMP2020（轧钢计划管理）：DDH.Winforms.SMP.Forms.FrmMP2020
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const txtOrderNo = ref('');
const txtSteelType = ref('');
const dtS = ref<Date | null>(null);
const dtE = ref<Date | null>(null);
const icboStatus = ref('');

const colDefs = ref<ColDef[]>(([
      { field: 'CLineCode', headerName: '产线', width: 150 },
      { field: 'NOrder', headerName: '排序', width: 150 },
      { field: 'CPlanTime', headerName: '计划时间', width: 150 },
      { field: 'CCool', headerName: '冷却', width: 150 },
      { field: 'COrderNo', headerName: '订单号', width: 150 },
      { field: 'CIsMerge', headerName: '合并', width: 150 },
      { field: 'COrderNo1', headerName: '订单号1', width: 150 },
      { field: 'COrderNo2', headerName: '订单号2', width: 150 },
      { field: 'COrderNo3', headerName: '订单号3', width: 150 },
      { field: 'COrderNo4', headerName: '订单号4', width: 150 },
      { field: 'NLenTq1', headerName: '套切1', width: 150 },
      { field: 'NLenTq2', headerName: '套切2', width: 150 },
      { field: 'NLenTq3', headerName: '套切3', width: 150 },
      { field: 'NLenTq4', headerName: '套切4', width: 150 },
      { field: 'CSgCode', headerName: '钢种', width: 150 },
      { field: 'CSgStd', headerName: '钢种标准', width: 150 },
      { field: 'CSpec', headerName: '规格', width: 150 },
      { field: 'NPlanedWgt', headerName: '计划重量', width: 150 },
      { field: 'NThick', headerName: '厚度', width: 150 },
      { field: 'NThickMin', headerName: '最小厚度', width: 150 },
      { field: 'NThickMax', headerName: '最大厚度', width: 150 },
      { field: 'NWidth', headerName: '宽度', width: 150 },
      { field: 'NWidthMin', headerName: '最小宽度', width: 150 },
      { field: 'NWidthMax', headerName: '最大宽度', width: 150 },
      { field: 'NLen', headerName: '长度', width: 150 },
      { field: 'CLengthType', headerName: '长度类型', width: 150 },
      { field: 'NLenMin', headerName: '最小长度', width: 150 },
      { field: 'NLenMax', headerName: '最大长度', width: 150 },
      { field: 'CSteelType', headerName: '品名', width: 150 },
      { field: 'CProdCode', headerName: '产品代码', width: 150 },
      { field: 'NDbc', headerName: '单重', width: 150 },
      { field: 'NBc', headerName: '倍尺', width: 150 },
      { field: 'NNum', headerName: '件数', width: 150 },
      { field: 'CSlabSource', headerName: '坯料来源', width: 150 },
      { field: 'CTlSgCode', headerName: '提料钢种', width: 150 },
      { field: 'CTlSgStd', headerName: '提料钢种标准', width: 150 },
      { field: 'CSlabSize', headerName: '钢坯尺寸', width: 150 },
      { field: 'NSlabThick', headerName: '坯料厚度', width: 150 },
      { field: 'NSlabWidth', headerName: '坯料宽度', width: 150 },
      { field: 'NSlabLen', headerName: '钢坯长', width: 150 },
      { field: 'NSlabQua', headerName: '坯料数量', width: 150 },
      { field: 'NWgtUnit', headerName: '单位重量', width: 150 },
      { field: 'NRate', headerName: '收得率', width: 150 },
      { field: 'NSlabWgt', headerName: '坯料重量', width: 150 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 150 },
      { field: 'CCustStdCode', headerName: '客户标准', width: 150 },
      { field: 'COrderCustNo', headerName: '订货客户编号', width: 150 },
      { field: 'COrderCustCname', headerName: '订货客户', width: 150 },
      { field: 'COrderCustEname', headerName: '订货客户英文名', width: 150 },
      { field: 'CProductH', headerName: '产品大类', width: 150 },
      { field: 'COrderTypeCode', headerName: '订单类型', width: 150 },
      { field: 'CExportFlag', headerName: '出口标志', width: 150 },
      { field: 'DOrderTime', headerName: '订单时间', width: 150 },
      { field: 'DJhqTime', headerName: '计划日期', width: 150 },
      { field: 'CSlabType', headerName: '坯型', width: 150 },
      { field: 'CConRemark', headerName: '合同备注', width: 150 },
      { field: 'CSpecialMarkGy', headerName: '特殊标记工艺', width: 150 },
      { field: 'CWarrantyDesc', headerName: '质保描述', width: 150 },
      { field: 'CPackCode', headerName: '包装代码', width: 150 },
      { field: 'CDelivyQtyFlag', headerName: '交货数量标志', width: 150 },
      { field: 'CDeptCode', headerName: '部门编码', width: 150 },
      { field: 'NFlag', headerName: '标志', width: 150 },
      { field: 'CProdName', headerName: '产品名称', width: 150 },
      { field: 'CDelivyStatusDesc', headerName: '交货状态描述', width: 150 },
      { field: 'CCustStdDesc', headerName: '客户标准描述', width: 150 },
      { field: 'NWtMax', headerName: '最大重量', width: 150 },
      { field: 'NWtMin', headerName: '最小重量', width: 150 },
      { field: 'NWidthWgt', headerName: '宽重', width: 150 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 150 },
      { field: 'CFlawDesc', headerName: '表面缺陷', width: 150 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 150 },
      { field: 'CTol', headerName: '公差', width: 150 },
      { field: 'COverstepBl', headerName: '超差', width: 150 },
      { field: 'CInboundNo', headerName: '入库单号', width: 150 },
      { field: 'CShape', headerName: '形状', width: 150 },
      { field: 'CSlabRemark', headerName: '坯料备注', width: 150 },
      { field: 'CTlOrderFlag', headerName: '提料订单标志', width: 150 },
      { field: 'CStNo', headerName: '炉号', width: 150 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },
]));
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function onbtnQuery() { /* TODO: 接入业务逻辑 */ }
function onbtnGenerate() { /* TODO: 接入业务逻辑 */ }
function onbtnDelete() { /* TODO: 接入业务逻辑 */ }

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
        <label class="whitespace-nowrap">钢种</label>
        <InputText v-model="txtSteelType" class="w-44" />
        <label class="whitespace-nowrap">评审时间</label>
        <DatePicker v-model="dtS" dateFormat="yy-mm-dd" showIcon />
        <span class="text-gray-400">~</span>
        <DatePicker v-model="dtE" dateFormat="yy-mm-dd" showIcon />
        <label class="whitespace-nowrap">订单状态</label>
        <Select v-model="icboStatus" :options="[]" placeholder="请选择" class="w-40" />
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onQuery"><IconSearch class="h-3.5 w-3.5" />查询</Button>
    </div>

    <!-- 工具栏 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <div class="flex flex-wrap items-center gap-2">
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onbtnQuery"><IconSearch class="h-3.5 w-3.5" />查询</Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onbtnGenerate"><IconPlayerPlay class="h-3.5 w-3.5" />生成</Button>
      <Button text size="small" severity="danger" class="shrink-0 whitespace-nowrap" @click="onbtnDelete"><IconTrash class="h-3.5 w-3.5" />删除</Button>
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
