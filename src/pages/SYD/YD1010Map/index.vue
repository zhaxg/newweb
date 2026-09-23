<script setup lang="ts">
/** 对应 FrmYD1010Map（库位图管理，菜单代码 YD1003）：DDH.Winforms.SYD.Forms.FrmYD1010Map
 *  已接入：tyd1000Api.queryMap（查询）/ delMap（删除，文案照抄「确认删除库位图[名称]?，删除后不可恢复！」）
 *  待接入：① 新增库位图 → FrmYD1000(isSelected:true) 选库区弹窗（二级弹窗，占位）
 *          ② 库位图设计 → FrmYD1010Design（二级弹窗，占位）
 *          ③ 右侧 SpreadsheetControl xlsx 模板预览（原内嵌 xlsx 字节流渲染，web 无表格渲染设施）
 *  布局：工具栏(查询/新增库位图/删除库位图/库位图设计) → 上下Splitter：上=库位图列表(Tyd1002 6可见) | 下=图预览占位 */
import { ref } from "vue";
import Button from "primevue/button";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconLayoutGrid, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { tyd1000Api, type Tyd1002 } from "@/api/mes4ddh/syd.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/* 原 gridView1：Tyd1002，6 可见 + 3 hide */
const colDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cName", headerName: "名称", width: 220 },
  { field: "cStoreCode", headerName: "库区号", width: 140 },
  { field: "creator", headerName: "创建人", width: 110 },
  { field: "createTime", headerName: "创建时间", width: 170 },
  { field: "lastModifier", headerName: "最后修改人", width: 120 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 170, flex: 1 },
  /* 隐藏列 */
  { field: "id", headerName: "主键", hide: true },
  { field: "cTemplateData", headerName: "模板数据", hide: true },
]);

const rows = ref<Tyd1002[]>([]);
const querying = ref(false);
const api = ref<GridApi | null>(null);
const current = ref<Tyd1002 | null>(null);


/** AG Grid 本版 GridApi 无 selectIndex：用 forEachNode 选中首行 */
function selectFirstRow(gridApi: GridApi | null) {
  if (!gridApi) return;
  let first = true;
  gridApi.forEachNode((node) => {
    if (first) {
      node.setSelected(true, true);
      first = false;
    }
  });
}

function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

function focus(): Tyd1002 | null {
  return (api.value?.getSelectedNodes()[0]?.data as Tyd1002 | undefined) ?? null;
}

/* btnQuery → QueryMap */
async function onQuery() {
  querying.value = true;
  try {
    const list = ((await tyd1000Api.queryMap()) ?? []) as Tyd1002[];
    rows.value = list;
    api.value?.setGridOption("rowData", list);
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
    current.value = list.length ? list[0]! : null;
    if (current.value) {
      selectFirstRow(api.value);
    }
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

function onSelectionChanged() {
  current.value = focus();
}

/* btnAddMap → 新开 FrmYD1000(isSelected:true) 选库区弹窗（占位） */
function onAddMap() {
  toast("选库区新建弹窗（FrmYD1000 选择器模式）待接入", 2500, "warn");
}

/* btnDelMap → DelMap(id) */
async function onDelMap() {
  const row = focus();
  if (!row) {
    toast("请选择后再操作", 2000, "warn");
    return;
  }
  if (!window.confirm(`确认删除库位图[${row.cName}]?，删除后不可恢复！`)) return;
  querying.value = true;
  try {
    await tyd1000Api.delMap(row.id ?? undefined);
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnDesign → FrmYD1010Design（占位） */
function onDesign() {
  if (!focus()) {
    toast("请选择后再操作", 2000, "warn");
    return;
  }
  toast("库位图设计（FrmYD1010Design）待接入", 2500, "warn");
}

onQuery();
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（原 stackPanel1） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAddMap">
        <IconPlus class="h-3 w-3" />新增库位图
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelMap">
        <IconTrash class="h-3 w-3" />删除库位图
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDesign">
        <IconLayoutGrid class="h-3 w-3" />库位图设计
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">库位图（{{ rows.length }}）</span>
    </div>

    <!-- 上下分栏（原 gridControl1 Dock.Top + splitterControl1 + spreadsheetControl1 Dock.Fill） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="45" :minSize="20" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="colDefs"
            :default-col-def="hmxDefaultColDef" :row-data="rows" :locale-text="AG_GRID_LOCALE_CN"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false" :animate-rows="false" :loading="querying"
            @grid-ready="onReady" @selection-changed="onSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <SplitterPanel :size="55" :minSize="20" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">库位图预览</span>
          <span v-if="current" class="ml-2 text-xs text-muted-foreground">{{ current.cName }}</span>
        </div>
        <div class="flex min-h-0 flex-1 items-center justify-center overflow-auto px-4 py-6">
          <!-- 原 SpreadsheetControl 按 CTemplateData（xlsx 字节）渲染，web 无表格渲染设施 → 占位 -->
          <div class="max-w-xl text-center">
            <p class="text-sm text-muted-foreground">库位图预览待接入</p>
            <p class="mt-2 text-xs text-muted-foreground">
              原窗体以内嵌 SpreadsheetControl 加载 xlsx 模板数据渲染；web 侧暂无等价表格渲染设施。
            </p>
          </div>
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
