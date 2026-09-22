<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTI1030（定尺剪剪切实绩）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1030
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const ItemForCSlabNo = ref("");
const ItemForCZpNo = ref("");
const ItemForCCardNo = ref("");
const ItemForCTrimFlag = ref("");
const ItemForCCrewCode = ref("");
const ItemForTimeRange = ref("");
const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 112 },
      { field: 'CCustName', headerName: '客户名称', width: 112 },
      { field: 'CreatTime', headerName: '创建时间', width: 112 },
      { field: 'CSaleCon', headerName: '销售合同号', width: 112 },
      { field: 'CSonNo', headerName: '子板号', width: 112 },
      { field: 'CSlabNo', headerName: '板坯号', width: 112 },
      { field: 'CZpNo', headerName: '组批号', width: 112 },
      { field: 'CSgCode', headerName: '钢种', width: 112 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 112 },
      { field: 'DCenterThick', headerName: '中心厚度', width: 112 },
      { field: 'DSonThick', headerName: '子板厚mm', width: 112 },
      { field: 'DSonWidth', headerName: '子板宽mm', width: 112 },
      { field: 'DSonLen', headerName: '子板长mm', width: 112 },
      { field: 'DSonWgt', headerName: '子板理重T', width: 112 },
      { field: 'DSmallWgt', headerName: '小板实重', width: 112 },
      { field: 'DPlanThick', headerName: '目标厚mm', width: 112 },
      { field: 'DPlanWidth', headerName: '目标宽mm', width: 112 },
      { field: 'DPlanLen', headerName: '目标长mm', width: 112 },
      { field: 'DPlanWgt', headerName: '目标理论T', width: 112 },
      { field: 'CCrewCode', headerName: '机组代码', width: 112 },
      { field: 'DDsTime', headerName: 'CS剪切时间', width: 112 },
      { field: 'CShiftGroup', headerName: '班组', width: 112 },
      { field: 'CShiftNo', headerName: '结果录入班次', width: 112 },
      { field: 'CInSlabNo', headerName: '入口材料号', width: 112 },
      { field: 'CGlSonNo', headerName: '管理子板号', width: 112 },
      { field: 'CBestSurface', headerName: '好面朝向', width: 112 },
      { field: 'CTOrdNum', headerName: '头侧合同数', width: 112 },
      { field: 'CTPartMark', headerName: '头侧取板记号', width: 112 },
      { field: 'CTProductSum', headerName: '头侧成品板总数', width: 112 },
      { field: 'CTdsLth', headerName: '头侧剪切长度(头部)', width: 112 },
      { field: 'CBdsLth', headerName: '头侧剪切长度(尾部)', width: 112 },
      { field: 'CTLthMark', headerName: '头侧是否余长标记', width: 112 },
      { field: 'COperatorId', headerName: '操作者', width: 112 },
      { field: 'CPosition', headerName: '岗位', width: 112 },
      { field: 'CName', headerName: '名称', width: 112 },
      { field: 'DDsTemp', headerName: '剪切温度', width: 112 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },,
]));
function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function onbtnQuery() { /* TODO: 接入业务逻辑 */ }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-2">
    <div class="flex flex-wrap items-center gap-3 rounded bg-white p-3 shadow-sm dark:bg-gray-900">
      <label class="whitespace-nowrap">板坯号</label>
      <InputText v-model="ItemForCSlabNo" class="w-40" />
      <label class="whitespace-nowrap">组批号</label>
      <InputText v-model="ItemForCZpNo" class="w-40" />
      <label class="whitespace-nowrap">钢种</label>
      <InputText v-model="ItemForCCardNo" class="w-40" />
      <label class="whitespace-nowrap">切边方式</label>
      <InputText v-model="ItemForCTrimFlag" class="w-40" />
      <label class="whitespace-nowrap">机组代码</label>
      <InputText v-model="ItemForCCrewCode" class="w-40" />
      <label class="whitespace-nowrap">创建时间</label>
      <InputText v-model="ItemForTimeRange" class="w-40" />
      <Button label="查询" icon="pi pi-search" :loading="querying" @click="onQuery" />
    </div>
    <div class="flex items-center gap-2 rounded bg-white p-2 shadow-sm dark:bg-gray-900">
      <Button label="查询" severity="secondary" @click="onbtnQuery" />
    </div>
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
