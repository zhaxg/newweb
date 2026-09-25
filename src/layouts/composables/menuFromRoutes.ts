import { computed, shallowRef } from "vue";
import type { RouteRecordRaw } from "vue-router";

/** 外链打开模式（渲染层）：`iframe` 内置承载进页签；`blank` 点击 window.open 开浏览器新标签（拒帧站点） */
export type ExternalOpenMode = "iframe" | "blank";

/**
 * 壳层菜单渲染节点 —— 由路由表投影而来（见 buildMenuTree），是侧栏 Tree / 顶栏 TieredMenu 的中立数据源。
 * 只带渲染 + 导航语义字段（page/url/openMode），后端资源字段（src/path/query…）不在此，那是 MenuResNode 的事。
 */
export interface HmxMenuNode {
  /** 完整路径作 key（Tree 展开/选中态按它索引，须唯一） */
  id: string;
  label: string;
  icon?: string;
  /** 可导航页的 pageId（openPage 按它 push）；外链 blank 模式无 */
  page?: string;
  /** 外嵌/新标签地址 */
  url?: string;
  /** 外链打开模式；普通页面无 */
  openMode?: ExternalOpenMode;
  children?: HmxMenuNode[];
}

/**
 * 路由表 → 菜单投影：菜单的唯一真源是路由表本身，`meta.hidden` 是不进菜单的开关。
 *
 * 表由两段拼成，壳层（MainLayout）子路由为准：
 * - staticShell：登录前就存在的骨架/业务整屏页，由 router/index 装配时注入一次；
 * - userShell：登录后由后端资源适配出的记录，退出时清空。
 * 两者都是同一批 `RouteRecordRaw` 对象（router 里注册的就是它们），不存在第二份数据，
 * 所以菜单与实际可导航的路由天然一致。
 *
 * 输出的是中立 DTO（`HmxMenuNode`），不是 PrimeVue 的 `TreeNode`/`MenuItem`：节点带导航语义字段
 * `page`/`url`/`openMode`（`MainLayout.openPage` 按它分流导航 / window.open），这些是应用数据、控件类型装不下；
 * 且同一棵树要同时喂侧栏 `Tree`(TreeNode) 与顶栏 `TieredMenu`(MenuItem) 两种不同形状，`command`/选择事件
 * 绑定属于各组件。故这里只产出中立数据，组件各自再做 `HmxMenuNode → TreeNode/MenuItem` 的最后一步映射。
 *
 * 顺序 = 记录数组顺序（后端 cOrder 已在 menuRescTree 排好）。
 */
let staticShell: readonly RouteRecordRaw[] = [];
const userShell = shallowRef<readonly RouteRecordRaw[]>([]);

/** 注入壳层静态子路由（router/index 模块求值时调用一次） */
export function initMenuShell(records: readonly RouteRecordRaw[]): void {
  staticShell = records;
}

/** 写入/清空登录后的动态路由表（router/index 的注册与登出清理调用） */
export function setUserMenuRoutes(records: readonly RouteRecordRaw[]): void {
  userShell.value = records;
}

export const menuTree = computed<HmxMenuNode[]>(() => buildMenuTree([...staticShell, ...userShell.value]));

function buildMenuTree(records: readonly RouteRecordRaw[], parentPath = ""): HmxMenuNode[] {
  const out: HmxMenuNode[] = [];
  for (const r of records) {
    if (r.meta?.hidden) continue;
    const full = parentPath ? `${parentPath}/${r.path}` : r.path;
    const children = "children" in r && r.children ? buildMenuTree(r.children, full) : undefined;
    const pageId = r.meta?.pageId;
    const url = r.meta?.url;
    // 点了没处去的记录（整屏设计器页、403 等）不进菜单
    if (!pageId && !url && !children?.length) continue;
    out.push({
      // 完整路径作 key：Tree 的展开态/选中态按 id 索引，必须唯一
      id: full,
      label: r.meta?.title ?? full,
      icon: r.meta?.icon,
      page: pageId,
      url,
      // 拒帧外链：openPage 按 openMode === "blank" 走 window.open，不导航
      openMode: r.meta?.external ? "blank" : undefined,
      children: children?.length ? children : undefined,
    });
  }
  return out;
}
