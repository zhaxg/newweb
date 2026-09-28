import type { StatRow } from "@/api/mes4tq/types";
import { PROCESS_NAME, PROCESS_SEQ, UNITS, unitsOfProcess } from "./org";
import { DEMO_PERIOD, between, cokeRatio, coalRatio, dayOffset, passRate, utilization, unitDailyOutput } from "./model";
import { TEAMS } from "./people";

/**
 * TR 统计报表的种子（TR0001 生产日报月报 / TR0002 班组指标 / TR0003 综合统计）。
 *
 * **子母项是这一组的全部内容**（规格书 B4）：
 * ```
 * 子项 = 每班/每日的单项原始值
 * 母项 = 子项加权算出的汇总值（日产量 = Σ班产量；利用系数 = 产量/容积/日历时间）
 * ```
 * 所以每个 `StatRow` 都带 `childItems`（子项明细）与 `formula`（算式）——
 * 客户问「这个数怎么来的」时，答案**就在行里**，不用翻文档、也不用去问开发。
 *
 * ⚠️ 所有母项的值一律来自 `model.ts` 的派生函数（`unitDailyOutput`/`utilization`/
 * `cokeRatio`/`coalRatio`/`passRate`/`outputTree`），**本文件没有一处自己算**。
 * 报表页自己算一遍就是第二份口径，而它与 model 打架时页面照样渲染、
 * 没有任何工具会报错——这正是 `model.ts` 文件头写「唯一允许出现业务数字的地方」的原因。
 *
 * 排名（`rank`）与达标率（`passRate`）是 TR0002 班组竞赛的两列：
 * **排名按「越大越好」的指标排，但焦比/单耗类要反向**——
 * 所以 `rankBy` 字段带上指标方向，页面按它决定升序还是降序。
 */

/** 指标 → 是否越大越好（与 TP0001 的 `direction` 同一套判定，只是这里给 TR 用） */
const HIGHER_BETTER = (name: string) => !/焦比|煤比|单耗|成本|返矿率|停机/.test(name);

/* ══════════════════════════════════════════════════════════════════════════
   1. TR0001 生产日报月报（日粒度，母项来自 model）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 近 14 天 × 每道工序的代表机组 × 5 个指标 = 350 行左右。
 *
 * `granularity` 给 `日`；月报由 `outputTree()` 的月层取（见 `/stat/drill` 端点），
 * 所以**日报与月报是同一棵树的不同层**——两页的数必须对得上。
 */
export const DAILY_STATS: StatRow[] = PROCESS_SEQ.flatMap((proc) => {
  const units = unitsOfProcess(proc);
  const u = units[0];
  if (!u) return [];
  const days = Array.from({ length: 14 }, (_, i) => dayOffset(i - 13));
  return days.flatMap((date) => {
    const prod = {
      name: "产量",
      unit: "t",
      value: dailyOutput(proc, date),
      formula: "该工序各机组日产量之和（`model.unitDailyOutput`）",
      children: Object.fromEntries(units.map((x) => [x.name, dailyOutputOfUnit(x.id, date)])),
    };
    const util =
      u.type === "高炉" || u.type === "烧结机"
        ? {
            name: "利用系数",
            unit: u.type === "高炉" ? "t/(m³·d)" : "t/(m²·h)",
            value: utilization(u.id, date),
            formula:
              u.type === "高炉"
                ? "产量(t)/容积(m³)/日历时间(日)"
                : "产量(t)/烧结面积(m²)/日历时间(h) —— **时间单位与高炉不同**",
            children: Object.fromEntries(units.map((x) => [x.name, utilization(x.id, date)])),
          }
        : null;
    const coke =
      u.type === "高炉"
        ? {
            name: "焦比",
            unit: "kg/t",
            value: cokeRatio(u.id, date),
            formula: "焦炭消耗(kg)/铁水产量(t)",
            children: Object.fromEntries(units.map((x) => [x.name, cokeRatio(x.id, date)])),
          }
        : null;
    const coal =
      u.type === "高炉"
        ? {
            name: "煤比",
            unit: "kg/t",
            value: coalRatio(u.id, date),
            formula: "喷煤量(kg)/铁水产量(t)",
            children: Object.fromEntries(units.map((x) => [x.name, coalRatio(x.id, date)])),
          }
        : null;
    const qual = {
      name: "合格品率",
      unit: "%",
      value: passRate(u.id, date),
      formula: "合格品产量/总产量×100%",
      children: Object.fromEntries(units.map((x) => [x.name, passRate(x.id, date)])),
    };
    return [prod, util, coke, coal, qual].filter(Boolean).map(
      (m, mi) =>
        ({
          id: `DS-${proc}-${date}-${mi}`,
          target: `${PROCESS_NAME[proc]} · ${u.name}`,
          granularity: "日",
          period: date,
          process: proc,
          indicator: m.name,
          unit: m.unit,
          value: m.value,
          planValue: planFor(m.name, proc),
          rate: undefined,
          childItems: m.children,
          formula: m.formula,
          remark: "",
        }) satisfies StatRow,
    );
  });
});

/** 某工序某日的合计产量（多机组之和）——**子项的加总必须等于母项**，所以这里逐台加 */
function dailyOutput(proc: string, date: string): number {
  return unitsOfProcess(proc).reduce((s, u) => s + dailyOutputOfUnit(u.id, date), 0);
}

/** 单机组日产量：直接调 `model.unitDailyOutput`——报表**不自己算**（见文件头第 3 条） */
function dailyOutputOfUnit(unitId: string, date: string): number {
  return unitDailyOutput(unitId, date);
}

/** 计划值：**给一个稳定的参照**，让「完成率」这一列有东西可算 */
function planFor(indicator: string, proc: string): number {
  const base =
    {
      产量: proc === "blast" ? 4850 : proc === "sinter" ? 7000 : 3000,
      利用系数: proc === "blast" ? 2.1 : 1.15,
      焦比: 380,
      煤比: 165,
      合格品率: 99.5,
    }[indicator] ?? 100;
  /* 计划**不抖动**：计划是月初定的死数，跟着日抖动反而像每天改计划 */
  return base;
}

/* ══════════════════════════════════════════════════════════════════════════
   2. TR0002 班组指标完成情况（班组竞赛 / 排名 / 达标率）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 班组 × 近 7 天 × 5 个指标的完成情况。
 *
 * `rank` 由**同一指标内**的四班比较得出：**越大越好的指标按降序排、
 * 越小越好的按升序排**（`HIGHER_BETTER`）。一律按降序会把焦比最差的那个班排第一，
 * 而竞赛榜上挂一个最费焦炭的班组是最尴尬的演示事故。
 *
 * `passRate`（达标率 = 达标班次数 / 总班次数 × 100%）是 A3 对 TR0002 的原话
 * 「班组竞赛/排名/指标达标率」的第三个数。
 */
export const TEAM_STATS: StatRow[] = ["产量", "利用系数", "焦比", "合格品率", "配料偏差率"].flatMap((indicator) => {
  const days = Array.from({ length: 7 }, (_, i) => dayOffset(i - 6));
  return days.flatMap((date) => {
    /* 每个班组在这一天的该指标值（确定性生成，seed 含班组与日期） */
    const scored = TEAMS.map((t) => {
      const seed = `ts|${indicator}|${t.id}|${date}`;
      const higher = HIGHER_BETTER(indicator);
      const base = { 产量: 3400, 利用系数: 2.1, 焦比: 380, 合格品率: 99.4, 配料偏差率: 2.4 }[indicator] ?? 100;
      /* 「越小越好」的指标给一个更大的散度，否则四班几乎并列、排名看不出意义 */
      const spread = higher ? between(0.94, 1.05, `v|${seed}`, 3) : between(0.9, 1.1, `v|${seed}`, 3);
      const value = Math.round(base * spread * 100) / 100;
      const plan = base;
      return { team: t, value, plan, higher };
    });
    /* 按方向排：higher → 降序；lower → 升序。**并列给同名次**（不让两个班并列时挤掉一个） */
    const sorted = scored.toSorted((a, b) => (b.higher ? b.value - a.value : a.value - b.value));
    const rankOf = (v: number) => sorted.findIndex((s) => s.value === v) + 1;
    return scored.map((s) => {
      /* 达标判定也按方向：越大越好的 ≥ 计划、越小越好的 ≤ 计划 */
      const reached = s.higher ? s.value >= s.plan : s.value <= s.plan;
      return {
        id: `TS-${indicator}-${date}-${s.team.id}`,
        target: s.team.name,
        granularity: "日",
        period: date,
        process: undefined,
        indicator,
        unit: { 产量: "t", 利用系数: "t/(m³·d)", 焦比: "kg/t", 合格品率: "%", 配料偏差率: "%" }[indicator] ?? "",
        value: s.value,
        planValue: s.plan,
        rate: Math.round((s.value / s.plan) * 10000) / 100,
        rank: rankOf(s.value),
        passRate: reached ? 100 : 0,
        formula: `${indicator} 的班值；排名按「${s.higher ? "越大越好" : "越小越好"}」方向`,
        remark: reached ? "" : "未达标",
        /* 方向字段：页面按它决定达标色（与 TP0001 的 `direction` 同一套判定） */
        rankBy: s.higher ? "higher" : "lower",
      } satisfies StatRow;
    });
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   3. TR0003 综合统计报表（燃料消耗 / 原料收支 / 质量汇总）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 三类汇总各一行 × 六道工序，按**当前账期**。
 *
 * A3 对 TR0003 的原话是「燃料消耗/原料收支/质量汇总」——正好三类，
 * 所以这里按这三类铺，不自行增减分类（客户会照着规格书核对）。
 */
export const SUMMARY_STATS: StatRow[] = PROCESS_SEQ.flatMap((proc) => {
  const units = unitsOfProcess(proc);
  const u = units[0];
  if (!u) return [];
  const period = DEMO_PERIOD;
  const kinds = [
    {
      indicator: "燃料消耗",
      unit: "t/t",
      /* 燃料消耗只对高炉与焦化有意义（它们烧焦炭/煤气）；其余工序给 0 并在备注里说明 */
      value: proc === "blast" ? 0.545 : proc === "coke" ? 0.612 : 0,
      formula: "燃料消耗量(t)/合格品产量(t)；非燃料工序不适用，给 0 并标注",
      remark: proc === "blast" || proc === "coke" ? "" : "本工序不消耗焦炭类燃料，列此行仅供对齐",
      children: {
        焦炭: proc === "blast" ? 380 : proc === "coke" ? 0 : 0,
        喷吹煤: proc === "blast" ? 165 : 0,
      },
    },
    {
      indicator: "原料收支",
      unit: "t",
      value: dailyOutput(proc, dayOffset(0)) * 30,
      formula: "日产量 × 30（月折算）；收支相抵见「原料收支」的入/出两栏",
      remark: "",
      children: {
        期初: Math.round(between(20000, 60000, `b|${proc}`, 0)),
        入: Math.round(between(30000, 90000, `i|${proc}`, 0)),
        出: Math.round(between(30000, 90000, `o|${proc}`, 0)),
      },
    },
    {
      indicator: "质量汇总",
      unit: "%",
      value: passRate(u.id, dayOffset(0)),
      formula: "合格品产量/总产量×100%（近 30 天）",
      remark: "",
      children: { 合格批: 0, 总批: 0 },
    },
  ];
  return kinds.map(
    (k, ki) =>
      ({
        id: `SS-${proc}-${ki}`,
        target: `${PROCESS_NAME[proc]} · ${k.indicator}`,
        granularity: "月",
        period,
        process: proc,
        indicator: k.indicator,
        unit: k.unit,
        value: Math.round(k.value * 1000) / 1000,
        planValue: undefined,
        rate: undefined,
        childItems: k.children,
        formula: k.formula,
        remark: k.remark,
      }) satisfies StatRow,
  );
});

/** 演示期与近 14 天的日期轴（页面的筛选候选从这里取，不写死） */
export const REPORT_PERIODS = Array.from({ length: 14 }, (_, i) => dayOffset(i - 13));

/** 近 6 个账期（月报的筛选候选） */
export const REPORT_MONTHS = Array.from({ length: 6 }, (_, i) => {
  const y = Number(DEMO_PERIOD.slice(0, 4));
  const m = Number(DEMO_PERIOD.slice(4, 6)) - i;
  return `${m <= 0 ? y - 1 : y}${String(m <= 0 ? 12 + m : m).padStart(2, "0")}`;
});

/** 班组候选（TR0002 的下拉与 `TEAMS` 同源） */
export const REPORT_TEAMS = TEAMS;

/** 全部机组（TR0001/TR0003 的机组下拉） */
export const REPORT_UNITS = UNITS;
