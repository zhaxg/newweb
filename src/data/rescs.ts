/**
 * 菜单/资源管理数据模块（移植自 WinForms Forms/Admin/Resc，对应表 HM_X_RES）
 * 根节点 cPid 为 "0"
 */
export interface HmxRes {
  id: string;
  cPid: string;
  cCode: string;
  cTitle: string;
  cOrder: string;
  cResPath: string;
  cResSubPath: string;
  cQueryString: string;
  cEnable: string;
  cRescType: string;
  icon: string;
  creator: string;
  createTime: string;
  lastModifier: string;
  lastModifyTime: string;
}

const STORAGE_KEY = "hmx.rescs";

export const RESC_TYPES = ["Menu", "Widget", "DataItem", "DataColumn"] as const;

type Seed = Partial<HmxRes> & { id: string; cPid: string; cCode: string; cTitle: string };

function seedRescs(): HmxRes[] {
  const rows: Seed[] = [
    // ---- 系统管理 ----
    { id: "r-sy1000", cPid: "0", cCode: "SY1000", cTitle: "系统管理", cOrder: "10", cResPath: "", icon: "Settings" },
    { id: "r-sy1010", cPid: "r-sy1000", cCode: "SY1010", cTitle: "部门", cOrder: "10", cResPath: "/sys-departments", icon: "Building" },
    { id: "r-sy1020", cPid: "r-sy1000", cCode: "SY1020", cTitle: "用户", cOrder: "20", cResPath: "/sys-users", icon: "Users" },
    { id: "r-sy1030", cPid: "r-sy1000", cCode: "SY1030", cTitle: "角色", cOrder: "30", cResPath: "/sys-roles", icon: "ShieldCheck" },
    { id: "r-sy1040", cPid: "r-sy1000", cCode: "SY1040", cTitle: "菜单", cOrder: "40", cResPath: "/sys-menus", icon: "ListTree" },
    { id: "r-sy1050", cPid: "r-sy1000", cCode: "SY1050", cTitle: "键值对", cOrder: "50", cResPath: "/sys-kv", icon: "Braces" },
    { id: "r-sy1060", cPid: "r-sy1000", cCode: "SY1060", cTitle: "计划任务", cOrder: "60", cResPath: "/sys-jobs", icon: "Clock" },
    { id: "r-sy1070", cPid: "r-sy1000", cCode: "SY1070", cTitle: "代码生成", cOrder: "70", cResPath: "/sys-gen", icon: "Sparkles" },
    { id: "r-sy1080", cPid: "r-sy1000", cCode: "SY1080", cTitle: "系统设置", cOrder: "80", cResPath: "/sys-settings", icon: "AdjustmentsHorizontal" },
    { id: "r-sy1090", cPid: "r-sy1000", cCode: "SY1090", cTitle: "审计日志", cOrder: "90", cResPath: "/sys-audit", icon: "Note" },
    // ---- 基础档案 ----
    { id: "r-ba2000", cPid: "0", cCode: "BA2000", cTitle: "基础档案", cOrder: "20", cResPath: "", icon: "Packages" },
    { id: "r-ba2010", cPid: "r-ba2000", cCode: "BA2010", cTitle: "客户档案", cOrder: "10", cResPath: "/customers", icon: "Users" },
    { id: "r-ba2020", cPid: "r-ba2000", cCode: "BA2020", cTitle: "供应商档案", cOrder: "20", cResPath: "/suppliers", icon: "Truck" },
    { id: "r-ba2030", cPid: "r-ba2000", cCode: "BA2030", cTitle: "物料清单", cOrder: "30", cResPath: "/materials", icon: "Package" },
    // ---- 采购管理 ----
    { id: "r-pu3000", cPid: "0", cCode: "PU3000", cTitle: "采购管理", cOrder: "30", cResPath: "", icon: "ShoppingCart" },
    { id: "r-pu3100", cPid: "r-pu3000", cCode: "PU3100", cTitle: "采购执行", cOrder: "10", cResPath: "", icon: "FileText" },
    { id: "r-pu3110", cPid: "r-pu3100", cCode: "PU3110", cTitle: "采购订单", cOrder: "10", cResPath: "/purchase-orders", icon: "FileText" },
    { id: "r-pu3111", cPid: "r-pu3110", cCode: "PU3111", cTitle: "新增", cOrder: "1", cResPath: "", cResSubPath: "btn:add", cRescType: "Widget" },
    { id: "r-pu3112", cPid: "r-pu3110", cCode: "PU3112", cTitle: "编辑", cOrder: "2", cResPath: "", cResSubPath: "btn:edit", cRescType: "Widget" },
    { id: "r-pu3113", cPid: "r-pu3110", cCode: "PU3113", cTitle: "删除", cOrder: "3", cResPath: "", cResSubPath: "btn:delete", cRescType: "Widget" },
    { id: "r-pu3120", cPid: "r-pu3100", cCode: "PU3120", cTitle: "采购入库", cOrder: "20", cResPath: "/purchase-inbound", icon: "Package" },
    // ---- 销售管理 ----
    { id: "r-sa4000", cPid: "0", cCode: "SA4000", cTitle: "销售管理", cOrder: "40", cResPath: "", icon: "TrendingUp" },
    { id: "r-sa4100", cPid: "r-sa4000", cCode: "SA4100", cTitle: "销售执行", cOrder: "10", cResPath: "", icon: "FileText" },
    { id: "r-sa4110", cPid: "r-sa4100", cCode: "SA4110", cTitle: "销售订单", cOrder: "10", cResPath: "/sales-orders", icon: "FileText" },
    { id: "r-sa4120", cPid: "r-sa4100", cCode: "SA4120", cTitle: "销售出库", cOrder: "20", cResPath: "/sales-outbound", icon: "Package" },
    // ---- 库存管理 ----
    { id: "r-in5000", cPid: "0", cCode: "IN5000", cTitle: "库存管理", cOrder: "50", cResPath: "", icon: "LayoutDashboard" },
    { id: "r-in5100", cPid: "r-in5000", cCode: "IN5100", cTitle: "库存查询", cOrder: "10", cResPath: "/stock", icon: "ListTree" },
    { id: "r-in5200", cPid: "r-in5000", cCode: "IN5200", cTitle: "调拨单", cOrder: "20", cResPath: "/transfers", icon: "Truck" },
    // ---- 财务管理 ----
    { id: "r-fi6000", cPid: "0", cCode: "FI6000", cTitle: "财务管理", cOrder: "60", cResPath: "", icon: "Wallet" },
    { id: "r-fi6100", cPid: "r-fi6000", cCode: "FI6100", cTitle: "应收账款", cOrder: "10", cResPath: "/receivables", icon: "FileText" },
    { id: "r-fi6200", cPid: "r-fi6000", cCode: "FI6200", cTitle: "应付账款", cOrder: "20", cResPath: "/payables", icon: "FileText" },
    // ---- 报表中心 ----
    { id: "r-re7000", cPid: "0", cCode: "RE7000", cTitle: "报表中心", cOrder: "70", cResPath: "", icon: "ChartBar" },
    { id: "r-re7100", cPid: "r-re7000", cCode: "RE7100", cTitle: "销售统计", cOrder: "10", cResPath: "/report-sales", icon: "TrendingUp" },
  ];
  return rows.map((r, i) => ({
    cOrder: "1",
    cResPath: "",
    cResSubPath: "",
    cQueryString: "",
    cEnable: "1",
    cRescType: "Menu",
    icon: "FileText",
    creator: "admin",
    createTime: `2026-01-01 09:${String(i % 60).padStart(2, "0")}:00`,
    lastModifier: "",
    lastModifyTime: "",
    ...r,
  })) as HmxRes[];
}

export function loadRescs(): HmxRes[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as HmxRes[];
  } catch {
    /* 数据损坏时回退种子 */
  }
  const seeded = seedRescs();
  saveRescs(seeded);
  return seeded;
}

export function saveRescs(rows: HmxRes[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function newRescId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export interface RescTreeNode extends HmxRes {
  children: RescTreeNode[];
  depth: number;
}

/** 按 Id/CPid 建树（与原 TreeList 的 KeyFieldName/ParentFieldName 一致），根为 cPid === "0" 或找不到父级 */
export function buildRescTree(rows: HmxRes[]): RescTreeNode[] {
  const byPid = new Map<string, HmxRes[]>();
  const ids = new Set(rows.map((r) => r.id));
  for (const row of rows) {
    const pid = row.cPid && row.cPid !== "0" && ids.has(row.cPid) ? row.cPid : "0";
    const bucket = byPid.get(pid) ?? [];
    bucket.push(row);
    byPid.set(pid, bucket);
  }
  const walk = (pid: string, depth: number): RescTreeNode[] =>
    (byPid.get(pid) ?? []).map((row) => ({ ...row, depth, children: walk(row.id, depth + 1) }));
  return walk("0", 0);
}

/** 某节点的子孙 id 集合（含自身；父级下拉需排除自己及后代，避免成环） */
export function descendantIds(rows: HmxRes[], id: string): Set<string> {
  const result = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const row of rows) {
      if (row.cPid && result.has(row.cPid) && !result.has(row.id)) {
        result.add(row.id);
        grew = true;
      }
    }
  }
  return result;
}
