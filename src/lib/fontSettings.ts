/**
 * 全站字体设置：中文/英文各一个下拉。
 * 选中后把字体栈写入 html 的 --font-sans（Tailwind font-sans 与 body 均引用它）。
 * 远程字体按需注入 <link> 加载。
 */
import { useSettingsStore } from "@/stores/settingsStore";

/**
 * 全站字体下拉数据源。新增字体：往对应数组加一项（cssUrl 可选，本地字体省略）。
 * family 为 CSS font-family 名（不含引号与回退栈）；"" = 系统默认。
 */
export interface FontOption {
  label: string;
  family: string;
  cssUrl?: string;
}

export const chineseFontOptions: FontOption[] = [
  { label: "系统默认", family: "" },
  { label: "小米黑体", family: "MiSans", cssUrl: "https://cdn.jsdelivr.net/npm/misans@4.1.0/lib/Normal/MiSans-Regular.min.css" },
  { label: "思源黑体", family: "Noto Sans SC Variable", cssUrl: "https://cdn.jsdelivr.net/npm/@fontsource-variable/noto-sans-sc@5.3.0/index.css" },
  { label: "思源宋体", family: "Noto Serif SC Variable", cssUrl: "https://cdn.jsdelivr.net/npm/@fontsource-variable/noto-serif-sc@5.3.0/index.css" },
  { label: "霞鹜文楷", family: "LXGW WenKai", cssUrl: "https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css" },
  { label: "京华老宋体", family: "KingHwaOldSong", cssUrl: "https://fontsapi.zeoseven.com/309/main/result.css" },
];

export const englishFontOptions: FontOption[] = [
  { label: "系统默认", family: "" },
  { label: "Inter", family: "Inter", cssUrl: "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.3.0/index.min.css" },
  { label: "Space Grotesk", family: "Space Grotesk", cssUrl: "https://cdn.jsdelivr.net/npm/@fontsource/space-grotesk@5.3.0/index.min.css" },
  { label: "IBM Plex Sans", family: "IBM Plex Sans", cssUrl: "https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-sans@5.3.0/index.min.css" },
  { label: "Geist Mono", family: "Geist Mono", cssUrl: "https://cdn.jsdelivr.net/npm/@fontsource/geist-mono@5.3.0/index.min.css" },
  { label: "Geist Sans", family: "Geist Sans", cssUrl: "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.3.0/index.min.css" },
];

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
