import { computed } from "vue";
import { useRouter } from "vue-router";
import type { RouteRecordNormalized } from "vue-router";
import { useTabsStore } from "@/stores/tabsStore";

/**
 * 常驻 iframe（frame keep-alive）：把内嵌外链页从 RouterView/KeepAlive 里挪到布局层单独持有。
 *
 * 根因：Chromium 在 <iframe> 的 DOM 节点「脱离文档再插回」时必然重新加载，而 KeepAlive 缓存子树正是靠
 * 反挂载实现的 —— 所以 iframe 页哪怕被缓存，切页签回来照样白刷。唯一解是 iframe 节点始终挂在文档里不动，
 * 切显隐只用 v-show。这里把「哪些内嵌页、挂哪个、显哪个」三件事拆成纯派生态：
 * - framePages：全路由表里带 meta.url 的内嵌 iframe 叶子（真源是路由表本身，与菜单投影同源，无第二份数据）；
 * - hasRenderFrame(挂载)：该页对应页签是否还开着（关页签才反挂载回收，切页签不摘节点）；
 * - showIframe(显隐)：是否为当前路由。
 */
export function useFrameKeepAlive() {
  const router = useRouter();
  const tabs = useTabsStore();

  const current = computed(() => router.currentRoute.value);

  /* 内嵌 iframe 叶子 = 有 pageId（可站内导航）+ 有 url（外嵌地址）+ 非 external（external 是拒帧新标签、redirect 落 403 不渲染）。
     router.getRoutes() 非响应式，靠读 current.fullPath 建立依赖：登录后动态路由注册完会重放导航 → 本 computed 重算纳入后端内嵌页。 */
  const framePages = computed<RouteRecordNormalized[]>(() => {
    void current.value.fullPath;
    return router.getRoutes().filter((r) => r.meta.pageId && r.meta.url && !r.meta.external);
  });

  /** 页签开着（含仅切换未激活）→ 保持挂载；关掉 → 卸载 */
  const openFramePages = computed(
    () => new Set(framePages.value.map((r) => r.meta.pageId).filter((pid) => tabs.tabs.some((t) => t.page === pid))),
  );

  function hasRenderFrame(pageId?: string): boolean {
    return !!pageId && openFramePages.value.has(pageId);
  }

  function showIframe(pageId?: string): boolean {
    return !!pageId && current.value.meta.pageId === pageId;
  }

  return { framePages, hasRenderFrame, showIframe };
}
