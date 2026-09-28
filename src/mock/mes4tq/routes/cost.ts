import type { RouteMap } from "../../admin/core";
import { allOf, eq, getHandler, like, listAll, listHandler, numRange } from "../query";
import { COST_ANALYSES, COST_ADJUSTS, COST_ITEM_DEFS, COST_ITEM_PRICES, COST_SOURCE } from "../data/cost";
import { DEMO_PERIOD } from "../data/model";

/**
 * TC 成本归集的只读端点（3 页，**只查桩**）。
 *
 * **六个成本分项在数据层就是 `model.costBreakdown()` 现算的**，
 * 所以这里**没有任何一处手写金额**——`structure`（构成饼图）与 `compare`（工序对比+趋势）
 * 两个聚合端点都只是把同一批 `COST_ANALYSES` 再读一遍、换个切面。
 * 手写第二份金额会与 model 打架，而页面照样渲染、没有任何工具会报错。
 *
 * 路由键与 `src/api/mes4tq/index.ts` 已声明的方法**逐个对上**，那文件是契约。
 */
export const costRoutes: RouteMap = {
  /* ── TC0001 成本项单价维护 ──────────────────────────────────────────── */

  "post /tqmes/costPrice/listPage": listHandler(
    () => COST_ITEM_PRICES,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "itemNo"],
          ["keyword", "itemName"],
          ["keyword", "category"],
        ]),
        eq(q, [
          ["itemNo", "itemNo"],
          ["category", "category"],
          ["date", "date"],
          ["workshopCode", "workshopCode"],
        ]),
        numRange(q, "price", "minPrice", "maxPrice"),
      ),
  ),

  /**
   * 成本项字典（TC0001 的上半屏与 TC0002 的构成下拉共用）。
   * **带 `category`（数据来源）**——B1 的成本结构表要求答得出「这个数是谁给的」：
   * 原料/燃料是 MES 收集、辅材/备件是 ERP-IN 抛送、能源是 EMS 抛送、人员是 ERP-HR。
   */
  "get /tqmes/costPrice/items": listAll(() =>
    COST_ITEM_DEFS.map((d) => ({ ...d, source: COST_SOURCE[d.category] ?? "MES 收集" })),
  ),

  /* ── TC0002 成本分析 ────────────────────────────────────────────────── */

  "post /tqmes/costAnalysis/listPage": listHandler(
    () => COST_ANALYSES,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "unitId"],
          ["keyword", "period"],
          ["keyword", "status"],
        ]),
        eq(q, [
          ["unitId", "unitId"],
          ["period", "period"],
          ["status", "status"],
        ]),
        numRange(q, "totalCost", "minCost", "maxCost"),
      ),
  ),

  /**
   * 成本构成（TC0002 的饼图）。
   *
   * `period` 必给（不给就用当前账期）——饼图是**某一期的构成**，
   * 跨期合计没有意义。六项各自求和后再算占比，
   * 而不是先算占比再平均：两者的分母不同，平均占比会与总额对不上。
   */
  "get /tqmes/costAnalysis/structure": getHandler((q) => {
    const period = q.period ? String(q.period) : DEMO_PERIOD;
    const rows = COST_ANALYSES.filter((a) => a.period === period);
    const sum = (k: "rawMaterialCost" | "fuelCost" | "auxiliaryCost" | "sparePartCost" | "energyCost" | "laborCost") =>
      rows.reduce((s, a) => s + a[k], 0);
    const items = [
      { key: "rawMaterialCost", name: "原料成本", value: sum("rawMaterialCost") },
      { key: "fuelCost", name: "燃料成本", value: sum("fuelCost") },
      { key: "auxiliaryCost", name: "辅材成本", value: sum("auxiliaryCost") },
      { key: "sparePartCost", name: "备件成本", value: sum("sparePartCost") },
      { key: "energyCost", name: "能源成本", value: sum("energyCost") },
      { key: "laborCost", name: "人员成本", value: sum("laborCost") },
    ].map((x) => ({ ...x, source: COST_SOURCE[`${x.key}Cost`] ?? "MES 收集" }));
    const total = items.reduce((s, x) => s + x.value, 0);
    return {
      period,
      rows: rows.length,
      total,
      items: items.map((x) => ({ ...x, pct: Math.round((x.value / Math.max(1, total)) * 10000) / 100 })),
    };
  }),

  /**
   * 工序成本对比 + 趋势（TC0002 的柱线混排）。
   *
   * `trend` 是**同一个机组近 6 期**的成本曲线——这样「对比」与「趋势」
   * 两张图用同一份数据出，不会出现柱子和线各算各的。
   */
  "get /tqmes/costAnalysis/compare": getHandler((q) => {
    const period = q.period ? String(q.period) : DEMO_PERIOD;
    const rows = COST_ANALYSES.filter((a) => a.period === period);
    const periods = [...new Set(COST_ANALYSES.map((a) => a.period))].toSorted().slice(-6);
    return {
      period,
      /* 按工序分组的对比行：同一期各机组一行（TC0002 的柱状图） */
      bars: rows.map((r) => ({
        unitId: r.unitId,
        totalCost: r.totalCost,
        unitCost: r.unitCost,
        outputQty: r.outputQty,
      })),
      /* 按机组的近 6 期曲线（同一张图的折线部分） */
      periods,
      trend: [...new Set(rows.map((r) => r.unitId))].map((unitId) => ({
        unitId,
        data: periods.map((p) => COST_ANALYSES.find((a) => a.period === p && a.unitId === unitId)?.totalCost ?? 0),
      })),
      /* 月结状态分布：客户问「这个月结了没」时看它 */
      statusCount: rows.reduce(
        (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
        {} as Record<string, number>,
      ),
    };
  }),

  /* ── TC0003 成本调差记录 ────────────────────────────────────────────── */

  "post /tqmes/costAdjust/listPage": listHandler(
    () => COST_ADJUSTS,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "itemNo"],
          ["keyword", "itemName"],
          ["keyword", "reason"],
          ["keyword", "operator"],
        ]),
        eq(q, [
          ["period", "period"],
          ["unitId", "unitId"],
          ["itemNo", "itemNo"],
          ["status", "status"],
        ]),
        /* 调差金额区间（「哪些调差超过 10 万」是审计的常用问法） */
        numRange(q, "diffAmount", "minDiff", "maxDiff"),
      ),
  ),

  /** 账期候选（三张成本页共用同一个账期下拉） */
  "get /tqmes/cost/periods": listAll(() => [...new Set(COST_ANALYSES.map((a) => a.period))].toReversed()),
};
