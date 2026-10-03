/**
 * 颜色主题预设（系统设置 → 配色方案）：成套的画布氛围 + 推荐主色。结构源自
 * new-api 的 theme presets，色值已按本项目重新调配为 5 档——默认深蓝（见 UI 层
 * 默认卡，不在此表）+ 黑白 shadcn / 森林深绿 / 薰衣深紫 / 玫瑰粉红；
 * 语义状态色（--success/--destructive）刻意不动——绿色=成功、红色=危险的
 * 直觉不该被换肤弱化。
 *
 * 三个设计约束（为什么长这样）：
 * 1. 预设只写 tokens.css 的表面变量，不写 --p-primary-*：主色唯一通道仍是
 *    themeSettings.applyPrimaryColor（用户选卡时把 primaryHex 联动写进
 *    editorSettings.primaryColor）。若这里也写主色，两个 <style> 同特异度
 *    （html:root = 0,1,1），会互相覆盖打架。
 * 2. 彩色预设的表面用 color-mix(var(--primary) …) 派生而非写死：用户换主色后
 *    氛围 tint 自动跟随；--primary 本身是 var(--p-primary-color) 的反向引用
 *    （tokens.css），链式解析无碍。混合空间必须 in srgb：Chrome 对 oklch 环形
 *    色相插值把无彩的白当 H=0 参与最短路径，「蓝 4% + 白 96%」会被拉向 356°
 *    （粉红方向）——底色发粉即此因；srgb 直坐标无色相概念，小比例 tint 结果
 *    正确，且 tokens.css 的 --success-bg 已有 srgb 先例。
 * 3. 选择器用 html:root / html.dark（0,1,1），压过 tokens.css 的 :root 与
 *    globals.css 的 @supports oklch 增强块（均 0,1,0），不依赖标签插入顺序。
 * 4. 画布与壳层三面的层次：每个预设自带「染白画布」--background（如玫瑰 #FFF7F8，
 *    逐个指定的淡色相白，色相由画布统一携带），顶栏 --dbx-chrome /
 *    侧栏·页签 --sidebar 再从 var(--background) 用「foreground 4% / 10% 定深浅 +
 *    primary 4% / 8% 补色相」双层逐级加深——只用中性黑会把画布淡色相稀释成灰，
 *    与选中态的 primary 染色高亮形成浓度断层（灰底配淡紫显脏）；复刻默认
 *    「亮度差分界、不用细线」的梯度（默认 246/229/255）。
 */

export type ThemePresetDef = {
  id: string;
  /** 卡片名，四字 */
  label: string;
  /** 色卡渐变两色（135° 渐变起点/终点，主色 → 提亮同系） */
  swatches: [string, string];
  /** 选卡时联动写入 editorSettings.primaryColor 的主题色值（预设主色的 sRGB hex） */
  primaryHex: string;
  surfaces: { light: Record<string, string>; dark: Record<string, string> };
};

/** 彩色预设共用的浅色派生表面（不含 --background：画布是每预设自写的染白值）。
 *  混合空间 in srgb（见文件头第 2 条：in oklch 会被白的 H=0 拉向粉红方向）。
 *  壳层三面用 fg% 梯子从染色画布逐级加深（文件头第 4 条），card 及以下仍按
 *  primary% 在画布上做氛围染色（new-api bridge 比例） */
const TINTED_LIGHT = {
  "--card": "color-mix(in srgb, var(--primary) 3%, var(--background))",
  "--popover": "color-mix(in srgb, var(--primary) 5%, var(--background))",
  "--muted": "color-mix(in srgb, var(--primary) 7%, var(--background))",
  "--muted-foreground": "color-mix(in srgb, var(--foreground) 68%, var(--primary))",
  "--accent": "color-mix(in srgb, var(--primary) 14%, var(--background))",
  "--border": "color-mix(in srgb, var(--primary) 20%, var(--background))",
  "--input": "color-mix(in srgb, var(--primary) 22%, var(--background))",
  "--ring": "var(--primary)",
  /* 三面双层：内层 fg% 定深浅（层次），外层 primary% 补色相——纯 fg 梯子会把
     画布的淡色相稀释成灰，与选中态（primary 染的淡紫）色相浓度断层显脏 */
  "--sidebar": "color-mix(in srgb, var(--primary) 8%, color-mix(in srgb, var(--foreground) 10%, var(--background)))",
  "--sidebar-accent": "color-mix(in srgb, var(--foreground) 4%, var(--background))",
  "--dbx-chrome": "color-mix(in srgb, var(--primary) 4%, color-mix(in srgb, var(--foreground) 4%, var(--background)))",
} satisfies Omit<ThemePresetDef["surfaces"]["light"], "--background">;

const TINTED_DARK = {
  "--card": "color-mix(in srgb, var(--primary) 8%, var(--background))",
  "--popover": "color-mix(in srgb, var(--primary) 12%, var(--background))",
  "--muted": "color-mix(in srgb, var(--primary) 12%, var(--background))",
  "--muted-foreground": "color-mix(in srgb, var(--foreground) 74%, var(--primary))",
  "--accent": "color-mix(in srgb, var(--primary) 18%, var(--background))",
  "--border": "color-mix(in srgb, var(--primary) 24%, var(--background))",
  "--input": "color-mix(in srgb, var(--primary) 28%, var(--background))",
  "--ring": "var(--primary)",
  "--sidebar": "color-mix(in srgb, var(--primary) 5%, var(--background))",
  "--sidebar-accent": "color-mix(in srgb, var(--primary) 18%, var(--background))",
  "--dbx-chrome": "color-mix(in srgb, var(--primary) 8%, var(--background))",
} satisfies ThemePresetDef["surfaces"]["dark"];

/** 每预设的染色画布：light 为逐个指定的淡色相白（黑白传纯白 = shadcn zinc 中性）；
 *  dark 必须显式写暗画布——light 块的 --background 挂在 html:root（0,1,1）会压过
 *  tokens.css 的 .dark（0,1,0），不写则浅画布漏进暗色。默认用主色暗值 5% 染
 *  tokens 暗底（var(--primary) 在 html.dark 解析为暗主色），黑白传 shadcn 的 #0a0a0b */
function tinted(
  bg: string,
  darkBg = "color-mix(in srgb, var(--primary) 5%, rgb(19 20 22))",
): ThemePresetDef["surfaces"] {
  return {
    light: { ...TINTED_LIGHT, "--background": bg },
    dark: { ...TINTED_DARK, "--background": darkBg },
  };
}

/** 预设表（UI 展示顺序；默认卡「默认配色」在 SettingsDialog 层拼装不在此列）。
 *  primaryHex 全部过 WCAG 对比校验：#18181b 16.5:1、#166534 7.3:1、
 *  #5b21b6 8.7:1、#db2777 4.7:1（白字均达 AA）；暗色主色默认取 ramp[400]
 *  提亮档，黑白 shadcn 需白底黑字反转，见 themeSettings.DARK_PRIMARY */
export const themePresets: ThemePresetDef[] = [
  {
    id: "mono",
    label: "极简黑白",
    swatches: ["#fafafa", "#18181b"],
    primaryHex: "#18181b",
    /* shadcn 风格 = 中性灰阶（zinc）：纯白画布 + 近黑主色，暗色反转为白按钮
       （DARK_PRIMARY）。三面用纯 fg 梯子而非彩色系的「+primary 补染」双层——
       黑白的 primary 就是黑，补染只会在灰上继续加深（sidebar 深达 214 过重） */
    surfaces: {
      light: {
        ...TINTED_LIGHT,
        "--background": "#ffffff",
        "--sidebar": "color-mix(in srgb, var(--foreground) 10%, var(--background))",
        "--dbx-chrome": "color-mix(in srgb, var(--foreground) 4%, var(--background))",
      },
      dark: { ...TINTED_DARK, "--background": "#0a0a0b" },
    },
  },
  {
    id: "forest-whisper",
    label: "森林低语",
    swatches: ["#166534", "#86efac"],
    primaryHex: "#166534",
    surfaces: tinted("#F6FAF9"),
  },
  {
    id: "lavender-dream",
    label: "薰衣草梦",
    swatches: ["#5b21b6", "#c4b5fd"],
    primaryHex: "#5b21b6",
    surfaces: tinted("#FBF8FD"),
  },
  {
    id: "rose-garden",
    label: "玫瑰花园",
    swatches: ["#db2777", "#f9a8d4"],
    primaryHex: "#db2777",
    surfaces: tinted("#FFF7F8"),
  },
];

const STYLE_ID = "hmx-theme-preset";

function declBlock(tokens: Record<string, string>): string {
  return Object.entries(tokens)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
}

/** 把预设表面写进运行时 <style>；default/未知 id 清空即回落 tokens.css 默认
 *  （历史脏 id 如 ansiruimi/ocean-breeze 也走此分支无缝降级）。
 *  范式同 themeSettings.applyPrimaryColor（复用标签 + html:root/html.dark 双套值）。 */
export function applyThemePreset(id: string) {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  const preset = themePresets.find((p) => p.id === id);
  if (!preset) {
    style.textContent = "";
    return;
  }
  style.textContent = `html:root {\n${declBlock(preset.surfaces.light)}\n}\nhtml.dark {\n${declBlock(preset.surfaces.dark)}\n}`;
}
