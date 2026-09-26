import { fileURLToPath, URL } from "node:url";
import { promisify } from "node:util";
import { gzip } from "node:zlib";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { defineConfig, loadEnv, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const gzipAsync = promisify(gzip);

/** 递归列出待压缩的产物文件（排除 .gz 自身，避免二次压缩） */
const listGzipTargets = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return listGzipTargets(p);
    return /\.(?:js|mjs|css|html|svg)$/.test(e.name) && !e.name.endsWith(".gz") ? [p] : [];
  });

/** 产 .gz 静态预压缩文件（level 9）：配合 nginx gzip_static / IIS 静态压缩，
 *  避免服务器实时压缩 6000+ chunk 烧 CPU。保留原文件——服务器未配预压缩时退化为不压缩，不会 404。
 *  只压 ≥10KB 的文件：小 chunk 收益抵不过产物数量与磁盘开销。
 *
 *  ⚠️ 必须用 writeBundle 而不是 generateBundle：Vite 的 vite:build-import-analysis 在**它自己的**
 *  generateBundle 里才把 `__VITE_PRELOAD__` 替换成 `__vite__mapDeps([...])` 并注入那张表，
 *  而插件钩子按注册顺序先跑——在 generateBundle 里压，压到的是**替换前的快照**。
 *  后果实测：entry chunk 的 .gz 解出来带 6527 处未定义标识符 `__VITE_PRELOAD__`、
 *  且完全没有 `__vite__mapDeps` 定义，配了 gzip_static 的服务器会把这份坏文件发给用户，
 *  懒加载图标时抛 ReferenceError（2026-09 实测确认，184 个 .gz 里 7 个陈旧）。
 *  writeBundle 时文件已落盘，读最终内容再压。 */
const hmxGzipAssets = (): Plugin => {
  let outDir = "dist";
  return {
    name: "hmx-gzip-assets",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    async writeBundle() {
      const root = path.resolve(__dirname, outDir);
      for (const file of listGzipTargets(root)) {
        const source = readFileSync(file);
        if (source.byteLength < 10 * 1024) continue;
        writeFileSync(`${file}.gz`, await gzipAsync(source, { level: 9 }));
      }
    },
  };
};

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
