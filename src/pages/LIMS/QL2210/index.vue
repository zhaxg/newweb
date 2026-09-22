<script setup lang="ts">
/** 对应 FrmQL2210（炉次过程成分查询）：DDH.Winforms.LIMS.Forms.FrmQL2210
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
const passRate = ref("--"); // 对应原 labelControl1 合格率

// 列按 Designer.cs VisibleIndex 排序
const colDefs: ColDef[] = [
  { field: "CStove", headerName: "炉号", width: 100 },
  { field: "CSampleNo", headerName: "试样号", width: 110 },
  { field: "CGw", headerName: "工位", width: 80 },
  { field: "CSgSign", headerName: "钢种", width: 100 },
  { field: "CLineCode", headerName: "产线", width: 80 },
  { field: "CFinalFlag", headerName: "是否最终样", width: 100 },
  { field: "CSpec", headerName: "规格", width: 120 },
  { field: "NCount", headerName: "支数", width: 70 },
  { field: "NWeight", headerName: "重量", width: 80 },
  { field: "CJudgeRemark", headerName: "判定备注", width: 150 },
  { field: "DLastTime", headerName: "判定时间", width: 140 },
  { field: "CAutoJudgeResult", headerName: "自动判定结果", width: 110 },
  { field: "DTestTime", headerName: "结果录入时间", width: 140 },
  { field: "Creator", headerName: "创建人", width: 90 },
  { field: "CreateTime", headerName: "创建时间", width: 140 },
  { field: "LastModifier", headerName: "最后修改人", width: 100 },
  { field: "LastModifyTime", headerName: "最后修改时间", width: 140 },
];

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try {
    rows.value = [];
    passRate.value = "--";
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏：查询按钮 + 合格率 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <span class="ml-4 text-xs text-muted-foreground">合格率：<span class="font-medium text-foreground">{{ passRate }}</span></span>
      <span class="ml-auto text-xs text-muted-foreground">炉次过程成分查询（{{ rows.length }}）</span>
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
