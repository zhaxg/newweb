export interface HmxUser {
  id: string;
  cUserName: string;
  cUserType: string;
  cPhone: string;
  cSex: string;
  cEmail: string;
  /** "1" 正常 / "0" 禁用 */
  cStatus: string;
  cManager: boolean;
  creator: string;
  createTime: string;
  lastModifier: string;
  lastModifyTime: string;
  cDeptId: string | null;
  cPost: string;
  cDuty: string;
  cEdu: string;
  cNative: string;
  cPolitics: string;
  cNation: string;
  cIdCard: string;
  cSocialSec: string;
}

const STORAGE_KEY = "erp.users";
const USER_ROLE_KEY = "erp.user_roles";
const ROLES_KEY = "erp.roles";

export const USER_TYPES = ["内部用户", "外部用户", "系统账号"];
export const SEXES = ["男", "女"];
export const EDUS = ["高中以下", "大学本科", "硕士研究生", "博士研究生"];
export const POLITICS = ["中共党员", "共青团员", "民主党派", "群众"];
export const NATIONS = ["汉族", "蒙古族", "回族", "藏族", "维吾尔族", "苗族", "彝族", "壮族", "满族", "其他"];
export const PROVINCES = [
  "北京市", "天津市", "河北省", "山西省", "内蒙古", "辽宁省", "吉林省", "黑龙江省",
  "上海市", "江苏省", "浙江省", "安徽省", "福建省", "江西省", "山东省", "河南省",
  "湖北省", "湖南省", "广东省", "广西", "海南省", "重庆市", "四川省", "贵州省",
  "云南省", "西藏", "陕西省", "甘肃省",
];

function seedUsers(): HmxUser[] {
  const rows: Array<Partial<HmxUser> & { id: string; cUserName: string }> = [
    { id: "admin", cUserName: "系统管理员", cUserType: "系统账号", cPhone: "13800000001", cSex: "男", cEmail: "admin@hmx.com", cStatus: "1", cManager: true, cDeptId: "root", cPost: "系统管理", cDuty: "管理员", cEdu: "大学本科", cNative: "北京市", cPolitics: "中共党员", cNation: "汉族", creator: "system", createTime: "2024-01-05 09:00:00", lastModifier: "admin", lastModifyTime: "2025-03-18 14:22:31" },
    { id: "zhangwei", cUserName: "张伟", cUserType: "内部用户", cPhone: "13912345678", cSex: "男", cEmail: "zhangwei@hmx.com", cStatus: "1", cManager: false, cDeptId: "fin", cPost: "财务主管", cDuty: "主管", cEdu: "硕士研究生", cNative: "山东省", cPolitics: "中共党员", cNation: "汉族", creator: "admin", createTime: "2024-03-12 10:15:00", lastModifier: "admin", lastModifyTime: "2024-11-02 16:40:12" },
    { id: "lina", cUserName: "李娜", cUserType: "内部用户", cPhone: "13887654321", cSex: "女", cEmail: "lina@hmx.com", cStatus: "1", cManager: false, cDeptId: "hr", cPost: "招聘专员", cEdu: "大学本科", cNative: "江苏省", cPolitics: "共青团员", cNation: "汉族", creator: "admin", createTime: "2024-05-20 09:30:00" },
    { id: "wangqiang", cUserName: "王强", cUserType: "内部用户", cPhone: "13700001111", cSex: "男", cEmail: "wangqiang@hmx.com", cStatus: "1", cManager: false, cDeptId: "it-dev", cPost: "研发工程师", cDuty: "工程师", cEdu: "大学本科", cNative: "湖北省", cPolitics: "群众", cNation: "汉族", creator: "admin", createTime: "2024-06-01 08:45:00", lastModifier: "admin", lastModifyTime: "2025-01-10 11:05:00" },
    { id: "liuyang", cUserName: "刘洋", cUserType: "内部用户", cPhone: "13611112222", cSex: "男", cEmail: "liuyang@hmx.com", cStatus: "1", cManager: false, cDeptId: "bu-mfg", cPost: "生产计划员", cEdu: "高中以下", cNative: "河北省", cPolitics: "群众", cNation: "汉族", cIdCard: "130102199001011234", creator: "admin", createTime: "2024-07-15 13:20:00" },
    { id: "chenjing", cUserName: "陈静", cUserType: "内部用户", cPhone: "13522223333", cSex: "女", cEmail: "chenjing@hmx.com", cStatus: "1", cManager: false, cDeptId: "sal-dom", cPost: "销售内勤", cEdu: "大学本科", cNative: "浙江省", cPolitics: "民主党派", cNation: "回族", creator: "admin", createTime: "2024-09-03 15:10:00" },
    { id: "zhaolei", cUserName: "赵磊", cUserType: "内部用户", cPhone: "13433334444", cSex: "男", cEmail: "zhaolei@hmx.com", cStatus: "0", cManager: false, cDeptId: null, cPolitics: "中共党员", cNation: "汉族", creator: "admin", createTime: "2024-10-11 10:00:00", lastModifier: "admin", lastModifyTime: "2025-02-28 09:12:45" },
    { id: "sunli", cUserName: "孙丽", cUserType: "外部用户", cPhone: "13344445555", cSex: "女", cEmail: "sunli@partner.com", cStatus: "1", cManager: false, cDeptId: null, cEdu: "大学本科", cNative: "广东省", cPolitics: "群众", cNation: "满族", creator: "admin", createTime: "2025-01-08 11:30:00" },
    { id: "zhoujun", cUserName: "周军", cUserType: "外部用户", cPhone: "13255556666", cSex: "男", cEmail: "zhoujun@vendor.com", cStatus: "1", cManager: false, cDeptId: null, cEdu: "高中以下", cNative: "四川省", cPolitics: "群众", cNation: "藏族", cSocialSec: "SC51010012345", creator: "admin", createTime: "2025-02-14 14:55:00" },
    { id: "wumin", cUserName: "吴敏", cUserType: "内部用户", cPhone: "13166667777", cSex: "女", cEmail: "wumin@hmx.com", cStatus: "1", cManager: false, cDeptId: "fin-acct", cPost: "会计", cDuty: "主办会计", cEdu: "硕士研究生", cNative: "上海市", cPolitics: "共青团员", cNation: "苗族", creator: "admin", createTime: "2025-03-25 09:05:00", lastModifier: "admin", lastModifyTime: "2025-06-01 17:20:33" },
  ];
  return rows.map((r) => ({
    cUserType: "内部用户",
    cPhone: "",
    cSex: "",
    cEmail: "",
    cStatus: "1",
    cManager: false,
    creator: "admin",
    createTime: "",
    lastModifier: "",
    lastModifyTime: "",
    cDeptId: null,
    cPost: "",
    cDuty: "",
    cEdu: "",
    cNative: "",
    cPolitics: "",
    cNation: "",
    cIdCard: "",
    cSocialSec: "",
    ...r,
  })) as HmxUser[];
}

export function loadUsers(): HmxUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as HmxUser[];
  } catch {
    /* 数据损坏时回退种子 */
  }
  const seeded = seedUsers();
  saveUsers(seeded);
  return seeded;
}

export function saveUsers(rows: HmxUser[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function newUserId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

/** userId -> roleId 列表 */
export function loadUserRoles(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(USER_ROLE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, string[]>;
  } catch {
    /* 数据损坏时视为空 */
  }
  return {};
}

export function saveUserRoles(map: Record<string, string[]>): void {
  localStorage.setItem(USER_ROLE_KEY, JSON.stringify(map));
}

export interface RoleOption {
  id: string;
  cRoleName: string;
  cDescription: string;
}

function seedRoleOptions(): RoleOption[] {
  return [
    { id: "role-admin", cRoleName: "系统管理员", cDescription: "拥有全部系统权限" },
    { id: "role-purchase", cRoleName: "采购员", cDescription: "采购业务相关权限" },
    { id: "role-sales", cRoleName: "销售员", cDescription: "销售业务相关权限" },
    { id: "role-wh", cRoleName: "仓管员", cDescription: "库存出入库权限" },
    { id: "role-fin", cRoleName: "财务", cDescription: "财务核算与报表权限" },
    { id: "role-user", cRoleName: "普通用户", cDescription: "仅基础查询权限" },
  ];
}

/** 读取角色管理页面维护的 erp.roles；无数据或解析失败时返回内置种子 */
export function loadRoleOptions(): RoleOption[] {
  try {
    const raw = localStorage.getItem(ROLES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const out: RoleOption[] = parsed.flatMap((item: unknown, i: number) => {
          if (!item || typeof item !== "object") return [];
          const rec = item as Record<string, unknown>;
          const name = String(rec.cRoleName ?? rec.name ?? rec.roleName ?? "").trim();
          if (!name) return [];
          const id = String(rec.id ?? `role-${i}`).trim();
          const desc = String(rec.cDescription ?? rec.description ?? "").trim();
          return [{ id, cRoleName: name, cDescription: desc }];
        });
        if (out.length) return out;
      }
    }
  } catch {
    /* 数据损坏时回退种子 */
  }
  return seedRoleOptions();
}
