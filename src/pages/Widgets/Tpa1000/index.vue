<script setup lang="ts">
import { computed, defineComponent, h, ref } from "vue";
import { IconPencil, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { AgGridVue } from "ag-grid-vue3";
import type {
  AutoGroupColumnDef,
  ColDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  RowNode,
  ValueFormatterParams,
} from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import Tpa1000EditDialog from "./Tpa1000EditDialog.vue";

/** 对应 FrmTpa1000（工厂产线机台设备）：Hmx.WinForms.Widgets.ProductionLine.FrmTpa1000
 *  画面迁移，逻辑不迁移到 */

const { toast } = useToast();
const theme = makeHmxGridTheme();

interface Tpa1000 {
  id: string;
  cCode: string;
  cName: string;
  cSimpName?: string;
  cSimpCode?: string;
  cSimpNo?: string;
  cPid?: string;
  nLevel: number;
  cOldCode?: string;
  cWorkCenter?: string;
  cProc?: string;
  cType?: string;
  nOrder?: number;
  cLineCode?: string;
  cMatType?: string;
  cGyydSta?: string;
  selected?: boolean;
}

const LEVEL_LABELS: Record<number, string> = { 0: "工厂", 10: "产线", 20: "区域", 30: "设备" };

const rows = ref<Tpa1000[]>([]);
const querying = ref(false);

const treeApi = ref<GridApi | null>(null);
const gridApi = ref<GridApi | null>(null);
const selectedTreeRow = ref<Tpa1000 | null>(null);
const selectedMachineRow = ref<Tpa1000 | null>(null);

const editOpen = ref(false);
const editItem = ref<Tpa1000 | null>(null);

const confirmOpen = ref(false);
const confirmTarget = ref<Tpa1000 | null>(null);
const confirmScope = ref<"line" | "machine">("line");

// ---------- 左侧 工厂/产线/区域 树 ----------
interface TreeRow extends Tpa1000 {
  path: string[];
  childCount: number;
}

const treeRows = computed<TreeRow[]>(() => {
  const nodes = rows.value.filter((r) => r.nLevel !== 30);
  const byPid = new Map<string, Tpa1000[]>();
  for (const n of nodes) {
    const pid = n.cPid ?? "";
    if (!byPid.has(pid)) byPid.set(pid, []);
    byPid.get(pid)!.push(n);
  }
  for (const list of byPid.values()) list.sort((a, b) => a.nLevel - b.nLevel || (a.nOrder ?? 0) - (b.nOrder ?? 0));

  const out: TreeRow[] = [];
  const walk = (pid: string, path: string[]) => {
    for (const n of byPid.get(pid) ?? []) {
      const hasKids = (byPid.get(n.cCode)?.length ?? 0) > 0;
      out.push({ ...n, path: [...path, n.cCode], childCount: hasKids ? 1 : 0 });
      walk(n.cCode, [...path, n.cCode]);
    }
  };
  const coded = new Set(nodes.map((n) => n.cCode));
  for (const n of nodes) if (!n.cPid || !coded.has(n.cPid)) walk(n.cCode, [n.cCode]);
  return out;
});

function getDataPath(data: TreeRow) {
  return data.path;
}

function getTreeRowId(p: GetRowIdParams) {
  return (p.data as TreeRow).cCode;
}

const TreeGroupCell = defineComponent({
  name: "TreeGroupCell",
  props: { params: { type: Object, required: true } },
  setup(props) {
    return () => {
      const node = (props.params as { node: RowNode<TreeRow> }).node;
      const data = node.data;
      if (!data) return h("span");
      const kids: ReturnType<typeof h>[] = [h("span", { style: { width: `${node.level * 16}px`, flexShrink: "0" } })];
      kids.push(h("span", { class: "ml-1.5 min-w-0 truncate" }, data.cName));
      return h("div", { class: "flex min-w-0 items-center gap-0.5" }, kids);
    };
  },
});

const levelFmt = (p: ValueFormatterParams) => LEVEL_LABELS[p.value as number] ?? String(p.value ?? "");

const autoGroupColumnDef: AutoGroupColumnDef<TreeRow> = {
  headerName: "名称",
  minWidth: 200,
  flex: 1,
  sortable: false,
  cellRenderer: TreeGroupCell,
};

const treeColDefs: ColDef[] = [
  { colId: "nLevel", field: "nLevel", headerName: "层级", width: 70, valueFormatter: levelFmt },
  { colId: "cCode", field: "cCode", headerName: "代码", width: 120 },
];

function onTreeReady(e: GridReadyEvent) {
  treeApi.value = e.api;
}

function onTreeSelectionChanged() {
  const row = treeApi.value?.getSelectedRows()[0] as TreeRow | undefined;
  selectedTreeRow.value = row ?? null;
  selectedMachineRow.value = null;
}

// ---------- 右侧 机台设备 ----------
const machines = computed<Tpa1000[]>(() => {
  const current = selectedTreeRow.value;
  if (!current) return [];
  const coded = new Set(rows.value.map((r) => r.cCode));
  const rlt: Tpa1000[] = [];
  const walk = (pid: string) => {
    for (const item of rows.value) {
      if (item.cPid !== pid) continue;
      if (item.nLevel === 30) rlt.push(item);
      if (coded.has(item.cCode)) walk(item.cCode);
    }
  };
  walk(current.cCode);
  return rlt;
});

function getMachineRowId(p: GetRowIdParams) {
  return (p.data as Tpa1000).id;
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function onGridSelectionChanged() {
  const row = gridApi.value?.getSelectedRows()[0] as Tpa1000 | undefined;
  selectedMachineRow.value = row ?? null;
}

const machineColDefs: ColDef[] = [
  /* 原 Selected 勾选列：ui-rules §7 不手写勾选列，勾选由 row-selection 复选框承担，本列隐藏保留在列面板 */
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { colId: "cCode", field: "cCode", headerName: "代码", width: 100 },
  { colId: "cName", field: "cName", headerName: "名称", width: 120 },
  { colId: "cSimpName", field: "cSimpName", headerName: "简称", width: 100 },
  { colId: "cSimpCode", field: "cSimpCode", headerName: "拼音简称", width: 100 },
  { colId: "cSimpNo", field: "cSimpNo", headerName: "流水", width: 80 },
  { colId: "nLevel", field: "nLevel", headerName: "层级", width: 70, valueFormatter: levelFmt },
  { colId: "cWorkCenter", field: "cWorkCenter", headerName: "工作中心代码", width: 110 },
  { colId: "cProc", field: "cProc", headerName: "所属工序代码", width: 110 },
  { colId: "cType", field: "cType", headerName: "类型", width: 90 },
  { colId: "nOrder", field: "nOrder", headerName: "排序", width: 70 },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 100 },
  { colId: "cMatType", field: "cMatType", headerName: "物料类型", width: 90 },
  { colId: "cGyydSta", field: "cGyydSta", headerName: "公用约定状态", width: 110, flex: 1 },
  { colId: "cOldCode", field: "cOldCode", headerName: "旧代码", width: 100 },
];

// ---------- 工具栏（逻辑不迁移，占位） ----------
function onQuery() {
  querying.value = true;
  // TODO: 接入 ITpa1000AppService.QueryTpa1000
  querying.value = false;
  toast("画面迁移：查询逻辑待接入", 2000, "warn");
}

function requireTreeRow(): Tpa1000 | null {
  if (!selectedTreeRow.value) {
    toast("请选择左侧列表后再操作", 2000, "warn");
    return null;
  }
  return selectedTreeRow.value;
}

function requireMachineRow(): Tpa1000 | null {
  if (!selectedMachineRow.value) {
    toast("请选择右侧设备列表后再操作", 2000, "warn");
    return null;
  }
  return selectedMachineRow.value;
}

function onAdd() {
  editItem.value = null;
  editOpen.value = true;
}

function onEditLine() {
  const row = requireTreeRow();
  if (!row) return;
  editItem.value = row;
  editOpen.value = true;
}

function onEditMachine() {
  const row = requireMachineRow();
  if (!row) return;
  editItem.value = row;
  editOpen.value = true;
}

function onDeleteLine() {
  const row = requireTreeRow();
  if (!row) return;
  confirmTarget.value = row;
  confirmScope.value = "line";
  confirmOpen.value = true;
}

function onDeleteMachine() {
  const row = requireMachineRow();
  if (!row) return;
  confirmTarget.value = row;
  confirmScope.value = "machine";
  confirmOpen.value = true;
}

function confirmDelete() {
  // TODO: 接入 ITpa1000AppService.DeleteTpa1000
  confirmOpen.value = false;
  confirmTarget.value = null;
  toast("画面迁移：删除逻辑待接入", 2000, "warn");
}

function onEditSubmit() {
  // TODO: 接入 ITpa1000AppService.SaveTpa1000
  editOpen.value = false;
  toast("画面迁移：保存逻辑待接入", 2000, "warn");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（对应原 stackPanel1：查询/添加/编辑工厂产线/删除工厂产线/编辑机台设备/删除机台设备） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onQuery">
        <IconRefresh class="h-3.5 w-3.5" />查询
      </Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3.5 w-3.5" />添加
      </Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onEditLine">
        <IconPencil class="h-3.5 w-3.5" />编辑工厂产线
      </Button>
      <Button text size="small" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDeleteLine">
        <IconTrash class="h-3.5 w-3.5" />删除工厂产线
      </Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onEditMachine">
        <IconPencil class="h-3.5 w-3.5" />编辑机台设备
      </Button>
      <Button text size="small" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDeleteMachine">
        <IconTrash class="h-3.5 w-3.5" />删除机台设备
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">工厂产线机台设备（{{ rows.length }}）</span>
    </div>

    <!-- 左右分栏（对应原 SplitContainerControl） -->
    <Splitter class="min-h-0 flex-1" layout="horizontal">
      <SplitterPanel :size="35" :minSize="15" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">工厂/产线/区域</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :column-defs="treeColDefs"
            :default-col-def="hmxDefaultColDef"
            :auto-group-column-def="autoGroupColumnDef"
            :row-data="treeRows"
            :get-row-id="getTreeRowId"
            :tree-data="true"
            :get-data-path="getDataPath"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false"
            :animate-rows="false"
            :loading="querying"
            :locale-text="AG_GRID_LOCALE_CN"
            @grid-ready="onTreeReady"
            @selection-changed="onTreeSelectionChanged"
          />
        </div>
      </SplitterPanel>
      <SplitterPanel :minSize="20" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">机台设备</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :column-defs="machineColDefs"
            :default-col-def="hmxDefaultColDef"
            :row-data="machines"
            :get-row-id="getMachineRowId"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false"
            :animate-rows="false"
            :locale-text="AG_GRID_LOCALE_CN"
            @grid-ready="onGridReady"
            @selection-changed="onGridSelectionChanged"
          />
        </div>
      </SplitterPanel>
    </Splitter>

    <Tpa1000EditDialog v-model:open="editOpen" :item="editItem" :parents="treeRows" @submit="onEditSubmit" />

    <!-- 删除确认（对应原 MsgBox.ShowYesNo("确认删除[xxx]吗?")） -->
    <Dialog
      :visible="confirmOpen"
      modal
      header="警告"
      :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event"
    >
      <p class="text-sm">确认删除[{{ confirmTarget?.cName }}]吗?</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" severity="danger" variant="outlined" @click="confirmDelete" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.hmx-ag-grid :deep(.ag-group-value) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
