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
  { label: "小米黑体", family: "MiSans", cssUrl: "https://cdn.jsdelivr.net/npm/misans@4.1.0/lib/Normal/MiSans-Medium.min.css" },
  { label: "汇文明朝体", family: "Huiwen-mincho", cssUrl: "https://fontsapi.zeoseven.com/256/main/result.css" },
  { label: "京华老宋体", family: "KingHwaOldSong", cssUrl: "https://fontsapi.zeoseven.com/309/main/result.css" },
  { label: "霞鹜文楷", family: "LXGW WenKai", cssUrl: "https://fontsapi.zeoseven.com/292/main/result.css" },
  { label: "朱雀仿宋", family: "Zhuque Fangsong (technical preview)", cssUrl: "https://fontsapi.zeoseven.com/7/main/result.css" },
];

export const englishFontOptions: FontOption[] = [
  { label: "系统默认", family: "" },
  { label: "Space Grotesk", family: "Space Grotesk", cssUrl: "https://cdn.jsdelivr.net/fontsource/css/space-grotesk@5.3.0/index.min.css" },
  { label: "JetBrains Mono", family: "JetBrains Mono", cssUrl: "https://cdn.jsdelivr.net/fontsource/css/jetbrains-mono@5.3.0/400.min.css" },
  { label: "Geist Mono", family: "Geist Mono", cssUrl: "https://cdn.jsdelivr.net/fontsource/css/geist-mono@5.2.8/index.min.css" },
  { label: "Inter", family: "Inter", cssUrl: "https://cdn.jsdelivr.net/fontsource/css/inter@5.3.0/index.min.css" },
];
