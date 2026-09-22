/**
 * Lightweight replacement for DBX's 2680-line settingsStore.
 * Provides only the surface the extracted grid layer uses:
 *   editorSettings (reactive) + updateEditorSettings(patch).
 * Persisted to localStorage under one key.
 */
import { reactive, watch } from "vue";

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
  [key: string]: unknown;
};

const STORAGE_KEY = "hmx.editor-settings";

const defaults: EditorSettings = {
  fontScale: "standard",
  tableFontFamily: "Geist Variable Tabular",
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
  fontEnglishFamily: "",
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

let instance: ReturnType<typeof build> | null = null;

function build() {
  return {
    editorSettings,
    updateEditorSettings(patch: Partial<EditorSettings>) {
      Object.assign(editorSettings, patch);
    },
  };
}

export function useSettingsStore() {
  if (!instance) instance = build();
  return instance;
}
