<script setup lang="ts">
/** 对应 EM0005 报警中心（模块二 · 附录 B5 版式 L6 状态流 + 五级看板）
 *  接口：alarmApi.board（POST /ems/alarm/board，五级分桶 + 状态计数）
 *        · alarmApi.page / ack / ackAll / close / toDispatch（POST /ems/alarm/*）
 *  演示要点：**报警不是列表，是一条闭环**。B2.1 的四态（活动 → 已确认 → 已转调度令 → 已关闭）
 *        在这页要走完，所以顶部五级卡是**入口**、行内动作是**推进**：
 *        点「重大」卡就把列表筛到那一级（筛选写回条件区同一个 model，不另起一份状态），
 *        「转调度令」在 mock 里真的建一张 DD 草拟单并带上报警的介质、柜位、级别上下文，
 *        EM0006 当场见到那张单子——**只在本页变灰、别的页毫无反应的报警系统是假的**。
 *        「一键确认全部」刻意只确认、不关闭：确认是"我知道了"，关闭是"这事结了"，
 *        把两件事合成一个按钮，事故追溯时就再也分不出谁在什么时候真的处置过。
 *        级别的中文措辞与颜色同源（`cells.ALARM_LEVEL_NAME` + `TAG_CLASS`），
 *        所以卡上的「重大」和表里那一行的「重大」一定是同一个词、同一个色。
 *  待接入：报警推送（短信/APP）与报警抑制规则（同一测点短时重复抑制），契约里还没有这两项。 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { alarmApi } from "@/api/energy";
import type { AlarmBoardDto } from "@/api/energy/types";
import { ALARM_LEVEL_NAME, dashFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";
import { emsPanelClass } from "../../emsTheme";

const { mediumMap, unitMap, ready } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const board = ref<AlarmBoardDto | null>(null);
const busy = ref(false);

/** 看板与列表是两次请求：看板要的是**全站分布**，列表可能被客户筛过，两者各说各的话 */
async function loadBoard() {
  try {
    board.value = await alarmApi.board();
  } catch {
    /* 拦截层已 toast；看板留着上一次的样子，比清成一片空白有用 */
  }
}
/** 动作之后看板与列表一起重读：卡上的数字不动，客户就以为按钮没起作用 */
async function refreshAll() {
  if (busy.value) return;
  busy.value = true;
  try {
    await loadBoard();
    listRef.value?.reload();
  } finally {
    busy.value = false;
  }
}
onMounted(() => {
  void loadBoard();
});
/** 名称表后到要重查一次：`mediaCode`/`unitId` 两列的翻译靠它（见 `nameMaps.ts` 文件头） */
watch(ready, (on) => {
  if (on) listRef.value?.reload();
});

const LEVEL_WORDS = computed(() => Object.values(ALARM_LEVEL_NAME));
const LEVEL_VALUE_MAP = computed(() => Object.fromEntries(Object.entries(ALARM_LEVEL_NAME).map(([c, n]) => [n, c])));
const STATUS_WORDS = ["活动", "已确认", "已转调度令", "已关闭"];
const TYPE_WORDS = ["越限", "柜位高危", "允许放散", "需量超限", "通讯中断", "数据异常", "质量超标"];
const MEDIA_OPTIONS = computed(() => Object.values(mediumMap.value));
const MEDIA_VALUE_MAP = computed(() => Object.fromEntries(Object.entries(mediumMap.value).map(([c, n]) => [n, c])));

/** 级别 → 卡的强调色 class：读 `tagClass` 的同一批档位，卡与行不会分家 */
const LEVEL_CARD: Record<string, string> = {
  事故: "border-red-500/40 text-red-600 dark:text-red-400",
  重大: "border-red-500/30 text-red-600 dark:text-red-300",
  一般: "border-amber-500/35 text-amber-600 dark:text-amber-300",
  提示: "border-sky-500/35 text-primary dark:text-sky-300",
  告知: "border-border text-muted-foreground",
};

const spec = computed<ListPageSpec>(() => ({
  code: "EM0005",
  queryLabelWidth: "w-16",
  query: [
    { key: "keyword", label: "报警", kind: "input", placeholder: "编号 / 内容 / 测点" },
    {
      key: "level",
      label: "级别",
      kind: "select",
      options: LEVEL_WORDS.value,
      valueMap: LEVEL_VALUE_MAP.value,
      placeholder: "全部",
    },
    { key: "status", label: "状态", kind: "select", options: STATUS_WORDS, placeholder: "全部" },
    { key: "type", label: "类型", kind: "select", options: TYPE_WORDS, placeholder: "全部" },
    {
      key: "mediaCode",
      label: "介质",
      kind: "select",
      options: MEDIA_OPTIONS.value,
      valueMap: MEDIA_VALUE_MAP.value,
      placeholder: "全部",
    },
  ],
  columns: [
    { field: "time", headerName: "发生时间", minWidth: 152, valueFormatter: dashFmt },
    {
      field: "level",
      headerName: "级别",
      width: 92,
      valueFormatter: (p) => ALARM_LEVEL_NAME[String(p.value)] ?? String(p.value ?? "—"),
      cellRenderer: tagRenderer(),
    },
    { field: "type", headerName: "类型", width: 104, cellRenderer: tagRenderer() },
    { field: "message", headerName: "报警内容", minWidth: 240, flex: 1 },
    {
      field: "mediaCode",
      headerName: "介质",
      width: 96,
      valueFormatter: (p) => mediumMap.value[String(p.value)] ?? dashFmt(p),
    },
    {
      field: "unitId",
      headerName: "用能单元",
      minWidth: 128,
      valueFormatter: (p) => unitMap.value[String(p.value)] ?? dashFmt(p),
    },
    { field: "pointId", headerName: "测点", width: 104, valueFormatter: dashFmt },
    { field: "status", headerName: "状态", width: 106, cellRenderer: tagRenderer() },
    { field: "ackBy", headerName: "确认人", width: 88, valueFormatter: dashFmt },
    { field: "dispatchId", headerName: "关联调度令", width: 124, valueFormatter: dashFmt },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    {
      label: "确认",
      kind: "run",
      shown: (r: any) => r.status === "活动",
      okMsg: "已确认",
      run: (r: any) => alarmApi.ack(r.id),
    },
    {
      label: "转调度令",
      kind: "run",
      /** 活动先要确认、已确认才能转令（B2.1 的状态机），按钮按当前态出现而不是全时常在 */
      shown: (r: any) => r.status === "已确认" && !r.dispatchId,
      confirm: "按该报警生成一张草拟调度令？介质、柜位与期望效果将自动带入 EM0006，不需要再抄一遍。",
      okMsg: "已生成草拟调度令",
      run: (r: any) => alarmApi.toDispatch(r.id),
    },
    {
      label: "关闭",
      kind: "run",
      shown: (r: any) => r.status !== "已关闭",
      okMsg: "已关闭",
      run: (r: any) => alarmApi.close(r.id),
    },
    {
      label: "去调度令",
      kind: "link",
      to: "/energy/monitor/dispatch",
      shown: (r: any) => Boolean(r.dispatchId),
      refresh: false,
    },
  ],
  toolbar: {
    acts: [
      {
        label: "一键确认全部活动报警",
        confirm: "确认全部活动报警？只表示值班已知晓，不关闭报警、不生成调度令。",
        okMsg: "已全部确认",
        run: () => alarmApi.ackAll(),
      },
    ],
  },
  detail: {
    sections: [
      {
        title: "报警事实",
        fields: [
          { label: "报警编号", from: "id" },
          { label: "发生时间", from: "time" },
          { label: "级别", from: "level", map: ALARM_LEVEL_NAME },
          { label: "类型", from: "type" },
          { label: "报警内容", from: "message" },
          { label: "介质", from: "mediaCode", map: mediumMap.value },
          { label: "用能单元", from: "unitId", map: unitMap.value },
          { label: "触发测点", from: "pointId" },
        ],
      },
      {
        title: "处置留痕",
        fields: [
          { label: "当前状态", from: "status" },
          { label: "确认人", from: "ackBy" },
          { label: "确认时间", from: "ackAt" },
          { label: "关联调度令", from: "dispatchId" },
          { label: "关闭时间", from: "closedAt" },
        ],
      },
    ],
  },
  fetch: (q) => alarmApi.page(q),
  summary: ({ total, rows }) => {
    const act = rows.filter((r: any) => r.status === "活动").length;
    const top = rows.filter((r: any) => r.status === "活动" && Number(r.level) <= 2).length;
    return `共 ${total} 条 · 本页活动 ${act} · 其中事故/重大 ${top}`;
  },
}));

/** 卡的点击即筛选：`setQuery` 把值写回条件区同一个 model，所以再点一次就是取消 */
function pickLevel(level: number) {
  listRef.value?.setQuery("level", ALARM_LEVEL_NAME[String(level)]);
}
</script>

<template>
  <div :class="['flex min-h-0 flex-1 flex-col gap-2 p-2']">
    <!-- 顶部：五级看板卡 + 状态计数。卡是筛选入口，不是装饰 -->
    <section :class="[emsPanelClass, 'shrink-0 px-2.5 py-2']">
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="l in board?.levels ?? []"
          :key="l.level"
          type="button"
          :class="[
            'rounded border bg-muted/50 px-2.5 py-1.5 text-left transition-colors hover:bg-accent',
            LEVEL_CARD[ALARM_LEVEL_NAME[String(l.level)]] ?? '',
          ]"
          @click="pickLevel(l.level)"
        >
          <div class="text-xs">{{ ALARM_LEVEL_NAME[String(l.level)] }}</div>
          <div class="text-base font-semibold tabular-nums">{{ l.total }}</div>
          <div class="text-xs tabular-nums text-muted-foreground">待确认 {{ l.unacked }}</div>
        </button>
        <div class="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums text-muted-foreground">
          <span>活动 {{ board?.stats.unacked ?? 0 }}</span>
          <span>已确认 {{ board?.stats.acked ?? 0 }}</span>
          <span>已转令 {{ board?.stats.toDispatch ?? 0 }}</span>
          <span>已关闭 {{ board?.stats.closed ?? 0 }}</span>
          <span>今日累计 {{ board?.stats.today ?? 0 }}</span>
        </div>
      </div>
    </section>

    <div class="shrink-0 px-1 text-xs text-muted-foreground">
      报警闭环：活动 → 确认 → 转调度令 → 关闭。点上面的级别卡即可筛到那一级，再点一次取消。
    </div>

    <ListPage ref="listRef" :spec="spec" @changed="refreshAll" />
  </div>
</template>
