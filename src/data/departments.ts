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

const STORAGE_KEY = "hmx.departments";

function seedDepartments(): HmxDept[] {
  const rows: Array<Partial<HmxDept> & { id: string; cDeptName: string; cDeptPid: string | null }> = [
    { id: "root", cDeptName: "海明仕集团", cDeptPid: null, cDeptDesc: "集团总部", cCompany: "HMX", cClassify: "集团", cSw01: "上市", cSw02: "A类" },
    { id: "gm", cDeptName: "总裁办公室", cDeptPid: "root", cDeptDesc: "集团职能", cCompany: "HMX", cClassify: "职能" },
    { id: "fin", cDeptName: "财务中心", cDeptPid: "root", cDeptDesc: "资金管理、核算", cCompany: "HMX", cClassify: "职能", cSw01: "独立核算" },
    { id: "fin-acct", cDeptName: "会计部", cDeptPid: "fin", cDeptDesc: "总账与报表", cCompany: "HMX", cClassify: "职能" },
    { id: "fin-tre", cDeptName: "资金部", cDeptPid: "fin", cDeptDesc: "资金调度", cCompany: "HMX", cClassify: "职能" },
    { id: "hr", cDeptName: "人力资源中心", cDeptPid: "root", cDeptDesc: "组织与人才", cCompany: "HMX", cClassify: "职能" },
    { id: "hr-rec", cDeptName: "招聘部", cDeptPid: "hr", cDeptDesc: null, cCompany: "HMX", cClassify: "职能" },
    { id: "hr-trn", cDeptName: "培训发展部", cDeptPid: "hr", cDeptDesc: null, cCompany: "HMX", cClassify: "职能" },
    { id: "it", cDeptName: "信息技术中心", cDeptPid: "root", cDeptDesc: "数字化建设", cCompany: "HMX", cClassify: "职能", cSw01: "成本中心" },
    { id: "it-dev", cDeptName: "研发部", cDeptPid: "it", cDeptDesc: "HMX/MES 研发", cCompany: "HMX", cClassify: "技术", cSw02: "敏捷" },
    { id: "it-ops", cDeptName: "运维部", cDeptPid: "it", cDeptDesc: "基础设施", cCompany: "HMX", cClassify: "技术" },
    { id: "bu-mfg", cDeptName: "制造事业部", cDeptPid: "root", cDeptDesc: "智能工厂", cCompany: "HMX-MFG", cClassify: "事业部", cSw01: "利润中心" },
    { id: "mfg-pm", cDeptName: "生产管理部", cDeptPid: "bu-mfg", cDeptDesc: "排产与交付", cCompany: "HMX-MFG", cClassify: "制造" },
    { id: "mfg-qc", cDeptName: "品质部", cDeptPid: "bu-mfg", cDeptDesc: "IQC/IPQC/OQC", cCompany: "HMX-MFG", cClassify: "制造" },
    { id: "mfg-wh", cDeptName: "仓储物流部", cDeptPid: "bu-mfg", cDeptDesc: null, cCompany: "HMX-MFG", cClassify: "制造" },
    { id: "bu-sales", cDeptName: "销售事业部", cDeptPid: "root", cDeptDesc: "国内市场", cCompany: "HMX-SAL", cClassify: "事业部", cSw01: "利润中心" },
    { id: "sal-dom", cDeptName: "国内销售部", cDeptPid: "bu-sales", cDeptDesc: null, cCompany: "HMX-SAL", cClassify: "销售" },
    { id: "sal-exp", cDeptName: "海外销售部", cDeptPid: "bu-sales", cDeptDesc: null, cCompany: "HMX-SAL", cClassify: "销售", cSw01: "英语区", cSw02: "日语区" },
    { id: "bu-rd", cDeptName: "研究院", cDeptPid: "root", cDeptDesc: "前沿技术研发", cCompany: "HMX-RD", cClassify: "事业部" },
    { id: "rd-lab", cDeptName: "实验室", cDeptPid: "bu-rd", cDeptDesc: null, cCompany: "HMX-RD", cClassify: "研发" },
  ];
  return rows.map((r) => ({
    cDeptDesc: null,
    cCompany: null,
    cClassify: null,
    cSw01: null,
    cSw02: null,
    cSw03: null,
    cSw04: null,
    cSw05: null,
    ...r,
  })) as HmxDept[];
}

export function loadDepartments(): HmxDept[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as HmxDept[];
  } catch {
    /* 数据损坏时回退种子 */
  }
  const seeded = seedDepartments();
  saveDepartments(seeded);
  return seeded;
}

export function saveDepartments(rows: HmxDept[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function newDeptId(): string {
  return crypto.randomUUID().replace(/-/g, "");
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
