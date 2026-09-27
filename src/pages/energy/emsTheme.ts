/**
 * 能源域深色视觉层：配色常量 + 固定深色容器 class + ECharts 轴通用配置。
 *
 * 来源是规格书 `temp/energy.md` 附录 B 给的一套配色：底色 `#0B1220`、面板 `#111A2C`、
 * 主色科技蓝 `#38BDF8`、正常/节能 `#22C55E`、预警 `#F59E0B`、报警/放散 `#EF4444`。
 * 监控与调度页（EM0001-0007）、大屏（EO0001）是**固定深色**的——调度中心常年不开灯，
 * 而平台外壳允许用户切浅色，两者必须互不干扰。
 *
 * **固定深色怎么实现**：设计 token 与 PrimeVue 变量都挂在 `.dark` 选择器上
 * （`src/lib/primeTheme.ts` 的 `darkModeSelector: ".dark"`），CSS 自定义属性会向下继承。
 * 所以给页面根容器加 `emsDarkClass`（含字面量 `dark`）即可让**整个子树**翻成深色，
 * 不需要、也不允许改用户自己的主题开关。
 *
 * ⚠️ **介质专色不放这里**。介质色（高炉煤气/焦炉煤气/转炉煤气…）是**数据**，
 * 唯一真源是 `src/mock/energy/data/model.ts` 的 `MEDIUMS[code].color`，页面直接消费。
 * 这份文件里再抄一份介质色，就是两处在管同一件事——平衡表图例和监测曲线各画一个颜色，
 * 那种页间矛盾不需要等后端接入就会现场演示给客户看。**这里只放「外壳色」**：
 * 底、面板、主色，以及正常/预警/报警三档语义——它们不随介质变。
 *
 * Tailwind 扫描提示：`src/styles/globals.css` 的 `@source` 覆盖 `.ts`，但扫描是
 * **字面量匹配**——用 `bg-[${EMS_BG}]` 拼字符串不会被编进产物。所以下面的 class 片段
 * 一律写成完整字面量；与上面的常量是「同一颜色的两种写法」，改色要两处一起看。
 */

import type { StatTone } from "@/api/energy/types";

/* ── TS 面（给 ECharts series、内联 style 用）───────────────────────────── */

export const EMS_BG = "#0B1220";
export const EMS_PANEL = "#111A2C";
export const EMS_PRIMARY = "#38BDF8";
export const EMS_OK = "#22C55E";
export const EMS_WARN = "#F59E0B";
export const EMS_BAD = "#EF4444";

/**
 * 深色区的正文/次要文字与网格线。附录 B 只给了六条色，这三条是从主色族
 * （slate 冷灰）里补的**外壳色**——大屏上没有它们的浅色对应物，写死即可；
 * 浅色页要这套配置时用 `emsChartAxis(false)`，两档都在函数里给全。
 */
export const EMS_TEXT = "#CBD5E1";
export const EMS_TEXT_MUTE = "#64748B";
export const EMS_GRID = "rgba(148,163,184,0.16)";

/* ── Tailwind class 片段（给 DOM 面用，必须是字面量）─────────────────────── */

/** 深色区根容器：字面量 `dark` 翻 token 与 PrimeVue 变量，十六进制底色补齐大屏基准色 */
export const emsDarkClass = "dark bg-[#0B1220] text-[#cbd5e1]";

/** 面板：比底色亮一档 + 半透明白描边。深色下层级靠亮度差而不是阴影——投影在深底上根本看不见 */
export const emsPanelClass = "rounded-md border border-white/10 bg-[#111A2C]";

/** 面板标题：字阶取四档里的 text-base，颜色走科技蓝 */
export const emsHeaderTextClass = "text-base font-semibold text-[#38BDF8]";

/** 深色区强调数字（大屏 KPI）：科技蓝 + 等宽数字，切 tabular 是为了刷新时数字不左右抖动 */
export const emsMetricClass = "text-base font-semibold tabular-nums text-[#38BDF8]";

/**
 * 三档语义色的**文字 class**（`StatTone` → class）。监控页每一张数字卡、每一条负载率条都读它。
 *
 * 为什么放这份文件而不是各页各写一个 `Record`：色标的圆角字号只在 `cells.ts` 定义一次是同样的道理——
 * 「预警」在 EM0001 的卡上是琥珀色、在 EM0002 的表格里变成别的颜色，客户不会说这是配色不一致，
 * 他会说**这个系统两个地方显示的同一个状态不一样**。
 * 完整字面量是必须的：Tailwind 扫的是字符串，`text-[${EMS_WARN}]` 拼不出来。
 */
export const TONE_TEXT: Record<StatTone, string> = {
  ok: "text-[#22C55E]",
  warn: "text-[#F59E0B]",
  bad: "text-[#EF4444]",
};

/** 同三档的**底色** class：给进度条、状态条这类要占一块面积的地方用 */
export const TONE_BG: Record<StatTone, string> = {
  ok: "bg-[#22C55E]",
  warn: "bg-[#F59E0B]",
  bad: "bg-[#EF4444]",
};

/* ── 流向七向的**图表**色 ──────────────────────────────────────────────── */

/**
 * 七向 → **hex**（ECharts 只认 hex/rgba，不认 Tailwind class）。
 *
 * 与 `cells.TAG_CLASS` 里那七条**必须同值**——那是列表里的色标、这是图里的填充，
 * 同一个「消耗」在桑基图和平衡表里必须是一个颜色。两边各自维护就会
 * 一个琥珀一个紫，客户问「这两个是同一回事吗」就答不上来。
 * 新增方向时**两处一起改**（这条注释就是给那个未来的人看的）。
 */
export const FLOW_CHART: Record<string, string> = {
  购入: "#38BDF8",
  自产: "#22C55E",
  转换: "#A78BFA",
  消耗: "#F59E0B",
  回收: "#94A3B8",
  损失: "#FB923C",
  外供: "#EF4444",
};

/** 图例用的 `{label, color}`：EO0003 桑基的图例直接照它画，不在页面里再列一遍 */
export const FLOW_LEGEND = (dirs: string[]): Array<{ label: string; color: string }> =>
  dirs.map((d) => ({ label: d, color: FLOW_CHART[d] ?? "#64748B" }));

/* ── ECharts 通用配置 ───────────────────────────────────────────────────── */

/**
 * 坐标轴/网格线/轴文字的通用配置，供各图直接展开到 `xAxis`/`yAxis` 上。
 *
 * `dark` 由**页面**传进来（固定深色页传 `true`；跟随主题的页传
 * `document.documentElement.classList.contains("dark")` 的值），这个函数本身不读 DOM：
 * option 是 computed 产出的，读 DOM 会让主题翻转这件事脱离响应式追踪，
 * 翻转后轴色还是旧的——比不配还难查。`EChart.vue` 负责深色页不重建实例，
 * 轴的**数据侧配色**归这里，两边各管一半、口径都写在自己文件头上。
 */
export function emsChartAxis(dark: boolean) {
  return {
    axisLine: { lineStyle: { color: dark ? "rgba(148,163,184,0.35)" : "rgba(100,116,139,0.45)" } },
    axisLabel: { color: dark ? EMS_TEXT : "#475569", fontSize: 12 },
    splitLine: { lineStyle: { color: dark ? EMS_GRID : "rgba(100,116,139,0.16)" } },
  };
}
