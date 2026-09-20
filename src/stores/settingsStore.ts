/**
 * Lightweight replacement for DBX's 2680-line settingsStore.
 * Provides only the surface the extracted grid layer uses:
 *   editorSettings (reactive) + updateEditorSettings(patch).
 * Persisted to localStorage under one key.
 */
import { reactive, watch } from "vue";

type EditorSettings = {
  fontSize: number;
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
  fontSize: 13,
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
