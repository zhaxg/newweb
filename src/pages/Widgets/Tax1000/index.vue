<script setup lang="ts">
import { ref } from "vue";
import { IconPencil, IconPlus, IconRefresh, IconRobot, IconTrash, IconCheck } from "@tabler/icons-vue";
import Button from "primevue/button";
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
  { colId: "cPlantId", field: "cPlantId", headerName: "工厂", flex: 1 },
  { colId: "cWorkshop", field: "cWorkshop", headerName: "车间", flex: 1 },
  { colId: "cMachineId", field: "cMachineId", headerName: "机台", flex: 1 },
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
  // TODO: 接入 row.shiftLoops / row.groupLoops 联动加载
}

// ---------- 中间 班次循环 ----------
const yesNoFmt = (p: ValueFormatterParams) => (p.value === 1 ? "是" : "否");

const shiftColDefs: ColDef[] = [
  { colId: "nSeqNo", field: "nSeqNo", headerName: "顺序", width: 64 },
  { colId: "cClassRate", field: "cClassRate", headerName: "班次", width: 90 },
  { colId: "nClassHours", field: "nClassHours", headerName: "班次小时", width: 84 },
  { colId: "nIsUsing", field: "nIsUsing", headerName: "是否启用", width: 84, valueFormatter: yesNoFmt },
];

function getShiftRowId(p: GetRowIdParams) {
  return (p.data as Tax1010).id;
}

// ---------- 右侧 班组循环 ----------
const groupColDefs: ColDef[] = [
  { colId: "nSeqNo", field: "nSeqNo", headerName: "顺序", width: 64 },
  { colId: "cClassGroup", field: "cClassGroup", headerName: "班组", width: 90 },
  { colId: "nIsUsing", field: "nIsUsing", headerName: "是否启用", width: 84, valueFormatter: yesNoFmt },
];

function getGroupRowId(p: GetRowIdParams) {
  return (p.data as Tax1020).id;
}

// ---------- 工具栏（逻辑不迁移，占位） ----------
function onQuery() {
  // TODO: 接入 IShiftAppService.QueryShiftGroupConfigs
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
  // TODO: 接入 IShiftAppService 保存配置及明细
  editOpen.value = false;
  toast("画面迁移：保存逻辑待接入", 2000, "warn");
}

function onAdd1010() {
  if (!requireConfig()) return;
  // TODO: 对应原 tax1010BindingSource.AddNew()
}

function onDelete1010() {
  // TODO: 对应原 tax1010BindingSource.RemoveCurrent()
}

function onSave1010() {
  // TODO: 接入 IShiftAppService.SaveTax1010
  toast("画面迁移：保存逻辑待接入", 2000, "warn");
}

function onAdd1020() {
  if (!requireConfig()) return;
  // TODO: 对应原 tax1020BindingSource.AddNew()
}

function onDelete1020() {
  // TODO: 对应原 tax1020BindingSource.RemoveCurrent()
}

function onSave1020() {
  // TODO: 接入 IShiftAppService.SaveTax1020
  toast("画面迁移：保存逻辑待接入", 2000, "warn");
}

function onAutoSubmit() {
  // TODO: 接入自动排班
  autoOpen.value = false;
  toast("画面迁移：自动排班逻辑待接入", 2000, "warn");
}

</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 顶部工具栏（对应原 flowLayoutPanel1：查询/自动排班） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onQuery">
        <IconRefresh class="h-3.5 w-3.5" />查询
      </Button>
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onAutoShift">
        <IconRobot class="h-3.5 w-3.5" />自动排班
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">班次班组循环配置</span>
    </div>

    <!-- 三栏布局（对应原 SplitContainerControl 嵌套） -->
    <div class="flex min-h-0 flex-1">
      <div class="flex min-w-0 basis-[28%] flex-col border-r border-border/60">
        <div class="flex h-8 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onAddMain">
            <IconPlus class="h-3.5 w-3.5" />添加
          </Button>
          <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onEditMain">
            <IconPencil class="h-3.5 w-3.5" />编辑
          </Button>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="configColDefs"
            :default-col-def="hmxDefaultColDef" :row-data="configs" :get-row-id="getConfigRowId"
            :row-selection="'single'" :pagination="false" :animate-rows="false" :locale-text="AG_GRID_LOCALE_CN"
            @grid-ready="onConfigReady" @selection-changed="onConfigSelectionChanged" />
        </div>
      </div>

      <div class="flex min-w-0 basis-[38%] flex-col border-r border-border/60">
        <div class="flex h-8 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onAdd1010">
            <IconPlus class="h-3.5 w-3.5" />添加
          </Button>
          <Button variant="outlined" size="small" severity="danger" class="shrink-0 whitespace-nowrap"
            @click="onDelete1010">
            <IconTrash class="h-3.5 w-3.5" />删除
          </Button>
          <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onSave1010">
            <IconCheck class="h-3.5 w-3.5" />保存
          </Button>
        </div>
        <div class="shrink-0 px-2 py-1 text-xs font-medium text-muted-foreground">班次循环</div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="shiftColDefs"
            :default-col-def="hmxDefaultColDef" :row-data="shiftLoops" :get-row-id="getShiftRowId"
            :row-selection="'single'" :pagination="false" :animate-rows="false" :locale-text="AG_GRID_LOCALE_CN" />
        </div>
      </div>

      <div class="flex min-w-0 flex-1 flex-col">
        <div class="flex h-8 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onAdd1020">
            <IconPlus class="h-3.5 w-3.5" />添加
          </Button>
          <Button variant="outlined" size="small" severity="danger" class="shrink-0 whitespace-nowrap"
            @click="onDelete1020">
            <IconTrash class="h-3.5 w-3.5" />删除
          </Button>
          <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onSave1020">
            <IconCheck class="h-3.5 w-3.5" />保存
          </Button>
        </div>
        <div class="shrink-0 px-2 py-1 text-xs font-medium text-muted-foreground">班组循环</div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="groupColDefs"
            :default-col-def="hmxDefaultColDef" :row-data="groupLoops" :get-row-id="getGroupRowId"
            :row-selection="'single'" :pagination="false" :animate-rows="false" :locale-text="AG_GRID_LOCALE_CN" />
        </div>
      </div>
    </div>

    <Tax1001EditDialog v-model:open="editOpen" :config="editTarget" @submit="onEditSubmit" />
    <Tax1002AutoDialog v-model:open="autoOpen" @submit="onAutoSubmit" />
  </div>
</template>
