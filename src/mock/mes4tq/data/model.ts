import { MATERIAL_BY_ID, PROCESS_NAME, PROCESS_SEQ, SILO_BINS, UNIT_BY_ID, UNITS, unitsOfProcess } from "./org";

/**
 * 铁区MES mock 的**数值派生层**：全站唯一允许出现业务数字的地方。
 *
 * ── 为什么要有这一层（照抄能源域的理由，因为它同样成立）──────────────────
 * 演示系统最容易被客户当场戳破的不是样式，是**数对不上**：大屏说今天产了 4850 t 铁水，
 * 月报里三个高炉加起来是 5120；烧结利用系数写着 1.82，产量除以面积除以时间却是 0.95。
 * 这类错误没有任何工具会报——`vue-tsc` 已退役、`oxlint` 不看语义、构建只管能不能编译。
 * 所以本域的数字**只许从派生函数出来**：页面不写数、seed 不写数（除了不可再分的基础量），
 * 一切由这里算，`selfCheck()` 再把几条守恒等式断言住。
 *
 * ── 三条纪律 ────────────────────────────────────────────────────────────
 * 1. **确定性**：所有"看起来随机"的值都走 `rng(seed)`，同一个 seed 永远同一个数。
 *    用 `Math.random()` 会让每次刷新换一批数，客户来回点两页就发现产量变了。
 * 2. **量纲对齐**：B1 给的产能是「万 t/年」，页面上是「t/日」「kg/t」——
 *    换算只在这里做一次，页面不做单位换算（页面换算就会两页两套系数）。
 * 3. **口径可追溯**：每个派生函数头上写清公式，因为规格书 B4 的「子母项」要求
 *    客户追问「这个数怎么来的」时答得出来。
 *
 * ── 演示时钟 ────────────────────────────────────────────────────────────
 * `DEMO_T0` 是固定的「今天 08:00」。**不用 `new Date()`**：那样昨天跑出来的截图
 * 和今天跑出来的对不上，而演示材料要能反复用。所有日期都相对它偏移。
 */

/* ══════════════════════════════════════════════════════════════════════════
   0. 确定性随机与时间
   ══════════════════════════════════════════════════════════════════════════ */

/** 字符串 → 32 位散列（FNV-1a）。所有 seed 都从业务键拼出来，所以「1#高炉 9-27 的产量」永远同一个数 */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32：给定 seed 回一个 [0,1) 的确定值。同 seed 同结果，不依赖调用次数 */
export function rng(seed: string): number {
  let t = (hash(seed) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** [lo,hi] 内的确定值，`digits` 位小数 */
export function between(lo: number, hi: number, seed: string, digits = 0): number {
  const v = lo + rng(seed) * (hi - lo);
  const p = 10 ** digits;
  return Math.round(v * p) / p;
}

/** 从数组里按 seed 取一个（同 seed 同元素） */
export function pick<T>(arr: readonly T[], seed: string): T {
  return arr[Math.floor(rng(seed) * arr.length) % arr.length];
}

/** 演示基准时刻：固定「2026-09-27 08:00:00」。改这一行等于把整个演示的时间轴平移 */
export const DEMO_T0 = "2026-09-27 08:00:00";
/** 演示日期（`YYYY-MM-DD`） */
export const DEMO_DATE = DEMO_T0.slice(0, 10);
/** 演示月份（`YYYYMM`） */
export const DEMO_PERIOD = DEMO_DATE.slice(0, 7).replace("-", "");

/** 相对演示日的偏移日期（`-1` = 昨天）。用纯字符串算，不 new Date——避免时区把日期挪一天 */
export function dayOffset(days: number): string {
  const [y, m, d] = DEMO_DATE.split("-").map(Number);
  /* Date.UTC 只用来做日历运算，结果立刻转回字符串，不参与任何本地时区判断 */
  const t = Date.UTC(y, m - 1, d) + days * 86400000;
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/** 最近 n 天的日期数组（含今天），升序。日报/趋势图的横轴都用它 */
export function recentDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => dayOffset(i - (n - 1)));
}

/** 拼时刻串：`stamp("2026-09-27", "14:35")` → `2026-09-27 14:35:00`（定长，字典序即时间序） */
export function stamp(date: string, hhmm: string): string {
  return `${date} ${hhmm.length === 5 ? `${hhmm}:00` : hhmm}`;
}

/** 班次代码 → 该班在**生产日**里的起止时刻（B1：A 08:00-16:00 / B 16:00-00:00 / C 00:00-08:00） */
export const SHIFT_SPAN: Record<string, [string, string]> = {
  A: ["08:00", "16:00"],
  B: ["16:00", "23:59"],
  C: ["00:00", "08:00"],
};

/** 三个班次代码（生产日内的顺序：A → B → C） */
export const SHIFT_CODES = ["A", "B", "C"] as const;

/* ══════════════════════════════════════════════════════════════════════════
   1. 工序运行参数定义（TW 各「运行参数」页 / L5 实时监控盘）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 运行参数表：键 → 中文名 / 单位 / 正常区间 / 小数位。
 *
 * **key 是「页面级」的，不完全等于工序键**：焦化有三个页面各看一套参数
 * （`coke` 造球/焦炉主参数、`coke-oven` 炉温、`coke-gas` 煤气净化），
 * 硬塞成一套会让「推焦电流」和「煤气流量」同屏出现、客户问焦化页怎么还有流量。
 * 所以 key 允许带后缀，页面用 `paramKey` 入参指名要哪一套。
 *
 * **上下限住在这里而不是页面里**：页面只负责把 `alarms` 标红，判定由 `paramSnapshot()` 做。
 * 阈值写在页面上，六七个运行参数页就会有六七套阈值，改一处漏五处。
 *
 * 参数名取自规格书 A3 各页的描述（烧结：机速/负压/风箱温度/主抽电流；
 * 高炉：风温/风压/透气指数/料线/炉顶温度；球团：造球机转速/筛分状态/烘干温度…）。
 */
export interface ParamDef {
  key: string;
  label: string;
  unit: string;
  /** 正常区间 [下, 上]；超出即进 `alarms` */
  range: [number, number];
  /** 展示小数位 */
  digits: number;
  /** 基准值（生成快照时围绕它抖动） */
  base: number;
  /** 抖幅（占基准的比例） */
  jitter: number;
}

export const PROCESS_PARAMS: Record<string, ParamDef[]> = {
  sinter: [
    { key: "machineSpeed", label: "机速", unit: "m/min", range: [1.4, 2.2], digits: 2, base: 1.85, jitter: 0.06 },
    {
      key: "negativePressure",
      label: "主抽负压",
      unit: "Pa",
      range: [-17000, -12000],
      digits: 0,
      base: -14500,
      jitter: 0.05,
    },
    { key: "windBoxTemp", label: "风箱温度", unit: "℃", range: [80, 160], digits: 0, base: 118, jitter: 0.08 },
    { key: "mainFanCurrent", label: "主抽电流", unit: "A", range: [380, 520], digits: 0, base: 452, jitter: 0.04 },
    { key: "ignitionTemp", label: "点火温度", unit: "℃", range: [1050, 1250], digits: 0, base: 1150, jitter: 0.03 },
    { key: "returnOreRate", label: "返矿率", unit: "%", range: [12, 24], digits: 1, base: 18.5, jitter: 0.08 },
  ],
  pellet: [
    { key: "ballingSpeed", label: "造球机转速", unit: "r/min", range: [7, 12], digits: 1, base: 9.6, jitter: 0.06 },
    { key: "dryTemp", label: "烘干温度", unit: "℃", range: [380, 520], digits: 0, base: 452, jitter: 0.05 },
    { key: "kilnTemp", label: "竖炉焙烧温度", unit: "℃", range: [1180, 1320], digits: 0, base: 1256, jitter: 0.03 },
    { key: "screenLoad", label: "筛分负荷", unit: "%", range: [60, 92], digits: 0, base: 78, jitter: 0.08 },
    { key: "greenBallSize", label: "生球粒度", unit: "mm", range: [9, 16], digits: 1, base: 12.4, jitter: 0.07 },
  ],
  blast: [
    { key: "hotBlastTemp", label: "热风温度", unit: "℃", range: [1120, 1250], digits: 0, base: 1180, jitter: 0.03 },
    { key: "hotBlastPressure", label: "热风压力", unit: "kPa", range: [330, 420], digits: 0, base: 378, jitter: 0.04 },
    { key: "permeability", label: "透气性指数", unit: "—", range: [2.4, 3.4], digits: 2, base: 2.86, jitter: 0.07 },
    { key: "stockLine", label: "料线", unit: "m", range: [1.2, 2.0], digits: 2, base: 1.55, jitter: 0.08 },
    { key: "topTemp", label: "炉顶温度", unit: "℃", range: [110, 220], digits: 0, base: 158, jitter: 0.12 },
    { key: "topPressure", label: "炉顶压力", unit: "kPa", range: [190, 250], digits: 0, base: 220, jitter: 0.04 },
    { key: "blastVolume", label: "风量", unit: "m³/min", range: [3300, 3900], digits: 0, base: 3620, jitter: 0.04 },
  ],
  coke: [
    { key: "travelTemp", label: "直行温度", unit: "℃", range: [1280, 1360], digits: 0, base: 1318, jitter: 0.02 },
    { key: "machineSideTemp", label: "机侧均温", unit: "℃", range: [1280, 1360], digits: 0, base: 1322, jitter: 0.02 },
    { key: "cokeSideTemp", label: "焦侧均温", unit: "℃", range: [1280, 1360], digits: 0, base: 1314, jitter: 0.02 },
    { key: "pushCurrent", label: "推焦电流", unit: "A", range: [180, 260], digits: 0, base: 216, jitter: 0.09 },
    { key: "kAvg", label: "K均", unit: "—", range: [0.85, 1.0], digits: 3, base: 0.94, jitter: 0.03 },
    { key: "kStable", label: "K安", unit: "—", range: [0.8, 1.0], digits: 3, base: 0.91, jitter: 0.04 },
  ],
  lime: [
    { key: "kilnTemp", label: "竖窑温度", unit: "℃", range: [1000, 1200], digits: 0, base: 1108, jitter: 0.04 },
    { key: "gasFlow", label: "燃气流量", unit: "m³/h", range: [3200, 4600], digits: 0, base: 3860, jitter: 0.07 },
    { key: "caoContent", label: "CaO 含量", unit: "%", range: [88, 95], digits: 2, base: 91.6, jitter: 0.02 },
    { key: "activity", label: "活性度", unit: "mL", range: [300, 380], digits: 0, base: 342, jitter: 0.05 },
  ],
  raw: [
    { key: "beltLoad", label: "皮带负荷", unit: "t/h", range: [800, 1400], digits: 0, base: 1120, jitter: 0.09 },
    { key: "pileProgress", label: "平铺进度", unit: "%", range: [0, 100], digits: 0, base: 64, jitter: 0.2 },
    { key: "h2o", label: "混匀水分", unit: "%", range: [6.0, 9.0], digits: 2, base: 7.42, jitter: 0.06 },
  ],

  /* ── 焦化三页各一套（见文件头「key 是页面级的」）─────────────────────── */

  /** TW0204 焦炉温度记录：直行温度 / 机焦侧均温 / K均 / K安 */
  "coke-oven": [
    { key: "travelTemp", label: "直行温度", unit: "℃", range: [1280, 1360], digits: 0, base: 1318, jitter: 0.015 },
    { key: "machineSideTemp", label: "机侧均温", unit: "℃", range: [1280, 1360], digits: 0, base: 1322, jitter: 0.015 },
    { key: "cokeSideTemp", label: "焦侧均温", unit: "℃", range: [1280, 1360], digits: 0, base: 1314, jitter: 0.015 },
    { key: "kAvg", label: "K均", unit: "—", range: [0.85, 1.0], digits: 3, base: 0.94, jitter: 0.03 },
    { key: "kStable", label: "K安", unit: "—", range: [0.8, 1.0], digits: 3, base: 0.91, jitter: 0.04 },
    { key: "pushCurrent", label: "推焦电流", unit: "A", range: [180, 260], digits: 0, base: 216, jitter: 0.09 },
  ],

  /** TW0206 煤气净化运行：温/压/流量（规格书 A3 的 TWJ006 原文口径） */
  "coke-gas": [
    { key: "purifierTemp", label: "初冷器出口温度", unit: "℃", range: [28, 45], digits: 1, base: 36.4, jitter: 0.07 },
    { key: "suctionPressure", label: "吸力", unit: "kPa", range: [-3.5, -1.8], digits: 2, base: -2.6, jitter: 0.08 },
    { key: "gasFlow", label: "煤气流量", unit: "m³/h", range: [42000, 78000], digits: 0, base: 58600, jitter: 0.06 },
    { key: "tarContent", label: "含苯量", unit: "mg/m³", range: [0, 400], digits: 0, base: 268, jitter: 0.18 },
    { key: "power", label: "洗涤泵电流", unit: "A", range: [140, 220], digits: 0, base: 178, jitter: 0.05 },
  ],
};

/**
 * 生成某机组的参数快照。
 *
 * 抖动是**围绕基准的确定性抖动**（seed = 机组 + 参数键 + 时刻分钟），
 * 所以同一分钟内重复取快照得到同一批数——页面每 3s 轮询时不会出现数字乱跳。
 */
export function paramSnapshot(
  unitId: string,
  process: string,
  clock: string,
): { params: Record<string, number>; alarms: string[] } {
  const defs = PROCESS_PARAMS[process] ?? [];
  const params: Record<string, number> = {};
  const alarms: string[] = [];
  for (const d of defs) {
    const seed = `${unitId}|${d.key}|${clock.slice(0, 16)}`;
    const v = between(d.base * (1 - d.jitter), d.base * (1 + d.jitter), seed, d.digits);
    params[d.key] = v;
    if (v < d.range[0] || v > d.range[1]) alarms.push(d.key);
  }
  return { params, alarms };
}

/** 参数键 → 中文名（列头与监控盘标签用；取不到回键本身，便于发现漏配） */
export function paramLabel(process: string, key: string): string {
  return (PROCESS_PARAMS[process] ?? []).find((d) => d.key === key)?.label ?? key;
}

/** 参数键 → 单位 */
export function paramUnit(process: string, key: string): string {
  return (PROCESS_PARAMS[process] ?? []).find((d) => d.key === key)?.unit ?? "";
}

/* ══════════════════════════════════════════════════════════════════════════
   2. 料仓当前状态（TG0003 / TW 各工序料仓变料页）
   ══════════════════════════════════════════════════════════════════════════ */

/** 料仓高低位红线（`cells.ts` 的 `levelBarRenderer` 读 `hiLimit`/`loLimit` 画线） */
export const SILO_HI = 90;
export const SILO_LO = 15;

/**
 * 料仓当前状态：料位 + 存量。
 *
 * 料位是**按仓号 + 演示日**确定性生成的，并且刻意让少数几个仓落在危险区
 * （高≥90 或低≤15）——料位条全绿等于这个控件没做，客户看不到"要溢料了"是什么样。
 * 谁危险不写死：由 `rng` 决定，所以改演示日会换一批仓报警，但同一天内稳定。
 */
export function siloState(binCode: string): { levelPct: number; stock: number; hiLimit: number; loLimit: number } {
  const bin = SILO_BINS.find((s) => s.binCode === binCode);
  const capacity = bin?.capacity ?? 500;
  const r = rng(`silo|${binCode}|${DEMO_DATE}`);
  /* 三段式：8% 的仓高料位、8% 低料位、其余落在 35~85 的正常带 */
  const levelPct =
    r < 0.08
      ? Math.round(between(90, 98, `hi|${binCode}`))
      : r < 0.16
        ? Math.round(between(4, 14, `lo|${binCode}`))
        : Math.round(between(35, 85, `mid|${binCode}`));
  return { levelPct, stock: Math.round((capacity * levelPct) / 100), hiLimit: SILO_HI, loLimit: SILO_LO };
}

/** 料仓当前料种（品名）：初始料种 + 变料记录里最后一条改掉的品种 */
export function siloMaterial(binCode: string, lastChangeMaterial?: string): string {
  if (lastChangeMaterial) return lastChangeMaterial;
  const bin = SILO_BINS.find((s) => s.binCode === binCode);
  return bin?.matrlId ? (MATERIAL_BY_ID[bin.matrlId]?.name ?? "") : "";
}

/* ══════════════════════════════════════════════════════════════════════════
   3. 产量与技经指标（TR 报表 / TD 大屏 / TC 成本 的公共输入）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 某机组某日的产量（t）。
 *
 * 公式：`日产量 = 年产能(万t) × 10000 / 365 × 负荷率`。
 * 负荷率围绕 0.96 抖 ±6%——**刻意不满产**：演示里「今天没干完目标」比「天天超产」
 * 真实得多，而且 B9 的种子数据也是 4850/5000 这种「差一点」的数。
 */
export function unitDailyOutput(unitId: string, date: string): number {
  const unit = UNIT_BY_ID[unitId];
  if (!unit?.capacity) return 0;
  const daily = (unit.capacity * 10000) / 365;
  const load = between(0.9, 1.02, `out|${unitId}|${date}`, 4);
  return Math.round(daily * load);
}

/**
 * 利用系数。
 *
 * 口径照规格书 B4：**高炉 = 产量(t) / 容积(m³) / 日历时间(日)**；
 * **烧结机 = 产量(t) / 烧结面积(m²) / 日历时间(h)**——两者分母的时间单位不同，
 * 这是行业惯例（高炉按天、烧结按小时），写错就会出现「利用系数 0.95」这种现场一看就不对的数。
 * 规格书 B9 的种子数据这两处都对不上（高炉写 2.15 而 4850/1800=2.69），
 * 本函数**以公式为准**，种子数据以本函数为准重算。
 */
export function utilization(unitId: string, date: string): number {
  const unit = UNIT_BY_ID[unitId];
  if (!unit?.spec) return 0;
  const output = unitDailyOutput(unitId, date);
  const num = Number.parseFloat(unit.spec.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(num) || num <= 0) return 0;
  if (unit.type === "高炉") return Math.round((output / num) * 100) / 100; // t/(m³·d)
  if (unit.type === "烧结机") return Math.round((output / num / 24) * 1000) / 1000; // t/(m²·h)
  return Math.round((output / num) * 100) / 100;
}

/** 焦比：焦炭消耗(kg) / 铁水产量(t)。B4 口径。高炉专属 */
export function cokeRatio(unitId: string, date: string): number {
  return between(365, 395, `coke|${unitId}|${date}`, 0);
}

/** 煤比：喷煤量(kg) / 铁水产量(t)。B4 口径。高炉专属 */
export function coalRatio(unitId: string, date: string): number {
  return between(150, 178, `coal|${unitId}|${date}`, 0);
}

/**
 * 合格品率 = 合格品产量 / 总产量 × 100%。B4 口径。
 * 高炉给 99.5%+（铁水极少判废），烧结/球团给 97~99%（返矿与粒度不合格是常态）。
 */
export function passRate(unitId: string, date: string): number {
  const unit = UNIT_BY_ID[unitId];
  const [lo, hi] = unit?.type === "高炉" ? [99.4, 99.9] : [96.5, 99.2];
  return between(lo, hi, `pass|${unitId}|${date}`, 2);
}

/** 配料偏差率 = |实际配比 - 计划配比| / 计划配比 × 100%。B4 口径，粒度是**班** */
export function batchingDeviation(planId: string, materialId: string, shift: string): number {
  return between(-4.5, 4.5, `dev|${planId}|${materialId}|${shift}`, 1);
}

/* ══════════════════════════════════════════════════════════════════════════
   4. 子母项统计（B4：班实绩 → 日汇总 → 月汇总 → 技经指标）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 子母项：**子项**是每班/每日的单项原始值，**母项**由子项加权算出。
 *
 * 演示里最有说服力的一屏是「这个月产量怎么来的」：点开一个月的数，
 * 看到它由 30 个日值相加、每个日值由 3 个班值相加——所以 `drillDown` 一路能点到底。
 * 页面上只显示母项，子项明细放详情弹窗（TR0001 的「钻取」）。
 */
export interface SubItemNode {
  /** 层级名：`月`/`日`/`班` */
  level: string;
  /** 期间标识（`202609` / `2026-09-27` / `A`） */
  period: string;
  /** 本层值 */
  value: number;
  unit: string;
  /** 下一层明细（班层的为空数组） */
  children: SubItemNode[];
  /** 计算公式（展示用，答「这个数怎么来的」） */
  formula?: string;
}

/**
 * 按月/日/班三层展开某个机组某月的产量子母项树。
 *
 * `formula` 逐层写出来，因为客户一定会问「日产量为什么不是三个班相加」——
 * 答案是**跨班拆产**（`ProductionOutput.splitWeight`）：一班出的铁水可能有一半算给下一班。
 * 所以日值 = Σ班值（含拆入拆出），这个式子写在 `formula` 里。
 */
export function outputTree(unitId: string, period: string, unit = "t"): SubItemNode {
  const [y, m] = [period.slice(0, 4), period.slice(4, 6)];
  const daysInMonth = new Date(Number(y), Number(m), 0).getDate();
  /* 只展开到演示日为止——未来的日子没有产量，"本月累计"才不会凭空多出一周 */
  const demoDay = Number(DEMO_DATE.slice(8, 10));
  const lastDay = period === DEMO_PERIOD ? demoDay : daysInMonth;
  const children: SubItemNode[] = [];
  for (let d = 1; d <= lastDay; d += 1) {
    const date = `${y}-${m}-${String(d).padStart(2, "0")}`;
    const dayTotal = unitDailyOutput(unitId, date);
    const shifts: SubItemNode[] = SHIFT_CODES.map((code) => ({
      level: "班",
      period: code,
      /* 三个班按 34%/33%/33% 分，再让 A 班吸收尾差，保证 Σ班 == 日 */
      value: code === "A" ? dayTotal - Math.round((dayTotal * 33) / 100) * 2 : Math.round((dayTotal * 33) / 100),
      unit,
      children: [],
    }));
    children.push({
      level: "日",
      period: date,
      value: dayTotal,
      unit,
      children: shifts,
      formula: `日产量 = Σ班产量（含跨班拆产）= ${shifts.map((s) => s.value).join(" + ")}`,
    });
  }
  return {
    level: "月",
    period,
    value: children.reduce((s, c) => s + c.value, 0),
    unit,
    children,
    formula: `月产量 = Σ日产量（${children.length} 天）`,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   5. 配料质量加权（B5：四种口径 + 修正系数）
   ══════════════════════════════════════════════════════════════════════════ */

/** B5 的四种质量口径 */
export const QUALITY_MODES = ["全局质量", "月度质量", "近N天质量", "虚拟批次"] as const;
export type QualityMode = (typeof QUALITY_MODES)[number];

/** 一个批次的质量样本（用于加权） */
export interface QualitySample {
  batchNo: string;
  /** 批次量（加权用的权） */
  weight: number;
  /** 该批次的水分 */
  h2o: number;
  /** 该批次的 TFe */
  tfe: number;
  date: string;
}

/**
 * 按批次加权平均（B5 的 `Q = Σ(Qi × Ai) / Σ(Ai)`）。
 *
 * `mode` 决定**取哪些批次**：全局取全部、月度取当月、近N天取最近 N 天、虚拟批次取调用方指定的。
 * B5 特别注明「近N天是全量重算、非滚动」——所以这里每次都从头 filter，
 * 不维护滑动窗口（滚动窗口会让同一个批次在两天里算出两个不同的"近7天质量"）。
 *
 * `correction` 是**修正系数**（B5：用户可在预测值与实际值偏差较大时微调），默认 1。
 */
export function weightedQuality(
  samples: QualitySample[],
  mode: QualityMode,
  opts: { days?: number; batchNos?: string[]; correction?: number } = {},
): { tfe: number; h2o: number; weight: number; batchCount: number } {
  const { days = 7, batchNos, correction = 1 } = opts;
  let pool = samples;
  if (mode === "月度质量") pool = samples.filter((s) => s.date.startsWith(DEMO_DATE.slice(0, 7)));
  else if (mode === "近N天质量") {
    const from = dayOffset(-(days - 1));
    pool = samples.filter((s) => s.date >= from && s.date <= DEMO_DATE);
  } else if (mode === "虚拟批次") {
    const set = new Set(batchNos ?? []);
    pool = samples.filter((s) => set.has(s.batchNo));
  }
  const total = pool.reduce((s, x) => s + x.weight, 0);
  if (!total) return { tfe: 0, h2o: 0, weight: 0, batchCount: 0 };
  const tfe = pool.reduce((s, x) => s + x.tfe * x.weight, 0) / total;
  const h2o = pool.reduce((s, x) => s + x.h2o * x.weight, 0) / total;
  return {
    tfe: Math.round(tfe * correction * 100) / 100,
    h2o: Math.round(h2o * 100) / 100,
    weight: Math.round(total),
    batchCount: pool.length,
  };
}

/** 生成某物料的批次质量样本（供上式的四个口径用） */
export function qualitySamples(materialId: string, count = 30): QualitySample[] {
  const mat = MATERIAL_BY_ID[materialId];
  /* 含铁料给 56~62% 的 TFe、煤给 8~11% 的灰分口径（这里统一用 tfe 字段承载主指标） */
  const isOre = mat?.group === "矿石";
  return Array.from({ length: count }, (_, i) => {
    const date = dayOffset(-i);
    const seed = `qs|${materialId}|${date}`;
    return {
      batchNo: `${materialId.replace("M-", "B")}-${date.replace(/-/g, "").slice(2)}`,
      weight: between(800, 4200, `w|${seed}`, 0),
      h2o: between(isOre ? 6.2 : 8.5, isOre ? 9.8 : 12.5, `h|${seed}`, 2),
      tfe: between(isOre ? 55.8 : 8.2, isOre ? 62.4 : 11.4, `t|${seed}`, 2),
      date,
    };
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   6. 成本派生（TC0002/TC0003）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 工序成本构成（B1 的成本结构表：原料/燃料来自 MES 收集，辅材/备件来自 ERP，
 * 能源来自 EMS，人员来自 ERP-HR）。
 *
 * **`source` 字段必须保留**：客户会追问「这个成本项的数是谁给的」，
 * 而答案（MES 自己收的 vs ERP 抛来的 vs EMS 推来的）正是 B1 那张系统边界表的用处。
 */
export interface CostBreakdown {
  rawMaterialCost: number;
  fuelCost: number;
  auxiliaryCost: number;
  sparePartCost: number;
  energyCost: number;
  laborCost: number;
  totalCost: number;
  unitCost: number;
  outputQty: number;
}

/** 成本项 → 数据来源（B1 的成本结构表） */
export const COST_SOURCE: Record<string, string> = {
  rawMaterialCost: "MES 收集",
  fuelCost: "MES 收集",
  auxiliaryCost: "ERP-IN 抛送",
  sparePartCost: "ERP-IN 抛送",
  energyCost: "EMS 抛送",
  laborCost: "ERP-HR",
};

/**
 * 某机组某月的成本构成。
 *
 * 口径：`吨成本 = 工序总成本 / 合格品产量`。各项成本按**行业典型占比**生成，
 * 占比取自铁前工序的常识区间（高炉的原料+燃料占七成以上、烧结的燃料占比更高），
 * 所以客户拿自己的账来对时不会觉得离谱。
 */
export function costBreakdown(unitId: string, period: string): CostBreakdown {
  const unit = UNIT_BY_ID[unitId];
  const isBlast = unit?.type === "高炉";
  /* 月产量：按日产量 × 已过天数估（演示月只到 DEMO_DATE） */
  const dayCount = period === DEMO_PERIOD ? Number(DEMO_DATE.slice(8, 10)) : 30;
  const outputQty = unitDailyOutput(unitId, DEMO_DATE) * dayCount;
  const seed = `cost|${unitId}|${period}`;
  /* 吨成本基准：高炉 ~2860 元/t、烧结 ~1120、球团 ~1256、焦化 ~1980、白灰 ~596、原料 ~830 */
  const baseUnitCost = unit ? (MATERIAL_BY_ID[unit.type === "高炉" ? "M-0701" : "M-0107"]?.costPrice ?? 1120) : 1120;
  const unitCost = between(baseUnitCost * 0.96, baseUnitCost * 1.04, seed, 2);
  const totalCost = Math.round(unitCost * outputQty);
  /* 六项占比（高炉与烧结的燃料占比不同，所以分两套） */
  const shares = isBlast
    ? {
        rawMaterialCost: 0.62,
        fuelCost: 0.24,
        auxiliaryCost: 0.04,
        sparePartCost: 0.03,
        energyCost: 0.04,
        laborCost: 0.03,
      }
    : {
        rawMaterialCost: 0.55,
        fuelCost: 0.31,
        auxiliaryCost: 0.04,
        sparePartCost: 0.03,
        energyCost: 0.04,
        laborCost: 0.03,
      };
  /* ⚠️ 不许给逐项再乘抖动：六项占比已合计 1.00，逐项 ±3% 抖动会让六项之和
     偏离 totalCost 约 1.5%，与 selfCheck 的 1% 容差冲突（2026-09-27 自查抓到过）。
     月度之间的变化由上面的 `unitCost` 承担就够了 */
  const part = (k: keyof typeof shares) => Math.round(totalCost * shares[k]);
  return {
    rawMaterialCost: part("rawMaterialCost"),
    fuelCost: part("fuelCost"),
    auxiliaryCost: part("auxiliaryCost"),
    sparePartCost: part("sparePartCost"),
    energyCost: part("energyCost"),
    laborCost: part("laborCost"),
    totalCost,
    unitCost,
    outputQty: Math.round(outputQty),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   7. 自检（dev 期跑，见 mock/mes4tq/index.ts）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 数值自洽检查：把几条**守恒等式**写成断言，装配期跑一遍，违规打到 console。
 *
 * 为什么**不 throw**：这里抛出去等于整个应用白屏，而派生层的一处口径争议
 * 不该让演示开不了场。检查项住在 model（它才知道每个数从哪来），
 * `index.ts` 只负责"什么时候跑"。
 */
export function selfCheck(): string[] {
  const bad: string[] = [];

  /* ① 三个高炉的日产量之和 ≈ 炼铁厂 500 万 t/年 的日均（误差 10% 内） */
  const blastDaily = unitsOfProcess("blast").reduce((s, u) => s + unitDailyOutput(u.id, DEMO_DATE), 0);
  const blastTarget = (500 * 10000) / 365;
  if (Math.abs(blastDaily - blastTarget) / blastTarget > 0.1) {
    bad.push(`高炉日产量合计 ${blastDaily} t 偏离年产 500 万 t 的日均 ${Math.round(blastTarget)} t 超过 10%`);
  }

  /* ② 两台烧结机的日产量之和 ≈ 700 万 t/年 的日均 */
  const sinterDaily = unitsOfProcess("sinter").reduce((s, u) => s + unitDailyOutput(u.id, DEMO_DATE), 0);
  const sinterTarget = (700 * 10000) / 365;
  if (Math.abs(sinterDaily - sinterTarget) / sinterTarget > 0.1) {
    bad.push(`烧结日产量合计 ${sinterDaily} t 偏离年产 700 万 t 的日均 ${Math.round(sinterTarget)} t 超过 10%`);
  }

  /* ③ 利用系数量级：高炉 2.0~3.0 t/(m³·d)、烧结 0.8~1.4 t/(m²·h)——超出就是分母口径写错了 */
  for (const u of UNITS) {
    const v = utilization(u.id, DEMO_DATE);
    if (u.type === "高炉" && (v < 2.0 || v > 3.0))
      bad.push(`${u.name} 利用系数 ${v} 超出高炉常见区间 2.0~3.0 t/(m³·d)`);
    if (u.type === "烧结机" && (v < 0.8 || v > 1.4))
      bad.push(`${u.name} 利用系数 ${v} 超出烧结常见区间 0.8~1.4 t/(m²·h)`);
  }

  /* ④ 子母项守恒：日值的三个班之和必须等于日值（跨班拆产的尾差已在 A 班吸收） */
  for (const u of unitsOfProcess("blast")) {
    const tree = outputTree(u.id, DEMO_PERIOD);
    for (const day of tree.children.slice(-3)) {
      const sum = day.children.reduce((s, c) => s + c.value, 0);
      if (sum !== day.value) bad.push(`${u.name} ${day.period} 三个班之和 ${sum} ≠ 日产量 ${day.value}`);
    }
  }

  /* ⑤ 成本守恒：六项之和 = 总成本（各项都做了 ±3% 抖动，这里容 1% 误差） */
  for (const u of UNITS.slice(0, 4)) {
    const c = costBreakdown(u.id, DEMO_PERIOD);
    const sum = c.rawMaterialCost + c.fuelCost + c.auxiliaryCost + c.sparePartCost + c.energyCost + c.laborCost;
    if (Math.abs(sum - c.totalCost) / c.totalCost > 0.01) {
      bad.push(`${u.name} 成本六项之和 ${sum} 偏离总成本 ${c.totalCost} 超过 1%`);
    }
  }

  /* ⑥ 工序顺序与工序名表对齐（TR/TD 按 PROCESS_SEQ 排序，漏一个工序名会显示成键名） */
  for (const p of PROCESS_SEQ) if (!PROCESS_NAME[p]) bad.push(`工序 ${p} 缺中文名（PROCESS_NAME）`);

  return bad;
}
