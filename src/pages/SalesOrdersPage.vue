<script setup lang="ts">
import { computed, ref } from "vue";
import { IconDownload, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-vue";
import Button from "primevue/button";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, StatusBar } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { generateSalesOrders, type GridDataset } from "@/mock/data/mock";
import { autoSizeOnFirstData, hmxDefaultColDef, hmxNullFormatter, makeHmxGridTheme } from "@/lib/agGrid";

/** 销售管理 · 销售订单（demo 列表页，非 WinForms 迁移）
 *  2026-09-22 已完成精修 */

const dataset = ref<GridDataset>(generateSalesOrders());
const gridApi = ref<GridApi | null>(null);

const theme = makeHmxGridTheme();

const NUMERIC_TYPES = new Set(["integer", "numeric", "bigint"]);

const columnDefs = computed<ColDef[]>(() =>
  dataset.value.columns.map<ColDef>((c) => ({
    colId: c.name,
    field: c.name,
    headerName: c.comment ?? c.name,
    width: c.name === "remark" ? 200 : 120,
    sortable: true,
    resizable: true,
    valueFormatter: hmxNullFormatter,
    ...(NUMERIC_TYPES.has(c.type) ? { type: "numericColumn" } : {}),
    ...(c.type === "boolean"
      ? { valueFormatter: undefined, cellRenderer: (p: { value: unknown }) => (p.value == null ? "" : p.value ? "是" : "否") }
      : {}),
  })),
);

const rows = computed(() =>
  dataset.value.rows.map((row) =>
    Object.fromEntries(dataset.value.columns.map((c, i) => [c.name, row[i]])),
  ),
);

const statusBar: StatusBar = {
  statusPanels: [
    { statusPanel: "agAggregationComponent", statusPanelParams: { aggFuncs: ["sum", "avg"] } },
    { statusPanel: "agTotalRowCountComponent", align: "right" },
  ],
};

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
  requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
}

function exportCsv() {
  gridApi.value?.exportDataAsCsv({ fileName: `sales-orders-${Date.now()}.csv` });
}

function reload() {
  dataset.value = generateSalesOrders();
  requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-background text-foreground">
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap"><IconPlus class="h-3 w-3" />新增</Button>
      <Button text class="shrink-0 whitespace-nowrap"><IconTrash class="h-3 w-3" />删除</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="exportCsv"><IconDownload class="h-3 w-3" />导出</Button>
      <div class="mx-1 h-4 w-px bg-border" />
      <Button text class="shrink-0 whitespace-nowrap" @click="reload"><IconRefresh class="h-3 w-3" />刷新</Button>
      <div class="min-w-0 flex-1" />
      <span class="truncate text-xs text-muted-foreground">销售订单（{{ dataset.rows.length }} 行 ·
        {{ dataset.columns.length }} 字段）</span>
    </div>

    <div class="min-h-0 flex-1">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :column-defs="columnDefs"
        :default-col-def="hmxDefaultColDef"
        :row-data="rows"
        :pagination="false"
        :locale-text="AG_GRID_LOCALE_CN"
        :status-bar="statusBar"
        :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
        :animate-rows="false"
        :ensure-column-visible-after-sort="false"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
