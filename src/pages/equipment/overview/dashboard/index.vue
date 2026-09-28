<script setup lang="ts">
/** 对应 AO0001 领导驾驶舱（模块一 总览 · 附录 B5 版式 L6：全屏大屏）
 *  接口：overviewApi.dashboard（GET /eam/overview/dashboard）——一次拿整屏（KPI/待办/警报/趋势/排行/产线），不分页不过滤
 *  演示要点：**这是主线第 10 幕的收口屏**，也是整个系统「活了」的最直观证据：
 *        AM0002 点剧本、AO0003 转工单、AS0005 离职折算，每一下都会在 4 秒内改到这里的数字与曲线
 *        （mock 端 `dashboard()` 是现算的，见 `src/mock/equipment/overview.ts` 的不缓存注释）。
 *        左侧厂区示意按产线分块、颜色=该线设备健康度均值，和 AO0002 看板用同一套阈值；
 *        警报条只滚动「活动」报警，处理掉就从屏上消失——客户要的是"这块屏平时就该挂在调度室"。
 *  待接入：无（大屏只读一屏，一个聚合接口，没有增删改与导出）。
 *  已知偏差：① 大屏刻意自带深色，不跟随壳层主题（会议室大屏跟随浅色设置会整屏发白），
 *        因此三张 echarts 图的**所有颜色都写死在 option 里**——`EChart.vue` 只在 html.dark 时套 dark 主题，
 *        不写死就会在浅色主题下画出两块白底图贴在深蓝屏上；② 无真实历史存档，健康度趋势以当前均值往回铺；
 *        ③ 缩放档只做等比 scale，没有 21:9 超宽屏的排版变体。 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import type { EChartsOption } from "echarts";
import { overviewApi } from "@/api/equipment";
import type { DashboardOverview } from "@/api/equipment/types";
import EChart from "../../EChart.vue";

/** 4 秒：比 AM0002 的实时曲线慢一档（那页要"跳"，这屏只要"变"），但快过讲解一句话的间隔 */
const POLL_MS = 4000;
const W = 1920;
const H = 1080;

const router = useRouter();
const data = ref<DashboardOverview | null>(null);
let timer: ReturnType<typeof setInterval> | null = null;
let clockTimer: ReturnType<typeof setInterval> | null = null;

async function load() {
  try {
    data.value = await overviewApi.dashboard();
  } catch {
    /* 拦截层已 toast；拿不到就保留上一屏画面，大屏最怕的是闪成空白 */
  }
}

/* ── 1920×1080 画布等比缩放（照 carbon 大屏那条路：外层 flex 居中 + origin center）── */
const scale = ref(1);
function fit() {
  const k = Math.min(window.innerWidth / W, window.innerHeight / H);
  scale.value = Number.isFinite(k) && k > 0 ? k : 1;
}
const stageStyle = computed(() => ({ width: `${W}px`, height: `${H}px`, transform: `scale(${scale.value})` }));

/* ── 时钟：大屏右上角的"现在几点"就是墙上时间，与演示时钟（DEMO_T0）无关 ── */
const clock = ref("");
const pad2 = (n: number) => String(n).padStart(2, "0");
function tick() {
  const d = new Date();
  clock.value = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

onMounted(() => {
  void load();
  timer = setInterval(() => void load(), POLL_MS);
  tick();
  clockTimer = setInterval(tick, 1000);
  fit();
  window.addEventListener("resize", fit);
});
onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
  if (clockTimer) clearInterval(clockTimer);
  window.removeEventListener("resize", fit);
});

/* ── 颜色：与 AO0002 / AM0004 同一套健康度分档，两处不一致客户一眼就看出来 ── */
const healthColor = (h: number) => (h >= 85 ? "#22c55e" : h >= 70 ? "#84cc16" : h >= 60 ? "#f97316" : "#ef4444");
const LEVEL_COLOR: Record<string, string> = { 紧急: "#ff4d4f", 报警: "#f97316", 预警: "#facc15", 提示: "#38bdf8" };
const LINE_PALETTE = ["#38bdf8", "#22c55e", "#facc15", "#a78bfa", "#fb7185", "#34d399"];

const cards = computed(() => {
  const d = data.value;
  if (!d) return [];
  return [
    { label: "设备总数", value: d.deviceTotal, unit: "台", tone: "#e8f4ff" },
    { label: "运行中", value: d.running, unit: "台", tone: "#22c55e" },
    { label: "故障停机", value: d.faultStop, unit: "台", tone: d.faultStop ? "#ff4d4f" : "#7f9cc0" },
    { label: "活动报警", value: d.activeAlarm, unit: "条", tone: d.urgentAlarm ? "#ff4d4f" : "#facc15" },
    { label: "在办工单", value: d.openWorkOrder, unit: "张", tone: "#38bdf8" },
    { label: "平均健康度", value: d.avgHealth, unit: "分", tone: healthColor(d.avgHealth) },
  ];
});

const todos = computed(() => {
  const t = data.value?.todo;
  if (!t) return [];
  return [
    { label: "寿命超期", value: t["寿命超期"], hot: t["寿命超期"] > 0 },
    { label: "寿命临期", value: t["寿命临期"], hot: t["寿命临期"] > 0 },
    { label: "特种待检", value: t["特种待检"], hot: t["特种待检"] > 0 },
    { label: "计量临检", value: t["计量临检"], hot: t["计量临检"] > 0 },
    { label: "活动报警", value: t["活动报警"], hot: t["活动报警"] > 0 },
  ];
});

const AXIS = "#8fa9cc";
const SPLIT = "rgba(120, 160, 210, 0.16)";
/** tooltip 也写死深色：默认浅色底在深蓝屏上就是一块白板 */
const TIP = {
  backgroundColor: "rgba(8, 22, 44, 0.92)",
  borderColor: "rgba(56, 189, 248, 0.5)",
  textStyle: { color: "#dbeafe", fontSize: 13 },
} as const;

/** 健康度趋势（面积图）：每条产线一条，剧本改哪条线就只有那条动 */
const trendOption = computed<EChartsOption>(() => {
  const t = data.value?.healthTrend;
  return {
    backgroundColor: "transparent",
    animation: false,
    color: LINE_PALETTE,
    tooltip: { trigger: "axis", ...TIP },
    legend: {
      top: 0,
      right: 4,
      itemWidth: 10,
      itemHeight: 6,
      textStyle: { color: AXIS, fontSize: 12 },
    },
    grid: { left: 44, right: 16, top: 32, bottom: 26 },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: t?.days ?? [],
      axisLine: { lineStyle: { color: SPLIT } },
      axisLabel: { color: AXIS, fontSize: 12 },
    },
    yAxis: {
      type: "value",
      scale: true,
      axisLabel: { color: AXIS, fontSize: 12 },
      splitLine: { lineStyle: { color: SPLIT } },
    },
    series: (t?.series ?? []).map((s, i) => ({
      name: s.name,
      type: "line" as const,
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 1.6 },
      areaStyle: { opacity: i === 0 ? 0.22 : 0.1 },
      data: s.data,
    })),
  };
});

/** 备件寿命排行榜（横向条形）：越长越接近换，红色即 AS0003 的超期行 */
const barColor = (r: { ratio: number; status: string }) =>
  r.status === "超期" || r.ratio >= 100 ? "#ff4d4f" : r.status === "临期" || r.ratio >= 85 ? "#f97316" : "#38bdf8";

const lifeOption = computed<EChartsOption>(() => {
  /* echarts 的 category 轴从下往上画，要"第一名在最上面"就得把数组倒过来。
     用 toReversed 而不是 reverse：这份数组是响应式 data 的一部分，原地翻转会改掉源数据本身 */
  const list = (data.value?.lifeRank ?? []).toReversed();
  return {
    backgroundColor: "transparent",
    animation: false,
    tooltip: { trigger: "item", ...TIP, formatter: "{b}<br/>已用寿命 {c}% · {d}" },
    grid: { left: 8, right: 46, top: 10, bottom: 10, containLabel: true },
    xAxis: {
      type: "value",
      max: 100,
      axisLabel: { color: AXIS, fontSize: 12 },
      splitLine: { lineStyle: { color: SPLIT } },
    },
    yAxis: {
      type: "category",
      data: list.map((r) => `${r.spName}`),
      axisLine: { lineStyle: { color: SPLIT } },
      axisLabel: { color: AXIS, fontSize: 12, width: 120, overflow: "truncate" },
    },
    series: [
      {
        type: "bar",
        barWidth: 10,
        itemStyle: { borderRadius: [0, 5, 5, 0] },
        label: { show: true, position: "right", color: "#cfe6ff", fontSize: 12, formatter: "{c}%" },
        data: list.map((r) => ({
          value: r.ratio,
          name: `${r.holder} · ${r.serial}`,
          itemStyle: { color: barColor(r) },
        })),
      },
    ],
  };
});

/** OEE 仪表盘：大屏正中，一眼看到"设备综合利用效率" */
const oeeOption = computed<EChartsOption>(
  () =>
    ({
      backgroundColor: "transparent",
      animation: false,
      series: [
        {
          type: "gauge",
          radius: "92%",
          startAngle: 210,
          endAngle: -30,
          min: 0,
          max: 100,
          progress: { show: true, width: 14, itemStyle: { color: "#38bdf8" } },
          axisLine: { lineStyle: { width: 14, color: [[1, "rgba(120, 160, 210, 0.2)"]] } },
          axisTick: { show: false },
          splitLine: { length: 8, lineStyle: { color: SPLIT, width: 1 } },
          axisLabel: { distance: 16, color: AXIS, fontSize: 12 },
          pointer: { show: false },
          anchor: { show: false },
          title: { show: true, offsetCenter: [0, "34%"], color: AXIS, fontSize: 14 },
          detail: {
            valueAnimation: false,
            offsetCenter: [0, "-2%"],
            fontSize: 46,
            fontWeight: 700,
            color: "#e8f4ff",
            formatter: "{value}%",
          },
          data: [{ value: data.value?.oee ?? 0, name: "OEE 综合效率" }],
        },
      ],
    }) as EChartsOption,
);

/** 第二块小仪表位：备件资金周转，跟 OEE 同排摆，调度室关心的是"钱压在库房多少" */
const turnOption = computed<EChartsOption>(
  () =>
    ({
      backgroundColor: "transparent",
      animation: false,
      series: [
        {
          type: "gauge",
          radius: "86%",
          center: ["50%", "58%"],
          startAngle: 210,
          endAngle: -30,
          min: 0,
          max: 8,
          progress: { show: true, width: 10, itemStyle: { color: "#22c55e" } },
          axisLine: { lineStyle: { width: 10, color: [[1, "rgba(120, 160, 210, 0.2)"]] } },
          axisTick: { show: false },
          splitLine: { length: 6, lineStyle: { color: SPLIT, width: 1 } },
          axisLabel: { distance: 12, color: AXIS, fontSize: 11 },
          pointer: { show: false },
          title: { show: true, offsetCenter: [0, "40%"], color: AXIS, fontSize: 13 },
          detail: {
            valueAnimation: false,
            offsetCenter: [0, "0%"],
            fontSize: 30,
            fontWeight: 700,
            color: "#e8f4ff",
            formatter: "{value}",
          },
          data: [{ value: data.value?.spareTurnover ?? 0, name: "备件周转率 次/年" }],
        },
      ],
    }) as EChartsOption,
);

const goHealth = () => router.push("/equipment/overview/health");
</script>

<template>
  <div class="bi-root">
    <div class="bi-stage" :style="stageStyle">
      <!-- 标题栏 -->
      <div class="bi-head">
        <div class="bi-head-side">
          <span class="bi-dot" />
          {{ data?.plant ?? "设备全生命周期管理" }}
        </div>
        <div class="bi-title">设 备 管 理 领 导 驾 驶 舱</div>
        <div class="bi-head-side bi-clock">{{ clock }}</div>
      </div>

      <div class="bi-body">
        <!-- 左列：中央厂区示意 + 实时警报滚动条 -->
        <div class="bi-col bi-side">
          <section class="bi-panel grow-2">
            <h3 class="bi-panel-h">中央厂区示意<span class="bi-panel-sub">点击进健康看板</span></h3>
            <div class="bi-lines">
              <button v-for="l in data?.lines ?? []" :key="l.name" class="bi-line" @click="goHealth()">
                <span class="bi-line-bar" :style="{ background: healthColor(l.health) }" />
                <span class="bi-line-name">{{ l.name }}</span>
                <span class="bi-line-meta">{{ l.deviceCount }} 台</span>
                <span class="bi-line-health" :style="{ color: healthColor(l.health) }">{{ l.health }}</span>
                <span class="bi-line-alarm" :class="{ hot: l.alarms > 0 }">警 {{ l.alarms }}</span>
              </button>
            </div>
          </section>

          <section class="bi-panel grow-3">
            <h3 class="bi-panel-h">实时警报<span class="bi-panel-sub">活动报警 · 处理完即消失</span></h3>
            <div class="bi-alarm-mask">
              <div
                class="bi-alarm-track"
                :style="{ animationDuration: `${Math.max(12, (data?.alarms.length ?? 1) * 4)}s` }"
              >
                <div
                  v-for="(a, i) in [...(data?.alarms ?? []), ...(data?.alarms ?? [])]"
                  :key="`${a.id}-${i}`"
                  class="bi-alarm"
                >
                  <span class="bi-alarm-level" :style="{ background: LEVEL_COLOR[a.level] ?? '#38bdf8' }">{{
                    a.level
                  }}</span>
                  <span class="bi-alarm-msg">{{ a.msg }}</span>
                  <span class="bi-alarm-at">{{ a.occurredAt.slice(5, 16) }}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- 中列：KPI + 双仪表 + 待办（科技蓝描边） -->
        <div class="bi-col bi-center">
          <div class="bi-kpis">
            <div v-for="c in cards" :key="c.label" class="bi-kpi">
              <div class="bi-kpi-label">{{ c.label }}</div>
              <div class="bi-kpi-value" :style="{ color: c.tone }">
                {{ c.value }}<span class="bi-kpi-unit">{{ c.unit }}</span>
              </div>
            </div>
          </div>

          <section class="bi-panel bi-panel-edge grow-1">
            <h3 class="bi-panel-h">运行效率</h3>
            <div class="bi-gauges">
              <EChart :option="oeeOption" class="min-w-0 flex-1" />
              <div class="bi-gauge-split" />
              <EChart :option="turnOption" class="min-w-0 flex-1" />
            </div>
            <div class="bi-gauge-foot">
              <span
                >备件资金 <b>{{ data?.spareValue ?? 0 }}</b> 万元</span
              >
              <span
                >当月故障率
                <b :style="{ color: (data?.faultRate ?? 0) > 3 ? '#ff4d4f' : '#22c55e' }"
                  >{{ data?.faultRate ?? 0 }}%</b
                ></span
              >
              <span
                >紧急报警
                <b :style="{ color: (data?.urgentAlarm ?? 0) > 0 ? '#ff4d4f' : '#7f9cc0' }">{{
                  data?.urgentAlarm ?? 0
                }}</b>
                条</span
              >
            </div>
          </section>

          <section class="bi-panel">
            <h3 class="bi-panel-h">
              到期扫描待办<span class="bi-panel-sub">每日启动跑一遍，大屏与列表页同一口径</span>
            </h3>
            <div class="bi-todos">
              <div v-for="t in todos" :key="t.label" class="bi-todo" :class="{ hot: t.hot }">
                <div class="bi-todo-value">{{ t.value }}</div>
                <div class="bi-todo-label">{{ t.label }}</div>
              </div>
            </div>
          </section>
        </div>

        <!-- 右列：健康趋势（面积图）+ 备件寿命排行榜（横向条形） -->
        <div class="bi-col bi-side">
          <section class="bi-panel grow-2">
            <h3 class="bi-panel-h">设备健康度趋势<span class="bi-panel-sub">近 7 日 · 按产线</span></h3>
            <EChart :option="trendOption" class="min-h-0 flex-1" />
          </section>
          <section class="bi-panel grow-3">
            <h3 class="bi-panel-h">备件寿命排行榜<span class="bi-panel-sub">Top 10 · 越接近 100% 越该换</span></h3>
            <EChart :option="lifeOption" class="min-h-0 flex-1" />
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 大屏自带深色，不跟壳层主题（见文件头偏差①）。字号写在局部类里而不是 text-[34px]：
   四档字阶是给应用壳层的纪律，1920×1080 画布是另一套介质（投到调度室电视上），
   这里既不吃 Tailwind 的字号档，也不去破 audit:ui 的 R1。 */
.bi-root {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #050d1c;
  color: #cfe0f5;
  font-family: "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
}
.bi-stage {
  flex: none;
  transform-origin: center center;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: radial-gradient(circle at 50% 0%, #103059 0%, #071730 45%, #050d1c 100%);
}
.bi-head {
  position: relative;
  flex: none;
  height: 78px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 28px;
  border-bottom: 1px solid rgba(56, 189, 248, 0.28);
}
.bi-title {
  font-size: 34px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #eaf6ff;
  text-shadow: 0 0 18px rgba(56, 189, 248, 0.6);
}
.bi-head-side {
  font-size: 15px;
  letter-spacing: 1px;
  color: #7fa8d8;
  display: flex;
  align-items: center;
  gap: 8px;
}
.bi-clock {
  justify-self: end;
  font-variant-numeric: tabular-nums;
}
.bi-dot {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background: #38bdf8;
  box-shadow: 0 0 10px #38bdf8;
}
.bi-body {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: 460px 1fr 560px;
  gap: 16px;
  padding: 16px 20px 20px;
}
.bi-col {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}
.grow-1 {
  flex: 1 1 0;
  min-height: 0;
}
.grow-2 {
  flex: 2 1 0;
  min-height: 0;
}
.grow-3 {
  flex: 3 1 0;
  min-height: 0;
}
.bi-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 12px 14px 14px;
  border: 1px solid rgba(56, 189, 248, 0.22);
  border-radius: 6px;
  background: rgba(12, 34, 64, 0.55);
}
/* 中间主面板的科技蓝描边 + 四角亮条：B5 里"中间科技蓝描边"就是这块 */
.bi-panel-edge {
  border-color: rgba(56, 189, 248, 0.6);
  box-shadow:
    inset 0 0 24px rgba(56, 189, 248, 0.12),
    0 0 18px rgba(56, 189, 248, 0.14);
}
.bi-panel-edge::before,
.bi-panel-edge::after {
  content: "";
  position: absolute;
  width: 26px;
  height: 26px;
  border-color: #4cf5ff;
  border-style: solid;
}
.bi-panel-edge::before {
  top: -1px;
  left: -1px;
  border-width: 2px 0 0 2px;
}
.bi-panel-edge::after {
  right: -1px;
  bottom: -1px;
  border-width: 0 2px 2px 0;
}
.bi-panel-h {
  flex: none;
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #eaf6ff;
}
.bi-panel-h::before {
  content: "";
  width: 4px;
  height: 14px;
  border-radius: 2px;
  background: #38bdf8;
}
.bi-panel-sub {
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0;
  color: #6d8cb5;
}
/* 厂区示意 */
.bi-lines {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bi-line {
  display: grid;
  grid-template-columns: 6px 1fr auto auto auto;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(120, 160, 210, 0.18);
  border-radius: 4px;
  background: rgba(8, 24, 48, 0.7);
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.bi-line:hover {
  border-color: rgba(76, 245, 255, 0.7);
}
.bi-line-bar {
  width: 6px;
  height: 26px;
  border-radius: 3px;
}
.bi-line-name {
  font-size: 15px;
  color: #dbeafe;
}
.bi-line-meta,
.bi-line-alarm {
  font-size: 12px;
  color: #7fa8d8;
}
.bi-line-alarm.hot {
  color: #ff4d4f;
}
.bi-line-health {
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
/* 警报滚动条 */
.bi-alarm-mask {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}
.bi-alarm-track {
  display: flex;
  flex-direction: column;
  gap: 6px;
  animation: bi-scroll-y linear infinite;
}
@keyframes bi-scroll-y {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-50%);
  }
}
.bi-alarm {
  display: grid;
  grid-template-columns: 44px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 4px;
  background: rgba(8, 24, 48, 0.66);
}
.bi-alarm-level {
  padding: 2px 0;
  border-radius: 3px;
  font-size: 12px;
  color: #05101f;
  text-align: center;
  font-weight: 600;
}
.bi-alarm-msg {
  font-size: 14px;
  color: #dbeafe;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bi-alarm-at {
  font-size: 12px;
  color: #6d8cb5;
  font-variant-numeric: tabular-nums;
}
/* KPI */
.bi-kpis {
  flex: none;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.bi-kpi {
  padding: 12px 14px;
  border: 1px solid rgba(56, 189, 248, 0.22);
  border-radius: 6px;
  background: rgba(12, 34, 64, 0.55);
}
.bi-kpi-label {
  font-size: 13px;
  letter-spacing: 1px;
  color: #7fa8d8;
}
.bi-kpi-value {
  margin-top: 4px;
  font-size: 34px;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.bi-kpi-unit {
  margin-left: 4px;
  font-size: 13px;
  font-weight: 400;
  color: #7fa8d8;
}
.bi-gauges {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: stretch;
}
.bi-gauge-split {
  flex: none;
  width: 1px;
  background: rgba(56, 189, 248, 0.25);
}
.bi-gauge-foot {
  flex: none;
  display: flex;
  justify-content: space-around;
  padding-top: 6px;
  font-size: 13px;
  color: #7fa8d8;
}
.bi-gauge-foot b {
  font-size: 18px;
  color: #eaf6ff;
  font-variant-numeric: tabular-nums;
  margin-left: 4px;
}
/* 待办 */
.bi-todos {
  flex: none;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}
.bi-todo {
  padding: 8px 0;
  text-align: center;
  border-radius: 4px;
  background: rgba(8, 24, 48, 0.66);
}
.bi-todo-value {
  font-size: 26px;
  font-weight: 700;
  color: #cfe6ff;
  font-variant-numeric: tabular-nums;
}
.bi-todo.hot .bi-todo-value {
  color: #ff4d4f;
}
.bi-todo-label {
  font-size: 12px;
  color: #7fa8d8;
}
</style>
