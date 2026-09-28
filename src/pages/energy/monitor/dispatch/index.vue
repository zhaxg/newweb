<script setup lang="ts">
/** 对应 EM0006 调度令管理（模块二 · 附录 B5 版式 L6 状态流 + 五态看板）
 *  接口：dispatchApi.stat（GET /ems/dispatch/stat，五态计数）
 *        · dispatchApi.page / issue / exec / receipt（POST /ems/dispatch/*）
 *  演示要点：**这是 8 幕剧本的收口页**——幕 4 从 EM0005 转过来的、幕 5 从 EM0002/EM0007 采纳的
 *        建议都在这里落成一张真单子，五态走完（草拟 → 已下达 → 执行完毕 → 已回执）之后
 *        幕 8 才可能看见大屏和 EM0002 的柜位斜率回落。
 *        **动作按钮按当前态出现，不是全时常显**：状态机在 mock 里是硬门禁
 *        （`execDone` 拒绝草拟单、`receiptClose` 拒绝未执行完毕的单子），
 *        页面把不能点的按钮也摆出来，客户点一次就看到一句拒绝，反而像 bug。
 *        「执行完毕」是**这条链上唯一改到月账的动作**：CFB 投运台数写进 `effect` 并重算月账，
 *        所以确认文案里明说了"自发电量与柜位基线将同时变化"——EP0004、EO0001 会跟着动，
 *        这正是这套演示要证明的事（各页各说各话的系统不叫联动）。
 *        **逾期是读时判定**（`deadline` 比演示时钟），所以顶部那条逾期提示、列表里红色的时限
 *        与「已回执」的计数永远同一把尺；单据上不存在一个会过期的 overdue 字段。
 *  待接入：调度令的手动起草与附件、接收端回执确认（真实 EMS 有移动端，本域契约里没这两项）。 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { dispatchApi, personApi } from "@/api/energy";
import { dashFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";
import { emsPanelClass } from "../../emsTheme";

const { ready } = useNameMaps();

const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const stat = ref<Awaited<ReturnType<typeof dispatchApi.stat>> | null>(null);
const busy = ref(false);

async function loadStat() {
  try {
    stat.value = await dispatchApi.stat();
  } catch {
    /* 拦截层已 toast */
  }
}
async function refreshAll() {
  if (busy.value) return;
  busy.value = true;
  try {
    await loadStat();
    listRef.value?.reload();
  } finally {
    busy.value = false;
  }
}
onMounted(() => {
  void loadStat();
});
watch(ready, (on) => {
  if (on) listRef.value?.reload();
});

/** 接收人候选与报警接收人、补录人同一批人（`GET /ems/person/list`），页面不写死名单 */
const receivers = ref<string[]>([]);
onMounted(() => {
  personApi
    .list()
    .then((rows) => {
      receivers.value = (rows ?? []).map((p) => p.name);
    })
    .catch(() => {
      /* 拉不到就留空：这一列只用于筛选，不影响动作 */
    });
});

const TYPES = ["放散许可", "加减负荷", "机组启停", "停复役", "运行方式变更", "降压限用"];
const STATUSES = ["草拟", "已下达", "执行中", "已完成", "已回执"];

/** 五态卡的措辞与色标：状态词直接取 `TAG_CLASS` 的那五档，卡与行同一个颜色 */
const STATE_CARDS: Array<{ key: keyof NonNullable<typeof stat.value>; label: string; cls: string }> = [
  { key: "draft", label: "草拟", cls: "text-foreground" },
  { key: "issued", label: "已下达", cls: "text-primary dark:text-sky-300" },
  { key: "running", label: "执行中", cls: "text-primary dark:text-sky-200" },
  { key: "done", label: "已完成", cls: "text-emerald-600 dark:text-emerald-300" },
  { key: "receipt", label: "已回执", cls: "text-muted-foreground" },
];

const spec = computed<ListPageSpec>(() => ({
  code: "EM0006",
  queryLabelWidth: "w-16",
  query: [
    { key: "keyword", label: "调度令", kind: "input", placeholder: "编号 / 原因 / 接收人" },
    { key: "status", label: "状态", kind: "select", options: STATUSES, placeholder: "全部" },
    { key: "type", label: "类型", kind: "select", options: TYPES, placeholder: "全部" },
    { key: "receiver", label: "接收人", kind: "select", options: receivers.value, placeholder: "全部" },
  ],
  columns: [
    { field: "id", headerName: "编号", width: 140 },
    { field: "type", headerName: "类型", width: 116 },
    { field: "reason", headerName: "原因", minWidth: 200, flex: 1 },
    /**
     * 指令明细行里是**数组**（一次调度可以下好几种操作项），所以用 `valueGetter` 现拼一列文本；
     * 详情弹窗不做这种翻译（它只按字段名取值），要看逐条指令与期望效果请看这一列。
     */
    {
      field: "actions",
      headerName: "调度指令",
      minWidth: 220,
      valueGetter: (p) => (p.data?.actions ?? []).map((a: any) => a.instruction).join("；") || "—",
    },
    { field: "issuer", headerName: "签发人", width: 92 },
    { field: "receiver", headerName: "接收人", width: 92 },
    { field: "status", headerName: "状态", width: 100, cellRenderer: tagRenderer() },
    { field: "createdAt", headerName: "创建时间", minWidth: 152, valueFormatter: dashFmt },
    {
      field: "deadline",
      headerName: "执行时限",
      minWidth: 152,
      valueFormatter: dashFmt,
      /** 逾期标红读的是行上的 `overdue`（mock 每次列表都按演示时钟重判），页面不比日期 */
      cellClass: (p: any) => (p.data?.overdue ? "text-red-600 dark:text-red-400 font-medium" : ""),
    },
    { field: "receiptAt", headerName: "回执时间", minWidth: 152, valueFormatter: dashFmt },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    {
      label: "下达",
      kind: "run",
      shown: (r: any) => r.status === "草拟",
      confirm: "下达该调度令？接收人将收到指令、执行时限开始计时，此后逾期判定就挂在这张单子上。",
      okMsg: "已下达",
      run: (r: any) => dispatchApi.issue(r.id),
    },
    {
      label: "执行完毕",
      kind: "run",
      shown: (r: any) => r.status === "已下达" || r.status === "执行中",
      confirm:
        "确认现场已执行完毕？采纳时锁存的处置量在这里兑现：柜位基线与自备机组投运台数同时改变，自发电量、放散率与月账结算都会跟着动。",
      okMsg: "已执行完毕",
      run: (r: any) => dispatchApi.exec(r.id),
    },
    {
      label: "回执核销",
      kind: "run",
      shown: (r: any) => r.status === "已完成",
      confirm: "接收人回执并核销？由报警转来的调度令会同步关闭那条关联报警。",
      okMsg: "已回执",
      run: (r: any) => dispatchApi.receipt(r.id),
    },
    {
      label: "去报警中心",
      kind: "link",
      to: "/energy/monitor/alarm",
      shown: (r: any) => Boolean(r.alarmId),
      refresh: false,
    },
  ],
  detail: {
    sections: [
      {
        title: "调度令内容",
        fields: [
          { label: "调度令编号", from: "id" },
          { label: "类型", from: "type" },
          { label: "编制原因", from: "reason" },
          { label: "关联报警", from: "alarmId" },
          { label: "签发人", from: "issuer" },
          { label: "接收人", from: "receiver" },
          { label: "执行时限", from: "deadline" },
        ],
      },
      {
        title: "状态流转",
        fields: [
          { label: "当前状态", from: "status" },
          { label: "创建时间", from: "createdAt" },
          { label: "下达时间", from: "issuedAt" },
          { label: "执行完毕时间", from: "doneAt" },
          { label: "回执时间", from: "receiptAt" },
          { label: "是否逾期", from: "overdue", map: { true: "逾期未回执", false: "未逾期" } },
        ],
      },
    ],
  },
  fetch: (q) => dispatchApi.page(q),
  /** 顶部提示报的是**五态 + 逾期**，不是「共 N 条」：这页要回答的第一问是"还有几张单子压在手里" */
  summary: ({ total }) =>
    `本页 ${total} 张 · 全站在途 ${(stat.value?.issued ?? 0) + (stat.value?.running ?? 0)} · 待回执 ${stat.value?.done ?? 0}`,
}));

function pickStatus(status: string) {
  listRef.value?.setQuery("status", status);
}
</script>

<template>
  <div :class="['flex min-h-0 flex-1 flex-col gap-2 p-2']">
    <section :class="[emsPanelClass, 'shrink-0 px-2.5 py-2']">
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="c in STATE_CARDS"
          :key="c.key"
          type="button"
          class="rounded border border-border bg-muted/50 px-3 py-1.5 text-left transition-colors hover:bg-accent"
          @click="pickStatus(c.label)"
        >
          <div class="text-xs text-muted-foreground">{{ c.label }}</div>
          <div :class="['text-base font-semibold tabular-nums', c.cls]">{{ stat?.[c.key] ?? 0 }}</div>
        </button>
        <div class="ml-auto flex items-center gap-3 text-xs tabular-nums">
          <span class="text-muted-foreground">总计 {{ stat?.total ?? 0 }}</span>
          <span v-if="stat?.overdue" class="font-medium text-red-600 dark:text-red-400"
            >逾期未回执 {{ stat.overdue }}</span
          >
          <span v-else class="text-muted-foreground">无逾期单据</span>
        </div>
      </div>
    </section>

    <div class="shrink-0 px-1 text-xs text-muted-foreground">
      五态闭环：草拟 → 下达 → 执行完毕 → 回执核销。处置量在「执行完毕」这一步才真正兑现，柜位与月账同时变化。
    </div>

    <ListPage ref="listRef" :spec="spec" @changed="refreshAll" />
  </div>
</template>
