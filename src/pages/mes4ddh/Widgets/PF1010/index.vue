<script setup lang="ts">
/** 对应 FrmPF1010（作业指标管理）：Hmx.WinForms.Widgets.CalculateItemForm.FrmPF1010
 *  画面迁移，逻辑不迁移到 */

import { ref } from "vue";
import Button from "primevue/button";
import { IconCalculator, IconPencil, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

// 列与 Designer.cs 一模一样：前 18 列按 VisibleIndex 排序；Id/CFactoryId/CWorkshopCode 未声明
// Visible（原窗体按 DevExpress 默认显示，后两者在 code-behind 挂了代码格式化器），随列集带在末尾
const colDefs = ref<ColDef[]>([
  { field: "CFactoryType", headerName: "厂别", width: 90 },
  { field: "CItemType", headerName: "指标分类", width: 100 },
  { field: "CItemCode", headerName: "指标代码", width: 130 },
  { field: "CItemName", headerName: "指标名称", width: 180 },
  { field: "CUnit", headerName: "单位", width: 70 },
  { field: "NRoundPoint", headerName: "小数位数", width: 90 },
  { field: "CFormula", headerName: "计算公式", width: 200 },
  { field: "CFormulaDesc", headerName: "公式描述", width: 220 },
  { field: "FormulaStatus", headerName: "公式状态", width: 90 },
  { field: "FormulaErrorMsg", headerName: "错误消息", width: 160 },
  { field: "Creator", headerName: "创建人", width: 90 },
  { field: "CreateTime", headerName: "创建时间", width: 140 },
  { field: "LastModifier", headerName: "最后修改人", width: 100 },
  { field: "LastModifyTime", headerName: "最后修改时间", width: 140 },
  { field: "CParentItemCode", headerName: "父级编码", width: 120 },
  { field: "CRefrenceCodes", headerName: "引用项", width: 140 },
  { field: "CRefrenceFormula", headerName: "引用项公式", width: 180 },
  { field: "Id", headerName: "主键", width: 220 },
  { field: "CFactoryId", headerName: "工厂编码", width: 110 },
  { field: "CWorkshopCode", headerName: "车间编号", width: 110 },
]);

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

async function onQuery() {
  querying.value = true;
  try {
    rows.value = [];
  } finally {
    querying.value = false;
  }
}
function onadd() {
  /* TODO */
}
function onedit() {
  /* TODO */
}
function ondelete() {
  /* TODO */
}
function oncalcCurrentMonth() {
  /* TODO */
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏：对应 stackPanel1（Dock=Top，5 按钮：查询/添加/编辑/删除/计算当月）；原窗体无查询条件输入 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery"
        ><IconSearch class="h-3 w-3" />查询</Button
      >
      <Button text class="shrink-0 whitespace-nowrap" @click="onadd"><IconPlus class="h-3 w-3" />添加</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onedit"><IconPencil class="h-3 w-3" />编辑</Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="ondelete"
        ><IconTrash class="h-3 w-3" />删除</Button
      >
      <Button text class="shrink-0 whitespace-nowrap" @click="oncalcCurrentMonth"
        ><IconCalculator class="h-3 w-3" />计算当月</Button
      >
    </div>
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
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
