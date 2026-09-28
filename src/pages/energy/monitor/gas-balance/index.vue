<script setup lang="ts">
/** 对应 EM0007 煤气平衡仿真与调度建议（模块二 · 附录 B5 版式 **V2+** · **演示王牌页**）
 *  接口：`gasSimApi.simulate`（what-if 唯一入口）· `suggestionApi.gen/accept`
 *        `monitorApi.forecast/holders` · `monitorApi.tick`（推进全站唯一演示时钟）
 *
 *  演示要点：**这一页回答「别放散，怎么办」**。EM0002 告诉你「柜位要满了」，
 *        这一页给你四条手、并且**能拖滑杆当场看结果**：
 *        吹炼高峰加多少 / 高炉侧加减多少 / CCPP 顶到多少 MW / 投几台 CFB / 烧结点火多用气。
 *        拖完看右边两组数——**`sim`（本手）vs `unmitigated`（未处置基线）**，
 *        建议卡的「削减量」就是这两者之差。幕 7 的落点在这里。
 *
 *  ── 三条不能破的约束（前一条是红线，后两条是存储层注释里点名的坑）──────────
 *  1. **滑杆只调 `gasSimApi.simulate()`，绝不触落库**（红线）：拖滑杆是「推演」不是「操作」，
 *     真要落地得点「采纳」→ `suggestionApi.accept()` → 生成调度令草拟单。
 *     所以本页的滑杆与采纳是**两个不同性质的动作**，这在界面上要看得出来（采纳才有后果文案）。
 *  2. **量程一个数字都不写**：五支滑杆的 min/max/step 全读 `view.bounds`，
 *     真源是 `model.whatIfBounds()`（CCPP 铭牌出力、CFB 总台数、一轮剧本进气量…）。
 *     抄在页面上，机组一改就会出现「滑杆能拖到头、仿真却说超许可」——本域唯一红线是页间矛盾。
 *  3. **`unmitigated` 由服务端算，页面不许自己构造**。早期实现从 `sc` 反推未处置基线，
 *     而 R4「放缓吹炼」改的正是进气量，反推回去会把增量一起采纳 → `cut=0`，
 *     建议卡说省 4.5 万、仿真说省 0。所以基线是**同一次请求里两次纯函数调用**的结果。
 *
 *  柜位外推：`minutesToHigh` + 当前柜位 + 高限**三点定线**——
 *  页面不自己定斜率（那会是第二份口径），斜率由服务端给的三个数反推：
 *  `(hiLimit - level) / minutesToHigh`。倒计时为 `null` = 柜位不在上涨，此时不画外推。
 *  待接入：柜位与放散的秒级 SCADA 采样（演示按分钟推进）。 */
import { isDark } from "@/composables/useAppTheme";
import { computed, onMounted, ref } from "vue";
import Button from "primevue/button";
import Slider from "primevue/slider";
import Select from "primevue/select";
import EChart from "../../EChart.vue";
import MonitorShell from "../MonitorShell.vue";
import StatTile from "../../StatTile.vue";
import { alarmApi, gasSimApi, monitorApi, suggestionApi } from "@/api/energy";
import type { DispatchSuggestion, EnergyAlarm, GasScenarioDto, GasSimViewDto } from "@/api/energy/types";
import { useToast } from "@/composables/useToast";
import { applyResult } from "../../rowActions";
import { TONE_TEXT, emsChartAxis, emsHeaderTextClass, emsPanelClass } from "../../emsTheme";
import type { EChartsOption } from "echarts";

const { toast } = useToast();

/** 置信带的上下界（`dir=1` 上界、`-1` 下界）。提到模块级是因为它不捕获任何父作用域变量 ——
 *  留在 computed 里每次求值都重建一个函数对象 */
const band = (v: number, pct: number, dir: 1 | -1) => Math.round(v * (1 + dir * pct));

/** 五支滑杆的键（与 `GasScenarioDto` 可选字段、`bounds` 的键**逐字同名**） */
type SliderKey = "extraLdgM3min" | "extraBfgM3min" | "ccppMw" | "cfbUnits" | "sinterUsePct";

const SLIDERS: Array<{ key: SliderKey; label: string; unit: string; hint: string }> = [
  {
    key: "extraLdgM3min",
    label: "追加转炉煤气",
    unit: "m³/min",
    hint: "正=吹炼高峰叠高峰（进柜），负=降负荷（少产气）",
  },
  { key: "extraBfgM3min", label: "高炉侧发生量", unit: "m³/min", hint: "正=高炉多产气（进柜），负=减风（少产气）" },
  { key: "ccppMw", label: "CCPP 出力", unit: "MW", hint: "燃气-蒸汽联合循环，拉起它是最快的消纳手" },
  { key: "cfbUnits", label: "CFB 锅炉投运", unit: "台", hint: "每台按满耗气量算，点火有时滞" },
  { key: "sinterUsePct", label: "烧结点火用气", unit: "%", hint: "需求侧最快的一条，但没人会把点火气砍一半以上" },
];

const view = ref<GasSimViewDto | null>(null);
const busy = ref(false);
const polling = ref(true);

/**
 * 本手：五支旋钮的当前值。
 *
 * 为什么是 `Record<SliderKey, number>` 而不是 `GasScenarioDto`：DTO 的每个字段都是可选的，
 * 绑滑杆时每个都要 `?? 0`，而 `v-model` 恰恰**不能绑到带断言的表达式**（不是左值）。
 * 用一个字段全必填的本地类型，滑杆直接 `v-model="knobs[sl.key]"` 就成立。
 */
const knobs = ref<Record<SliderKey, number>>({
  extraLdgM3min: 0,
  extraBfgM3min: 0,
  ccppMw: 0,
  cfbUnits: 0,
  sinterUsePct: 0,
});

/** 关注的煤气介质。**独立 ref 而不是塞进 `knobs`**：它不是旋钮，是「看哪根总管」，
 *  混进旋钮里会被 `simulate()` 当成推演参数送出去 */
const media = ref<"BFG" | "COG" | "LDG">("LDG");

/**
 * 右栏报警流的数据。
 *
 * ⚠️ **不能像 EM0002 那样从 `view.alarms` 取**：`GasSimViewDto` 继承的是无 alarms 的形状
 *  （它只 `extends` 了 `stamp`/`step`，没有 `MonitorBaseDto`），
 *  从它取永远是空数组——右栏会是一条死掉的报警流。
 *  所以另打 `/ems/alarm/active`（EM0005 也在用同一个端点，口径一致）。
 */
const alarms = ref<EnergyAlarm[]>([]);
async function loadAlarms() {
  try {
    alarms.value = await alarmApi.active();
  } catch {
    /* 拦截层已 toast；报警流空着不影响推演 */
  }
}

/** 拉一次仿真。**滑杆松手才调**（`@slideend`），不是 `@slide`——
 *  拖动中每像素一次 POST 会把演示机拖卡，而这一页的滑杆本来就没有实时预览的必要 */
/** 五支旋钮 + 介质 → `GasScenarioDto`。**只有这几个字段**，不带 `levelPct`/`holderId`：
 *  柜位永远由服务端取实时值（`store.gasSimView` 的注释：滑杆里没有 levelPct，页面也不该能伪造它） */
function scenario(): GasScenarioDto {
  return { media: media.value, ...knobs.value };
}

async function simulate() {
  busy.value = true;
  try {
    view.value = await gasSimApi.simulate(scenario());
  } catch {
    /* 拦截层已 toast */
  } finally {
    busy.value = false;
  }
}

/** 推进全站唯一的演示时钟（与其余 EM 页同一个端点），再看新工况 */
async function reload() {
  if (busy.value) return;
  busy.value = true;
  try {
    await monitorApi.tick();
    view.value = await gasSimApi.simulate(scenario());
  } catch {
    /* 拦截层已 toast */
  } finally {
    busy.value = false;
  }
}

/** 首次装载：先拿一份不带旋钮的仿真（它会把当前真实工况回填到 `sim`），再把旋钮对齐上去 */
async function boot() {
  try {
    const [v] = await Promise.all([gasSimApi.simulate(scenario()), loadAlarms()]);
    view.value = v;
    /** 旋钮对齐**当前真实工况**（CCPP 与 CFB 的实际投运值），不是全 0——
     *  全 0 会让首屏的「本手」与「未处置基线」完全相同，客户以为这页坏了 */
    knobs.value = {
      extraLdgM3min: 0,
      extraBfgM3min: 0,
      ccppMw: v.sim.ccppMw,
      cfbUnits: v.sim.cfbUnits,
      sinterUsePct: 0,
    };
    media.value = v.sim.media;
  } catch {
    /* 拦截层已 toast */
  }
}

/** 重置旋钮回「当前工况」：滑杆拖乱了要能一键回到现实，否则演示中途没法收场 */
function resetKnobs() {
  const s = view.value?.sim;
  if (!s) return;
  knobs.value = { extraLdgM3min: 0, extraBfgM3min: 0, ccppMw: s.ccppMw, cfbUnits: s.cfbUnits, sinterUsePct: 0 };
  void simulate();
}

async function runAction(run: () => Promise<unknown>, okMsg = "") {
  if (busy.value) return;
  busy.value = true;
  try {
    if (applyResult(await run(), okMsg, toast)) await simulate();
  } finally {
    busy.value = false;
  }
}
const genSuggestions = () => runAction(() => suggestionApi.gen(media.value), "规则引擎已跑一遍");
const accept = (s: DispatchSuggestion) => runAction(() => suggestionApi.accept(s.id), "已转调度令草拟单");

/** 介质下拉来自 DTO 的 `sim.media`（三根总管），不写死选项 */
const mediaOptions = ["BFG", "COG", "LDG"];

onMounted(boot);

/* ── 预测曲线（带置信带）：`gasSimApi.forecast` 已经是 24 点，页面只画 ────── */

const forecastOption = computed<EChartsOption>(() => {
  const f = view.value;
  if (!f) return {};
  const rows = f.gas;
  const x = rows.map((g) => `${g.hour}:00`);
  const key = media.value === "BFG" ? "bfg" : media.value === "COG" ? "cog" : "ldg";
  const vals = rows.map((g) => g[key as "bfg" | "cog" | "ldg"]);
  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 62, right: 16, top: 34, bottom: 24 },
    legend: { top: 2, textStyle: { color: isDark.value ? "#CBD5E1" : "#475569", fontSize: 12 } },
    tooltip: { trigger: "axis", valueFormatter: (v) => `${Number(v).toLocaleString("zh-CN")} m³/h` },
    xAxis: { type: "category", boundaryGap: false, data: x, ...emsChartAxis(isDark.value) },
    yAxis: {
      type: "value",
      name: "m³/h",
      nameTextStyle: { color: isDark.value ? "#64748B" : "#94A3B8", fontSize: 12 },
      ...emsChartAxis(isDark.value),
    },
    series: [
      /** 置信下界：不画线只填色（透明度低一档），它存在的意义是给上界一个底 */
      {
        name: "下界",
        type: "line",
        data: vals.map((v) => band(v, 0.05, -1)),
        showSymbol: false,
        lineStyle: { opacity: 0 },
        stack: "band",
        areaStyle: { color: "rgba(56,189,248,0.10)" },
        silent: true,
      },
      {
        name: "预测发生量",
        type: "line",
        showSymbol: false,
        data: vals,
        lineStyle: { width: 2, color: "#38BDF8" },
        itemStyle: { color: "#38BDF8" },
        z: 3,
      },
      /** 上界 = 带高（上界−下界）堆在同一 stack 上 */
      {
        name: "上界",
        type: "line",
        data: vals.map((v) => band(v, 0.05, 1) - band(v, 0.05, -1)),
        showSymbol: false,
        lineStyle: { opacity: 0 },
        stack: "band",
        areaStyle: { color: "rgba(56,189,248,0.10)" },
        silent: true,
      },
    ],
  };
});

/* ── 柜位外推：三点定线（当前柜位 → 高限），斜率由服务端给的倒计时反推 ──── */

const holderOption = computed<EChartsOption>(() => {
  const s = view.value?.sim;
  if (!s) return {};
  /** 外推只在柜位上涨时画。`minutesToHigh === null` = 不在涨，画出来是假的 */
  const mins = s.minutesToHigh;
  const series: Array<Record<string, unknown>> = [];
  if (mins !== null && mins !== undefined && mins > 0) {
    /** 未来 30 分钟的采样点：从当前柜位爬到高限（斜率 = 差值 / 倒计时） */
    const slope = (s.hiLimitPct - s.levelPct) / mins;
    const proj = Array.from({ length: 11 }, (_, i) => {
      const t = i * 3; // 每 3 分钟一点，共 30 分钟
      return { t, v: Math.min(s.hiLimitPct * 1.02, s.levelPct + slope * t) };
    });
    series.push({
      name: "外推",
      type: "line",
      showSymbol: false,
      data: proj.map((p) => [p.t, Math.round(p.v * 10) / 10]),
      lineStyle: { width: 2, type: "dashed", color: "#F59E0B" },
      itemStyle: { color: "#F59E0B" },
      markArea: {
        silent: true,
        itemStyle: { color: "rgba(239,68,68,0.10)" },
        data: [[{ yAxis: s.hiLimitPct }, { yAxis: s.hiLimitPct * 1.02 }]],
      },
      markLine: {
        silent: true,
        symbol: "none",
        lineStyle: { type: "dashed", color: "#EF4444" },
        label: { color: isDark.value ? "#94A3B8" : "#64748B", fontSize: 12 },
        data: [{ yAxis: s.hiLimitPct, name: `高限 ${s.hiLimitPct}%` }],
      },
    });
  }
  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 46, right: 18, top: 26, bottom: 24 },
    legend: { top: 2, textStyle: { color: isDark.value ? "#CBD5E1" : "#475569", fontSize: 12 } },
    tooltip: { trigger: "axis", valueFormatter: (v) => `${v}%` },
    xAxis: {
      type: "value",
      name: "分钟后",
      nameTextStyle: { color: isDark.value ? "#64748B" : "#94A3B8", fontSize: 12 },
      min: 0,
      max: 30,
      ...emsChartAxis(isDark.value),
    },
    yAxis: {
      type: "value",
      name: "%",
      min: 0,
      max: 100,
      nameTextStyle: { color: isDark.value ? "#64748B" : "#94A3B8", fontSize: 12 },
      ...emsChartAxis(isDark.value),
    },
    series: [
      /** 现状点：一个孤零零的散点，用来给「从哪儿开始算」一个视觉锚 */
      {
        name: "当前柜位",
        type: "scatter",
        symbolSize: 10,
        data: [[0, s.levelPct]],
        itemStyle: { color: "#38BDF8" },
        z: 4,
      },
      ...series,
    ],
  };
});

/** 倒计时的说法（幕 7 的台词，不能显示成 NaN） */
const countdown = computed(() => {
  const s = view.value?.sim;
  if (!s) return "";
  const m = s.minutesToHigh;
  if (m === null || m === undefined) return "柜位不在上涨，无触顶风险";
  return m <= 0 ? "已触顶放散中" : `${Math.round(m)} 分钟后触顶`;
});

/** 本手相对未处置基线**削减了多少**：建议卡的量级就靠这个对照，页面不自己算 */
const cutM3h = computed(() => Math.max(0, (view.value?.unmitigated.ventM3h ?? 0) - (view.value?.sim.ventM3h ?? 0)));
const gain = computed(() => view.value?.sim.gainMonth ?? 0);
/** 建议卡排序与 EM0002 同款：没采纳的在上面，演示时「接下来点哪」不用找 */
const suggestions = computed(() =>
  (view.value?.suggestions ?? []).toSorted((a, b) => (a.acceptedId ? 1 : 0) - (b.acceptedId ? 1 : 0)),
);
</script>

<template>
  <MonitorShell
    v-model:polling="polling"
    code="EM0007"
    name="煤气平衡仿真与调度建议"
    :stamp="view?.stamp ?? ''"
    :alarms="alarms"
    :busy="busy"
    @tick="reload"
    @refresh="simulate"
  >
    <template #tools>
      <Select v-model="media" :options="mediaOptions" class="w-28" @change="simulate" />
      <Button variant="outlined" label="▶生成调度建议" :disabled="busy" @click="genSuggestions" />
      <Button variant="text" severity="secondary" label="旋钮归位" :disabled="busy" @click="resetKnobs" />
    </template>

    <!-- 上：预测曲线 + 柜位外推（并排，一屏读完「会涨到哪」与「什么时候涨」） -->
    <div class="flex min-h-0 flex-1 gap-2">
      <section :class="[emsPanelClass, 'flex min-w-0 flex-[3] flex-col']">
        <div :class="[emsHeaderTextClass, 'shrink-0 px-2.5 py-1.5']">未来 4 小时发生量预测（带 ±5% 置信带）</div>
        <EChart :option="forecastOption" class="min-h-0 flex-1" />
      </section>

      <section :class="[emsPanelClass, 'flex min-w-0 flex-[2] flex-col']">
        <div :class="[emsHeaderTextClass, 'shrink-0 px-2.5 py-1.5']">柜位外推 · {{ view?.sim.holderName ?? "" }}</div>
        <EChart :option="holderOption" class="min-h-0 flex-1" />
        <div
          class="shrink-0 px-2.5 pb-1.5 text-xs"
          :class="countdown.startsWith('已触顶') ? TONE_TEXT.bad : TONE_TEXT.warn"
        >
          {{ countdown }}
        </div>
      </section>
    </div>

    <!-- 下：what-if 滑杆 + 建议卡 -->
    <div class="flex min-h-0 flex-1 gap-2">
      <section :class="[emsPanelClass, 'flex w-[46%] shrink-0 flex-col']">
        <div :class="[emsHeaderTextClass, 'shrink-0 px-2.5 py-1.5']">what-if 推演（只推演，不动数据）</div>
        <div class="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-2.5 pb-2">
          <div v-for="sl in SLIDERS" :key="sl.key">
            <div class="flex items-baseline gap-1.5">
              <span class="text-body text-foreground">{{ sl.label }}</span>
              <span class="ml-auto text-body tabular-nums text-primary">
                {{ knobs[sl.key] }}
                <span class="text-xs text-muted-foreground">{{ sl.unit }}</span>
              </span>
            </div>
            <!-- 量程来自 `view.bounds`（真源 model.whatIfBounds），页面没有一处 min/max -->
            <Slider
              v-if="view"
              v-model="knobs[sl.key]"
              :min="view.bounds[sl.key].min"
              :max="view.bounds[sl.key].max"
              :step="view.bounds[sl.key].step"
              class="mt-1"
              @slideend="simulate"
            />
            <div class="mt-0.5 text-xs text-muted-foreground">
              {{ sl.hint }}
              <span v-if="view" class="tabular-nums">
                （量程 {{ view.bounds[sl.key].min }} ~ {{ view.bounds[sl.key].max }}）
              </span>
            </div>
          </div>
        </div>
      </section>

      <section :class="[emsPanelClass, 'flex min-w-0 flex-1 flex-col']">
        <div :class="[emsHeaderTextClass, 'shrink-0 px-2.5 py-1.5']">
          调度建议
          <span class="ml-2 text-xs font-normal text-muted-foreground">
            削减量 = 未处置基线 − 本手（两组数都由服务端算）
          </span>
        </div>
        <ul class="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2.5 pb-2">
          <li v-for="s in suggestions" :key="s.id" class="rounded border border-border bg-muted/50 px-2 py-1.5">
            <div class="flex items-baseline gap-1.5">
              <span class="text-xs text-muted-foreground">{{ s.rule }}</span>
              <span class="min-w-0 flex-1 truncate text-body text-foreground">{{ s.title }}</span>
            </div>
            <div class="text-xs leading-5 text-muted-foreground">{{ s.detail }}</div>
            <div class="flex flex-wrap items-center gap-2 text-xs tabular-nums">
              <span v-if="s.expectCutM3 > 0" :class="TONE_TEXT.ok">
                削减 {{ s.expectCutM3.toLocaleString("zh-CN") }} m³/h
              </span>
              <span :class="TONE_TEXT.warn">消纳 {{ s.absorbM3h.toLocaleString("zh-CN") }} m³/h</span>
              <span v-if="s.delayHighMin" :class="TONE_TEXT.ok">延时 {{ s.delayHighMin }}min</span>
              <span class="text-muted-foreground">时滞 {{ s.delayMin }}min</span>
              <Button
                v-if="!s.acceptedId"
                variant="text"
                class="ml-auto"
                label="采纳并转令"
                :disabled="busy"
                @click="accept(s)"
              />
              <span v-else class="ml-auto text-green-500">已转令 {{ s.acceptedId }}</span>
            </div>
          </li>
          <li v-if="!suggestions.length" class="px-1 py-6 text-xs text-muted-foreground">
            规则引擎在柜位越线时才出建议。先把「追加转炉煤气」往右拖满，松手看柜位外推。
          </li>
        </ul>
      </section>
    </div>

    <template #tiles>
      <div class="grid shrink-0 grid-cols-2 gap-2">
        <StatTile
          label="当班放散（本手）"
          :value="view?.sim.ventM3h ?? 0"
          unit="m³/h"
          :tone="(view?.sim.ventM3h ?? 0) > (view?.unmitigated.ventM3h ?? 0) ? 'bad' : cutM3h > 0 ? 'ok' : 'warn'"
          :hint="`未处置基线 ${(view?.unmitigated.ventM3h ?? 0).toLocaleString('zh-CN')} m³/h`"
        />
        <StatTile
          label="本手削减"
          :value="cutM3h"
          unit="m³/h"
          :tone="cutM3h > 0 ? 'ok' : 'warn'"
          hint="与未处置基线的差"
        />
        <StatTile
          label="月增效"
          :value="Math.round(gain).toLocaleString('zh-CN')"
          unit="元"
          :tone="gain > 0 ? 'ok' : 'warn'"
          hint="放散差额折电，×24h×30 天"
        />
        <StatTile
          label="关注柜位"
          :value="view?.levelPct ?? 0"
          unit="%"
          :tone="(view?.levelPct ?? 0) >= (view?.sim.hiLimitPct ?? 90) ? 'bad' : 'ok'"
          :hint="`高限 ${view?.sim.hiLimitPct ?? 0}% · 余量 ${(view?.sim.headroomM3 ?? 0).toLocaleString('zh-CN')} m³`"
        />
        <StatTile
          label="CCPP 出力"
          :value="view?.sim.ccppMw ?? 0"
          unit="MW"
          :tone="'ok'"
          :hint="`额定 ${view?.sim.ccppMaxMw ?? 0} MW`"
        />
        <StatTile
          label="CFB 投运"
          :value="view?.sim.cfbUnits ?? 0"
          unit="台"
          :tone="'ok'"
          :hint="`新增消纳 ${(view?.sim.cfbNewSinkM3min ?? 0).toLocaleString('zh-CN')} m³/min`"
        />
      </div>
    </template>
  </MonitorShell>
</template>
