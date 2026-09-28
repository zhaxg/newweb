<script setup lang="ts">
import { ref } from "vue";
import { IconPencil, IconPlus, IconRefresh, IconRobot, IconTrash, IconCheck } from "@tabler/icons-vue";
import Button from "primevue/button";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GetRowIdParams, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import Tax1001EditDialog from "./Tax1001EditDialog.vue";
import Tax1002AutoDialog from "./Tax1002AutoDialog.vue";

/** 对应 FrmTax1000（班次班组循环配置）：GlueNet.Widgets.ShiftGroup.FrmTax1000
 *  画面迁移，逻辑不迁移到 */

const { toast } = useToast();
const theme = makeHmxGridTheme();

interface ShiftGroupConfig {
  cPlantId?: string;
  cLineNo?: string;
  cProcCd?: string;
  cWorkshop?: string;
  cMachineId?: string;
}

interface Tax1010 {
  id: string;
  nSeqNo?: number;
  cClassRate?: string;
  nClassHours?: number;
  nIsUsing?: number;
}

interface Tax1020 {
  id: string;
  nSeqNo?: number;
  cClassGroup?: string;
  nIsUsing?: number;
}

const configs = ref<ShiftGroupConfig[]>([]);
const shiftLoops = ref<Tax1010[]>([]);
const groupLoops = ref<Tax1020[]>([]);

const configApi = ref<GridApi | null>(null);
const selectedConfig = ref<ShiftGroupConfig | null>(null);

const editOpen = ref(false);
const editTarget = ref<ShiftGroupConfig | null>(null);
const autoOpen = ref(false);

// ---------- 左侧 排班配置 ----------
const configColDefs: ColDef[] = [
  { colId: "cPlantId", field: "cPlantId", headerName: "工厂", minWidth: 70, flex: 1 },
  { colId: "cLineNo", field: "cLineNo", headerName: "产线", minWidth: 60, flex: 1 },
  { colId: "cProcCd", field: "cProcCd", headerName: "工序", minWidth: 60, flex: 1 },
  { colId: "cWorkshop", field: "cWorkshop", headerName: "车间", minWidth: 70, flex: 1 },
  { colId: "cMachineId", field: "cMachineId", headerName: "机台", minWidth: 70, flex: 1 },
];

function getConfigRowId(p: GetRowIdParams) {
  const d = p.data as ShiftGroupConfig;
  return `${d.cPlantId}|${d.cWorkshop}|${d.cMachineId}`;
}

function onConfigReady(e: GridReadyEvent) {
  configApi.value = e.api;
}

function onConfigSelectionChanged() {
  const row = configApi.value?.getSelectedRows()[0] as ShiftGroupConfig | undefined;
  selectedConfig.value = row ?? null;
}

// ---------- 中间 班次循环 ----------
const yesNoFmt = (p: ValueFormatterParams) => (p.value === 1 ? "是" : "否");

const shiftColDefs: ColDef[] = [
  { colId: "nSeqNo", field: "nSeqNo", headerName: "顺序", width: 56, pinned: "left" as const },
  { colId: "cClassRate", field: "cClassRate", headerName: "班次", width: 80 },
  { colId: "nClassHours", field: "nClassHours", headerName: "班次小时", width: 80 },
  { colId: "nIsUsing", field: "nIsUsing", headerName: "是否启用", width: 76, valueFormatter: yesNoFmt },
  { colId: "cPlantId", field: "cPlantId", headerName: "工厂", width: 80 },
  { colId: "cLineNo", field: "cLineNo", headerName: "产线", width: 70 },
  { colId: "cProcCd", field: "cProcCd", headerName: "工序", width: 70 },
  { colId: "cWorkshop", field: "cWorkshop", headerName: "车间", width: 70 },
  { colId: "cMachineId", field: "cMachineId", headerName: "机台", width: 70 },
  { colId: "Creator", field: "Creator", headerName: "创建人", width: 80 },
  { colId: "CreateTime", field: "CreateTime", headerName: "创建时间", width: 130 },
  { colId: "LastModifier", field: "LastModifier", headerName: "最后修改人", width: 90 },
  { colId: "LastModifyTime", field: "LastModifyTime", headerName: "最后修改时间", width: 130 },
];

function getShiftRowId(p: GetRowIdParams) {
  return (p.data as Tax1010).id;
}

// ---------- 右侧 班组循环 ----------
const groupColDefs: ColDef[] = [
  { colId: "nSeqNo", field: "nSeqNo", headerName: "顺序", width: 56, pinned: "left" as const },
  { colId: "cClassGroup", field: "cClassGroup", headerName: "班组", width: 80 },
  { colId: "nIsUsing", field: "nIsUsing", headerName: "是否启用", width: 76, valueFormatter: yesNoFmt },
  { colId: "cPlantId", field: "cPlantId", headerName: "工厂", width: 80 },
  { colId: "cLineNo", field: "cLineNo", headerName: "产线", width: 70 },
  { colId: "cProcCd", field: "cProcCd", headerName: "工序", width: 70 },
  { colId: "cWorkshop", field: "cWorkshop", headerName: "车间", width: 70 },
  { colId: "cMachineId", field: "cMachineId", headerName: "机台", width: 70 },
  { colId: "Creator", field: "Creator", headerName: "创建人", width: 80 },
  { colId: "CreateTime", field: "CreateTime", headerName: "创建时间", width: 130 },
  { colId: "LastModifier", field: "LastModifier", headerName: "最后修改人", width: 90 },
  { colId: "LastModifyTime", field: "LastModifyTime", headerName: "最后修改时间", width: 130 },
];

function getGroupRowId(p: GetRowIdParams) {
  return (p.data as Tax1020).id;
}

// ---------- 工具栏 ----------
function onQuery() {
  toast("画面迁移：查询逻辑待接入", 2000, "warn");
}

function onAutoShift() {
  autoOpen.value = true;
}

function requireConfig(): boolean {
  if (!selectedConfig.value) {
    toast("请先选择左侧排班配置", 2000, "warn");
    return false;
  }
  return true;
}

function onAddMain() {
  editTarget.value = null;
  editOpen.value = true;
}

function onEditMain() {
  if (!requireConfig()) return;
  editTarget.value = selectedConfig.value;
  editOpen.value = true;
}

function onEditSubmit() {
  editOpen.value = false;
  toast("画面迁移：保存逻辑待接入", 2000, "warn");
}

function onAdd1010() {
  if (requireConfig()) {
    /* TODO */
  }
}
function onDelete1010() {
  /* TODO */
}
function onSave1010() {
  toast("画面迁移：保存逻辑待接入", 2000, "warn");
}

function onAdd1020() {
  if (requireConfig()) {
    /* TODO */
  }
}
function onDelete1020() {
  /* TODO */
}
function onSave1020() {
  toast("画面迁移：保存逻辑待接入", 2000, "warn");
}

function onAutoSubmit() {
  autoOpen.value = false;
  toast("画面迁移：自动排班逻辑待接入", 2000, "warn");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 顶部工具栏：添加/编辑（左表） + 查询 + 自动排班 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onAddMain">
        <IconPlus class="h-3.5 w-3.5" />添加
      </Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onEditMain">
        <IconPencil class="h-3.5 w-3.5" />编辑
      </Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onQuery">
        <IconRefresh class="h-3.5 w-3.5" />查询
      </Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onAutoShift">
        <IconRobot class="h-3.5 w-3.5" />自动排班
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">班次班组循环配置</span>
    </div>

    <!-- 三栏 + PrimeVue 可拖动分割 -->
    <Splitter class="min-h-0 flex-1" layout="horizontal">
      <!-- 左栏 -->
      <SplitterPanel :size="28" :minSize="15" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">排班配置</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :column-defs="configColDefs"
            :default-col-def="hmxDefaultColDef"
            :row-data="configs"
            :get-row-id="getConfigRowId"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false"
            :animate-rows="false"
            :locale-text="AG_GRID_LOCALE_CN"
            @grid-ready="onConfigReady"
            @selection-changed="onConfigSelectionChanged"
          />
        </div>
      </SplitterPanel>

      <!-- 中栏 -->
      <SplitterPanel :size="36" :minSize="20" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onAdd1010">
            <IconPlus class="h-3.5 w-3.5" />添加
          </Button>
          <Button text size="small" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete1010">
            <IconTrash class="h-3.5 w-3.5" />删除
          </Button>
          <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onSave1010">
            <IconCheck class="h-3.5 w-3.5" />保存
          </Button>
          <span class="ml-auto text-xs text-muted-foreground">班次循环</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :column-defs="shiftColDefs"
            :default-col-def="hmxDefaultColDef"
            :row-data="shiftLoops"
            :get-row-id="getShiftRowId"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false"
            :animate-rows="false"
            :locale-text="AG_GRID_LOCALE_CN"
          />
        </div>
      </SplitterPanel>

      <!-- 右栏 -->
      <SplitterPanel :minSize="20" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onAdd1020">
            <IconPlus class="h-3.5 w-3.5" />添加
          </Button>
          <Button text size="small" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete1020">
            <IconTrash class="h-3.5 w-3.5" />删除
          </Button>
          <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onSave1020">
            <IconCheck class="h-3.5 w-3.5" />保存
          </Button>
          <span class="ml-auto text-xs text-muted-foreground">班组循环</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :column-defs="groupColDefs"
            :default-col-def="hmxDefaultColDef"
            :row-data="groupLoops"
            :get-row-id="getGroupRowId"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false"
            :animate-rows="false"
            :locale-text="AG_GRID_LOCALE_CN"
          />
        </div>
      </SplitterPanel>
    </Splitter>

    <Tax1001EditDialog v-model:open="editOpen" :config="editTarget" @submit="onEditSubmit" />
    <Tax1002AutoDialog v-model:open="autoOpen" @submit="onAutoSubmit" />
  </div>
</template>
