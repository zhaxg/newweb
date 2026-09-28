<script setup lang="ts">
import { onMounted, ref } from "vue";
import Button from "primevue/button";
import { IconPencil, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import InputText from "primevue/inputtext";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import {
  hmxDefaultColDef,
  hmxGridOptions,
  makeHmxGridTheme,
  autoSizeOnFirstData,
  autoSizeOnGridReady,
  bestFitGrid,
} from "@/lib/agGrid";

/** 对应 FrmTAVersion（移动端管理）：DDH.Winforms.SMP.Forms.FrmTAVersion
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const creator = ref("");

// 页内假数据（10条），方便预览列宽和布局
const mockRows = Array.from({ length: 10 }, (_, i) => ({
  Selected: false,
  Creator: ["admin", "zhangsan", "lisi", "wangwu", "zhaoliu"][i % 5],
  CreateTime: `2026-09-${String(i + 1).padStart(2, "0")} 10:30:00`,
  NCode: `V1.${i}.0`,
  CName: `移动端版本 ${i + 1}`,
  CNote: `这是第 ${i + 1} 条版本说明，用于展示表格布局与列宽自适应效果。`,
  NType: [0, 1, 2][i % 3],
  LastModifier: ["admin", "zhangsan", "lisi"][i % 3],
  LastModifyTime: `2026-09-${String(i + 11).padStart(2, "0")} 14:00:00`,
}));

const rows = ref<any[]>([...mockRows]);

// 列按 Designer.cs VisibleIndex 排序
const colDefs: ColDef[] = [
  { field: "Creator", headerName: "创建人", width: 112 },
  { field: "CreateTime", headerName: "创建时间", width: 140 },
  { field: "NCode", headerName: "版本号", width: 100 },
  { field: "CName", headerName: "名称", width: 180 },
  { field: "CNote", headerName: "说明", width: 250, flex: 1 },
  { field: "NType", headerName: "类型", width: 100 },
  { field: "LastModifier", headerName: "最后修改人", width: 110 },
  { field: "LastModifyTime", headerName: "最后修改时间", width: 140 },
];

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
  bestFitGrid(e.api);
}

function onGridSizeChanged() {
  autoSizeOnGridReady(gridApi.value!);
}

onMounted(() => {
  bestFitGrid(gridApi.value);
});

async function onQuery() {
  querying.value = true;
  try {
    // 演示：回填假数据触发 bestFit
    rows.value = [...mockRows];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } finally {
    querying.value = false;
  }
}
function onAdd() {
  /* TODO */
}
function onEdit() {
  /* TODO */
}
function onDelete() {
  /* TODO */
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏：1个条件合并一行，无label用placeholder -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText
        v-model="creator"
        maxlength="100"
        placeholder="创建人"
        autocapitalize="off"
        spellcheck="false"
        class="w-48 shrink-0"
        @keydown.enter="onQuery"
      />
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAdd"> <IconPlus class="h-3 w-3" />添加 </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onEdit"> <IconPencil class="h-3 w-3" />修改 </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">移动端管理（{{ rows.length }}）</span>
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
        :suppress-column-virtualisation="true"
        :row-selection="{
          mode: 'multiRow',
          checkboxes: true,
          headerCheckbox: true,
          enableClickSelection: true,
          enableSelectionWithoutKeys: true,
        }"
        :cell-selection="true"
        :pagination="false"
        :animate-rows="false"
        :loading="querying"
        @grid-ready="onGridReady"
        @grid-size-changed="onGridSizeChanged"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
