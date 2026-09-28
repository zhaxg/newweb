import type { HmxRes } from "@/api/admin/types";

/**
 * 钢铁能源管理（EMS）演示系统 → 资源种子表。
 *
 * 路径约定：路由 = `/energy/<模块>/<页面>`，页面目录 = `src/pages/energy/<模块>/<页面>/index.vue`，
 * 页面段不含 "energy"。pageId 由祖先 `cResPath` 链拼出（如 `energy/monitor/gas`），全局唯一。
 *
 * 编码 `E + 模块助记字母 + 4 位序号`（O=Overview 总览、M=Monitor 监控与调度、C=Collect 采集、
 * P=Plan 计划与考核、R=Report 报表、G=General 基础配置）。**一次性颁发、永不复用变更**，
 * 菜单排序与编码解耦（靠 `cOrder`）。label 规则 = `cCode ? cCode-cTitle : cTitle`，
 * 所以侧栏只有叶子显示「EM0002-煤气系统平衡监控」，分组层级保持纯名称。
 *
 * 三条平台约束（照做即可，别再探）：
 * - **叶子 `cResPath` 必须单段**（`router/core/fromMenu.ts` 的 `segmentOf` 只取 pageId 末段当路由）。
 * - **`cResSubPath` 指向不存在的 .vue 是运行期静默回落占位页**，不是编译错误——
 *   所以本表**一次铺全 29 个叶子**，页面按阶段补，dev 下菜单当场可见、缺页显示占位而不是空白。
 * - **首页叶子留在域根外面**（`dynamicRoutes.withHomeOwnership` 认一级叶子 pageId `home`）。
 *
 * cIcon 全部取自 `src/lib/tablerIcons.ts` 的白名单；本域新增的五个
 * （`Gauge`/`CloudDataConnection`/`Sitemap`/`Scale`/`WaveSine`）已同步进那条 glob。
 *
 * ⚠️ 本表与设备域/碳资产域的 rescs **刻意同形不同源**：三个域各写一份，形状一致是为了
 * 让「换一个域看还是同一套平台行为」，而不是为了共享代码。
 */

const STAMP = "2026-09-27 09:00:00";

let seq = 0;

function row(part: Partial<HmxRes>): HmxRes {
  seq += 1;
  return {
    selected: false,
    id: part.id ?? `ems-${seq}`,
    cPid: "",
    cCode: "",
    cName: "",
    cTitle: "",
    cNsCode: "TDWEB",
    rowVersion: 0,
    cOrder: "999",
    cResPath: "",
    cResSubPath: "",
    cQueryString: "",
    cEnable: "1",
    cResType: 2,
    cIcon: "",
    creator: "system",
    createTime: STAMP,
    lastModifier: "system",
    lastModifyTime: STAMP,
    ...part,
  };
}

function folder(id: string, pid: string, order: string, name: string, path: string, icon: string): HmxRes {
  return row({ id, cPid: pid, cOrder: order, cName: name, cTitle: name, cResPath: path, cIcon: icon });
}

/** 叶子：path = cResPath（单段），sub = 相对 src/pages 的 vue 路径 */
function leaf(
  id: string,
  pid: string,
  order: string,
  code: string,
  name: string,
  path: string,
  sub: string,
  icon: string,
  query = "",
): HmxRes {
  return row({
    id,
    cPid: pid,
    cOrder: order,
    cCode: code,
    cName: name,
    cTitle: name,
    cResPath: path,
    cResSubPath: sub,
    cIcon: icon,
    cQueryString: query,
  });
}

/** 六个模块分组，顺序即侧栏顺序：总览 → 监控调度 → 采集 → 计划考核 → 报表 → 配置 */
const M = {
  OVERVIEW: "ems-m-overview",
  MONITOR: "ems-m-monitor",
  COLLECT: "ems-m-collect",
  PLAN: "ems-m-plan",
  REPORT: "ems-m-report",
  CONFIG: "ems-m-config",
} as const;

export const energyRescs: HmxRes[] = [
  /* 首页（一级叶子；id 与设备域错开纯粹是为了在 devtools 里一眼看出是哪套菜单） */
  leaf("2100", "", "000", "", "首页", "home", "/energy/home/index.vue", "Home"),

  /* ── 域根 ─────────────────────────────────────────────────────────── */
  folder("energy-root", "", "001", "能源管理", "energy", "Flame"),

  /* ── EO 总览：销售讲演的开场与收尾（大屏是第 8 幕的落点） ────────────── */
  folder(M.OVERVIEW, "energy-root", "001", "能源总览", "overview", "LayoutDashboard"),
  leaf(
    "ems-eo-1",
    M.OVERVIEW,
    "001",
    "EO0001",
    "能源管控大屏",
    "screen",
    "/energy/overview/screen/index.vue",
    "DeviceTv",
    "blank",
  ),
  leaf("ems-eo-2", M.OVERVIEW, "002", "EO0002", "关键指标看板", "kpi", "/energy/overview/kpi/index.vue", "ChartBar"),
  leaf(
    "ems-eo-3",
    M.OVERVIEW,
    "003",
    "EO0003",
    "能流桑基图",
    "sankey",
    "/energy/overview/sankey/index.vue",
    "ArrowsJoin2",
  ),

  /* ── EM 监控与调度：本域的价值核心，8 幕剧本的主舞台 ─────────────────── */
  folder(M.MONITOR, "energy-root", "002", "监控与调度", "monitor", "Activity"),
  leaf("ems-em-1", M.MONITOR, "001", "EM0001", "供配电监控", "power", "/energy/monitor/power/index.vue", "Bolt"),
  leaf("ems-em-2", M.MONITOR, "002", "EM0002", "煤气系统平衡监控", "gas", "/energy/monitor/gas/index.vue", "Gauge"),
  leaf(
    "ems-em-3",
    M.MONITOR,
    "003",
    "EM0003",
    "蒸汽与水监控",
    "steam-water",
    "/energy/monitor/steam-water/index.vue",
    "Droplet",
  ),
  leaf(
    "ems-em-4",
    M.MONITOR,
    "004",
    "EM0004",
    "氧氮氩介质监控",
    "gas-plant",
    "/energy/monitor/gas-plant/index.vue",
    "Wind",
  ),
  leaf("ems-em-5", M.MONITOR, "005", "EM0005", "能源报警中心", "alarm", "/energy/monitor/alarm/index.vue", "Bell"),
  leaf(
    "ems-em-6",
    M.MONITOR,
    "006",
    "EM0006",
    "调度令管理",
    "dispatch",
    "/energy/monitor/dispatch/index.vue",
    "ClipboardList",
  ),
  leaf(
    "ems-em-7",
    M.MONITOR,
    "007",
    "EM0007",
    "煤气平衡预测仿真",
    "gas-balance",
    "/energy/monitor/gas-balance/index.vue",
    "ChartLine",
  ),

  /* ── EC 采集与质量：数据从哪来、可信不可信（客户第一个追问的地方） ────── */
  folder(M.COLLECT, "energy-root", "003", "采集与质量", "collect", "CloudDataConnection"),
  leaf(
    "ems-ec-1",
    M.COLLECT,
    "001",
    "EC0001",
    "计量网络配置",
    "network",
    "/energy/collect/network/index.vue",
    "Sitemap",
  ),
  leaf(
    "ems-ec-2",
    M.COLLECT,
    "002",
    "EC0002",
    "采集通道管理",
    "channel",
    "/energy/collect/channel/index.vue",
    "Exchange",
  ),
  leaf(
    "ems-ec-3",
    M.COLLECT,
    "003",
    "EC0003",
    "数据质量与补录",
    "quality",
    "/energy/collect/quality/index.vue",
    "CircleCheck",
  ),
  leaf(
    "ems-ec-4",
    M.COLLECT,
    "004",
    "EC0004",
    "计量仪表台账",
    "instrument",
    "/energy/collect/instrument/index.vue",
    "Ruler",
  ),
  leaf(
    "ems-ec-5",
    M.COLLECT,
    "005",
    "EC0005",
    "实时与历史数据",
    "realtime",
    "/energy/collect/realtime/index.vue",
    "History",
  ),

  /* ── EP 计划·定额·结算：管理闭环，「执行平衡分摊 / 生成结算 / 考核打分」都在这 ── */
  folder(M.PLAN, "energy-root", "004", "计划与考核", "plan", "CalendarStats"),
  leaf(
    "ems-ep-1",
    M.PLAN,
    "001",
    "EP0001",
    "能耗定额与计划",
    "quota-plan",
    "/energy/plan/quota-plan/index.vue",
    "Calculator",
  ),
  leaf("ems-ep-2", M.PLAN, "002", "EP0002", "能源实绩管理", "actual", "/energy/plan/actual/index.vue", "Database"),
  leaf("ems-ep-3", M.PLAN, "003", "EP0003", "能源平衡表", "balance", "/energy/plan/balance/index.vue", "Scale"),
  leaf("ems-ep-4", M.PLAN, "004", "EP0004", "成本与结算", "settlement", "/energy/plan/settlement/index.vue", "Wallet"),
  leaf("ems-ep-5", M.PLAN, "005", "EP0005", "考核与对标", "assess", "/energy/plan/assess/index.vue", "TargetArrow"),
  leaf("ems-ep-6", M.PLAN, "006", "EP0006", "重点设备能效", "key-equip", "/energy/plan/key-equip/index.vue", "Tool"),

  /* ── ER 统计与分析：把前三块的数讲成结论 ───────────────────────────── */
  folder(M.REPORT, "energy-root", "005", "统计与报表", "report", "ReportAnalytics"),
  leaf(
    "ems-er-1",
    M.REPORT,
    "001",
    "ER0001",
    "能耗统计",
    "energy-stat",
    "/energy/report/energy-stat/index.vue",
    "ChartPie",
  ),
  leaf(
    "ems-er-2",
    M.REPORT,
    "002",
    "ER0002",
    "能效分析",
    "efficiency",
    "/energy/report/efficiency/index.vue",
    "TrendingDown",
  ),
  leaf(
    "ems-er-3",
    M.REPORT,
    "003",
    "ER0003",
    "负荷与煤气预测",
    "forecast",
    "/energy/report/forecast/index.vue",
    "WaveSine",
  ),
  leaf("ems-er-4", M.REPORT, "004", "ER0004", "自定义报表", "custom", "/energy/report/custom/index.vue", "FileText"),

  /* ── EG 基础配置：一屏一个口径源头，讲解时用来回答「这数哪来的」 ─────── */
  folder(M.CONFIG, "energy-root", "006", "基础配置", "config", "Settings"),
  leaf("ems-eg-1", M.CONFIG, "001", "EG0001", "介质与折标系数", "medium", "/energy/config/medium/index.vue", "Flask"),
  leaf(
    "ems-eg-2",
    M.CONFIG,
    "002",
    "EG0002",
    "用能单元与成本中心",
    "unit",
    "/energy/config/unit/index.vue",
    "BuildingFactory",
  ),
  leaf(
    "ems-eg-3",
    M.CONFIG,
    "003",
    "EG0003",
    "报警规则与电价",
    "alarm-price",
    "/energy/config/alarm-price/index.vue",
    "Coins",
  ),
];

/** 叶子数（不含域根与分组）：29 = 28 功能页 + 首页，规格书附录 B 的口径 */
const LEAF_COUNT = 29;

/** 装配期自检：菜单形状写错不会编译报错，只会在页面上少一项或多一项（demo 现场才发现） */
if (import.meta.env?.DEV) {
  const bad: string[] = [];
  const ids = energyRescs.map((r) => r.id);
  if (new Set(ids).size !== ids.length) bad.push("资源 id 重复");
  if (energyRescs.filter((r) => r.cResSubPath).length !== LEAF_COUNT)
    bad.push(`叶子数 ${energyRescs.filter((r) => r.cResSubPath).length}，应为 ${LEAF_COUNT}`);
  for (const r of energyRescs) {
    if (r.cPid && !ids.includes(r.cPid)) bad.push(`${r.id} 的父节点 ${r.cPid} 不存在`);
    if (String(r.cResPath ?? "").includes("/")) bad.push(`${r.id} 的 cResPath「${r.cResPath}」不是单段`);
    if (r.cResSubPath && !r.cResSubPath.startsWith("/energy/")) bad.push(`${r.id} 的 cResSubPath 未以 /energy/ 开头`);
  }
  /* 编码唯一：一次性颁发的前提是同一个码不会出现在两页上 */
  const codes = energyRescs.map((r) => r.cCode).filter(Boolean);
  if (new Set(codes).size !== codes.length) bad.push("功能页编码重复");
  if (bad.length) throw new Error(`[energy] 菜单资源表不自洽：\n  ${bad.join("\n  ")}`);
}
