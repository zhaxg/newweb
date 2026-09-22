<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconPencil, IconPlus, IconSearch, IconSettings, IconTrash } from "@tabler/icons-vue";
import InputText from "primevue/inputtext";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";

/** 对应 FrmPFReport（指标报表管理）：Hmx.WinForms.Widgets.CalculateItemForm.FrmPFReport
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const items = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
const itemGridApi = ref<GridApi | null>(null);

const keyword = ref("");

// 主表：报表列表（按 VisibleIndex 排序）
const reportColDefs: ColDef[] = [
  { field: "CCode", headerName: "报表代码", width: 120 },
  { field: "CName", headerName: "报表名称", width: 180 },
  { field: "NTimeRange", headerName: "时间范围", width: 100 },
  { field: "NShiftGroup", headerName: "班次组", width: 100 },
  { field: "NStyle", headerName: "样式", width: 100 },
  { field: "CDesc", headerName: "描述", width: 250 },
  { field: "Creator", headerName: "创建人", width: 90 },
  { field: "CreateTime", headerName: "创建时间", width: 140 },
  { field: "LastModifier", headerName: "最后修改人", width: 100 },
  { field: "LastModifyTime", headerName: "最后修改时间", width: 140 },
];

// 子表：报表项目列表（按 VisibleIndex 排序）
const itemColDefs: ColDef[] = [
  { field: "CItemCode", headerName: "指标代码", width: 120 },
  { field: "CItemName", headerName: "指标名称", width: 180 },
  { field: "CItemType", headerName: "指标类型", width: 100 },
  { field: "CUnit", headerName: "单位", width: 80 },
  { field: "NRoundPoint", headerName: "小数位", width: 80 },
  { field: "CFormula", headerName: "公式", width: 200 },
  { field: "CFormulaDesc", headerName: "公式描述", width: 200 },
  { field: "CFactoryId", headerName: "工厂", width: 100 },
  { field: "CWorkshopCode", headerName: "车间", width: 100 },
  { field: "CParentItemCode", headerName: "父指标", width: 120 },
];

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }
function onItemGridReady(e: GridReadyEvent) { itemGridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try {
    rows.value = [];
    items.value = [];
    // 查询回填后 bestFit：延迟一帧等布局完成
    requestAnimationFrame(() => {
      gridApi.value?.autoSizeAllColumns();
      itemGridApi.value?.autoSizeAllColumns();
    });
  } finally {
    querying.value = false;
  }
}
function onAddReport() { /* TODO */ }
function onEditReport() { /* TODO */ }
function onConfigReportItems() { /* TODO */ }
function onDeleteReport() { /* TODO */ }
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
      <Button text class="shrink-0 whitespace-nowrap" @click="onAddReport">
        <IconPlus class="h-3 w-3" />添加报表
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onEditReport">
        <IconPencil class="h-3 w-3" />编辑报表
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onConfigReportItems">
        <IconSettings class="h-3 w-3" />配置报表项目
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDeleteReport">
        <IconTrash class="h-3 w-3" />删除报表
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">指标报表管理（{{ rows.length }}）</span>
    </div>

    <!-- 上下主子表 -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <!-- 上：报表列表（主表） -->
      <SplitterPanel :size="45" :minSize="30" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">报表列表</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="reportColDefs" :row-data="rows"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }" :pagination="false" :animate-rows="false" :loading="querying"
            @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <!-- 下：报表项目列表（子表） -->
      <SplitterPanel :minSize="25" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">报表项目列表</span>
          <span class="ml-auto text-xs text-muted-foreground">项目（{{ items.length }}）</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="itemColDefs" :row-data="items"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }" :pagination="false" :animate-rows="false"
            @grid-ready="onItemGridReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
