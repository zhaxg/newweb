import type { CostAdjust, CostAnalysis, CostItemPrice } from "@/api/mes4tq/types";
import { UNITS } from "./org";
import { COST_SOURCE, DEMO_PERIOD, between, costBreakdown, pick } from "./model";

/**
 * TC 成本归集的种子（TC0001 单价维护 / TC0002 成本分析 / TC0003 成本调差）。
 *
 * **成本口径的唯一真源是 `MATERIALS.costPrice`**（TG0002）与 `model.costBreakdown()`。
 * 本文件只铺**单价表与调差记录**这两类「人维护的行」——
 * 成本分析的六个分项**一律由 `model.costBreakdown()` 现算**，不在这儿生成：
 * 那六个数是派生量，放在这里就成了第二份，与 model 打架而没人会发现
 * （页面照样渲染、没有任何工具报错）。
 *
 * 规格书 B1 的成本结构表要求**保留每一项的数据来源**——
 * 哪些是 MES 自己收的、哪些是 ERP 抛的、哪些是 EMS 推的。
 * `COST_SOURCE` 那张表在 `model.ts`，`CostItemPrice.category` 承载它：
 * 客户问「这个成本项的数是谁给的」时，`来源` 列要答得出来。
 */

/* ══════════════════════════════════════════════════════════════════════════
   1. 成本项单价（TC0001，真实表 TPF_1002）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 六类成本项 × 近 3 个月的单价。
 *
 * `category` 取 B1 成本结构表的六项：
 * 原料成本（MES 收集）/ 燃料成本（MES 收集）/ 辅材成本（ERP-IN 抛送）/
 * 备件成本（ERP-IN 抛送）/ 能源成本（EMS 抛送）/ 人员成本（ERP-HR）。
 *
 * **人员成本没有单价可乘**（它按工时/工资归集，不按「元/t」计）——
 * 所以它在表里给「元/人·月」的单位而不是「元/t」，
 * 这样 TC0002 把它除以产量时会得到一个不同的量纲，
 * 页面上要能显示成「不参与吨成本摊销」，不能混进吨成本里。
 */
const COST_ITEMS: Array<[string, string, string, number, string]> = [
  // [项代码, 项名, 分类, 单价, 单位]
  ["CI-01", "原料成本-矿石", "MES 收集", 1120, "元/t"],
  ["CI-02", "原料成本-熔剂", "MES 收集", 420, "元/t"],
  ["CI-03", "燃料成本-焦炭", "MES 收集", 1980, "元/t"],
  ["CI-04", "燃料成本-喷吹煤", "MES 收集", 1020, "元/t"],
  ["CI-05", "燃料成本-高炉煤气", "MES 收集", 0.128, "元/m³"],
  ["CI-06", "辅材成本-耐材", "ERP-IN 抛送", 8600, "元/t"],
  ["CI-07", "辅材成本-合金", "ERP-IN 抛送", 24500, "元/t"],
  ["CI-08", "备件成本-液压件", "ERP-IN 抛送", 3200, "元/件"],
  ["CI-09", "备件成本-皮带", "ERP-IN 抛送", 680, "元/m"],
  ["CI-10", "能源成本-电", "EMS 抛送", 0.62, "元/kWh"],
  ["CI-11", "能源成本-蒸汽", "EMS 抛送", 96, "元/t"],
  ["CI-12", "能源成本-水", "EMS 抛送", 3.85, "元/m³"],
  ["CI-13", "人员成本-直接人工", "ERP-HR", 12800, "元/人·月"],
  ["CI-14", "人员成本-制造费用", "ERP-HR", 4600, "元/人·月"],
];

/** 成本项字典（TC0001 的上半屏 / TC0002 的构成下拉共用） */
export const COST_ITEM_DEFS = COST_ITEMS.map(([itemNo, itemName, category, price, unit]) => ({
  itemNo,
  itemName,
  category,
  unit,
  price,
}));

export const COST_ITEM_PRICES: CostItemPrice[] = COST_ITEMS.flatMap(([itemNo, , category, base, unit]) => {
  const months = [0, 1, 2];
  return months.map((back) => {
    const y = Number(DEMO_PERIOD.slice(0, 4));
    const m = Number(DEMO_PERIOD.slice(4, 6)) - back;
    const month = m <= 0 ? 12 + m : m;
    const year = m <= 0 ? y - 1 : y;
    const date = `${year}-${String(month).padStart(2, "0")}-01`;
    const seed = `cip|${itemNo}|${date}`;
    return {
      id: `CIP-${itemNo}-${String(month).padStart(2, "0")}`,
      itemNo,
      itemName: COST_ITEMS.find((c) => c[0] === itemNo)?.[1] ?? itemNo,
      date,
      unit,
      /* 单价逐月小幅浮动——**三个月同价是「编的」最明显特征**，
         而浮动方向一致（涨或跌）符合同一个市场周期 */
      price: Math.round(base * between(0.96, 1.04, `p|${seed}`, base < 10 ? 3 : 2) * 1000) / 1000,
      workshopCode: "",
      category,
      remark: "",
    } satisfies CostItemPrice;
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   2. 成本分析（TC0002）——六个分项全部由 `model.costBreakdown()` 现算
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 近 6 个月 × 每道工序的**代表机组**（取该工序第一台）的成本分析行。
 *
 * 为什么用「代表机组」而不是所有 19 台：TC0002 是**工序成本对比**
 * （A3 原文「烧结/高炉工序成本对比+趋势」），对比的对象是工序不是机组；
 * 一台高炉一行就够，三台高炉三行会让对比图变成机组图。
 *
 * `status`（月结状态）用 S6 状态机的六档——本月是「数据收集中」，
 * 前几个月依次推进到「已锁定」，这样**客户能看到一整条月结链**，
 * 而不是六行全是「已计算」。`CostAdjust` 与它联动（已锁定的月份才可能有调差）。
 */
const MONTHLY_STATUS = ["数据收集中", "计算中", "已计算", "已审核", "已锁定", "已调差"] as const;

export const COST_ANALYSES: CostAnalysis[] = UNITS.filter((u) => ["高炉", "烧结机", "焦炉"].includes(u.type)).flatMap(
  (unit) => {
    const months = [0, 1, 2, 3, 4, 5];
    return months.map((back) => {
      const y = Number(DEMO_PERIOD.slice(0, 4));
      const m = Number(DEMO_PERIOD.slice(4, 6)) - back;
      const month = m <= 0 ? 12 + m : m;
      const year = m <= 0 ? y - 1 : m;
      const period = `${year}${String(month).padStart(2, "0")}`;
      const b = costBreakdown(unit.id, period);
      return {
        id: `CA-${unit.id}-${period}`,
        period,
        unitId: unit.id,
        ...b,
        /* 月结状态**倒着给**：越早的月越靠后（已锁定），本月最前（数据收集中）。
         用 `6 - back` 会反过来（本月最靠后），那是错的 */
        status: MONTHLY_STATUS[back] ?? "已计算",
        /* 环比：本月比上月的总成本变化 %，客户对账时第一个看的就是它 */
        momRate:
          back === 5 ? undefined : Math.round((between(-4, 6, `mom|${unit.id}|${period}`, 1) + 100 - 100) * 10) / 10,
      } satisfies CostAnalysis;
    });
  },
);

/* ══════════════════════════════════════════════════════════════════════════
   3. 成本调差记录（TC0003）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 月末调差：**只对「已锁定」之后的月份发生**（S6 状态机末档是「已调差」）。
 *
 * `diffAmount = afterAmount - beforeAmount` 是列上算得出来的，
 * 客户拿计算器能验——所以三个数都给，不只给差额。
 *
 * **调差原因必须具体**（「合同价补差」「汇率浮动」「计量误差回补」），
 * 给一句「调整」等于没说：调差是审计要过的环节，原因栏空着是不能入库的。
 */
const ADJUST_REASONS = [
  "合同价补差：月初采购价与结算价差 3%",
  "汇率浮动：进口矿按到岸价重新折算",
  "计量误差回补：上月皮带秤标定后重算",
  "能源单价调整：EMS 下抛价按实际结算价回补",
  "税率变动：辅材进项税率调整",
  "供应商返利：月度量价返利入账",
];

export const COST_ADJUSTS: CostAdjust[] = COST_ANALYSES.filter(
  (a) => a.status === "已调差" || a.status === "已锁定",
).flatMap((a, ai) =>
  COST_ITEM_DEFS.slice(0, 3).map((def, di) => {
    const seed = `ca|${a.id}|${def.itemNo}`;
    const before = Math.round(between(2_400_000, 9_800_000, `b|${seed}`, 0));
    /* 调差幅度 ±3% 以内——一个月调 40% 的差，说明前面的成本核算整个是错的 */
    const after = Math.round(before * between(0.97, 1.03, `a|${seed}`, 4));
    return {
      id: `CAD-${a.id}-${def.itemNo}`,
      period: a.period,
      unitId: a.unitId,
      itemNo: def.itemNo,
      itemName: def.itemName,
      beforeAmount: before,
      afterAmount: after,
      diffAmount: after - before,
      reason: ADJUST_REASONS[(ai + di) % ADJUST_REASONS.length],
      operator: pick(["吴工", "赵工", "钱工"], `op|${seed}`),
      auditUser: pick(["吴工", "周工"], `au|${seed}`),
      adjustTime: `${a.period}-30 17:20:00`,
      status: a.status === "已调差" ? "已调差" : "已锁定",
    } satisfies CostAdjust;
  }),
);

/** `COST_SOURCE` 的再导出：TC0001 的「来源」列直接读它，页面不自己写一份 */
export { COST_SOURCE };
