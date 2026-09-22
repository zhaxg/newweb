<script setup lang="ts">
/** 对应 HmxKvEdit（键值对维护）：HmxWinForms.Dialogs.HmxKvEdit
 *  画面迁移，逻辑不迁移到 */

import { computed, defineComponent, h, nextTick, onMounted, reactive, ref, watch } from "vue";
import { IconDeviceFloppy, IconPencil, IconPlus, IconRotateClockwise, IconSearch, IconTrash } from "@tabler/icons-vue";

import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import ToggleSwitch from "primevue/toggleswitch";
import { AgGridVue } from "ag-grid-vue3";
import type { CellValueChangedEvent, ColDef, GetRowIdParams, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { useToast } from "@/composables/useToast";
import { systemKeyValueApi } from "@/api/admin/request";
import { NextStrId } from "@/lib/yitIdHelper";
import type { HmxKv } from "@/api/admin/types";

const { toast } = useToast();
const theme = makeHmxGridTheme();

const masters = ref<HmxKv[]>([]);
const children = ref<HmxKv[]>([]);
const mastersLoading = ref(false);
const childrenLoading = ref(false);

// ---------- 顶部条件 + 父项 ----------
const queryCode = ref("");
const queryName = ref("");
const selectedMasterId = ref<string | null>(null);

const selectedMaster = computed(() => masters.value.find((r) => r.id === selectedMasterId.value) ?? null);

async function onQuery() {
  mastersLoading.value = true;
  try {
    masters.value = (await systemKeyValueApi.querySysKvList("", queryCode.value.trim(), queryName.value.trim())) ?? [];
    await selectMaster(masters.value[0]?.id ?? null);
  } catch {
    /* 拦截层已 toast */
  } finally {
    mastersLoading.value = false;
  }
}

async function selectMaster(id: string | null) {
  selectedMasterId.value = id;
  if (!id) {
    children.value = [];
    return;
  }
  childrenLoading.value = true;
  selectedChildId.value = null;
  try {
    children.value = (await systemKeyValueApi.querySysKvItemList(id)) ?? [];
  } catch {
    children.value = [];
  } finally {
    childrenLoading.value = false;
  }
}

const masterApi = ref<GridApi | null>(null);

const masterColumns: ColDef[] = [
  { colId: "cCode", field: "cCode", headerName: "编码", width: 140 },
  { colId: "cName", field: "cName", headerName: "名称", flex: 1 },
];

function masterRowId(p: GetRowIdParams) {
  return String((p.data as HmxKv).id);
}

function onMasterGridReady(e: GridReadyEvent) {
  masterApi.value = e.api;
}

function onMasterSelectionChanged() {
  const row = masterApi.value?.getSelectedRows()[0] as HmxKv | undefined;
  if (row && row.id !== selectedMasterId.value) selectMaster(row.id ?? null);
}

function syncMasterSelection(id: string | null, attempt = 0) {
  if (!id) return;
  const node = masterApi.value?.getRowNode(String(id));
  if (node) node.setSelected(true);
  else if (attempt < 10) setTimeout(() => syncMasterSelection(id, attempt + 1), 30);
}

watch(selectedMasterId, (id) => nextTick(() => syncMasterSelection(id)));

// ---------- 子项 ----------
const selectedChildId = ref<string | null>(null);
const childApi = ref<GridApi | null>(null);

function onChildGridReady(e: GridReadyEvent) {
  childApi.value = e.api;
}

function onChildSelectionChanged() {
  const row = childApi.value?.getSelectedRows()[0] as HmxKv | undefined;
  selectedChildId.value = row?.id ?? null;
}

async function onChildRefresh() {
  await selectMaster(selectedMasterId.value);
}

function onChildAdd() {
  const master = selectedMaster.value;
  if (!master) {
    toast("请先选择一个键值对", 2000, "warn");
    return;
  }
  const row: HmxKv = {
    selected: false,
    id: NextStrId(),
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
    cPid: master.id ?? "",
  };
  children.value = [...children.value, row];
  selectedChildId.value = row.id ?? null;
  nextTick(() => childApi.value?.getRowNode(String(row.id))?.setSelected(true));
}

function onChildDelete() {
  if (!selectedChildId.value) {
    toast("请先选择一个子键值对", 2000, "warn");
    return;
  }
  children.value = children.value.filter((r) => r.id !== selectedChildId.value);
  selectedChildId.value = null;
}

function onChildSave() {
  childApi.value?.stopEditing();
  const payload = children.value.map((r) => ({ ...r }));
  systemKeyValueApi
    .saveChangesForChildKvItems(payload)
    .then(() => {
      toast(`操作成功：共[ ${payload.length} ]条数据！`, 2000, "success");
      return selectMaster(selectedMasterId.value);
    })
    .catch(() => {
      /* 拦截层已 toast */
    });
}

const ORANGE_CELL = "bg-orange-100/70 dark:bg-orange-950/60";

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
  return String((p.data as HmxKv).id);
}

function onChildCellValueChanged(e: CellValueChangedEvent) {
  const row = e.data as HmxKv | undefined;
  if (!row) return;
  if (e.colDef.colId === "cOrder") row.cOrder = String(row.cOrder ?? "");
}

// ---------- 父项编辑弹窗 ----------
const editOpen = ref(false);
const editTarget = ref<HmxKv | null>(null);
const editSaving = ref(false);
const editForm = reactive({
  useClass: true,
  clsA: "",
  clsB: "",
  clsC: "",
  code: "",
  name: "",
});

async function openMasterEdit(target: HmxKv | null) {
  editTarget.value = target;
  if (target) {
    const m = /^([A-Za-z])(\d{2})(\d{2}):(.*)$/.exec(target.cCode ?? "");
    editForm.useClass = !!m;
    editForm.clsA = m?.[1] ?? "";
    editForm.clsB = m?.[2] ?? "";
    editForm.clsC = m?.[3] ?? "";
    editForm.code = m ? m[4] : target.cCode ?? "";
    editForm.name = target.cName ?? "";
  } else {
    // 新增：向「服务端」取默认分类（对应 hmx_web prepareNewKvEditInput）
    editForm.name = "";
    editForm.code = "";
    try {
      const preset = await systemKeyValueApi.prepareNewKvEditInput();
      editForm.useClass = preset.useClassfy ?? true;
      editForm.clsA = preset.classA ?? "";
      editForm.clsB = preset.classB ?? "";
      editForm.clsC = preset.classC ?? "";
    } catch {
      editForm.useClass = true;
      editForm.clsA = "A";
      editForm.clsB = "0";
      editForm.clsC = "0";
    }
  }
  editOpen.value = true;
}

function onMasterAdd() {
  openMasterEdit(null);
}

function onMasterEdit() {
  if (!selectedMaster.value) {
    toast("请先选择一个键值对", 2000, "warn");
    return;
  }
  openMasterEdit(selectedMaster.value);
}

function onMasterSave() {
  const code = editForm.code.trim();
  const name = editForm.name.trim();
  if (!code) {
    toast("请输入键值对[编码]", 2000, "warn");
    return;
  }
  if (!name) {
    toast("请输入键值对[名称]", 2000, "warn");
    return;
  }
  if (!editForm.useClass && code.includes(":")) {
    toast("不允许包含特殊字符冒号", 2000, "warn");
    return;
  }
  if (editForm.useClass) {
    if (!/^[A-Za-z]$/.test(editForm.clsA) || !/^\d{2}$/.test(editForm.clsB) || !/^\d{2}$/.test(editForm.clsC)) {
      toast("分类不完整：分类A为单个字母，分类B/C为两位数字", 2000, "warn");
      return;
    }
  }
  editSaving.value = true;
  systemKeyValueApi
    .insertOrUpdateParentKvItem({
      classA: editForm.clsA.toUpperCase(),
      classB: editForm.clsB,
      classC: editForm.clsC,
      code,
      name,
      useClassfy: editForm.useClass,
      filedItems: [],
    })
    .then(async () => {
      const keepId = editTarget.value?.id;
      editOpen.value = false;
      masters.value = (await systemKeyValueApi.querySysKvList("", "", "")) ?? [];
      await selectMaster(keepId ?? masters.value[0]?.id ?? null);
      toast("保存成功", 2000, "success");
    })
    .catch(() => {
      /* 拦截层已 toast */
    })
    .finally(() => {
      editSaving.value = false;
    });
}

// ---------- 父项删除 ----------
const confirmOpen = ref(false);
const confirmTarget = ref<HmxKv | null>(null);
const confirmHasChildren = ref(false);

function onMasterDelete() {
  const master = selectedMaster.value;
  if (!master) {
    toast("请先选择一个键值对", 2000, "warn");
    return;
  }
  confirmTarget.value = master;
  confirmHasChildren.value = children.value.length > 0;
  confirmOpen.value = true;
}

function confirmDelete() {
  const target = confirmTarget.value;
  if (!target) return;
  systemKeyValueApi
    .removeParentKvItem(target.id)
    .then(async () => {
      confirmOpen.value = false;
      confirmTarget.value = null;
      masters.value = (await systemKeyValueApi.querySysKvList("", "", "")) ?? [];
      await selectMaster(masters.value[0]?.id ?? null);
      toast("删除成功", 2000, "success");
    })
    .catch(() => {
      /* 拦截层已 toast */
    });
}

onMounted(onQuery);
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 顶部条件行（对应原 panelControl1 + simpleButton 查询/添加/编辑/删除） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="queryCode" maxlength="100" placeholder="编码" autocapitalize="off" spellcheck="false"
        class="w-40 shrink-0" @keydown.enter="onQuery" />
      <InputText v-model="queryName" maxlength="100" placeholder="描述" autocapitalize="off" spellcheck="false"
        class="w-40 shrink-0" @keydown.enter="onQuery" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onMasterAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onMasterEdit">
        <IconPencil class="h-3 w-3" />编辑
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onMasterDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">数据字典（父项 {{ masters.length }}）</span>
    </div>

    <!-- 左右分割面板：左父项列表 / 右子项可编辑表格（PrimeVue Splitter，可拖拽） -->
    <Splitter :gutter-size="1" class="min-h-0 flex-1">
      <SplitterPanel :size="35" :min-size="15">
        <div class="flex h-full min-h-0 flex-col overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="masterColumns"
            :default-col-def="hmxDefaultColDef" :row-data="masters" :get-row-id="masterRowId"
            :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }" :loading="mastersLoading" :pagination="false" :animate-rows="false"
            :locale-text="AG_GRID_LOCALE_CN" @grid-ready="onMasterGridReady" @selection-changed="onMasterSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <SplitterPanel :size="65" :min-size="30">
        <div class="flex h-full min-h-0 flex-col">
          <!-- 子项工具栏（对应原 repositoryItemGridLookUpEdit 面板：刷新/添加/删除/保存） -->
          <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
            <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onChildRefresh">
              <IconRotateClockwise class="h-3 w-3" />刷新
            </Button>
            <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onChildAdd">
              <IconPlus class="h-3 w-3" />添加
            </Button>
            <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onChildDelete">
              <IconTrash class="h-3 w-3" />删除
            </Button>
            <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onChildSave">
              <IconDeviceFloppy class="h-3 w-3" />保存
            </Button>
            <span class="ml-auto text-xs text-muted-foreground">{{ selectedMaster ? `子键值对（${selectedMaster.cName} ${children.length}）` : "子键值对" }}</span>
          </div>

          <div class="min-h-0 flex-1 overflow-hidden">
            <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="childColumns"
              :default-col-def="hmxDefaultColDef" :row-data="children" :get-row-id="childRowId"
              :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }" :loading="childrenLoading" :pagination="false" :animate-rows="false"
              :locale-text="AG_GRID_LOCALE_CN" @grid-ready="onChildGridReady" @selection-changed="onChildSelectionChanged"
              @cell-value-changed="onChildCellValueChanged" @first-data-rendered="autoSizeOnFirstData" />
          </div>
        </div>
      </SplitterPanel>
    </Splitter>

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
        <Button label="取消" variant="outlined" @click="editOpen = false" />
        <Button label="保存" variant="outlined" :loading="editSaving" @click="onMasterSave" />
      </template>
    </Dialog>

    <!-- 父项删除确认（有子项时连带删除） -->
    <Dialog :visible="confirmOpen" modal header="删除确认" :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event">
      <p class="text-xs">{{ confirmHasChildren ? `该键值对[${confirmTarget?.cName}]存在多个子项，是否确定直接删除？` : `是否确定删除当前项「${confirmTarget?.cName}」？` }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="删除" severity="danger" variant="outlined" @click="confirmDelete" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.hmx-ag-grid :deep(.kv-enable-checkbox) {
  width: 14px;
  height: 14px;
  accent-color: var(--primary);
  cursor: pointer;
  vertical-align: middle;
}

/* 分割线最小 1px，但用不可见伪元素把拖拽热区撑到 9px（伪元素命中算作 gutter 本身） */
:deep(.p-splitter-gutter)::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: -4px;
  right: -4px;
}
</style>
