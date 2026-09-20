<script setup lang="ts">
import { computed, defineComponent, h, nextTick, onMounted, reactive, ref, watch } from "vue";
import { Pencil, Plus, RotateCw, Save, Search, Trash2 } from "@lucide/vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import ToggleSwitch from "primevue/toggleswitch";
import { AgGridVue } from "ag-grid-vue3";
import type { CellValueChangedEvent, ColDef, GetRowIdParams, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { ensureAgGrid, erpDefaultColDef, makeErpGridTheme } from "@/lib/agGrid";
import SplitView from "@/components/layout/SplitView.vue";
import { useToast } from "@/composables/useToast";
import { loadKvs, newKvId, saveKvs, type HmxKv } from "@/data/kv";

ensureAgGrid();

const { toast } = useToast();

const theme = makeErpGridTheme();

const allRows = ref<HmxKv[]>([]);

// ---------- 顶部条件 + 父项 ----------
const queryCode = ref("");
const queryName = ref("");
const appliedCode = ref("");
const appliedName = ref("");
const selectedMasterCode = ref<string | null>(null);

const masters = computed(() => allRows.value.filter((r) => r.cPid === ""));
const filteredMasters = computed(() => {
  const code = appliedCode.value.trim().toLowerCase();
  const name = appliedName.value.trim().toLowerCase();
  return masters.value.filter(
    (r) => (!code || r.cCode.toLowerCase().includes(code)) && (!name || r.cName.toLowerCase().includes(name)),
  );
});
const selectedMaster = computed(() => masters.value.find((r) => r.cCode === selectedMasterCode.value) ?? null);

function onQuery() {
  appliedCode.value = queryCode.value;
  appliedName.value = queryName.value;
  selectFirstMaster();
}

function selectFirstMaster() {
  selectedMasterCode.value = filteredMasters.value[0]?.cCode ?? null;
}

const masterApi = ref<GridApi | null>(null);

const masterColumns: ColDef[] = [
  { colId: "cCode", field: "cCode", headerName: "编码", width: 140 },
  { colId: "cName", field: "cName", headerName: "名称", flex: 1 },
];

function masterRowId(p: GetRowIdParams) {
  return (p.data as HmxKv).cCode;
}

function onMasterGridReady(e: GridReadyEvent) {
  masterApi.value = e.api;
}

function onMasterSelectionChanged() {
  const row = masterApi.value?.getSelectedRows()[0] as HmxKv | undefined;
  if (row && row.cCode !== selectedMasterCode.value) {
    selectedMasterCode.value = row.cCode;
    selectedChildId.value = null;
  }
}

/** 行数据由 prop 异步套用，节点未就绪时短轮询重试 */
function syncMasterSelection(code: string | null, attempt = 0) {
  if (!code) return;
  const node = masterApi.value?.getRowNode(code);
  if (node) node.setSelected(true);
  else if (attempt < 10) setTimeout(() => syncMasterSelection(code, attempt + 1), 30);
}

watch(selectedMasterCode, (code) => nextTick(() => syncMasterSelection(code)));

// ---------- 子项 ----------
const children = computed(() => {
  const pid = selectedMasterCode.value;
  return pid ? allRows.value.filter((r) => r.cPid === pid) : [];
});
const selectedChildId = ref<string | null>(null);
const childApi = ref<GridApi | null>(null);

function onChildGridReady(e: GridReadyEvent) {
  childApi.value = e.api;
}

function onChildSelectionChanged() {
  const row = childApi.value?.getSelectedRows()[0] as HmxKv | undefined;
  selectedChildId.value = row?.id ?? null;
}

function onChildRefresh() {
  allRows.value = loadKvs();
  selectedChildId.value = null;
}

function onChildAdd() {
  const master = selectedMaster.value;
  if (!master) {
    toast("请先选择一个键值对");
    return;
  }
  const row: HmxKv = {
    id: newKvId(),
    cCode: "",
    cName: "",
    cDesc: "",
    cValue: "",
    cGroup: "",
    cOrder: String(children.value.length + 1),
    cEnable: "1",
    cSw01: "",
    cSw02: "",
    cSw03: "",
    cPid: master.cCode,
  };
  allRows.value = [...allRows.value, row];
  selectedChildId.value = row.id;
  nextTick(() => childApi.value?.getRowNode(row.id)?.setSelected(true));
}

function onChildDelete() {
  if (!selectedChildId.value) {
    toast("请先选择一个子键值对");
    return;
  }
  allRows.value = allRows.value.filter((r) => r.id !== selectedChildId.value);
  selectedChildId.value = null;
}

function onChildSave() {
  childApi.value?.stopEditing();
  saveKvs(allRows.value);
  toast(`操作成功：共[ ${allRows.value.length} ]条数据！`);
}

const ORANGE_CELL = "bg-orange-100/70 dark:bg-orange-950/60";

/** 启用列：即时切换复选框（免进编辑态），点击即回写源对象 "1"/"0" */
const EnableCheckboxCell = defineComponent({
  name: "EnableCheckboxCell",
  props: { params: { type: Object, required: true } },
  setup(props) {
    const row = computed(() => (props.params as { data: HmxKv }).data);
    return () =>
      h("input", {
        type: "checkbox",
        class: "kv-enable-checkbox",
        checked: row.value.cEnable === "1",
        onClick: (ev: MouseEvent) => {
          ev.stopPropagation();
          row.value.cEnable = (ev.target as HTMLInputElement).checked ? "1" : "0";
        },
      });
  },
});

const childColumns: ColDef[] = [
  { colId: "cCode", field: "cCode", headerName: "编码", width: 96, editable: true, sortable: false, cellClass: () => ORANGE_CELL },
  { colId: "cName", field: "cName", headerName: "名称", width: 180, editable: true, sortable: false },
  { colId: "cDesc", field: "cDesc", headerName: "描述", width: 140, editable: true, sortable: false },
  { colId: "cGroup", field: "cGroup", headerName: "分组", width: 90, editable: true, sortable: false },
  { colId: "cValue", field: "cValue", headerName: "扩展值", width: 100, editable: true, sortable: false },
  { colId: "cOrder", field: "cOrder", headerName: "排序", width: 60, editable: true, sortable: false, cellEditor: "number" },
  { colId: "cEnable", field: "cEnable", headerName: "启用", width: 60, sortable: false, cellRenderer: EnableCheckboxCell },
  { colId: "cSw01", field: "cSw01", headerName: "扩展1", width: 90, editable: true, sortable: false },
  { colId: "cSw02", field: "cSw02", headerName: "扩展2", width: 90, editable: true, sortable: false },
  { colId: "cSw03", field: "cSw03", headerName: "扩展3", width: 90, editable: true, sortable: false, flex: 1 },
];

function childRowId(p: GetRowIdParams) {
  return (p.data as HmxKv).id;
}

/** ag-grid 已把新值写回源对象；cOrder 数字编辑器产出 number，统一转回 string */
function onChildCellValueChanged(e: CellValueChangedEvent) {
  const row = e.data as HmxKv | undefined;
  if (!row) return;
  if (e.colDef.colId === "cOrder") row.cOrder = String(row.cOrder ?? "");
}

// ---------- 父项编辑弹窗 ----------
const editOpen = ref(false);
const editTarget = ref<HmxKv | null>(null);
const editForm = reactive({
  useClass: true,
  clsA: "",
  clsB: "",
  clsC: "",
  code: "",
  name: "",
});

function openMasterEdit(target: HmxKv | null) {
  editTarget.value = target;
  if (target) {
    const m = /^([A-Z])(\d{2})(\d{2}):(.*)$/.exec(target.cCode);
    editForm.useClass = !!m;
    editForm.clsA = m?.[1] ?? "";
    editForm.clsB = m?.[2] ?? "";
    editForm.clsC = m?.[3] ?? "";
    editForm.code = m ? m[4] : target.cCode;
  } else {
    editForm.useClass = true;
    editForm.clsA = "";
    editForm.clsB = "";
    editForm.clsC = "";
    editForm.code = "";
  }
  editForm.name = target?.cName ?? "";
  editOpen.value = true;
}

function onMasterAdd() {
  openMasterEdit(null);
}

function onMasterEdit() {
  if (!selectedMaster.value) {
    toast("请先选择一个键值对");
    return;
  }
  openMasterEdit(selectedMaster.value);
}

function onMasterSave() {
  const code = editForm.code.trim();
  const name = editForm.name.trim();
  if (!code) {
    toast("请输入键值对[编码]");
    return;
  }
  if (!name) {
    toast("请输入键值对[名称]");
    return;
  }
  if (!editForm.useClass && code.includes(":")) {
    toast("不允许包含特殊字符冒号");
    return;
  }
  if (editForm.useClass) {
    if (!/^[A-Za-z]$/.test(editForm.clsA) || !/^\d{2}$/.test(editForm.clsB) || !/^\d{2}$/.test(editForm.clsC)) {
      toast("分类不完整：分类A为单个字母，分类B/C为两位数字");
      return;
    }
  }
  const cCode = editForm.useClass ? `${editForm.clsA.toUpperCase()}${editForm.clsB}${editForm.clsC}:${code}` : code;
  if (!editTarget.value) {
    if (masters.value.some((r) => r.cCode === cCode)) {
      toast("该编码已存在");
      return;
    }
    allRows.value = [
      ...allRows.value,
      { id: newKvId(), cCode, cName: name, cDesc: "", cValue: "", cGroup: "", cOrder: "", cEnable: "1", cSw01: "", cSw02: "", cSw03: "", cPid: "" },
    ];
    selectedMasterCode.value = cCode;
  } else {
    editTarget.value.cName = name;
    saveKvs(allRows.value);
  }
  saveKvs(allRows.value);
  editOpen.value = false;
  toast("保存成功");
}

// ---------- 父项删除 ----------
const confirmOpen = ref(false);
const confirmTarget = ref<HmxKv | null>(null);
const confirmHasChildren = computed(() => !!confirmTarget.value && allRows.value.some((r) => r.cPid === confirmTarget.value!.cCode));

function onMasterDelete() {
  if (!selectedMaster.value) {
    toast("请先选择一个键值对");
    return;
  }
  confirmTarget.value = selectedMaster.value;
  confirmOpen.value = true;
}

function confirmDelete() {
  const target = confirmTarget.value;
  if (!target) return;
  allRows.value = allRows.value.filter((r) => r.cPid !== target.cCode && r.id !== target.id);
  saveKvs(allRows.value);
  confirmOpen.value = false;
  confirmTarget.value = null;
  if (selectedMasterCode.value === target.cCode) selectFirstMaster();
  selectedChildId.value = null;
  toast("删除成功");
}

onMounted(() => {
  allRows.value = loadKvs();
  selectFirstMaster();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 顶部条件行（对应原 panelControl1 + simpleButton 查询/添加/编辑/删除） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="queryCode" maxlength="100" placeholder="编码" autocapitalize="off" spellcheck="false"
        class="w-40 shrink-0" @keydown.enter="onQuery" />
      <InputText v-model="queryName" maxlength="100" placeholder="描述" autocapitalize="off" spellcheck="false"
        class="w-40 shrink-0" @keydown.enter="onQuery" />
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onQuery" label="查询">
        <template #icon>
          <Search class="h-3.5 w-3.5" />
        </template>
      </Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onMasterAdd" label="添加">
        <template #icon>
          <Plus class="h-3.5 w-3.5" />
        </template>
      </Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onMasterEdit" label="编辑">
        <template #icon>
          <Pencil class="h-3.5 w-3.5" />
        </template>
      </Button>
      <Button text size="small" severity="danger" class="shrink-0 whitespace-nowrap" @click="onMasterDelete" label="删除">
        <template #icon>
          <Trash2 class="h-3.5 w-3.5" />
        </template>
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">数据字典（父项 {{ masters.length }}）</span>
    </div>

    <!-- 左右分割面板：左父项列表 / 右子项可编辑表格（可拖拽，双击分隔条复位） -->
    <SplitView :initial="35">
      <template #left>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="erp-ag-grid h-full w-full" :theme="theme" :column-defs="masterColumns"
            :default-col-def="erpDefaultColDef" :row-data="filteredMasters" :get-row-id="masterRowId"
            :row-selection="'single'" :pagination="false" :animate-rows="false" :locale-text="AG_GRID_LOCALE_CN"
            @grid-ready="onMasterGridReady" @selection-changed="onMasterSelectionChanged" />
        </div>
      </template>

      <template #right>
        <!-- 子项工具栏（对应原 repositoryItemGridLookUpEdit 面板：刷新/添加/删除/保存） -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onChildRefresh" label="刷新">
            <template #icon>
              <RotateCw class="h-3.5 w-3.5" />
            </template>
          </Button>
          <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onChildAdd" label="添加">
            <template #icon>
              <Plus class="h-3.5 w-3.5" />
            </template>
          </Button>
          <Button text size="small" severity="danger" class="shrink-0 whitespace-nowrap" @click="onChildDelete" label="删除">
            <template #icon>
              <Trash2 class="h-3.5 w-3.5" />
            </template>
          </Button>
          <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onChildSave" label="保存">
            <template #icon>
              <Save class="h-3.5 w-3.5" />
            </template>
          </Button>
          <span class="ml-auto text-xs text-muted-foreground">{{ selectedMaster ? `子键值对（${selectedMaster.cName} ${children.length}）` : "子键值对" }}</span>
        </div>

        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="erp-ag-grid h-full w-full" :theme="theme" :column-defs="childColumns"
            :default-col-def="erpDefaultColDef" :row-data="children" :get-row-id="childRowId"
            :row-selection="'single'" :pagination="false" :animate-rows="false" :locale-text="AG_GRID_LOCALE_CN"
            @grid-ready="onChildGridReady" @selection-changed="onChildSelectionChanged"
            @cell-value-changed="onChildCellValueChanged" />
        </div>
      </template>
    </SplitView>

    <!-- 父项编辑弹窗（对应原 HmxKvEdit 分类 + 编码/名称） -->
    <Dialog :visible="editOpen" modal :header="editTarget ? '编辑键值对' : '添加键值对'"
      :style="{ width: 'min(28rem, calc(100vw - 2rem))' }" @update:visible="editOpen = $event">
      <div class="min-w-0 space-y-4 py-1">
        <div class="flex items-center gap-3">
          <label class="text-xs font-medium text-muted-foreground">使用分类</label>
          <ToggleSwitch v-model="editForm.useClass" :disabled="!!editTarget" />
        </div>
        <div class="grid grid-cols-3 gap-x-3 gap-y-3">
          <div class="min-w-0 space-y-1">
            <label class="text-xs font-medium text-muted-foreground">分类A</label>
            <InputText v-model="editForm.clsA" :disabled="!!editTarget || !editForm.useClass" placeholder="A-Z" maxlength="1" autocapitalize="off" spellcheck="false" class="w-full min-w-0" />
          </div>
          <div class="min-w-0 space-y-1">
            <label class="text-xs font-medium text-muted-foreground">分类B</label>
            <InputText v-model="editForm.clsB" :disabled="!!editTarget || !editForm.useClass" placeholder="两位数字" maxlength="2" autocapitalize="off" spellcheck="false" class="w-full min-w-0" />
          </div>
          <div class="min-w-0 space-y-1">
            <label class="text-xs font-medium text-muted-foreground">分类C</label>
            <InputText v-model="editForm.clsC" :disabled="!!editTarget || !editForm.useClass" placeholder="两位数字" maxlength="2" autocapitalize="off" spellcheck="false" class="w-full min-w-0" />
          </div>
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">编码<span class="ml-0.5 text-destructive">*</span></label>
          <InputText v-model="editForm.code" :disabled="!!editTarget" placeholder="请输入键值对编码" autocapitalize="off" spellcheck="false" class="w-full min-w-0" @keydown.enter="onMasterSave" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">名称<span class="ml-0.5 text-destructive">*</span></label>
          <InputText v-model="editForm.name" placeholder="请输入键值对名称" autocapitalize="off" spellcheck="false" class="w-full min-w-0" @keydown.enter="onMasterSave" />
        </div>
      </div>
      <template #footer>
        <Button label="取消" text @click="editOpen = false" />
        <Button label="保存" raised @click="onMasterSave" />
      </template>
    </Dialog>

    <!-- 父项删除确认（有子项时连带删除） -->
    <Dialog :visible="confirmOpen" modal header="删除确认" :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event">
      <p class="text-sm">{{ confirmHasChildren ? "该键值对存在多个子项，是否确定直接删除？" : `是否确定删除当前项「${confirmTarget?.cName}」？` }}</p>
      <template #footer>
        <Button label="取消" text @click="confirmOpen = false" />
        <Button label="删除" severity="danger" raised @click="confirmDelete" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.erp-ag-grid :deep(.kv-enable-checkbox) {
  width: 14px;
  height: 14px;
  accent-color: var(--primary);
  cursor: pointer;
  vertical-align: middle;
}
</style>
