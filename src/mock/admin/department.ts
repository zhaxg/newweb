import { loadDepartments, saveDepartments } from "./store";
import { NextStrId } from "@/lib/yitIdHelper";
import type { HmxDept } from "@/api/admin/types";
import { API_BASE, getBody, ok, type RouteMap } from "./core";

/** 部门接口 mock：department/queryAllDepartments | save | delete（单行语义，同真实后端） */
export const departmentRoutes: RouteMap = {
  [`post ${API_BASE}/department/queryAllDepartments`]: (config) => ok(config, loadDepartments()),
  [`post ${API_BASE}/department/save`]: (config) => {
    const dept = getBody<HmxDept>(config);
    const rows = loadDepartments();
    if (!dept.id) {
      const created: HmxDept = { ...dept, id: NextStrId() };
      rows.push(created);
      saveDepartments(rows);
      return ok(config, created);
    }
    const i = rows.findIndex((r) => r.id === dept.id);
    if (i >= 0) rows[i] = dept;
    else rows.push(dept);
    saveDepartments(rows);
    return ok(config, dept);
  },
  [`post ${API_BASE}/department/delete`]: (config) => {
    const dept = getBody<HmxDept>(config);
    saveDepartments(loadDepartments().filter((r) => r.id !== dept.id));
    return ok(config, null);
  },
};
