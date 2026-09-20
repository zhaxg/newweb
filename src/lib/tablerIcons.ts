import { defineAsyncComponent, type Component } from "vue";

/**
 * Tabler 图标数据驱动注册表（https://tabler.io/icons）。
 * 每个图标经 import.meta.glob 懒加载为独立小 chunk：初始包只含名字清单，
 * 用到的图标才发请求；菜单/资源里存的 cIcon 名称写错只会回退占位图标，不炸渲染。
 */
const loaders = import.meta.glob("/node_modules/@tabler/icons-vue/dist/esm/icons/Icon*.mjs");

/** Pascal 基名（无 Icon 前缀），如 "Settings"、"ChartPie" */
export const TABLER_ICON_NAMES: string[] = [];

const loaderByPascal = new Map<string, () => Promise<{ default: Component }>>();

for (const key of Object.keys(loaders)) {
  const m = /\/(Icon[A-Za-z0-9]+)\.mjs$/.exec(key);
  if (!m) continue;
  const base = m[1].slice(4);
  TABLER_ICON_NAMES.push(base);
  loaderByPascal.set(base, loaders[key] as () => Promise<{ default: Component }>);
}
TABLER_ICON_NAMES.sort();

const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** kebab → Pascal：chart-pie → ChartPie */
function pascalize(name: string) {
  return name.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
}

/** 兼容三种写法：Pascal("ChartPie") / kebab("chart-pie") / iconify 类名("icon-[tabler--chart-pie]")，含带 Icon 前缀 */
function normalize(raw: string): string {
  let n = raw.trim();
  const m = /^icon-\[[a-z0-9]+--([a-z0-9-]+)\]$/i.exec(n);
  if (m) n = m[1];
  if (n.includes("-")) n = pascalize(n);
  if (/^Icon[A-Z]/.test(n)) n = n.slice(4);
  return n;
}

const cache = new Map<string, Component | null>();

/** 按名称解析 Tabler 图标组件；未收录返回 null（调用方自行兜底） */
export function tablerIcon(rawName?: string | null): Component | null {
  if (!rawName) return null;
  const name = normalize(rawName);
  if (!name) return null;
  if (cache.has(name)) return cache.get(name) ?? null;
  const load = loaderByPascal.get(name);
  if (!load) {
    cache.set(name, null);
    return null;
  }
  const comp = defineAsyncComponent({ loader: () => load().then((m) => m.default) });
  cache.set(name, comp);
  return comp;
}

/** 兜底图标（Tabler file），解析失败时统一回退它；glob 修复后恒非空，空渲染仅为类型安全网 */
export const TABLER_FALLBACK_ICON: Component = tablerIcon("File") ?? { render: () => null };

/** 供选择器搜索：Pascal 与 kebab 双形态小写匹配（空格视作连字符） */
export function filterTablerIcons(keyword: string, limit = 0): string[] {
  const kw = keyword.trim().toLowerCase().replace(/\s+/g, "-");
  if (!kw) return limit ? TABLER_ICON_NAMES.slice(0, limit) : TABLER_ICON_NAMES;
  const out: string[] = [];
  for (const name of TABLER_ICON_NAMES) {
    if (name.toLowerCase().includes(kw) || kebab(name).includes(kw)) {
      out.push(name);
      if (limit && out.length >= limit) break;
    }
  }
  return out;
}
