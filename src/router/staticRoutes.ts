import type { HmxMenuNode } from "@/api/common/menuApi";

/**
 * 静态路由配置：前端内置路由，不经后端资源下发、不受权限管控（mock 与真实模式同样生效）。
 * path = 路由名称（相对壳层，如 "builtin-news" → /builtin-news），路由 name 固定为 `page:${path}`。
 * hidden = true → 只注册路由（URL 直达、不进菜单）；默认进菜单，anchor = 挂点，
 * 按菜单节点 path(cResPath) → id → label 依次匹配，匹配不到或省略 = 挂为根节点。
 * 组件解析：iframe = 内嵌外链（IframePage）；否则 src 指向 src/pages 下的 vue（未命中落占位页）。
 */
export interface StaticRouteSeed {
  path: string;
  title: string;
  icon?: string;
  /** 页面组件地址（相对 src/pages，如 "/_core/xxx/index.vue"） */
  src?: string;
  /** 内嵌网页地址，映射内置 IframePage（优先于 src） */
  iframe?: string;
  /** true = 注册路由但不出现在菜单 */
  hidden?: boolean;
  /** 进菜单时的挂点（节点 path → id → label 依次匹配）；省略/未命中挂为根节点 */
  anchor?: string;
  /** 刷新白屏过渡遮罩开关：false = 该路由不启用 */
  loading?: boolean;
}

export const staticRouteSeeds: StaticRouteSeed[] = [
  // { path: "builtin-news", title: "腾讯新闻", icon: "Globe", iframe: "https://news.qq.com", loading: false },
  // { path: "print-debug", title: "打印调试", src: "/_core/print/index.vue", hidden: true },
];

function toMenuNode(seed: StaticRouteSeed): HmxMenuNode {
  return {
    id: seed.path,
    label: seed.title,
    icon: seed.icon,
    page: seed.path,
    src: seed.src,
    iframe: seed.iframe,
    loading: seed.loading,
  };
}

function anchorMatches(n: HmxMenuNode, anchor: string): boolean {
  return n.path === anchor || n.id === anchor || n.label === anchor;
}

function collectPages(nodes: HmxMenuNode[], acc: Set<string> = new Set()): Set<string> {
  for (const n of nodes) {
    if (n.page) acc.add(n.page);
    if (n.children) collectPages(n.children, acc);
  }
  return acc;
}

/** 命中即返回替换后的新树（沿路径不可变替换，供响应式 menuTree 感知变化）；未命中返回 null */
function insertUnder(nodes: HmxMenuNode[], anchor: string, leaf: HmxMenuNode): HmxMenuNode[] | null {
  let hit = false;
  const out = nodes.map((n) => {
    if (!hit && anchorMatches(n, anchor)) {
      hit = true;
      return { ...n, children: [...(n.children ?? []), leaf] };
    }
    if (n.children?.length) {
      const children = insertUnder(n.children, anchor, leaf);
      if (children) {
        hit = true;
        return { ...n, children };
      }
    }
    return n;
  });
  return hit ? out : null;
}

/** 把未隐藏的静态路由拼进权限下发的动态树 → 最终菜单（幂等：page 已存在则跳过；hidden 种子不拼） */
export function mergeStaticMenu(tree: HmxMenuNode[]): HmxMenuNode[] {
  let out = tree;
  for (const seed of staticRouteSeeds) {
    if (seed.hidden) continue;
    const node = toMenuNode(seed);
    if (collectPages(out).has(node.page ?? "")) continue;
    out = (seed.anchor ? insertUnder(out, seed.anchor, node) : null) ?? [...out, node];
  }
  return out;
}
