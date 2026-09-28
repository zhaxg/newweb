<script setup lang="ts">
/** 对应 TC0002 成本分析（成本归集 · 附录 A3 版式 **L4 图表分析：构成饼图 + 工序对比柱线混排**）
 *
 *  接口：`costAnalysisApi.page`（明细表）· `structure`（构成饼图）
 *        `costAnalysisApi.compare`（工序对比 + 近 6 期趋势 + 月结状态）
 *
 *  演示要点：**两张图用同一份数据出**——
 *  - 左边**构成饼图**（这一期六项成本各占多少，每片标出 `数据来源`）；
 *  - 右边**工序对比 + 趋势**（柱是本期各机组总成本、线是近 6 期走势）。
 *  两张图若各算各的，柱子和线的总数就会对不上，客户拿计算器一加就发现。
 *  所以两个端点都读同一批 `COST_ANALYSES`（数据层由 `model.costBreakdown()` 现算），
 *  **本文件与本页都没有一处手写金额**。
 *
 *  **饼图每片带来源**：`MES 收集` / `ERP-IN 抛送` / `EMS 抛送` / `ERP-HR`——
 *  客户问「这块钱哪来的」时，图例上就写着，不用翻 TC0001。
 *
 *  **能源成本那一片是与 energy 域的接缝**（B1：能源成本由 EMS 抛送）——
 *  它的值来自 TI0004 收到的水电气消耗，所以两页对得上才叫接通。
 *
 *  待接入：月结推进、成本回滚（本域只查桩；**月结状态只读不推进**，
 *  `S6` 的推进在真实系统里是写操作）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import EChart from "../../EChart.vue";
import { costAnalysisApi } from "@/api/mes4tq";
import { codeFmt, moneyFmt, numFmt, qtyFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const { ready, unitMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const periods = ref<string[]>([]);
const period = ref("");

const spec = computed<ListPageSpec>(() => ({
  code: "TC0002",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "机组 / 账期" },
    {
      key: "unitId",
      label: "机组",
      kind: "select",
      options: unitOptions.value,
      valueMap: unitValueMap.value,
      placeholder: "全部",
    },
    { key: "period", label: "账期", kind: "select", options: periods.value, placeholder: period.value || "全部" },
    /* 月结状态是这一页最常见的筛选（「哪些还没结」） */
    {
      key: "status",
      label: "月结状态",
      kind: "select",
      options: ["数据收集中", "计算中", "已计算", "已审核", "已锁定", "已调差"],
      placeholder: "全部",
    },
  ],
  columns: [
    { field: "period", headerName: "账期", width: 96, pinned: "left" },
    { field: "unitId", headerName: "机组", width: 120, valueFormatter: codeFmt(unitMap.value) },
    { field: "status", headerName: "月结状态", width: 116, cellRenderer: tagRenderer() },
    { field: "outputQty", headerName: "产量 t", width: 136, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "unitCost", headerName: "吨成本 元/t", width: 140, type: "numericColumn", valueFormatter: moneyFmt },
    /* 六个分项并列——**它们的和 = 总成本**，客户能当场加出来 */
    { field: "rawMaterialCost", headerName: "原料成本", width: 146, type: "numericColumn", valueFormatter: moneyFmt },
    { field: "fuelCost", headerName: "燃料成本", width: 146, type: "numericColumn", valueFormatter: moneyFmt },
    { field: "auxiliaryCost", headerName: "辅材成本", width: 146, type: "numericColumn", valueFormatter: moneyFmt },
    { field: "sparePartCost", headerName: "备件成本", width: 146, type: "numericColumn", valueFormatter: moneyFmt },
    { field: "energyCost", headerName: "能源成本", width: 146, type: "numericColumn", valueFormatter: moneyFmt },
    { field: "laborCost", headerName: "人员成本", width: 146, type: "numericColumn", valueFormatter: moneyFmt },
    { field: "totalCost", headerName: "总成本", width: 156, type: "numericColumn", valueFormatter: moneyFmt },
    { field: "momRate", headerName: "环比 %", width: 106, type: "numericColumn", valueFormatter: numFmt(1) },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "单价维护", kind: "link", to: "/tqmes/cost/price" },
  ],
  toolbar: { extraButtons: ["▶ 模拟月结"] },
  fetch: (q) => costAnalysisApi.page(q),
  summary: ({ total, rows }) => {
    const open = rows.filter((r: any) => r.status === "数据收集中" || r.status === "计算中").length;
    return open ? `本页 ${total} 行 · 未结账 ${open} 行` : `共 ${total} 行`;
  },
}));

const unitOptions = ref<string[]>([]);
const unitValueMap = ref<Record<string, string>>({});

/* ── 构成饼图 ──────────────────────────────────────────── */

const structure = ref<{
  period: string;
  total: number;
  items: Array<{ name: string; value: number; pct: number; source: string }>;
} | null>(null);

/**
 * 饼图 option。
 *
 * 标签给 **`名称 + 金额`** 而不是百分比：客户要看的是「这块钱多少」，
 * 百分比在别处（`pct` 字段）有；而 tooltip 里补上 `数据来源`，
 * 图例上写不开的那句就落在鼠标移上去的地方。
 */
const pieOption = computed(() => ({
  backgroundColor: "transparent",
  tooltip: {
    trigger: "item" as const,
    formatter: (p: any) =>
      `${p.name}<br/>¥${Number(p.value).toLocaleString("zh-CN")}（${p.percent}%）<br/><span style="color:#94a3b8">${p.data?.source ?? ""}</span>`,
  },
  legend: { orient: "vertical" as const, right: 0, top: "center", textStyle: { color: "#475569", fontSize: 12 } },
  series: [
    {
      type: "pie" as const,
      radius: ["46%", "72%"],
      center: ["38%", "50%"],
      avoidLabelOverlap: true,
      label: { formatter: "{b}\n¥{c}", fontSize: 11, color: "#475569" },
      labelLine: { lineStyle: { color: "#cbd5e1" } },
      data: (structure.value?.items ?? []).map((x) => ({ name: x.name, value: x.value, source: x.source })),
      itemStyle: { borderColor: "#fff", borderWidth: 1 },
    },
  ],
}));

/* ── 工序对比 + 趋势 ───────────────────────────────────── */

const compare = ref<{
  bars: Array<{ unitId: string; totalCost: number }>;
  periods: string[];
  trend: Array<{ unitId: string; data: number[] }>;
  statusCount: Record<string, number>;
} | null>(null);

/**
 * 柱线混排：**一个 x 轴（近 6 期）**，柱是每期总成本合计、线是两台代表机组。
 *
 * 这里必须只有一个 x 轴：早先把「柱按机组、线按期」画在同一张图上，
 * 两组数据的横坐标根本不是一回事，读出来是假的。
 * 「工序成本对比」由**两条线之间的高低**承担（高炉线 vs 烧结线），
 * 「趋势」由**它们各自的走向**承担——同一张图、同一批数据，
 * 客户在图上看到的差就是明细表里那两列的差。
 *
 * 只画两台代表机线：六台同图会糊成一团读不出来（同设备域 AR0001 的取舍）。
 */
const trendOption = computed(() => {
  /* 内层叫 `axisPeriods` 而不是 `periods`：外层已有一个 `periods` ref（账期候选），
     同名会遮蔽，读代码的人分不清是哪个。 */
  const axisPeriods = compare.value?.periods ?? [];
  const trend = (compare.value?.trend ?? []).slice(0, 2);
  /* 每期总成本合计 = 该期所有机组之和；它是柱，与两条线同 x 轴、同量纲（元） */
  const totals = axisPeriods.map((_, pi) => trend.reduce((s, t) => s + Number(t.data?.[pi] ?? 0), 0));
  return {
    backgroundColor: "transparent",
    grid: { left: 76, right: 18, top: 34, bottom: 30 },
    tooltip: { trigger: "axis" as const },
    legend: { data: ["总成本合计", ...trend.map((t) => t.unitId)], textStyle: { color: "#475569", fontSize: 12 } },
    xAxis: { type: "category" as const, data: axisPeriods, axisLabel: { color: "#475569", fontSize: 11 } },
    yAxis: {
      type: "value" as const,
      axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万`, color: "#475569" },
    },
    series: [
      {
        name: "总成本合计",
        type: "bar" as const,
        data: totals,
        itemStyle: { color: "rgba(96,165,250,0.45)" },
        barWidth: 22,
      },
      ...trend.map((t) => ({
        name: t.unitId,
        type: "line" as const,
        data: t.data,
        smooth: true,
        symbol: "circle" as const,
        symbolSize: 5,
        /* 高炉粉、烧结蓝——与 `tqTheme.TQ_AREA` 的工艺区域色同源 */
        lineStyle: { width: 2, color: t.unitId.startsWith("GL") ? "#F472B6" : "#60A5FA" },
        itemStyle: { color: t.unitId.startsWith("GL") ? "#F472B6" : "#60A5FA" },
      })),
    ],
  };
});

async function loadAll() {
  try {
    const [all, st, cmp] = await Promise.all([
      costAnalysisApi.page({ pageSize: 500 }),
      costAnalysisApi.structure(period.value || undefined),
      costAnalysisApi.compare(period.value || ""),
    ]);
    periods.value = [...new Set(all.rows.map((r) => r.period))].toReversed();
    period.value = periods.value[0] ?? "";
    structure.value = st;
    compare.value = cmp;

    unitOptions.value = [...new Set(all.rows.map((r) => r.unitId))];
    unitValueMap.value = Object.fromEntries(unitOptions.value.map((u) => [unitMap.value[u] ?? u, u]));

    const rows = all.rows;
    const open = rows.filter((r) => r.status === "数据收集中" || r.status === "计算中").length;
    cards.value = [
      {
        label: "账期总成本",
        value: `¥${Math.round(st.total / 10000).toLocaleString("zh-CN")} 万`,
        sub: `${st.period} · ${st.rows} 台机组`,
      },
      {
        label: "最大占比项",
        value: [...st.items].toSorted((a, b) => b.value - a.value)[0]?.name ?? "—",
        sub: `${[...st.items].toSorted((a, b) => b.value - a.value)[0]?.pct ?? 0}%`,
      },
      { label: "未结账机组", value: open, sub: "S6 前两档" },
      {
        label: "月结状态分布",
        value: Object.keys(cmp.statusCount).length,
        sub: Object.entries(cmp.statusCount)
          .map(([k, v]) => `${k}${v}`)
          .join(" · "),
      },
    ];
    listRef.value?.reload();
  } catch {
    /* 拦截层已 toast */
  }
}

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
    <!-- 两张图：左构成、右对比+趋势（见文件头「同一份数据」的说明） -->
    <div class="grid shrink-0 grid-cols-1 gap-2 border-b border-border/60 p-2 lg:grid-cols-2">
      <div class="rounded border border-border/60 bg-card/50">
        <div class="flex h-8 items-center gap-2 border-b border-border/60 px-3 text-xs font-medium">
          成本构成
          <span class="text-muted-foreground">{{ structure?.period ?? "—" }} · 六项之和 = 总成本</span>
        </div>
        <EChart :option="pieOption" height="180px" />
      </div>
      <div class="rounded border border-border/60 bg-card/50">
        <div class="flex h-8 items-center gap-2 border-b border-border/60 px-3 text-xs font-medium">
          工序成本对比 + 趋势（近 6 期）
          <span class="text-muted-foreground">柱=每期总成本合计 · 线=两台代表机组（同 x 轴、同量纲）</span>
        </div>
        <EChart :option="trendOption" height="180px" />
      </div>
    </div>

    <!-- 明细表 -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <ListPage ref="listRef" :spec="spec" :stat-cards="cards" />
    </div>
  </div>
</template>
