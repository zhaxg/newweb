import type { SystemSettingInfo } from "@/api/admin/types";

/** 系统参数 mock「数据库」（hmx.settings），页面经 systemKeyValueApi 走接口层。 */

const SETTINGS_KEY = "hmx.settings";

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
  const seeded = seedSettings();
  saveSettings(seeded);
  return seeded;
}

export function saveSettings(data: SystemSettingInfo): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
}
