import type { RolePermissionOfViewAndWidgets } from "@/api/admin/types";

/** PrimeVue Tree 节点：携带原始后端资源数据，供勾选/半选收集回传 */
export interface PermissionNode {
  key: string;
  label: string;
  data: RolePermissionOfViewAndWidgets;
  children?: PermissionNode[];
}

/**
 * 扁平 RolePermissionOfViewAndWidgets[] → 树（父指针 cpId）。
 * 移植自 hmx_web role/modules/tree-node.ts transformTree。
 * checkedList = selected 为真的节点 id；初始勾选只保留叶子（被他人当作父级的节点剔除，
 * 由树的级联派生父节点勾选态）。
 */
export function transformPermissionTree(
  permissionList: RolePermissionOfViewAndWidgets[],
): { tree: PermissionNode[]; checkedLeafIds: string[] } {
  const nodeMap = new Map<string, PermissionNode>();
  const checkedList: string[] = [];
  const roots: PermissionNode[] = [];

  for (const item of permissionList) {
    const node: PermissionNode = {
      key: item.id ?? "",
      label: item.cName ?? item.cCode ?? "",
      data: item,
    };
    nodeMap.set(item.id ?? "", node);
    if (item.selected && item.id) checkedList.push(item.id);
  }

  for (const item of permissionList) {
    const node = nodeMap.get(item.id ?? "");
    if (!node) continue;
    if (item.cpId && 0 < item.cpId.length) {
      const parent = nodeMap.get(item.cpId);
      if (parent) {
        (parent.children ??= []).push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  // 只留叶子：凡被别的节点当作 cpId 的，剔除出初始勾选集
  const isParent = new Set(permissionList.map((x) => x.cpId).filter(Boolean) as string[]);
  const checkedLeafIds = checkedList.filter((id) => !isParent.has(id));

  return { tree: roots, checkedLeafIds };
}

/** 收集全部祖先 key（用于初始展开） */
export function collectParentKeys(tree: PermissionNode[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  const walk = (list: PermissionNode[]) => {
    for (const n of list) {
      if (n.children?.length) {
        out[n.key] = true;
        walk(n.children);
      }
    }
  };
  walk(tree);
  return out;
}
