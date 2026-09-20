import { defineAsyncComponent, type Component } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import LoginPage from "@/pages/_core/login/LoginPage.vue";
import MainLayout from "@/layouts/MainLayout.vue";
import HomePage from "@/pages/_core/home/HomePage.vue";
import PlaceholderPage from "@/pages/_core/PlaceholderPage.vue";
import ForbiddenPage from "@/pages/_core/ForbiddenPage.vue";
import IframePage from "@/pages/_core/IframePage.vue";
import type { HmxMenuNode } from "@/data/hmxMenu";
import { useAuthStore } from "@/stores/authStore";
import { usePermissionStore } from "@/stores/permissionStore";
import { useTabsStore } from "@/stores/tabsStore";

declare module "vue-router" {
  interface RouteMeta {
    public?: boolean;
    requiresAuth?: boolean;
    pageId?: string;
    title?: string;
    /** iframe 叶子路由：承载的外链地址 */
    url?: string;
  }
}

/**
 * 页面组件动态解析：不写死映射表，按「用户配置的组件地址」（后端 cResSubPath / mock 节点 src）
 * 在 import.meta.glob 预扫描的页面模块里查表命中，命中即 defineAsyncComponent 懒加载分包。
 * 配置路径相对 src/pages，如 "/admin/user/index.vue"；未命中（未实现/占位资源）回落 PlaceholderPage。
 */
const pageModules = import.meta.glob("/src/pages/**/*.vue") as Record<string, () => Promise<{ default: Component }>>;

function resolvePageComponent(src?: string): Component | undefined {
  if (!src) return undefined;
  const norm = src.startsWith("/") ? src : `/${src}`;
  const loader = pageModules[`/src/pages${norm}`];
  return loader ? defineAsyncComponent(loader) : undefined;
}

const routes: RouteRecordRaw[] = [
  { path: "/login", name: "login", component: LoginPage, meta: { public: true } },
  {
    path: "/",
    name: "shell",
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      { path: "", name: "home", component: HomePage, meta: { pageId: "home", title: "首页" } },
      { path: "forbidden", name: "forbidden", component: ForbiddenPage, meta: { title: "无访问权限" } },
    ],
  },
  // 兜底：守卫会把已登录的未匹配路径重定向到 /forbidden（组件仅在守卫放行时才会真正渲染，故复用 403 页）
  { path: "/:pathMatch(.*)*", name: "not-found", component: ForbiddenPage },
];

export const router = createRouter({ history: createWebHistory(), routes });

/* ---------- 动态路由注册（mock 后端菜单树 → addRoute） ---------- */

let addedNames: string[] = [];

function walkLeaves(nodes: HmxMenuNode[], fn: (leaf: HmxMenuNode) => void) {
  for (const n of nodes) {
    if (n.children?.length) walkLeaves(n.children, fn);
    else if (n.page && n.page !== "home") fn(n);
  }
}

export function registerUserRoutes(tree: HmxMenuNode[]) {
  resetUserRoutes();
  walkLeaves(tree, (leaf) => {
    const name = `page:${leaf.page}`;
    if (router.hasRoute(name)) return;
    router.addRoute("shell", {
      path: leaf.page!,
      name,
      // iframe 叶子（内置菜单）→ 承载组件；其余按配置的组件地址动态解析，未命中落占位页
      component: leaf.iframe ? IframePage : (resolvePageComponent(leaf.src) ?? PlaceholderPage),
      meta: { pageId: leaf.page, title: leaf.label, url: leaf.iframe },
    });
    addedNames.push(name);
  });
}

export function resetUserRoutes() {
  for (const name of addedNames) router.removeRoute(name);
  addedNames = [];
}

/* ---------- 路由守卫：登录 → 动态注册 → 越权 403 ---------- */

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  const perm = usePermissionStore();

  if (to.meta.public) {
    // 已登录访问 /login → 回壳层根路径（未登录访问 /login 放行）
    return auth.session && to.name === "login" ? { path: "/", replace: true } : true;
  }

  if (!auth.session) {
    perm.reset();
    resetUserRoutes();
    return { name: "login", query: { redirect: to.fullPath }, replace: true };
  }

  if (!perm.loaded) {
    // 登录后首次进入 / 刷新：拉取菜单 → 注册路由 → 重放本次导航（统一覆盖三种场景）
    try {
      const tree = await perm.loadForUser(auth.session.userId);
      registerUserRoutes(tree);
    } catch {
      auth.logout();
      perm.reset();
      resetUserRoutes();
      return { name: "login", replace: true };
    }
    return { path: to.path, query: to.query, hash: to.hash, replace: true };
  }

  // 已注册仍未匹配 = 无权限的 page 深链
  if (to.name === "not-found") return { name: "forbidden", replace: true };
  return true;
});

/* ---------- router → tabs 单向同步（唯一入口，防双导航循环） ---------- */

router.afterEach((to) => {
  if (!to.meta.pageId) return;
  const tabs = useTabsStore();
  tabs.openTab({ id: `page-${to.meta.pageId}`, title: to.meta.title ?? to.meta.pageId, page: to.meta.pageId });
});

export default router;
