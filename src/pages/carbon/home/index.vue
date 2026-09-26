<script setup lang="ts">
/**
 * 对应线上「碳资产 → 首页 · 碳资产总览」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/home，
 * 2026-09 登录后按 1920×1080 截图复刻，全部企业视角）。
 *
 * 数据：**静态快照**（2026-09 抓自线上全部企业视角）。按约定本页不走接口——
 * 看板数值直接内联在下面，接真实后端时把这些常量换成一次查询即可。
 *
 * ── 与线上的差异（有意，验收按这里对照）──
 * 1. **图表**：月度趋势用 ECharts（echarts/core 按需注册 bar/line，只进本页懒加载 chunk，
 *    不进首屏链）；履约环保留手写 SVG（stroke-dasharray 圆环，为一个环再挂实例不值当）。
 * 2. **选择企业**：线上按企业下拉过滤整页，接口契约未抓；此处保留控件形态、点击提示待接入。
 * 3. 快捷入口是真导航（router.push 到各页 pageId），不是装饰。
 */
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconBell,
  IconBuilding,
  IconChartBar,
  IconChevronDown,
  IconCircleCheck,
  IconExchange,
  IconFileText,
  IconGauge,
  IconTarget,
} from "@tabler/icons-vue";
import { useToast } from "@/composables/useToast";

/* ── 静态数据：2026-09 全部企业视角的线上快照读数 ── */
const k = {
  emissionTotal: "71.38",
  emissionYoy: "-29.76",
  quotaTotal: "90.00",
  quotaUsedPct: "0.00",
  quotaRemain: "95.00",
  reductionTotal: "7.40",
  reductionYoy: "65.93",
  tradeTotal: "10.00",
  tradeYoy: "-33.33",
  intensity: "2.29",
  industryAvg: "1.80",
};
const ac = {
  mainTotal: "144.49",
  emissionTotal: "156.35",
  reductionTotal: "11.86",
  quotaRemain: "115.00",
  tradeRemain: "0.00",
};
const cp = { year: "2025年度", pct: 75, total: "80.00", done: "60.00", remain: "20.00", deadline: "2026-12-31" };
const WARNING_COUNT = 0;

const { toast } = useToast();
const router = useRouter();

/* 同比语义：该指标「跌」算好消息还是坏消息（碳排/交易降=好，减排升=好）。 */
const YOY: Array<{ label: string; value: string; yoy: string; goodWhen: "up" | "down"; unit: string }> = [
  { label: "碳减排总量", value: k.reductionTotal, yoy: k.reductionYoy, goodWhen: "up", unit: "万tCO₂" },
  { label: "碳交易累计量", value: k.tradeTotal, yoy: k.tradeYoy, goodWhen: "up", unit: "万tCO₂" },
];

function yoyCls(raw: string, goodWhen: "up" | "down"): string {
  const down = raw.startsWith("-");
  return (down ? goodWhen === "down" : goodWhen === "up") ? "text-emerald-600" : "text-red-500";
}

/* ── 月度碳排放趋势：ECharts 组合图（柱 + 虚线折线），按需注册只进本页 chunk ── */
echarts.use([BarChart, LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);
/* cur=当年实发（1–9 月）、forecast=预测外推（10–12 月）、prev=去年同期（1–12 月）；万tCO₂ */
const trend: Array<{ month: string; cur: number | null; prev: number; forecast: number | null }> = [
  { month: "1月", cur: 8.9, prev: 8.3, forecast: null },
  { month: "2月", cur: 7.4, prev: 7.3, forecast: null },
  { month: "3月", cur: 8.2, prev: 8.2, forecast: null },
  { month: "4月", cur: 8.6, prev: 8.0, forecast: null },
  { month: "5月", cur: 7.9, prev: 8.9, forecast: null },
  { month: "6月", cur: 7.8, prev: 7.8, forecast: null },
  { month: "7月", cur: 10.3, prev: 8.6, forecast: null },
  { month: "8月", cur: 8.8, prev: 8.8, forecast: null },
  { month: "9月", cur: 0.4, prev: 8.9, forecast: null },
  { month: "10月", cur: null, prev: 8.7, forecast: 8.1 },
  { month: "11月", cur: null, prev: 8.9, forecast: 7.9 },
  { month: "12月", cur: null, prev: 9.6, forecast: 7.8 },
];

const trendEl = ref<HTMLElement>();
let trendChart: ReturnType<typeof echarts.init> | null = null;
let trendRo: ResizeObserver | null = null;

function initTrend() {
  if (!trendEl.value) return;
  /* canvas 不吃 CSS token，初始化时把主题色读成字面值（切主题后重进本页即新色） */
  const css = getComputedStyle(document.documentElement);
  const muted = css.getPropertyValue("--color-muted-foreground").trim() || "#94a3b8";
  const border = css.getPropertyValue("--color-border").trim() || "#e2e8f0";
  const year = new Date().getFullYear();
  trendChart = echarts.init(trendEl.value);
  trendChart.setOption({
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", valueFormatter: (v: number | null) => (v == null ? "-" : `${v} 万tCO₂`) },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { color: muted, fontSize: 12 },
    },
    grid: { left: 8, right: 8, top: 30, bottom: 4, containLabel: true },
    xAxis: {
      type: "category",
      data: trend.map((t) => t.month),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: border } },
      axisLabel: { color: muted, fontSize: 11 },
    },
    yAxis: {
      type: "value",
      max: 12,
      axisLabel: { color: muted, fontSize: 11 },
      splitLine: { lineStyle: { color: border } },
    },
    series: [
      {
        name: `${year} 实发`,
        type: "bar",
        barWidth: 14,
        itemStyle: { color: "#10b981", borderRadius: [3, 3, 0, 0] },
        data: trend.map((t) => t.cur),
      },
      {
        name: "预测外推",
        type: "bar",
        barWidth: 14,
        itemStyle: { color: "rgba(148, 163, 184, 0.65)", borderRadius: [3, 3, 0, 0] },
        data: trend.map((t) => t.forecast),
      },
      {
        name: `${year - 1} 同期`,
        type: "line",
        symbol: "none",
        lineStyle: { color: "#3b82f6", width: 2, type: "dashed" },
        data: trend.map((t) => t.prev),
      },
    ],
  });
  trendRo = new ResizeObserver(() => trendChart?.resize());
  trendRo.observe(trendEl.value);
}

onMounted(initTrend);
onBeforeUnmount(() => {
  trendRo?.disconnect();
  trendChart?.dispose();
  trendChart = null;
});

/* ── 履约进度环（stroke-dasharray 弧）── */
const DR = 46;
const DC = 2 * Math.PI * DR;
const donutDash = `${(DC * cp.pct) / 100} ${DC}`;

/* 快捷入口 → 各页 pageId（与 carbon 资源树一致） */
const ENTRIES = [
  { icon: IconGauge, title: "配额管理", desc: "配额分配与划拨", to: "carbonQuota/anticipatedQuota" },
  { icon: IconExchange, title: "碳交易", desc: "碳市场交易管理", to: "carbonTrade/carbonTrading" },
  { icon: IconFileText, title: "碳报告", desc: "数据质量方案 · 月度存证", to: "carbonReport/monthlyCerticate" },
  { icon: IconTarget, title: "碳目标", desc: "企业目标 · 项目目标 · 集团目标", to: "carbonTarget/targetManage" },
  { icon: IconBell, title: "碳预警", desc: "预警设置与记录", to: "carbonWarning/settings" },
  { icon: IconChartBar, title: "领导驾驶舱", desc: "可视化大屏", to: "leadership" },
];

function pickEnterprise() {
  toast("企业筛选待接入", 2000, "warn");
}
</script>

<template>
  <div class="mx-auto flex max-w-[1400px] flex-col gap-3 p-4">
    <!-- 页头 -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="h-4 w-1 rounded-full bg-primary" />
        <span class="text-base font-semibold text-foreground">碳资产总览</span>
      </div>
      <button
        class="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-body text-foreground hover:bg-accent"
        @click="pickEnterprise"
      >
        <IconBuilding class="h-4 w-4 text-muted-foreground" />
        <span class="text-xs text-muted-foreground">选择企业</span>
        <span>全部企业</span>
        <IconChevronDown class="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>

    <!-- 第一行：5 张 KPI 卡 -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <div class="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div class="text-xs text-muted-foreground">碳排放总量</div>
        <div class="kpi-num mt-2">{{ k?.emissionTotal ?? "-" }}<span class="kpi-unit">万tCO₂</span></div>
        <div class="mt-2 flex items-center gap-1 text-xs" :class="yoyCls(k?.emissionYoy, 'down')">
          <component
            :is="k?.emissionYoy?.startsWith('-') ? IconArrowDownRight : IconArrowUpRight"
            class="h-3.5 w-3.5"
          />
          <span class="text-muted-foreground">同比</span>
          <span>{{ k?.emissionYoy ?? "-" }}%</span>
        </div>
      </div>

      <div class="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div class="text-xs text-muted-foreground">碳配额总量</div>
        <div class="kpi-num mt-2">{{ k?.quotaTotal ?? "-" }}<span class="kpi-unit">万tCO₂</span></div>
        <div class="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div class="h-full rounded-full bg-primary" :style="{ width: `${k?.quotaUsedPct ?? 0}%` }" />
        </div>
        <div class="mt-1.5 flex justify-between text-xs text-muted-foreground">
          <span>已用 {{ k?.quotaUsedPct ?? "-" }}%</span>
          <span>余量 {{ k?.quotaRemain ?? "-" }}万tCO₂</span>
        </div>
      </div>

      <div v-for="c in YOY" :key="c.label" class="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div class="text-xs text-muted-foreground">{{ c.label }}</div>
        <div class="kpi-num mt-2">
          {{ c.value }}<span class="kpi-unit">{{ c.unit }}</span>
        </div>
        <div class="mt-2 flex items-center gap-1 text-xs" :class="yoyCls(c.yoy, c.goodWhen)">
          <component :is="c.yoy.startsWith('-') ? IconArrowDownRight : IconArrowUpRight" class="h-3.5 w-3.5" />
          <span class="text-muted-foreground">同比</span>
          <span>{{ c.yoy }}%</span>
        </div>
      </div>

      <div class="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div class="text-xs text-muted-foreground">碳排放强度</div>
        <div class="kpi-num mt-2">{{ k?.intensity ?? "-" }}<span class="kpi-unit">tCO₂/t</span></div>
        <div class="mt-1 text-xs text-muted-foreground">当前均加权值</div>
        <div class="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span class="shrink-0">行业均值</span>
          <span class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              class="block h-full rounded-full bg-red-500"
              :style="{ width: k ? `${(Number(k.industryAvg) / Number(k.intensity)) * 100}%` : '0%' }"
            />
          </span>
          <span class="shrink-0">{{ k?.industryAvg ?? "-" }} tCO₂/t</span>
        </div>
      </div>
    </div>

    <!-- 第二行：月度趋势 + 碳账户总览 -->
    <div class="grid grid-cols-1 gap-3 xl:grid-cols-3">
      <div class="rounded-lg border border-border bg-card p-4 shadow-sm xl:col-span-2">
        <div class="text-sm font-medium text-foreground">月度碳排放趋势</div>
        <div ref="trendEl" class="mt-2 h-[280px] w-full" role="img" aria-label="月度碳排放趋势"></div>
        <div class="mt-1 text-xs text-muted-foreground">单位：万tCO₂</div>
      </div>

      <div class="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium text-foreground">碳账户总览</div>
          <span class="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">历史累计</span>
        </div>
        <div class="mt-3 rounded-md bg-emerald-500/15 p-3">
          <div class="text-xs text-muted-foreground">主账户总资产</div>
          <div class="kpi-num mt-1">{{ ac?.mainTotal ?? "-" }}<span class="kpi-unit">万tCO₂</span></div>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-3">
          <div
            v-for="a in [
              { n: '碳排账户', l: '排放量合计', v: ac?.emissionTotal },
              { n: '减排账户', l: '减排量合计', v: ac?.reductionTotal },
              { n: '配额账户', l: '配额余量', v: ac?.quotaRemain },
              { n: '交易账户', l: '交易余量', v: ac?.tradeRemain },
            ]"
            :key="a.n"
            class="rounded-md border border-border p-3"
          >
            <div class="text-body font-medium text-foreground">{{ a.n }}</div>
            <div class="mt-1 text-xs text-muted-foreground">{{ a.l }}</div>
            <div class="mt-1 text-sm text-foreground">
              {{ a.v ?? "-" }} <span class="text-xs text-muted-foreground">万tCO₂</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 第三行：履约进度 / 预警 / 快捷入口 -->
    <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
      <div class="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium text-foreground">碳配额履约进度</div>
          <span class="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{{ cp?.year ?? "-" }}</span>
        </div>
        <div class="mt-3 flex items-center gap-5">
          <svg
            width="120"
            height="120"
            :viewBox="`0 0 ${DR * 2 + 20} ${DR * 2 + 20}`"
            class="shrink-0"
            role="img"
            aria-label="履约进度"
          >
            <g :transform="`translate(${DR + 10} ${DR + 10})`">
              <circle r="46" fill="none" stroke-width="10" class="stroke-border" />
              <circle
                r="46"
                fill="none"
                stroke-width="10"
                stroke-linecap="round"
                class="stroke-emerald-500"
                :stroke-dasharray="donutDash"
                transform="rotate(-90)"
              />
              <text y="-2" text-anchor="middle" class="fill-foreground text-base font-semibold">
                {{ cp?.pct?.toFixed(2) ?? "-" }}%
              </text>
              <text y="16" text-anchor="middle" class="tick">履约进度</text>
            </g>
          </svg>
          <div class="grid flex-1 gap-2 text-body">
            <div class="flex justify-between">
              <span class="text-muted-foreground">总配额量</span
              ><span class="text-foreground">{{ cp?.total ?? "-" }} 万tCO₂</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">已履约量</span
              ><span class="text-foreground">{{ cp?.done ?? "-" }} 万tCO₂</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">剩余配额</span
              ><span class="text-foreground">{{ cp?.remain ?? "-" }} 万tCO₂</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">履约截止</span
              ><span class="text-foreground">{{ cp?.deadline ?? "-" }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium text-foreground">碳预警信息</div>
          <button class="text-xs text-primary hover:underline" @click="router.push('/carbonWarning/settings')">
            查看全部
          </button>
        </div>
        <div
          v-if="WARNING_COUNT === 0"
          class="mt-3 flex h-[calc(100%-3rem)] flex-col items-center justify-center gap-2 text-muted-foreground"
        >
          <IconCircleCheck class="h-10 w-10 text-emerald-500" stroke-width="1.5" />
          <div class="text-body">当前暂无预警</div>
        </div>
      </div>

      <div class="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div class="text-sm font-medium text-foreground">快捷入口</div>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <button
            v-for="e in ENTRIES"
            :key="e.to"
            class="flex items-center gap-2.5 rounded-md border border-border p-2.5 text-left transition-colors hover:bg-accent"
            @click="router.push(`/${e.to}`)"
          >
            <component :is="e.icon" class="h-5 w-5 shrink-0 text-primary" />
            <span class="min-w-0">
              <span class="block truncate text-body font-medium text-foreground">{{ e.title }}</span>
              <span class="block truncate text-xs text-muted-foreground">{{ e.desc }}</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 看板大数字只有这一档越出四档字阶（12/13/14/16）——数据大屏型页面的
   视觉主体，与 leadership 大屏同理；正文/标签一律走标准档。 */
.kpi-num {
  font-size: 26px;
  font-weight: 600;
  line-height: 1.1;
  color: var(--color-foreground);
  font-variant-numeric: tabular-nums;
}
.kpi-unit {
  margin-left: 4px;
  font-size: 12px;
  font-weight: 400;
  color: var(--color-muted-foreground);
}
/* SVG 刻度文字（履约环注）：字号类走 scoped 而非 arbitrary class（audit R1） */
.tick {
  fill: var(--color-muted-foreground);
  font-size: 11px;
}
</style>
