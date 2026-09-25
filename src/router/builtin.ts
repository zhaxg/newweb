import LoginPage from "@/pages/_core/login/LoginPage.vue";
import HomePage from "@/pages/_core/home/HomePage.vue";
import ForbiddenPage from "@/layouts/pages/ForbiddenPage.vue";
import type { RouteRecordRaw } from "vue-router";

/**
 * 系统内置路由：框架骨架页（登录 / 首页 / 403 / 404 / 根路径跳转），
 * 与业务页面路由（@/router/business）隔离，业务改路由不动这里。
 *
 * 这里只放叶子：壳层（MainLayout）与空布局（BlankLayout）等布局父路由由 @/layouts/composables/layouts 注册表
 * 生成、index.ts 装配，归属由路由的 meta.layout 决定（缺省进默认壳层）。
 * 登录页必须保持静态 import（唯一公开路由，首屏同步渲染，其特效背景见 FlowBg）。
 */

/** 根路径 → 首页（首页是壳层静态路由 /home，pageId 约定下不再有 "" 特例） */
export const rootRedirectRoute: RouteRecordRaw = { path: "/", redirect: "/home" };

/** 登录页：唯一公开路由，已登录访问由守卫拦回 /home */
export const loginRoute: RouteRecordRaw = { path: "/login", name: "login", component: LoginPage, meta: { public: true } };

/** 壳层首页：pageId "home"，与动态注册页同一 URL 约定（/<pageId>）；菜单首位节点（icon 走 tabler Home） */
export const homeRoute: RouteRecordRaw = {
  path: "home",
  name: "home",
  component: HomePage,
  meta: { pageId: "home", title: "首页", icon: "Home" },
};

/** 403：越权深链由守卫落到这里；纯系统页，meta.hidden 不进菜单 */
export const forbiddenRoute: RouteRecordRaw = {
  path: "forbidden",
  name: "forbidden",
  component: ForbiddenPage,
  meta: { title: "无访问权限", hidden: true },
};

/** 404 兜底：已登录仍未匹配 → 守卫重定向 /forbidden */
export const notFoundRoute: RouteRecordRaw = { path: "/:pathMatch(.*)*", name: "not-found", component: ForbiddenPage };
