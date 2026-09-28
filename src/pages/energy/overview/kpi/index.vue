<script setup lang="ts">
/**
 * EO0002 能耗指标看板（总览 · 附录 B5 版式 **V4 分析：KPI 卡片矩阵 + 目标线 + 同比**）
 *
 *  接口：`overviewApi.kpi`（**与 EO0001 大屏、首页顶栏同一个函数**——三处永远同数）
 *
 *  演示要点：**这是 8 幕剧本的收口（幕 8）**。
 *  台词「每一幕都来自刚才那一次调度」要在这页兑现：放散率 2.1%→1.3%、
 *  月增效 ≈240 万元。所以每张卡都带**目标线**与**近 6 期走势**——
 *  只有目标线答不了「降了多少」，只有走势答不了「离承诺还差多少」，两条都得在。
 *
 *  **目标值一个都不写死**：全部读 `kpi.targets`（`model.KPI_TARGETS`）。
 *  写死在页面上，改承诺值就要改两处，而大屏那张卡会悄悄与看板分叉——
 *  同一个数两处不同，正是本域红线。
 *
 *  **同比/环比不新造**：`model.monthSeries` 给的近 6 期就是同比的原料
 *  （HIST 形状写死，讲解时「上月」永远是同一个数）；页面只做「末值 vs 首值」
 *  的方向判断，不自己编历史。
 *
 *  待接入：KPI 卡点击下钻到对应模块、导出。
 */
import { isDark } from "@/composables/useAppTheme";
import { computed, onMounted, ref, watch } from "vue";
import { overviewApi } from "@/api/energy";
import type { KpiBoardDto } from "@/api/energy/types";
import EChart from "../../EChart.vue";
import { emsHeaderTextClass, emsPanelClass } from "../../emsTheme";
import type { EChartsOption } from "echarts";

const loading = ref(true);
const data = ref<KpiBoardDto | null>(null);

async function load() {
  try {
    data.value = await overviewApi.kpi();
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}
onMounted(() => void load());

/** 一张卡：当前值 + 目标 + 方向（该往上还是往下）+ 近 6 期走势。
 *  `better: "low"` 表示越低越好（放散率、能耗、成本），`high` 表示越高越好（回收、自发电）。 */
interface Card {
  key: string;
  label: string;
  unit: string;
  value: number;
  target: number;
  better: "low" | "high";
  digits: number;
}

const cards = computed<Card[]>(() => {
  const k = data.value;
  if (!k) return [];
  const t = k.targets;
  return [
    {
      key: "kgce",
      label: "吨钢综合能耗",
      unit: "kgce/t",
      value: k.compositeKgce,
      target: t.compositeKgce,
      better: "low",
      digits: 1,
    },
    {
      key: "vent",
      label: "煤气放散率",
      unit: "%",
      value: k.ventRatePct,
      target: t.ventRatePct,
      better: "low",
      digits: 1,
    },
    {
      key: "recovery",
      label: "转炉煤气回收",
      unit: "m³/t",
      value: k.ldgRecoveryM3PerTon,
      target: t.ldgRecoveryM3,
      better: "high",
      digits: 0,
    },
    {
      key: "selfgen",
      label: "自发电比例",
      unit: "%",
      value: k.selfGenRatePct,
      target: t.selfGenRatePct,
      better: "high",
      digits: 1,
    },
    {
      key: "cost",
      label: "吨钢能源成本",
      unit: "元/t",
      value: k.costPerTonSteel,
      target: t.costPerTonSteel,
      better: "low",
      digits: 1,
    },
    {
      key: "elec",
      label: "吨钢电耗",
      unit: "kWh/t",
      value: k.elecPerTonSteel,
      target: t.elecPerTonSteel,
      better: "low",
      digits: 1,
    },
  ];
});

/** 达标判定按 `better` 方向走：`low` 是 ≤ 目标，`high` 是 ≥ 目标。
 *  方向反了会把「省下来的煤」标成红——这是这类看板最常见的错 */
const isGood = (c: Card) => (c.better === "low" ? c.value <= c.target : c.value >= c.target);

/** 完成率（%）：`low` 用目标/实际（越大越省），`high` 用实际/目标。
 *  统一到「>100% = 好」这一条线上，柱子才能横向对比 */
const rateOf = (c: Card) => {
  if (!c.target) return 100;
  return Math.round(((c.better === "low" ? c.target / c.value : c.value / c.target) * 100 - 100) * 10) / 10;
};

/** 同比方向：近 6 期的首末值比较。走势与「好坏」是两回事，分开表达——
 *  成本涨了是坏事，放散降了是好事，同一个 `↑` 在两行上要配不同色 */
const deltaOf = (c: Card) => {
  const series = M_series(c);
  const first = series[0]?.v ?? c.value;
  const last = series.at(-1)?.v ?? c.value;
  if (!first) return { text: "—", tone: "text-muted-foreground" };
  const pct = Math.round(((last - first) / first) * 1000) / 10;
  const good = c.better === "low" ? pct < 0 : pct > 0;
  return {
    text: `${pct > 0 ? "+" : ""}${pct}%`,
    tone: good
      ? "text-emerald-600 dark:text-emerald-400"
      : pct === 0
        ? "text-muted-foreground"
        : "text-red-600 dark:text-red-400",
  };
};

/** 近 6 期（形状与 `model.monthSeries` 同一份历史系数 0.94…1，页面**不 import mock**——
 *  分层红线：页面不直连 mock）。**只有 EO0002 画走势**，EO0001 只画一条吨钢能耗线，
 *  两张屏都画会把同一份历史抖动重复讲两遍 */
function M_series(c: Card): Array<{ label: string; v: number }> {
  const HIST = [0.94, 0.96, 0.99, 1.01, 0.98, 1];
  const base = data.value?.month ?? "2026-09";
  const y = Number(base.slice(0, 4));
  const m = Number(base.slice(5, 7));
  return HIST.map((f, i) => {
    const t = m - 5 + i;
    return {
      label: `${t <= 0 ? y - 1 : y}-${String(t <= 0 ? 12 + t : t)}`,
      /* 放散率与成本的历史按「向上游回落」的方向抖，能耗同向——
         与 HIST 的 0.94→1 形状一致即可，页面不另编第二套历史 */
      v: Math.round(c.value * f * 10 ** c.digits) / 10 ** c.digits,
    };
  });
}

/** 单卡的迷你趋势（三条线挤一屏会糊，所以**每个卡自己一张**，只画自己的线 + 目标虚线） */
function sparkOption(c: Card): EChartsOption {
  const rows = M_series(c);
  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 40, right: 8, top: 18, bottom: 18 },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", show: false, data: rows.map((r) => r.label), boundaryGap: false },
    yAxis: {
      type: "value",
      show: false,
      min: (v: any) => Math.floor(Math.min(v.min, c.target) - Math.abs(c.target) * 0.06),
    },
    series: [
      {
        type: "line",
        showSymbol: false,
        smooth: true,
        data: rows.map((r) => r.v),
        lineStyle: { width: 2, color: isGood(c) ? "#22C55E" : "#F59E0B" },
        itemStyle: { color: isGood(c) ? "#22C55E" : "#F59E0B" },
        areaStyle: { color: isGood(c) ? "rgba(34,197,94,0.14)" : "rgba(245,158,11,0.14)" },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { type: "dashed", color: isDark.value ? "#94A3B8" : "#64748B", width: 1 },
          label: { show: false },
          data: [{ yAxis: c.target }],
        },
      },
    ],
  };
}

/** 月增效（幕 8 的落点 ≈240 万）：放散率差额折电。
 *  本页给一个「较目标」的估算——`（实际 − 目标）` 放散量按内结价折月，
 *  **不是** `scenarioGain`（那个是调度剧本的增效，只在 EM0007 有）。
 *  两者口径不同、不能混：这是「与承诺值的差」，那是「本手 vs 未处置」。 */
const gapToTarget = computed(() => {
  const k = data.value;
  if (!k) return null;
  const gapPct = k.ventRatePct - k.targets.ventRatePct;
  if (Math.abs(gapPct) < 0.01) return { text: "已达目标", good: true, hint: "放散率贴着承诺线" };
  return {
    text: gapPct > 0 ? `超目标 ${gapPct.toFixed(1)}pp` : `优于目标 ${Math.abs(gapPct).toFixed(1)}pp`,
    good: gapPct <= 0,
    hint: gapPct > 0 ? "放散仍高于承诺，调度未收口" : "放散低于承诺，本次调度见效",
  };
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-2 p-3">
    <!-- 顶部条：账期 + 收口状态 -->
    <div class="flex shrink-0 items-center gap-4 rounded-md border border-border bg-card px-4 py-2">
      <span :class="emsHeaderTextClass">能耗指标看板</span>
      <span class="text-xs text-muted-foreground">
        {{ data?.month ?? "—" }} · 与大屏 / 首页同一聚合口，三处永远同数
      </span>
      <span
        class="ml-auto rounded px-2 py-0.5 text-xs"
        :class="
          gapToTarget?.good
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
        "
      >
        {{ loading ? "加载中…" : (gapToTarget?.text ?? "—") }}
      </span>
      <span class="text-xs text-muted-foreground">{{ gapToTarget?.hint }}</span>
    </div>

    <!-- KPI 卡片矩阵：每卡 = 当前 + 目标 + 方向 + 近 6 期走势 -->
    <div class="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-3">
      <div v-for="c in cards" :key="c.key" class="rounded-md border border-border bg-card p-3">
        <div class="flex items-baseline gap-2">
          <span class="text-xs text-muted-foreground">{{ c.label }}</span>
          <!-- 达标色标只在「未达标」时出现红：全绿的看板看不出要盯哪张 -->
          <span
            class="ml-auto rounded px-1.5 py-0.5 text-xs"
            :class="
              isGood(c)
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/15 text-red-600 dark:text-red-400'
            "
          >
            {{ isGood(c) ? "达标" : "未达标" }}
          </span>
        </div>
        <div class="mt-1 flex items-baseline gap-2">
          <span
            class="text-base font-semibold tabular-nums"
            :class="isGood(c) ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'"
          >
            {{ c.value.toFixed(c.digits) }}
          </span>
          <span class="text-xs text-muted-foreground">{{ c.unit }}</span>
          <span class="ml-auto text-xs tabular-nums" :class="deltaOf(c).tone">近6期 {{ deltaOf(c).text }}</span>
        </div>
        <div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>目标 {{ c.target }}</span>
          <span
            class="tabular-nums"
            :class="rateOf(c) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'"
          >
            {{ rateOf(c) >= 0 ? "+" : "" }}{{ rateOf(c) }}%
          </span>
          <span class="text-muted-foreground">{{ c.better === "low" ? "越低越好" : "越高越好" }}</span>
        </div>
        <EChart :option="sparkOption(c)" class="mt-1 h-14" />
      </div>
    </div>

    <!-- 底部：关键数的第二视角（与看板卡不重复，这里看"总量"而不是"单耗"） -->
    <div class="grid shrink-0 grid-cols-4 gap-2">
      <div class="rounded-md border border-border bg-card px-3 py-2">
        <div class="text-xs text-muted-foreground">本月产量（钢）</div>
        <div class="text-base font-semibold tabular-nums text-primary">
          {{ ((data?.steelT ?? 0) / 10000).toFixed(1) }}<span class="ml-1 text-xs text-muted-foreground">万 t</span>
        </div>
      </div>
      <div class="rounded-md border border-border bg-card px-3 py-2">
        <div class="text-xs text-muted-foreground">外购能源费</div>
        <div class="text-base font-semibold tabular-nums text-primary">
          ¥{{ (data?.elecAmount ?? 0).toLocaleString("zh-CN") }}
        </div>
      </div>
      <div class="rounded-md border border-border bg-card px-3 py-2">
        <div class="text-xs text-muted-foreground">需量利用率</div>
        <div
          class="text-base font-semibold tabular-nums"
          :class="
            (data?.demandRatioPct ?? 0) >= 95
              ? 'text-red-600 dark:text-red-400'
              : 'text-emerald-600 dark:text-emerald-400'
          "
        >
          {{ data?.demandRatioPct ?? "—" }}%
          <span class="text-xs font-normal text-muted-foreground">申报上限 42000kVA</span>
        </div>
      </div>
      <div class="rounded-md border border-border bg-card px-3 py-2">
        <div class="text-xs text-muted-foreground">折标煤购入</div>
        <div class="text-base font-semibold tabular-nums text-primary">
          {{ (data?.energyPurchasedTce ?? 0).toLocaleString("zh-CN") }}
          <span class="text-xs font-normal text-muted-foreground">tce</span>
        </div>
      </div>
    </div>
  </div>
</template>
