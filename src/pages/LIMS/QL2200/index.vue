<script setup lang="ts">
/** 对应 FrmQL2200（炉次成分查询）：DDH.Winforms.LIMS.Forms.FrmQL2200
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

// 列按 Designer.cs VisibleIndex 0-11 排序（隐藏列 CSgStd/CGw 及审计列不在原画面中）
const colDefs: ColDef[] = [
      { field: "CStove", headerName: "CStove", width: 120 },
      { field: "CSampleNo", headerName: "CSampleNo", width: 120 },
      { field: "CSgSign", headerName: "CSgSign", width: 120 },
      { field: "CLineCode", headerName: "CLineCode", width: 120 },
      { field: "CFinalFlag", headerName: "CFinalFlag", width: 120 },
      { field: "CSpec", headerName: "CSpec", width: 120 },
      { field: "NCount", headerName: "NCount", width: 120 },
      { field: "NWeight", headerName: "NWeight", width: 120 },
      { field: "CJudgeRemark", headerName: "CJudgeRemark", width: 120 },
      { field: "DLastTime", headerName: "DLastTime", width: 120 },
      { field: "CAutoJudgeResult", headerName: "CAutoJudgeResult", width: 120 },
      { field: "DTestTime", headerName: "DTestTime", width: 120 },
      { field: "CGw", headerName: "CGw", width: 120 },
      { field: "CSgStd", headerName: "CSgStd", width: 120 },
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
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏：无查询条件，仅查询按钮 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">炉次成分查询（{{ rows.length }}）</span>
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
