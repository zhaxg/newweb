import { loadSettings, saveSettings } from "@/data/settings";
import type { SystemSettingInfo } from "@/api/admin/types";
import { API_BASE, getBody, ok, type RouteMap } from "./core";

const P = `${API_BASE}/systemKeyValue`;

export const settingsRoutes: RouteMap = {
  [`post ${P}/querySystemSettingInfosV2`]: (config) => ok(config, loadSettings()),
  [`post ${P}/saveSystemSettingInfosV2`]: (config) => {
    saveSettings(getBody<SystemSettingInfo>(config));
    return ok(config, null);
  },
};
