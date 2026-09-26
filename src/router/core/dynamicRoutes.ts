/**
 * 动态路由的完整生命周期：阶段二挂接（registerUserRoutes）+ 阶段三移除（resetUserRoutes）
 * 与两者之间的状态（removeUserRoutes）。路由表的**组装**（静态骨架、布局父记录）仍在 @/router/index。
 * 命名取 AGENTS 通篇的「动态路由」；函数名保留 User——它们管的是当前登录会话的那批路由。
 *
 * 为什么单独成模块、而不是并进 index：守卫（core/guard）要用这两个函数，而 guard 若 import index
 * 就是 router → guard → index 的反向环。放在这里，guard 与 index 都只依赖本模块，无环。
 *
 * 引用约束：⛔ **router 内部模块**（现消费方：@/router/index、core/guard）。
 * `src/router/` 整体对外零消费方——权限与动态路由的清理已由守卫在「落到 /login」时就地接管
 * （见 guard.ts 的 public 分支），登出方（MainLayout）与认证失败方（api/_core/request）
 * 都只负责导航到 /login。request 要的 router 实例也改为注入（见其 setAuthFailureHandler），
 * 原先为破环而设的 core/bridge.ts 已删除。
 *
 * 为什么 router 与 layoutName 都是参数而不是 import 进来：两者分别住在 @/router/index 与
 * @/layouts/composables/layouts，而 layouts 静态引入 MainLayout.vue——import 任一都会造回边
 * （前者 router → guard → index；后者 layouts → MainLayout → router）。
 * 故由 index 装配时绑定后经守卫注入，本模块对两者零依赖。
 */
import type { RouteRecordRaw, Router } from "vue-router";
import { setUserMenuRoutes } from "@/layouts/composables/menuFromRoutes";

/* 阶段二挂接时记录各 addRoute 返回的移除回调；由 resetUserRoutes 整体执行
   （触发点是守卫的 public 分支——落到 /login 即清理，见 guard.ts） */
let removeUserRoutes: (() => void)[] = [];

/** 内部：由 registerUserRoutes 交来移除回调（addRoute 返回值） */
function trackUserRoutes(removers: (() => void)[]): void {
  removeUserRoutes = removers;
}

/**
 * 阶段二 · 登录后：后端资源适配出的记录挂进指定布局父记录。
 * records 由 @/router/core/fromMenu 从 menuRescTree 的菜单树转换而来（文件夹 = 无 component 的
 * 分组记录，叶子 = 页面记录）。addRoute 返回各自的移除回调，交给阶段三清理。
 * 幂等起点：先 resetUserRoutes()，重复调用不会叠加。
 *
 * router 与 layoutName 都是参数而非 import：两者分别住在 index 与 layouts 注册表，
 * import 任一都会造回边（见文件头）。由 index 装配时绑定后经守卫注入。
 */
export function registerUserRoutes(router: Router, layoutName: string, records: RouteRecordRaw[]): void {
  resetUserRoutes();
  trackUserRoutes(records.map((record) => router.addRoute(layoutName, record)));
  setUserMenuRoutes(records);
}

/** 阶段三：动态路由整体移除，菜单回落到只剩静态骨架。幂等（空表重复调用无副作用）。 */
export function resetUserRoutes(): void {
  for (const remove of removeUserRoutes) remove();
  removeUserRoutes = [];
  setUserMenuRoutes([]);
}
