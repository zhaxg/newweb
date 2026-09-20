import type { HmxRes } from "@/api/admin/types";
import { RbacRescType } from "@/api/admin/enums";

/** 资源树节点（对应 hmx_web resc/modules/tree-node 的 HmxResTree） */
export interface HmxResTree extends HmxRes {
  children?: HmxResTree[];
}

/** 扁平数组 → 树：根为 cPid===rootParentId，children 按 parseInt(cOrder) 升序 */
export function convertToTree(items: HmxRes[], rootParentId = ""): HmxResTree[] {
  const nodeMap: Record<string, HmxResTree> = {};
  for (const item of items) {
    if (!item.id) continue;
    nodeMap[item.id] = { ...item, children: [] };
  }

  const tree: HmxResTree[] = [];
  for (const item of items) {
    if (!item.id) continue;
    const node = nodeMap[item.id];
    const parentId = item.cPid || rootParentId;
    if (parentId === rootParentId) {
      tree.push(node);
    } else {
      const parent = nodeMap[parentId];
      if (parent?.children) parent.children.push(node);
    }
  }

  const parseOrder = (n: HmxResTree) => Number.parseInt(n.cOrder || "0", 10);
  for (const node of Object.values(nodeMap)) {
    if (node.children?.length) node.children.sort((a, b) => parseOrder(a) - parseOrder(b));
  }
  tree.sort((a, b) => parseOrder(a) - parseOrder(b));
  return tree;
}

export function findParentNodeById(pid: string, list: HmxResTree[]): HmxResTree | null {
  for (const item of list) {
    if (item.id === pid) return item;
    if (item.children?.length) {
      const nested = findParentNodeById(pid, item.children);
      if (nested) return nested;
    }
  }
  return null;
}

/** 新增资源草稿（对应 hmx_web createTreeNode 默认值） */
export function createTreeNode(pid: string, ns: string, randomId: string): HmxResTree {
  return {
    selected: false,
    rowVersion: 0,
    id: "",
    cPid: pid,
    cName: "LAYOUT",
    cTitle: `资源${randomId}`,
    cNsCode: ns,
    cIcon: "FileText",
    cOrder: "999",
    cResPath: `M${randomId}`,
    cResSubPath: "/_core/result/404/index.vue",
    cResType: RbacRescType.Menu,
    cEnable: "1",
  };
}
