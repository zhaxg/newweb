import {
  loadRoles,
  loadUserRoles as loadUserRolesMap,
  loadUsers,
  saveUserRoles as saveUserRolesMapFrom,
  saveUsers,
} from "./store";
import { NextStrId } from "@/lib/yitIdHelper";
import type { HmxUser } from "@/api/admin/types";
import { API_BASE, fail, getBody, getParams, matchKeyword, ok, type RouteMap } from "./core";

function filterUsers(rows: HmxUser[], keywords?: string): HmxUser[] {
  const kw = (keywords ?? "").trim();
  if (!kw) return rows;
  return rows.filter((r) =>
    matchKeyword(r as unknown as Record<string, any>, kw, ["id", "cUserName", "cPhone", "cEmail"]),
  );
}

const P = `${API_BASE}/admin`;

export const userRoutes: RouteMap = {
  [`post ${P}/getUsers`]: (config) => ok(config, filterUsers(loadUsers(), getParams(config).keywords)),
  [`post ${P}/addOrEditUser`]: (config) => {
    const body = getBody<Partial<HmxUser>>(config);
    if (!body.id?.trim() || !body.cUserName?.trim()) {
      return fail(config, 1001, "校验失败：登录名与用户名不能为空");
    }
    const rows = loadUsers();
    const user = { ...body, id: body.id.trim() } as HmxUser;
    const index = rows.findIndex((r) => r.id === user.id);
    if (index >= 0) rows[index] = user;
    else rows.push({ ...user, id: user.id || NextStrId() });
    saveUsers(rows);
    return ok(config, user.id);
  },
  [`post ${P}/resetPassword`]: (config) => {
    const { userid } = getParams(config);
    if (!userid) return fail(config, 1001, "缺少参数 userid");
    if (!loadUsers().some((r) => r.id === userid)) return fail(config, 1002, "用户不存在");
    return ok(config, "Abc@123456");
  },
  [`post ${P}/modifyPassword`]: (config) => {
    const { userid, oldpasswd, newpasswd } = getParams(config);
    if (!userid || !oldpasswd || !newpasswd) return fail(config, 1001, "缺少参数");
    if (!loadUsers().some((r) => r.id === userid)) return fail(config, 1002, "用户不存在");
    return ok(config, null);
  },
  [`post ${P}/deleteUser`]: (config) => {
    const { userid } = getParams(config);
    if (!userid) return fail(config, 1001, "缺少参数 userid");
    saveUsers(loadUsers().filter((r) => r.id !== userid));
    return ok(config, userid);
  },
  // 用户角色分配（UserRoleEditDialog）：读该用户已有角色 id 列表 / 覆盖写
  [`post ${P}/getUserRoleList`]: (config) => {
    const { userId } = getParams(config);
    const map = loadUserRolesMap();
    const roleIds = userId ? (map[userId] ?? []) : [];
    const all = loadRoles();
    return ok(
      config,
      all.filter((r) => roleIds.includes(r.id ?? "")),
    );
  },
  [`post ${P}/updateUserRoleList`]: (config) => {
    const { userId, roleIds } = getBody<{ userId?: string; roleIds?: string[] }>(config);
    if (!userId) return fail(config, 1001, "缺少参数 userId");
    const map = loadUserRolesMap();
    map[userId] = roleIds ?? [];
    saveUserRolesMapFrom(map);
    return ok(config, null);
  },
};
