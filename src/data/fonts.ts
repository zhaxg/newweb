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
  { label: "思源黑体", family: "Noto Sans CJK", cssUrl: "https://fontsapi.zeoseven.com/69/main/result.css" },
  { label: "汇文明朝体", family: "Huiwen-mincho", cssUrl: "https://fontsapi.zeoseven.com/256/main/result.css" },
  { label: "京华老宋体", family: "KingHwaOldSong", cssUrl: "https://fontsapi.zeoseven.com/309/main/result.css" },
  { label: "霞鹜文楷", family: "LXGW WenKai", cssUrl: "https://fontsapi.zeoseven.com/292/main/result.css" },
  { label: "寒蝉活楷", family: "ChillHuoKai", cssUrl: "https://fontsapi.zeoseven.com/874/main/result.css" },
  { label: "寒蝉活仿楷", family: "ChillHuoFangKai_F", cssUrl: "https://fontsapi.zeoseven.com/872/main/result.css" },

];

export const englishFontOptions: FontOption[] = [
  { label: "系统默认", family: "" },
  { label: "Inter", family: "Inter", cssUrl: "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.3.0/index.min.css" },
  { label: "Space Grotesk", family: "Space Grotesk", cssUrl: "https://cdn.jsdelivr.net/npm/@fontsource/space-grotesk@5.3.0/index.min.css" },
  { label: "IBM Plex Sans", family: "IBM Plex Sans", cssUrl: "https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-sans@5.3.0/index.min.css" },
  { label: "Geist Mono", family: "Geist Mono", cssUrl: "https://cdn.jsdelivr.net/npm/@fontsource/geist-mono@5.3.0/index.min.css" },
  { label: "Geist Sans", family: "Geist Sans", cssUrl: "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.3.0/index.min.css" }
];