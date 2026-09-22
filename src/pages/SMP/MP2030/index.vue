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

/** 对应 FrmMP2030（炼钢计划排产）：DDH.Winforms.SMP.Forms.FrmMP2030
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const dtS = ref<Date | null>(null);
const dtE = ref<Date | null>(null);
const txtSteelType = ref('');
const icboStatus = ref('');
const icboLine = ref('');

const colDefs = ref<ColDef[]>(([
      { field: 'CPono', headerName: '制造命令号', width: 120 },
      { field: 'CSgCode', headerName: '钢种', width: 120 },
      { field: 'Selected', headerName: '选择', width: 60 },
      { field: 'NOrder', headerName: '排序', width: 120 },
      { field: 'CSgStd', headerName: '执行标准', width: 120 },
      { field: 'CPlanTime', headerName: '计划时间', width: 120 },
      { field: 'CStrandNo', headerName: '流号', width: 120 },
      { field: 'NQua', headerName: '支数', width: 120 },
      { field: 'NStrandNoSeq', headerName: '炉次流号顺序号', width: 94 },
      { field: 'CCcCode', headerName: 'CCM代码', width: 120 },
      { field: 'NSlabLen', headerName: '钢坯长', width: 120 },
      { field: 'COrderNo', headerName: '订单号', width: 120 },
      { field: 'CJcNo', headerName: '炉次号', width: 120 },
      { field: 'CSlabSize', headerName: '钢坯尺寸', width: 120 },
      { field: 'NThick', headerName: '厚度', width: 120 },
      { field: 'CSteelType', headerName: '品名', width: 120 },
      { field: 'NWgtPlan', headerName: '计划重量', width: 120 },
      { field: 'NWidth', headerName: '宽度', width: 120 },
      { field: 'NLen', headerName: '长度', width: 120 },
      { field: 'NSlabThick', headerName: '坯料厚度', width: 120 },
      { field: 'NWgt', headerName: '重量', width: 120 },
      { field: 'NSlabWidth', headerName: '坯料宽度', width: 120 },
      { field: 'CSpec', headerName: '规格', width: 120 },
      { field: 'NSlabLenMin', headerName: '钢坯长度', width: 120 },
      { field: 'CSgCodeStd', headerName: '钢种标准', width: 120 },
      { field: 'NSlabQua', headerName: '坯料数量', width: 120 },
      { field: 'NIndex', headerName: '炉次计划产出件次序号', width: 120 },
      { field: 'NSlabWgt', headerName: '坯料重量', width: 120 },
      { field: 'CSpecZg', headerName: '轧制规格', width: 120 },
      { field: 'NSlabWgtSy', headerName: '坯料余量', width: 95 },
      { field: 'NThickZg', headerName: '轧制厚度', width: 120 },
      { field: 'NWidthZg', headerName: '轧制宽度', width: 120 },
      { field: 'NSort', headerName: '序号', width: 120 },
      { field: 'NLenZg', headerName: '轧制长度', width: 120 },
      { field: 'CSpecOrder', headerName: '成品规格', width: 120 },
      { field: 'CDelFlag', headerName: '删除标识', width: 120 },
      { field: 'NSortJc', headerName: '炉次序号', width: 119 },
      { field: 'CRoute', headerName: '路线', width: 120 },
      { field: 'DJhqTime', headerName: '计划日期', width: 120 },
      { field: 'CCustName', headerName: '客户名称', width: 120 },
      { field: 'CZGLineCode', headerName: '轧制产线', width: 95 },
      { field: 'CRemark', headerName: '备注', width: 120 },
      { field: 'NWgtMeter', headerName: '米重', width: 120 },
      { field: 'CStovePlanId', headerName: '炉次计划id', width: 120 },
      { field: 'CLineCode', headerName: '产线', width: 120 },
      { field: 'CStove', headerName: '炉号', width: 120 },
      { field: 'CPieceNo', headerName: '件次号', width: 120 },
      { field: 'CPrintCode', headerName: '喷印号', width: 120 },
      { field: 'CMatCode', headerName: '钢坯物料号', width: 120 },
      { field: 'CMatName', headerName: '钢坯物料名称', width: 82 },
      { field: 'CStNo', headerName: '炼钢工艺卡', width: 120 },
]));
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function onbtnQuery() { /* TODO: 接入业务逻辑 */ }
function onbtnGenerate() { /* TODO: 接入业务逻辑 */ }
function onbtnAutoGenerate() { /* TODO: 接入业务逻辑 */ }

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

        <label class="whitespace-nowrap">销售下发时间</label>
        <DatePicker v-model="dtS" dateFormat="yy-mm-dd" showIcon />
        <span class="text-gray-400">~</span>
        <DatePicker v-model="dtE" dateFormat="yy-mm-dd" showIcon />
        <label class="whitespace-nowrap">钢种</label>
        <InputText v-model="txtSteelType" class="w-44" />
        <label class="whitespace-nowrap">计划状态</label>
        <Select v-model="icboStatus" :options="[]" placeholder="请选择" class="w-40" />
        <label class="whitespace-nowrap">轧制产线</label>
        <Select v-model="icboLine" :options="[]" placeholder="请选择" class="w-40" />
      <Button label="查询" icon="pi pi-search" :loading="querying" @click="onQuery" />
    </div>

    <!-- 工具栏 -->
    <div class="flex items-center justify-between rounded bg-white p-2 shadow-sm dark:bg-gray-900">
      <div class="flex flex-wrap items-center gap-2">
      <Button label="查询" severity="secondary" @click="onbtnQuery" />
      <Button label="生成炉次" severity="secondary" @click="onbtnGenerate" />
      <Button label="自动生成炉次" severity="secondary" @click="onbtnAutoGenerate" />
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
