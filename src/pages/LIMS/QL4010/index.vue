<script setup lang="ts">
/** 对应 FrmQL4010（检验结果保存记录）：DDH.Winforms.LIMS.Forms.FrmQL4010
 *  已接入：testJobApi.queryHistory（只读查询，无保存）
 *  偏差：原 Designer 的「委托单号」LabelControl 按 ui-rules §6 单条件查询区改用 placeholder；
 *       红色提示 label 保留原样 */
import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { testJobApi, type Tql4100History } from "@/api/mes4ddh/lims.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

const testNo = ref("");
const rows = ref<Tql4100History[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

const colDefs = ref<ColDef[]>([
  { field: "cTestNo", headerName: "委托单号", width: 130 },
  { field: "creator", headerName: "操作人", width: 90 },
  { field: "createTime", headerName: "操作时间", width: 140 },
  { field: "cIp", headerName: "IP地址", width: 120 },
  { field: "cSampleNo", headerName: "试样号", width: 110 },
  { field: "cTestItemTypeDesc", headerName: "试验项目种类描述", width: 150 },
  { field: "cTestItemName", headerName: "试验项目名称", width: 130 },
  { field: "cTestSubItemName", headerName: "试验子项名称", width: 130 },
  { field: "cValue", headerName: "试验结果", width: 110 },
  { field: "cTestItemType", headerName: "试验项目种类", width: 120 },
  { field: "cTestItem", headerName: "试验项目", width: 100 },
  { field: "cTestSubItem", headerName: "试验子项", width: 100 },
  { field: "id", headerName: "主键", hide: true },
  { field: "cTql4000Id", headerName: "试样ID", hide: true },
  { field: "selected", headerName: "选择", hide: true },
]);

/* 原 simpleButton1_Click：空校验 → QueryHistory(textEdit1.Text) → 回填 + BestFitColumns */
async function onQuery() {
  const trimmed = testNo.value?.trim();
  if (!trimmed) {
    toast("请输入委托单号", 2000, "warn");
    return;
  }
  querying.value = true;
  try {
    rows.value = (await testJobApi.queryHistory(testNo.value)) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="testNo" placeholder="委托单号" class="h-7 w-36 text-xs" @keyup.enter="onQuery" />
      <Button variant="outlined" :loading="querying" class="shrink-0 whitespace-nowrap" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询</Button>
      <span class="ml-2 text-xs text-destructive">*保存记录数据量较大，为保证查询性能，仅支持输入<b>完整</b>委托单号查询</span>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows" :pagination="false"
        @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
