import type { Component } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import LoginPage from "@/pages/_core/login/LoginPage.vue";
import MainLayout from "@/layouts/MainLayout.vue";
import HomePage from "@/pages/_core/home/HomePage.vue";
import SalesOrdersPage from "@/pages/SalesOrdersPage.vue";
import PurchaseOrdersPage from "@/pages/PurchaseOrdersPage.vue";
import SysDepartmentsPage from "@/pages/admin/departments/SysDepartmentsPage.vue";
import SysUsersPage from "@/pages/admin/user/SysUsersPage.vue";
import SysRolesPage from "@/pages/admin/role/SysRolesPage.vue";
import SysMenusPage from "@/pages/admin/menus/SysMenusPage.vue";
import SysKvPage from "@/pages/admin/kv/SysKvPage.vue";
import SysAuditPage from "@/pages/admin/audit/SysAuditPage.vue";
import PlaceholderPage from "@/pages/_core/PlaceholderPage.vue";
import ForbiddenPage from "@/pages/_core/ForbiddenPage.vue";
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
  }
}

/** pageId → 页面组件；未实现的叶子落到 PlaceholderPage */
export const pageComponents: Record<string, Component> = {
  home: HomePage,
  "sales-orders": SalesOrdersPage,
  "purchase-orders": PurchaseOrdersPage,
  "sys-departments": SysDepartmentsPage,
  "sys-users": SysUsersPage,
  "sys-roles": SysRolesPage,
  "sys-menus": SysMenusPage,
  "sys-kv": SysKvPage,
  "sys-audit": SysAuditPage,
};

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
      path: `page/${leaf.page}`,
      name,
      component: pageComponents[leaf.page!] ?? PlaceholderPage,
      meta: { pageId: leaf.page, title: leaf.label },
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
