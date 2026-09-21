/** 部门表（HM_X_DEPT 本地形态）行类型与树工具；数据源见 src/mock/admin/data/depts.ts */
export interface HmxDept {
  id: string;
  cDeptName: string;
  cDeptPid: string | null;
  cDeptDesc: string | null;
  cCompany: string | null;
  cClassify: string | null;
  cSw01: string | null;
  cSw02: string | null;
  cSw03: string | null;
  cSw04: string | null;
  cSw05: string | null;
}

export interface DeptTreeNode extends HmxDept {
  children: DeptTreeNode[];
  depth: number;
}

/** 按 Id/CDeptPid 建树（与原 TreeList 的 KeyFieldName/ParentFieldName 一致），根为 pid 空或找不到父级 */
export function buildDeptTree(rows: HmxDept[]): DeptTreeNode[] {
  const byPid = new Map<string | null, HmxDept[]>();
  const ids = new Set(rows.map((r) => r.id));
  for (const row of rows) {
    const pid = row.cDeptPid && ids.has(row.cDeptPid) ? row.cDeptPid : null;
    const bucket = byPid.get(pid) ?? [];
    bucket.push(row);
    byPid.set(pid, bucket);
  }
  const walk = (pid: string | null, depth: number): DeptTreeNode[] =>
    (byPid.get(pid) ?? []).map((row) => ({ ...row, depth, children: walk(row.id, depth + 1) }));
  return walk(null, 0);
}

/** 某节点的子孙 id 集合（编辑时父级下拉需排除自己及后代，避免成环） */
export function descendantIds(rows: HmxDept[], id: string): Set<string> {
  const result = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const row of rows) {
      if (row.cDeptPid && result.has(row.cDeptPid) && !result.has(row.id)) {
        result.add(row.id);
        grew = true;
      }
    }
  }
  return result;
}
