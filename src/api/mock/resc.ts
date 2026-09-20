import { loadRescs, newRescId, saveRescs, type HmxRes as LocalResc } from "@/data/rescs";
import type { HmxRes } from "@/api/admin/types";
import { RbacRescType } from "@/api/admin/enums";
import { API_BASE, fail, getBody, getParams, ok, type RouteMap } from "./core";

const P = `${API_BASE}/admin`;

const TYPE_TO_ENUM: Record<string, RbacRescType> = {
  Menu: RbacRescType.Menu,
  Widget: RbacRescType.Widget,
  DataItem: RbacRescType.DataItem,
  DataColumn: RbacRescType.DataColumn,
};
const ENUM_TO_TYPE: Record<number, string> = {
  [RbacRescType.Menu]: "Menu",
  [RbacRescType.Widget]: "Widget",
  [RbacRescType.DataItem]: "DataItem",
  [RbacRescType.DataColumn]: "DataColumn",
  [RbacRescType.Action]: "Widget",
};

export function toApi(r: LocalResc, ns = "TDWEB"): HmxRes {
  return {
    selected: false,
    id: r.id,
    cCode: r.cCode,
    creator: r.creator,
    cEnable: r.cEnable,
    cIcon: r.icon,
    lastModifier: r.lastModifier,
    cName: "",
    cTitle: r.cTitle,
    cNsCode: ns,
    cOrder: r.cOrder,
    cPid: r.cPid === "0" ? "" : r.cPid,
    cQueryString: r.cQueryString,
    cResPath: r.cResPath,
    cResSubPath: r.cResSubPath,
    cResType: TYPE_TO_ENUM[r.cRescType] ?? RbacRescType.Menu,
    createTime: r.createTime,
    lastModifyTime: r.lastModifyTime,
    rowVersion: 0,
  };
}

export function fromApi(api: Partial<HmxRes>, existing?: LocalResc): LocalResc {
  return {
    ...(existing ?? {
      creator: "admin",
      createTime: new Date().toISOString().slice(0, 16).replace("T", " "),
      lastModifier: "",
      lastModifyTime: "",
    }),
    id: api.id || newRescId(),
    cPid: api.cPid && api.cPid !== "" ? api.cPid : "0",
    cCode: api.cCode ?? "",
    cTitle: api.cTitle ?? "",
    cOrder: api.cOrder ?? "1",
    cResPath: api.cResPath ?? "",
    cResSubPath: api.cResSubPath ?? "",
    cQueryString: api.cQueryString ?? "",
    cEnable: api.cEnable ?? "1",
    cRescType: ENUM_TO_TYPE[api.cResType ?? RbacRescType.Menu] ?? "Menu",
    icon: api.cIcon ?? "FileText",
  } as LocalResc;
}

export const rescRoutes: RouteMap = {
  [`post ${P}/getResources`]: (config) => {
    const { ns } = getParams(config);
    return ok(config, loadRescs().map((r) => toApi(r, ns || "TDWEB")));
  },
  [`post ${P}/getAllResouces`]: (config) => {
    const { ns } = getParams(config);
    const types = getBody<RbacRescType[]>(config);
    const all = loadRescs().map((r) => toApi(r, ns || "TDWEB"));
    const filtered = Array.isArray(types) && types.length ? all.filter((r) => types.includes(r.cResType)) : all;
    return ok(config, filtered);
  },
  [`post ${P}/addOrEditResource`]: (config) => {
    const body = getBody<Partial<HmxRes>>(config);
    const rows = loadRescs();
    if (!body.id) {
      const created = fromApi({ ...body, id: "" });
      created.id = newRescId();
      rows.push(created);
      saveRescs(rows);
      return ok(config, toApi(created));
    }
    const index = rows.findIndex((r) => r.id === body.id);
    if (index >= 0) {
      const merged = fromApi(body, rows[index]);
      merged.id = rows[index].id;
      merged.creator = rows[index].creator;
      merged.createTime = rows[index].createTime;
      rows[index] = merged;
      saveRescs(rows);
      return ok(config, toApi(merged));
    }
    const created = fromApi(body);
    rows.push(created);
    saveRescs(rows);
    return ok(config, toApi(created));
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
    const list = loadRescs()
      .filter((r) => r.cRescType === "Widget" && r.cPid === parentRescId)
      .map((r) => toApi(r));
    return ok(config, list);
  },
};
