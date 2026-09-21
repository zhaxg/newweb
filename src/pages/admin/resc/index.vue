<script setup lang="ts">
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { IconChevronDown, IconChevronRight, IconClick, IconNetwork, IconPencil, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-vue";
import type { Component } from "vue";

import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Select from "primevue/select";
import { AgGridVue } from "ag-grid-vue3";
import type { AutoGroupColumnDef, ColDef, GetRowIdParams, GridApi, GridReadyEvent, RowClickedEvent, RowNode, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { adminApi } from "@/api/admin/request";
import type { HmxRes } from "@/api/admin/types";
import { RbacRescType } from "@/api/admin/enums";
import { NextStrId } from "@/lib/yitIdHelper";
import { TABLER_FALLBACK_ICON, tablerIcon } from "@/lib/tablerIcons";
import RescBtnListDialog from "./RescBtnListDialog.vue";
import RescEditDialog from "./RescEditDialog.vue";
import { convertToTree, createTreeNode, findParentNodeById, type HmxResTree } from "./tree-node";


const { toast } = useToast();

const theme = makeHmxGridTheme();

interface RescGridRow extends HmxRes {
  path: string[];
  childCount: number;
}

// ---------- 命名空间 + 树数据 ----------
const namespace = ref<string>(import.meta.env.VITE_ROUTER_NAMESPACE ?? "TDWEB");
const nsOptions = ref<{ label: string; value: string }[]>([]);
const querying = ref(false);
const treeRoots = ref<HmxResTree[]>([]);

const gridRows = computed<RescGridRow[]>(() => {
  const out: RescGridRow[] = [];
  const walk = (nodes: HmxResTree[], path: string[]) => {
    for (const n of nodes) {
      const { children, ...rest } = n;
      out.push({ ...rest, path: [...path, n.id ?? ""], childCount: children?.length ?? 0 });
      walk(children ?? [], [...path, n.id ?? ""]);
    }
  };
  walk(treeRoots.value, []);
  return out;
});

/** id → 树节点（当前数据全量索引，编辑/删除定位用） */
const nodeById = computed(() => {
  const map = new Map<string, HmxResTree>();
  const walk = (nodes: HmxResTree[]) => {
    for (const n of nodes) {
      if (n.id) map.set(n.id, n);
      walk(n.children ?? []);
    }
  };
  walk(treeRoots.value);
  return map;
});

function getDataPath(data: RescGridRow) {
  return data.path;
}

function nullFmt(p: ValueFormatterParams) {
  return p.value ? String(p.value) : "NULL";
}

const columnDefs: ColDef[] = [
  { colId: "cOrder", field: "cOrder", headerName: "排序", width: 60 },
  { colId: "cResPath", field: "cResPath", headerName: "路由名称", width: 160, valueFormatter: nullFmt },
  { colId: "cResSubPath", field: "cResSubPath", headerName: "组件路径", width: 180, valueFormatter: nullFmt },
  { colId: "cQueryString", field: "cQueryString", headerName: "注入参数", width: 120, valueFormatter: nullFmt },
  { colId: "cEnable", field: "cEnable", headerName: "状态", width: 70, valueFormatter: (p) => (p.value === "0" ? "禁用" : "启用") },
  { colId: "creator", field: "creator", headerName: "创建人", width: 80, valueFormatter: nullFmt },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 130, valueFormatter: nullFmt },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 100, valueFormatter: nullFmt },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后更新时间", width: 130, valueFormatter: nullFmt },
];

function rowIcon(data: RescGridRow): [Component, string] {
  if (data.cResType === RbacRescType.Widget) return [IconClick, "text-violet-500"];
  return [tablerIcon(data.cIcon) ?? TABLER_FALLBACK_ICON, "text-muted-foreground"];
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
            [h(isOpen ? IconChevronDown : IconChevronRight, { class: "h-3.5 w-3.5 text-muted-foreground" })],
          ),
        );
      } else {
        kids.push(h("span", { class: "w-5 shrink-0" }));
      }
      const [icon, iconClass] = rowIcon(data);
      kids.push(h(icon, { class: ["h-3.5 w-3.5 shrink-0", iconClass] }));
      kids.push(h("span", { class: "ml-1.5 min-w-0 truncate" }, data.cCode ? `${data.cCode}-${data.cTitle}` : data.cTitle ?? ""));
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

// ---------- 展开态 / 选中 ----------
const expandedIds = ref<Set<string>>(new Set());
const selectedId = ref<string | null>(null);
const gridApi = ref<GridApi | null>(null);

/** 根节点展开、更深层折叠 */
function defaultExpanded(nodes: HmxResTree[]) {
  const next = new Set<string>();
  for (const n of nodes) if (n.children?.length && n.id) next.add(n.id);
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

async function query() {
  if (querying.value) return;
  querying.value = true;
  try {
    const res = await adminApi.getResources(namespace.value);
    const menuList = (res ?? []).filter((x) => x.cResType !== undefined && x.cResType === RbacRescType.Menu);
    treeRoots.value = convertToTree(menuList);
    defaultExpanded(treeRoots.value);
    selectedId.value = null;
    nextTick(applyExpansion);
  } catch {
    /* 失败提示已由请求拦截层统一 toast */
  } finally {
    querying.value = false;
  }
}

async function initNamespaceOptions() {
  try {
    const options = await adminApi.getResourceNamespaceList();
    nsOptions.value = (options ?? []).map((x) => ({ label: x.cCode ?? "", value: x.cCode ?? "" }));
    if (nsOptions.value.length && !nsOptions.value.some((o) => o.value === namespace.value)) {
      namespace.value = nsOptions.value[0].value;
    }
  } catch {
    /* 拦截层已 toast */
  }
  query();
}

onMounted(initNamespaceOptions);

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

function getRowId(p: GetRowIdParams) {
  return (p.data as RescGridRow).id ?? "";
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
  nextTick(applyExpansion);
}

function onSelectionChanged() {
  const row = gridApi.value?.getSelectedRows()[0] as RescGridRow | undefined;
  selectedId.value = row?.id ?? null;
}

/* 单击父节点行 = 选中 + 展开/收起；展开箭头自身 stopPropagation 不会双重切换 */
function onRowClicked(e: RowClickedEvent<RescGridRow>) {
  if ((e.node.allLeafChildren?.length ?? 0) > 0) e.node.setExpanded(!e.node.expanded);
}

function onRowDoubleClicked(e: { data?: RescGridRow }) {
  if (e.data) openEdit(e.data.id ?? null);
}

const currentRow = computed(() => (selectedId.value ? nodeById.value.get(selectedId.value) ?? null : null));

function requireSelection(): boolean {
  if (!currentRow.value) {
    toast("请先选择一个节点", 2000, "warn");
    return false;
  }
  return true;
}

// ---------- 编辑对话框 ----------
const editOpen = ref(false);
const editNode = ref<HmxResTree | null>(null);

function openEdit(id: string | null) {
  if (!id) {
    toast("请先选择一个节点", 2000, "warn");
    return;
  }
  const node = nodeById.value.get(id);
  if (!node) return;
  editNode.value = node;
  editOpen.value = true;
}

/** 新增：挂到选中节点的父级下（未选中 = 根）；对应 hmx_web btnNew */
function onAdd() {
  const item = createTreeNode(currentRow.value?.cPid ?? "", namespace.value, NextStrId());
  editNode.value = item;
  editOpen.value = true;
}

/** 新增子级：必须选中父节点；对应 hmx_web btnNewChild */
function onAddChild() {
  const row = currentRow.value;
  if (!row?.id) {
    toast("必须选择一个父级节点进行添加！", 2000, "warn");
    return;
  }
  editNode.value = createTreeNode(row.id, namespace.value, NextStrId());
  editOpen.value = true;
}

async function onEditSubmit(node: HmxResTree) {
  const isAdd = "" === node.id;
  let saved: HmxRes | null = null;
  try {
    saved = await adminApi.addOrEditResource(JSON.parse(JSON.stringify(node)) as HmxRes);
  } catch {
    return; // 拦截层已 toast，编辑弹窗由父组件保持关闭逻辑外置
  }
  if (!saved) return;
  editOpen.value = false;
  toast(`资源 ${saved.cTitle ?? node.cTitle} 已成功保存`, 2000, "success");
  if (isAdd) {
    const child = { ...saved, children: [] } as HmxResTree;
    const parent = findParentNodeById(saved.cPid ?? "", treeRoots.value);
    if (parent?.children) parent.children.push(child);
    else treeRoots.value.push(child);
    if (parent?.id) {
      const next = new Set(expandedIds.value);
      next.add(parent.id);
      expandedIds.value = next;
    }
    selectedId.value = saved.id ?? null;
    nextTick(() => syncGridSelection(saved.id ?? null));
  } else {
    const target = saved.id ? nodeById.value.get(saved.id) : null;
    if (target) Object.assign(target, saved);
  }
}

function syncGridSelection(id: string | null) {
  if (!id) return;
  gridApi.value?.getRowNode(id)?.setSelected(true);
}

// ---------- 删除 ----------
const confirmOpen = ref(false);
const confirmTarget = ref<HmxResTree | null>(null);

function onDelete() {
  const row = currentRow.value;
  if (!row) {
    requireSelection();
    return;
  }
  if (row.children?.length) {
    toast("当前资源具有子集，不允许直接删除，请删除子集后再操作！", 2000, "warn");
    return;
  }
  confirmTarget.value = row;
  confirmOpen.value = true;
}

async function confirmDelete() {
  const target = confirmTarget.value;
  if (!target?.id) return;
  try {
    await adminApi.deleteResource(target.id);
  } catch {
    return;
  }
  const parent = findParentNodeById(target.cPid ?? "", treeRoots.value);
  if (parent?.children) parent.children = parent.children.filter((x) => x.id !== target.id);
  else treeRoots.value = treeRoots.value.filter((x) => x.id !== target.id);
  if (selectedId.value === target.id) selectedId.value = null;
  confirmOpen.value = false;
  confirmTarget.value = null;
  toast("删除成功", 2000, "success");
}

// ---------- 子级功能点 ----------
const btnOpen = ref(false);
const btnTarget = ref<HmxRes | null>(null);

function onBtnList() {
  if (!requireSelection()) return;
  btnTarget.value = currentRow.value;
  btnOpen.value = true;
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（对应 hmx_web resc/index：分组下拉+刷新 | 新增/新增子级/编辑/删除/子级功能点） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <span class="shrink-0 text-xs text-muted-foreground">分组</span>
      <Select v-model="namespace" :options="nsOptions" option-label="label" option-value="value" size="small"
        class="w-28 shrink-0" @change="query" />
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="query">
        <IconRefresh class="h-3.5 w-3.5" />刷新
      </Button>
      <span class="mx-1 h-4 w-px shrink-0 bg-border/60" />
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3.5 w-3.5" />新增
      </Button>
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onAddChild">
        <IconNetwork class="h-3.5 w-3.5" />新增子级
      </Button>
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="openEdit(selectedId)">
        <IconPencil class="h-3.5 w-3.5" />编辑
      </Button>
      <Button variant="outlined" size="small" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3.5 w-3.5" />删除
      </Button>
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onBtnList">
        <IconClick class="h-3.5 w-3.5" />子级功能点
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">资源维护（{{ gridRows.length }}）</span>
    </div>

    <!-- 树形表格：ag-grid treeData（对应原 VTable 树列表，数据源 = convertToTree 后的 Menu 资源） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="columnDefs"
        :default-col-def="hmxDefaultColDef" :auto-group-column-def="autoGroupColumnDef" :row-data="gridRows"
        :get-row-id="getRowId" :tree-data="true" :get-data-path="getDataPath" :row-selection="'single'"
        :loading="querying" :pagination="false" :animate-rows="false" :locale-text="AG_GRID_LOCALE_CN"
        @grid-ready="onGridReady" @selection-changed="onSelectionChanged" @row-clicked="onRowClicked"
        @row-double-clicked="onRowDoubleClicked" @expander-changed="onExpanderChanged"
        @first-data-rendered="autoSizeOnFirstData" />
    </div>

    <RescEditDialog v-model:open="editOpen" :node="editNode" @submit="onEditSubmit" />

    <RescBtnListDialog v-model:open="btnOpen" :node="btnTarget" />

    <!-- 删除确认（对应原 DialogPlugin.confirm 警告框） -->
    <Dialog :visible="confirmOpen" modal header="警告" :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event">
      <p class="text-sm">你确定删除当前选择的资源么: {{ confirmTarget?.cTitle }}</p>
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
