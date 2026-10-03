/**
 * 颜色主题预设（系统设置 → 配色方案）：成套的氛围表面 + 推荐主色，色值借鉴
 * new-api 的 theme presets（temp/new-api-main/web/src/styles/theme-presets.css，
 * OKLCH 明暗两套），语义状态色（--success/--destructive）刻意不动——绿色=成功、
 * 红色=危险的直觉不该被换肤弱化。
 *
 * 三个设计约束（为什么长这样）：
 * 1. 预设只写 tokens.css 的表面变量，不写 --p-primary-*：主色唯一通道仍是
 *    themeSettings.applyPrimaryColor（用户选卡时把 primaryHex 联动写进
 *    editorSettings.primaryColor）。若这里也写主色，两个 <style> 同特异度
 *    （html:root = 0,1,1），会互相覆盖打架。
 * 2. 彩色预设的表面用 color-mix(var(--primary) …) 派生而非写死：与 new-api 的
 *    semantic surface bridge 同款——用户换主色后氛围 tint 自动跟随；--primary
 *    本身是 var(--p-primary-color) 的反向引用（tokens.css），链式解析无碍。
 *    混合空间必须 in srgb 而非 new-api 的 in oklch：Chrome 对 oklch 环形色相
 *    插值把无彩的白当 H=0 参与最短路径，「蓝(262°) 4% + 白 96%」会被拉向
 *    356°（粉红方向）——海风徐来底色发粉即此因；srgb 直坐标无色相概念，
 *    小比例 tint 结果正确，且 tokens.css 的 --success-bg 已有 srgb 先例。
 * 3. 选择器用 html:root / html.dark（0,1,1），压过 tokens.css 的 :root 与
 *    globals.css 的 @supports oklch 增强块（均 0,1,0），不依赖标签插入顺序。
 */

export type ThemePresetDef = {
  id: string;
  /** 卡片名，四字 */
  label: string;
  /** 色卡渐变两色（oklch，135° 渐变起点/终点） */
  swatches: [string, string];
  /** 选卡时联动写入 editorSettings.primaryColor 的主题色值（预设主色的 sRGB hex） */
  primaryHex: string;
  surfaces: { light: Record<string, string>; dark: Record<string, string> };
};

/** 彩色预设共用的派生表面（new-api bridge 的明暗比例；值引用当前主色与画布）。
 *  混合空间 in srgb（见文件头第 2 条：in oklch 会被白的 H=0 拉向粉红方向）。
 *  不含 --background/--foreground：画布保持中性，只有安思睿米换暖色画布 */
const TINTED_SURFACES = {
  light: {
    "--card": "color-mix(in srgb, var(--primary) 3%, var(--background))",
    "--popover": "color-mix(in srgb, var(--primary) 5%, var(--background))",
    "--muted": "color-mix(in srgb, var(--primary) 7%, var(--background))",
    "--muted-foreground": "color-mix(in srgb, var(--foreground) 68%, var(--primary))",
    "--accent": "color-mix(in srgb, var(--primary) 14%, var(--background))",
    "--border": "color-mix(in srgb, var(--primary) 20%, var(--background))",
    "--input": "color-mix(in srgb, var(--primary) 22%, var(--background))",
    "--ring": "var(--primary)",
    "--sidebar": "color-mix(in srgb, var(--primary) 4%, var(--background))",
    "--sidebar-accent": "color-mix(in srgb, var(--primary) 14%, var(--background))",
    "--dbx-chrome": "color-mix(in srgb, var(--primary) 3%, var(--background))",
  },
  dark: {
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
  },
} satisfies Pick<ThemePresetDef["surfaces"], "light" | "dark">;

/** 预设表：new-api 原名 → 本项目四字名；primaryHex = 其 light primary OKLCH 转 sRGB */
export const themePresets: ThemePresetDef[] = [
  {
    id: "ansiruimi",
    label: "安思睿米",
    swatches: ["oklch(0.984 0.005 95)", "oklch(0.685 0.142 38)"],
    primaryHex: "#e37756",
    /* 安思睿米（Anthropic 品牌语言）：暖奶油画布 + 暖灰表面，不是主色染色——
       这套固定值刻意不用 TINTED_SURFACES，暖中性是品牌定位而非 primary 派生 */
    surfaces: {
      light: {
        "--background": "oklch(0.984 0.004 95)",
        "--foreground": "oklch(0.205 0.005 60)",
        "--card": "oklch(0.945 0.008 92)",
        "--popover": "oklch(0.97 0.006 92)",
        "--popover-foreground": "oklch(0.205 0.005 60)",
        "--muted": "oklch(0.94 0.007 92)",
        "--muted-foreground": "oklch(0.51 0.006 75)",
        "--accent": "oklch(0.92 0.009 92)",
        "--accent-foreground": "oklch(0.205 0.005 60)",
        "--border": "oklch(0.895 0.008 92)",
        "--input": "oklch(0.895 0.008 92)",
        "--ring": "oklch(0.685 0.142 38)",
        "--sidebar": "oklch(0.955 0.008 92)",
        "--sidebar-accent": "oklch(0.915 0.009 92)",
        "--dbx-chrome": "oklch(0.96 0.007 92)",
      },
      dark: {
        "--background": "oklch(0.215 0.004 60)",
        "--foreground": "oklch(0.965 0.005 92)",
        "--card": "oklch(0.255 0.004 60)",
        "--popover": "oklch(0.275 0.004 60)",
        "--popover-foreground": "oklch(0.965 0.005 92)",
        "--muted": "oklch(0.285 0.004 60)",
        "--muted-foreground": "oklch(0.76 0.006 75)",
        "--accent": "oklch(0.33 0.006 60)",
        "--accent-foreground": "oklch(0.985 0.005 92)",
        "--border": "oklch(1 0 0 / 10%)",
        "--input": "oklch(1 0 0 / 16%)",
        "--ring": "oklch(0.72 0.135 40)",
        "--sidebar": "oklch(0.205 0.004 60)",
        "--sidebar-accent": "oklch(0.32 0.006 60)",
        "--dbx-chrome": "oklch(0.215 0.004 60)",
      },
    },
  },
  {
    id: "underground",
    label: "暗夜之境",
    swatches: ["oklch(0.5315 0.0694 156.19)", "oklch(0.5748 0.0862 336.52)"],
    primaryHex: "#49785b",
    surfaces: TINTED_SURFACES,
  },
  {
    id: "rose-garden",
    label: "玫瑰花园",
    swatches: ["oklch(0.5827 0.2418 12.23)", "oklch(0.8131 0.1129 5.67)"],
    primaryHex: "#e60053",
    surfaces: TINTED_SURFACES,
  },
  {
    id: "forest-whisper",
    label: "森林低语",
    swatches: ["oklch(0.5276 0.1072 182.22)", "oklch(0.5236 0.0505 250.18)"],
    primaryHex: "#007f70",
    surfaces: TINTED_SURFACES,
  },
  {
    id: "ocean-breeze",
    label: "海风徐来",
    swatches: ["oklch(0.5461 0.2152 262.88)", "oklch(0.5854 0.2041 277.12)"],
    primaryHex: "#2563eb",
    surfaces: TINTED_SURFACES,
  },
  {
    id: "lavender-dream",
    label: "薰衣草梦",
    swatches: ["oklch(0.5709 0.1808 306.89)", "oklch(0.811 0.0589 201.14)"],
    primaryHex: "#9453c9",
    surfaces: TINTED_SURFACES,
  },
];

const STYLE_ID = "hmx-theme-preset";

function declBlock(tokens: Record<string, string>): string {
  return Object.entries(tokens)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
}

/** 把预设表面写进运行时 <style>；default/未知 id 清空即回落 tokens.css 默认。
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
