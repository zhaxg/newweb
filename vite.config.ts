import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

const tauriStubPath = fileURLToPath(new URL("./src/lib/stubs/tauri.ts", import.meta.url));

const tauriStubPlugin = {
  name: "tauri-stub",
  enforce: "pre" as const,
  resolveId(id: string) {
    if (id === "@tauri-apps/api/window" || id.startsWith("@tauri-apps/")) return tauriStubPath;
    return null;
  },
};

export default defineConfig({
  plugins: [tauriStubPlugin, vue({ template: { compilerOptions: { isCustomElement: (tag) => tag === "erp-chrome-tabs" } } }), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
