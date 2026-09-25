/**
 * 系统设置 store（替代 DBX 2680 行 settingsStore，只保留表格/字体/主题层用到的表面）。
 * Pinia setup 风格：状态就一个 editorSettings(reactive)，动作 updateEditorSettings(patch)，
 * 持久化单键 localStorage。副作用 watch（持久化 / --hmx-scale / 主题色）在 store 创建时注册，
 * 生命周期挂 pinia 实例——main.ts 在 app.use(pinia) 后立即实例化一次，
 * 保证 immediate watch 在首个组件挂载前恢复档位/主题色（原手写单例靠模块求值做到的一点）。
 */
import { reactive, watch } from "vue";
import { defineStore } from "pinia";
import { applyPrimaryColor } from "@/lib/themeSettings";

/** 字体缩放档位（系统设置 → 字体大小）。standard = 现有视觉（年轻紧凑档）。 */
export type FontScale = "standard" | "large" | "xlarge";

/** 档位 → --hmx-scale 系数：html font-size = calc(--hmx-scale × 100%)。
 *  基准是 100% 而非 16px，尊重用户浏览器自己的字号设置，缩放是"再乘系数"。 */
export const FONT_SCALE: Record<FontScale, number> = { standard: 1, large: 1.15, xlarge: 1.3 };

type EditorSettings = {
  fontScale: FontScale;
  tableFontFamily: string;
  theme: string;
  numericColumnRightAlign: boolean;
  cellDetailJsonFormatted: boolean;
  exportRowLimit: number;
  exportRowLimitEnabled: boolean;
  csvQuoteMode: string;
  globalDateTimeExportFormat: string;
  dataGridTypeColorScheme: string;
  dataGridTypeColorSchemes: unknown[];
  fontChineseFamily: string;
  fontEnglishFamily: string;
  /** 主题色：预设 id（themeSettings.primaryOptions）或自定义 hex */
  primaryColor: string;
  [key: string]: unknown;
};

const STORAGE_KEY = "hmx.editor-settings";

const defaults: EditorSettings = {
  fontScale: "standard",
  tableFontFamily: "IBM Plex Sans",
  theme: "system",
  numericColumnRightAlign: true,
  cellDetailJsonFormatted: true,
  exportRowLimit: 10000,
  exportRowLimitEnabled: false,
  csvQuoteMode: "minimal",
  globalDateTimeExportFormat: "",
  dataGridTypeColorScheme: "auto",
  dataGridTypeColorSchemes: [],
  fontChineseFamily: "",
  /* 默认拉丁字体：@fontsource 本地引入 400/500/700（见 main.ts），下拉选「系统默认」即回落 fontSettings.BASE_STACK */
  fontEnglishFamily: "IBM Plex Sans",
  primaryColor: "brand",
};

function load(): EditorSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    /* corrupted storage: fall through to defaults */
  }
  return { ...defaults };
}

export const useSettingsStore = defineStore("settings", () => {
  const editorSettings = reactive<EditorSettings>(load());

  watch(
    editorSettings,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        /* storage full or unavailable */
      }
    },
    { deep: true },
  );

  // 字体缩放档位 → 根字号 CSS 变量（immediate：刷新后启动即恢复档位）
  watch(
    () => editorSettings.fontScale,
    (v) => {
      document.documentElement.style.setProperty("--hmx-scale", String(FONT_SCALE[v] ?? 1));
    },
    { immediate: true },
  );

  // 主题色 → 运行时覆盖 --p-primary-* 色阶（immediate：刷新后启动即恢复）
  watch(
    () => editorSettings.primaryColor,
    (v) => applyPrimaryColor(v),
    { immediate: true },
  );

  function updateEditorSettings(patch: Partial<EditorSettings>) {
    Object.assign(editorSettings, patch);
  }

  return { editorSettings, updateEditorSettings };
});
