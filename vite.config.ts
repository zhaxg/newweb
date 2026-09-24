import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag === "hmx-chrome-tabs" || tag === "print-designer",
          },
        },
      }),
      tailwindcss(),
    ],
    server: {
      host: "0.0.0.0",
      // 仅 VITE_USE_MOCK=false 的真实后端模式生效；全站接口约定 /api/[area]/[controller]/[action]
      // target 取 .env 的 VITE_API_TARGET
      proxy: {
        "/api": {
          target: env.VITE_API_TARGET || "http://localhost:8080",
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        "@primeui/license-manager": path.resolve(__dirname, "./src/lib/primeLcmgr.ts"),
        "tabler-icons": path.resolve(__dirname, "./node_modules/@tabler/icons-vue/dist/esm/icons"),
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  };
});
