<script setup lang="ts">
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { IconBuilding, IconChevronDown, IconChevronRight, IconFolder, IconFolderOpen, IconNetwork, IconPencil, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";

import Button from "primevue/button";
import Dialog from "primevue/dialog";
import { AgGridVue } from "ag-grid-vue3";
import type { AutoGroupColumnDef, ColDef, GetRowIdParams, GridApi, GridReadyEvent, RowClickedEvent, RowNode, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import DeptEditDialog from "./DeptEditDialog.vue";
import { departmentApi } from "@/api/admin/request";
import type { HmxDept as ApiDept } from "@/api/admin/types";
import { buildDeptTree, type DeptTreeNode, type HmxDept } from "@/data/departments";


const { toast } = useToast();

const theme = makeHmxGridTheme();

interface DeptGridRow extends HmxDept {
  path: string[];
  childCount: number;
}

const rows = ref<HmxDept[]>([]);
/** 展开的组节点 id；数据替换后重放 */
const expandedIds = ref<Set<string>>(new Set());
const selectedId = ref<string | null>(null);
const gridApi = ref<GridApi | null>(null);

const editOpen = ref(false);
const editTarget = ref<HmxDept | null>(null);
const editPresetPid = ref<string | null>(null);

const confirmOpen = ref(false);
const confirmTarget = ref<HmxDept | null>(null);

const tree = computed(() => buildDeptTree(rows.value));

const gridRows = computed<DeptGridRow[]>(() => {
  const out: DeptGridRow[] = [];
  const walk = (nodes: DeptTreeNode[], path: string[]) => {
    for (const n of nodes) {
      const { children, ...rest } = n;
      out.push({ ...rest, path: [...path, n.id], childCount: children.length });
      walk(children, [...path, n.id]);
    }
  };
  walk(tree.value, []);
  return out;
});

function getDataPath(data: DeptGridRow) {
  return data.path;
}

function nullFmt(p: ValueFormatterParams) {
  return p.value ? String(p.value) : "NULL";
}

const columnDefs: ColDef[] = [
  { colId: "cDeptDesc", field: "cDeptDesc", headerName: "部门描述", width: 180, valueFormatter: nullFmt },
  { colId: "cCompany", field: "cCompany", headerName: "集团代码", width: 110, valueFormatter: nullFmt },
  { colId: "cClassify", field: "cClassify", headerName: "自定义分类", width: 110, valueFormatter: nullFmt },
  { colId: "cSw01", field: "cSw01", headerName: "扩展1", width: 96, valueFormatter: nullFmt },
  { colId: "cSw02", field: "cSw02", headerName: "扩展2", width: 96, valueFormatter: nullFmt },
  { colId: "cSw03", field: "cSw03", headerName: "扩展3", width: 96, valueFormatter: nullFmt },
];

/** 组列单元格：缩进 + 展开箭头 + 文件夹/楼宇图标 + 名称 */
const DeptGroupCell = defineComponent({
  name: "DeptGroupCell",
  props: { params: { type: Object, required: true } },
  setup(props) {
    const node = (props.params as { node: RowNode<DeptGridRow> }).node;
    /* RowNode 非 Vue 响应式：订阅 expandedChanged 事件驱动箭头/文件夹图标重渲染 */
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
              class: "dept-group-expander",
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
      const icon = hasKids && isOpen ? IconFolderOpen : hasKids ? IconFolder : IconBuilding;
      kids.push(h(icon, { class: ["h-3.5 w-3.5 shrink-0", hasKids ? "text-amber-500" : "text-muted-foreground"] }));
      kids.push(h("span", { class: "ml-1.5 min-w-0 truncate" }, data.cDeptName));
      return h("div", { class: "flex min-w-0 items-center gap-0.5" }, kids);
    };
  },
});

const autoGroupColumnDef: AutoGroupColumnDef<DeptGridRow> = {
  headerName: "部门短名称",
  minWidth: 240,
  flex: 1,
  sortable: false,
  cellRenderer: DeptGroupCell,
};

/** 对应原 ExpandToLevel(0)：根节点展开、更深层折叠 */
function defaultExpanded(nodes: DeptTreeNode[]) {
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

async function query() {
  rows.value = (await departmentApi.queryAllDepartments()) as unknown as HmxDept[];
  defaultExpanded(buildDeptTree(rows.value));
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

function onExpanderChanged(e: { node?: RowNode<DeptGridRow> }) {
  const node = e?.node;
  const id = node?.id;
  if (!id || !node?.data) return;
  const next = new Set(expandedIds.value);
  if (node.expanded) next.add(id);
  else next.delete(id);
  expandedIds.value = next;
}

function currentRow(): HmxDept | null {
  return rows.value.find((r) => r.id === selectedId.value) ?? null;
}

function getRowId(p: GetRowIdParams) {
  return (p.data as DeptGridRow).id;
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
  nextTick(applyExpansion);
}

function onSelectionChanged() {
  const row = gridApi.value?.getSelectedRows()[0] as DeptGridRow | undefined;
  selectedId.value = row?.id ?? null;
}

/* 对齐侧栏树：单击父节点行 = 选中 + 展开/收起（ag-grid 内置只认展开图标/键盘）。
   展开箭头自身 stopPropagation，不会与此双重切换 */
function onRowClicked(e: RowClickedEvent<DeptGridRow>) {
  if ((e.node.allLeafChildren?.length ?? 0) > 0) e.node.setExpanded(!e.node.expanded);
}

function onRowDoubleClicked(e: { data?: DeptGridRow }) {
  if (e.data) openEdit(rows.value.find((r) => r.id === e.data!.id) ?? null, null);
}

function openEdit(target: HmxDept | null, presetPid: string | null) {
  editTarget.value = target;
  editPresetPid.value = presetPid;
  editOpen.value = true;
}

function requireSelection(): boolean {
  if (!currentRow()) {
    toast("请先选择一个部门", 2000, "warn");
    return false;
  }
  return true;
}

function onAdd() {
  openEdit(null, null);
}

function onAddChild() {
  if (!requireSelection()) return;
  openEdit(null, selectedId.value);
}

function onEdit() {
  if (!requireSelection()) return;
  openEdit(currentRow(), null);
}

function onDelete() {
  const row = currentRow();
  if (!row) {
    requireSelection();
    return;
  }
  if (rows.value.some((r) => r.cDeptPid === row.id)) {
    toast("该部门下面存在子级部门，请先删除子级部门！", 2000, "warn");
    return;
  }
  confirmTarget.value = row;
  confirmOpen.value = true;
}

async function confirmDelete() {
  const target = confirmTarget.value;
  if (!target) return;
  try {
    await departmentApi.delete(target as unknown as ApiDept);
  } catch {
    return; // 失败提示由请求层统一 toast
  }
  rows.value = rows.value.filter((r) => r.id !== target.id);
  if (selectedId.value === target.id) selectedId.value = null;
  confirmOpen.value = false;
  confirmTarget.value = null;
  toast("删除成功", 2000, "success");
}

async function onSaveDept(dept: HmxDept) {
  try {
    if (editTarget.value) {
      await departmentApi.save(dept as unknown as ApiDept);
      rows.value = rows.value.map((r) => (r.id === dept.id ? dept : r));
    } else {
      await departmentApi.save({ ...dept, id: "" } as unknown as ApiDept);
      // 新增子部门时展开父级，保证可见
      if (dept.cDeptPid) {
        const next = new Set(expandedIds.value);
        next.add(dept.cDeptPid);
        expandedIds.value = next;
      }
      rows.value = (await departmentApi.queryAllDepartments()) as unknown as HmxDept[];
    }
  } catch {
    return; // 失败提示由请求层统一 toast
  }
  editOpen.value = false;
  toast("保存成功", 2000, "success");
}

function onInvalid(message: string) {
  toast(message, 2000, "warn");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（对应原 stackPanel1：查询/添加/添加子部门/编辑/删除） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button size="small" variant="outlined" class="shrink-0 whitespace-nowrap" @click="query">
        <IconSearch class="h-3.5 w-3.5" />查询
      </Button>
      <Button severity="secondary" variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3.5 w-3.5" />添加
      </Button>
      <Button severity="secondary" variant="outlined" size="small" class="shrink-0 whitespace-nowrap"
        @click="onAddChild">
        <IconNetwork class="h-3.5 w-3.5" />添加子部门
      </Button>
      <Button severity="secondary" variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onEdit">
        <IconPencil class="h-3.5 w-3.5" />编辑
      </Button>
      <Button size="small" severity="danger" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3.5 w-3.5" />删除
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">部门维护（{{ rows.length }}）</span>
    </div>

    <!-- 树形表格：ag-grid treeData（对应原 DevExpress TreeList） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="columnDefs"
        :default-col-def="hmxDefaultColDef" :auto-group-column-def="autoGroupColumnDef" :row-data="gridRows"
        :get-row-id="getRowId" :tree-data="true" :get-data-path="getDataPath" :row-selection="'single'"
        :pagination="false" :animate-rows="false" :locale-text="AG_GRID_LOCALE_CN" @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged" @row-clicked="onRowClicked" @row-double-clicked="onRowDoubleClicked"
        @expander-changed="onExpanderChanged" @first-data-rendered="autoSizeOnFirstData" />
    </div>

    <DeptEditDialog v-model:open="editOpen" :all-rows="rows" :editing="editTarget" :preset-pid="editPresetPid"
      @save="onSaveDept" @invalid="onInvalid" />

    <!-- 删除确认（对应原 MsgBox.ShowYesNo("是否确定删除当前项？")） -->
    <Dialog :visible="confirmOpen" modal header="删除确认" :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event">
      <p class="text-sm">是否确定删除当前项「{{ confirmTarget?.cDeptName }}」？</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="删除" severity="danger" variant="outlined" @click="confirmDelete" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.hmx-ag-grid :deep(.dept-group-expander) {
  display: inline-flex;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.hmx-ag-grid :deep(.dept-group-expander:hover) {
  background-color: var(--muted);
}
</style>
