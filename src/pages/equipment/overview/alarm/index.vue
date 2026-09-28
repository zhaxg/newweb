<script setup lang="ts">
/** 对应 AO0003 报警中心（模块一 总览 · 附录 B5 版式 L2：实时报警列表 + 自动弹窗）
 *  接口：alarmApi.page（POST /eam/alarm/listPage）· ack（/alarm/ack）· toWorkOrder（/alarm/toWorkOrder）· close（/alarm/close）
 *        + orgApi.assignees（转工单时的责任人候选）
 *  演示要点：**这一屏是主线第 4 幕的舞台**——AM0002 点「剧本：F4 轴承温度爬升」，20 秒后温度越报警线，
 *        `store.pushSample` 生成一条「报警级 / 紧急」活动报警，本页面每 5 秒拉一次，就会**自己跳出来**：
 *        既是右上角的 toast，也是居中那张弹窗（弹窗只提一次，同一个编号不重复弹，否则演示会被自己打断）。
 *        弹窗上直接给「转工单」：点完 AW0002 多一条待派工工单、这条报警变「已转工单」、AO0001 大屏警报条同步——
 *        这就是 equipment.md 要的「报警→工单」闭环被按一次钮走完。
 *        三类来源（在线监测 / 到期扫描 / 人工点检）在一张列表里同权：客户最常问的"超期没检算不算报警"，
 *        答案在这页能直接翻给他看（来源=到期扫描 那几条就是特种设备与计量的红黄标）。
 *  待接入：App / 短信推送（真实系统按岗位推到手机，这里只有站内 toast + 弹窗这一路）。
 *  已知偏差：弹窗是页面级轮询，没有服务端推送。 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, FirstDataRenderedEvent } from "ag-grid-community";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import ToggleButton from "primevue/togglebutton";
import { IconRotateClockwise, IconSearch } from "@tabler/icons-vue";
import { autoSizeOnFirstData, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { alarmApi, orgApi } from "@/api/equipment";
import type { Alarm } from "@/api/equipment/types";
import Pager from "../../Pager.vue";
import { actionRenderer, applyResult } from "../../rowActions";
import { dashFmt, numFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";

const POLL_MS = 5000;
const LEVELS = ["提示", "预警", "报警", "紧急"];
const STATUSES = ["活动", "已确认", "已转工单", "已关闭"];
const SOURCES = ["在线监测", "到期扫描", "人工点检"];

const theme = makeHmxGridTheme();
const { toast } = useToast();
const { eqName, ready } = useNameMaps();

const keyword = ref("");
const level = ref("");
const status = ref("");
const source = ref("");

const rows = ref<Alarm[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const querying = ref(false);
const autoRefresh = ref(true);
const assignees = ref<string[]>([]);

/** 已经弹过的报警编号：不记就会每 5 秒把同一条紧急报警再弹一次，演示到第三幕就被自己打断 */
const popped = new Set<string>();
const popup = ref<Alarm | null>(null);
const busy = ref(false);

/** PrimeVue 的 Dialog 只有 `v-model:visible` 一个开关，而这里的状态是「哪条报警」不是布尔：
 *  绑表达式会丢写回，所以点遮罩/关闭按钮时收成一个显式 handler。 */
function closePopup(v: boolean) {
  if (!v) popup.value = null;
}

let timer: ReturnType<typeof setInterval> | null = null;

async function query(silent = false) {
  if (!silent) querying.value = true;
  try {
    const res = await alarmApi.page({
      currentPage: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value,
      level: level.value,
      status: status.value,
      source: source.value,
    });
    rows.value = res?.rows ?? [];
    total.value = res?.total ?? 0;
    if (silent) catchUrgent(rows.value);
    else for (const a of rows.value) popped.add(a.id);
  } catch {
    /* 拦截层已 toast */
  }
  querying.value = false;
}

/** 轮询回来的这批里挑出「新的、紧急级、还在活动」的第一条弹窗提示 */
function catchUrgent(list: Alarm[]) {
  const fresh = list.filter((a) => a.level === "紧急" && a.status === "活动" && !popped.has(a.id));
  for (const a of list) popped.add(a.id);
  if (!fresh.length) return;
  const top = fresh[fresh.length - 1];
  popup.value = top;
  toast(top.msg, 5000, "error", "紧急报警");
}

function search() {
  page.value = 1;
  void query();
}

function reset() {
  keyword.value = "";
  level.value = "";
  status.value = "";
  source.value = "";
  search();
}

function onPage(p: number, size: number) {
  page.value = p;
  pageSize.value = size;
  void query();
}

function startPoll() {
  stopPoll();
  timer = setInterval(() => void query(true), POLL_MS);
}

function stopPoll() {
  if (timer) clearInterval(timer);
  timer = null;
}

watch(autoRefresh, (on) => (on ? startPoll() : stopPoll()));

onMounted(async () => {
  void query();
  if (autoRefresh.value) startPoll();
  try {
    assignees.value = (await orgApi.assignees()) ?? [];
  } catch {
    /* 拦截层已 toast；拉不到就只是转工单弹窗里没有责任人候选 */
  }
});

/** 名称表后到时重查一次：报警列表里的设备列是 valueFormatter 翻译的 */
watch(ready, (on) => {
  if (on) void query();
});

onBeforeUnmount(stopPoll);

async function run(res: Promise<unknown>, okMsg: string) {
  busy.value = true;
  try {
    if (applyResult(await res, okMsg, toast)) await query(true);
  } catch {
    /* 拦截层已 toast */
  }
  busy.value = false;
}

const ack = (row: Alarm) => void run(alarmApi.ack(row.id), "报警已确认");
const close = (row: Alarm) => void run(alarmApi.close(row.id), "报警已关闭");

/** 弹窗里的转工单：转完就把弹窗收掉，否则人还停在这条已经被处理掉的报警上 */
async function toOrder(id: string, assignee?: string) {
  busy.value = true;
  try {
    const res = await alarmApi.toWorkOrder(id, assignee);
    if (applyResult(res, "已生成维修工单", toast)) {
      popup.value = null;
      await query(true);
    }
  } catch {
    /* 拦截层已 toast */
  }
  busy.value = false;
}

/** 转工单要选人（真实动作是调度把单子派给班组），所以先弹一张只有责任人的表单，不直接调接口 */
const orderFor = ref<Alarm | null>(null);
const orderAssignee = ref<string | undefined>(undefined);

function closeOrder(v: boolean) {
  if (!v) orderFor.value = null;
}

function openOrder(row: Alarm) {
  orderFor.value = row;
  orderAssignee.value = undefined;
}

function submitOrder() {
  const a = orderFor.value;
  if (!a) return;
  orderFor.value = null;
  void toOrder(a.id, orderAssignee.value);
}

/** 弹窗上的「知道了」：确认后顺手收掉弹窗（人已经处理过这条了，没必要再看） */
function ackPopup() {
  const a = popup.value;
  if (!a) return;
  popup.value = null;
  void run(alarmApi.ack(a.id), "报警已确认");
}

function orderFromPopup() {
  const a = popup.value;
  if (!a) return;
  popup.value = null;
  openOrder(a);
}

const colDefs = computed<ColDef[]>(() => [
  { field: "id", headerName: "报警编号", width: 138 },
  { field: "occurredAt", headerName: "发生时间", width: 158 },
  { field: "level", headerName: "级别", width: 84, cellRenderer: tagRenderer() },
  { field: "source", headerName: "来源", width: 100, cellRenderer: tagRenderer() },
  { field: "eqId", headerName: "设备", minWidth: 160, valueFormatter: (p) => (p.value ? eqName(p.value) : "—") },
  { field: "pointId", headerName: "测点", width: 128, valueFormatter: (p) => (p.value ? String(p.value) : "—") },
  { field: "value", headerName: "触发值", width: 92, valueFormatter: numFmt(1) },
  { field: "msg", headerName: "报警内容", minWidth: 300, flex: 1 },
  { field: "status", headerName: "状态", width: 96, cellRenderer: tagRenderer() },
  { field: "woId", headerName: "关联工单", width: 128, valueFormatter: dashFmt },
  { field: "ackBy", headerName: "确认人", width: 96, valueFormatter: dashFmt },
  {
    colId: "actions",
    headerName: "操作",
    width: 172,
    sortable: false,
    pinned: "left",
    cellRenderer: actionRenderer([
      { label: "确认", shown: (r) => r.status === "活动", onClick: (r) => ack(r as Alarm) },
      {
        label: "转工单",
        shown: (r) => r.status === "活动" || r.status === "已确认",
        onClick: (r) => openOrder(r as Alarm),
      },
      { label: "关闭", shown: (r) => r.status === "已转工单", onClick: (r) => close(r as Alarm) },
    ]),
  },
]);

function onFirstData(e: FirstDataRenderedEvent) {
  autoSizeOnFirstData(e);
}

const summary = computed(() => {
  const active = rows.value.filter((a) => a.status === "活动").length;
  const urgent = rows.value.filter((a) => a.level === "紧急").length;
  return `共 ${total.value} 条 · 本页活动 ${active} · 紧急 ${urgent}${autoRefresh.value ? ` · 每 ${POLL_MS / 1000} 秒自动刷新` : ""}`;
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 条件区（4 个条件 → 独立条件区） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">关键词</label>
          <InputText v-model="keyword" placeholder="报警编号 / 内容" class="min-w-0 flex-1" @keydown.enter="search()" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">级别</label>
          <Select v-model="level" :options="LEVELS" show-clear placeholder="全部级别" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">来源</label>
          <Select v-model="source" :options="SOURCES" show-clear placeholder="全部来源" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">处理状态</label>
          <Select v-model="status" :options="STATUSES" show-clear placeholder="全部状态" class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="reset">
        <IconRotateClockwise class="h-3 w-3" />重置
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="search()">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <ToggleButton v-model="autoRefresh" onLabel="自动刷新" offLabel="已暂停刷新" />
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
      />
    </div>

    <Pager :total="total" :page="page" :page-size="pageSize" @change="onPage" />

    <!-- 紧急报警自动弹窗：只给「确认」和「转工单」两个出口，演示要的就是这一下 -->
    <Dialog
      :visible="!!popup"
      modal
      header="紧急报警"
      :style="{ width: 'min(34rem, calc(100vw - 2rem))' }"
      @update:visible="closePopup"
    >
      <div v-if="popup" class="min-w-0 space-y-2 py-1">
        <div class="flex min-w-0 items-center gap-2">
          <span class="shrink-0 rounded bg-red-500/15 px-1.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
            {{ popup.level }}
          </span>
          <span class="truncate text-body font-medium">{{ popup.eqId ? eqName(popup.eqId) : popup.source }}</span>
          <span class="ml-auto shrink-0 text-xs text-muted-foreground">{{ popup.occurredAt }}</span>
        </div>
        <div class="text-body">{{ popup.msg }}</div>
        <div class="text-xs text-muted-foreground">
          {{ popup.id }} · 触发值 {{ popup.value }} · 测点 {{ popup.pointId || "—" }}
        </div>
      </div>
      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <Button label="知道了" variant="outlined" :loading="busy" @click="ackPopup" />
          <Button label="转工单" :loading="busy" autofocus @click="orderFromPopup" />
        </div>
      </template>
    </Dialog>

    <!-- 转工单：选责任人（留空即由调度后续派工） -->
    <Dialog
      :visible="!!orderFor"
      modal
      header="报警转工单"
      :style="{ width: 'min(28rem, calc(100vw - 2rem))' }"
      @update:visible="closeOrder"
    >
      <div class="min-w-0 space-y-3 py-1">
        <div class="text-body">{{ orderFor?.msg }}</div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs text-muted-foreground">派给</label>
          <Select
            v-model="orderAssignee"
            :options="assignees"
            show-clear
            placeholder="暂不派工（工单停在待派工）"
            class="min-w-0 w-full"
            autofocus
          />
        </div>
      </div>
      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <Button label="取消" variant="outlined" @click="orderFor = null" />
          <Button label="生成工单" :loading="busy" @click="submitOrder" />
        </div>
      </template>
    </Dialog>
  </div>
</template>
