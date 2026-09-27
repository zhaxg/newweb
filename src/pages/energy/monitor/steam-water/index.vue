<script setup lang="ts">
/** 对应 EM0003 蒸汽与水平衡监控（模块二 · 附录 B5 版式 V2 拓扑 + 实时 + 右栏）
 *  接口：monitorApi.steam（POST /ems/monitor/steam）· monitorApi.tick（推进演示时钟）
 *  演示要点：蒸汽是钢铁厂里**唯一双向的介质**——烧结、转炉、加热炉既产汽也用汽，
 *        高炉与转炉的汽是**余热免费来的**，所以这页刻意把「汽源」和「用汽」分成两张表并排：
 *        左边问"汽从哪来、值多少"，右边问"汽到哪去、谁在吃"。两表的总量在 `model` 里同一次
 *        分摊算出，产汽 − 用汽 = 管损，这个恒等式在右栏那张「管损率」卡上收口。
 *        **环水系统是另一条账**：循环率越高补水越少，所以新水消耗和补水率放在最后一张卡，
 *        客户问"节水怎么看"时，答案就在循环回路那张表的供水/回水温差上（温差大才是把热量用掉了）。
 *        汽包水位只画条、不给结论：这页没有汽包水位的报警阈值契约，硬编一个 50% 就是页面自己造口径
 *        （本域红线），所以颜色全部来自 DTO 的 tone，条子只做归一化展示。
 *  待接入：蒸汽管网的水击与疏水监测、减温减压装置的开度（真实 EMS 有、契约里没这些字段）。 */
import { computed, onMounted, ref } from "vue";
import EChart from "../../EChart.vue";
import MonitorShell from "../MonitorShell.vue";
import StatTile from "../../StatTile.vue";
import TopoCanvas from "../../TopoCanvas.vue";
import { monitorApi } from "@/api/energy";
import type { StatTone, SteamViewDto } from "@/api/energy/types";
import { TONE_BG, TONE_TEXT, emsChartAxis, emsHeaderTextClass, emsPanelClass } from "../../emsTheme";
import type { EChartsOption } from "echarts";

const view = ref<SteamViewDto | null>(null);
const busy = ref(false);
const polling = ref(true);
const alarms = computed(() => view.value?.alarms ?? []);

/** 首帧只读、不推时钟：看现状不该让全厂走一分钟 */
async function peek() {
  try {
    view.value = await monitorApi.steam();
  } catch {
    /* 拦截层已 toast */
  }
}
async function reload() {
  if (busy.value) return;
  busy.value = true;
  try {
    await monitorApi.tick();
    await peek();
  } finally {
    busy.value = false;
  }
}
onMounted(peek);

const fmt = (v: number) => v.toLocaleString("zh-CN", { maximumFractionDigits: 1 });

/* ── 用汽构成：横向条形，长度就是 `sharePct`（占比在 model 里算，页面不再除一遍） ── */
const useOption = computed<EChartsOption>(() => {
  const u = view.value?.uses ?? [];
  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 130, right: 56, top: 12, bottom: 12 },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v) => `${v} t/h` },
    xAxis: { type: "value", ...emsChartAxis(true) },
    yAxis: {
      type: "category",
      /** 从下往上画：加热炉这类大户排在最上面，条子才有"谁最能吃"的读感 */
      data: u.map((x) => x.name).toReversed(),
      ...emsChartAxis(true),
    },
    series: [
      {
        name: "用汽",
        type: "bar",
        barWidth: 12,
        itemStyle: { color: "#38BDF8", borderRadius: [0, 3, 3, 0] },
        label: { show: true, position: "right", color: "#94A3B8", fontSize: 12, formatter: "{c} t/h" },
        data: u.map((x) => x.tph).toReversed(),
      },
    ],
  };
});

/* ── 汽包水位条：分母取当前最高的那台，只用于归一化，不做任何判断 ───────────── */
const maxDrum = computed(() => Math.max(1, ...(view.value?.drums ?? []).map((d) => d.pct)));

const tiles = computed(() => {
  const v = view.value;
  if (!v) return [];
  return [
    {
      label: "产汽",
      value: v.total.producedTph,
      unit: "t/h",
      tone: "ok" as StatTone,
      hint: `${v.sources.length} 类汽源`,
    },
    {
      label: "用汽",
      value: v.total.usedTph,
      unit: "t/h",
      tone: "ok" as StatTone,
      hint: `母管 ${v.header.mpa} MPa · ${v.header.tempC}℃`,
    },
    {
      label: "管网损失",
      value: v.total.lossPct,
      unit: "%",
      tone: v.total.tone,
      hint: `${v.total.lossTph} t/h · 跑冒滴漏`,
    },
    {
      label: "新水消耗",
      value: v.water.newWaterM3h,
      unit: "m³/h",
      tone: "ok" as StatTone,
      hint: `补水率 ${v.water.lossPct}% · 循环 ${fmt(v.water.circTotalM3h)} m³/h`,
    },
  ];
});
</script>

<template>
  <MonitorShell
    v-model:polling="polling"
    code="EM0003"
    name="蒸汽与水平衡监控"
    :stamp="view?.stamp ?? ''"
    :alarms="alarms"
    :busy="busy"
    @tick="reload"
    @refresh="peek"
  >
    <template #tools>
      <span class="text-xs text-muted-foreground">余热汽优先自用 · 不足由小锅炉补汽</span>
    </template>

    <section :class="[emsPanelClass, 'min-h-0 flex-[5] p-2']">
      <TopoCanvas v-if="view" :view="view.scene" />
      <div v-else class="flex h-full items-center justify-center text-xs text-muted-foreground">蒸汽管网图加载中…</div>
    </section>

    <div class="flex min-h-0 flex-[4] gap-2">
      <section :class="[emsPanelClass, 'flex min-w-0 flex-[3] flex-col']">
        <div :class="[emsHeaderTextClass, 'shrink-0 px-2.5 py-1.5']">汽源与热功率</div>
        <div class="min-h-0 flex-1 overflow-auto">
          <table class="w-full text-body">
            <thead class="text-xs text-muted-foreground">
              <tr>
                <th class="px-2.5 py-1 text-left font-medium">汽源</th>
                <th class="px-2.5 py-1 text-left font-medium">等级</th>
                <th class="px-2.5 py-1 text-right font-medium">台数</th>
                <th class="px-2.5 py-1 text-right font-medium">单台 t/h</th>
                <th class="px-2.5 py-1 text-right font-medium">产汽 t/h</th>
                <th class="px-2.5 py-1 text-right font-medium">热功率 MW</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in view?.sources ?? []" :key="s.id" class="border-t border-white/5">
                <td class="px-2.5 py-1">
                  <span class="text-foreground">{{ s.name }}</span>
                  <span v-if="s.offNetwork" :class="TONE_TEXT.warn" class="ml-1.5 text-xs">{{ s.note }}</span>
                </td>
                <td class="px-2.5 py-1 text-muted-foreground">{{ s.tier }}</td>
                <td class="px-2.5 py-1 text-right tabular-nums text-muted-foreground">{{ s.units }}</td>
                <td class="px-2.5 py-1 text-right tabular-nums text-muted-foreground">{{ s.perUnitTph }}</td>
                <td class="px-2.5 py-1 text-right font-medium tabular-nums" :class="TONE_TEXT[s.tone]">
                  {{ s.totalTph }}
                </td>
                <td class="px-2.5 py-1 text-right tabular-nums text-foreground">{{ s.value }}</td>
              </tr>
            </tbody>
          </table>
          <div class="px-2.5 pb-1.5 text-xs text-muted-foreground">
            热功率是实物量按介质热值折出来的（与 EG0001 同一批系数）；「不在网」的汽源标在名字后面，
            它不参与本表的产汽合计。
          </div>
        </div>
      </section>

      <section :class="[emsPanelClass, 'flex min-w-0 flex-[2] flex-col']">
        <div :class="[emsHeaderTextClass, 'shrink-0 px-2.5 py-1.5']">用汽去向</div>
        <EChart :option="useOption" force-dark class="min-h-0 flex-1" />
      </section>

      <section :class="[emsPanelClass, 'flex min-w-0 flex-[2] flex-col']">
        <div :class="[emsHeaderTextClass, 'shrink-0 px-2.5 py-1.5']">循环水系统</div>
        <div class="min-h-0 flex-1 overflow-auto">
          <table class="w-full text-body">
            <thead class="text-xs text-muted-foreground">
              <tr>
                <th class="px-2 py-1 text-left font-medium">回路</th>
                <th class="px-2 py-1 text-right font-medium">循环量</th>
                <th class="px-2 py-1 text-right font-medium">补水</th>
                <th class="px-2 py-1 text-right font-medium">供回温差</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in view?.water.loops ?? []" :key="l.id" class="border-t border-white/5">
                <td class="px-2 py-1 text-foreground">{{ l.name }}</td>
                <td class="px-2 py-1 text-right tabular-nums text-foreground">{{ fmt(l.circM3h) }}</td>
                <td class="px-2 py-1 text-right tabular-nums text-muted-foreground">{{ l.makeupM3h }}</td>
                <td class="px-2 py-1 text-right tabular-nums text-foreground">
                  {{ (l.returnC - l.supplyC).toFixed(1) }}℃
                </td>
              </tr>
            </tbody>
          </table>
          <div class="border-t border-white/5 px-2 py-1.5 text-xs text-muted-foreground">
            汽包水位
            <div v-for="d in view?.drums ?? []" :key="d.id" class="mt-1 flex items-center gap-2">
              <span class="w-20 shrink-0 truncate text-foreground">{{ d.name }}</span>
              <div class="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  :class="TONE_BG.ok"
                  class="h-full rounded-full"
                  :style="{ width: `${(d.pct / maxDrum) * 100}%` }"
                />
              </div>
              <span class="w-14 shrink-0 text-right tabular-nums text-foreground">{{ d.pct }}%</span>
            </div>
          </div>
        </div>
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
        <div class="mb-1.5 text-xs text-muted-foreground">蒸汽分级</div>
        <div v-for="t in view?.tiers ?? []" :key="t.id" class="flex items-baseline gap-2 py-0.5 text-xs">
          <span class="w-16 shrink-0 truncate text-foreground">{{ t.name }}</span>
          <span class="text-muted-foreground">{{ t.mpa }} MPa / {{ t.tempC }}℃</span>
          <span class="ml-auto tabular-nums text-sky-400">{{ t.prodTph }} t/h</span>
        </div>
        <div class="mt-1.5 text-xs leading-5 text-muted-foreground">
          管损率 = 产汽 − 用汽，与 EP0003 平衡表的「损失」列同源；两级之间靠减温减压装置串接。
        </div>
      </section>
    </template>
  </MonitorShell>
</template>
