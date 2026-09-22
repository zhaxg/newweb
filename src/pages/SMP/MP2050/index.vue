<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconArrowDown, IconArrowUp, IconSearch, IconSend } from "@tabler/icons-vue";

import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMP2050（炼钢浇次计划管理）：DDH.Winforms.SMP.Forms.FrmMP2050
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const icboMachine = ref('');
const icboStatus = ref('');
const dtS = ref<Date | null>(null);
const dtE = ref<Date | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CPono', headerName: '制造命令号', width: 120 },
      { field: 'CPlanTime', headerName: '计划时间', width: 120 },
      { field: 'CStrandNo', headerName: '流号', width: 120 },
      { field: 'CCcCode', headerName: 'CCM代码', width: 120 },
      { field: 'NStrandNoSeq', headerName: '炉次流号顺序号', width: 94 },
      { field: 'CJcNo', headerName: '炉次号', width: 120 },
      { field: 'CCcmCode', headerName: '连铸机', width: 120 },
      { field: 'CSgStd', headerName: '执行标准', width: 120 },
      { field: 'CSlabSize', headerName: '钢坯尺寸', width: 120 },
      { field: 'CSgCode', headerName: '钢种', width: 120 },
      { field: 'NSlabLen', headerName: '钢坯长', width: 120 },
      { field: 'CSpec', headerName: '规格', width: 120 },
      { field: 'NLsNum', headerName: '炉数', width: 120 },
      { field: 'NThick', headerName: '厚度', width: 120 },
      { field: 'NSort', headerName: '序号', width: 120 },
      { field: 'NWgtPlan', headerName: '计划重量', width: 120 },
      { field: 'NWidth', headerName: '宽度', width: 120 },
      { field: 'NLen', headerName: '长度', width: 120 },
      { field: 'CLenMx', headerName: '长度明细', width: 120 },
      { field: 'NWgt', headerName: '重量', width: 120 },
      { field: 'NQua', headerName: '支数', width: 120 },
      { field: 'COrderNo', headerName: '订单号', width: 120 },
      { field: 'CSgCodeStd', headerName: '钢种标准', width: 120 },
      { field: 'NSortJc', headerName: '炉次序号', width: 119 },
      { field: 'NIndex', headerName: '炉次计划产出件次序号', width: 120 },
      { field: 'CSpecOrder', headerName: '成品规格', width: 120 },
      { field: 'CSpecZg', headerName: '轧制规格', width: 120 },
      { field: 'CRoute', headerName: '路线', width: 120 },
      { field: 'NThickZg', headerName: '轧制厚度', width: 120 },
      { field: 'CCustName', headerName: '客户名称', width: 120 },
      { field: 'NWidthZg', headerName: '轧制宽度', width: 120 },
      { field: 'CTsyq', headerName: '特殊要求', width: 120 },
      { field: 'NLenZg', headerName: '轧制长度', width: 120 },
      { field: 'NLgCn', headerName: '炉钢号', width: 120 },
      { field: 'CDelFlag', headerName: '删除标识', width: 120 },
      { field: 'CRemark', headerName: '备注', width: 120 },
      { field: 'CZGLineCode', headerName: '轧制产线', width: 120 },
      { field: 'CStovePlanId', headerName: '炉次计划id', width: 120 },
      { field: 'CLineCode', headerName: '产线', width: 120 },
      { field: 'CStove', headerName: '炉号', width: 120 },
      { field: 'CPieceNo', headerName: '件次号', width: 120 },
      { field: 'CPrintCode', headerName: '喷印号', width: 120 },
      { field: 'CMatCode', headerName: '钢坯物料号', width: 120 },
      { field: 'CMatName', headerName: '钢坯物料名称', width: 120 },
      { field: 'CStNo', headerName: '炼钢工艺卡', width: 120 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },
]));
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function onbtnQuery() { /* TODO: 接入业务逻辑 */ }
function onbtnSend() { /* TODO: 接入业务逻辑 */ }
function onbtnUp() { /* TODO: 接入业务逻辑 */ }
function onbtnDown() { /* TODO: 接入业务逻辑 */ }
function onbtnSaveOrder() { /* TODO: 接入业务逻辑 */ }
function onbtnDeleteCast() { /* TODO: 接入业务逻辑 */ }
function onbtnVoid() { /* TODO: 接入业务逻辑 */ }
function onbtnDeleteFurnace() { /* TODO: 接入业务逻辑 */ }

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

        <label class="whitespace-nowrap">连铸机</label>
        <Select v-model="icboMachine" :options="[]" placeholder="请选择" class="w-40" />
        <label class="whitespace-nowrap">状态</label>
        <Select v-model="icboStatus" :options="[]" placeholder="请选择" class="w-40" />
        <label class="whitespace-nowrap">浇次下发时间</label>
        <DatePicker v-model="dtS" dateFormat="yy-mm-dd" showIcon />
        <span class="text-gray-400">~</span>
        <DatePicker v-model="dtE" dateFormat="yy-mm-dd" showIcon />
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onQuery"><IconSearch class="h-3.5 w-3.5" />查询</Button>
    </div>

    <!-- 工具栏 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <div class="flex flex-wrap items-center gap-2">
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onbtnQuery"><IconSearch class="h-3.5 w-3.5" />查询</Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onbtnSend"><IconSend class="h-3.5 w-3.5" />下发</Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onbtnUp"><IconArrowUp class="h-3.5 w-3.5" />上移</Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onbtnDown"><IconArrowDown class="h-3.5 w-3.5" />下移</Button>
      <Button label="保存顺序" severity="secondary" @click="onbtnSaveOrder" />
      <Button label="删除浇次" severity="danger" @click="onbtnDeleteCast" />
      <Button label="浇次作废" severity="danger" @click="onbtnVoid" />
      <Button label="删除炉次" severity="danger" @click="onbtnDeleteFurnace" />
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
