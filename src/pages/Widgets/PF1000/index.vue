<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";

/** 对应 FrmPF1000（数据源管理）：Hmx.WinForms.Widgets.CalculateItemForm.FrmPF1000
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

// 列按 Designer.cs VisibleIndex 排序
const colDefs: ColDef[] = [
  { field: "ItemType", headerName: "指标类型", width: 100 },
  { field: "ItemCode", headerName: "指标代码", width: 120 },
  { field: "ItemName", headerName: "指标名称", width: 180 },
  { field: "Description", headerName: "描述", width: 250, flex: 1 },
  { field: "ItemCalType", headerName: "计算类型", width: 100 },
  { field: "Unit", headerName: "单位", width: 80 },
  { field: "Source", headerName: "数据源", width: 150 },
  { field: "SourceDescription", headerName: "数据源描述", width: 200 },
];

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
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏：无查询条件，仅查询按钮 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">数据源管理（{{ rows.length }}）</span>
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
        :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
        :pagination="false"
        :animate-rows="false"
        :loading="querying"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
