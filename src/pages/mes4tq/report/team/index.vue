<script setup lang="ts">
/** 对应 TR0002 班组指标完成情况（统计报表 · 附录 A3 版式 **L4 排名榜单图 + 明细表**）
 *
 *  接口：`statApi.teamRank`（已排好的榜，按指标方向）· `statApi.page`（kind=team 日明细）
 *        `statApi.indicators`（指标候选取自 TG0005 的定义）
 *
 *  演示要点：**排名的方向由指标决定**——这是这一页最容易做错的地方。
 *  - 产量、利用系数、合格品率 → **越大越好**，按降序排；
 *  - 焦比、配料偏差率 → **越小越好**，按升序排。
 *
 *  一律按降序的结果是「竞赛榜第一名 = 最费焦炭的班组」，
 *  而那正是班组竞赛榜上最尴尬的演示事故。所以 `rankBy` 字段在数据层就带上了
 *  （与 TP0001 的 `direction` 同一套判定），**端点直接给排好的序**——
 *  页面不再排一次，两处排序规则不同就会出现「表上第一名叫 A、榜上第一名叫 B」。
 *
 *  **达标率也是按方向判的**：焦比 370（计划 380）是**达标**（比计划省），
 *  不是没完成。达标判定在数据层做过一次（`TEAM_STATS.passRate`），
 *  页面只负责显示——两端各判一次必然会对不上。
 *
 *  待接入：月度评比、班组奖惩（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import EChart from "../../EChart.vue";
import { statApi } from "@/api/mes4tq";
import { dayFmt, numFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const { ready } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const indicatorOptions = ref<string[]>([]);
const indicator = ref("产量");

const spec = computed<ListPageSpec>(() => ({
  code: "TR0002",
  exportEntity: "team-indicator",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "班组 / 指标 / 期间" },
    { key: "indicator", label: "指标", kind: "select", options: indicatorOptions.value, placeholder: "全部" },
    { key: "granularity", label: "粒度", kind: "select", options: ["日", "月", "班"], placeholder: "全部" },
    { key: "period", label: "日期", kind: "range", as: "date", placeholder: "日期区间" },
  ],
  columns: [
    { field: "period", headerName: "日期", width: 116, pinned: "left", valueFormatter: dayFmt },
    { field: "target", headerName: "班组", width: 96 },
    { field: "indicator", headerName: "指标", width: 140, cellRenderer: tagRenderer() },
    { field: "unit", headerName: "单位", width: 116 },
    { field: "value", headerName: "班值", width: 130, type: "numericColumn", valueFormatter: numFmt(3) },
    { field: "planValue", headerName: "计划值", width: 130, type: "numericColumn", valueFormatter: numFmt(3) },
    { field: "rate", headerName: "完成率 %", width: 116, type: "numericColumn", valueFormatter: numFmt(2) },
    { field: "rank", headerName: "日排名", width: 106, type: "numericColumn", valueFormatter: numFmt(0) },
    /* 达标列显示的是「达标 / 未达标」（按方向判过），不是原始的 passRate 数字 */
    {
      field: "passRate",
      headerName: "达标",
      width: 96,
      cellRenderer: (p: any) => (Number(p.value) >= 60 ? tagPass(true) : tagPass(false)),
    },
    {
      field: "rankBy",
      headerName: "排序方向",
      width: 116,
      valueFormatter: (p) => (p.value === "lower" ? "越小越好" : "越大越好"),
    },
    { field: "formula", headerName: "口径", minWidth: 260, flex: 1, valueFormatter: (p) => p.value || "—" },
    { field: "remark", headerName: "备注", minWidth: 140, flex: 1 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "日报", kind: "link", to: "/tqmes/report/daily" },
  ],
  toolbar: { extraButtons: ["▶ 模拟班组排名"] },
  fetch: (q) => statApi.page({ ...q, kind: "team" }),
  summary: ({ total, rows }) => {
    const fail = rows.filter((r: any) => Number(r.passRate) < 60).length;
    return fail ? `本页 ${total} 行 · 未达标 ${fail} 行` : `共 ${total} 行`;
  },
}));

/** 达标色标：达标绿、未达标红。**方向已在数据层判过**，这里只显示 */
function tagPass(ok: boolean) {
  const el = document.createElement("span");
  el.className = `inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${ok ? "text-emerald-600 bg-emerald-500/12 dark:text-emerald-400" : "text-red-600 bg-red-500/12 dark:text-red-400"}`;
  el.textContent = ok ? "达标" : "未达标";
  return el;
}

/* ── 排名榜单图 ───────────────────────────────────────── */

const ranks = ref<Array<{ target: string; value: number; passRate: number; rank: number; rankBy: string }>>([]);

/**
 * 榜单条形图。
 *
 * **条形方向随指标方向翻转**：「越大越好」的指标画正条（越长越靠前），
 * 「越小越好」的画在左侧（`label.position` 落到条外），否则升序排出来的榜
 * 会显示成第一名的条最短，客户会以为图错了。
 * 这里统一用**按名次倒序画**（第 1 名在最上）配合正条——
 * 「越小越好」的指标在条形上仍表示「数值大小」，名次由位置表达，
 * 两件事不混在一根条的长度里。
 */
const rankOption = computed(() => {
  const data = [...ranks.value].toSorted((a, b) => b.rank - a.rank); // 末名在下、第一名在上（ECharts y 轴自下而上）
  return {
    backgroundColor: "transparent",
    grid: { left: 64, right: 72, top: 24, bottom: 24 },
    tooltip: {
      trigger: "axis" as const,
      formatter: (ps: any) => {
        const p = ps?.[0];
        if (!p) return "";
        const row = ranks.value.find((r) => r.target === p.name);
        return `${p.name}<br/>${row?.rankBy === "lower" ? "越小越好" : "越大越好"} ｜ 值 ${p.value}<br/>达标率 ${row?.passRate ?? 0}% ｜ 名次 ${row?.rank ?? "—"}`;
      },
    },
    xAxis: { type: "value" as const, axisLabel: { color: "#475569", fontSize: 11 } },
    yAxis: {
      type: "category" as const,
      data: data.map((r) => r.target),
      axisLabel: { color: "#475569", fontSize: 12 },
    },
    series: [
      {
        type: "bar" as const,
        data: data.map((r) => ({
          value: r.value,
          /* 第 1 名绿、第 2/3 蓝、其余灰——**颜色标名次不标好坏**：
             第 4 名不代表这班组差，只代表这次排在后面 */
          itemStyle: {
            color: r.rank === 1 ? "#22C55E" : r.rank <= 3 ? "#60A5FA" : "#94A3B8",
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barWidth: 26,
        label: {
          show: true,
          position: "right" as const,
          fontSize: 11,
          color: "#475569",
          formatter: (p: any) => `第 ${data[p.dataIndex]?.rank} 名  ${p.value}`,
        },
      },
    ],
  };
});

async function loadAll() {
  try {
    const [inds, rank, all] = await Promise.all([
      statApi.indicators(),
      statApi.teamRank("产量", ""),
      statApi.page({ kind: "team", pageSize: 500 }),
    ]);
    indicatorOptions.value = inds;
    ranks.value = rank;
    const rows = all.rows;
    cards.value = [
      { label: "当前指标", value: indicator.value, sub: `${ranks.value.length} 个班组参与` },
      {
        label: "榜首",
        value: [...ranks.value].toSorted((a, b) => a.rank - b.rank)[0]?.target ?? "—",
        sub: `值 ${[...ranks.value].toSorted((a, b) => a.rank - b.rank)[0]?.value ?? "—"}`,
      },
      { label: "日明细行数", value: rows.length, sub: "近 7 天 × 4 班 × 5 指标" },
      { label: "未达标行", value: rows.filter((r) => Number(r.passRate) < 60).length, sub: "按指标方向判定过" },
    ];
    listRef.value?.reload();
  } catch {
    /* 拦截层已 toast */
  }
}

/** 换指标 → 重新取榜（**排序在端点里做**，页面只画） */
async function loadRank() {
  try {
    ranks.value = await statApi.teamRank(indicator.value, "");
    cards.value[0] = { label: "当前指标", value: indicator.value, sub: `${ranks.value.length} 个班组参与` };
    cards.value[1] = { label: "榜首", value: ranks.value[0]?.target ?? "—", sub: `值 ${ranks.value[0]?.value ?? "—"}` };
  } catch {
    /* 拦截层已 toast */
  }
}

watch(indicator, () => void loadRank());

watch(
  ready,
  (v) => {
    if (v) listRef.value?.reload();
  },
  { once: true },
);

onMounted(() => void loadAll());
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 竞赛榜：榜首在上（ECharts y 轴自下而上，所以数据倒序喂） -->
    <div class="shrink-0 border-b border-border/60 p-2">
      <div class="mb-1 flex items-center gap-3">
        <span class="text-xs font-medium">班组竞赛榜</span>
        <select v-model="indicator" class="h-7 rounded border border-border/70 bg-card px-2 text-xs" @change="loadRank">
          <option v-for="i in indicatorOptions" :key="i" :value="i">{{ i }}</option>
        </select>
        <span class="text-xs text-muted-foreground">
          排序在端点里做完（按指标方向），页面只画——两处排序规则不同会出现两个第一
        </span>
        <span class="ml-auto text-xs text-muted-foreground">第 1 名绿 · 2~3 名蓝 · 其余灰（颜色标名次不标好坏）</span>
      </div>
      <EChart :option="rankOption" height="168px" />
    </div>

    <!-- 日明细 -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <ListPage ref="listRef" :spec="spec" :stat-cards="cards" />
    </div>
  </div>
</template>
