import type { RouteRecordRaw, Router } from "vue-router";
import { toRouteRecords } from "@/router/core/fromMenu";
import { useAuthStore } from "@/stores/authStore";
import { usePermissionStore } from "@/stores/permissionStore";
import { useTabsStore } from "@/stores/tabsStore";
import { loadingScreen } from "@/components/loading/loading";

/**
 * 路由守卫：登录 → 动态注册 → 越权 403，以及 router → tabs 单向同步。
 * 只负责导航拦截；路由表组装与注册逻辑见 @/router/index。
 *
 * 动态注册能力由 index.ts 注入 —— guard 若反向 import index 会形成循环引用。
 *
 * 引用约束：⛔ **仅 @/router/index 引用**。本文件依赖三个 store（auth/permission/tabs）与 loading，
 * 从 router 外部引用会精确复现 AGENTS §4.2 记录的 `request → router → guard → store → api → request` 环。
 */
export function setupRouterGuards(
  router: Router,
  api: {
    registerUserRoutes: (records: RouteRecordRaw[]) => void;
    resetUserRoutes: () => void;
  },
) {
  /* 刷新白屏过渡只属于首次导航（含 loadForUser 等异步）；站内 tab 切换瞬时，不插遮罩。
     首个 beforeEach 同步显示（此时动态路由未注册、拿不到目标 meta.loading，白底遮罩先挂无成本，
     导航落地后按最终 meta 决定淡出或直除） */
  let firstNavigation = true;

  router.beforeEach(async (to) => {
    if (firstNavigation) loadingScreen.show();
    const auth = useAuthStore();
    const perm = usePermissionStore();

    if (to.meta.public) {
      // 已登录访问 /login → 回首页（未登录访问 /login 放行）
      return auth.session && to.name === "login" ? { path: "/home", replace: true } : true;
    }

    if (!auth.session) {
      perm.reset();
      api.resetUserRoutes();
      return { name: "login", query: { redirect: to.fullPath }, replace: true };
    }

    if (!perm.loaded) {
      // 登录后首次进入 / 刷新：拉后端资源 → 适配为路由记录 → 注册 → 重放本次导航（统一覆盖三种场景）
      try {
        api.registerUserRoutes(toRouteRecords(await perm.loadForUser()));
      } catch {
        auth.logout();
        perm.reset();
        api.resetUserRoutes();
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
      document
        .querySelectorAll(".screen-enter-from, .screen-enter-active, .screen-leave-from, .screen-leave-active")
        .forEach((el) => {
          el.classList.remove(
            "screen-enter-from",
            "screen-enter-active",
            "screen-enter-to",
            "screen-leave-from",
            "screen-leave-active",
            "screen-leave-to",
          );
        });
    });
    if (!to.meta.pageId) return;
    const tabs = useTabsStore();
    tabs.openTab({ id: `page-${to.meta.pageId}`, title: to.meta.title ?? to.meta.pageId, page: to.meta.pageId });
  });
}
