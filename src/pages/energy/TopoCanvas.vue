<script setup lang="ts">
/**
 * 拓扑画布：把 `/ems/monitor/*` 回的 `TopoViewDto` 画成一次系统图（EM0001~0004 左栏 70%）。
 *
 * 几何、数值、柜位、颜色**全部来自 DTO**，这个组件不认识 model、不认识 seed、也没有一个阈值：
 * 图元上的数字是 `store.buildScene()` 按 `node.stat` 从 `model.monitorStats()` 解析好的，
 * 连线颜色是介质专色（真源 `model.MEDIUMS[].color`）解析好的。
 * 在这里写 `v > 90 ? 红 : 绿` 就是给同一个量造第二个真源（AGENTS 与本域红线同一条）。
 *
 * **唯一允许的判色是「拿 DTO 自己的字段比 DTO 自己的字段」**：柜体越限用的是
 * `holder.levelPct` 对 `holder.hiLimit`/`loLimit`，两个数都来自 model，改红线只改一处。
 *
 * 坐标约定（与 seed 一致）：`x/y` 是图元**左上角**，`w/h` 可缺省（母线只给 `w`，它的 `y` 就是那条线），
 * 连线端点取图元**中心**，`via` 是中间拐点。所以母线画在 `y-4 ~ y+4`。
 *
 * SVG 而不是 canvas：图元要跟着 3s 一拍换数字，Vue 直接改文本节点就行，
 * 不必自己管重绘与命中区；一百来个图元的量级 SVG 完全扛得住。
 */
import { computed } from "vue";
import type { StatTone, TopoNodeDto, TopoViewDto } from "@/api/energy/types";
import { isDark } from "@/composables/useAppTheme";
import { EMS_BAD, EMS_OK, EMS_PANEL, EMS_TEXT, EMS_TEXT_MUTE, EMS_WARN } from "./emsTheme";

/**
 * SVG 属性不吃 Tailwind class，跟随主题的两档只能在这里给色值：
 * 深档用附录 B 常量，浅档是同族 slate——`#CBD5E1` 画在白底上是不可读的浅灰。
 * 语义三档（TONE_STROKE）不动：`#22C55E/#F59E0B/#EF4444` 两档底上都够对比。
 */
const textFill = computed(() => (isDark.value ? EMS_TEXT : "#334155"));
const panelFill = computed(() => (isDark.value ? EMS_PANEL : "#F1F5F9"));
/** 负荷类图元的哑光底：深档近透明的白、浅档近透明的黑——两档都是「压一档不抢戏」 */
const loadFill = computed(() => (isDark.value ? "rgba(148,163,184,0.07)" : "rgba(100,116,139,0.08)"));

const props = defineProps<{ view: TopoViewDto }>();

/** 三档语义色，直接取 `emsTheme` 的常量——SVG 的 `stroke` 属性不吃 Tailwind class，只能拿色值 */
const TONE_STROKE: Record<StatTone, string> = { ok: EMS_OK, warn: EMS_WARN, bad: EMS_BAD };

/** 母线厚度：图元没有 `h`，画出来是这条粗线 */
const BUS_H = 9;

const cx = (n: TopoNodeDto) => n.x + (n.w ?? 0) / 2;
const cy = (n: TopoNodeDto) => n.y + (n.h ?? 0) / 2;

const index = computed(() => Object.fromEntries(props.view.nodes.map((n) => [n.id, n])));

/** 折线路径：中心 → 各拐点 → 中心 */
function edgePath(e: TopoViewDto["edges"][number]): string {
  const a = index.value[e.from];
  const b = index.value[e.to];
  if (!a || !b) return "";
  const pts: Array<[number, number]> = [[cx(a), cy(a)], ...(e.via ?? []), [cx(b), cy(b)]];
  return pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
}

/**
 * 柜位填充高度（自底向上）。`h` 缺省的图元不是柜，返回 0 让调用处不画填充。
 */
function holderFill(n: TopoNodeDto) {
  const h = n.h ?? 0;
  const pct = n.holder?.levelPct ?? 0;
  return { h, bar: Math.max(2, (Math.min(100, Math.max(0, pct)) / 100) * (h - 6)), top: n.y + 3 };
}

/** 柜色：拿 DTO 自带的上下限比，不在这里发明阈值 */
function holderTone(n: TopoNodeDto): StatTone {
  const g = n.holder;
  if (!g) return "ok";
  return g.levelPct >= g.hiLimit || g.levelPct <= g.loLimit ? "bad" : "ok";
}

/**
 * 读数格式化：大数取整加千分位（`670833 m³/h` 不需要两位小数），
 * 小数位只在量级本来就小于千时有意义（`0.6 MPa`、`55%`）。
 */
function fmt(v: number) {
  return v.toLocaleString("zh-CN", v >= 1000 ? { maximumFractionDigits: 0 } : { maximumFractionDigits: 2 });
}
</script>

<template>
  <svg :viewBox="view.viewBox" class="h-full w-full" preserveAspectRatio="xMidYMid meet" role="img">
    <!-- 连线在底层：数字压在图元上，线压在被站上没区别 -->
    <g :stroke-opacity="0.75" fill="none">
      <path
        v-for="(e, i) in view.edges"
        :key="`e${i}`"
        :d="edgePath(e)"
        :stroke="e.color ?? EMS_TEXT_MUTE"
        :stroke-dasharray="e.style === 'dash' ? '6 5' : undefined"
        :stroke-width="e.style === 'thick' ? 4 : 1.6"
      />
    </g>

    <g v-for="n in view.nodes" :key="n.id">
      <!-- 母线：一条粗线 + 上方的名字 -->
      <template v-if="n.kind === 'bus'">
        <rect :x="n.x" :y="n.y - BUS_H / 2" :width="n.w ?? 0" :height="BUS_H" :fill="TONE_STROKE[n.tone]" rx="2" />
        <text :x="n.x + 4" :y="n.y - BUS_H / 2 - 6" :fill="textFill" font-size="13">{{ n.label }}</text>
      </template>

      <!-- 柜：柜体 + 自底向上的填充 + 百分比。柜是这三张图上唯一「形状本身在说话」的图元 -->
      <template v-else-if="n.kind === 'holder'">
        <rect :x="n.x" :y="n.y" :width="n.w" :height="n.h" :fill="panelFill" rx="3" />
        <rect
          :x="n.x + 3"
          :y="holderFill(n).top + (holderFill(n).h - 6) - holderFill(n).bar"
          :width="(n.w ?? 0) - 6"
          :height="holderFill(n).bar"
          :fill="TONE_STROKE[holderTone(n)]"
          fill-opacity="0.55"
          rx="2"
        />
        <rect
          :x="n.x"
          :y="n.y"
          :width="n.w"
          :height="n.h"
          fill="none"
          :stroke="TONE_STROKE[holderTone(n)]"
          stroke-width="1.4"
          rx="3"
        />
        <text :x="cx(n)" :y="n.y + 16" :fill="textFill" font-size="12" text-anchor="middle">{{ n.label }}</text>
        <text
          :x="cx(n)"
          :y="n.y + (n.h ?? 0) - 8"
          :fill="TONE_STROKE[holderTone(n)]"
          font-size="13"
          font-weight="600"
          text-anchor="middle"
        >
          {{ n.holder ? `${n.holder.levelPct}%` : (n.value ?? "") }}
        </text>
      </template>

      <!-- 其余四类（box / gen / load / valve）共用一个方框，只有描边粗细与色不同 -->
      <template v-else>
        <rect
          :x="n.x"
          :y="n.y"
          :width="n.w"
          :height="n.h"
          :fill="n.kind === 'load' ? loadFill : panelFill"
          :stroke="n.value === undefined ? EMS_TEXT_MUTE : TONE_STROKE[n.tone]"
          :stroke-width="n.kind === 'valve' ? 1.8 : 1.2"
          rx="4"
        />
        <!-- 放散塔：有放散量就在顶上冒一点，这是全页唯一一个「动了」的东西 -->
        <circle
          v-if="n.kind === 'valve' && (n.value ?? 0) > 0"
          :cx="cx(n)"
          :cy="n.y - 7"
          :r="4"
          :fill="TONE_STROKE[n.tone]"
          fill-opacity="0.7"
        />
        <text
          :x="cx(n)"
          :y="n.y + (n.value === undefined ? 24 : 17)"
          :fill="textFill"
          font-size="12"
          text-anchor="middle"
        >
          {{ n.label }}
        </text>
        <text
          v-if="n.value !== undefined"
          :x="cx(n)"
          :y="n.y + 33"
          :fill="TONE_STROKE[n.tone]"
          font-size="13"
          font-weight="600"
          text-anchor="middle"
        >
          {{ fmt(n.value) }}
          <tspan :fill="EMS_TEXT_MUTE" font-size="11" font-weight="400">{{ n.unit }}</tspan>
        </text>
      </template>
    </g>

    <!-- 空态：DTO 没到货时不留一片纯黑，免得被当成"这个系统没数据" -->
    <text v-if="!view.nodes.length" x="500" y="300" :fill="EMS_TEXT_MUTE" font-size="13" text-anchor="middle">
      画布数据加载中…
    </text>
  </svg>
</template>
