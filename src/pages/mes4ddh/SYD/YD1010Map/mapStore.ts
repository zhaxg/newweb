/** 库位图本地存储（不兼容原后端；仅 localStorage）
 *  只存模板（cTemplateData = Univer workbook JSON）；垛位位置是页面样例数据，不入库。 */
import type { Tyd1002 } from "@/api/mes4ddh/syd.swagger";

const MAPS_KEY = "hmx.yd1010.maps.v1";

export type StoreMapRow = Tyd1002;

function now(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function loadMaps(): StoreMapRow[] {
  try {
    const raw = localStorage.getItem(MAPS_KEY);
    if (raw) return JSON.parse(raw) as StoreMapRow[];
  } catch {
    /* ignore */
  }
  return [];
}

export function saveMaps(rows: StoreMapRow[]): void {
  localStorage.setItem(MAPS_KEY, JSON.stringify(rows));
}

export function ensureSeedMap(): StoreMapRow[] {
  let rows = loadMaps();
  if (rows.length) return rows;
  rows = [
    {
      id: "seed_zhb_map",
      cName: "中厚板库位图",
      cStoreCode: "ZG01",
      listStoreCode: ["ZG01"],
      cTemplateData: "",
      creator: "system",
      createTime: now(),
      lastModifier: "system",
      lastModifyTime: now(),
      selected: false,
    },
  ];
  saveMaps(rows);
  return rows;
}

export function queryMaps(): StoreMapRow[] {
  return ensureSeedMap();
}

export function delMap(id: string): void {
  saveMaps(loadMaps().filter((r) => r.id !== id));
}

export function getMap(id: string): StoreMapRow | null {
  return ensureSeedMap().find((r) => r.id === id) ?? null;
}

/** 保存设计：模板 JSON（Univer workbook 快照） */
export function saveMapDesign(id: string, templateJson: string): boolean {
  const rows = loadMaps();
  const hit = rows.find((r) => r.id === id);
  if (!hit) return false;
  hit.cTemplateData = templateJson;
  hit.lastModifyTime = now();
  hit.lastModifier = "admin";
  saveMaps(rows);
  return true;
}

export function newMapId(): string {
  return `map_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
