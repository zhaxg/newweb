import { erpMenu, type ErpMenuNode } from "./erpMenu";

/** 角色主档（对应原 WinForms HmxRole 表） */
export interface HmxRole {
  id: string;
  cRoleName: string;
  cDescription: string;
  creator: string;
  createTime: string;
  lastModifier: string;
  lastModifyTime: string;
  /** "1" 正常 / "0" 禁用 */
  cState: string;
}

/** 用户行只读引用（不依赖 users.ts，避免耦合其他模块） */
export interface UserRowLite {
  id: string;
  cUserName: string;
}

const ROLES_KEY = "erp.roles";
const ROLE_PERMS_KEY = "erp.role_perms";
const USER_ROLES_KEY = "erp.user_roles";
const USERS_KEY = "erp.users";

function collectMenuIds(nodes: ErpMenuNode[]): string[] {
  return nodes.flatMap((n) => [n.id, ...(n.children ? collectMenuIds(n.children) : [])]);
}

function subtreeIds(rootId: string): string[] {
  const find = (nodes: ErpMenuNode[]): ErpMenuNode | null => {
    for (const n of nodes) {
      if (n.id === rootId) return n;
      const found = n.children ? find(n.children) : null;
      if (found) return found;
    }
    return null;
  };
  const node = find(erpMenu);
  return node ? collectMenuIds([node]) : [];
}

function seedRoles(): HmxRole[] {
  return [
    { id: "r-admin", cRoleName: "系统管理员", cDescription: "拥有系统全部菜单与功能权限", creator: "admin", createTime: "2024-01-02 09:00", lastModifier: "admin", lastModifyTime: "2025-12-01 14:20", cState: "1" },
    { id: "r-purchase", cRoleName: "采购员", cDescription: "采购模块操作权限", creator: "admin", createTime: "2024-03-11 10:05", lastModifier: "admin", lastModifyTime: "2025-06-18 16:42", cState: "1" },
    { id: "r-sales", cRoleName: "销售员", cDescription: "销售模块操作权限", creator: "admin", createTime: "2024-03-11 10:08", lastModifier: "admin", lastModifyTime: "2025-06-18 16:45", cState: "1" },
    { id: "r-wh", cRoleName: "仓管员", cDescription: "库存模块操作权限", creator: "admin", createTime: "2024-05-20 08:30", lastModifier: "admin", lastModifyTime: "2025-09-02 11:15", cState: "1" },
    { id: "r-fin", cRoleName: "财务", cDescription: "财务模块操作权限", creator: "admin", createTime: "2024-05-20 08:33", lastModifier: "admin", lastModifyTime: "2025-09-02 11:18", cState: "1" },
    { id: "r-user", cRoleName: "普通用户", cDescription: "仅可查看报表与库存（只读）", creator: "admin", createTime: "2024-08-01 09:00", lastModifier: "admin", lastModifyTime: "2025-01-06 10:00", cState: "0" },
  ];
}

function seedRolePerms(): Record<string, string[]> {
  return {
    "r-admin": collectMenuIds(erpMenu),
    "r-purchase": subtreeIds("purchase"),
    "r-sales": subtreeIds("sales"),
    "r-wh": subtreeIds("inventory"),
    "r-fin": subtreeIds("finance"),
    "r-user": ["report", "rpt-sales-group", "rpt-sales", "rpt-inventory", "inventory", "inv-stock"],
  };
}

function seedUserRoles(): Record<string, string[]> {
  return {
    "u-admin": ["r-admin"],
    "u-zw": ["r-purchase"],
    "u-ln": ["r-purchase"],
    "u-wq": ["r-sales"],
    "u-ly": ["r-sales"],
    "u-cj": ["r-wh"],
    "u-zl": ["r-fin"],
    "u-sl": ["r-user"],
  };
}

function seedUsersLite(): UserRowLite[] {
  return [
    { id: "u-admin", cUserName: "管理员" },
    { id: "u-zw", cUserName: "张伟" },
    { id: "u-ln", cUserName: "李娜" },
    { id: "u-wq", cUserName: "王强" },
    { id: "u-ly", cUserName: "刘洋" },
    { id: "u-cj", cUserName: "陈静" },
    { id: "u-zl", cUserName: "赵磊" },
    { id: "u-sl", cUserName: "孙丽" },
  ];
}

export function loadRoles(): HmxRole[] {
  try {
    const raw = localStorage.getItem(ROLES_KEY);
    if (raw) return JSON.parse(raw) as HmxRole[];
  } catch {
    /* 数据损坏时回退种子 */
  }
  const seeded = seedRoles();
  saveRoles(seeded);
  return seeded;
}

export function saveRoles(rows: HmxRole[]): void {
  localStorage.setItem(ROLES_KEY, JSON.stringify(rows));
}

export function newRoleId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

/** roleId -> erpMenu 节点 id 集合 */
export function loadRolePerms(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(ROLE_PERMS_KEY);
    if (raw) return JSON.parse(raw) as Record<string, string[]>;
  } catch {
    /* 数据损坏时回退种子 */
  }
  const seeded = seedRolePerms();
  saveRolePerms(seeded);
  return seeded;
}

export function saveRolePerms(perms: Record<string, string[]>): void {
  localStorage.setItem(ROLE_PERMS_KEY, JSON.stringify(perms));
}

/** userId -> roleId 集合 */
export function loadUserRoles(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(USER_ROLES_KEY);
    if (raw) return JSON.parse(raw) as Record<string, string[]>;
  } catch {
    /* 数据损坏时回退种子 */
  }
  const seeded = seedUserRoles();
  saveUserRoles(seeded);
  return seeded;
}

export function saveUserRoles(userRoles: Record<string, string[]>): void {
  localStorage.setItem(USER_ROLES_KEY, JSON.stringify(userRoles));
}

/** 读取用户列表（只读引用 erp.users，无数据时回退内置种子） */
export function loadAllUsersLite(): UserRowLite[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      const rows = JSON.parse(raw) as Array<Partial<UserRowLite>>;
      const list = rows
        .filter((r): r is { id: string; cUserName: string } => typeof r?.id === "string" && typeof r?.cUserName === "string")
        .map((r) => ({ id: r.id, cUserName: r.cUserName }));
      if (list.length) return list;
    }
  } catch {
    /* 解析失败时回退种子 */
  }
  return seedUsersLite();
}

/** "YYYY-MM-DD HH:mm" 格式的当前时间，用于新增/修改时间列 */
export function formatNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
