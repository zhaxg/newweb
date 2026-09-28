import type { RouteMap } from "../../admin/core";
import { getHandler } from "../query";
import { BOARD_BY_KIND, BOARD_SHELL, type BoardKind } from "../data/board";

/**
 * TD 大屏看板的只读端点（3 张屏，**只查桩**）。
 *
 * 三张屏**共用一个数据构造器**（`data/board.ts` 的 `BOARD_BY_KIND`），
 * 分三个路由键是因为页面要的是三条独立的 URL——
 * 烧结大屏与高炉大屏分开取，各自轮询各自的数，
 * 而不是一次取全部再在前端挑（那会让烧结屏每 5s 白拉一遍高炉的数据）。
 *
 * 返回形状统一是 `BoardData`（`{title, clock, kpis, times, series, alarms}`）：
 * 三张屏的**版式完全一致**（B8 给的工艺区域色 + KPI 墙 + 曲线 + 报警条），
 * 差别只在数据。所以页面也只有一份 `ScreenBoard.vue`，换 `kind` 入参。
 *
 * ⚠️ 大屏上的每个数都来自 `model.ts` 的派生函数——**屏上没有一处手写数字**。
 * 客户拿大屏与报表页交叉核，两处必须相等，否则就露出「两套数据」的马脚。
 *
 * 路由键与 `src/api/mes4tq/index.ts` 已声明的方法**逐个对上**，那文件是契约。
 */
export const boardRoutes: RouteMap = {
  /** TD0001 烧结生产大屏 */
  "get /tqmes/board/sinter": getHandler(() => boardData("sinter")),

  /** TD0002 高炉运行大屏 */
  "get /tqmes/board/blast": getHandler(() => boardData("blast")),

  /** TD0003 铁水运行信息汇总 */
  "get /tqmes/board/iron": getHandler(() => boardData("iron")),

  /**
   * 三张屏的**标题与色**（屏的外壳，不含数据）。
   *
   * 单独给一个端点是因为 `ScreenBoard` 挂载时要先知道「我这块屏叫什么、
   * 用哪块工艺色」，而数据是 5s 轮询的——外壳不该跟着数据一起刷。
   */
  "get /tqmes/board/shell": getHandler((q) => {
    const kind = (q.kind as BoardKind) ?? "sinter";
    /* ⚠️ 壳在 `BOARD_SHELL`、数据在 `BOARD_BY_KIND`（后者是**构造函数**不是数据）——
       早先读错了表，`b.areaKey` 恒 undefined，屏的工艺色会整块失效 */
    const b = BOARD_SHELL[kind];
    /* 只回壳（标题 + 工艺色键 + 口径说明），不含数据——外壳不该跟着 5s 轮询一起刷 */
    return b ? { ...b } : null;
  }),
};

function boardData(kind: BoardKind) {
  const build = BOARD_BY_KIND[kind];
  if (!build) return null;
  return build();
}
