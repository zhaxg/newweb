<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTsMatrl（物料查询）：DDH.Winforms.SMP.Forms.FrmTsMatrl
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs: ColDef[] = [
  { field: "CMatCode", headerName: "钢坯物料号", width: 149 },
  { field: "CMatName", headerName: "钢坯物料名称", width: 149 },
  { field: "CMatGroupCode", headerName: "物料组编码", width: 149 },
  { field: "CMatGroupName", headerName: "物料组名称", width: 149 },
  { field: "CSgCode", headerName: "钢种", width: 149 },
  { field: "CSpec", headerName: "规格", width: 149 },
  { field: "NThick", headerName: "厚度", width: 149 },
  { field: "NWidth", headerName: "宽度", width: 149 },
  { field: "NLen", headerName: "长度", width: 149 },
  { field: "NWeight", headerName: "重量", width: 149 },
  { field: "Creator", headerName: "创建人", width: 112 },
  { field: "CreateTime", headerName: "创建时间", width: 112 },
  { field: "LastModifier", headerName: "最后修改人", width: 112 },
  { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },
];

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function onbtnSync() {
  /* TODO: 接入业务逻辑 */
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
      <Button text class="shrink-0 whitespace-nowrap" @click="onbtnSync">同步物料</Button>
      <span class="ml-auto text-xs text-muted-foreground">物料查询（{{ rows.length }}）</span>
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
