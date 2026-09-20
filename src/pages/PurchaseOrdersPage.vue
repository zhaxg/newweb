<script setup lang="ts">
import { computed, ref } from "vue";
import { Plus, Trash2, Download, RefreshCw } from "@lucide/vue";
import Button from "primevue/button";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, StatusBar } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { generatePurchaseOrders, type PurchaseDataset } from "@/data/mock";
import { ensureAgGrid, hmxDefaultColDef, hmxNullFormatter, makeHmxGridTheme } from "@/lib/agGrid";

ensureAgGrid();

const dataset = ref<PurchaseDataset>(generatePurchaseOrders(10000));
const gridApi = ref<GridApi | null>(null);

const theme = makeHmxGridTheme();

const columnDefs = computed<ColDef[]>(() => [
  ...dataset.value.fields.map<ColDef>((f) => ({
    colId: f.field,
    field: f.field,
    headerName: f.headerName,
    width: f.width ?? 120,
    sortable: true,
    resizable: true,
    valueFormatter: hmxNullFormatter,
    ...(f.numeric ? { type: "numericColumn" } : {}),
  })),
]);

// 内置状态栏：划选单元格自动聚合 SUM / AVG（企业版 agAggregationComponent），右侧显示总行数
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
  gridApi.value?.exportDataAsCsv({ fileName: `purchase-orders-${Date.now()}.csv` });
}

function reload() {
  dataset.value = generatePurchaseOrders(10000);
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
      <span class="truncate text-xs text-muted-foreground">采购订单（{{ dataset.rows.length }} 行 · {{ dataset.fields.length
        }} 字段）</span>
    </div>

    <div class="min-h-0 flex-1">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="columnDefs"
        :default-col-def="hmxDefaultColDef" :row-data="dataset.rows" :pagination="false"
        :locale-text="AG_GRID_LOCALE_CN" :status-bar="statusBar"
        :animate-rows="false"
        :ensure-column-visible-after-sort="false" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
