import type { RouteMap } from "../admin/core";
import { equipmentActionRoutes } from "./actions";
import { equipmentListRoutes } from "./lists";
import { equipmentOverviewRoutes } from "./overview";
import { scanDeadlines } from "./store";

/**
 * 设备管理（EAM/PHM）演示域 mock 的路由汇总，`mockAdapter.ts` 只 `...equipmentRoutes` 一句。
 *
 * 分工（与 carbon 域同构，只多一个 overview 层）：
 *   data/*.ts        种子数据 + 系统参数 + 模拟量脚本
 *   store.ts         唯一的可变状态与**全部跨模块联动**（工单关闭→履历/健康度/寿命/报警）
 *   query.ts         分页 + 条件过滤助手
 *   lists.ts         有分页的列表端点（`POST /eam/<实体>/listPage`）
 *   overview.ts      无分页的聚合读取（驾驶舱、健康看板、KPI、结构树、实时曲线、PHM）
 *   actions.ts       写操作与状态机推进（会真的改 store）
 *
 * `scanDeadlines()` 挂在路由表装配这一刻：特种设备超期、计量临检、备件寿命这三条红线
 * 要变成**报警中心的行**和**驾驶舱的待办数**，而演示不要求观众先点进哪个页面。
 * 放在这里而不是埋在 store 顶层，是为了让「种子装好就扫」这个时机写在明面上；
 * 幂等由 store 里的 `scanned` 闸保证（聚合视图每次也调它，重复调用等于零成本）。
 */
export const equipmentRoutes: RouteMap = {
  /* 查询在前：写/动作端点里若有与查询同名的路径，查询必须赢（当前没有同名，顺序是防御性的） */
  ...equipmentListRoutes,
  ...equipmentOverviewRoutes,
  ...equipmentActionRoutes,
};

scanDeadlines();
