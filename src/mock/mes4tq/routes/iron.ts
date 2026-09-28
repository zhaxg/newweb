import type { RouteMap } from "../../admin/core";
import { allOf, dayRange, eq, getHandler, like, listAll, listHandler, numRange } from "../query";
import { LADLES, TAPPING_ACTUALS, TAPPING_PLANS } from "../data/iron";
import { unitsOfProcess } from "../data/org";

/**
 * TM 铁水调度的只读端点（3 页，**只查桩**）。
 *
 * 三张表挂在**同一个铁次 `tapNo`** 上（B11 第 2 条：一个铁次 = 一次出铁），
 * 所以除了各自的分页，还有一个跨页联动点：
 * `/ladle/byLocation` 把罐按位置分组——那是 TM0002 的罐位图与 TD0003 大屏
 * 共用的读取，两处必须来自同一批罐，否则大屏上的罐与表里的罐对不上。
 *
 * 路由键与 `src/api/mes4tq/index.ts` 已声明的方法**逐个对上**，那文件是契约。
 */
export const ironRoutes: RouteMap = {
  /* ── TM0001 出铁计划（L7 流程看板 / L1 列表）────────────────────────── */

  "post /tqmes/tappingPlan/listPage": listHandler(
    () => TAPPING_PLANS,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "furnaceId"],
          ["keyword", "ladleId"],
          ["keyword", "destination"],
        ]),
        eq(q, [
          ["furnaceId", "furnaceId"],
          ["status", "status"],
          ["destination", "destination"],
          ["tapHole", "tapHole"],
        ]),
        dayRange(q, "tapTime"),
        /* 铁次区间（「今天第几个铁次」是现场的常用问法） */
        numRange(q, "tapNo", "minTapNo", "maxTapNo"),
      ),
  ),

  "get /tqmes/tappingPlan/detail": getHandler((q) => TAPPING_PLANS.find((p) => p.id === String(q.id)) ?? null),

  /**
   * 出铁计划的流转统计（流程看板的列头计数）。
   * 与行同源——列头数与卡片数对不上，客户一眼看出看板是假的。
   */
  "get /tqmes/tappingPlan/flow": listAll(() => {
    const out: Record<string, number> = { 计划: 0, 出铁中: 0, 已完成: 0, 已取消: 0 };
    for (const p of TAPPING_PLANS) out[p.status] = (out[p.status] ?? 0) + 1;
    return out;
  }),

  /** 三座高炉的候选（出铁计划与过磅台账共用同一个下拉） */
  "get /tqmes/tappingPlan/furnaces": listAll(() =>
    unitsOfProcess("blast").map((u) => ({ id: u.id, name: u.name, spec: u.spec ?? "" })),
  ),

  /* ── TM0002 铁水罐管理 ──────────────────────────────────────────────── */

  "post /tqmes/ladle/listPage": listHandler(
    () => LADLES,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "location"],
          ["keyword", "furnaceId"],
        ]),
        eq(q, [
          ["status", "status"],
          ["location", "location"],
          ["furnaceId", "furnaceId"],
        ]),
        numRange(q, "capacity", "minCap", "maxCap"),
        /* 罐龄筛选：`lifeRatio ≥ 0.9` 是页面上「该修了」的最常用入口，
           所以给它独立的参数而不是让页面自己过滤（服务端给的总数才准） */
        (row) => {
          const lo = q.minLife === undefined || q.minLife === "" ? null : Number(q.minLife);
          const hi = q.maxLife === undefined || q.maxLife === "" ? null : Number(q.maxLife);
          if (lo !== null && Number(row.lifeRatio ?? 0) < lo) return false;
          if (hi !== null && Number(row.lifeRatio ?? 0) > hi) return false;
          return true;
        },
      ),
  ),

  /**
   * 按位置分组（罐位图与 TD0003 大屏共用）。
   *
   * 一次全给——罐只有 30 个，而罐位图要的是**整幅分布**，
   * 分页会拼不出「高炉旁有几个罐」。
   */
  "get /tqmes/ladle/byLocation": listAll(() => {
    const by = new Map<string, typeof LADLES>();
    for (const l of LADLES) by.set(l.location, [...(by.get(l.location) ?? []), l]);
    return Object.fromEntries(by);
  }),

  /* ── TM0003 铁水过磅台账 ────────────────────────────────────────────── */

  "post /tqmes/tappingActual/listPage": listHandler(
    () => TAPPING_ACTUALS,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "furnaceId"],
          ["keyword", "ladleId"],
          ["keyword", "tapHole"],
        ]),
        eq(q, [
          ["furnaceId", "furnaceId"],
          ["ladleId", "ladleId"],
          ["destination", "destination"],
          ["tapHole", "tapHole"],
        ]),
        dayRange(q, "tapStartTime"),
        numRange(q, "weight"),
        /* 温降筛选（「温降超过 70℃ 的」是这一页最常被问的一条） */
        (row) => {
          const lo = q.minDrop === undefined || q.minDrop === "" ? null : Number(q.minDrop);
          if (lo !== null && Number(row.tempDrop ?? 0) < lo) return false;
          return true;
        },
      ),
  ),

  "get /tqmes/tappingActual/detail": getHandler((q) => TAPPING_ACTUALS.find((a) => a.id === String(q.id)) ?? null),
};
