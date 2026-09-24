import { defineAsyncComponent, h, type Component } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import LoginPage from "@/pages/_core/login/LoginPage.vue";
import MainLayout from "@/layouts/MainLayout.vue";
import BlankLayout from "@/layouts/BlankLayout.vue";
import HomePage from "@/pages/_core/home/HomePage.vue";
import PlaceholderPage from "@/pages/_core/PlaceholderPage.vue";
import ForbiddenPage from "@/pages/_core/ForbiddenPage.vue";
import IframePage from "@/pages/_core/IframePage.vue";
import PrintDesignPage from "@/pages/Widgets/XtraReportTemplateManager/PrintDesignPage.vue";
import type { HmxMenuNode } from "@/api/common/menuApi";
import { useAuthStore } from "@/stores/authStore";
import { usePermissionStore } from "@/stores/permissionStore";
import { useTabsStore } from "@/stores/tabsStore";
import { staticRouteSeeds } from "@/router/staticRoutes";
import { loadingScreen } from "@/components/loading/loading";

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
     * 布局：缺省 = MainLayout（壳层）；"blank" = BlankLayout 整屏空布局。
     * 静态种子 / 显式注册时写入；动态菜单叶子可后续扩展。
     */
    layout?: "blank";
  }
}

/** 按 meta.layout 选父路由名：blank → 空布局，否则壳层 */
function layoutParent(meta: { layout?: "blank" } | undefined): string {
  return meta?.layout === "blank" ? "blank" : "shell";
}

/**
 * 页面组件动态解析：不写死映射表，按「用户配置的组件地址」（后端 cResSubPath / mock 节点 src）
 * 在 import.meta.glob 预扫描的页面模块里查表命中，命中即懒加载分包。
 * 配置路径相对 src/pages，如 "/admin/user/index.vue"；未命中（未实现/占位资源）回落 PlaceholderPage。
 * 模块加载失败（页面依赖缺失等）同样回落 PlaceholderPage，只提示建设中、不整站报错。
 */
const pageModules = import.meta.glob("/src/pages/**/*.vue") as Record<string, () => Promise<{ default: Component }>>;

function placeholderFor(title: string) {
  return () => h(PlaceholderPage, { title });
}

function resolvePageComponent(src: string | undefined, title: string) {
  const norm = src?.startsWith("/") ? src : `/${src ?? ""}`;
  const loader = pageModules[`/src/pages${norm}`];
  if (!loader) return placeholderFor(title);
  return async () => (await loader().catch(() => null))?.default ?? placeholderFor(title);
}

const routes: RouteRecordRaw[] = [
  { path: "/login", name: "login", component: LoginPage, meta: { public: true } },
  /* 壳层：默认业务页（Header + Sidebar + Tab） */
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
  /* 空布局：meta.layout === "blank" 的页面挂这里（整屏、无壳层） */
  {
    path: "/",
    name: "blank",
    component: BlankLayout,
    meta: { requiresAuth: true, layout: "blank" },
    children: [
      /* 打印模板设计器：列表页新窗打开；无 pageId → 不进 TabBar */
      {
        path: "print-designer",
        name: "print-designer",
        component: PrintDesignPage,
        meta: { layout: "blank", title: "打印模板设计", loading: false },
      },
    ],
  },
  // 兜底：守卫会把已登录的未匹配路径重定向到 /forbidden
  { path: "/:pathMatch(.*)*", name: "not-found", component: ForbiddenPage },
];

export const router = createRouter({ history: createWebHistory(), routes });

/* ---------- 静态路由（src/router/staticRoutes.ts 声明，建 router 即注册） ---------- */

/* 不受权限管控、不随登出移除；hidden 种子只注册路由不进菜单，菜单拼接见 permissionStore。
   meta.layout === "blank" → 挂 BlankLayout，否则挂壳层 shell。 */
for (const seed of staticRouteSeeds) {
  router.addRoute(layoutParent(seed), {
    path: seed.path,
    name: `page:${seed.path}`,
    component: seed.iframe ? IframePage : resolvePageComponent(seed.src, seed.title),
    meta: {
      pageId: seed.path,
      title: seed.title,
      url: seed.iframe,
      loading: seed.loading,
      layout: seed.layout,
    },
  });
}

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
      component: leaf.iframe ? IframePage : resolvePageComponent(leaf.src, leaf.label),
      meta: { pageId: leaf.page, title: leaf.label, url: leaf.iframe, loading: leaf.loading, qs: leaf.query },
    });
    addedNames.push(name);
  });
}

export function resetUserRoutes() {
  for (const name of addedNames) router.removeRoute(name);
  addedNames = [];
}

/* ---------- 路由守卫：登录 → 动态注册 → 越权 403 ---------- */

/* 刷新白屏过渡只属于首次导航（含 loadForUser 等异步）；站内 tab 切换瞬时，不插遮罩。
   首个 beforeEach 同步显示（此时动态路由未注册、拿不到目标 meta.loading，白底遮罩先挂无成本，
   导航落地后按最终 meta 决定淡出或直除） */
let firstNavigation = true;

router.beforeEach(async (to) => {
  if (firstNavigation) loadingScreen.show();
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
      const tree = await perm.loadForUser();
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
  if (firstNavigation) {
    /* meta.loading === false 的路由不启用：无动画直除（遮罩为白底，与从未显示观感一致） */
    loadingScreen.hide({ immediate: to.meta.loading === false });
    firstNavigation = false;
  }
  // 安全兜底：强制移除 Vue Transition 残留类（transitionend 在部分环境不触发导致 opacity=0）
  requestAnimationFrame(() => {
    document.querySelectorAll(".screen-enter-from, .screen-enter-active, .screen-leave-from, .screen-leave-active").forEach((el) => {
      el.classList.remove("screen-enter-from", "screen-enter-active", "screen-enter-to",
        "screen-leave-from", "screen-leave-active", "screen-leave-to");
    });
  });
  if (!to.meta.pageId) return;
  const tabs = useTabsStore();
  tabs.openTab({ id: `page-${to.meta.pageId}`, title: to.meta.title ?? to.meta.pageId, page: to.meta.pageId });
});

export default router;
