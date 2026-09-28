<script setup lang="ts">
/** 对应 EM0004 氧氮氩监控（模块二 · 附录 B5 版式 V2 拓扑 + 实时 + 右栏）
 *  接口：monitorApi.gasPlant（POST /ems/monitor/gasplant）· monitorApi.tick（推进演示时钟）
 *  演示要点：空分是钢铁厂**最大的单一电耗户**，所以这页的每个数字都要能回落到两句话上：
 *        「制一立方氧要多少度电」和「这些氧、氮、氩分别去了哪」。
 *        机组表里 `kwhPerNm3` 是单位氧电耗（模型按负荷率给的单耗曲线，负荷率低反而更费电），
 *        产品表里的 `lossPct` 是管网放散与泄漏——**氧气管网不做消耗统计就是白送电**。
 *        纯度那张卡的判据是 DTO 自己带的 `specPct`（EG0001 的介质指标），页面不写阈值数字：
 *        把 99.5% 抄在页面上，EG0001 改指标这一格就永远说谎，那是本域红线意义上的页间矛盾。
 *        管网压力条画的是「当前压力在 0→高限 的哪一格」，同一行的 lo/hi 取自该管段自己，
 *        所以低限报警线在图上看得见、但不需要页面判断一次。
 *  待接入：液体储罐（液氧/液氮/液氩）与外供槽车计量——B3 只给了气态管网与汽化器。 */
import { computed, onMounted, ref } from "vue";
import MonitorShell from "../MonitorShell.vue";
import StatTile from "../../StatTile.vue";
import TopoCanvas from "../../TopoCanvas.vue";
import { monitorApi } from "@/api/energy";
import type { GasPlantViewDto, StatTone } from "@/api/energy/types";
import { TONE_BG, TONE_TEXT, emsHeaderTextClass, emsPanelClass } from "../../emsTheme";

const view = ref<GasPlantViewDto | null>(null);
const busy = ref(false);
const polling = ref(true);
const alarms = computed(() => view.value?.alarms ?? []);

async function peek() {
  try {
    view.value = await monitorApi.gasPlant();
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

const fmt = (v: number) => v.toLocaleString("zh-CN");

const PURITY_LABEL: Record<"O2" | "N2" | "AR", string> = { O2: "氧气纯度", N2: "氮气纯度", AR: "氩气纯度" };

const tiles = computed(() => {
  const v = view.value;
  if (!v) return [];
  const purity = (Object.keys(v.purity) as Array<"O2" | "N2" | "AR">).map((k) => {
    const p = v.purity[k];
    return {
      label: PURITY_LABEL[k],
      value: p.pct,
      unit: "%",
      /** 判据两侧都是 DTO 上的字段，页面一个阈值数字都不写 */
      tone: (p.pct >= p.specPct ? "ok" : "bad") as StatTone,
      hint: `指标 ${p.specPct}%`,
    };
  });
  return [
    ...purity,
    { label: "外供氩", value: v.exportArNm3h, unit: "Nm³/h", tone: "ok" as StatTone, hint: "汽化器直供管网" },
  ];
});

const maxTank = computed(() => Math.max(1, ...(view.value?.tanks ?? []).map((t) => t.pct)));
</script>

<template>
  <MonitorShell
    v-model:polling="polling"
    code="EM0004"
    name="氧氮氩监控"
    :stamp="view?.stamp ?? ''"
    :alarms="alarms"
    :busy="busy"
    @tick="reload"
    @refresh="peek"
  >
    <template #tools>
      <span class="text-xs text-muted-foreground">空分机组 · 氧氮氩三网 · 液体储罐调峰</span>
    </template>

    <section :class="[emsPanelClass, 'min-h-0 flex-[5] p-2']">
      <TopoCanvas v-if="view" :view="view.scene" />
      <div v-else class="flex h-full items-center justify-center text-xs text-muted-foreground">
        氧氮氩管网图加载中…
      </div>
    </section>

    <div class="flex min-h-0 flex-[4] gap-2">
      <section :class="[emsPanelClass, 'flex min-w-0 flex-[3] flex-col']">
        <div :class="[emsHeaderTextClass, 'shrink-0 px-2.5 py-1.5']">空分机组</div>
        <div class="min-h-0 flex-1 overflow-auto">
          <table class="w-full text-body">
            <thead class="text-xs text-muted-foreground">
              <tr>
                <th class="px-2.5 py-1 text-left font-medium">机组</th>
                <th class="px-2.5 py-1 text-right font-medium">产氧 Nm³/h</th>
                <th class="px-2.5 py-1 text-right font-medium">负荷率</th>
                <th class="px-2.5 py-1 text-right font-medium">电耗 kWh/Nm³</th>
                <th class="px-2.5 py-1 text-right font-medium">功率 kW</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in view?.units ?? []" :key="u.id" class="border-t border-border/60">
                <td class="px-2.5 py-1 text-foreground">{{ u.name }}</td>
                <td class="px-2.5 py-1 text-right tabular-nums text-foreground">{{ fmt(u.o2Nm3h) }}</td>
                <td class="px-2.5 py-1 text-right font-medium tabular-nums" :class="TONE_TEXT[u.tone]">
                  {{ u.capLoadPct }}%
                </td>
                <td class="px-2.5 py-1 text-right tabular-nums text-muted-foreground">{{ u.kwhPerNm3 }}</td>
                <td class="px-2.5 py-1 text-right tabular-nums text-muted-foreground">{{ fmt(u.kw) }}</td>
              </tr>
            </tbody>
          </table>
          <div class="px-2.5 pb-1.5 text-xs leading-5 text-muted-foreground">
            电耗随负荷率走同一条单耗曲线：机组压在低负荷反而更费电，这是「调度令加减负荷」在气体侧的依据。
          </div>
        </div>
      </section>

      <section :class="[emsPanelClass, 'flex min-w-0 flex-[3] flex-col']">
        <div :class="[emsHeaderTextClass, 'shrink-0 px-2.5 py-1.5']">产品平衡</div>
        <div class="min-h-0 flex-1 overflow-auto">
          <table class="w-full text-body">
            <thead class="text-xs text-muted-foreground">
              <tr>
                <th class="px-2 py-1 text-left font-medium">气体</th>
                <th class="px-2 py-1 text-right font-medium">自产</th>
                <th class="px-2 py-1 text-right font-medium">自用</th>
                <th class="px-2 py-1 text-right font-medium">外供</th>
                <th class="px-2 py-1 text-right font-medium">管网损失</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in view?.products ?? []" :key="p.media" class="border-t border-border/60">
                <td class="px-2 py-1">
                  <span
                    class="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                    :style="{ background: p.color }"
                  />
                  <span class="text-foreground">{{ p.name }}</span>
                </td>
                <td class="px-2 py-1 text-right tabular-nums text-foreground">{{ fmt(p.selfNm3h) }}</td>
                <td class="px-2 py-1 text-right tabular-nums text-foreground">{{ fmt(p.useNm3h) }}</td>
                <td class="px-2 py-1 text-right tabular-nums text-muted-foreground">{{ fmt(p.exportNm3h) }}</td>
                <td class="px-2 py-1 text-right tabular-nums text-muted-foreground">{{ p.lossPct }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div :class="[emsHeaderTextClass, 'shrink-0 px-2.5 py-1.5']">管网与储罐</div>
        <div class="shrink-0 px-2.5 pb-2">
          <div v-for="h in view?.headers ?? []" :key="h.id" class="flex items-center gap-2 py-0.5">
            <span class="w-24 shrink-0 truncate text-xs text-foreground">{{ h.name }}</span>
            <div class="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted-foreground/20">
              <div
                :class="TONE_BG.ok"
                class="h-full rounded-full"
                :style="{ width: `${Math.min(100, (h.mpa / (h.hiMpa || 1)) * 100)}%` }"
              />
            </div>
            <span class="w-28 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {{ h.mpa }} / 高 {{ h.hiMpa }} MPa
            </span>
            <span class="w-20 shrink-0 text-right text-xs tabular-nums text-foreground">{{ fmt(h.flowNm3h) }}</span>
          </div>
          <div v-for="t in view?.tanks ?? []" :key="t.id" class="flex items-center gap-2 py-0.5">
            <span class="w-24 shrink-0 truncate text-xs text-foreground">{{ t.name }}</span>
            <div class="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted-foreground/20">
              <div :class="TONE_BG.ok" class="h-full rounded-full" :style="{ width: `${(t.pct / maxTank) * 100}%` }" />
            </div>
            <span class="w-28 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {{ fmt(t.capM3) }} m³
            </span>
            <span class="w-20 shrink-0 text-right text-xs tabular-nums text-foreground">{{ t.pct }}%</span>
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
      <section :class="[emsPanelClass, 'shrink-0 px-2.5 py-2 text-xs leading-5 text-muted-foreground']">
        纯度指标取自 EG0001 的介质表，和报警规则、平衡表用的是同一行配置； 这里变红就是那行指标被踩到了，去 EG0001
        改一次、三张图一起跟着变。
      </section>
    </template>
  </MonitorShell>
</template>
