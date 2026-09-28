import type { RouteMap } from "../../admin/core";
import { allOf, dayRange, eq, getHandler, like, listAll, listHandler } from "../query";
import { INSPECTION_ORDERS, QUALITY_BATCHES, QUALITY_STANDARDS, inspectionFlow, standardsOf } from "../data/quality";

/**
 * TQ 质量管理的只读端点（3 页，**只查桩**）。
 *
 * 三段链各一组：标准 → 委托 → 实绩。**没有写端点**（不发起委托、不回填判定），
 * 但**链上三个连接点都在**：
 * - 委托的 `testNo` 能查到它对应的实绩（`/qualityBatch` 按 `batchNo`/`testNo` 反查）；
 * - 实绩的每个 `items` 能查到它依据的标准（`/qualityStandard/byProduct`）。
 *
 * `/inspection/flow` 是 **L7 流程看板**的列头计数：六档 + 「复检」。
 * 计数必须来自同一批委托行，页面自己数会对不上——
 * 而列头数不对，客户一眼就看出「这看板是假的」。
 *
 * 路由键与 `src/api/mes4tq/index.ts` 已声明的方法**逐个对上**，那文件是契约。
 */
export const qualityRoutes: RouteMap = {
  /* ── TQ0001 检验标准维护 ────────────────────────────────────────────── */

  "post /tqmes/qualityStandard/listPage": listHandler(
    () => QUALITY_STANDARDS,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "proName"],
          ["keyword", "inspecName"],
          ["keyword", "stdCode"],
          ["keyword", "roundRule"],
        ]),
        eq(q, [
          ["proName", "proName"],
          ["inspecName", "inspecName"],
          ["workshopCode", "workshopCode"],
          ["section", "section"],
        ]),
        (row) => {
          /* 「上下限」区间筛：`min ≥ x` 或 `max ≤ y`（查「有哪些项的上限不高于 y」） */
          const lo = q.min === undefined || q.min === "" ? null : Number(q.min);
          const hi = q.max === undefined || q.max === "" ? null : Number(q.max);
          if (lo !== null && (row.min ?? -Infinity) < lo) return false;
          if (hi !== null && (row.max ?? Infinity) > hi) return false;
          return true;
        },
      ),
  ),

  /**
   * 按品名取检验项（L3 主从双表的下表 / TQ0003 明细下钻共用）。
   * 不给 `proName` 就回**第一种品名**的项——页面首次渲染在没选中时不该是空的。
   */
  "get /tqmes/qualityStandard/byProduct": getHandler((q) => {
    const pro = q.proName ? String(q.proName) : (QUALITY_STANDARDS[0]?.proName ?? "");
    return standardsOf(pro);
  }),

  /** 品名候选（TQ0001 的品名下拉与 TQ0003 的品名下拉同源） */
  "get /tqmes/qualityStandard/products": listAll(() => [
    ...new Set(QUALITY_STANDARDS.map((s) => s.proName).filter((v): v is string => Boolean(v))),
  ]),

  /* ── TQ0002 检验委托管理（L7 流程看板）──────────────────────────────── */

  "post /tqmes/inspection/listPage": listHandler(
    () => INSPECTION_ORDERS,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "testNo"],
          ["keyword", "proName"],
          ["keyword", "mtalName"],
          ["keyword", "batchNo"],
          ["keyword", "smpUser"],
          ["keyword", "judgeUser"],
          ["keyword", "feBatchNo"],
        ]),
        eq(q, [
          ["status", "status"],
          ["proName", "proName"],
          ["inspTypeName", "inspTypeName"],
          ["judgeResult", "judgeResult"],
          ["bc", "bc"],
          ["bz", "bz"],
          ["feBatchNo", "feBatchNo"],
        ]),
        dayRange(q, "smpTime"),
      ),
  ),

  "get /tqmes/inspection/detail": getHandler((q) => INSPECTION_ORDERS.find((o) => o.id === String(q.id)) ?? null),

  /**
   * 委托流转统计（L7 列头计数）。
   * 六档 + 「复检」——**复检那一列必须有数**，它是 S3 状态机的末档；
   * 不给数客户会以为不合格的委托就此消失（见 `data/quality.ts` 的 `inspectionFlow`）。
   */
  "get /tqmes/inspection/flow": listAll(() => inspectionFlow()),

  /* ── TQ0003 检验实绩查询 ────────────────────────────────────────────── */

  "post /tqmes/qualityBatch/listPage": listHandler(
    () => QUALITY_BATCHES,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "batchNo"],
          ["keyword", "productName"],
          ["keyword", "feBatchNo"],
        ]),
        eq(q, [
          ["status", "status"],
          ["source", "source"],
          ["overallGrade", "overallGrade"],
          ["productName", "productName"],
          ["process", "process"],
        ]),
        dayRange(q, "sampleTime"),
        /* 「只看不合格」是这一页最常用的筛选，所以走**服务端**：
           总数要准，页面自己 filter 会让「共 N 条」和实际行数对不上 */
        (row) => {
          if (q.failOnly === "true" && row.overallGrade !== "不合格") return false;
          if (q.failOnly === "false" && row.overallGrade === "不合格") return false;
          return true;
        },
      ),
  ),

  /**
   * 实绩详情（含逐项 `items`）。
   * 每一项同时回**它依据的上下限**（`std`）——客户端不必再查一次标准，
   * 而且**判定与标准必须同屏**，否则客户看到「合格」却没有下限可对照，
   * 那个「合格」就是空口白话。
   */
  "get /tqmes/qualityBatch/detail": getHandler((q) => {
    const row = QUALITY_BATCHES.find((b) => b.id === String(q.id));
    if (!row) return null;
    return {
      ...row,
      items: row.items.map((it) => {
        const std = QUALITY_STANDARDS.find((s) => s.proName === row.productName && s.inspecName === it.itemName);
        return {
          ...it,
          std: std ? { min: std.min, max: std.max, section: std.section, roundRule: std.roundRule } : null,
        };
      }),
    };
  }),

  /** 来源下拉（进厂/工序产出/铁水 三档，B2 的 `source` 字段） */
  "get /tqmes/qualityBatch/sources": listAll(() => [...new Set(QUALITY_BATCHES.map((b) => b.source))]),
};
