import { fileURLToPath, URL } from "node:url";
import { promisify } from "node:util";
import { gzip } from "node:zlib";
import { defineConfig, loadEnv, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const gzipAsync = promisify(gzip);

/** 产 .gz 静态预压缩文件（level 9）：配合 nginx gzip_static / IIS 静态压缩，
 *  避免服务器实时压缩 6000+ chunk 烧 CPU。保留原文件——服务器未配预压缩时退化为不压缩，不会 404。
 *  只压 ≥10KB 的文件：小 chunk 收益抵不过产物数量与磁盘开销。 */
const hmxGzipAssets = (): Plugin => ({
  name: "hmx-gzip-assets",
  apply: "build",
  async generateBundle(_options, bundle) {
    for (const [fileName, item] of Object.entries(bundle)) {
      if (!/\.(?:js|mjs|css|html|svg)$/.test(fileName)) continue;
      const source = item.type === "chunk" ? item.code : item.source;
      const bytes = typeof source === "string" ? Buffer.byteLength(source) : source.byteLength;
      if (bytes < 10 * 1024) continue;
      this.emitFile({
        type: "asset",
        fileName: `${fileName}.gz`,
        source: await gzipAsync(source, { level: 9 }),
      });
    }
  },
});

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
      hmxGzipAssets(),
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
