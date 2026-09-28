import type { RouteMap } from "../../admin/core";
import { allOf, dayRange, eq, getHandler, like, listHandler } from "../query";
import { DEMAND_PLANS, MONTHLY_PLANS, PURCHASE_PLANS, TECH_PLANS } from "../data/plan";
import { INDICATOR_BY_NAME } from "../data/basic";

/**
 * TP 计划管理的只读端点（4 页，**只查桩**）。
 *
 * 四页是一条**倒推链**（技经指标 → 月计划 → 需求计划 → 采购计划），
 * 所以除了各自分页，还多两个**跨层**端点：
 * - `/monthlyPlan/chain` 给整棵倒推树（TP0002 的树形展示）；
 * - `/techIndicator/compare` 给计划 vs 实际（TP0001 的对比列）。
 * 没有这两个端点，页面就得自己在前端把 level 1/2/3 拼成链——
 * 而拼链的逻辑应该只有一份，否则每页各拼一次会对不上。
 *
 * 路由键与 `src/api/mes4tq/index.ts` 已声明的方法**逐个对上**，那文件是契约。
 */
export const planRoutes: RouteMap = {
  /* ── TP0001 技经指标管理 ────────────────────────────────────────────── */

  "post /tqmes/techIndicator/listPage": listHandler(
    () => TECH_PLANS,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "planItem"],
          ["keyword", "workstation"],
          ["keyword", "planType"],
        ]),
        eq(q, [
          ["workstation", "workstation"],
          ["workshop", "workshop"],
          ["planType", "planType"],
          ["planItem", "planItem"],
        ]),
        (row) => {
          const y = String(q.year ?? "");
          if (y && String(row.year) !== y) return false;
          const m = q.month === undefined || q.month === "" ? null : Number(q.month);
          if (m !== null && Number(row.month) !== m) return false;
          /* 完成率区间（TP0001 的「哪些没达标」筛选）：只给一端就是单边 */
          const lo = q.minRate === undefined || q.minRate === "" ? null : Number(q.minRate);
          const hi = q.maxRate === undefined || q.maxRate === "" ? null : Number(q.maxRate);
          if (lo !== null && (row.rate ?? 0) < lo) return false;
          if (hi !== null && (row.rate ?? 0) > hi) return false;
          return true;
        },
      ),
  ),

  /**
   * 计划 vs 实际（TP0001 的对比视图）。
   *
   * 只回**启用**的指标（`TG0005` 里 `enabled=false` 的是与其它口径重叠的定义，
   * 同时给两边算就等于重复计数——这是报表页最容易犯的错）。
   */
  "get /tqmes/techIndicator/compare": getHandler((q) => {
    const period = q.period ? String(q.period).replace("-", "") : "";
    const y = period.slice(0, 4);
    const m = period.slice(4, 6);
    return TECH_PLANS.filter(
      (t) =>
        String(t.year) === y &&
        String(Number(t.month)) === Number(m) &&
        (INDICATOR_BY_NAME[t.planItem ?? ""]?.enabled ?? true),
    ).map((t) => ({
      ...t,
      formula: INDICATOR_BY_NAME[t.planItem ?? ""]?.formula ?? "",
      granularity: INDICATOR_BY_NAME[t.planItem ?? ""]?.granularity ?? "",
      /* 完成率的方向：焦比/煤比/单耗类是**越低越好**，100% 以下反而是好事。
         页面按 `direction` 决定「达不达标」的颜色，不知道方向就会把达标标红 */
      direction: /焦比|煤比|单耗|成本|返矿率/.test(t.planItem ?? "") ? "lower" : "higher",
    }));
  }),

  /* ── TP0002 月生产计划编制 ──────────────────────────────────────────── */

  "post /tqmes/monthlyPlan/listPage": listHandler(
    () => MONTHLY_PLANS,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "unitId"],
          ["keyword", "productType"],
          ["keyword", "status"],
        ]),
        eq(q, [
          ["unitId", "unitId"],
          ["productType", "productType"],
          ["status", "status"],
          ["period", "period"],
          ["level", "level"],
        ]),
        (row) => {
          const lo = q.min === undefined || q.min === "" ? null : Number(q.min);
          const hi = q.max === undefined || q.max === "" ? null : Number(q.max);
          if (lo !== null && row.targetOutput < lo) return false;
          if (hi !== null && row.targetOutput > hi) return false;
          return true;
        },
      ),
  ),

  /**
   * 倒推链：给某一期的**整棵树**（level 1 铁水 → 2 烧结/球团 → 3 原料）。
   *
   * A2 那句「铁水→烧结→球团→原料 倒推」在数据里就是 `level` + `parentId`，
   * 这个端点把它们接成链。不给 `period` 就回最近一期——
   * 页面一进来要能看到链，空着首屏等于没演示。
   */
  "get /tqmes/monthlyPlan/chain": getHandler((q) => {
    const period = q.period ? String(q.period).replace("-", "") : "";
    const pool = period
      ? MONTHLY_PLANS.filter((p) => p.period === period)
      : MONTHLY_PLANS.filter(
          (p) =>
            p.period ===
            MONTHLY_PLANS.map((x) => x.period)
              .toSorted()
              .at(-1),
        );
    /* 按 level 分组返回，页面不必再排一次——level 就是倒推顺序本身 */
    return [1, 2, 3].flatMap((lv) => pool.filter((p) => p.level === lv));
  }),

  /* ── TP0003 需求计划管理 ────────────────────────────────────────────── */

  "post /tqmes/demandPlan/listPage": listHandler(
    () => DEMAND_PLANS,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "materialId"],
          ["keyword", "monthlyPlanId"],
        ]),
        eq(q, [
          ["materialId", "materialId"],
          ["monthlyPlanId", "monthlyPlanId"],
          ["status", "status"],
          ["period", "period"],
        ]),
        /* 「只看需要采购的」——`netDemand > 0` 是这页最常用的筛选，
           所以给它一个独立的布尔参数，而不是让页面自己过滤（服务端给的总数才准） */
        (row) => {
          if (q.needPurchase === "true" && row.netDemand <= 0) return false;
          if (q.needPurchase === "false" && row.netDemand > 0) return false;
          const lo = q.min === undefined || q.min === "" ? null : Number(q.min);
          if (lo !== null && row.netDemand < lo) return false;
          return true;
        },
      ),
  ),

  /* ── TP0004 采购计划管理 ────────────────────────────────────────────── */

  "post /tqmes/purchasePlan/listPage": listHandler(
    () => PURCHASE_PLANS,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "materialId"],
          ["keyword", "suppName"],
          ["keyword", "id"],
        ]),
        eq(q, [
          ["materialId", "materialId"],
          ["suppName", "suppName"],
          ["status", "status"],
        ]),
        dayRange(q, "expectDate"),
        (row) => {
          const lo = q.min === undefined || q.min === "" ? null : Number(q.min);
          const hi = q.max === undefined || q.max === "" ? null : Number(q.max);
          if (lo !== null && row.amount < lo) return false;
          if (hi !== null && row.amount > hi) return false;
          return true;
        },
      ),
  ),

  /**
   * 供方候选（TP0004 的供应商下拉）。
   * 与 `PURCHASE_PLANS` 同源，所以「下拉里有的供方一定出现在表里」——
   * 各写一份名单就会出现能筛出 0 行的选项。
   */
  "get /tqmes/supplier/list": getHandler(() => {
    const by = new Map<string, string>();
    for (const p of PURCHASE_PLANS) if (p.suppId && p.suppName) by.set(p.suppId, p.suppName);
    return [...by.entries()].map(([id, name]) => ({ id, name }));
  }),
};
