import { loadKvs, saveKvs } from "./store";
import { NextStrId } from "@/lib/yitIdHelper";
import type { HmxKv as LocalKv } from "@/data/kv";
import type { HmxKv, KvEditInput } from "@/api/admin/types";
import { API_BASE, fail, getBody, getParams, ok, type RouteMap } from "./core";

const P = `${API_BASE}/systemKeyValue`;

function toApi(k: LocalKv): HmxKv {
  return { selected: false, ...k };
}

function buildMasterCode(input: KvEditInput): string {
  const group = input.useClassfy ? `${input.classA ?? ""}${input.classB ?? ""}${input.classC ?? ""}` : "";
  return group ? `${group}:${input.code ?? ""}` : input.code ?? "";
}

export const kvRoutes: RouteMap = {
  [`post ${P}/querySysKvList`]: (config) => {
    const { code, name } = getParams(config);
    const masters = loadKvs().filter((k) => k.cPid === "");
    const ck = (code ?? "").trim();
    const nk = (name ?? "").trim();
    const filtered = masters.filter((m) => (!ck || m.cCode.includes(ck)) && (!nk || m.cName.includes(nk)));
    return ok(config, filtered.map(toApi));
  },
  [`post ${P}/querySysKvItemList`]: (config) => {
    const { parentCode } = getParams(config);
    const all = loadKvs();
    // 页面传父项 id；真实导出数据子项 cPid 存父项 cCode，两种链路都兼容
    const masterCode = all.find((k) => k.id === parentCode && k.cPid === "")?.cCode;
    const children = all
      .filter((k) => k.cPid === parentCode || (!!masterCode && k.cPid === masterCode))
      .sort((a, b) => parseInt(a.cOrder || "0", 10) - parseInt(b.cOrder || "0", 10));
    return ok(config, children.map(toApi));
  },
  [`post ${P}/prepareNewKvEditInput`]: (config) => {
    const input: KvEditInput = { classA: "A", classB: "0", classC: "0", code: "", name: "", useClassfy: false, filedItems: [] };
    return ok(config, input);
  },
  [`post ${P}/insertOrUpdateParentKvItem`]: (config) => {
    const input = getBody<KvEditInput>(config);
    if (!input.code?.trim()) return fail(config, 1001, "编码不能为空");
    if (!input.name?.trim()) return fail(config, 1002, "名称不能为空");
    const cCode = buildMasterCode(input);
    const rows = loadKvs();
    let master = rows.find((k) => k.cPid === "" && k.cCode === cCode);
    if (!master) {
      master = { id: NextStrId(), cCode, cName: input.name, cDesc: "", cValue: "", cGroup: "", cOrder: "", cEnable: "1", cSw01: "", cSw02: "", cSw03: "", cPid: "" };
      rows.push(master);
    } else {
      master.cName = input.name;
    }
    master.cSw01 = JSON.stringify(input.filedItems ?? []);
    saveKvs(rows);
    return ok(config, toApi(master));
  },
  [`post ${P}/removeParentKvItem`]: (config) => {
    const { kvItemId } = getParams(config);
    if (!kvItemId) return fail(config, 1001, "缺少参数 kvItemId");
    const rows = loadKvs();
    const target = rows.find((k) => k.id === kvItemId);
    if (!target) return fail(config, 1002, "键值对不存在");
    saveKvs(rows.filter((k) => k.id !== kvItemId && k.cPid !== kvItemId && k.cPid !== target.cCode));
    return ok(config, null);
  },
  [`post ${P}/saveChangesForChildKvItems`]: (config) => {
    const list = getBody<HmxKv[]>(config);
    const rows = loadKvs();
    for (const item of list) {
      if (!item.id) continue;
      const index = rows.findIndex((k) => k.id === item.id);
      const { selected: _sel, ...rest } = item;
      if (index >= 0) rows[index] = { ...rows[index], ...rest } as LocalKv;
      else rows.push(rest as LocalKv);
    }
    saveKvs(rows);
    return ok(config, list.length);
  },
};
