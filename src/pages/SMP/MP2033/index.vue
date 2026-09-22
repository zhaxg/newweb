<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconDeviceFloppy, IconSearch } from "@tabler/icons-vue";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMP2033（炼钢总厂中厚板计划排产）：DDH.Winforms.SMP.Forms.FrmMP2033
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const dtS = ref<Date | null>(null);
const dtE = ref<Date | null>(null);
const icboLine = ref('');
const icboStatus = ref('');
const txtThick = ref('');
const txtWidth = ref('');
const txtLen = ref('');
const txtFurnaceCapacity = ref('');
const txtSlabWidth = ref('');
const txtRemark = ref('');

const colDefs = ref<ColDef[]>(([
      { field: 'NSortJc', headerName: '炉次序号', width: 60 },
      { field: 'CPlanTime', headerName: '计划时间', width: 120 },
      { field: 'NOrder', headerName: '排序', width: 120 },
      { field: 'CPono', headerName: 'PONO', width: 83 },
      { field: 'StoveSgCode', headerName: '炉次钢种', width: 120 },
      { field: 'CSgCode', headerName: '钢种', width: 120 },
      { field: 'COrderNo', headerName: '订单号', width: 120 },
      { field: 'CStrandNo', headerName: '流号', width: 120 },
      { field: 'NStrandNoSeq', headerName: '炉流序号', width: 74 },
      { field: 'NLen', headerName: '长度', width: 120 },
      { field: 'CSteelType', headerName: '品名', width: 120 },
      { field: 'NThickZg', headerName: '轧制厚度', width: 120 },
      { field: 'CSpec', headerName: '规格', width: 120 },
      { field: 'CBackup', headerName: '备注', width: 60 },
      { field: 'NSlabThick', headerName: '坯料厚度', width: 120 },
      { field: 'CSgStd', headerName: '钢种标准', width: 120 },
      { field: 'NSlabWidth', headerName: '坯料宽度', width: 120 },
      { field: 'NThick', headerName: '厚度', width: 120 },
      { field: 'NSlabLenMin', headerName: '钢坯长度', width: 120 },
      { field: 'NWidth', headerName: '宽度', width: 120 },
      { field: 'NSlabQua', headerName: '坯料数量', width: 120 },
      { field: 'NWgt', headerName: '重量', width: 120 },
      { field: 'NSlabWgt', headerName: '坯料重量', width: 120 },
      { field: 'NStrandNoSeqPlanTime', headerName: '计划日期件次顺序号', width: 118 },
      { field: 'NSlabWgtSy', headerName: '坯料余量', width: 95 },
      { field: 'NStrandNoSeq1PlanTime', headerName: '计划日期流号一切顺序号', width: 142 },
      { field: 'CSpecOrder', headerName: '成品规格', width: 120 },
      { field: 'CZGLineCode', headerName: '轧制产线', width: 95 },
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
function onbtnSave() { /* TODO: 接入业务逻辑 */ }

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

        <label class="whitespace-nowrap">销售下发时间</label>
        <DatePicker v-model="dtS" dateFormat="yy-mm-dd" showIcon />
        <span class="text-gray-400">~</span>
        <DatePicker v-model="dtE" dateFormat="yy-mm-dd" showIcon />
        <label class="whitespace-nowrap">轧制产线</label>
        <Select v-model="icboLine" :options="[]" placeholder="请选择" class="w-40" />
        <label class="whitespace-nowrap">计划状态</label>
        <Select v-model="icboStatus" :options="[]" placeholder="请选择" class="w-40" />
        <label class="whitespace-nowrap">厚度</label>
        <InputText v-model="txtThick" class="w-44" />
        <label class="whitespace-nowrap">宽度</label>
        <InputText v-model="txtWidth" class="w-44" />
        <label class="whitespace-nowrap">长度</label>
        <InputText v-model="txtLen" class="w-44" />
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onQuery"><IconSearch class="h-3.5 w-3.5" />查询</Button>
    </div>

    <!-- 工具栏 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <div class="flex flex-wrap items-center gap-2">
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onbtnQuery"><IconSearch class="h-3.5 w-3.5" />查询</Button>
      <Button label="生成炉次及切割计划" severity="secondary" @click="onbtnGenerate" />
      <Button label="删除炉次及切割计划" severity="danger" @click="onbtnDelete" />
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onbtnSave"><IconDeviceFloppy class="h-3.5 w-3.5" />保存</Button>
      </div>
      <div class="flex items-center gap-3">
        <label class="whitespace-nowrap">计算用炉容量</label>
        <InputText v-model="txtFurnaceCapacity" class="w-44" />
        <label class="whitespace-nowrap">钢坯宽度</label>
        <InputText v-model="txtSlabWidth" class="w-44" />
        <label class="whitespace-nowrap">生产备注</label>
        <InputText v-model="txtRemark" class="w-44" />
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
