import type { HmxMenuNode } from "./hmxMenu";

/**
 * 内置菜单：不经后端权限下发、拼接到动态菜单树得到最终菜单/路由（mock 与真实后端模式同样生效）。
 * anchor = 挂点，按节点的 path(cResPath) → id → label 依次匹配；匹配不到或省略 = 挂为根节点。
 * 叶子带 page → 注册路由（page 即路径，如 "builtin-news" → /builtin-news）；带 iframe → 组件映射为内置 IframePage。
 */
export interface BuiltinMenuSeed {
  anchor?: string;
  node: HmxMenuNode;
}

export const builtinMenuSeeds: BuiltinMenuSeed[] = [
  {
    anchor: "documents", // 开发文档（真实后端资源 cResPath；mock 树无此节点时回落为根）
    node: { id: "builtin-news", label: "腾讯新闻", icon: "Globe", page: "builtin-news", iframe: "https://news.qq.com" },
  },
];

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

/** 把内置菜单拼进权限下发的动态树 → 最终菜单（幂等：page 已存在则跳过） */
export function mergeBuiltinMenu(tree: HmxMenuNode[]): HmxMenuNode[] {
  let out = tree;
  for (const { anchor, node } of builtinMenuSeeds) {
    if (collectPages(out).has(node.page ?? "")) continue;
    out = (anchor ? insertUnder(out, anchor, node) : null) ?? [...out, node];
  }
  return out;
}
