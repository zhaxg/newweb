<script setup lang="ts">
/**
 * ER0003 负荷与煤气预测（模块四 · 附录 B5 版式 **V4 分析 · 双面板 + 精度仪表**）
 *
 *  接口：`forecastApi.load/gas/accuracy`
 *
 *  演示要点：规格书原话「**证明"预测可用"是调度可信的前提**」——
 *  所以这一页的主角不是那两条预测线（谁都能画一条线），而是**置信带**与**MAPE**：
 *  1. 负荷预测带 **±band 的置信带**（`loadForecast` 给的就是 band）——
 *     只画中线答不了「这预测可不可信」；
 *  2. 精度 MAPE **从置信带反推**（端点算好，页面不另算），
 *     因为页面自己算会与带宽矛盾（带宽 4% 却写 MAPE 8%）；
 *  3. `note` 那句「模型自评（置信带相对宽度），非实测回放」**必须显示**——
 *     把自评写成实测是最坏的一种说谎，客户要真回放就得接历史库。
 *
 *  **两块量纲不同不能同轴**：负荷（MW）与煤气（m³/h）分两个面板，
 *  精度（%）再单独一条——三个量纲塞一张图是本域踩过的坑。
 *
 *  待接入：15min 短期 / 4h 超短期的分段视图（当前是 24h 小时粒度的连续曲线）。
 */
import { computed, onMounted, ref } from "vue";
import Button from "primevue/button";
import EChart from "../../EChart.vue";
import { forecastApi } from "@/api/energy";
import { TONE_TEXT, emsChartAxis, emsDarkClass, emsHeaderTextClass } from "../../emsTheme";
import type { EChartsOption } from "echarts";

const loading = ref(true);
/** 预测时长：规格书给了 15min/4h 两档，这里保留「小时数」这个更通用的旋钮 */
const hours = ref(24);

interface LoadPt {
  hour: number;
  mw: number;
  tier: string;
  band: number;
}
interface GasPt {
  hour: number;
  bfg: number;
  cog: number;
  ldg: number;
}
interface Acc {
  loadMape: number;
  gasMape: number;
  weeks: Array<{ week: string; loadMape: number; gasMape: number }>;
  note: string;
}

const load = ref<LoadPt[]>([]);
const gas = ref<GasPt[]>([]);
const acc = ref<Acc | null>(null);

async function reload() {
  loading.value = true;
  try {
    const h = Number(hours.value) || 24;
    const [l, g, a] = await Promise.all([forecastApi.load(h), forecastApi.gas(h), forecastApi.accuracy()]);
    load.value = l ?? [];
    gas.value = g ?? [];
    acc.value = a;
  } catch {
    /* 拦截层已 toast；两块给空态 */
  } finally {
    loading.value = false;
  }
}

const x = computed(() => load.value.map((r) => `${r.hour}时`));

/**
 * 负荷预测 + **置信带**。
 *
 * 带用「上界线 + 透明面积」画：ECharts 没有原生 error band，
 * 标准做法是一条实线 + 上下两条虚线，中间用 `markArea` 填色——
 * 比两条 stack 面积更省（stack 会互相盖住读不出带）。
 */
const loadChart = computed<EChartsOption>(() => {
  const rows = load.value;
  const upper = rows.map((r) => Math.round((r.mw + r.band) * 10) / 10);
  const lower = rows.map((r) => Math.round((r.mw - r.band) * 10) / 10);
  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 62, right: 18, top: 34, bottom: 30 },
    tooltip: { trigger: "axis" },
    legend: { top: 4, textStyle: { color: "#CBD5E1", fontSize: 12 } },
    xAxis: { type: "category", boundaryGap: false, data: x.value, ...emsChartAxis(true) },
    yAxis: { type: "value", name: "MW", nameTextStyle: { color: "#64748B", fontSize: 11 }, ...emsChartAxis(true) },
    series: [
      {
        name: "上界",
        type: "line",
        data: upper,
        showSymbol: false,
        lineStyle: { opacity: 0 },
        areaStyle: { color: "rgba(56,189,248,0.10)" },
        silent: true,
      },
      {
        name: "置信带",
        type: "line",
        data: lower,
        showSymbol: false,
        lineStyle: { opacity: 0 },
        stack: "band",
        areaStyle: { color: "rgba(56,189,248,0.10)" },
        silent: true,
      },
      {
        name: "负荷预测",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: rows.map((r) => r.mw),
        lineStyle: { width: 2, color: "#38BDF8" },
        itemStyle: { color: "#38BDF8" },
      },
      /* 时段底色：尖峰时段标出来，客户才看得懂「为什么这条线在 19 时冲上去」 */
      {
        name: "尖峰时段",
        type: "line",
        data: x.value.map((_, i) => (rows[i]?.tier === "尖峰" ? rows[i].mw : null)),
        showSymbol: false,
        lineStyle: { width: 6, color: "rgba(239,68,68,0.55)" },
        itemStyle: { color: "#EF4444" },
      },
    ],
  };
});

/** 煤气发生量：三条线**量纲相同（都是 m³/h）**可以同轴，但给不同色与图例 */
const gasChart = computed<EChartsOption>(() => {
  const rows = gas.value;
  const paint = [
    { key: "bfg" as const, name: "高炉煤气", color: "#60A5FA" },
    { key: "cog" as const, name: "焦炉煤气", color: "#F59E0B" },
    { key: "ldg" as const, name: "转炉煤气", color: "#22C55E" },
  ];
  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 84, right: 18, top: 34, bottom: 30 },
    tooltip: { trigger: "axis", valueFormatter: (v) => `${Number(v).toLocaleString("zh-CN")} m³/h` },
    legend: { top: 4, textStyle: { color: "#CBD5E1", fontSize: 12 } },
    xAxis: { type: "category", boundaryGap: false, data: x.value, ...emsChartAxis(true) },
    yAxis: { type: "value", name: "m³/h", nameTextStyle: { color: "#64748B", fontSize: 11 }, ...emsChartAxis(true) },
    series: paint.map((p) => ({
      name: p.name,
      type: "line" as const,
      smooth: true,
      showSymbol: false,
      data: rows.map((r) => r[p.key]),
      lineStyle: { width: 2, color: p.color },
      itemStyle: { color: p.color },
    })),
  };
});

/** 按周趋势：MAPE 的 8 周折线——答「精度在变好还是变坏」，单点 MAPE 答不了 */
const weekChart = computed<EChartsOption>(() => {
  const weeks = acc.value?.weeks ?? [];
  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 52, right: 18, top: 30, bottom: 26 },
    tooltip: { trigger: "axis", valueFormatter: (v) => `${v}%` },
    legend: { top: 4, textStyle: { color: "#CBD5E1", fontSize: 12 } },
    xAxis: { type: "category", data: weeks.map((w) => w.week), ...emsChartAxis(true) },
    yAxis: { type: "value", name: "%", nameTextStyle: { color: "#64748B", fontSize: 11 }, ...emsChartAxis(true) },
    series: [
      {
        name: "负荷 MAPE",
        type: "line",
        smooth: true,
        data: weeks.map((w) => w.loadMape),
        symbol: "circle",
        symbolSize: 5,
        lineStyle: { width: 2, color: "#38BDF8" },
        itemStyle: { color: "#38BDF8" },
      },
      {
        name: "煤气 MAPE",
        type: "line",
        smooth: true,
        data: weeks.map((w) => w.gasMape),
        symbol: "circle",
        symbolSize: 5,
        lineStyle: { width: 2, color: "#F59E0B" },
        itemStyle: { color: "#F59E0B" },
      },
    ],
  };
});

/** 精度卡：MAPE 越低越好，5% 是演示里的「可用线」 */
const mapeTone = (v: number) => (v <= 5 ? TONE_TEXT.ok : v <= 8 ? TONE_TEXT.warn : TONE_TEXT.bad);

onMounted(() => void reload());
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-2 p-3" :class="emsDarkClass">
    <!-- 顶栏：时长 + 重查 + 那句必须显示的口径说明 -->
    <div class="flex shrink-0 flex-wrap items-center gap-3 rounded-md border border-white/10 bg-[#111A2C] px-4 py-2">
      <span :class="emsHeaderTextClass">负荷与煤气预测</span>

      <label class="flex items-center gap-1.5 text-xs text-slate-500">
        时长
        <select
          v-model.number="hours"
          class="h-8 rounded border border-white/15 bg-[#0B1220] px-2 text-body text-foreground tabular-nums"
          @change="reload"
        >
          <option :value="12">12h</option>
          <option :value="24">24h</option>
          <option :value="48">48h</option>
          <option :value="72">72h</option>
        </select>
      </label>

      <Button variant="outlined" label="重查" @click="reload" />

      <!-- 口径说明必须在：把自评写成实测是最坏的一种说谎（见文件头第 3 条） -->
      <span class="text-xs text-slate-500">
        {{ acc?.note ?? "" }}
      </span>
    </div>

    <!-- 精度三卡 -->
    <div class="grid shrink-0 grid-cols-3 gap-2">
      <div class="rounded-md border border-white/10 bg-[#111A2C] px-3 py-2">
        <div class="text-xs text-slate-500">负荷预测 MAPE</div>
        <div class="text-base font-semibold tabular-nums" :class="acc ? mapeTone(acc.loadMape) : 'text-slate-500'">
          {{ acc ? acc.loadMape.toFixed(2) : "—" }}<span class="text-xs font-normal text-slate-500">%</span>
        </div>
        <div class="text-xs text-slate-500">≤5% 可用于调度 · 从置信带反推</div>
      </div>
      <div class="rounded-md border border-white/10 bg-[#111A2C] px-3 py-2">
        <div class="text-xs text-slate-500">煤气预测 MAPE</div>
        <div class="text-base font-semibold tabular-nums" :class="acc ? mapeTone(acc.gasMape) : 'text-slate-500'">
          {{ acc ? acc.gasMape.toFixed(2) : "—" }}<span class="text-xs font-normal text-slate-500">%</span>
        </div>
        <div class="text-xs text-slate-500">3% 固定相对带（模型自评）</div>
      </div>
      <div class="rounded-md border border-white/10 bg-[#111A2C] px-3 py-2">
        <div class="text-xs text-slate-500">置信带宽度</div>
        <div class="text-base font-semibold tabular-nums text-sky-400">
          {{ load[0] ? load[0].band.toFixed(1) : "—" }}<span class="text-xs font-normal text-slate-500"> MW</span>
        </div>
        <div class="text-xs text-slate-500">±band，图上画成阴影带</div>
      </div>
    </div>

    <!-- 双面板：左负荷（带置信带）、右煤气三条线 -->
    <div class="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-2">
      <section class="flex min-h-[14rem] flex-col rounded-md border border-white/10 bg-[#111A2C] p-2">
        <div class="shrink-0 pb-1 text-sm text-sky-400">
          电力负荷预测（MW）
          <span class="ml-2 text-xs text-slate-500">阴影 = ±置信带 · 红段 = 尖峰时段</span>
        </div>
        <EChart v-if="load.length" :option="loadChart" force-dark class="min-h-0 flex-1" />
        <div v-else class="flex flex-1 items-center justify-center text-sm text-slate-500">
          {{ loading ? "加载中…" : "暂无预测数据" }}
        </div>
      </section>

      <section class="flex min-h-[14rem] flex-col rounded-md border border-white/10 bg-[#111A2C] p-2">
        <div class="shrink-0 pb-1 text-sm text-sky-400">
          煤气发生量预测（m³/h）
          <span class="ml-2 text-xs text-slate-500">三种煤气同量纲可同轴</span>
        </div>
        <EChart v-if="gas.length" :option="gasChart" force-dark class="min-h-0 flex-1" />
        <div v-else class="flex flex-1 items-center justify-center text-sm text-slate-500">
          {{ loading ? "加载中…" : "暂无预测数据" }}
        </div>
      </section>
    </div>

    <!-- 精度按周趋势 -->
    <section class="shrink-0 rounded-md border border-white/10 bg-[#111A2C] p-2">
      <div class="shrink-0 pb-1 text-sm text-sky-400">
        预测精度按周趋势（MAPE %）
        <span class="ml-2 text-xs text-slate-500">一条 MAPE 答不了「在变好还是变坏」</span>
      </div>
      <EChart v-if="acc?.weeks?.length" :option="weekChart" force-dark class="h-40" />
      <div v-else class="flex h-40 items-center justify-center text-sm text-slate-500">
        {{ loading ? "加载中…" : "暂无精度数据" }}
      </div>
    </section>

    <!-- 底部口径 -->
    <div class="shrink-0 rounded-md border border-white/10 bg-[#111A2C] px-4 py-2 text-xs text-slate-500">
      预测可信的用法：**带宽 ≤5% 的时段才拿去排计划**（EM0007 的调度建议会引用这里的带宽口径）·
      {{ acc?.note ?? "精度口径加载中…" }}
    </div>
  </div>
</template>
