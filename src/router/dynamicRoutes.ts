/**
 * 登录期动态路由的生命周期状态（路由阶段二/三的「状态与清理」半边，路由表组装仍在 @/router/index）。
 * 命名取 AGENTS 通篇的「动态路由」（阶段二挂接、阶段三移除）；函数名保留 User——它们清理的
 * 是当前登录会话（registerUserRoutes/resetUserRoutes）的那批路由，守卫注入的 API 形状也随之不变。
 *
 * 为什么独立成叶模块、而不是留在 index：本模块的消费方有三类——守卫（经 index 注入）、
 * MainLayout 登出、api/_core/request 的 401 清理。后两者不能 import `@/router`（index）：
 * index 静态依赖 layouts 注册表 → MainLayout，request 则经 guard → store → api 绕回自身，
 * 反向 import 会形成真实的模块循环依赖（ESM 下顶层引用会 TDZ 白屏，且报错栈极难定位）。
 * 本模块只依赖菜单投影（menuFromRoutes，纯 vue + 类型），任何方 import 它都不会造回边。
 */
import { setUserMenuRoutes } from "@/layouts/composables/menuFromRoutes";

/* 阶段二 registerUserRoutes 挂接时记录各 addRoute 返回的移除回调；阶段三/登出/401 时整体执行 */
let removeUserRoutes: (() => void)[] = [];

/** 由 @/router/index 的 registerUserRoutes 交来移除回调（addRoute 返回值） */
export function trackUserRoutes(removers: (() => void)[]): void {
  removeUserRoutes = removers;
}

/** 阶段三：动态路由整体移除，菜单回落到只剩静态骨架。幂等（空表重复调用无副作用）。 */
export function resetUserRoutes(): void {
  for (const remove of removeUserRoutes) remove();
  removeUserRoutes = [];
  setUserMenuRoutes([]);
}
