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
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // 归一化：请求层统一补了后端 /api 前缀，这里剥掉，路由表键与接口定义（API_BASE 起）保持一致
      const url = (config.url ?? "")
        .replace(/^[^:]*(?:https?:)?\/\/[^/]+/, "")
        .split("?")[0]
        .replace(/^\/api(?=\/)/, "");
      const key = `${config.method ?? "get"} ${url}`;
      // 未携带 token → 401，走真实后端的登录过期链路（供守卫/拦截层验证）
      if (!PUBLIC_ROUTES.has(key) && !config.headers?.Authorization) {
        reject(
          Object.assign(new Error("Request failed with status code 401"), {
            config,
            response: respond(config, 401, envelope(false, 401, "登录已过期或未登录", null)),
          }),
        );
        return;
      }
      const handler = routes[key];
      if (handler) {
        resolve(handler(config));
      } else {
        resolve(fail(config, 404, `mock 未注册的端点: ${url}`));
      }
    }, LATENCY_MS);
  });
}
