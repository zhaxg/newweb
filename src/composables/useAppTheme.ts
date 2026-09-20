import { computed, ref, watchEffect } from "vue";

type ThemeMode = "light" | "dark";

const STORAGE_KEY = "hmx.theme-mode";
// 仅 light/dark 二态；旧持久值（如 "system"）归一为 light
const mode = ref<ThemeMode>(localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light");

export const isDark = computed(() => mode.value === "dark");

watchEffect(() => {
  document.documentElement.classList.toggle("dark", isDark.value);
  localStorage.setItem(STORAGE_KEY, mode.value);
});

export function useAppTheme() {
  return { mode, isDark, setMode: (next: ThemeMode) => (mode.value = next) };
}
