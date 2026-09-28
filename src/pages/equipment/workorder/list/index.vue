<script setup lang="ts">
/** 对应 AW0003 工单管理（模块四 维修工单 · 附录 B4 第 5、7 幕 · 版式 L1 列表 + L5 详情）
 *  接口：workOrderApi.page（POST /eam/workOrder/listPage）/ detail（GET /eam/workOrder/detail）
 *        + sparePartApi.list / equipmentApi.list（外键翻译，见 ../../nameMaps.ts）+ exportRows("workOrder")
 *  演示要点：**这一页演的是状态机，不是列表**——工单五个状态（待派工→已派工→执行中→待验证→已关闭）
 *        每个状态的**可做的事不一样**，所以推进动作全部收在详情弹窗（L5）里按当前状态出现，
 *        列表只负责「找到那张单」。不套 `ListPage`：它的 `detail` 是通用 label/value 弹窗，
 *        画不出 `steps[]` 时间轴，也没有动作区（见 ../../listTypes.ts 文件头那句「不适合骨架的页面各自写」）。
 *        第 5 幕在这里派工给张伟，第 7 幕在这里验证通过——验证通过会连带刷设备履历、健康度、寿命件与报警，
 *        所以每次动作后既重查列表、也**重取一次详情**，时间轴要立刻多出一行。
 *  待接入：无。 */
import { computed, onMounted, ref, watch } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, FirstDataRenderedEvent } from "ag-grid-community";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconRotateClockwise, IconSearch } from "@tabler/icons-vue";
import { autoSizeOnFirstData, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { exportRows, workOrderApi } from "@/api/equipment";
import type { WorkOrder } from "@/api/equipment/types";
import Pager from "../../Pager.vue";
import WoDialog from "../../WoDialog.vue";
import { actionRenderer, applyResult } from "../../rowActions";
import { dashFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import { toStamp } from "../../dateField";

const STATUSES = ["待派工", "已派工", "执行中", "待验证", "已关闭"];
const SOURCES = ["报警转单", "故障报修", "PM计划", "PdM诊断", "人工"];
const PRIORITIES = ["紧急", "高", "中", "低"];

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { eqName, ready } = useNameMaps();

/* ── 查询条件 ─────────────────────────────────────────────────────────── */
const keyword = ref("");
const status = ref("");
const source = ref("");
const priority = ref("");
const range = ref<Date[] | null>(null);

const rows = ref<WorkOrder[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const querying = ref(false);

async function query() {
  if (querying.value) return;
  querying.value = true;
  try {
    const q: Record<string, any> = { currentPage: page.value, pageSize: pageSize.value };
    if (keyword.value.trim()) q.keyword = keyword.value.trim();
    if (status.value) q.status = status.value;
    if (source.value) q.source = source.value;
    if (priority.value) q.priority = priority.value;
    // 区间固定送 startTime/endTime（mock 的 dateRange 只认这两个键，且靠字典序比较）
    if (range.value?.[0]) q.startTime = toStamp(range.value[0]);
    if (range.value?.[1]) q.endTime = toStamp(range.value[1]);
    const res = await workOrderApi.page(q);
    rows.value = res?.rows ?? [];
    total.value = res?.total ?? rows.value.length;
  } catch {
    /* 拦截层已 toast */
  }
  querying.value = false;
}

function reset() {
  keyword.value = "";
  status.value = "";
  source.value = "";
  priority.value = "";
  range.value = null;
  page.value = 1;
  void query();
}

function onPage(p: number, size: number) {
  page.value = p;
  pageSize.value = size;
  void query();
}

onMounted(query);

/** 名称表是后到的（AG Grid 的 valueFormatter 只在渲染时跑），到位后重查一次，别让客户看一屏 EQ-012 */
watch(ready, (on) => {
  if (on) void query();
});

const summary = computed(() => {
  const wait = rows.value.filter((r) => r.status === "待派工").length;
  const doing = rows.value.filter((r) => r.status === "执行中" || r.status === "已派工").length;
  const urgent = rows.value.filter((r) => r.priority === "紧急" && r.status !== "已关闭").length;
  return `共 ${total.value} 张工单 · 本页待派工 ${wait} · 在修 ${doing} · 未完紧急 ${urgent}`;
});

/* ── 详情弹窗（L5）────────────────────────────────────────────────────── */
const detailOpen = ref(false);
const current = ref<WorkOrder | null>(null);

function openWo(row: WorkOrder) {
  current.value = row;
  detailOpen.value = true;
}

/**
 * 动作成功后：列表重查（状态色标要变），详情**重取**（时间轴多一条、领料多一行）。
 * 重取而不是本地 push——`closeWorkOrder` 的副作用发生在 store 里，页面猜不到它改了什么。
 */
async function onChanged() {
  const id = current.value?.id;
  await query();
  if (!id) return;
  try {
    current.value = (await workOrderApi.detail(id)) ?? current.value;
  } catch {
    /* 拦截层已 toast；保留手上的行，弹窗照常显示 */
  }
}

const colDefs: ColDef[] = [
  { field: "id", headerName: "工单号", width: 132 },
  { field: "title", headerName: "工单内容", minWidth: 190, flex: 1 },
  { field: "eqId", headerName: "设备", minWidth: 150, valueFormatter: (p) => eqName(p.value) },
  { field: "source", headerName: "来源", width: 100, sortable: false, cellRenderer: tagRenderer() },
  { field: "priority", headerName: "优先级", width: 92, sortable: false, cellRenderer: tagRenderer() },
  { field: "status", headerName: "状态", width: 96, sortable: false, cellRenderer: tagRenderer() },
  { field: "assignee", headerName: "责任人", width: 90, valueFormatter: dashFmt },
  {
    colId: "hours",
    headerName: "工时（计划/实际）",
    width: 140,
    sortable: false,
    valueGetter: (p) => `${p.data.planHours} / ${p.data.actualHours || 0} h`,
  },
  { field: "createdAt", headerName: "下达时间", width: 158 },
  {
    colId: "actions",
    headerName: "操作",
    width: 90,
    sortable: false,
    pinned: "left",
    cellRenderer: actionRenderer([{ label: "详情", onClick: (row) => openWo(row as WorkOrder) }]),
  },
];

function onFirstData(e: FirstDataRenderedEvent) {
  autoSizeOnFirstData(e);
}

/** 条件清了再查：分页要回第 1 页，否则停在第 4 页清空条件会看到一个空窗 */
function search() {
  page.value = 1;
  void query();
}

async function doExport() {
  applyResult(await exportRows("workOrder"), "导出任务已提交", toast);
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（5 个条件，日期范围占两格，正好一行 grid-cols-6） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">关键词</label>
          <InputText
            v-model="keyword"
            placeholder="工单号 / 内容 / 故障描述"
            class="min-w-0 flex-1"
            @keydown.enter="search()"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">状态</label>
          <Select v-model="status" :options="STATUSES" show-clear placeholder="全部状态" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">来源</label>
          <Select v-model="source" :options="SOURCES" show-clear placeholder="全部来源" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">优先级</label>
          <Select v-model="priority" :options="PRIORITIES" show-clear placeholder="全部优先级" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">下达时间</label>
          <DatePicker
            v-model="range"
            selection-mode="range"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-time
            hour-format="24"
            show-icon
            placeholder="开始时间"
            class="min-w-0 flex-1"
          />
        </div>
      </div>
    </div>

    <!-- 工具栏 h-9：按钮靠左、统计靠右 -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="reset">
        <IconRotateClockwise class="h-3 w-3" />重置
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="search()">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="doExport"> 导出 </Button>
      <span class="ml-auto text-xs text-muted-foreground">{{ summary }}</span>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden px-1 py-1">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :column-defs="colDefs"
        :row-data="rows"
        :pagination="false"
        @first-data-rendered="onFirstData"
        @row-dblclick="openWo($event.data as WorkOrder)"
      />
    </div>

    <Pager :total="total" :page="page" :page-size="pageSize" @change="onPage" />

    <WoDialog v-model:open="detailOpen" :wo="current" @changed="onChanged" />
  </div>
</template>
