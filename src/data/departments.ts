/** 部门行模型以 @/api/admin/types 为唯一权威定义；本文件只提供树工具与本地必填性收窄 */
import type { HmxDept } from "@/api/admin/types";

export type { HmxDept };

export interface DeptTreeNode extends HmxDept {
  /** 树内节点 id 必有（种子/导出行总携带 Id，建树时统一收窄为必填） */
  id: string;
  children: DeptTreeNode[];
  depth: number;
}

/** 按 Id/CDeptPid 建树（与原 TreeList 的 KeyFieldName/ParentFieldName 一致），根为 pid 空或找不到父级 */
export function buildDeptTree(rows: HmxDept[]): DeptTreeNode[] {
  const byPid = new Map<string | null, HmxDept[]>();
  const ids = new Set(rows.map((r) => r.id).filter((v): v is string => !!v));
  for (const row of rows) {
    const pid = row.cDeptPid && ids.has(row.cDeptPid) ? row.cDeptPid : null;
    const bucket = byPid.get(pid) ?? [];
    bucket.push(row);
    byPid.set(pid, bucket);
  }
  const walk = (pid: string | null, depth: number): DeptTreeNode[] =>
    (byPid.get(pid) ?? [])
      .filter((row): row is HmxDept & { id: string } => !!row.id)
      .map((row) => ({ ...row, depth, children: walk(row.id, depth + 1) }));
  return walk(null, 0);
}

/** 某节点的子孙 id 集合（编辑时父级下拉需排除自己及后代，避免成环） */
export function descendantIds(rows: HmxDept[], id: string): Set<string> {
  const result = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const row of rows) {
      if (row.cDeptPid && result.has(row.cDeptPid) && row.id && !result.has(row.id)) {
        result.add(row.id);
        grew = true;
      }
    }
  }
  return result;
}
