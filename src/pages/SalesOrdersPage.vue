<script setup lang="ts">
import { computed, ref } from "vue";
import { Plus, Trash2, Download, RefreshCw } from "@lucide/vue";
import Button from "primevue/button";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, StatusBar } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { generateSalesOrders, type GridDataset } from "@/data/mock";
import { ensureAgGrid, erpDefaultColDef, erpNullFormatter, makeErpGridTheme } from "@/lib/agGrid";

ensureAgGrid();

const dataset = ref<GridDataset>(generateSalesOrders());
const gridApi = ref<GridApi | null>(null);

const theme = makeErpGridTheme();

const NUMERIC_TYPES = new Set(["integer", "numeric", "bigint"]);

const columnDefs = computed<ColDef[]>(() =>
  dataset.value.columns.map<ColDef>((c) => ({
    colId: c.name,
    field: c.name,
    headerName: c.comment ?? c.name,
    width: c.name === "remark" ? 200 : 120,
    sortable: true,
    resizable: true,
    valueFormatter: erpNullFormatter,
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
}

function exportCsv() {
  gridApi.value?.exportDataAsCsv({ fileName: `sales-orders-${Date.now()}.csv` });
}

function reload() {
  dataset.value = generateSalesOrders();
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-background text-foreground">
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text size="small" label="新增">
        <template #icon><Plus class="h-3.5 w-3.5" /></template>
      </Button>
      <Button text size="small" label="删除">
        <template #icon><Trash2 class="h-3.5 w-3.5" /></template>
      </Button>
      <Button text size="small" label="导出" @click="exportCsv">
        <template #icon><Download class="h-3.5 w-3.5" /></template>
      </Button>
      <div class="mx-1 h-4 w-px bg-border" />
      <Button text size="small" label="刷新" @click="reload">
        <template #icon><RefreshCw class="h-3.5 w-3.5" /></template>
      </Button>
      <div class="min-w-0 flex-1" />
      <span class="truncate text-xs text-muted-foreground">销售订单（{{ dataset.rows.length }} 行 ·
        {{ dataset.columns.length }} 字段）</span>
    </div>

    <div class="min-h-0 flex-1">
      <AgGridVue class="erp-ag-grid h-full w-full" :theme="theme" :column-defs="columnDefs"
        :default-col-def="erpDefaultColDef" :row-data="rows" :pagination="false"
        :locale-text="AG_GRID_LOCALE_CN" :status-bar="statusBar"
        :animate-rows="false"
        :ensure-column-visible-after-sort="false" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
