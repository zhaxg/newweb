import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import { rootRedirectRoute, loginRoute, homeRoute, forbiddenRoute, notFoundRoute } from "@/router/builtin";
import { businessRoutes } from "@/router/business";
import { layouts, defaultLayoutName } from "@/layouts/composables/layouts";
import { initMenuShell, setUserMenuRoutes } from "@/layouts/composables/menuFromRoutes";
import { setupRouterGuards } from "@/router/guard";

declare module "vue-router" {
  interface RouteMeta {
    public?: boolean;
    requiresAuth?: boolean;
    pageId?: string;
    title?: string;
    /** iframe 叶子路由：承载的外链地址 */
    url?: string;
    /** 刷新白屏过渡遮罩开关：默认启用，置 false 的路由不显示（见 components/loading） */
    loading?: boolean;
    /** 菜单资源的 cQueryString（共用窗体按它区分行为，如 "ZG01,1" / "FUR" / JSON 串），页面经 useMenuQuery 读取 */
    qs?: string;
    /**
     * 归属布局：取值 = @/layouts/composables/layouts 注册表的 name（如 "blank"）；缺省 = 默认布局（壳层 MainLayout）。
     * index.ts 按它把路由归位到对应布局父记录；后端动态路由不带此字段 → 一律进默认壳层。
     */
    layout?: string;
    /** true = 不进侧栏/顶栏菜单。菜单由路由表投影（@/layouts/composables/menuFromRoutes），本字段是唯一开关 */
    hidden?: boolean;
    /** 菜单图标名（tabler，经 lib/tablerIcons 解析） */
    icon?: string;
    /** 拒帧外链：菜单里可见，点击由 openPage 走 window.open 而不导航（直链落 403） */
    external?: boolean;
  }
}

/* ══ 阶段一 · 登录前：静态路由表 ══════════════════════════════════════════════════
   系统内所有路由在本文件汇总成一张 RouteRecordRaw：骨架叶子见 @/router/builtin，
   业务叶子见 @/router/business，后端下发的动态叶子在阶段二挂进默认布局。
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

/* ══ 阶段二 · 登录后：后端资源适配出的记录挂进默认布局（壳层） ════════════════════
   records 由 @/router/fromMenu 从 menuRescTree 的菜单树转换而来（文件夹 = 无 component 的
   分组记录，叶子 = 页面记录）。addRoute 返回各自的移除回调，交给阶段三清理。 */

let removeUserRoutes: (() => void)[] = [];

export function registerUserRoutes(records: RouteRecordRaw[]): void {
  resetUserRoutes();
  removeUserRoutes = records.map((record) => router.addRoute(defaultLayoutName, record));
  setUserMenuRoutes(records);
}

/* ══ 阶段三 · 退出：动态路由整体移除，菜单回落到只剩静态骨架 ══════════════════════ */

export function resetUserRoutes(): void {
  for (const remove of removeUserRoutes) remove();
  removeUserRoutes = [];
  setUserMenuRoutes([]);
}

/* ---------- 路由守卫（@/router/guard）：登录 → 动态注册 → 越权 403 + tabs 同步 ---------- */

setupRouterGuards(router, { registerUserRoutes, resetUserRoutes });

export default router;
