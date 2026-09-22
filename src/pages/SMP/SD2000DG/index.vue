<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmSD2000DG（线材/棒材/带钢/商品坯订单管理）：DDH.Winforms.SMP.Forms.FrmSD2000DG
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs: ColDef[] = [
  { field: "COrderNo", headerName: "订单号", width: 150 },
  { field: "NOrderProcFlag", headerName: "处理标志", width: 150 },
  { field: "CDesignDesc", headerName: "设计描述", width: 150 },
  { field: "IsTl", headerName: "是否提料", width: 150 },
  { field: "COrderCustNo", headerName: "订货客户编号", width: 150 },
  { field: "COrderCustCname", headerName: "订货客户", width: 150 },
  { field: "CSteelType", headerName: "品名", width: 150 },
  { field: "CSgCode", headerName: "钢种", width: 150 },
  { field: "CSgCodeNk", headerName: "内控钢种", width: 150 },
  { field: "CSpec", headerName: "规格", width: 150 },
  { field: "NThick", headerName: "厚度", width: 150 },
  { field: "NWidth", headerName: "宽度", width: 150 },
  { field: "NLen", headerName: "长度", width: 150 },
  { field: "CDelivyStatusDesc", headerName: "交货状态描述", width: 150 },
  { field: "NNum", headerName: "件数", width: 150 },
  { field: "NWgt", headerName: "重量", width: 150 },
  { field: "CSgStd", headerName: "钢种标准", width: 150 },
  { field: "CConRemark", headerName: "备注", width: 150 },
  { field: "DJhqTime", headerName: "计划日期", width: 150 },
  { field: "NThickTolMin", headerName: "厚度公差最小", width: 150 },
  { field: "NThickTolMax", headerName: "厚度公差最大", width: 150 },
  { field: "NWidthTolMin", headerName: "宽度公差最小", width: 150 },
  { field: "NWidthTolMax", headerName: "宽度公差最大", width: 150 },
  { field: "CLineCode", headerName: "产线", width: 150 },
  { field: "NFlag", headerName: "标志", width: 150 },
  { field: "CSendUserId", headerName: "销售提报人", width: 150 },
  { field: "DSendTime", headerName: "发送时间", width: 150 },
  { field: "CShape", headerName: "产品大类", width: 150 },
  { field: "CGf", headerName: "平直度", width: 150 },
  { field: "Creator", headerName: "创建人", width: 112 },
  { field: "CreateTime", headerName: "创建时间", width: 112 },
  { field: "LastModifier", headerName: "最后修改人", width: 112 },
  { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },
];

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

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
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">订单管理（{{ rows.length }}）</span>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
        :suppress-column-virtualisation="true"
        :pagination="false"
        :animate-rows="false"
        :loading="querying"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
