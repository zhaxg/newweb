import {
  formatNow,
  loadAllUsersLite,
  loadRoles,
  loadUserRoles,
  saveRoles,
  saveUserRoles,
  type HmxRole as LocalRole,
} from "@/data/roles";
import { loadRescs } from "@/data/rescs";
import type { HmxKv, HmxRole, RolePermissionOfViewAndWidgets, RoleUserDto } from "@/api/admin/types";
import { RbacRescType } from "@/api/admin/enums";
import { API_BASE, fail, getBody, getParams, matchKeyword, ok, type RouteMap } from "./core";

const P = `${API_BASE}/admin`;
const ROLE_RESC_PERMS_KEY = "hmx.role_resc_perms";

function toApiRole(r: LocalRole): HmxRole {
  return { selected: false, ...r };
}

function loadRoleRescPerms(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(ROLE_RESC_PERMS_KEY);
    if (raw) return JSON.parse(raw) as Record<string, string[]>;
  } catch {
    /* 回退空 */
  }
  return {};
}
function saveRoleRescPerms(map: Record<string, string[]>): void {
  localStorage.setItem(ROLE_RESC_PERMS_KEY, JSON.stringify(map));
}

export const roleRoutes: RouteMap = {
  [`post ${P}/getRoleList`]: (config) => {
    const { keywords } = getParams(config);
    const rows = loadRoles().filter((r) =>
      matchKeyword(r as unknown as Record<string, any>, keywords, ["id", "cRoleName", "cDescription"]),
    );
    return ok(config, rows.map(toApiRole));
  },
  [`post ${P}/addOrEditRole`]: (config) => {
    const body = getBody<Partial<HmxRole>>(config);
    const id = body.id?.trim();
    if (!id) return fail(config, 1001, "缺少角色 id");
    const rows = loadRoles();
    const index = rows.findIndex((r) => r.id === id);
    const audit = { lastModifier: "admin", lastModifyTime: formatNow() };
    if (index >= 0) rows[index] = { ...rows[index], ...body, ...audit } as LocalRole;
    else
      rows.push({
        id,
        cRoleName: body.cRoleName ?? "",
        cDescription: body.cDescription ?? "",
        cState: body.cState ?? "1",
        creator: "admin",
        createTime: formatNow(),
        ...audit,
      } as LocalRole);
    saveRoles(rows);
    return ok(config, id);
  },
  [`post ${P}/checkBeforeRemoveRole`]: (config) => {
    const { roleId } = getParams(config);
    if (!roleId) return fail(config, 1001, "缺少参数 roleId");
    const members = Object.entries(loadUserRoles()).filter(([, roles]) => roles.includes(roleId));
    if (members.length) return fail(config, 1003, `角色尚有 ${members.length} 名成员，请先移除后再删除`);
    return ok(config, null);
  },
  [`post ${P}/deleteRole`]: (config) => {
    const { id } = getParams(config);
    if (!id) return fail(config, 1001, "缺少参数 id");
    saveRoles(loadRoles().filter((r) => r.id !== id));
    return ok(config, id);
  },
  [`post ${P}/queryUserListForRole`]: (config) => {
    const { roleid } = getParams(config);
    const map = loadUserRoles();
    const list: RoleUserDto[] = loadAllUsersLite().map((u) => ({
      userId: u.id,
      userName: u.cUserName,
      marked: roleid ? (map[u.id] ?? []).includes(roleid) : false,
    }));
    return ok(config, list);
  },
  [`post ${P}/saveUserListForRole`]: (config) => {
    const { roleid } = getParams(config);
    const data = getBody<RoleUserDto[]>(config);
    if (!roleid) return fail(config, 1001, "缺少参数 roleid");
    const map = loadUserRoles();
    for (const u of data) {
      const uid = u.userId ?? "";
      const list = map[uid] ?? [];
      const has = list.includes(roleid);
      if (u.marked && !has) map[uid] = [...list, roleid];
      else if (!u.marked && has) map[uid] = list.filter((x) => x !== roleid);
    }
    saveUserRoles(map);
    return ok(config, null);
  },
  [`post ${P}/getResourceNamespaceList`]: (config) => {
    const ns = new Set<string>(loadRescs().map(() => "TDWEB"));
    ns.add("DEFAULT");
    const list: HmxKv[] = [...ns].map((code, i) => ({ selected: false, id: `ns-${i}`, cCode: code, cName: code }));
    return ok(config, list);
  },
  [`post ${P}/queryRolePermissionOfViewAndWidgets`]: (config) => {
    const { roleId } = getBody<{ roleId?: string; groupId?: string }>(config);
    const perms = new Set(roleId ? (loadRoleRescPerms()[roleId] ?? []) : []);
    const nodes: RolePermissionOfViewAndWidgets[] = loadRescs()
      .filter((r) => r.cRescType === "Menu" || r.cRescType === "Widget")
      .map((r) => ({
        selected: perms.has(r.id),
        id: r.id,
        cpId: r.cPid === "0" ? "" : r.cPid,
        cCode: r.cCode,
        cName: r.cTitle,
        cType: (r.cRescType === "Widget" ? RbacRescType.Widget : RbacRescType.Menu) as RbacRescType,
        cIcon: r.icon,
      }));
    return ok(config, nodes);
  },
  [`post ${P}/saveRolePermissionOfViewAndWidgets`]: (config) => {
    const { roleId, permissions } = getBody<{ roleId?: string; permissions?: RolePermissionOfViewAndWidgets[] }>(config);
    if (!roleId) return fail(config, 1001, "缺少参数 roleId");
    const ids = (permissions ?? []).map((p) => p.id ?? "").filter(Boolean);
    const map = loadRoleRescPerms();
    map[roleId] = ids;
    saveRoleRescPerms(map);
    return ok(config, null);
  },
};
