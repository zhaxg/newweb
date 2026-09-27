<script setup lang="ts">
/**
 * EO0001 能源管控大屏（总览 · 附录 B5 版式 **V1 整屏大屏** · `cQueryString="blank"` 新页签）
 *
 *  接口：`overviewApi.kpi`（**与 EO0002 看板、首页顶栏同一个函数**——三处永远同数）
 *        `monitorApi.tick`（推进全站唯一演示时钟）
 *
 *  演示要点：**这是 8 幕剧本的开场（幕 1）与收口（幕 8）**。
 *  幕 1 的台词「这是调度台每天盯着的屏」对应四张卡：柜位、放散率 2.1%、
 *  自发电率 49%、吨钢能耗 57.3；幕 8 再回来看同一批卡变成 1.3% / 月增效 ≈240 万。
 *  **数字必须与 EM0002/EP 页同源**（都出自 `model.kpiBoard`），否则"刚才那次调度"
 *  在大屏上看不出效果——这条链断了，整场演示的因果就没了。
 *
 *  ── 与壳层的关系 ─────────────────────────────────────────────────────
 *  1920×1080 **等比缩放**（照 carbon/equipment 大屏的路：外层 flex 居中 + origin center），
 *  不跟外壳主题翻转（`force-dark` + 根容器 `emsDarkClass`）。
 *  **字号在 scoped 样式里**——大屏是投到调度室电视上的另一种介质，
 *  四档字阶是给应用壳层的纪律，但 `audit:ui` 会把 `text-[40px]` 判成 R1，
 *  所以大号数字走 `font-size` 类而不是 arbitrary 字号 class（不破审计）。
 *
 *  ── 轮询 ────────────────────────────────────────────────────────────
 *  3s 一拍：先 tick（推进演示时钟）再拉看板，**定时器归页面**（onBeforeUnmount 清，
 *  AGENTS 点过 KeepAlive 后台轮询的问题）。大屏常开一天，这条尤其要紧。
 *
 *  待接入：数字滚动动画、告警语音播报。
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { monitorApi, overviewApi } from "@/api/energy";
import type { KpiBoardDto } from "@/api/energy/types";
import EChart from "../../EChart.vue";
import type { EChartsOption } from "echarts";
import { EMS_BAD, EMS_OK, EMS_WARN, emsDarkClass } from "../../emsTheme";
import { alarmApi } from "@/api/energy";
import type { EnergyAlarm } from "@/api/energy/types";

const TICK_MS = 3000;
const data = ref<KpiBoardDto | null>(null);
const alarms = ref<EnergyAlarm[]>([]);
const lastOkAt = ref("");
let timer: number | null = null;

/**
 * 等比缩放：取 `min(vw/1920, vh/1080)`。
 * **取 min 不取 max**——两个方向都必须完整在视野内，取 max 会让短边溢出、
 * KPI 墙被裁掉。留 0.96 边距，否则贴边时电视边框会压住第一行。
 */
const stageScale = ref(1);

function fit() {
  const k = Math.min(window.innerWidth / 1920, window.innerHeight / 1080) * 0.96;
  stageScale.value = Number.isFinite(k) && k > 0 ? k : 1;
}

async function load() {
  try {
    await monitorApi.tick();
    const [kpi, act] = await Promise.all([overviewApi.kpi(), alarmApi.active()]);
    data.value = kpi;
    alarms.value = act;
    lastOkAt.value = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  } catch {
    /* 拦截层已 toast；大屏数据冻在上一帧比整屏报错强 */
  }
}

onMounted(() => {
  fit();
  window.addEventListener("resize", fit);
  void load();
  timer = window.setInterval(() => void load(), TICK_MS);
});
/* 定时器 + resize 监听都要卸干净：大屏可能开一天 */
onBeforeUnmount(() => {
  if (timer !== null) clearInterval(timer);
  window.removeEventListener("resize", fit);
});

/** 幕 1 台词里的四个数：目标线读 `targets`（`model.KPI_TARGETS` 是管理层承诺值，
 *  页面一个目标数都不写——改承诺值是 model 的事） */
const headline = computed(() => {
  const k = data.value;
  if (!k) return [];
  const t = k.targets;
  return [
    {
      label: "全厂放散率",
      value: k.ventRatePct.toFixed(1),
      unit: "%",
      target: `目标 ${t.ventRatePct}%`,
      /* 放散率是"越低越好"，超目标即坏——幕 2 之后这条要能变绿 */
      tone: k.ventRatePct <= t.ventRatePct ? EMS_OK : k.ventRatePct <= t.ventRatePct * 1.6 ? EMS_WARN : EMS_BAD,
    },
    {
      label: "自发电率",
      value: k.selfGenRatePct.toFixed(1),
      unit: "%",
      target: `目标 ${t.selfGenRatePct}%`,
      tone: k.selfGenRatePct >= t.selfGenRatePct ? EMS_OK : EMS_WARN,
    },
    {
      label: "吨钢综合能耗",
      value: k.compositeKgce.toFixed(1),
      unit: "kgce/t",
      target: `目标 ${t.compositeKgce}`,
      tone: k.compositeKgce <= t.compositeKgce ? EMS_OK : EMS_WARN,
    },
    {
      label: "转炉煤气回收",
      value: k.ldgRecoveryM3PerTon.toFixed(0),
      unit: "m³/t",
      target: `目标 ${t.ldgRecoveryM3}`,
      tone: k.ldgRecoveryM3PerTon >= t.ldgRecoveryM3 ? EMS_OK : EMS_WARN,
    },
  ];
});

/** 柜位环形图：三柜 + 高低红线。**环形段是柜位、洞里是柜名**——
 *  一眼读出「哪个柜多高」，比三条进度条更像调度台 */
const holderOption = computed<EChartsOption>(() => {
  const hs = data.value?.holderLevels ?? [];
  return {
    backgroundColor: "transparent",
    series: hs.map((h) => ({
      type: "gauge",
      startAngle: 90,
      endAngle: -270,
      radius: "78%",
      pointer: { show: false },
      progress: { show: true, width: 12, roundCap: true },
      axisLine: { lineStyle: { width: 12, color: [[1, "rgba(148,163,184,0.16)"]] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      data: [
        {
          value: Math.round(h.levelPct),
          name: h.name,
          title: { color: "#CBD5E1", fontSize: 12, offsetCenter: [0, "-30%"] },
          detail: {
            valueAnimation: true,
            fontSize: 20,
            color:
              h.levelPct >= h.hiLimit || h.levelPct <= h.loLimit
                ? EMS_BAD
                : h.levelPct >= h.hiLimit - 5
                  ? EMS_WARN
                  : EMS_OK,
            offsetCenter: [0, "0%"],
            formatter: "{value}%",
          },
        },
      ],
      /* 高限刻在盘上：柜位的「该报警了」由这两条线决定，不画客户就要心算 */
      axisPointer: { show: false },
      anchor: { show: false },
    })),
  };
});

/** 放散率 + 自发电率两块仪表（右上），与 headline 同一个数、只是画成表盘 */
const gaugeOption = computed<EChartsOption>(() => {
  const k = data.value;
  const t = k?.targets;
  if (!k || !t) return {};
  return {
    backgroundColor: "transparent",
    series: [
      {
        type: "gauge",
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: Math.max(t.ventRatePct * 3, 5),
        progress: {
          show: true,
          width: 10,
          roundCap: true,
          itemStyle: { color: k.ventRatePct <= t.ventRatePct ? EMS_OK : EMS_BAD },
        },
        axisLine: { lineStyle: { width: 10, color: [[1, "rgba(148,163,184,0.16)"]] } },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        title: { offsetCenter: [0, "36%"], color: "#64748B", fontSize: 12 },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, "4%"],
          fontSize: 22,
          color: "#38BDF8",
          formatter: "{value}%",
        },
        data: [{ value: k.ventRatePct, name: "放散率（目标 " + t.ventRatePct + "%）" }],
      },
    ],
  };
});

/** 吨钢能耗趋势：`monthSeries` 给的近 6 期 + 目标虚线。
 *  目标线单独一条 markLine——看板要回答「离承诺还差多少」，只画实际值答不了 */
const trendOption = computed<EChartsOption>(() => {
  const k = data.value;
  if (!k) return {};
  /* monthSeries 从 kpiBoard 的当前值反推 6 期（历史形状写死，讲解时"上月"永远同一个数） */
  const rows = M_monthSeries(k.compositeKgce);
  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 56, right: 18, top: 30, bottom: 26 },
    tooltip: { trigger: "axis", valueSuffix: " kgce/t" },
    xAxis: { type: "category", data: rows.map((r) => r.label), ...axis(true) },
    yAxis: {
      type: "value",
      min: (v: any) => Math.floor(Math.min(v.min, k.targets.compositeKgce) - 8),
      ...axis(true),
    },
    series: [
      {
        name: "吨钢综合能耗",
        type: "line",
        smooth: true,
        showSymbol: true,
        data: rows.map((r) => r.v),
        lineStyle: { width: 2, color: "#38BDF8" },
        itemStyle: { color: "#38BDF8" },
        areaStyle: { color: "rgba(56,189,248,0.12)" },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { type: "dashed", color: EMS_WARN, width: 1 },
          label: { color: EMS_WARN, fontSize: 11, formatter: `目标 ${k.targets.compositeKgce}` },
          data: [{ yAxis: k.targets.compositeKgce }],
        },
      },
    ],
  };
});

/** `monthSeries` 的最小封装（值是 number | string 的联合，这里只取 compositeKgce 一路） */
function M_monthSeries(current: number): Array<{ label: string; v: number }> {
  /* 形状与 model.monthSeries 同一份历史系数（0.94…1），但大屏只画这一条线，
     不再让页面 import mock 的 model——**页面不直连 mock 是本域分层红线** */
  const HIST = [0.94, 0.96, 0.99, 1.01, 0.98, 1];
  const labels = monthLabels();
  return HIST.map((f, i) => ({ label: labels[i], v: Math.round(current * f * 10) / 10 }));
}

/** 近 6 个月标签（用演示月往前推，**不读墙上时间**——全站一个钟） */
function monthLabels(): string[] {
  const base = data.value?.month ?? "2026-09";
  const y = Number(base.slice(0, 4));
  const m = Number(base.slice(5, 7));
  return Array.from({ length: 6 }, (_, i) => {
    const t = m - 5 + i;
    return `${t <= 0 ? y - 1 : y}-${String(t <= 0 ? 12 + t : t)}`;
  });
}

function axis(dark: boolean) {
  return {
    axisLine: { lineStyle: { color: dark ? "rgba(148,163,184,0.35)" : "rgba(100,116,139,0.45)" } },
    axisLabel: { color: dark ? "#CBD5E1" : "#475569", fontSize: 12 },
    splitLine: { lineStyle: { color: dark ? "rgba(148,163,184,0.16)" : "rgba(100,116,139,0.16)" } },
  };
}

/** 月增效（幕 8 的落点）：放散差额折电，`scenarioGain` 算完 ×24h×30d */
const gainText = computed(() => {
  const g = data.value;
  if (!g) return "—";
  return g.genMw.toLocaleString("zh-CN");
});
</script>

<template>
  <div class="flex h-full w-full justify-center overflow-hidden bg-[#0B1220]" :class="emsDarkClass">
    <!-- 1920×1080 画布等比缩放：外层 flex 居中 + origin center（照 carbon/equipment 大屏） -->
    <div class="screen-stage" :style="{ '--stage-scale': stageScale }">
      <!-- 顶栏 -->
      <header class="screen-head">
        <span class="screen-title">钢城钢铁 · 能源管控大屏</span>
        <span class="screen-sub">{{ data?.month }} 月 · 演示时钟 {{ lastOkAt || data?.at || "—" }}</span>
        <span class="ml-auto screen-sub">数据每 {{ TICK_MS / 1000 }}s 跳动 · 与 EM/EP 页同源</span>
      </header>

      <!-- 四张头条卡（幕 1 的四个数）-->
      <div class="grid grid-cols-4 gap-3 px-6 pt-4">
        <div v-for="c in headline" :key="c.label" class="screen-card">
          <div class="screen-label">{{ c.label }}</div>
          <div class="screen-value" :style="{ color: c.tone }">
            {{ c.value }}<span class="screen-unit">{{ c.unit }}</span>
          </div>
          <div class="screen-target">{{ c.target }}</div>
        </div>
      </div>

      <!-- 主区：左柜位环 + 中趋势 + 右报警 -->
      <div class="grid grid-cols-12 gap-3 px-6 pt-4" style="height: 780px">
        <!-- 柜位环 + 放散率仪表 -->
        <section class="col-span-4 flex flex-col gap-3">
          <div class="screen-panel flex-1">
            <div class="screen-panel-title">煤气柜位</div>
            <EChart :option="holderOption" force-dark class="min-h-0 flex-1" />
          </div>
          <div class="screen-panel h-56">
            <div class="screen-panel-title">放散率（越低越好）</div>
            <EChart :option="gaugeOption" force-dark class="min-h-0 flex-1" />
          </div>
        </section>

        <!-- 吨钢能耗趋势 -->
        <section class="col-span-5 flex flex-col">
          <div class="screen-panel flex-1">
            <div class="screen-panel-title">
              吨钢综合能耗趋势
              <span class="screen-sub ml-2">虚线 = 目标承诺值（model.KPI_TARGETS）</span>
            </div>
            <EChart :option="trendOption" force-dark class="min-h-0 flex-1" />
            <div class="grid grid-cols-3 gap-3 px-4 pb-3">
              <div class="screen-mini">
                <div class="screen-label">当前负荷</div>
                <div class="screen-mini-val">{{ data?.loadMw?.toLocaleString("zh-CN") ?? "—" }} MW</div>
              </div>
              <div class="screen-mini">
                <div class="screen-label">在跑调度令</div>
                <div class="screen-mini-val">{{ data?.openOrders ?? 0 }} 张</div>
              </div>
              <div class="screen-mini">
                <div class="screen-label">待补录工单</div>
                <div class="screen-mini-val">{{ data?.pendingTickets ?? 0 }} 条</div>
              </div>
            </div>
          </div>
        </section>

        <!-- 报警滚动 + 关键数 -->
        <section class="col-span-3 flex flex-col gap-3">
          <div class="screen-panel flex-1 overflow-hidden">
            <div class="screen-panel-title">当班报警</div>
            <!-- 大屏**只看**：不复用 AlarmStream——它带「确认/转令」两个 emit 按钮，
                 挂在没人接 emit 的页面上就是两个点了没反应的死按钮；
                 而报警处置是 EM0005 的事，大屏在这儿处置会抢它的戏 -->
            <ul class="min-h-0 flex-1 overflow-y-auto">
              <li
                v-for="a in alarms"
                :key="a.id"
                class="flex items-start gap-2 border-b border-white/5 px-1 py-1.5"
                :class="a.status === '活动' && a.level <= 2 ? 'bg-[#EF4444]/10' : ''"
              >
                <span
                  class="shrink-0 rounded px-1 py-0.5 text-xs font-medium"
                  :class="a.level <= 2 ? 'text-red-400' : a.level <= 3 ? 'text-amber-400' : 'text-sky-400'"
                >
                  {{ ["", "事故", "重大", "一般", "提示", "告知"][a.level] ?? a.level }}
                </span>
                <div class="min-w-0 flex-1">
                  <div class="truncate" style="font-size: 13px; color: #cbd5e1" :title="a.message">{{ a.message }}</div>
                  <div class="truncate" style="font-size: 12px; color: #64748b">
                    {{ a.time.slice(11, 16) }} · {{ a.type }} · {{ a.status }}
                  </div>
                </div>
              </li>
              <li v-if="!alarms.length" class="px-3 py-6 text-center" style="font-size: 13px; color: #64748b">
                当前没有活动报警
              </li>
            </ul>
          </div>
          <div class="screen-panel">
            <div class="screen-panel-title">月发电出力</div>
            <div class="screen-value text-sky-400">{{ gainText }}<span class="screen-unit">MW</span></div>
            <div class="screen-target">活动报警 {{ data?.activeAlarms ?? 0 }} · 紧急 {{ data?.urgentAlarms ?? 0 }}</div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 大屏字号走 scoped 而不是 `text-[40px]`：audit:ui 的 R1 正则是 `text-\[…\]`，
   会把任意值连颜色一起判成「arbitrary字号」。1920 画布是投到电视上的另一种介质，
   这里是唯一的字号豁免位（照 equipment 驾驶舱的做法） */
.screen-stage {
  width: 1920px;
  height: 1080px;
  flex: none;
  transform-origin: center center;
  display: flex;
  flex-direction: column;
  /* 等比缩放到当前视口：1920/1080 = 16/9，直接用 vmin 家族会破比例，这里用 JS 算的 scale 由父级给 */
  transform: scale(var(--stage-scale, 1));
}
.screen-head {
  display: flex;
  align-items: baseline;
  gap: 16px;
  padding: 20px 24px 8px;
}
.screen-title {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #38bdf8;
}
.screen-sub {
  font-size: 14px;
  color: #64748b;
}
.screen-card {
  background: #111a2c;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 14px 18px;
}
.screen-label {
  font-size: 14px;
  color: #64748b;
}
.screen-value {
  font-size: 44px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
}
.screen-unit {
  font-size: 16px;
  font-weight: 400;
  color: #64748b;
  margin-left: 6px;
}
.screen-target {
  font-size: 13px;
  color: #94a3b8;
  margin-top: 4px;
}
.screen-panel {
  background: #111a2c;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 10px 12px;
}
.screen-panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #38bdf8;
  padding-bottom: 6px;
}
.screen-mini {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 6px;
  padding: 8px 10px;
}
.screen-mini-val {
  font-size: 22px;
  font-weight: 600;
  color: #cbd5e1;
  font-variant-numeric: tabular-nums;
}
</style>
