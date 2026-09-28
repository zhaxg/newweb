<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconCheck, IconDeviceFloppy, IconEye, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";

/** 对应 FrmTableConfig（配置表管理）：Hmx.WinForms.Widgets.TableConfig.FrmTableConfig
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const props = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
const propGridApi = ref<GridApi | null>(null);

const keyword = ref("");

// 基表列（按 VisibleIndex 排序）
const tableColDefs: ColDef[] = [
  { field: "CTbName", headerName: "表名称", width: 200 },
  { field: "CValidFlag", headerName: "有效标志", width: 90 },
  { field: "CTbCode", headerName: "表编码", width: 150 },
  { field: "CRemark", headerName: "备注", width: 150, flex: 1 },
  { field: "CLoaderFullName", headerName: "加载器", width: 250 },
  { field: "CreateTime", headerName: "创建时间", width: 140 },
  { field: "Creator", headerName: "创建人", width: 90 },
  { field: "LastModifyTime", headerName: "最后修改时间", width: 140 },
  { field: "LastModifier", headerName: "最后修改人", width: 100 },
];

// 属性列（按 VisibleIndex 排序）
const propColDefs: ColDef[] = [
  { field: "CProName", headerName: "属性名称", width: 150 },
  { field: "CProCode", headerName: "属性编码", width: 130 },
  { field: "CTbCode", headerName: "表编码", width: 120 },
  { field: "CVisible", headerName: "可见", width: 70 },
  { field: "NSourceType", headerName: "数据源类型", width: 100 },
  { field: "CSourceCode", headerName: "数据源编码", width: 130 },
  { field: "CSourceQuerystring", headerName: "数据源参数", width: 150 },
  { field: "CLoaderFullName", headerName: "加载器", width: 200 },
  { field: "NSeq", headerName: "序号", width: 70 },
  { field: "CRemark", headerName: "备注", width: 120, flex: 1 },
  { field: "CreateTime", headerName: "创建时间", width: 140 },
  { field: "Creator", headerName: "创建人", width: 90 },
  { field: "LastModifyTime", headerName: "最后修改时间", width: 140 },
  { field: "LastModifier", headerName: "最后修改人", width: 100 },
];

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}
function onPropGridReady(e: GridReadyEvent) {
  propGridApi.value = e.api;
}

async function onQuery() {
  querying.value = true;
  try {
    rows.value = [];
    props.value = [];
  } finally {
    querying.value = false;
  }
}
function onAddBaseTable() {
  /* TODO */
}
function onDeleteBaseTable() {
  /* TODO */
}
function onSaveBaseTable() {
  /* TODO */
}
function onApplyChange() {
  /* TODO */
}
function onPreviewConfig() {
  /* TODO */
}
function onAddProp() {
  /* TODO */
}
function onDeleteProp() {
  /* TODO */
}
function onSaveProp() {
  /* TODO */
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏：关键字 + 所有基表操作按钮（1个条件合并一行） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <label class="shrink-0 whitespace-nowrap text-xs text-muted-foreground">关键字</label>
      <InputText
        v-model="keyword"
        maxlength="100"
        placeholder="关键字"
        autocapitalize="off"
        spellcheck="false"
        class="w-48 shrink-0"
        @keydown.enter="onQuery"
      />
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAddBaseTable">
        <IconPlus class="h-3 w-3" />添加基表
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDeleteBaseTable">
        <IconTrash class="h-3 w-3" />删除基表
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onSaveBaseTable">
        <IconDeviceFloppy class="h-3 w-3" />保存基表
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onApplyChange">
        <IconCheck class="h-3 w-3" />修改生效
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onPreviewConfig">
        <IconEye class="h-3 w-3" />预览配置表
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">配置表管理（{{ rows.length }}）</span>
    </div>

    <!-- 主区：左右 Splitter（主表列头与子表工具栏同高） -->
    <Splitter class="min-h-0 flex-1" layout="horizontal">
      <!-- 左栏：基表主表 -->
      <SplitterPanel :size="45" :minSize="30" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">基表列表</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="tableColDefs"
            :row-data="rows"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false"
            :animate-rows="false"
            :loading="querying"
            @grid-ready="onGridReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <!-- 右栏：属性子表，工具栏与主表列头同高 -->
      <SplitterPanel :minSize="30" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <span class="shrink-0 text-xs font-medium text-muted-foreground">属性列表</span>
          <span class="flex-1" />
          <Button text class="shrink-0 whitespace-nowrap" @click="onAddProp">
            <IconPlus class="h-3 w-3" />添加属性
          </Button>
          <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDeleteProp">
            <IconTrash class="h-3 w-3" />删除
          </Button>
          <Button text class="shrink-0 whitespace-nowrap" @click="onSaveProp">
            <IconDeviceFloppy class="h-3 w-3" />保存
          </Button>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="propColDefs"
            :row-data="props"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false"
            :animate-rows="false"
            @grid-ready="onPropGridReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
