<script setup lang="ts">
/** 对应 FrmRescList（资源按钮列表）：HmxWinForms.Forms.Admin.FrmRescList
 *  画面迁移，逻辑不迁移到 */


import { nextTick, ref, shallowRef, watch } from "vue";
import { IconClick, IconDeviceFloppy, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-vue";

import Button from "primevue/button";
import Dialog from "primevue/dialog";
import { AgGridVue } from "ag-grid-vue3";
import type { CellValueChangedEvent, ColDef, GetRowIdParams, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { useToast } from "@/composables/useToast";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { adminApi } from "@/api/admin/request";
import type { HmxRes } from "@/api/admin/types";
import { RbacRescType } from "@/api/admin/enums";
import { crudAppService } from "@/api/common/crud-app-service";
import { NextStrId } from "@/lib/yitIdHelper";
import { TrackableList } from "@/api/common/trackable-list";


const props = defineProps<{
  open: boolean;
  /** 目标菜单节点，其 Widget 子资源（功能点）在本对话框内维护 */
  node: HmxRes | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const { toast } = useToast();

const theme = makeHmxGridTheme();

const trackList = shallowRef<TrackableList<HmxRes>>(new TrackableList());
const gridApi = ref<GridApi | null>(null);
const loading = ref(false);
const saving = ref(false);

function makeRow(): HmxRes {
  return {
    selected: false,
    rowVersion: 0,
    id: NextStrId(),
    cPid: props.node?.id ?? undefined,
    cResPath: "",
    cResSubPath: "",
    cResType: RbacRescType.Widget,
    cEnable: "1",
    cOrder: "99",
    cNsCode: props.node?.cNsCode ?? undefined,
  } as HmxRes;
}

async function reload() {
  if (!props.node?.id || loading.value) return;
  loading.value = true;
  try {
    const resp = await adminApi.queryButtonsResc(props.node.id);
    trackList.value = new TrackableList(resp ?? []);
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) reload();
  },
);

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function rowId(p: GetRowIdParams) {
  return (p.data as HmxRes).id ?? "";
}

function onAdd() {
  const row = makeRow();
  row.cOrder = String(trackList.value.length).padStart(2, "0");
  trackList.value.push(row);
  const stored = trackList.value[trackList.value.length - 1];
  nextTick(() => {
    gridApi.value?.applyTransaction({ add: [stored] });
    gridApi.value?.getRowNode(stored.id ?? "")?.setSelected(true);
  });
}

function onDelete() {
  const row = gridApi.value?.getSelectedRows()[0] as HmxRes | undefined;
  if (!row?.id) {
    toast("请先选择一条功能点", 2000, "warn");
    return;
  }
  trackList.value.remove((x) => x.id === row.id);
  gridApi.value?.applyTransaction({ remove: [row] });
}

/** ag-grid 已把新值写回源对象；cOrder 数字编辑器产出 number，统一转回 string */
function onCellValueChanged(e: CellValueChangedEvent) {
  const row = e.data as HmxRes | undefined;
  if (!row) return;
  if (e.colDef.colId === "cOrder") row.cOrder = String(row.cOrder ?? "");
}

/** 对应 hmx_web btnSave：补齐权限树级联选择用的 [NULL] 哨兵行后整体保存 */
async function onSave(closeAfter = false) {
  const node = props.node;
  if (!node?.id || saving.value) return;
  gridApi.value?.stopEditing();
  if (!trackList.value.some((x) => x.cCode === "[NULL]")) {
    const sentinel = makeRow();
    sentinel.cCode = "[NULL]";
    sentinel.cTitle = "[空]";
    sentinel.cResSubPath = "// 权限树级联选择的空节点，不要删除";
    sentinel.cOrder = "9999";
    trackList.value.push(sentinel);
    const stored = trackList.value[trackList.value.length - 1];
    nextTick(() => gridApi.value?.applyTransaction({ add: [stored] }));
  }
  saving.value = true;
  try {
    await crudAppService.SaveList(trackList.value, "HmxRes");
    gridApi.value?.refreshCells({ force: true });
    toast("已成功保存", 2000, "success");
    if (closeAfter) emit("update:open", false);
  } catch {
    /* 拦截层已 toast */
  } finally {
    saving.value = false;
  }
}

const columns: ColDef[] = [
  { colId: "cCode", field: "cCode", headerName: "编码", width: 130, editable: true, sortable: false },
  { colId: "cTitle", field: "cTitle", headerName: "名称", flex: 1, editable: true, sortable: false },
  { colId: "cResSubPath", field: "cResSubPath", headerName: "动作", width: 150, editable: true, sortable: false },
  { colId: "cOrder", field: "cOrder", headerName: "排序", width: 70, editable: true, sortable: false, cellEditor: "number" },
];
</script>

<template>
  <Dialog :visible="open" modal :header="`子级功能点维护 — ${node?.cTitle ?? ''}`" class="resc-btn-dialog"
    :style="{ width: 'min(56rem, calc(100vw - 2rem))', height: '50vh' }" @update:visible="emit('update:open', $event)">
    <!-- 对话框内工具栏（对应 hmx_web sub-resc-edit：加载/新增/删除/保存 + 用法提示） -->
    <div class="mb-2 flex shrink-0 items-center gap-1">
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" autofocus @click="reload">
        <IconRefresh class="h-3.5 w-3.5" />加载
      </Button>
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3.5 w-3.5" />新增
      </Button>
      <Button variant="outlined" size="small" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3.5 w-3.5" />删除
      </Button>
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" :loading="saving" @click="onSave()">
        <IconDeviceFloppy class="h-3.5 w-3.5" />保存
      </Button>
      <span class="ml-auto flex items-center gap-1 text-xs text-muted-foreground" title="参考用法：&lt;t-button v-hp='btnAdd'&gt;新增&lt;/t-button&gt;">
        <IconClick class="h-3.5 w-3.5" />v-hp=&quot;btnAdd&quot;
      </span>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden rounded-md border border-border/60">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="columns"
        :default-col-def="hmxDefaultColDef" :row-data="trackList" :get-row-id="rowId" :row-selection="'single'"
        :loading="loading" :pagination="false" :animate-rows="false" :locale-text="AG_GRID_LOCALE_CN"
        overlay-no-rows-template="暂无功能点，点击「新增」" @grid-ready="onGridReady"
        @cell-value-changed="onCellValueChanged" @first-data-rendered="autoSizeOnFirstData" />
    </div>

    <template #footer>
      <Button label="关闭" variant="outlined" @click="emit('update:open', false)" />
      <Button label="保存" variant="outlined" :loading="saving" @click="onSave(true)" />
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
