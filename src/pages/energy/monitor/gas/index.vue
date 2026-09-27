<script setup lang="ts">
/** 对应 EM0002 煤气系统平衡监控（模块二 · 附录 B5 版式 V2 · **8 幕剧本的幕 2 主场**）
 *  接口：monitorApi.gas（POST /ems/monitor/gas）· gasSimApi.surge/surgeStop · suggestionApi.accept
 *  演示要点：这一页是整套演示的心脏。**「▶模拟转炉吹炼高峰」按下去之后，
 *        柜位要在 30 秒内从 62% 爬到 88%**（`store.ldgSurge` 用写死的 ramp 而不是随机抖动，
 *        随机数据会让幕 2 变成抽奖），随后柜位越红线 → `tickRealtime` 自动发级别 2 报警 →
 *        右栏报警流出现一条能点的行 → 转调度令 → 执行完毕 → 回到这页看斜率真的变了。
 *        这条链在代码里只有一条路径成立：报警、倒计时、放散量都从同一个 `simulateGasBalance` 出来。
 *        **两个放散量并存是刻意的**：表格里那列是**月均**（账，EP0003 的放散率就是它），
 *        卡片上那个是**当班**（实时仿真）。客户拿计算器对不上时，答案是"您在看的是不同时间尺度"，
 *        而不是"我们算错了"——所以两处各自标了「月均 / 当班」四个字。
 *        切介质只换关注对象（`scenario.media`），三根总管在一张图上同时算、同时报警。
 *  待接入：柜位与放散的秒级 SCADA 采样（演示按分钟推进）。 */
import { computed, onMounted, ref } from "vue";
import Button from "primevue/button";
import Select from "primevue/select";
import EChart from "../../EChart.vue";
import MonitorShell from "../MonitorShell.vue";
import StatTile from "../../StatTile.vue";
import TopoCanvas from "../../TopoCanvas.vue";
import { gasSimApi, monitorApi, suggestionApi } from "@/api/energy";
import type { DispatchSuggestion, GasViewDto } from "@/api/energy/types";
import { useToast } from "@/composables/useToast";
import { applyResult } from "../../rowActions";
import { TONE_TEXT, emsChartAxis, emsHeaderTextClass, emsPanelClass } from "../../emsTheme";
import type { EChartsOption } from "echarts";

const { toast } = useToast();

const view = ref<GasViewDto | null>(null);
const busy = ref(false);
const polling = ref(true);
/** 关注的煤气介质。切换只换 `media`，四张画布与规则引擎都吃这一个参数 */
const media = ref("LDG");
const alarms = computed(() => view.value?.alarms ?? []);

async function peek() {
  try {
    view.value = await monitorApi.gas(media.value);
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
  } catch {
    /* 拦截层已 toast */
  } finally {
    busy.value = false;
  }
}
/** 剧本按钮：动作本身回一份新快照（`ActionResult.data`），但页面仍以重读为准——
    快照只用来让按钮的 toast 之后画面立刻是新的，不做第二份数据源 */
async function runAction(run: () => Promise<unknown>, okMsg = "") {
  if (busy.value) return;
  busy.value = true;
  try {
    if (applyResult(await run(), okMsg, toast)) await peek();
  } finally {
    busy.value = false;
  }
}
const surge = () => runAction(() => gasSimApi.surge(media.value), "吹炼高峰已注入");
const stopSurge = () => runAction(() => gasSimApi.surgeStop(), "剧本已收");
const accept = (s: DispatchSuggestion) => runAction(() => suggestionApi.accept(s.id), "已转调度令草拟");

/** 换介质要看的是那根总管的账，不需要推时钟 */
const pickMedia = () => void peek();
onMounted(peek);

/* ── 柜位曲线：剧本柜 + 同组其余柜，画近 1 小时 ─────────────────────────── */

const holderOption = computed<EChartsOption>(() => {
  const hs = view.value?.holders ?? [];
  const n = hs[0]?.history.length ?? 0;
  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 46, right: 16, top: 30, bottom: 24 },
    legend: { top: 2, textStyle: { color: "#CBD5E1", fontSize: 12 } },
    tooltip: { trigger: "axis", valueSuffix: "%" },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: Array.from({ length: n }, (_, i) => `${i - n + 1}`),
      ...emsChartAxis(true),
    },
    yAxis: {
      type: "value",
      max: 100,
      name: "%",
      nameTextStyle: { color: "#64748B", fontSize: 12 },
      ...emsChartAxis(true),
    },
    series: hs.map((h) => ({
      name: h.name,
      type: "line",
      showSymbol: false,
      data: h.history,
      /** 上下限画成两条虚线：柜位的"该报警了"是这两条线决定的，不画出来客户就要自己心算 */
      markLine:
        h.id === hs.find((x) => x.mediaCode === media.value)?.id
          ? {
              silent: true,
              symbol: "none",
              label: { color: "#94A3B8", fontSize: 12 },
              lineStyle: { type: "dashed", color: "#EF4444" },
              data: [
                { yAxis: h.hiLimit, name: "高限" },
                { yAxis: h.loLimit, name: "低限" },
              ],
            }
          : undefined,
    })),
  };
});

/** 建议卡按采纳状态排：没采纳的在上面，演示时"接下来该点哪"不用找 */
const suggestions = computed(() =>
  (view.value?.suggestions ?? []).toSorted((a, b) => (a.acceptedId ? 1 : 0) - (b.acceptedId ? 1 : 0)),
);

/**
 * 当前关注介质的那条总管（表格高亮 + 卡片数字都读它）。
 * 认的是 DTO 上的 `media` 编码而不是中文名——名字表 `nameOf` 一旦写进页面，
 * 「转炉煤气」这四个字就有了第二个出处，EG0001 改称谓这页就悄悄对不上（本域红线）。
 */
const line = computed(
  () => view.value?.lines.find((l) => l.media === (view.value?.sim.media ?? media.value)) ?? view.value?.lines[0],
);

/** 介质下拉**由三根总管自己生成**：选项、编码、名称全来自同一次 `monitor/gas` 响应 */
const mediaOptions = computed(() => (view.value?.lines ?? []).map((l) => ({ code: l.media, name: l.name })));

/** 倒计时的说法：`null` = 柜位不在上涨。这一句是幕 2 的台词，不能显示成"NaN 分钟" */
const countdown = computed(() => {
  const m = view.value?.sim.minutesToHigh;
  if (m === null || m === undefined) return "柜位不在上涨";
  return m <= 0 ? "已触顶" : `${Math.round(m)} 分钟后触顶`;
});
</script>

<template>
  <MonitorShell
    v-model:polling="polling"
    code="EM0002"
    name="煤气系统平衡监控"
    :stamp="view?.stamp ?? ''"
    :alarms="alarms"
    :busy="busy"
    @tick="reload"
    @refresh="peek"
  >
    <template #tools>
      <Select
        v-model="media"
        :options="mediaOptions"
        option-label="name"
        option-value="code"
        class="w-32"
        @change="pickMedia"
      />
      <Button variant="outlined" label="▶模拟吹炼高峰" :disabled="busy" @click="surge" />
      <Button variant="text" severity="secondary" label="■收剧本" :disabled="busy" @click="stopSurge" />
    </template>

    <section :class="[emsPanelClass, 'min-h-0 flex-[5] p-2']">
      <TopoCanvas v-if="view" :view="view.scene" />
      <div v-else class="flex h-full items-center justify-center text-xs text-muted-foreground">煤气管网图加载中…</div>
    </section>

    <div class="flex min-h-0 flex-[4] gap-2">
      <section :class="[emsPanelClass, 'flex min-w-0 flex-[3] flex-col']">
        <div :class="[emsHeaderTextClass, 'shrink-0 px-2.5 py-1.5']">柜位近 1 小时与高低红线</div>
        <EChart :option="holderOption" force-dark class="min-h-0 flex-1" />
      </section>

      <section :class="[emsPanelClass, 'flex min-w-0 flex-[2] flex-col']">
        <div :class="[emsHeaderTextClass, 'shrink-0 px-2.5 py-1.5']">调度建议</div>
        <ul class="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2.5 pb-2">
          <li v-for="s in suggestions" :key="s.id" class="rounded border border-white/10 bg-white/[0.03] px-2 py-1.5">
            <div class="flex items-baseline gap-1.5">
              <span class="text-xs text-muted-foreground">{{ s.rule }}</span>
              <span class="min-w-0 flex-1 truncate text-body text-foreground">{{ s.title }}</span>
            </div>
            <div class="text-xs leading-5 text-muted-foreground">{{ s.detail }}</div>
            <div class="flex items-center gap-2 text-xs tabular-nums">
              <span :class="TONE_TEXT.warn">消纳 {{ s.absorbM3h.toLocaleString("zh-CN") }} m³/h</span>
              <span v-if="s.delayHighMin" :class="TONE_TEXT.ok">延时 {{ s.delayHighMin }}min</span>
              <span class="text-muted-foreground">时滞 {{ s.delayMin }}min</span>
              <Button
                v-if="!s.acceptedId"
                variant="text"
                class="ml-auto"
                label="采纳"
                :disabled="busy"
                @click="accept(s)"
              />
              <span v-else class="ml-auto text-green-500">已转令 {{ s.acceptedId }}</span>
            </div>
          </li>
          <li v-if="!suggestions.length" class="px-1 py-6 text-xs text-muted-foreground">
            柜位没到触顶线之前规则引擎不出建议。点上面的「▶模拟吹炼高峰」，等 30 秒。
          </li>
        </ul>
      </section>
    </div>

    <template #tiles>
      <div class="grid shrink-0 grid-cols-2 gap-2">
        <StatTile
          label="当班放散"
          :value="view?.sim.ventM3h ?? 0"
          unit="m³/h"
          :tone="line?.tone ?? 'ok'"
          :hint="countdown"
        />
        <StatTile
          label="月均放散率"
          :value="view?.ventRatePct ?? 0"
          unit="%"
          :tone="line?.tone ?? 'ok'"
          :hint="`月均放散 ${(view?.ventTotalM3h ?? 0).toLocaleString('zh-CN')} m³/h`"
        />
        <StatTile
          label="关注柜位"
          :value="view?.sim.levelPct ?? 0"
          unit="%"
          :tone="line?.tone ?? 'ok'"
          :hint="`${view?.sim.holderName ?? ''} · 高限 ${view?.sim.hiLimitPct ?? 0}%`"
        />
        <StatTile
          label="柜组净充气"
          :value="view?.sim.netFillM3min ?? 0"
          unit="m³/min"
          :tone="line?.tone ?? 'ok'"
          :hint="`余量 ${(view?.sim.headroomM3 ?? 0).toLocaleString('zh-CN')} m³`"
        />
      </div>

      <section :class="[emsPanelClass, 'shrink-0']">
        <table class="w-full text-body">
          <thead class="text-xs text-muted-foreground">
            <tr>
              <th class="px-2.5 py-1 text-left font-medium">总管</th>
              <th class="px-2.5 py-1 text-right font-medium">发生</th>
              <th class="px-2.5 py-1 text-right font-medium">耗/发电</th>
              <th class="px-2.5 py-1 text-right font-medium">外供</th>
              <th class="px-2.5 py-1 text-right font-medium">放散</th>
              <th class="px-2.5 py-1 text-right font-medium">放散率</th>
              <th class="px-2.5 py-1 text-right font-medium">柜位</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in view?.lines ?? []" :key="l.media" class="border-t border-white/5">
              <td class="px-2.5 py-1">
                <span class="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" :style="{ background: l.color }" />
                <span class="text-foreground">{{ l.name }}</span>
              </td>
              <td class="px-2.5 py-1 text-right tabular-nums text-foreground">
                {{ l.incomeM3h.toLocaleString("zh-CN") }}
              </td>
              <td class="px-2.5 py-1 text-right tabular-nums text-muted-foreground">
                {{ (l.processUseM3h + l.genUseM3h).toLocaleString("zh-CN") }}
              </td>
              <td class="px-2.5 py-1 text-right tabular-nums text-foreground">
                {{ l.exportM3h.toLocaleString("zh-CN") }}
              </td>
              <td class="px-2.5 py-1 text-right tabular-nums" :class="TONE_TEXT[l.tone]">
                {{ l.ventM3h.toLocaleString("zh-CN") }}
              </td>
              <td class="px-2.5 py-1 text-right tabular-nums" :class="TONE_TEXT[l.tone]">{{ l.ventRatePct }}%</td>
              <td class="px-2.5 py-1 text-right tabular-nums" :class="TONE_TEXT[l.tone]">{{ l.levelPct }}%</td>
            </tr>
          </tbody>
        </table>
        <div class="px-2.5 pb-1.5 text-xs text-muted-foreground">
          表中除柜位一列外均为月均口径（与 EP0003 平衡表同源）；上方卡片是当班实时值。
        </div>
      </section>
    </template>
  </MonitorShell>
</template>
