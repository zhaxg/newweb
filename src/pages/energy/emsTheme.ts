/**
 * 能源域视觉层：配色常量 + 面板/标题 class 片段 + ECharts 轴通用配置。
 *
 * 来源是规格书 `temp/energy.md` 附录 B 给的一套配色：底色 `#0B1220`、面板 `#111A2C`、
 * 主色科技蓝 `#38BDF8`、正常/节能 `#22C55E`、预警 `#F59E0B`、报警/放散 `#EF4444`。
 *
 * **除大屏（EO0001）外全部跟随主框架主题**（2026-09 改，此前全域固定深色）：
 * 监控/报表/计划这些页嵌在壳层里，用户切浅色它们必须一起切，否则半亮半暗。
 * DOM 面改走设计 token（`bg-card` / `text-primary` / `text-muted-foreground`），token 挂在
 * `.dark` 选择器上（`src/lib/primeTheme.ts` 的 `darkModeSelector: ".dark"`）自动两档换肤。
 *
 * **固定深色只剩大屏**：调度中心常年不开灯，大屏又是投到电视上的独立介质，
 * 只有它需要 `emsDarkClass`（含字面量 `dark`，让**整个子树**翻成深色，
 * 不动用户自己的主题开关）。新页默认不要用它。
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
 * 深色档的正文/次要文字与网格线（ECharts 数据侧，只给大屏与固定深色区用）。
 * 浅色档不在这里——`emsChartAxis(dark)` 两档都给全，页面用 `isDark.value` 传进来。
 */
export const EMS_TEXT = "#CBD5E1";
export const EMS_TEXT_MUTE = "#64748B";
export const EMS_GRID = "rgba(148,163,184,0.16)";

/* ── Tailwind class 片段（给 DOM 面用，必须是字面量）─────────────────────── */

/** 固定深色区根容器（**仅大屏 EO0001**）：字面量 `dark` 翻 token 与 PrimeVue 变量，十六进制底色补齐大屏基准色 */
export const emsDarkClass = "dark bg-[#0B1220] text-[#cbd5e1]";

/** 面板：token 化，随主框架深浅自动换肤（此前写死 `bg-[#111A2C]`，外壳切浅色时它不跟） */
export const emsPanelClass = "rounded-md border border-border bg-card";

/** 面板标题：字阶取四档里的 text-base，颜色走主色（跟随主题色设置） */
export const emsHeaderTextClass = "text-base font-semibold text-primary";

/** 强调数字（大屏 KPI）：主色 + 等宽数字，切 tabular 是为了刷新时数字不左右抖动 */
export const emsMetricClass = "text-base font-semibold tabular-nums text-primary";

/**
 * 三档语义色的**文字 class**（`StatTone` → class）。监控页每一张数字卡、每一条负载率条都读它。
 *
 * 为什么放这份文件而不是各页各写一个 `Record`：色标的圆角字号只在 `cells.ts` 定义一次是同样的道理——
 * 「预警」在 EM0001 的卡上是琥珀色、在 EM0002 的表格里变成别的颜色，客户不会说这是配色不一致，
 * 他会说**这个系统两个地方显示的同一个状态不一样**。
 * 完整字面量是必须的：Tailwind 扫的是字符串，`text-[${EMS_WARN}]` 拼不出来。
 * 400 档只在深底上够对比度，所以每条都带 `dark:` 保住大屏上的观感。
 */
export const TONE_TEXT: Record<StatTone, string> = {
  ok: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  bad: "text-red-600 dark:text-red-400",
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
 * `dark` 由**页面**传进来：跟随主题的页传 `isDark.value`（`useAppTheme` 的响应式量），
 * 大屏这类固定深色区传 `true`；这个函数本身不读 DOM——option 是 computed 产出的，
 * 读 DOM 会让主题翻转这件事脱离响应式追踪，翻转后轴色还是旧的，比不配还难查。
 * `EChart.vue` 负责实例随主题重建，轴的**数据侧配色**归这里，两边各管一半。
 */
export function emsChartAxis(dark: boolean) {
  return {
    axisLine: { lineStyle: { color: dark ? "rgba(148,163,184,0.35)" : "rgba(100,116,139,0.45)" } },
    axisLabel: { color: dark ? EMS_TEXT : "#475569", fontSize: 12 },
    splitLine: { lineStyle: { color: dark ? EMS_GRID : "rgba(100,116,139,0.16)" } },
  };
}
