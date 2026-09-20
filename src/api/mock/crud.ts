import { Formatter } from "@hprose/io";

import { loadRoles, saveRoles, formatNow, type HmxRole as LocalRole } from "@/data/roles";
import { loadRescs, saveRescs } from "@/data/rescs";
import type { SaveChangesInputV2 } from "@/api/admin/types";
import type { SaveChangesData as Scd } from "@/api/common/trackable-list";
import { API_BASE, getBody, ok, type RouteMap } from "./core";
import { fromApi as rescFromApi, toApi as rescToApi } from "./resc";

const P = `${API_BASE}/crud`;

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function applyRoles(data: Scd<Record<string, any>>): Scd<Record<string, any>> {
  const rows = loadRoles();
  const strip = (x: Record<string, any>) => {
    const { selected: _s, ...rest } = x;
    return rest;
  };
  for (const item of data.addedItems) {
    rows.push({ ...strip(item), creator: item.creator || "admin", createTime: item.createTime || formatNow() } as LocalRole);
  }
  for (const item of data.changedItems) {
    const i = rows.findIndex((r) => r.id === item.id);
    if (i >= 0) rows[i] = { ...rows[i], ...strip(item), lastModifier: "admin", lastModifyTime: formatNow() } as LocalRole;
  }
  for (const item of data.deletedItems) {
    const i = rows.findIndex((r) => r.id === item.id);
    if (i >= 0) rows.splice(i, 1);
  }
  saveRoles(rows);
  return {
    addedItems: data.addedItems.map(strip),
    changedItems: data.changedItems.map((x) => ({ ...strip(x), lastModifier: "admin", lastModifyTime: formatNow() })),
    deletedItems: data.deletedItems,
  };
}

function applyRescs(data: Scd<Record<string, any>>): Scd<Record<string, any>> {
  const rows = loadRescs();
  const respAdded: Record<string, any>[] = [];
  const respChanged: Record<string, any>[] = [];
  for (const item of data.addedItems) {
    const local = rescFromApi(item);
    rows.push(local);
    respAdded.push(rescToApi(local));
  }
  for (const item of data.changedItems) {
    const i = rows.findIndex((r) => r.id === item.id);
    if (i >= 0) {
      const merged = rescFromApi(item, rows[i]);
      merged.id = rows[i].id;
      rows[i] = merged;
      respChanged.push(rescToApi(merged));
    }
  }
  for (const item of data.deletedItems) {
    const i = rows.findIndex((r) => r.id === item.id);
    if (i >= 0) rows.splice(i, 1);
  }
  saveRescs(rows);
  return { addedItems: respAdded, changedItems: respChanged, deletedItems: data.deletedItems };
}

export const crudRoutes: RouteMap = {
  [`post ${P}/saveChangesV2`]: (config) => {
    const input = getBody<SaveChangesInputV2>(config);
    const isSingle = !input.batchDataBytesBase64String && !!input.singleDataBytesBase64String;
    const raw = isSingle ? input.singleDataBytesBase64String! : input.batchDataBytesBase64String!;
    let payload: Scd<Record<string, any>> | Record<string, any>;
    try {
      payload = Formatter.deserialize(base64ToUint8Array(raw)) as Scd<Record<string, any>> | Record<string, any>;
    } catch {
      payload = { addedItems: [], changedItems: [], deletedItems: [] };
    }

    let respValue: unknown;
    if (isSingle) {
      // 单条：直接 upsert 并回显
      const single = payload as Record<string, any>;
      if (input.dataTypeName === "HmxRole") {
        const rows = loadRoles();
        const i = rows.findIndex((r) => r.id === single.id);
        const { selected: _s, ...rest } = single;
        if (i >= 0) rows[i] = { ...rows[i], ...rest } as LocalRole;
        else rows.push(rest as LocalRole);
        saveRoles(rows);
        respValue = rest;
      } else {
        respValue = single;
      }
    } else {
      const data = payload as Scd<Record<string, any>>;
      const normalized: Scd<Record<string, any>> = {
        addedItems: data.addedItems ?? [],
        changedItems: data.changedItems ?? [],
        deletedItems: data.deletedItems ?? [],
      };
      respValue =
        input.dataTypeName === "HmxRole"
          ? applyRoles(normalized)
          : input.dataTypeName === "HmxRes"
            ? applyRescs(normalized)
            : normalized;
    }

    const respBytes = Formatter.serialize(respValue);
    return ok(config, uint8ArrayToBase64(respBytes));
  },
};
