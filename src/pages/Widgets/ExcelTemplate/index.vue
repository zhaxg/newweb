<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconDeviceFloppy, IconPlus, IconSearch, IconSettings, IconTrash } from "@tabler/icons-vue";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";

/** 对应 FrmExcelTemplate（EXCEL模板管理）：Hmx.WinForms.Widgets.Bindspreadsheet.FrmExcelTemplate
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

// 列按 Designer.cs VisibleIndex 排序（Selected 由 rowSelection 原生渲染）
const colDefs: ColDef[] = [
  { field: "CCode", headerName: "模板编码", width: 130 },
  { field: "CName", headerName: "模板名称", width: 200 },
  { field: "CEnable", headerName: "启用", width: 70 },
  { field: "Creator", headerName: "创建人", width: 100 },
  { field: "CreateTime", headerName: "创建时间", width: 150 },
  { field: "LastModifier", headerName: "最后修改人", width: 110 },
  { field: "LastModifyTime", headerName: "最后修改时间", width: 150 },
  { field: "CTemplateData", headerName: "模板数据", width: 250 },
];

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
function onAddTemplate() { /* TODO */ }
function onDeleteTemplate() { /* TODO */ }
function onTemplateDesign() { /* TODO */ }
function onSave() { /* TODO */ }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏：无查询条件，仅按钮（按钮顺序按原 Designer.cs） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAddTemplate">
        <IconPlus class="h-3 w-3" />新增模板
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDeleteTemplate">
        <IconTrash class="h-3 w-3" />删除模板
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onTemplateDesign">
        <IconSettings class="h-3 w-3" />模板设计
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">EXCEL模板管理（{{ rows.length }}）</span>
    </div>

    <!-- 上下主子表：上=模板列表，下=Excel 编辑器 -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <!-- 上：模板列表 -->
      <SplitterPanel :size="45" :minSize="25" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">模板列表</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :pagination="false" :animate-rows="false" :loading="querying"
            @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <!-- 下：Excel 编辑器（对应原 spreadsheetControl1） -->
      <SplitterPanel :minSize="25" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">模板编辑器</span>
        </div>
        <div class="flex min-h-0 flex-1 items-center justify-center bg-muted/30">
          <p class="text-xs text-muted-foreground">Excel 模板编辑器（待集成 SpreadSheet 组件）</p>
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
