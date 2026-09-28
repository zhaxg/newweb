<script setup lang="ts">
/** 对应 FrmYD1010Map（库位图管理，菜单 YD1003）：DDH.Winforms.SYD.Forms.FrmYD1010Map
 *  已接入：localStorage mapStore（query/del，不兼容原后端 TemplateByte）
 *  库位图设计 → 新窗 /map-designer?map=<id>（BlankLayout + Univer 按需加载）
 *  新增库位图 → FrmYD1000 选库区弹窗（占位）
 *  预览：web 侧不做内嵌预览，「库位图设计」新窗用 Univer 编辑查看
 *  布局：工具栏 → 库位图列表(Tyd1002) 满幅 */
import { ref } from "vue";
import Button from "primevue/button";
import { IconLayoutGrid, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import type { Tyd1002 } from "@/api/mes4ddh/syd.swagger";
import { useToast } from "@/composables/useToast";
import { delMap, queryMaps, type StoreMapRow } from "./mapStore";

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
  { field: "id", headerName: "主键", hide: true },
  { field: "cTemplateData", headerName: "模板数据", hide: true },
]);

const rows = ref<Tyd1002[]>([]);
const querying = ref(false);
const api = ref<GridApi | null>(null);

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

/* btnQuery → 本地 store */
function onQuery() {
  querying.value = true;
  try {
    const list = queryMaps() as Tyd1002[];
    rows.value = list;
    api.value?.setGridOption("rowData", list);
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
    if (list.length) selectFirstRow(api.value);
  } finally {
    querying.value = false;
  }
}

/* btnAddMap → 选库区弹窗占位 */
function onAddMap() {
  toast("选库区新建弹窗（FrmYD1000 选择器模式）待接入", 2500, "warn");
}

/* btnDelMap */
function onDelMap() {
  const row = focus();
  if (!row) {
    toast("请选择后再操作", 2000, "warn");
    return;
  }
  if (!window.confirm(`确认删除库位图[${row.cName}]?，删除后不可恢复！`)) return;
  delMap(row.id!);
  onQuery();
}

/* btnDesign → 新窗空布局设计器 */
function onDesign() {
  const row = focus();
  if (!row) {
    toast("请选择后再操作", 2000, "warn");
    return;
  }
  window.open(`/map-designer?map=${encodeURIComponent(row.id!)}`, "_blank", "noopener");
}

onQuery();
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（原 stackPanel1） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAddMap">
        <IconPlus class="h-3 w-3" />新增库位图
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelMap">
        <IconTrash class="h-3 w-3" />删除库位图
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onDesign">
        <IconLayoutGrid class="h-3 w-3" />库位图设计
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">库位图（{{ rows.length }}）</span>
    </div>

    <!-- 库位图列表满幅（原下区 spreadsheet 预览占位已去掉，预览走设计新窗） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :column-defs="colDefs"
        :default-col-def="hmxDefaultColDef"
        :row-data="rows"
        :locale-text="AG_GRID_LOCALE_CN"
        :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
        :pagination="false"
        :animate-rows="false"
        :loading="querying"
        @grid-ready="onReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
