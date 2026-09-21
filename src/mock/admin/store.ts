import type { HmxBackgroudJobInfo, HmxRes, HmxSchedulerStatusInfo, SystemSettingInfo } from "@/api/admin/types";
import { HmxJobMisfiredEnums, YesNo } from "@/api/admin/enums";
import type { HmxDept } from "@/data/departments";
import type { HmxKv } from "@/data/kv";
import type { HmxRole, UserRowLite } from "@/data/roles";
import type { HmxUser } from "@/data/users";
import { seedDeptsData } from "./data/depts";
import { seedKvsData } from "./data/kvs";
import { seedRescsData } from "./data/rescs";
import { seedRolesData } from "./data/roles";
import { seedUsersData } from "./data/users";

/**
 * mock「数据库」：localStorage 持久层。表数据一律来自 ./data（一表一文件，
 * 手造或后端导出的区别只在于 seed 文件内容）；首次读取时落盘，之后保存即回写。
 * 只有 mock 路由代码依赖本模块，页面一律走接口层（request.ts）。
 */

const USERS_KEY = "hmx.users.v2";
const ROLES_KEY = "hmx.roles.v2";
const USER_ROLES_KEY = "hmx.user_roles.v3";
const DEPTS_KEY = "hmx.departments.v3";
const RESCS_KEY = "hmx.rescs.v8";
const KVS_KEY = "hmx.kv.v2";
const SETTINGS_KEY = "hmx.settings";
const JOBS_KEY = "hmx.jobs";
const SCHEDULER_KEY = "hmx.scheduler";

function loadJson<T>(key: string, seed: () => T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* 数据损坏时回退种子 */
  }
  const seeded = seed();
  localStorage.setItem(key, JSON.stringify(seeded));
  return seeded;
}

function saveJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ---------- 用户 ---------- */

export const loadUsers = () => loadJson<HmxUser[]>(USERS_KEY, () => seedUsersData);
export const saveUsers = (rows: HmxUser[]) => saveJson(USERS_KEY, rows);

/** userId -> roleId 列表 */
export const loadUserRoles = () => loadJson<Record<string, string[]>>(USER_ROLES_KEY, () => ({ admin: ["r-admin"] }));
export const saveUserRoles = (map: Record<string, string[]>) => saveJson(USER_ROLES_KEY, map);

/* ---------- 角色 ---------- */

export const loadRoles = () => loadJson<HmxRole[]>(ROLES_KEY, () => seedRolesData);
export const saveRoles = (rows: HmxRole[]) => saveJson(ROLES_KEY, rows);

/** 读取用户列表只读引用（角色关联用户用） */
export function loadAllUsersLite(): UserRowLite[] {
  return loadUsers().map(({ id, cUserName }) => ({ id, cUserName }));
}

/** "YYYY-MM-DD HH:mm" 当前时间（新增/修改时间列） */
export function formatNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ---------- 部门 / 资源 / 键值对 ---------- */

export const loadDepartments = () => loadJson<HmxDept[]>(DEPTS_KEY, () => seedDeptsData);
export const saveDepartments = (rows: HmxDept[]) => saveJson(DEPTS_KEY, rows);

export const loadRescs = () => loadJson<HmxRes[]>(RESCS_KEY, () => seedRescsData);
export const saveRescs = (rows: HmxRes[]) => saveJson(RESCS_KEY, rows);

export const loadKvs = () => loadJson<HmxKv[]>(KVS_KEY, () => seedKvsData);
export const saveKvs = (rows: HmxKv[]) => saveJson(KVS_KEY, rows);

/* ---------- 系统参数 ---------- */

function seedSettings(): SystemSettingInfo {
  return {
    reportBaseAddress: "http://localhost/report",
    productVersion: "1.0.0",
    dataBaseSignkey: "",
    serverSignKey: "",
    productName: "智能制造 ERP",
    copyRight: "© 2026 HMX",
    customer: "示例客户",
    telephone: "400-000-0000",
    syncClientTime: true,
    imageFolder: "/images",
    isDemoModel: true,
    allowAdminUseNormalModule: true,
    allowNormalUseSystemModule: false,
    defaultLogFolder: "/logs",
    retainLogDays: 30,
    checkAutoUpdateInterval: 60,
    forceToUseDateBaseServerTime: false,
    timeoutOfLogin: 30,
    allowShowTopBanner: true,
    enableCustomSkins: true,
    enableNotifications: true,
    allowAddUserWithSystemManager: false,
  };
}

export function loadSettings(): SystemSettingInfo {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as SystemSettingInfo;
  } catch {
    /* 回退种子 */
  }
  saveSettings(seedSettings());
  return seedSettings();
}

export function saveSettings(data: SystemSettingInfo): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
}

/* ---------- 计划任务 / 调度器 ---------- */

function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function nowPlus(min: number): string {
  return fmt(new Date(Date.now() + min * 60_000));
}

function seedJobs(): HmxBackgroudJobInfo[] {
  return [
    {
      id: "job-sample",
      cName: "样例任务",
      cTrigerName: "5分钟",
      cSetupTime: fmt(new Date()),
      cCronExp: "",
      nIntervalMinutes: 5,
      nRepetCount: -1,
      nDelayMinutes: 0,
      cNextTime: nowPlus(5),
      cLastTime: fmt(new Date()),
      cLastMessage: "执行成功",
      cScheduler: "默认调度器",
      cAssemblyQualifiedName: "Hmx.Http.Core.Scheduler.SimpleJobTest, Hmx.Http.Core",
      enable: YesNo.Y,
      enablePaiallel: YesNo.N,
      cFlagMisfired: HmxJobMisfiredEnums.ExecuteNow,
    },
    {
      id: "job-clean",
      cName: "日志清理任务",
      cTrigerName: "每天",
      cSetupTime: fmt(new Date()),
      cCronExp: "0 0 3 * * ?",
      nIntervalMinutes: 1440,
      nRepetCount: -1,
      nDelayMinutes: 0,
      cNextTime: nowPlus(1440),
      cLastTime: fmt(new Date()),
      cLastMessage: "等待执行",
      cScheduler: "默认调度器",
      cAssemblyQualifiedName: "Hmx.Http.Core.Scheduler.LogCleanJob, Hmx.Http.Core",
      enable: YesNo.N,
      enablePaiallel: YesNo.N,
      cFlagMisfired: HmxJobMisfiredEnums.ExecuteNext,
    },
  ];
}

function seedScheduler(): HmxSchedulerStatusInfo {
  return { enable: true, schedulerName: "默认调度器", lastUpdateTime: fmt(new Date()) };
}

export const loadJobs = () => loadJson<HmxBackgroudJobInfo[]>(JOBS_KEY, seedJobs);
export const saveJobs = (rows: HmxBackgroudJobInfo[]) => saveJson(JOBS_KEY, rows);

export function loadScheduler(): HmxSchedulerStatusInfo {
  try {
    const raw = localStorage.getItem(SCHEDULER_KEY);
    if (raw) return JSON.parse(raw) as HmxSchedulerStatusInfo;
  } catch {
    /* 回退种子 */
  }
  const seeded = seedScheduler();
  saveScheduler(seeded);
  return seeded;
}

export function saveScheduler(status: HmxSchedulerStatusInfo): void {
  localStorage.setItem(SCHEDULER_KEY, JSON.stringify(status));
}
