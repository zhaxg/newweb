/**
 * 动态路由的完整生命周期：阶段二挂接（registerUserRoutes）+ 阶段三移除（resetUserRoutes）
 * 与两者之间的状态（removeUserRoutes）。路由表的**组装**（静态骨架、布局父记录）仍在 @/router/index。
 * 命名取 AGENTS 通篇的「动态路由」；函数名保留 User——它们管的是当前登录会话的那批路由。
 *
 * 为什么独立成叶模块、而不是留在 index：本模块的消费方有三类——守卫（经 index 注入）、
 * MainLayout 登出、api/_core/request 的 401 清理。后两者不能 import `@/router`（index）：
 * index 静态依赖 layouts 注册表 → MainLayout，request 则经 guard → store → api 绕回自身，
 * 反向 import 会形成真实的模块循环依赖（ESM 下顶层引用会 TDZ 白屏，且报错栈极难定位）。
 * 本模块只依赖菜单投影（menuFromRoutes，纯 vue + 类型）与 router 实例桥（bridge，只依赖
 * vue-router 类型），任何方 import 它都不会造回边。
 *
 * 为什么 layoutName 是参数而不是 import 进来：默认布局名住在 @/layouts/composables/layouts，
 * 而那个文件静态引入 MainLayout.vue → 本模块——import 它就是上面那条环。故由 index 装配时
 * 绑定后传入（见 index 的 setupRouterGuards 注入），本模块对布局注册表零依赖。
 *
 * 引用约束：✅ **叶模块，router 外部可安全 import**（现消费方：layouts/MainLayout、api/_core/request）。
 * core/ 下只有本文件与 bridge.ts 是叶模块；guard / fromMenu 依赖 store 与页面组件，**勿外部引用**。
 */
import type { RouteRecordRaw } from "vue-router";
import { setUserMenuRoutes } from "@/layouts/composables/menuFromRoutes";
import { getRouter } from "@/router/core/bridge";

/* 阶段二挂接时记录各 addRoute 返回的移除回调；阶段三/登出/401 时整体执行 */
let removeUserRoutes: (() => void)[] = [];

/** 由 registerUserRoutes 交来移除回调（addRoute 返回值） */
export function trackUserRoutes(removers: (() => void)[]): void {
  removeUserRoutes = removers;
}

/**
 * 阶段二 · 登录后：后端资源适配出的记录挂进指定布局父记录。
 * records 由 @/router/core/fromMenu 从 menuRescTree 的菜单树转换而来（文件夹 = 无 component 的
 * 分组记录，叶子 = 页面记录）。addRoute 返回各自的移除回调，交给阶段三清理。
 * 幂等起点：先 resetUserRoutes()，重复调用不会叠加。
 */
export function registerUserRoutes(layoutName: string, records: RouteRecordRaw[]): void {
  resetUserRoutes();
  trackUserRoutes(records.map((record) => getRouter().addRoute(layoutName, record)));
  setUserMenuRoutes(records);
}

/** 阶段三：动态路由整体移除，菜单回落到只剩静态骨架。幂等（空表重复调用无副作用）。 */
export function resetUserRoutes(): void {
  for (const remove of removeUserRoutes) remove();
  removeUserRoutes = [];
  setUserMenuRoutes([]);
}
