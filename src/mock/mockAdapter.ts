import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

import { envelope, fail, respond, type RouteMap, API_BASE } from "./admin/core";
import { authRoutes } from "./admin/auth";
import { departmentRoutes } from "./admin/department";
import { userRoutes } from "./admin/users";
import { roleRoutes } from "./admin/roles";
import { rescRoutes } from "./admin/resc";
import { kvRoutes } from "./admin/kv";
import { jobRoutes } from "./admin/jobs";
import { settingsRoutes } from "./admin/settings";
import { codeGenRoutes } from "./admin/codegen";
import { crudRoutes } from "./admin/crud";
import { limsRoutes } from "./mes4ddh/lims";
import { shrRoutes } from "./mes4ddh/shr";
import { sqmRoutes } from "./mes4ddh/sqm";
import { smpRoutes } from "./mes4ddh/smp";
import { sydRoutes } from "./mes4ddh/syd";
import { smsRoutes } from "./mes4ddh/sms";
import { printReportRoutes } from "./mes4ddh/printReport";
import { carbonRoutes } from "./carbon";
import { mesPlaceholderRoutes } from "./mes4ddh/placeholders";

/**
 * 进程内 mock axios adapter：拦截 `${API_BASE}/**`，读写现有 localStorage 数据源，
 * 对外统一暴露与真实后端一致的接口/数据形态（types.d.ts）。
 * VITE_USE_MOCK=false 时 request.ts 不挂本 adapter，请求走真实后端（vite proxy /api）。
 */

const LATENCY_MS = 200;

const routes: RouteMap = {
  ...authRoutes,
  ...departmentRoutes,
  ...userRoutes,
  ...roleRoutes,
  ...rescRoutes,
  ...kvRoutes,
  ...jobRoutes,
  ...settingsRoutes,
  ...codeGenRoutes,
  ...crudRoutes,
  ...limsRoutes,
  ...shrRoutes,
  ...sqmRoutes,
  ...smpRoutes,
  ...sydRoutes,
  ...smsRoutes,
  ...printReportRoutes,
  ...carbonRoutes,
  // 迁移占位放最后：同名端点若域文件里已有手写 mock，手写优先，占位只兜「还没注册」的那些
  ...mesPlaceholderRoutes,
};

/** 登录前/登出接口：真实后端同样不校验 Authorization 头，豁免 mock 的 401 门 */
const PUBLIC_ROUTES = new Set([
  `post ${API_BASE}/auth/token`,
  `post ${API_BASE}/auth/getUserInfo`,
  `post ${API_BASE}/auth/getCaptchaImage`,
  `post ${API_BASE}/auth/getCaptchaChallenge`,
  `post ${API_BASE}/auth/logout`,
]);

export function mockAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // 归一化：请求层统一补了后端 /api 前缀，这里剥掉，路由表键与接口定义（API_BASE 起）保持一致
      const url = (config.url ?? "")
        .replace(/^[^:]*(?:https?:)?\/\/[^/]+/, "")
        .split("?")[0]
        .replace(/^\/api(?=\/)/, "");
      const key = `${config.method ?? "get"} ${url}`;
      /* 未携带 token → 认证失败。**按真实后端的形状发**：HTTP 状态仍是 200，
         靠信封里的 success:false + code "401"（字符串）表达——
         {data:null, success:false, code:"401", message:"hmxapi: User is not authenticated"}。
         早先这里发的是 HTTP 401，与真实后端不一致，于是「会话过期不登出」这个 bug
         在演示环境被掩盖、只在生产显形（2026-09 修正）。改后 mock 与真实后端走同一条链路。 */
      if (!PUBLIC_ROUTES.has(key) && !config.headers?.Authorization) {
        resolve(respond(config, 200, envelope(false, "401", "hmxapi: User is not authenticated", null)));
        return;
      }
      const handler = routes[key] ?? matchPath(key);
      if (handler) {
        resolve(handler(config));
      } else {
        resolve(fail(config, 404, `mock 未注册的端点: ${url}`));
      }
    }, LATENCY_MS);
  });
}

/* ── 路径参数键（`get /business/xxx/getInfo/:id`）──────────────────────
   路由表是 `Record<键, Handler>` 的**精确**查表，`:id` 段的键永远等不到真实请求
   （`get .../getInfo/2095…` ≠ `get .../getInfo/:id`）。碳资产域大量端点是这种 REST 形式
   （getXxxInfo/:id、delete/:id、enable/:id…，线上 chunk 里就有 50+ 个），不支持就会一律 404
   「mock 未注册的端点」，而这些操作按约定是要**插桩回成功**的。
   实现取「先精确、后模式」：只有精确键落空才扫含 `:` 的键，常规键零开销；
   模式键少（当前只有碳域），每次 miss 顺序扫一遍的代价可忽略。 */
const PATTERN_KEYS = Object.keys(routes).filter((k) => k.includes(":"));

function matchPath(key: string): Handler | undefined {
  const sp = key.indexOf(" ");
  if (sp < 0) return undefined;
  const method = key.slice(0, sp + 1);
  const path = key.slice(sp + 1);
  for (const k of PATTERN_KEYS) {
    if (!k.startsWith(method)) continue;
    const pattern = k.slice(method.length);
    const re = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/:[A-Za-z0-9_]+/g, "[^/]+")}$`);
    if (re.test(path)) return routes[k];
  }
  return undefined;
}
