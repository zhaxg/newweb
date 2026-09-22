<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconDeviceFloppy, IconPencil, IconPlus, IconPrinter, IconSearch, IconTrash } from "@tabler/icons-vue";
import InputText from "primevue/inputtext";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";

/** 对应 FrmXtraReportTemplateManager（报表打印模板）：Hmx.WinForms.Widgets.Reportprint.FrmXtraReportTemplateManager
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const keyword = ref("");

// 列按 Designer.cs VisibleIndex 排序
const colDefs: ColDef[] = [
  { field: "Id", headerName: "ID", width: 130 },
  { field: "CDataType", headerName: "数据类型", width: 120 },
  { field: "CreateTime", headerName: "创建时间", width: 150 },
  { field: "LastModifyTime", headerName: "更新时间", width: 150 },
  { field: "CComments", headerName: "说明", width: 250, flex: 1 },
  { field: "NTemplateType", headerName: "模板类型", width: 120 },
  { field: "Creator", headerName: "创建人", width: 100 },
  { field: "LastModifier", headerName: "更新人", width: 100 },
  ];

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
function onAdd() { /* TODO */ }
function onEdit() { /* TODO */ }
function onDelete() { /* TODO */ }
function onSave() { /* TODO */ }
function onPrintMockData() { /* TODO */ }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏：1个条件合并一行，无label用placeholder -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="keyword" maxlength="100" placeholder="关键字" autocapitalize="off" spellcheck="false"
        class="w-48 shrink-0" @keydown.enter="onQuery" />
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onEdit">
        <IconPencil class="h-3 w-3" />编辑
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onPrintMockData">
        <IconPrinter class="h-3 w-3" />打印模拟数据
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">报表打印模板（{{ rows.length }}）</span>
    </div>

    <!-- 数据表格 -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }" :pagination="false" :animate-rows="false" :loading="querying"
        @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
