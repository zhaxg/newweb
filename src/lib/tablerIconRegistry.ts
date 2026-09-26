import { type Component } from "vue";

/**
 * Tabler 图标**全量**注册表（6202 个）——https://tabler.io/icons
 *
 * ⚠️ 本模块**刻意不在首屏链上**。它的 glob 会在 chunk 里内联 6202 条 名字→懒加载器 映射，
 * 实测占 entry chunk **1,177,347 B（约 70% 原始 / ~173 KB gz）**。
 * 所以壳层侧（lib/tablerIcons.ts）另持一份小映射，本文件只在两种情况下被加载：
 *   ① 图标选择器 `pages/admin/resc/IconPicker.vue` 直接 import（它本来就要全量做搜索）
 *   ② 壳层遇到小映射未收录的图标名 → lib/tablerIcons.ts 动态 import 兜底
 *
 * 改动本文件时注意别把 glob 挪回 tablerIcons.ts，否则那 1.18 MB 会重新回到首屏。
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

/** 取某图标的懒加载器（入参为 Pascal 基名）；未收录返回 null。
 *  供 lib/tablerIcons.ts 的兜底路径使用——那边不直接依赖本模块的类型与状态。 */
export function tablerIconLoader(pascal: string): (() => Promise<{ default: Component }>) | null {
  return loaderByPascal.get(pascal) ?? null;
}

const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

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
