import type { HmxMenuNode } from "@/data/hmxMenu";
import { hmxMenu } from "@/data/hmxMenu";
import { loadRolePerms, loadUserRoles } from "@/data/roles";

const HOME_NODE: HmxMenuNode = { id: "home", label: "首页", icon: "Home", page: "home" };

/** 叶子按节点 id 过权限；父节点仅在有子孙存活时保留 */
function filterNodes(nodes: HmxMenuNode[], allowed: Set<string>): HmxMenuNode[] {
  const out: HmxMenuNode[] = [];
  for (const n of nodes) {
    if (n.children?.length) {
      const children = filterNodes(n.children, allowed);
      if (children.length) out.push({ ...n, children });
    } else if (n.page && allowed.has(n.id)) {
      out.push(n);
    }
  }
  return out;
}

/**
 * mock「后端」动态菜单接口：userId → 角色 → 菜单节点 id 集合 → 过滤后的菜单树。
 * 侧栏/顶部菜单与动态路由注册同源于这棵树；未知用户/角色 = 只剩首页。
 */
export async function fetchUserMenuTree(userId: string): Promise<HmxMenuNode[]> {
  // 模拟网络往返（对应 DataPortal 查询）
  await new Promise((resolve) => setTimeout(resolve, 250));
  const roleIds = loadUserRoles()[userId] ?? [];
  const perms = loadRolePerms();
  const allowed = new Set(roleIds.flatMap((rid) => perms[rid] ?? []));
  return [HOME_NODE, ...filterNodes(hmxMenu, allowed)];
}
