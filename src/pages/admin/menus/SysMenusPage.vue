<script setup lang="ts">
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { Component } from "vue";
import {
  BarChart3,
  Boxes,
  Braces,
  Building2,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  GitCommitVertical,
  LayoutDashboard,
  ListTree,
  MousePointerClick,
  Network,
  Package,
  Pencil,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "@lucide/vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import { AgGridVue } from "ag-grid-vue3";
import type { AutoGroupColumnDef, ColDef, GetRowIdParams, GridApi, GridReadyEvent, RowClickedEvent, RowNode, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { ensureAgGrid, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import RescBtnListDialog from "./RescBtnListDialog.vue";
import RescEditDialog from "./RescEditDialog.vue";
import { buildRescTree, loadRescs, newRescId, saveRescs, type HmxRes } from "@/data/rescs";

ensureAgGrid();

const { toast } = useToast();

const theme = makeHmxGridTheme();

/** 资源图标名 → lucide 组件（对应数据模块 ICON_NAMES） */
const ICON_MAP: Record<string, Component> = {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Building2,
  ShieldCheck,
  ListTree,
  Braces,
  ScrollText,
  FileText,
  Settings,
  Wallet,
  TrendingUp,
  BarChart3,
  Boxes,
  Truck,
};

interface RescGridRow extends HmxRes {
  path: string[];
  childCount: number;
}

const rows = ref<HmxRes[]>([]);
/** 展开的组节点 id；数据替换后重放 */
const expandedIds = ref<Set<string>>(new Set());
const selectedId = ref<string | null>(null);
const gridApi = ref<GridApi | null>(null);

const editOpen = ref(false);
const editTarget = ref<HmxRes | null>(null);
const editPresetPid = ref<string | null>(null);
const editPresetRow = ref<HmxRes | null>(null);

const btnOpen = ref(false);
const btnTarget = ref<HmxRes | null>(null);

const confirmOpen = ref(false);
const confirmTarget = ref<HmxRes | null>(null);

const tree = computed(() => buildRescTree(rows.value));

const gridRows = computed<RescGridRow[]>(() => {
  const out: RescGridRow[] = [];
  const walk = (nodes: ReturnType<typeof buildRescTree>, path: string[]) => {
    for (const n of nodes) {
      const { children, ...rest } = n;
      out.push({ ...rest, path: [...path, n.id], childCount: children.length });
      walk(children, [...path, n.id]);
    }
  };
  walk(tree.value, []);
  return out;
});

function getDataPath(data: RescGridRow) {
  return data.path;
}

function nullFmt(p: ValueFormatterParams) {
  return p.value ? String(p.value) : "NULL";
}

const columnDefs: ColDef[] = [
  { colId: "cOrder", field: "cOrder", headerName: "排序", width: 60 },
  { colId: "cResPath", field: "cResPath", headerName: "地址", width: 180, valueFormatter: nullFmt },
  { colId: "cResSubPath", field: "cResSubPath", headerName: "子路径", width: 100, valueFormatter: nullFmt },
  { colId: "cEnable", field: "cEnable", headerName: "启用", width: 60 },
  { colId: "cRescType", field: "cRescType", headerName: "资源类型", width: 90 },
  { colId: "creator", field: "creator", headerName: "创建人", width: 80, valueFormatter: nullFmt },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 130, valueFormatter: nullFmt },
];

function rowIcon(data: RescGridRow): [Component, string] {
  if (data.cRescType === "Widget") return [MousePointerClick, "text-violet-500"];
  return [ICON_MAP[data.icon] ?? FileText, "text-muted-foreground"];
}

/** 组列单元格：缩进 + 展开箭头 + 资源图标 + 编码-名称 */
const RescGroupCell = defineComponent({
  name: "RescGroupCell",
  props: { params: { type: Object, required: true } },
  setup(props) {
    const node = (props.params as { node: RowNode<RescGridRow> }).node;
    /* RowNode 非 Vue 响应式：订阅 expandedChanged 事件驱动箭头图标重渲染 */
    const expanded = ref(!!node.expanded);
    const syncExpanded = () => (expanded.value = !!node.expanded);
    node.addEventListener("expandedChanged", syncExpanded);
    onBeforeUnmount(() => node.removeEventListener("expandedChanged", syncExpanded));
    return () => {
      const data = node.data;
      if (!data) return h("span");
      const hasKids = data.childCount > 0;
      const isOpen = expanded.value;
      const kids: ReturnType<typeof h>[] = [h("span", { style: { width: `${node.level * 16}px`, flexShrink: "0" } })];
      if (hasKids) {
        kids.push(
          h(
            "button",
            {
              type: "button",
              class: "resc-group-expander",
              onClick: (ev: MouseEvent) => {
                ev.stopPropagation();
                node.setExpanded(!isOpen);
              },
            },
            [h(isOpen ? ChevronDown : ChevronRight, { class: "h-3.5 w-3.5 text-muted-foreground" })],
          ),
        );
      } else {
        kids.push(h("span", { class: "w-5 shrink-0" }));
      }
      const [icon, iconClass] = rowIcon(data);
      kids.push(h(icon, { class: ["h-3.5 w-3.5 shrink-0", iconClass] }));
      kids.push(h("span", { class: "ml-1.5 min-w-0 truncate" }, `${data.cCode}-${data.cTitle}`));
      return h("div", { class: "flex min-w-0 items-center gap-0.5" }, kids);
    };
  },
});

const autoGroupColumnDef: AutoGroupColumnDef<RescGridRow> = {
  headerName: "资源名称",
  minWidth: 240,
  flex: 1,
  sortable: false,
  cellRenderer: RescGroupCell,
};

/** 对应原 ExpandToLevel(0)：根节点展开、更深层折叠 */
function defaultExpanded(nodes: ReturnType<typeof buildRescTree>) {
  const next = new Set<string>();
  for (const n of nodes) if (n.children.length) next.add(n.id);
  expandedIds.value = next;
}

function applyExpansion() {
  const api = gridApi.value;
  if (!api) return;
  api.forEachNode((node) => {
    if (!node.id) return;
    const want = expandedIds.value.has(node.id);
    if (node.expanded !== want) node.setExpanded(want);
  });
}

function query() {
  rows.value = loadRescs();
  defaultExpanded(buildRescTree(rows.value));
  selectedId.value = null;
  nextTick(applyExpansion);
}

onMounted(query);

// 数据替换后 ag-grid 重建节点，展开态需重放；自定义组列 renderer 需强制刷新
watch(gridRows, () =>
  nextTick(() => {
    applyExpansion();
    gridApi.value?.refreshCells({ force: true });
  }),
);

function onExpanderChanged(e: { node?: RowNode<RescGridRow> }) {
  const node = e?.node;
  const id = node?.id;
  if (!id || !node?.data) return;
  const next = new Set(expandedIds.value);
  if (node.expanded) next.add(id);
  else next.delete(id);
  expandedIds.value = next;
}

function currentRow(): HmxRes | null {
  return rows.value.find((r) => r.id === selectedId.value) ?? null;
}

function getRowId(p: GetRowIdParams) {
  return (p.data as RescGridRow).id;
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
  nextTick(applyExpansion);
}

function onSelectionChanged() {
  const row = gridApi.value?.getSelectedRows()[0] as RescGridRow | undefined;
  selectedId.value = row?.id ?? null;
}

/* 对齐侧栏树：单击父节点行 = 选中 + 展开/收起（ag-grid 内置只认展开图标/键盘）。
   展开箭头自身 stopPropagation，不会与此双重切换 */
function onRowClicked(e: RowClickedEvent<RescGridRow>) {
  if ((e.node.allLeafChildren?.length ?? 0) > 0) e.node.setExpanded(!e.node.expanded);
}

function onRowDoubleClicked(e: { data?: RescGridRow }) {
  if (e.data) openEdit(rows.value.find((r) => r.id === e.data!.id) ?? null, null, null);
}

function requireSelection(): boolean {
  if (!currentRow()) {
    toast("请先选择一个节点");
    return false;
  }
  return true;
}

function openEdit(target: HmxRes | null, presetPid: string | null, presetRow: HmxRes | null) {
  editTarget.value = target;
  editPresetPid.value = presetPid;
  editPresetRow.value = presetRow;
  editOpen.value = true;
}

/** 添加同级：新节点挂在选中节点的父节点下 */
function onAddSibling() {
  if (!requireSelection()) return;
  openEdit(null, currentRow()!.cPid, null);
}

function onAddChild() {
  if (!requireSelection()) return;
  openEdit(null, selectedId.value, null);
}

function onCopy() {
  if (!requireSelection()) return;
  const src = currentRow()!;
  openEdit(null, null, { ...src, cCode: `${src.cCode}C`, cTitle: `${src.cTitle}-副本` });
}

function onEdit() {
  if (!requireSelection()) return;
  openEdit(currentRow(), null, null);
}

function onDelete() {
  const row = currentRow();
  if (!row) {
    requireSelection();
    return;
  }
  if (rows.value.some((r) => r.cPid === row.id)) {
    toast("该节点下面存在子节点，请先删除子节点！");
    return;
  }
  confirmTarget.value = row;
  confirmOpen.value = true;
}

function confirmDelete() {
  const target = confirmTarget.value;
  if (!target) return;
  rows.value = rows.value.filter((r) => r.id !== target.id);
  saveRescs(rows.value);
  if (selectedId.value === target.id) selectedId.value = null;
  confirmOpen.value = false;
  confirmTarget.value = null;
  toast("删除成功");
}

function onBtnList() {
  if (!requireSelection()) return;
  btnTarget.value = currentRow();
  btnOpen.value = true;
}

// 子级功能点对话框关闭后同步表格（其内部自行 saveRescs）
watch(btnOpen, (open) => {
  if (!open) rows.value = loadRescs();
});

function onSaveResc(resc: HmxRes) {
  if (editTarget.value) {
    rows.value = rows.value.map((r) => (r.id === editTarget.value!.id ? resc : r));
  } else {
    rows.value = [...rows.value, { ...resc, id: newRescId() }];
    // 新增子级时展开父级，保证可见
    if (resc.cPid && resc.cPid !== "0") {
      const next = new Set(expandedIds.value);
      next.add(resc.cPid);
      expandedIds.value = next;
    }
  }
  saveRescs(rows.value);
  editOpen.value = false;
  toast("保存成功");
}

function onInvalid(message: string) {
  toast(message);
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（对应原 FrmRescList stackPanel：查询/添加同级/添加子级/复制/编辑/删除/子级功能点） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="query">
        <Search class="h-3.5 w-3.5" />查询
      </Button>
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onAddSibling">
        <GitCommitVertical class="h-3.5 w-3.5" />添加同级
      </Button>
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onAddChild">
        <Network class="h-3.5 w-3.5" />添加子级
      </Button>
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onCopy">
        <Copy class="h-3.5 w-3.5" />复制
      </Button>
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onEdit">
        <Pencil class="h-3.5 w-3.5" />编辑
      </Button>
      <Button variant="outlined" size="small" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <Trash2 class="h-3.5 w-3.5" />删除
      </Button>
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onBtnList">
        <MousePointerClick class="h-3.5 w-3.5" />子级功能点
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">资源维护（{{ rows.length }}）</span>
    </div>

    <!-- 树形表格：ag-grid treeData（对应原 DevExpress TreeList，KeyFieldName=Id / ParentFieldName=CPid） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="columnDefs"
        :default-col-def="hmxDefaultColDef" :auto-group-column-def="autoGroupColumnDef" :row-data="gridRows"
        :get-row-id="getRowId" :tree-data="true" :get-data-path="getDataPath" :row-selection="'single'"
        :pagination="false" :animate-rows="false" :locale-text="AG_GRID_LOCALE_CN" @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged" @row-clicked="onRowClicked" @row-double-clicked="onRowDoubleClicked"
        @expander-changed="onExpanderChanged" />
    </div>

    <RescEditDialog v-model:open="editOpen" :editing="editTarget" :preset-pid="editPresetPid" :preset-row="editPresetRow"
      @save="onSaveResc" @invalid="onInvalid" />

    <RescBtnListDialog v-model:open="btnOpen" :node="btnTarget" />

    <!-- 删除确认（对应原 MsgBox.ShowYesNo("是否确认删除[xxx]？")） -->
    <Dialog :visible="confirmOpen" modal header="删除确认" :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event">
      <p class="text-sm">是否确认删除[{{ confirmTarget?.cTitle }}]？</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="删除" severity="danger" variant="outlined" @click="confirmDelete" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.hmx-ag-grid :deep(.resc-group-expander) {
  display: inline-flex;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.hmx-ag-grid :deep(.resc-group-expander:hover) {
  background-color: var(--muted);
}
</style>
