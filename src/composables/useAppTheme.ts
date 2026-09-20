import { computed, ref, watchEffect } from "vue";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "erp.theme-mode";
const mode = ref<ThemeMode>((localStorage.getItem(STORAGE_KEY) as ThemeMode) || "system");
const systemDark = ref(window.matchMedia("(prefers-color-scheme: dark)").matches);

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
  systemDark.value = event.matches;
});

export const isDarkTheme = computed(() => mode.value === "dark" || (mode.value === "system" && systemDark.value));

watchEffect(() => {
  const dark = mode.value === "dark" || (mode.value === "system" && systemDark.value);
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem(STORAGE_KEY, mode.value);
});

export function useAppTheme() {
  return { mode, setMode: (next: ThemeMode) => (mode.value = next) };
}
