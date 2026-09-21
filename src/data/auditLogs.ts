export interface AuditLog {
  id: string;
  /** YYYY-MM-DD HH:mm:ss */
  time: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  target: string;
  ip: string;
  /** 成功/失败 */
  result: string;
  detail: string;
}

export const ACTIONS = ["登录", "登出", "查询", "新增", "修改", "删除", "导出", "授权"] as const;
export const MODULES = ["系统管理", "基础档案", "采购管理", "销售管理", "库存管理", "财务管理", "报表中心"] as const;

const STORAGE_KEY = "hmx.audit_logs";

/** 兼容非安全上下文（http://IP）下 crypto.randomUUID 不可用 */
function safeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}

const USERS = [
  { userId: "admin", userName: "admin" },
  { userId: "u001", userName: "张伟" },
  { userId: "u002", userName: "李娜" },
  { userId: "u003", userName: "王强" },
  { userId: "u004", userName: "刘洋" },
];

const TARGETS: Record<string, string[]> = {
  登录: ["统一身份认证"],
  登出: ["统一身份认证"],
  查询: ["部门档案", "用户列表", "销售订单 SO-2026-0318", "采购订单 PO-2026-0075", "库存台账", "凭证列表", "键值对（数据字典）", "审计日志"],
  新增: ["部门[智能装备事业部]", "用户[chenting]", "销售订单 SO-2026-0329", "采购申请 PR-2026-0102", "收款单 REC-2026-0044", "键值对子项[DONE]"],
  修改: ["部门[测试科]→[质检科]", "用户[wangqiang]联系方式", "角色[财务专员]权限", "物料编码 M-10023 单价", "销售订单 SO-2026-0318 交期"],
  删除: ["部门[临时项目组]", "用户[lina]账号", "采购订单 PO-2026-0031", "键值对子项[TEST]", "凭证 VO-2026-0009"],
  导出: ["销售汇总表 2026-08", "库存盘点表", "科目余额表", "员工花名册"],
  授权: ["角色[采购员]授予用户[zhangwei]", "菜单[报表中心]授予角色[部门经理]", "用户[liuyang]数据权限-事业部", "重置用户[lina]密码"],
};

const DETAILS: Record<string, string> = {
  登录: "账号密码登录",
  登出: "用户主动退出",
  查询: "条件组合查询",
  新增: "表单提交新增",
  修改: "编辑保存修改",
  删除: "列表选中删除",
  导出: "导出 Excel",
  授权: "权限变更操作",
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatTime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

function seedAuditLogs(): AuditLog[] {
  const rows: AuditLog[] = [];
  const now = Date.now();
  for (let i = 0; i < 80; i++) {
    const action = pick(ACTIONS);
    const user = pick(USERS);
    // 删除/授权类少量失败
    const failed = (action === "删除" || action === "授权") && Math.random() < 0.25;
    const time = new Date(now - Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000));
    rows.push({
      id: safeId().replace(/-/g, ""),
      time: formatTime(time),
      userId: user.userId,
      userName: user.userName,
      action,
      module: pick(MODULES),
      target: pick(TARGETS[action]!),
      ip: `192.168.1.${Math.floor(Math.random() * 200) + 10}`,
      result: failed ? "失败" : "成功",
      detail: failed ? `${DETAILS[action]}失败：权限不足或数据被引用` : DETAILS[action]!,
    });
  }
  rows.sort((a, b) => (a.time < b.time ? 1 : -1));
  return rows;
}

export function loadAuditLogs(): AuditLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AuditLog[];
  } catch {
    /* 数据损坏时回退种子 */
  }
  const seeded = seedAuditLogs();
  saveAuditLogs(seeded);
  return seeded;
}

/** 登录/登出实时落审计（移植自 HmxLoginForm 认证流） */
export function appendAuditAuth(action: "登录" | "登出", userId: string, userName: string): void {
  const rows = loadAuditLogs();
  rows.unshift({
    id: safeId().replace(/-/g, ""),
    time: formatTime(new Date()),
    userId,
    userName,
    action,
    module: "系统管理",
    target: "统一身份认证",
    ip: "127.0.0.1",
    result: "成功",
    detail: DETAILS[action]!,
  });
  saveAuditLogs(rows);
}

function saveAuditLogs(rows: AuditLog[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}
