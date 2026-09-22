<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";
import InputText from "primevue/inputtext";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTI1050（喷印实绩明细）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1050
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const ItemForCSlabNo = ref("");
const ItemForCZpNo = ref("");
const ItemForTimeRange = ref("");
const ItemForCSaleCon = ref("");
const ItemForCCrewCode = ref("");
const ItemForNOrderThick = ref("");
const ItemForNOrderWidth = ref("");
const ItemForCTrimFlag = ref("");
const colDefs = ref<ColDef[]>(([
      { field: 'CCustName', headerName: '客户名称', width: 112 },
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
      { field: 'DPrintTime', headerName: '打印时间', width: 112 },
      { field: 'CShiftGroup', headerName: '班组', width: 112 },
      { field: 'CShiftNo', headerName: '结果录入班次', width: 112 },
      { field: 'CInSlabNo', headerName: '入口材料号', width: 112 },
      { field: 'CGlSonNo', headerName: '管理子板号', width: 112 },
      { field: 'CBestSurface', headerName: '好面朝向', width: 112 },
      { field: 'CTOrdNum', headerName: '头侧合同数', width: 112 },
      { field: 'TPartMark', headerName: '头侧取板记号', width: 112 },
      { field: 'TProductSum', headerName: '头侧成品板总数', width: 112 },
      { field: 'CTdsLth', headerName: '头侧剪切长度(头部)', width: 112 },
      { field: 'CBdsLth', headerName: '头侧剪切长度(尾部)', width: 112 },
      { field: 'CTLthMark', headerName: '头侧是否余长标记', width: 112 },
      { field: 'DRollingTimeStart', headerName: '轧制开始时间', width: 112 },
      { field: 'NRollingTimeEnd', headerName: '轧制结束时刻', width: 112 },
      { field: 'CPosition', headerName: '岗位', width: 112 },
      { field: 'CName', headerName: '名称', width: 112 },
      { field: 'NDsTemp', headerName: '剪切温度', width: 112 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },
]));
function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function onbtnQuery() { /* TODO: 接入业务逻辑 */ }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <label class="whitespace-nowrap">板坯号</label>
      <InputText v-model="ItemForCSlabNo" class="w-40" />
      <label class="whitespace-nowrap">组批号</label>
      <InputText v-model="ItemForCZpNo" class="w-40" />
      <label class="whitespace-nowrap">喷印时间</label>
      <InputText v-model="ItemForTimeRange" class="w-40" />
      <label class="whitespace-nowrap">销售合同号</label>
      <InputText v-model="ItemForCSaleCon" class="w-40" />
      <label class="whitespace-nowrap">机组代码</label>
      <InputText v-model="ItemForCCrewCode" class="w-40" />
      <label class="whitespace-nowrap">目标厚</label>
      <InputText v-model="ItemForNOrderThick" class="w-40" />
      <label class="whitespace-nowrap">目标宽</label>
      <InputText v-model="ItemForNOrderWidth" class="w-40" />
      <label class="whitespace-nowrap">切边标记</label>
      <InputText v-model="ItemForCTrimFlag" class="w-40" />
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onQuery"><IconSearch class="h-3.5 w-3.5" />查询</Button>
    </div>
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onbtnQuery"><IconSearch class="h-3.5 w-3.5" />查询</Button>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
