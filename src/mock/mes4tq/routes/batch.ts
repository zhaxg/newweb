import type { RouteMap } from "../../admin/core";
import { allOf, eq, getHandler, like, listHandler } from "../query";
import { BATCHING_PLANS } from "../data/batch";

/**
 * TB 配料管理的只读端点（4 页共用一张表 `TPM_2010`，**只查桩**）。
 *
 * 四道工序（混匀/烧结/球团/高炉）**共用同一批端点**，靠 `process` 分流——
 * 与 TW 六工序的料仓变料/投料/收料是同一条道理（见 `routes/work.ts` 文件头）。
 * 拆成四个端点会让四页打不同路径却读同一张表，而工序统计页还要一个「混查」的入口。
 *
 * `/batching/items` 是 **L3 主从双表**的下表：主表选中一条计划、下表出它的配比明细。
 * 明细**不单独分页**——一个计划最多七八种料，分页是把 6 行拆成 6 页。
 *
 * 路由键与 `src/api/mes4tq/index.ts` 已声明的方法**逐个对上**，那文件是契约。
 */
export const batchRoutes: RouteMap = {
  "post /tqmes/batching/listPage": listHandler(
    () => BATCHING_PLANS,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "planDesc"],
          ["keyword", "mixCenter"],
          ["keyword", "batchNo"],
          ["keyword", "unitId"],
        ]),
        eq(q, [
          ["process", "process"],
          ["unitId", "unitId"],
          ["status", "status"],
          ["planType", "planType"],
        ]),
        (row) => {
          /* 预测成本区间（TB 各页「成本超 X 的计划」筛选） */
          const lo = q.minCost === undefined || q.minCost === "" ? null : Number(q.minCost);
          const hi = q.maxCost === undefined || q.maxCost === "" ? null : Number(q.maxCost);
          if (lo !== null && (row.predictedCost ?? 0) < lo) return false;
          if (hi !== null && (row.predictedCost ?? 0) > hi) return false;
          /* 计划状态的数字口径（真实表的 `N_STATUS` 0/1/2/3）也能筛——
             页面下拉显示中文、`valueMap` 翻成数字送进来 */
          const ns = q.nStatus === undefined || q.nStatus === "" ? null : Number(q.nStatus);
          if (ns !== null && row.nStatus !== ns) return false;
          return true;
        },
      ),
  ),

  /**
   * 配比明细（L3 下表）。
   * 不给 `planId` 就返回**第一条计划的配比**——页面首次渲染在没选中主行时，
   * 下表不该是空的（空表客户会以为这页没做完）。
   */
  "get /tqmes/batching/items": getHandler((q) => {
    const id = q.planId ? String(q.planId) : (BATCHING_PLANS[0]?.id ?? "");
    const plan = BATCHING_PLANS.find((p) => p.id === id);
    if (!plan) return [];
    /* 每一项补上物料单价与该项的成本贡献，下表就能直接看出「哪一项最贵」——
       单价的唯一真源是 `MATERIALS.costPrice`（TG0002），这里只做一次加法 */
    return plan.ratio.map((it) => ({
      ...it,
      planId: plan.id,
      plannedOutput: plan.plannedOutput,
      /* 目标重量按计划产量重算，而不是沿用种子里的 ×100 —— 种子那个只是比例占位，
         真值必须 = 配比 × 计划产量 / 100，否则「目标重量 ÷ 计划产量 ≠ 配比」能被当场戳穿 */
      targetWeight: Math.round(((plan.plannedOutput ?? 0) * it.ratioPct) / 100),
      /* 偏差列先留空：执行后才有实际值，本域只查桩所以永远为空——
         空就显示「—」，给 0 会让客户以为完美执行 */
      actualWeight: undefined,
      deviation: undefined,
    }));
  }),

  "get /tqmes/batching/detail": getHandler((q) => BATCHING_PLANS.find((p) => p.id === String(q.id)) ?? null),
};
