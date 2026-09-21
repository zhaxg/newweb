import { loadRescs, saveRescs } from "./store";
import { NextStrId } from "@/lib/yitIdHelper";
import type { HmxRes } from "@/api/admin/types";
import { RbacRescType } from "@/api/admin/enums";
import { API_BASE, fail, getBody, getParams, ok, type RouteMap } from "./core";

const P = `${API_BASE}/admin`;

/** 种子表与接口契约同为 HmxRes（api/admin/types），fromApi 仅补新增行的默认值 */
export function fromApi(api: Partial<HmxRes>, existing?: HmxRes): HmxRes {
  const base: HmxRes = existing ?? {
    selected: false,
    id: NextStrId(),
    cCode: "",
    creator: "admin",
    cEnable: "1",
    cIcon: "",
    lastModifier: "",
    cName: "",
    cTitle: "",
    cNsCode: "TDWEB",
    cOrder: "1",
    cPid: "",
    cQueryString: "",
    cResPath: "",
    cResSubPath: "",
    cResType: RbacRescType.Menu,
    createTime: new Date().toISOString().slice(0, 16).replace("T", " "),
    lastModifyTime: "",
    rowVersion: 0,
  };
  return { ...base, ...api, id: api.id || base.id || NextStrId() };
}

export const rescRoutes: RouteMap = {
  [`post ${P}/getResources`]: (config) => {
    const { ns } = getParams(config);
    return ok(config, loadRescs().filter((r) => !ns || r.cNsCode === ns));
  },
  [`post ${P}/getAllResouces`]: (config) => {
    const { ns } = getParams(config);
    const types = getBody<RbacRescType[]>(config);
    const all = loadRescs().filter((r) => !ns || r.cNsCode === ns);
    const filtered = Array.isArray(types) && types.length ? all.filter((r) => types.includes(r.cResType)) : all;
    return ok(config, filtered);
  },
  [`post ${P}/addOrEditResource`]: (config) => {
    const body = getBody<Partial<HmxRes>>(config);
    const rows = loadRescs();
    const index = rows.findIndex((r) => r.id === body.id);
    if (index >= 0) {
      const merged = fromApi(body, rows[index]);
      merged.id = rows[index].id;
      merged.creator = rows[index].creator;
      merged.createTime = rows[index].createTime;
      rows[index] = merged;
      saveRescs(rows);
      return ok(config, merged);
    }
    const created = fromApi({ ...body, id: "" });
    rows.push(created);
    saveRescs(rows);
    return ok(config, created);
  },
  [`post ${P}/deleteResource`]: (config) => {
    const { id } = getParams(config);
    if (!id) return fail(config, 1001, "缺少参数 id");
    const rows = loadRescs();
    if (rows.some((r) => r.cPid === id)) return fail(config, 1004, "当前资源具有子集，不允许直接删除，请删除子集后再操作！");
    saveRescs(rows.filter((r) => r.id !== id));
    return ok(config, id);
  },
  [`post ${P}/queryButtonsResc`]: (config) => {
    const { parentRescId } = getParams(config);
    const list = loadRescs().filter((r) => r.cResType === RbacRescType.Widget && r.cPid === parentRescId);
    return ok(config, list);
  },
};
