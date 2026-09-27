import type { RouteMap } from "../admin/core";
import * as M from "./data/model";
import { energyActionRoutes } from "./actions";
import { energyListRoutes } from "./lists";
import { energyMonitorRoutes } from "./monitor";
import { energyOverviewRoutes } from "./overview";
import { bootstrap, scanVerifyDeadlines } from "./store";

/**
 * 能源管理（EMS）演示域 mock 的路由汇总，`mockAdapter.ts` 只 `...energyRoutes` 一句。
 *
 * 分工（与 carbon / equipment 域同构，但**代码各自一份、零跨域 import**——
 * 三个域的过滤语义与联动链不同，共用一份助手会让"改一刀抖三域"）：
 *   data/model.ts   全站唯一的数值推导层（业务数字只许出现在这里）
 *   data/seed.ts    非派生种子（计量点、通道、仪表、规则、电价模板、人名、拓扑图元）
 *   data/rescs.ts   29 个菜单叶子
 *   store.ts        唯一的可变状态与全部跨模块联动
 *   query.ts        分页 + 条件过滤助手
 *   lists.ts        有分页的列表端点
 *   monitor.ts      EM 监控与调度：四张画布的组合 DTO、what-if 仿真、剧本入口、报警与调度令闭环
 *   overview.ts     无分页的聚合读取（下拉候选、单元树、人名）
 *   actions.ts      写操作与状态机推进
 *
 * 装配时刻做两件事，都必须是**幂等**的（路由表在 dev 热更时可能重建）：
 * 1. `bootstrap()` 铺月账、柜位与剧本种子——没有它，第一个页面打开就是空表，
 *    而"演示系统一打开是空的"比数值对不上更容易被当成没做完。
 * 2. `scanVerifyDeadlines()` 把特种设备/计量器具的临期与超期变成**报警中心的行**。
 *    放在这里而不是埋在某个页面的 `onMounted`：演示不要求观众先点进 EC0004 才能看到超期，
 *    首页角标和大屏的"超期未检"数字从第一次打开就要非零。
 */
export const energyRoutes: RouteMap = {
  /* 查询在前：动作端点里若有与查询同名的路径，查询必须赢（当前没有同名，顺序是防御性的） */
  ...energyListRoutes,
  ...energyMonitorRoutes,
  ...energyOverviewRoutes,
  ...energyActionRoutes,
};

bootstrap();
scanVerifyDeadlines();

/**
 * 数值自洽的 dev 期守卫。
 *
 * 本仓 `vue-tsc` 已退役、`oxlint` 不做类型检查，构建也只会告诉你"能编译"，
 * 而能源域真正的风险是**数对不上**：改一个介质系数、动一条定额，平衡表与结算就可能悄悄错位，
 * 画面照样渲染、没有任何工具会报错。`model.selfCheck()` 把这几条守恒等式写成断言，
 * 在 dev 下每次装载跑一遍，违规就整排打到 console，开页第一眼就能撞见。
 *
 * 为什么**不 throw**：这里抛出去等于整个应用白屏，而派生层的一处口径争议不该让演示开不了场。
 * 检查项本身住在 model（它才知道每个数从哪来），这里只负责"什么时候跑"。
 */
if (import.meta.env.DEV) {
  const bad = M.selfCheck();
  if (bad.length) {
    console.error(`[energy] 数值自洽检查未通过 ${bad.length} 项：`);
    for (const line of bad) console.error(`  · ${line}`);
  }
}
