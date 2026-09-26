import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
/* RouteMeta 模块增强：那个文件无运行时导出，靠这行 side-effect import 生效，勿删（见其文件头） */
import "@/router/core/routeMeta";
import { rootRedirectRoute, loginRoute, homeRoute, forbiddenRoute, notFoundRoute } from "@/router/builtin";
import { businessRoutes } from "@/router/business";
import { layouts, defaultLayoutName } from "@/layouts/composables/layouts";
import { initMenuShell } from "@/layouts/composables/menuFromRoutes";
import { setupRouterGuards } from "@/router/core/guard";
import { registerUserRoutes, resetUserRoutes } from "@/router/core/dynamicRoutes";

/* ══ 阶段一 · 登录前：静态路由表 ══════════════════════════════════════════════════
   **静态**路由在本文件汇总成一张 RouteRecordRaw：骨架叶子见 @/router/builtin，
   业务叶子见 @/router/business；后端下发的动态叶子不在本文件，由 core/dynamicRoutes 在阶段二挂进默认布局。
   布局父记录由 @/layouts/composables/layouts 注册表生成——一个布局一个父，children 按 meta.layout 归位
   （缺省进默认布局），加布局只改注册表、不动这里。 */

const staticLayoutLeaves: RouteRecordRaw[] = [homeRoute, forbiddenRoute, ...businessRoutes];
const childrenOf = (layout: string) =>
  staticLayoutLeaves.filter((r) => (r.meta?.layout ?? defaultLayoutName) === layout);

const layoutParents: RouteRecordRaw[] = layouts.map((l) => ({
  path: "/",
  name: l.name,
  component: l.component,
  meta: { requiresAuth: true, layout: l.name },
  children: childrenOf(l.name),
}));

/* 菜单投影的静态部分：默认（壳层）布局的静态子路由即菜单候选，meta.hidden 排除（见 @/layouts/composables/menuFromRoutes） */
initMenuShell(childrenOf(defaultLayoutName));

const routes: RouteRecordRaw[] = [rootRedirectRoute, loginRoute, ...layoutParents, notFoundRoute];

export const router = createRouter({ history: createWebHistory(), routes });

/* ══ 阶段二 / 三 · 动态路由的挂接与移除 ══════════════════════════════════════════
   实现与状态都在 @/router/core/dynamicRoutes。那里对 router 实例与布局注册表都零依赖
   （import 任一会造回边：前者 router → guard → 本模块，后者 router → layouts → MainLayout → 本模块），
   故两者都在此绑定后注入。

   注：router 实例不再对外暴露——request 走 setAuthFailureHandler 注入（见 core/guard），
   usePermission 走 app.use 的插件选项（见 main.ts）。**src/router/ 对外零消费方**，
   原先为破环而设的 core/bridge.ts 已删除。 */

setupRouterGuards(router, {
  registerUserRoutes: (records) => registerUserRoutes(router, defaultLayoutName, records),
  resetUserRoutes,
});

export default router;
