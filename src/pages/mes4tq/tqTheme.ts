/**
 * 铁区MES 深色视觉层：配色常量 + 固定深色容器 class + ECharts 轴通用配置。
 *
 * 来源是规格书 `temp/tqmes.md` 附录 B8：**在 energy 域配色基础上增加工艺区域色**。
 * 外壳六色（底 `#0B1220`、面板 `#111A2C`、主色科技蓝 `#38BDF8`、正常 `#22C55E`、
 * 预警 `#F59E0B`、报警 `#EF4444`）与能源域**刻意取同值**——两个域的大屏并排放在
 * 同一个调度中心里，底色差一档就会被当成两套系统。工艺区域色是本域独有的。
 *
 * 实时监控盘（L5：各工序运行参数页）与三张全屏大屏（TD0001-TD0003）是**固定深色**的：
 * 现场操作室常年不开灯，而平台外壳允许用户切浅色，两者必须互不干扰。
 *
 * **固定深色怎么实现**：设计 token 与 PrimeVue 变量都挂在 `.dark` 选择器上
 * （`src/lib/primeTheme.ts` 的 `darkModeSelector: ".dark"`），CSS 自定义属性会向下继承。
 * 所以给页面根容器加 `tqDarkClass`（含字面量 `dark`）即可让**整个子树**翻成深色，
 * 不需要、也不允许改用户自己的主题开关。
 *
 * ⚠️ **工序区域色是「外壳色」不是「数据色」**。它按**工序**固定（烧结永远是蓝、高炉永远是粉），
 * 不随哪条记录变。所以它住在文件里是对的。反过来，**料种色、质量等级色这类随行数据变的色
 * 不许进这里**——那是数据，唯一真源在 `src/mock/mes4tq/data/model.ts`，页面直接读行里的值。
 * 两边各抄一份的结果就是同一批料在料场图和配料表里画两个颜色。
 *
 * Tailwind 扫描提示：`src/styles/globals.css` 的 `@source` 覆盖 `.ts`，但扫描是
 * **字面量匹配**——用 `bg-[${TQ_BG}]` 拼字符串不会被编进产物。所以下面的 class 片段
 * 一律写成完整字面量；与上面的常量是「同一颜色的两种写法」，改色要两处一起看。
 */

/* ── TS 面（给 ECharts series、内联 style 用）───────────────────────────── */

export const TQ_BG = "#0B1220";
export const TQ_PANEL = "#111A2C";
export const TQ_PRIMARY = "#38BDF8";
export const TQ_OK = "#22C55E";
export const TQ_WARN = "#F59E0B";
export const TQ_BAD = "#EF4444";

/**
 * 工艺区域色（B8）。**大屏与工艺流程图里「哪块是哪道工序」的唯一依据**——
 * 三张大屏、工序统计、铁水运行图共用同一份，所以烧结在哪儿都是蓝的。
 *
 * 取色理由：原料绿→焦化(无独立色，并入烧结蓝族)、球团紫、烧结蓝、高炉粉、铁水橙、
 * 皮带灰。相邻工序（烧结→高炉→铁水）色相拉开，缩略图上不糊成一片。
 */
export const TQ_AREA = {
  /** 原料场 / 混匀料场 */
  raw: "#34D399",
  /** 烧结车间 */
  sinter: "#60A5FA",
  /** 球团车间 */
  pellet: "#A78BFA",
  /** 炼铁车间（高炉）/ 铁水 */
  blast: "#F472B6",
  /** 铁水罐（在途 / 运输）——与 blast 同族但更暖，一眼区分「炉子」与「罐子」 */
  ladle: "#FB923C",
  /** 皮带运输 / 转运 */
  belt: "#94A3B8",
  /** 报警闪烁 / 通讯中断 */
  alarm: "#EF4444",
} as const;

/** 工序键 → 区域色；键就是 rescs 里 TW 的工序段名（raw/coke/pellet/sinter/lime/blast） */
export const TQ_AREA_BY_PROCESS: Record<string, string> = {
  raw: TQ_AREA.raw,
  coke: TQ_AREA.sinter,
  pellet: TQ_AREA.pellet,
  sinter: TQ_AREA.sinter,
  lime: TQ_AREA.belt,
  blast: TQ_AREA.blast,
};

/**
 * 深色区的正文/次要文字与网格线。附录 B8 只给了七条色，这三条是从主色族
 * （slate 冷灰）里补的**外壳色**——大屏上没有它们的浅色对应物，写死即可；
 * 浅色页要这套配置时用 `tqChartAxis(false)`，两档都在函数里给全。
 */
export const TQ_TEXT = "#CBD5E1";
export const TQ_TEXT_MUTE = "#64748B";
export const TQ_GRID = "rgba(148,163,184,0.16)";

/* ── Tailwind class 片段（给 DOM 面用，必须是字面量）─────────────────────── */

/** 深色区根容器：字面量 `dark` 翻 token 与 PrimeVue 变量，十六进制底色补齐大屏基准色 */
export const tqDarkClass = "dark bg-[#0B1220] text-[#cbd5e1]";

/** 面板：比底色亮一档 + 半透明白描边。深色下层级靠亮度差而不是阴影——投影在深底上根本看不见 */
export const tqPanelClass = "rounded-md border border-white/10 bg-[#111A2C]";

/** 面板标题：字阶取四档里的 text-base，颜色走科技蓝 */
export const tqHeaderTextClass = "text-base font-semibold text-[#38BDF8]";

/** 深色区强调数字（大屏 KPI）：科技蓝 + 等宽数字，切 tabular 是为了刷新时数字不左右抖动 */
export const tqMetricClass = "text-base font-semibold tabular-nums text-[#38BDF8]";

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
export function tqChartAxis(dark: boolean) {
  return {
    axisLine: { lineStyle: { color: dark ? "rgba(148,163,184,0.35)" : "rgba(100,116,139,0.45)" } },
    axisLabel: { color: dark ? TQ_TEXT : "#475569", fontSize: 12 },
    splitLine: { lineStyle: { color: dark ? TQ_GRID : "rgba(100,116,139,0.16)" } },
  };
}
