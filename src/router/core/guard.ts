import type { RouteRecordRaw, Router } from "vue-router";
import { toRouteRecords } from "@/router/core/fromMenu";
import { setAuthFailureHandler } from "@/api/_core/request";
import { useAuthStore } from "@/stores/authStore";
import { usePermissionStore } from "@/stores/permissionStore";
import { useTabsStore } from "@/stores/tabsStore";
import { loadingScreen } from "@/components/loading/loading";

/**
 * 路由守卫：登录 → 动态注册 → 越权 403，router → tabs 单向同步，
 * 以及**落到 /login 时就地清理**（权限 + 动态路由，见下方 public 分支）。
 * 只负责导航拦截与清理；路由表组装见 @/router/index，动态路由的挂接/移除实现见 core/dynamicRoutes。
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
  /* 依赖倒置：传输层判定出认证失败后，由本层负责「清会话 + 回登录页」——它拥有导航，
     且已在管落到 /login 时的清理（见下方 public 分支）。传输层只负责判定与并发单飞闸。
     注册时机在此（模块求值时）早于任何请求；此处不调 useAuthStore()，留到处理器执行时再取，
     因为本文件求值早于 main.ts 的 createPinia。 */
  setAuthFailureHandler(() => {
    const auth = useAuthStore();
    if (auth.session) auth.logout();
    const current = router.currentRoute.value;
    if (current.name === "login") return;
    return router.replace({ name: "login", query: { redirect: current.fullPath } });
  });

  /* 刷新白屏过渡只属于首次导航（含 loadForUser 等异步）；站内 tab 切换瞬时，不插遮罩。
     首个 beforeEach 同步显示（此时动态路由未注册、拿不到目标 meta.loading，白底遮罩先挂无成本，
     导航落地后按最终 meta 决定淡出或直除） */
  let firstNavigation = true;

  router.beforeEach(async (to) => {
    if (firstNavigation) loadingScreen.show();
    const auth = useAuthStore();
    const perm = usePermissionStore();

    if (to.meta.public) {
      /* 落到登录页 = 登出或会话失效，**就地清理**（perm.reset / resetUserRoutes 均幂等）。
         这是「清理」的唯一触发点：调用方（MainLayout 登出、传输层的认证失败处理）只负责
         导航到 /login，不必各自 import 动态路由清理——外部对 router 的依赖因此降为零。
         注意顺序：已登录访问 /login 是「回首页」而非登出，那种情况不能清。 */
      if (to.name === "login") {
        if (auth.session) return { path: "/home", replace: true };
        perm.reset();
        api.resetUserRoutes();
        return true;
      }
      return true;
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
