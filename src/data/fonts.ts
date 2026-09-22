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
  { label: "京华老宋体", family: "KingHwaOldSong", cssUrl: "https://fontsapi.zeoseven.com/309/main/result.css" }

];

export const englishFontOptions: FontOption[] = [
  { label: "系统默认", family: "" },
  { label: "Inter", family: "Inter", cssUrl: "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.3.0/index.min.css" },
  { label: "Space Grotesk", family: "Space Grotesk", cssUrl: "https://cdn.jsdelivr.net/npm/@fontsource/space-grotesk@5.3.0/index.min.css" },
  { label: "IBM Plex Sans", family: "IBM Plex Sans", cssUrl: "https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-sans@5.3.0/index.min.css" },
  { label: "Geist Mono", family: "Geist Mono", cssUrl: "https://cdn.jsdelivr.net/npm/@fontsource/geist-mono@5.3.0/index.min.css" },
  { label: "Geist Sans", family: "Geist Sans", cssUrl: "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.3.0/index.min.css" }
];