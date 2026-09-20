/**
 * 全站字体设置：中文/英文各一个下拉。
 * 选中后把字体栈写入 html 的 --font-sans（Tailwind font-sans 与 body 均引用它）。
 * 远程字体按需注入 <link> 加载。字体清单维护在 @/data/fonts.ts。
 */
import { useSettingsStore } from "@/stores/settingsStore";
import { chineseFontOptions, englishFontOptions, type FontOption } from "@/data/fonts";

export type { FontOption };
export { chineseFontOptions, englishFontOptions };

const BASE_STACK = '"Geist Variable", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", system-ui, sans-serif';

const injectedUrls = new Set<string>();

export function findFontOption(list: FontOption[], family: string): FontOption {
  return list.find((f) => f.family === family) ?? list[0];
}

function fontStack(): string {
  const { fontEnglishFamily, fontChineseFamily } = useSettingsStore().editorSettings;
  const parts = [fontEnglishFamily, fontChineseFamily].filter(Boolean).map((f) => `"${f}"`);
  return parts.length ? `${parts.join(", ")}, ${BASE_STACK}` : BASE_STACK;
}

export function applyFontSettings() {
  document.documentElement.style.setProperty("--font-sans", fontStack());
}

export function ensureFontLoaded(option: FontOption) {
  const url = option.cssUrl;
  if (!url || injectedUrls.has(url)) return;
  injectedUrls.add(url);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  /* 字体文件分片异步就位，加载完成后重刷一次栈让浏览器立即用上新 family */
  link.addEventListener("load", () => void document.fonts.ready.then(applyFontSettings));
  link.addEventListener("error", () => injectedUrls.delete(url));
  document.head.append(link);
}

/** 启动时恢复持久化选择；设置弹窗变更时也走这里 */
export function setupFontSettings() {
  const store = useSettingsStore();
  const zh = findFontOption(chineseFontOptions, store.editorSettings.fontChineseFamily);
  const en = findFontOption(englishFontOptions, store.editorSettings.fontEnglishFamily);
  ensureFontLoaded(zh);
  ensureFontLoaded(en);
  applyFontSettings();
}
