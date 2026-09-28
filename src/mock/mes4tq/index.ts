import type { RouteMap } from "../admin/core";
import { basicRoutes } from "./routes/basic";
import { workRoutes } from "./routes/work";
import { planRoutes } from "./routes/plan";
import { batchRoutes } from "./routes/batch";
import { stockRoutes } from "./routes/stock";
import { qualityRoutes } from "./routes/quality";
import { ironRoutes } from "./routes/iron";
import { costRoutes } from "./routes/cost";
import { reportRoutes } from "./routes/report";
import { boardRoutes } from "./routes/board";
import { monitorRoutes } from "./routes/monitor";
import { integrateRoutes } from "./routes/integrate";
import { overviewRoutes } from "./routes/overview";
import { bootstrap } from "./store";
import * as M from "./data/model";

/**
 * 铁区MES（tqmes）演示域 mock 的路由汇总，`mockAdapter.ts` 只 `...tqmesRoutes` 一句。
 *
 * 分工（与 carbon / equipment / energy 域同构，但**代码各自一份、零跨域 import**）：
 *   data/rescs.ts     71 个菜单叶子（+ 首页）
 *   data/org.ts       组织骨架与主数据（工厂/车间/机组/物料/料仓/库房）
 *   data/people.ts    人名 / 班组 / 班次
 *   data/model.ts     **全站唯一的数值派生层**（业务数字只许出现在那里）
 *   data/<模块>.ts    各模块自己的不可再分种子
 *   routes/<模块>.ts  该模块的只读端点
 *   query.ts          分页 + 条件过滤助手
 *   store.ts          共享核心 `tq`（本域只查桩，所以没有可变状态，见它自己的文件头）
 *
 * ⚠️ **本域范围是「只查桩」**：全部端点都是 `listPage` / `list` / `detail` /
 * `tree` 这类读取，加一个 `POST /tqmes/export`（回文件名、不落盘）。
 * 没有 `save` / `remove` / 任何状态机推进端点——规格书 B7 那批「▶ 模拟触发」
 * 按钮在页面上以 `toolbar.extraButtons` 画出来、点了提示「待接入」（见 `listTypes.ts`）。
 *
 * 装配时刻做一件事，必须是**幂等**的：`bootstrap()`。
 * 本域没有需要预热的月账（没写操作 = 没有「第一个页面打开是空表」的问题），
 * 所以它是空的；留着是为了与碳/设备/能源三域同形，
 * 哪天补了写操作，预热该挂在这里，而不是散进某个页面的 `onMounted`。
 */
export const tqmesRoutes: RouteMap = {
  /* 查询在前：动作端点里若有与查询同名的路径，查询必须赢 */
  ...overviewRoutes,
  ...basicRoutes,
  ...workRoutes,
  ...monitorRoutes,
  ...planRoutes,
  ...batchRoutes,
  ...stockRoutes,
  ...qualityRoutes,
  ...ironRoutes,
  ...costRoutes,
  ...reportRoutes,
  ...boardRoutes,
  ...integrateRoutes,
};

bootstrap();

/**
 * 数值自洽的 dev 期守卫。
 *
 * 本仓 `vue-tsc` 已退役、`oxlint` 不做类型检查，构建也只会告诉你"能编译"，
 * 而本域真正的风险是**数对不上**：改一条利用系数的分母口径、动一下成本占比，
 * 报表与大屏就可能悄悄错位，画面照样渲染、没有任何工具会报错。
 * `model.selfCheck()` 把几条守恒等式写成断言，在 dev 下每次装载跑一遍，
 * 违规就整排打到 console，开页第一眼就能撞见。
 *
 * 为什么**不 throw**：这里抛出去等于整个应用白屏，而派生层的一处口径争议
 * 不该让演示开不了场。检查项住在 model（它才知道每个数从哪来），这里只负责"什么时候跑"。
 */
if (import.meta.env.DEV) {
  const bad = M.selfCheck();
  if (bad.length) {
    console.error(`[tqmes] 数值自洽检查未通过 ${bad.length} 项：`);
    for (const line of bad) console.error(`  · ${line}`);
  }
}
