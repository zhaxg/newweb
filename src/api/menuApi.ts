import type { HmxMenuNode } from "@/data/hmxMenu";
import { hmxMenu } from "@/data/hmxMenu";
import { loadRolePerms, loadUserRoles } from "@/data/roles";
import { authApi } from "@/api/admin/request";
import { RbacRescType } from "@/api/admin/enums";
import type { HmxRes } from "@/api/admin/types";

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

/**
 * 真实后端菜单：auth/getUserRescList（groupId = VITE_ROUTER_NAMESPACE，rescType 不传取全部）。
 * 返回的是 id/cPid 自关联的平铺资源表；菜单节点（cResType=Menu）过滤后转成壳层 HmxMenuNode 树，
 * 按钮（Widget）等其余类型由调用方留作按钮级权限数据源。
 */
export async function fetchUserMenuTreeFromServer(): Promise<{ tree: HmxMenuNode[]; resources: HmxRes[] }> {
  const resources = await authApi.getUserRescList({
    groupId: import.meta.env.VITE_ROUTER_NAMESPACE ?? "TDWEB",
  });
  const menus = (resources ?? []).filter((r) => r.cResType === RbacRescType.Menu);
  const roots = menus.filter((r) => !r.cPid).sort(byOrder);
  const tree = [HOME_NODE, ...roots.map((r) => toNode(r, menus, ""))];
  return { tree, resources: resources ?? [] };
}

function byOrder(a: HmxRes, b: HmxRes): number {
  return (Number(a.cOrder) || 0) - (Number(b.cOrder) || 0);
}

/** prefix = 祖先 cResPath 链（如 "admin"）；叶子 pageId = 完整路径（如 "admin/user"）→ 路由 /admin/user。
 *  全路径天然唯一（cResPath 跨父级重复者如 tfy1001 各带父前缀），缺 cResPath 时该段回落资源 id */
function toNode(res: HmxRes, all: HmxRes[], prefix: string): HmxMenuNode {
  const seg = res.cResPath && res.cResPath !== "_blank" ? res.cResPath : (res.id ?? "");
  const full = prefix ? `${prefix}/${seg}` : seg;
  const node: HmxMenuNode = {
    id: res.id ?? "",
    label: res.cTitle ?? res.cCode ?? "",
    icon: res.cIcon ?? undefined,
    path: res.cResPath || undefined,
  };
  const sub = res.cResSubPath ?? "";
  const children = all.filter((r) => r.cPid === res.id).sort(byOrder);
  if (sub.startsWith("http")) {
    // 外链菜单（含 cResPath==="_blank" 新窗口 与 iframe 内嵌——壳层统一新窗口打开）
    node.url = sub;
  } else if (children.length) {
    node.children = children.map((c) => toNode(c, all, full));
  } else if (sub || res.cResPath) {
    // 叶子页面：pageId = 父链拼接的完整资源路径，src 供组件映射
    node.page = full;
    node.src = sub || undefined;
  }
  return node;
}
