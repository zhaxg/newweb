import type { RouteMap } from "../../admin/core";
import { allOf, dayRange, eq, getHandler, like, listAll, listHandler, numRange } from "../query";
import { STORE_LOCATIONS, STORE_ROOMS } from "../data/org";
import { STOCK_BALANCES, STOCK_RECORDS, STOCK_TXNS, YARD_PILES } from "../data/stock";

/**
 * TS 物料与库存的只读端点（4 页，**只查桩**）。
 *
 * 库房/库位的**定义**与 `org.ts` 同源（TW 的料仓挂的是同一批库位），
 * 这里只放库存、流水、收发存、料场四组读取。
 *
 * `/stock/balance` 是**收发存**：按料号 + 库房聚合，`begin + in - out = end` 必须成立
 * （见 `data/stock.ts` 的 `STOCK_BALANCES` 说明）。页面拿它验算，页面不自己聚合——
 * 两处聚合口径必然不同，而收发存表的全部价值就是「能对得上」。
 *
 * 路由键与 `src/api/mes4tq/index.ts` 已声明的方法**逐个对上**，那文件是契约。
 */
export const stockRoutes: RouteMap = {
  /* ── TS0001 库房库位管理（L2 左树右表）───────────────────────────────── */

  /** 库房（树的一层） */
  "get /tqmes/store/rooms": listAll(() => STORE_ROOMS),

  /** 库位（树的叶子 + 右表）。`roomCode` 不给就回全量（默认「全部库房」） */
  "get /tqmes/store/locations": getHandler((q) =>
    q.roomCode ? STORE_LOCATIONS.filter((l) => l.storeRoomCode === String(q.roomCode)) : STORE_LOCATIONS,
  ),

  /**
   * 库位分页（右表）。
   * **当前堆存从 `STOCK_RECORDS` 现算**，不是库存位定义里写死的一个数——
   * 定义给的是「库位有多大」（capacity），堆存是「现在放了多少」，
   * 后者会随流水变，写进定义里就永远停在装配那一刻。
   */
  "post /tqmes/storeLocation/listPage": listHandler(
    () =>
      STORE_LOCATIONS.map((l) => {
        const rows = STOCK_RECORDS.filter((r) => r.storePositionCode === l.id);
        const dry = rows.reduce((s, r) => s + r.dryWeight, 0);
        return {
          ...l,
          dryWeight: dry,
          stock: rows.length ? Math.round((dry / Math.max(1, l.capacity ?? dry)) * 100) : 0,
          materialCount: new Set(rows.map((r) => r.materialId)).size,
          /* 满仓率 0-100 的百分比，供 `levelBarRenderer` 画条 */
          levelPct: rows.length ? Math.round((dry / Math.max(1, l.capacity ?? dry)) * 100) : 0,
          hiLimit: 95,
          loLimit: 0,
        };
      }),
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "name"],
          ["keyword", "storeRoomCode"],
        ]),
        eq(q, [["storeRoomCode", "storeRoomCode"]]),
        numRange(q, "levelPct", "minLevel", "maxLevel"),
      ),
  ),

  /* ── TS0002 库存管理（实物库存 + 收发存）─────────────────────────────── */

  "post /tqmes/stock/listPage": listHandler(
    () => STOCK_RECORDS,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "materialId"],
          ["keyword", "batchNo"],
          ["keyword", "storePositionCode"],
          ["keyword", "cargoName"],
          ["keyword", "supplierDesc"],
        ]),
        eq(q, [
          ["materialId", "materialId"],
          ["storeRoomCode", "storeRoomCode"],
          ["storePositionCode", "storePositionCode"],
          ["unit", "unit"],
        ]),
        /* 水分区间（原燃料的质量筛选）与干重区间（「哪一堆超过 3 万吨」） */
        numRange(q, "h2o", "minH2o", "maxH2o"),
        numRange(q, "dryWeight"),
      ),
  ),

  "get /tqmes/stock/detail": getHandler((q) => STOCK_RECORDS.find((r) => r.id === String(q.id)) ?? null),

  /**
   * 收发存汇总（按料号 + 库房）。
   *
   * 为什么不给分页：这一屏就是**整张收发存表**，按料号 × 库房也就一百来行，
   * 分页会让客户看到「第 1 页 20 行」而对不上他手里的表。
   */
  "get /tqmes/stock/balance": listAll(() => STOCK_BALANCES),

  /* ── TS0003 出入库记录查询（流水账）─────────────────────────────────── */

  "post /tqmes/stockTxn/listPage": listHandler(
    () => STOCK_TXNS,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "materialId"],
          ["keyword", "batchNo"],
          ["keyword", "docNo"],
          ["keyword", "operator"],
        ]),
        eq(q, [
          ["materialId", "materialId"],
          ["direction", "direction"],
          ["moveType", "moveType"],
          ["storeRoomCode", "storeRoomCode"],
          ["storePositionCode", "storePositionCode"],
        ]),
        dayRange(q, "txnTime"),
        numRange(q, "dryWeight"),
      ),
  ),

  /* ── TS0004 料场可视化 ──────────────────────────────────────────────── */

  /** 料场料条与堆（一次全给：料场图画的是**整片厂区**，分页拼不出一张图） */
  "get /tqmes/yard/piles": listAll(() => YARD_PILES),

  "post /tqmes/yard/listPage": listHandler(
    () => YARD_PILES,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "pileNo"],
          ["keyword", "stripNo"],
          ["keyword", "materialId"],
        ]),
        eq(q, [
          ["stripNo", "stripNo"],
          ["status", "status"],
          ["materialId", "materialId"],
        ]),
        numRange(q, "qty"),
      ),
  ),

  /* ── 跨页候选（给下拉，不与任何单页绑死）─────────────────────────────── */
};
