/**
 * 主题色（系统设置 → 主题色）：运行时覆盖 PrimeVue 注入的 --p-primary-* 色阶。
 * 选择器特异度同 prime-overrides.css（html:root/html.dark = 0,1,1 > 运行时注入的 0,1,0），
 * 不依赖样式顺序；明暗两套分别给值，跟随 .dark 切换自动换肤。
 */

export type PrimaryRamp = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950, string>;

export type PrimaryOption = { id: string; label: string; base: string; ramp?: PrimaryRamp };

/** 预设色板（base = 500 主色；ramp 缺省时按 HSL 明度档自动推导）。
 *  红/绿与状态色（成功/危险）有歧义，不列入主题色 */
export const primaryOptions: PrimaryOption[] = [
  { id: "brand", label: "品牌蓝", base: "#0052d9", ramp: {
    50: "#eaf0fd", 100: "#cdddf8", 200: "#9fbdf1", 300: "#6b97e7", 400: "#3a73da",
    500: "#0052d9", 600: "#0047bc", 700: "#003c9e", 800: "#003181", 900: "#002663", 950: "#001a45",
  } },
  { id: "violet", label: "紫罗兰", base: "#7c3aed" },
  { id: "black", label: "墨黑", base: "#525252" },
];

export function findPrimaryOption(id: string): PrimaryOption {
  return primaryOptions.find((o) => o.id === id) ?? primaryOptions[0];
}

function hexToHsl(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h / 6) * 360, s, l];
}

/** Tailwind 色阶近似明度档；浅色端轻微降饱和，避免 50/100 发闷 */
const LIGHTNESS: Record<keyof PrimaryRamp, number> = {
  50: 0.965, 100: 0.925, 200: 0.86, 300: 0.77, 400: 0.66,
  500: 0.55, 600: 0.46, 700: 0.38, 800: 0.3, 900: 0.23, 950: 0.14,
};

function makeRamp(hex: string): PrimaryRamp | null {
  const hsl = hexToHsl(hex);
  if (!hsl) return null;
  const [h, s] = hsl;
  const ramp = {} as PrimaryRamp;
  (Object.keys(LIGHTNESS) as unknown as (keyof PrimaryRamp)[]).forEach((k) => {
    const l = LIGHTNESS[k as keyof typeof LIGHTNESS];
    const sat = l > 0.6 ? s * (1 - (l - 0.6) * 0.7) : s;
    ramp[k] = `hsl(${h.toFixed(1)} ${(sat * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%)`;
  });
  return ramp;
}

export function resolveRamp(id: string): PrimaryRamp | null {
  const opt = findPrimaryOption(id);
  return opt.ramp ?? makeRamp(opt.base);
}

const STYLE_ID = "hmx-primary-color";

/** 把色阶写进运行时 <style>；非法值回落品牌蓝 */
export function applyPrimaryColor(id: string) {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  const isHex = /^#[0-9a-f]{6}$/i.test(id.trim());
  const ramp = (isHex ? makeRamp(id) : resolveRamp(id)) ?? resolveRamp("brand")!;
  const hex = isHex ? id.trim() : findPrimaryOption(id).base;
  style.textContent = `
html:root {
  --p-primary-50:${ramp[50]};--p-primary-100:${ramp[100]};--p-primary-200:${ramp[200]};
  --p-primary-300:${ramp[300]};--p-primary-400:${ramp[400]};--p-primary-500:${ramp[500]};
  --p-primary-600:${ramp[600]};--p-primary-700:${ramp[700]};--p-primary-800:${ramp[800]};
  --p-primary-900:${ramp[900]};--p-primary-950:${ramp[950]};
  --p-primary-color:${hex};--p-primary-hover-color:${ramp[600]};--p-primary-active-color:${ramp[700]};
  --p-primary-contrast-color:#ffffff;--p-primary-inset-contrast-color:#ffffff;--p-link-color:${hex};
}
html.dark {
  --p-primary-color:${ramp[400]};--p-primary-hover-color:${ramp[300]};--p-primary-active-color:${ramp[200]};
  --p-primary-contrast-color:#18181b;--p-primary-inset-contrast-color:#18181b;--p-link-color:${ramp[400]};
}`;
}
