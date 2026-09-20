<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { Plus, RefreshCw, Save, Trash2 } from "@lucide/vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import { AgGridVue } from "ag-grid-vue3";
import type { CellValueChangedEvent, ColDef, GetRowIdParams, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { useToast } from "@/composables/useToast";
import { ensureAgGrid, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { loadRescs, newRescId, saveRescs, type HmxRes } from "@/data/rescs";

ensureAgGrid();

const props = defineProps<{
  open: boolean;
  /** 目标节点，其 Widget 子资源在本对话框内维护 */
  node: HmxRes | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const { toast } = useToast();

const theme = makeHmxGridTheme();

/** 本地编辑副本，未保存关闭不生效 */
const items = ref<HmxRes[]>([]);
const selId = ref<string | null>(null);
const gridApi = ref<GridApi | null>(null);

function now(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function reload() {
  const node = props.node;
  if (!node) {
    items.value = [];
    selId.value = null;
    return;
  }
  items.value = loadRescs()
    .filter((r) => r.cPid === node.id && r.cRescType === "Widget")
    .map((r) => ({ ...r }));
  selId.value = null;
}

watch(
  () => props.open,
  (open) => {
    if (open) reload();
  },
);

function makeRow(partial: Pick<HmxRes, "cCode" | "cTitle" | "cResSubPath" | "cOrder">): HmxRes {
  return {
    id: newRescId(),
    cPid: props.node?.id ?? "0",
    cCode: partial.cCode,
    cTitle: partial.cTitle,
    cOrder: partial.cOrder,
    cResPath: "",
    cResSubPath: partial.cResSubPath,
    cQueryString: "",
    cEnable: "1",
    cRescType: "Widget",
    icon: "",
    creator: "admin",
    createTime: now(),
    lastModifier: "",
    lastModifyTime: "",
  };
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function onSelectionChanged() {
  const row = gridApi.value?.getSelectedRows()[0] as HmxRes | undefined;
  selId.value = row?.id ?? null;
}

function onAdd() {
  const row = makeRow({ cCode: "", cTitle: "", cResSubPath: "", cOrder: String(items.value.length + 1) });
  items.value = [...items.value, row];
  selId.value = row.id;
  nextTick(() => gridApi.value?.getRowNode(row.id)?.setSelected(true));
}

function onDelete() {
  if (!selId.value) {
    toast("请先选择一条功能点");
    return;
  }
  items.value = items.value.filter((r) => r.id !== selId.value);
  selId.value = null;
}

function onSave() {
  const node = props.node;
  if (!node) return;
  gridApi.value?.stopEditing();
  const full = loadRescs();
  const rest = full.filter((r) => !(r.cPid === node.id && r.cRescType === "Widget"));
  saveRescs([...rest, ...items.value.map((r) => ({ ...r }))]);
  toast(`操作成功：共[ ${items.value.length} ]条数据！`);
}

const columns: ColDef[] = [
  { colId: "cCode", field: "cCode", headerName: "编码", width: 130, editable: true, sortable: false },
  { colId: "cTitle", field: "cTitle", headerName: "名称", flex: 1, editable: true, sortable: false },
  { colId: "cResSubPath", field: "cResSubPath", headerName: "动作", width: 150, editable: true, sortable: false },
  { colId: "cOrder", field: "cOrder", headerName: "排序", width: 70, editable: true, sortable: false, cellEditor: "number" },
];

function rowId(p: GetRowIdParams) {
  return (p.data as HmxRes).id;
}

/** 编辑提交后显式回写 items 源对象（ag-grid 内部数据引用不保证与 prop 元素同一），cOrder 数字编辑器产出 number 统一转 string */
function onCellValueChanged(e: CellValueChangedEvent) {
  const row = e.data as HmxRes | undefined;
  const field = e.colDef.field as keyof HmxRes | undefined;
  if (!row || !field) return;
  const target = items.value.find((r) => r.id === row.id);
  if (!target) return;
  const value = e.newValue as unknown;
  (target as Record<string, unknown>)[field] = field === "cOrder" ? String(value ?? "") : (value ?? "");
}
</script>

<template>
  <Dialog :visible="open" modal :header="`RBAC资源管理（按钮）— ${node?.cTitle ?? ''}`" class="resc-btn-dialog"
    :style="{ width: 'min(56rem, calc(100vw - 2rem))', height: '50vh' }" @update:visible="emit('update:open', $event)">
    <!-- 对话框内工具栏 -->
    <div class="mb-2 flex shrink-0 items-center gap-1">
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" autofocus @click="reload">
        <RefreshCw class="h-3.5 w-3.5" />查询
      </Button>
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <Plus class="h-3.5 w-3.5" />添加
      </Button>
      <Button variant="outlined" size="small" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <Trash2 class="h-3.5 w-3.5" />删除
      </Button>
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onSave">
        <Save class="h-3.5 w-3.5" />保存
      </Button>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden rounded-md border border-border/60">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="columns"
        :default-col-def="hmxDefaultColDef" :row-data="items" :get-row-id="rowId" :row-selection="'single'"
        :pagination="false" :animate-rows="false" :locale-text="AG_GRID_LOCALE_CN"
        overlay-no-rows-template="暂无功能点，点击「添加」" @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged" @cell-value-changed="onCellValueChanged" />
    </div>

    <template #footer>
      <Button label="关闭" variant="outlined" @click="emit('update:open', false)" />
      <Button label="保存" variant="outlined" @click="onSave" />
    </template>
  </Dialog>
</template>

<style>
/* Dialog 传送到 body，scoped 样式够不到内部元素；用唯一类名全局约束为定高 flex 列 */
.resc-btn-dialog {
  display: flex;
  flex-direction: column;
}
.resc-btn-dialog .p-dialog-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
