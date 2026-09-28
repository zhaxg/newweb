import { TEAMS } from "./people";
import { DEMO_DATE, between, dayOffset } from "./model";
import type { TechIndicatorDef } from "@/api/mes4tq/types";

/**
 * TG 基础配置的补充种子：排班规则 / 排班结果 / 技经指标定义。
 *
 * 为什么这三样单列一个文件而物料、产线、料仓不列：后者的主数据**已经在 `org.ts` 里**
 * （它们是别的模块也要用的全站骨架），而这三样**只有 TG 模块用**。
 * 放进 `org.ts` 会让它变成"什么都有的杂物间"，改排班规则要动全站文件。
 *
 * ⚠️ 业务数字（产量、系数、成本、阈值）一律不在这里出现——
 * 那些只能由 `model.ts` 的派生函数算。本文件只放**不可再分的基础量**：
 * 规则文本、日期安排、指标口径描述。
 */

/* ══════════════════════════════════════════════════════════════════════════
   1. 排班规则（TG0004 的上半屏）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 排班规则。规格书 B1 只给了「三班倒：甲/乙/丙/丁，每班 8 小时」一句话，
 * 这里把它写成两条真实工厂里常见的规则：
 * - **固定轮换**：某班组长期占某个班次（工长要熟悉本班的操作习惯，轮换反而乱）；
 * - **四班三运转**：四个班组轮三个班次，保证每班都有整 24 小时的休班
 *   ——这是钢厂最主流的排班方式，也是演示里"为什么是四个人排三个班"的答案。
 */
export interface ShiftRule {
  id: string;
  name: string;
  /** 模式：固定轮换 / 四班三运转 */
  pattern: string;
  /** 适用班组 */
  teamIds: string[];
  /** 生效日期 */
  effectiveDate: string;
  /** 备注（写清这条规则管什么） */
  remark: string;
}

export const SHIFT_RULES: ShiftRule[] = [
  {
    id: "SR-01",
    name: "四班三运转",
    pattern: "四班三运转",
    teamIds: TEAMS.map((t) => t.id),
    effectiveDate: "2024-01-01",
    remark: "甲乙丙丁四组轮 A/B/C 三个班次，每班 8 小时，连续工作 6 天后休 24 小时",
  },
  {
    id: "SR-02",
    name: "铁区总调度固定早班",
    pattern: "固定轮换",
    teamIds: ["T-A"],
    effectiveDate: "2024-01-01",
    remark: "调度岗不参与轮班，固定早班与机关作息对齐，便于跨厂协调",
  },
];

/* ══════════════════════════════════════════════════════════════════════════
   2. 排班结果（TG0004 的下半屏：某段时间的班表）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 排班结果：按生产日 × 班次铺开的班表。
 *
 * **班组轮转是确定性的**：同一天同一班次永远是同一个班组——
 * 用 `dayOffset` 的日序号对 4 取模来定班组，不随机。这样客户前后翻两页、
 * 或者截图对比，看到的都是同一张班表（随机排班会让演示变成"每次都不一样"）。
 *
 * `date` 用**生产日**而不是自然日，与 `model.ts` 的班序 A→B→C 对齐
 * （C 班 00:00-08:00 属于**前一个**生产日——按自然日排会把夜班算到次日）。
 */
export interface ShiftSchedule {
  id: string;
  date: string;
  shift: string;
  teamId: string;
  teamName: string;
  /** 班长姓名（`people.ts` 的 leader → 姓名，写死名字而不是留 id：班表给人看的） */
  leader: string;
  memberCount: number;
  ruleId: string;
  remark?: string;
}

const TEAM_BY_ID = Object.fromEntries(TEAMS.map((t) => [t.id, t]));

/**
 * 铺 `days` 天的班表（含今天）。
 *
 * 轮转公式：`(日序号 + 班序号) % 班组数`。加上班序号是为了让**同一组人不连上两个班**
 * （甲班刚下夜班又接早班是排班表上最明显的错误）。
 */
export function shiftSchedules(days = 14): ShiftSchedule[] {
  const out: ShiftSchedule[] = [];
  const shifts = ["A", "B", "C"];
  for (let i = -(days - 1); i <= 0; i += 1) {
    const date = dayOffset(i);
    /* 以演示日起点为锚，保证偏移天数稳定（不用 Date 的绝对日序，避免时区影响） */
    const daySeq = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${DEMO_DATE}T00:00:00Z`)) / 86400000);
    shifts.forEach((shift, sIdx) => {
      const team = TEAMS[(((daySeq + sIdx) % TEAMS.length) + TEAMS.length) % TEAMS.length];
      const leader = TEAM_BY_ID[team.id];
      out.push({
        id: `SS-${date}-${shift}`,
        date,
        shift,
        teamId: team.id,
        teamName: team.name,
        /* `leader` 存的是姓名而不是 id：班表是给人看的，再让页面查一次人名表是白费一次请求 */
        leader: leader?.id ? leader.name : "",
        memberCount: team.members,
        ruleId: "SR-01",
      });
    });
  }
  return out;
}

/**
 * 班表缓存。
 *
 * `shiftSchedules()` 每次调用都铺 14 天 × 3 班 = 42 行，而排班表在一次会话里不会变
 * （本域没有写端点，没人改它）。缓存住，翻页/筛选才不用每次重铺。
 *
 * ⚠️ 唯一要留意的是 `DEMO_T0` 变更后缓存不会自己失效（dev 下改了就重启）。
 */
export const SHIFT_PLAN_CACHE: ShiftSchedule[] = shiftSchedules(14);

/* ══════════════════════════════════════════════════════════════════════════
   3. 技经指标定义（TG0005）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 技经指标定义：有哪些指标、口径怎么算、算到什么粒度。
 *
 * `formula` 与 `granularity` 是这一屏的**唯一价值**——客户问「利用系数到底怎么算」
 * 时答案就在这里，不用翻文档。公式的口径**照规格书 B4**，与 `model.ts` 的实现逐字对齐
 * （尤其是高炉按天、烧结按小时这个时间单位差异，两处写歪就会出现互相矛盾的数）。
 *
 * 与 `plan.ts` 的 `TechIndicatorPlan`（某年某月的指标值）是两回事：
 * 这里回答「有哪些指标」，那里回答「这个月的值是多少」。
 */
export const TECH_INDICATORS: TechIndicatorDef[] = [
  {
    id: "TD-01",
    indicatorName: "利用系数",
    unit: "t/(m³·d) / t/(m²·h)",
    formula: "高炉：产量(t)/容积(m³)/日历时间(日)；烧结：产量(t)/烧结面积(m²)/日历时间(h)",
    granularity: "日/月",
    process: "烧结工序",
    enabled: true,
    remark: "两种分母的时间单位不同是行业惯例，不是笔误",
  },
  {
    id: "TD-02",
    indicatorName: "焦比",
    unit: "kg/t",
    formula: "焦炭消耗(kg)/铁水产量(t)",
    granularity: "日/月",
    process: "高炉工序",
    enabled: true,
    remark: "高炉的核心燃料指标，与煤比一起看",
  },
  {
    id: "TD-03",
    indicatorName: "煤比",
    unit: "kg/t",
    formula: "喷煤量(kg)/铁水产量(t)",
    granularity: "日/月",
    process: "高炉工序",
    enabled: true,
    remark: "喷吹煤替代焦炭的比例，焦比+煤比才是总燃料比",
  },
  {
    id: "TD-04",
    indicatorName: "合格品率",
    unit: "%",
    formula: "合格品产量/总产量×100%",
    granularity: "日/月",
    process: "烧结工序",
    enabled: true,
    remark: "球团、烧结、高炉三道工序共用同一口径",
  },
  {
    id: "TD-05",
    indicatorName: "配料偏差率",
    unit: "%",
    formula: "|实际配比-计划配比|/计划配比×100%",
    granularity: "班",
    process: "烧结工序",
    enabled: true,
    remark: "粒度是**班**，不是日——配比是每班都要控的，按日算会掩盖一个班的跑偏",
  },
  {
    id: "TD-06",
    indicatorName: "作业率",
    unit: "%",
    formula: "实际作业时间/日历时间×100%",
    granularity: "日/月",
    process: "烧结工序",
    enabled: true,
    remark: "停机时间从 `downtime` 表取（类型 A 计划停机才算计划检修）",
  },
  {
    id: "TD-07",
    indicatorName: "吨矿成本",
    unit: "元/t",
    formula: "工序总成本/合格品产量",
    granularity: "月",
    process: "烧结工序",
    enabled: true,
    remark: "月粒度：日成本没有归集意义，成本是日清月结",
  },
  {
    id: "TD-08",
    indicatorName: "返矿率",
    unit: "%",
    formula: "返矿量/烧结矿总产量×100%",
    granularity: "班/日",
    process: "烧结工序",
    enabled: true,
    remark: "越低越好，但过低会影响烧结矿强度",
  },
  {
    id: "TD-09",
    indicatorName: "高炉有效容积利用系数",
    unit: "t/(m³·d)",
    formula: "铁水产量(t)/有效容积(m³)/日历时间(日)",
    granularity: "日/月",
    process: "高炉工序",
    enabled: false,
    remark: "与「利用系数」重叠，仅高炉单独列示时启用；默认关掉以免重复计数",
  },
];

/** 指标名 → 定义（TR 报表按指标名取公式用，省一次请求） */
export const INDICATOR_BY_NAME: Record<string, TechIndicatorDef> = Object.fromEntries(
  TECH_INDICATORS.map((i) => [i.indicatorName, i]),
);

/** 月计划值示例（TP0001 对比列的"计划"侧；`plan.ts` 会读它） */
export function indicatorPlanValue(indicatorName: string, period: string): number {
  const base =
    {
      利用系数: 2.15,
      焦比: 380,
      煤比: 165,
      合格品率: 99.5,
      配料偏差率: 3,
      作业率: 96,
      吨矿成本: 1120,
      返矿率: 18,
      高炉有效容积利用系数: 2.15,
    }[indicatorName] ?? 100;
  return between(base * 0.96, base * 1.04, `plan|${indicatorName}|${period}`, 2);
}
