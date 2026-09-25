<script setup lang="ts">
/** 对应 FrmTsTask（计划任务管理）：HmxWinForms.Forms.Admin.FrmTsTask
 *  画面迁移，逻辑不迁移到 */

import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref } from "vue";
import { IconPencil, IconPlayerPlay, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Tag from "primevue/tag";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GetRowIdParams, GridApi, GridReadyEvent } from "ag-grid-community";
import { autoSizeOnFirstData, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { quartzNetApi } from "@/api/admin/request";
import type { HmxBackgroudJobInfo, HmxSchedulerStatusInfo } from "@/api/admin/types";
import { HmxJobMisfiredEnums, YesNo } from "@/api/admin/enums";
import { NextStrId } from "@/lib/yitIdHelper";
import JobEditDialog from "./JobEditDialog.vue";

const { toast } = useToast();

const theme = makeHmxGridTheme();

const rows = ref<HmxBackgroudJobInfo[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
const selectedId = ref<string | null>(null);

const editOpen = ref(false);
const editJob = ref<HmxBackgroudJobInfo | null>(null);

const confirmOpen = ref(false);
const confirmTarget = ref<HmxBackgroudJobInfo | null>(null);

const EnableColorCell = defineComponent({
  name: "EnableColorCell",
  props: { params: { type: Object, required: true } },
  setup(props) {
    return () =>
      h("span", {
        class: "block h-full w-full",
        style: {
          backgroundColor: (props.params as { value: unknown }).value === YesNo.Y ? "rgb(82 196 26)" : "rgb(245 34 45)",
        },
      });
  },
});

/** 1rem 对应的实际像素（html font-size = --hmx-scale × 16px，随字体档位缩放） */
const REM = 2 * parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

const columnDefs: ColDef[] = [
  {
    colId: "enable",
    field: "enable",
    headerName: "",
    width: REM,
    minWidth: REM,
    maxWidth: REM,
    pinned: "left",
    sortable: false,
    resizable: true,
    filter: false,
    suppressHeaderMenuButton: true,
    cellRenderer: EnableColorCell,
  },
  { colId: "cName", field: "cName", headerName: "任务名称", width: 140 },
  { colId: "cTrigerName", field: "cTrigerName", headerName: "触发器", width: 100 },
  { colId: "cSetupTime", field: "cSetupTime", headerName: "设置时间", width: 150 },
  { colId: "cNextTime", field: "cNextTime", headerName: "下次时间", width: 150 },
  { colId: "cLastTime", field: "cLastTime", headerName: "最后时间", width: 150 },
  { colId: "cAssemblyQualifiedName", field: "cAssemblyQualifiedName", headerName: "任务类限定名", width: 260 },
  { colId: "cScheduler", field: "cScheduler", headerName: "调度组", width: 100 },
  { colId: "cLastMessage", field: "cLastMessage", headerName: "最后消息", width: 140, flex: 1 },
];

function getRowId(p: GetRowIdParams) {
  return (p.data as HmxBackgroudJobInfo).id ?? "";
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function onSelectionChanged() {
  const row = gridApi.value?.getSelectedRows()[0] as HmxBackgroudJobInfo | undefined;
  selectedId.value = row?.id ?? null;
}

const selectedRow = computed(() => rows.value.find((r) => r.id === selectedId.value) ?? null);

async function query() {
  if (querying.value) return;
  querying.value = true;
  try {
    const jobs = await quartzNetApi.queryAllBackgroudJobs();
    rows.value = jobs ?? [];
    selectedId.value = null;
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

// ---------- 调度器状态（60s 轮询） ----------
const statusInfo = ref<HmxSchedulerStatusInfo | null>(null);

async function refreshStatus() {
  try {
    const status = await quartzNetApi.getSchedulerStatus();
    statusInfo.value = status ?? { enable: false, schedulerName: "Default", lastUpdateTime: "" };
  } catch {
    /* 拦截层已 toast */
  }
}

let statusTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  refreshStatus();
  query();
  statusTimer = setInterval(refreshStatus, 1000 * 60);
});

onBeforeUnmount(() => {
  if (statusTimer) clearInterval(statusTimer);
});

// ---------- 新增 / 编辑 ----------
function now(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function onAdd() {
  editJob.value = {
    id: NextStrId(),
    cName: "样例任务",
    cTrigerName: "5分钟",
    cSetupTime: now(),
    cCronExp: undefined,
    nIntervalMinutes: 5,
    nRepetCount: -1,
    nDelayMinutes: 0,
    cNextTime: "",
    cLastTime: "",
    cAssemblyQualifiedName: "Hmx.Http.Core.Scheduler.SimpleJobTest, Hmx.Http.Core",
    enable: YesNo.Y,
    enablePaiallel: YesNo.N,
    cFlagMisfired: HmxJobMisfiredEnums.ExecuteNow,
  };
  editOpen.value = true;
}

function onEdit() {
  const row = selectedRow.value;
  if (!row?.id) return;
  editJob.value = row;
  editOpen.value = true;
}

function onRowDoubleClicked(e: { data?: HmxBackgroudJobInfo }) {
  if (e.data) {
    editJob.value = e.data;
    editOpen.value = true;
  }
}

async function onEditSubmit(payload: HmxBackgroudJobInfo) {
  let resp: unknown;
  try {
    resp = await quartzNetApi.insertOrReplaceBackgroudJob(payload);
  } catch {
    return;
  }
  // hmx_web 语义：(!resp) 即成功
  if (!resp) {
    editOpen.value = false;
    toast("保存成功", 2000, "success");
    query();
  }
}

// ---------- 删除 ----------
function onDelete() {
  const row = selectedRow.value;
  if (!row) return;
  confirmTarget.value = row;
  confirmOpen.value = true;
}

async function confirmDelete() {
  const row = confirmTarget.value;
  if (!row) return;
  try {
    await quartzNetApi.removeBackgroudJob(row);
  } catch {
    return;
  }
  confirmOpen.value = false;
  confirmTarget.value = null;
  toast(`计划任务 ${row.cName} 已删除`, 2000, "success");
  query();
}

// ---------- 手动执行 ----------
async function onExcute() {
  const row = selectedRow.value;
  if (!row) return;
  try {
    await quartzNetApi.manualExcuteJob(row);
  } catch {
    return;
  }
  toast(`计划任务 ${row.cName} 已手动执行一次`, 2000, "success");
  query();
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏：左侧调度器状态标签，右侧操作按钮（对应 hmx_web jobs/index 顶部行） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <span class="shrink-0 text-xs text-muted-foreground">状态：</span>
      <Tag severity="success" :value="statusInfo?.schedulerName ?? 'Default'" class="shrink-0" />
      <Tag severity="success" :value="statusInfo?.lastUpdateTime || '-'" class="shrink-0" />
      <Button variant="outlined" class="ml-2 shrink-0 whitespace-nowrap" @click="query">
        <IconRefresh class="h-3 w-3" />刷新
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3 w-3" />新增
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onEdit">
        <IconPencil class="h-3 w-3" />编辑
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onExcute">
        <IconPlayerPlay class="h-3 w-3" />手动执行
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">计划任务（{{ rows.length }}）</span>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :column-defs="columnDefs"
        :row-data="rows"
        :get-row-id="getRowId"
        :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
        :loading="querying"
        :pagination="false"
        :animate-rows="false"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @row-double-clicked="onRowDoubleClicked"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>

    <JobEditDialog v-model:open="editOpen" :job="editJob" @submit="onEditSubmit" />

    <!-- 删除确认（对应原 DialogPlugin.confirm 警告框） -->
    <Dialog
      :visible="confirmOpen"
      modal
      header="警告"
      :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event"
    >
      <p class="text-xs">你确定删除当前选择的计划任务么: {{ confirmTarget?.cName }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" severity="danger" variant="outlined" autofocus @click="confirmDelete" />
      </template>
    </Dialog>
  </div>
</template>
