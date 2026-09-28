<script setup lang="ts">
/** 对应 EM0001 供配电监控（模块二 · 附录 B5 版式 V2 拓扑 + 实时 + 右栏）
 *  接口：monitorApi.power（POST /ems/monitor/power）· monitorApi.tick（推进演示时钟）
 *        · 报警的确认/转令在 `MonitorShell` 里接线（四张画布页共用，见那里的注释）
 *  演示要点：**一次系统图上的每个数都能追到出处**。母线、主变、六路馈线、四路电源的数字
 *        全是 `model.monitorStats()` 按图元上的 `stat` key 解析出来的（画布几何住在 seed、
 *        数值住在 model，两边各一处），所以这张图和 EP0004 的结算、EO0001 的大屏是同一批数。
 *        **外购负荷这条线会随 3s 心跳动**（实时点），而需量、主变负载率的"月口径"不动——
 *        客户问"现在超没超需量"看实时点，问"这个月最大需量"看账，两件事在这页分成两个数摆着，
 *        比混成一个"需量 87%"诚实。
 *        三台主变的负载率常年不等：不是画错，是 B3 的 110kV 单母分段接线决定的，
 *        演示时这是一句很好的话——"我们的图能看出哪台该增容"。
 *  待接入：开关与刀闸位置（真实 EMS 由 SCADA 数字量点亮）、馈线规模到 20 路以上的折叠展示。 */
import { isDark } from "@/composables/useAppTheme";
import { computed, onMounted, ref } from "vue";
import EChart from "../../EChart.vue";
import MonitorShell from "../MonitorShell.vue";
import StatTile from "../../StatTile.vue";
import TopoCanvas from "../../TopoCanvas.vue";
import { monitorApi } from "@/api/energy";
import type { PowerViewDto, StatTone } from "@/api/energy/types";
import { TONE_BG, TONE_TEXT, emsChartAxis, emsHeaderTextClass, emsPanelClass } from "../../emsTheme";
import type { EChartsOption } from "echarts";

const view = ref<PowerViewDto | null>(null);
const busy = ref(false);
const polling = ref(true);
const alarms = computed(() => view.value?.alarms ?? []);

/** 每拍「推时钟 + 重读视图」。失败留着上一帧——实时页最怕刷新失败就一片空白 */
async function reload() {
  if (busy.value) return;
  busy.value = true;
  try {
    await monitorApi.tick();
    view.value = await monitorApi.power();
  } catch {
    /* 拦截层已 toast */
  } finally {
    busy.value = false;
  }
}
/** 首帧与报警后的重读都**不推时钟**：看现状不该让全厂走一分钟 */
async function peek() {
  try {
    view.value = await monitorApi.power();
  } catch {
    /* 拦截层已 toast */
  }
}
onMounted(peek);

/* ── 两张图 ─────────────────────────────────────────────────────────────── */

/** 近 1 小时外购负荷：x 轴是**演示分钟**（每拍 1 分钟、窗口 60 拍），不是墙上秒 */
const liveOption = computed<EChartsOption>(() => {
  const h = view.value?.history ?? [];
  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 52, right: 16, top: 26, bottom: 24 },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: h.map((_, i) => `${i - h.length + 1}`),
      ...emsChartAxis(isDark.value),
    },
    yAxis: {
      type: "value",
      name: "MW",
      nameTextStyle: { color: isDark.value ? "#64748B" : "#94A3B8", fontSize: 12 },
      ...emsChartAxis(isDark.value),
    },
    series: [
      {
        name: "外购负荷",
        type: "line",
        showSymbol: false,
        lineStyle: { color: "#38BDF8", width: 2 },
        areaStyle: { color: "rgba(56,189,248,0.14)" },
        data: h,
      },
    ],
  };
});

/** 逐时负荷 + 分时电价：柱是钱、线是负荷。这一格要说的话是「同样的负荷，哪个时段最贵」 */
const curveOption = computed<EChartsOption>(() => {
  const c = view.value?.curve ?? [];
  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 52, right: 52, top: 30, bottom: 24 },
    legend: { top: 2, textStyle: { color: isDark.value ? "#CBD5E1" : "#475569", fontSize: 12 } },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: c.map((p) => `${p.hour}时`), ...emsChartAxis(isDark.value) },
    yAxis: [
      {
        type: "value",
        name: "MW",
        nameTextStyle: { color: isDark.value ? "#64748B" : "#94A3B8", fontSize: 12 },
        ...emsChartAxis(isDark.value),
      },
      /* `splitLine` 必须写在展开**之后**：`emsChartAxis()` 自己也带 `splitLine`，
         写在前面会被它整个覆盖掉——那条轴的网格线就一直显示着（想让双轴图的右轴干净、
         却看不出为什么没生效）。顺序在这里是有语义的。 */
      { type: "value", name: "元/kWh", ...emsChartAxis(isDark.value), splitLine: { show: false } },
    ],
    series: [
      {
        name: "分时电价",
        type: "bar",
        yAxisIndex: 1,
        itemStyle: { color: "rgba(245,158,11,0.55)" },
        data: c.map((p) => p.price),
      },
      {
        name: "负荷",
        type: "line",
        smooth: true,
        showSymbol: false,
        lineStyle: { color: "#38BDF8", width: 2 },
        data: c.map((p) => p.mw),
      },
    ],
  };
});

/* ── 右栏数字：tone 一律取 DTO 的，页面一个阈值都不写 ───────────────────── */

const worstT = computed(() => {
  const list = view.value?.transformers ?? [];
  return list.length ? list.reduce((a, b) => (b.ratioPct > a.ratioPct ? b : a)) : null;
});

const tiles = computed(() => {
  const v = view.value;
  if (!v) return [];
  return [
    { label: "外购负荷", value: v.nowMw, unit: "MW", tone: v.demand.tone, hint: `${v.hour} 时 · ${v.price.tier}段` },
    { label: "自发电", value: v.selfGen.mw, unit: "MW", tone: v.selfGen.tone, hint: `自发电率 ${v.selfGen.ratePct}%` },
    {
      label: "需量利用率",
      value: v.demand.utilPct,
      unit: "%",
      tone: v.demand.tone,
      hint: `申报 ${v.demand.declaredKVA.toLocaleString("zh-CN")} kVA`,
    },
    { label: "功率因数", value: v.pf.actual, unit: "", tone: v.pf.tone, hint: `考核目标 ${v.pf.target}` },
    {
      label: "最重主变",
      value: worstT.value?.ratioPct ?? 0,
      unit: "%",
      tone: worstT.value?.tone ?? "ok",
      hint: worstT.value?.name ?? "",
    },
    { label: "当前电价", value: v.price.now, unit: "元/kWh", tone: "ok" as StatTone, hint: `月均 ${v.price.avg}` },
  ];
});

/** 主变负载条的分母：拿全厂申报容量当满刻度没有意义，用**当前最重那台**归一，一眼看出谁紧 */
const maxRatio = computed(() => Math.max(1, ...(view.value?.transformers ?? []).map((t) => t.ratioPct)));
</script>

<template>
  <MonitorShell
    v-model:polling="polling"
    code="EM0001"
    name="供配电监控"
    :stamp="view?.stamp ?? ''"
    :alarms="alarms"
    :busy="busy"
    @tick="reload"
    @refresh="peek"
  >
    <template #tools>
      <span class="text-xs text-muted-foreground">110kV 单母分段 · 四路自备电源并网</span>
    </template>

    <section :class="[emsPanelClass, 'min-h-0 flex-[5] p-2']">
      <TopoCanvas v-if="view" :view="view.scene" />
      <div v-else class="flex h-full items-center justify-center text-xs text-muted-foreground">一次系统图加载中…</div>
    </section>

    <div class="flex min-h-0 flex-[4] flex-col gap-2">
      <div class="flex min-h-0 flex-1 gap-2">
        <section :class="[emsPanelClass, 'flex min-w-0 flex-1 flex-col']">
          <div :class="[emsHeaderTextClass, 'shrink-0 px-2.5 py-1.5']">近 1 小时外购负荷</div>
          <EChart :option="liveOption" class="min-h-0 flex-1" />
        </section>
        <section :class="[emsPanelClass, 'flex min-w-0 flex-1 flex-col']">
          <div :class="[emsHeaderTextClass, 'shrink-0 px-2.5 py-1.5']">逐时负荷与分时电价</div>
          <EChart :option="curveOption" class="min-h-0 flex-1" />
        </section>
      </div>

      <section :class="[emsPanelClass, 'shrink-0']">
        <div :class="[emsHeaderTextClass, 'px-2.5 py-1.5']">自备机组与余能回收</div>
        <table class="w-full text-body">
          <thead class="text-xs text-muted-foreground">
            <tr>
              <th class="px-2.5 py-1 text-left font-medium">电源</th>
              <th class="px-2.5 py-1 text-right font-medium">出力 MW</th>
              <th class="px-2.5 py-1 text-right font-medium">负荷率</th>
              <th class="px-2.5 py-1 text-right font-medium">用气 m³/h</th>
              <th class="px-2.5 py-1 text-left font-medium">状态</th>
              <th class="px-2.5 py-1 text-right font-medium">回收电量</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in view?.genUnits ?? []" :key="u.id" class="border-t border-border/60">
              <td class="px-2.5 py-1 text-foreground">{{ u.name }}</td>
              <td class="px-2.5 py-1 text-right font-medium tabular-nums" :class="TONE_TEXT[u.tone]">{{ u.mw }}</td>
              <td class="px-2.5 py-1 text-right tabular-nums text-foreground">{{ u.loadRatioPct }}%</td>
              <td class="px-2.5 py-1 text-right tabular-nums text-foreground">
                {{ u.fuelM3h.toLocaleString("zh-CN") }}
              </td>
              <td class="px-2.5 py-1 text-muted-foreground">{{ u.running ? "运行" : "停机" }}</td>
              <td class="px-2.5 py-1 text-right text-muted-foreground">—</td>
            </tr>
            <tr v-for="r in view?.recoveries ?? []" :key="r.id" class="border-t border-border/60">
              <td class="px-2.5 py-1 text-foreground">{{ r.name }}</td>
              <td class="px-2.5 py-1 text-right font-medium tabular-nums text-foreground">{{ r.mw }}</td>
              <td class="px-2.5 py-1 text-right text-muted-foreground">余能</td>
              <td class="px-2.5 py-1 text-right text-muted-foreground">—</td>
              <td class="px-2.5 py-1 text-muted-foreground">运行</td>
              <td class="px-2.5 py-1 text-right tabular-nums text-foreground">
                {{ r.kwh.toLocaleString("zh-CN") }} kWh
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>

    <template #tiles>
      <div class="grid shrink-0 grid-cols-2 gap-2">
        <StatTile
          v-for="t in tiles"
          :key="t.label"
          :label="t.label"
          :value="t.value"
          :unit="t.unit"
          :tone="t.tone"
          :hint="t.hint"
        />
      </div>
      <section :class="[emsPanelClass, 'shrink-0 px-2.5 py-2']">
        <div class="mb-1.5 text-xs text-muted-foreground">主变负载率</div>
        <div v-for="t in view?.transformers ?? []" :key="t.id" class="flex items-center gap-2 py-0.5">
          <span class="w-20 shrink-0 truncate text-xs text-foreground">{{ t.name }}</span>
          <div class="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted-foreground/20">
            <div
              :class="TONE_BG[t.tone]"
              class="h-full rounded-full"
              :style="{ width: `${(t.ratioPct / maxRatio) * 100}%` }"
            />
          </div>
          <span class="w-12 shrink-0 text-right text-xs tabular-nums" :class="TONE_TEXT[t.tone]"
            >{{ t.ratioPct }}%</span
          >
        </div>
      </section>
    </template>
  </MonitorShell>
</template>
