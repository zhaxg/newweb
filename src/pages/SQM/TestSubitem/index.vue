<script setup lang="ts">
/** 对应 FrmTestSubitem（试验子项目维护）：DDH.Winforms.SQM.Forms.Basic.FrmTestSubitem
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { IconPencil, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const keyword = ref("");

// 列按 Designer.cs 排序
const colDefs: ColDef[] = [
      { field: "TestItemType", headerName: "TestItemType", width: 120 },
      { field: "TestItemCode", headerName: "TestItemCode", width: 120 },
      { field: "TestSubItemCode", headerName: "TestSubItemCode", width: 120 },
      { field: "TestSubItemName", headerName: "TestSubItemName", width: 120 },
      { field: "DlDxFlag", headerName: "DlDxFlag", width: 120 },
      { field: "Unit", headerName: "Unit", width: 120 },
      { field: "Other1", headerName: "Other1", width: 120 },
      { field: "Other2", headerName: "Other2", width: 120 },
      { field: "Other3", headerName: "Other3", width: 120 },
      { field: "Other4", headerName: "Other4", width: 120 },
      { field: "Other5", headerName: "Other5", width: 120 },
      { field: "Other6", headerName: "Other6", width: 120 },
      { field: "Other7", headerName: "Other7", width: 120 },
      { field: "Other8", headerName: "Other8", width: 120 },
      { field: "Seq", headerName: "Seq", width: 120 },
      { field: "TestItemTypeDesc", headerName: "TestItemTypeDesc", width: 120 },
      { field: "TestItemName", headerName: "TestItemName", width: 120 },
      { field: "TableCode", headerName: "TableCode", width: 120 },
];;

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try {
    rows.value = [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } finally {
    querying.value = false;
  }
}
function onAdd() { /* TODO */ }
function onEdit() { /* TODO */ }
function onDelete() { /* TODO */ }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏：1个条件合并一行，无label用placeholder -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="keyword" maxlength="100" placeholder="关键字" class="w-48 shrink-0" @keydown.enter="onQuery" />
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onEdit">
        <IconPencil class="h-3 w-3" />编辑
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">试验子项目维护（{{ rows.length }}）</span>
    </div>

    <!-- 数据表格 -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
        :suppress-column-virtualisation="true"
        :pagination="false" :animate-rows="false" :loading="querying"
        @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
