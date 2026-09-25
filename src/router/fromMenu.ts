import { h, type Component } from "vue";
import type { RouteRecordRaw } from "vue-router";
import IframePage from "@/layouts/pages/IframePage.vue";
import PlaceholderPage from "@/layouts/pages/PlaceholderPage.vue";
import type { MenuResNode } from "@/api/common/menuRescTree";

/**
 * 语义资源树 → 路由记录树（本层是「路由编译器」：把 menuRescTree 归一化出的 MenuResNode 编成 RouteRecordRaw）。
 * 后端字段语义已在 menuRescTree 收敛，这里只谈路由：外链怎么承载、组件怎么解析、pageId 怎么命名。
 *
 * 四类映射（外链 iframe / blank 的判定是本层的路由策略，与后端契约无关）：
 * - 外链·可内嵌（有 url、主机不在拒帧名单）→ 常规叶子记录，component = IframePage、meta.url 挂地址，
 *   进壳层页签体系内置承载（实际 iframe 由布局层常驻池 HmxIframeHost 持有，见该组件）。
 * - 外链·拒帧（有 url、主机命中 EXTERNAL_BLANK_HOSTS）→ redirect 到 403 + meta.external：菜单里照常出现
 *   （点击由 MainLayout.openPage 走 window.open），直链落 403；不给 pageId，故不会被站内导航命中。
 * - 文件夹（无 page、无 url）→ 无 component 的分组记录，只带 meta.title/icon 供菜单投影
 *   （vue-router 允许父记录无 component，RouterView 会跳过该层）。
 * - 页面叶子（有 page、无 url）→ 常规记录，name = `page:${pageId}`，组件按 src 解析、未命中落占位页。
 *
 * 数组顺序即菜单顺序（menuRescTree 已按后端 cOrder 排过）。首页由 builtin 静态注册，不在本树内。
 */
export function toRouteRecords(nodes: MenuResNode[]): RouteRecordRaw[] {
  const out: RouteRecordRaw[] = [];
  for (const node of nodes) {
    const rec = toRecord(node);
    if (rec) out.push(rec);
  }
  return out;
}

/* ── 外链承载策略（前端路由侧，非后端契约）──────────────────────────────────────
   默认所有 http 外链走 iframe 内置承载；命中下列主机的走 blank（浏览器新标签）——
   因为这些站点下发 X-Frame-Options: deny，浏览器强制拒帧、前端无法绕过：
     10.11.5.59:3000   Grafana（TS2080 服务日志查询），放行 allow_embedding 后删此行即回归 iframe
   按主机匹配而非逐条登记：同一站点新增外链自动继承。 */
const EXTERNAL_BLANK_HOSTS = new Set<string>(["10.11.5.59:3000"]);

function isBlankHost(url: string): boolean {
  try {
    return EXTERNAL_BLANK_HOSTS.has(new URL(url).host);
  } catch {
    return false;
  }
}

/** 相对路径段：有 pageId 取末段（保证父链拼接后的完整 path 与 pageId 一致）；纯文件夹回落 cResPath → id */
function segmentOf(node: MenuResNode): string {
  if (node.page) return node.page.slice(node.page.lastIndexOf("/") + 1);
  return node.path && node.path !== "_blank" ? node.path : node.id;
}

function toRecord(node: MenuResNode): RouteRecordRaw | null {
  const path = segmentOf(node);

  if (node.url) {
    // 拒帧外链：只留 url + external，不注册可导航页（直链落 403，点击走 window.open）
    if (isBlankHost(node.url)) {
      return {
        path,
        redirect: { name: "forbidden" },
        meta: { title: node.label, icon: node.icon, url: node.url, external: true },
      };
    }
    // 可内嵌外链：壳层内置承载，地址挂 meta.url（渲染交给 HmxIframeHost 常驻池）
    return {
      path,
      name: `page:${node.page}`,
      component: IframePage,
      meta: { pageId: node.page, title: node.label, icon: node.icon, url: node.url },
    };
  }

  if (!node.page) {
    const children = toRouteRecords(node.children ?? []);
    if (!children.length) return null;
    return { path, meta: { title: node.label, icon: node.icon }, children };
  }

  return {
    path,
    name: `page:${node.page}`,
    component: resolvePageComponent(node.src, node.label),
    meta: { pageId: node.page, title: node.label, icon: node.icon, qs: node.query },
  };
}

/* ---------- 页面组件动态解析 ----------
   按「用户配置的组件地址」（后端 cResSubPath / mock 节点 src）在 import.meta.glob 预扫描的
   页面模块里查表命中，命中即懒加载分包。路径相对 src/pages（如 "/admin/user/index.vue"）；
   未命中（未实现/占位资源）或模块加载失败（页面依赖缺失）都回落 PlaceholderPage，
   只提示建设中、不整站报错。 */
const pageModules = import.meta.glob("/src/pages/**/*.vue") as Record<string, () => Promise<{ default: Component }>>;

function placeholderFor(title: string) {
  return () => h(PlaceholderPage, { title });
}

function resolvePageComponent(src: string | undefined, title: string) {
  const norm = src?.startsWith("/") ? src : `/${src ?? ""}`;
  const loader = pageModules[`/src/pages${norm}`];
  // 未命中 = 未迁移/占位资源（glob 查表 miss，运行时无法区分「配错路径」与「尚未实现」），静默回落是设计意图
  if (!loader) return placeholderFor(title);
  return async () => {
    try {
      const mod = await loader();
      if (!mod?.default) {
        console.error(`[fromMenu] 页面模块缺少默认导出: /src/pages${norm}`);
        return placeholderFor(title);
      }
      return mod.default;
    } catch (err) {
      // 无条件留痕（不只 dev）：此处 reject 在 router/globalError 之前就被就地吞掉，
      // 否则生产零信号——含发版后旧 tab 懒加载旧 hash chunk 404，该场景仅生产可复现。
      // 回落占位页保留（不整站报错），console 留痕不违反该约束。
      console.error(`[fromMenu] 页面模块加载失败: /src/pages${norm}`, err);
      return placeholderFor(title);
    }
  };
}
