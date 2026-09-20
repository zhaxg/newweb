import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

import { envelope, fail, respond, type RouteMap } from "./mock/core";
import { userRoutes } from "./mock/users";
import { roleRoutes } from "./mock/roles";
import { rescRoutes } from "./mock/resc";
import { kvRoutes } from "./mock/kv";
import { jobRoutes } from "./mock/jobs";
import { settingsRoutes } from "./mock/settings";
import { codeGenRoutes } from "./mock/codegen";
import { crudRoutes } from "./mock/crud";

/**
 * 进程内 mock axios adapter：拦截 `${API_BASE}/**`，读写现有 localStorage 数据源，
 * 对外统一暴露与真实后端一致的接口/数据形态（types.d.ts）。
 * VITE_USE_MOCK=false 时 request.ts 不挂本 adapter，请求走真实后端（vite proxy /api）。
 */

const LATENCY_MS = 200;

const routes: RouteMap = {
  ...userRoutes,
  ...roleRoutes,
  ...rescRoutes,
  ...kvRoutes,
  ...jobRoutes,
  ...settingsRoutes,
  ...codeGenRoutes,
  ...crudRoutes,
};

export function mockAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // 未携带 token → 401，走真实后端的登录过期链路（供守卫/拦截层验证）
      if (!config.headers?.Authorization) {
        reject(
          Object.assign(new Error("Request failed with status code 401"), {
            config,
            response: respond(config, 401, envelope(false, 401, "登录已过期或未登录", null)),
          }),
        );
        return;
      }
      // 归一化：请求层统一补了后端 /api 前缀，这里剥掉，路由表键与接口定义（API_BASE 起）保持一致
      const url = (config.url ?? "")
        .replace(/^[^:]*(?:https?:)?\/\/[^/]+/, "")
        .split("?")[0]
        .replace(/^\/api(?=\/)/, "");
      const handler = routes[`${config.method ?? "get"} ${url}`];
      if (handler) {
        resolve(handler(config));
      } else {
        resolve(fail(config, 404, `mock 未注册的端点: ${url}`));
      }
    }, LATENCY_MS);
  });
}
