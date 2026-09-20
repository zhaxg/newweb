import type { InternalAxiosRequestConfig, AxiosResponse } from "axios";
import type { HmxUser } from "@/data/users";
import { loadUsers, saveUsers, newUserId } from "@/data/users";
import type { Result } from "./types";

/**
 * 进程内 mock axios adapter：拦截 `${API_BASE}/admin/*`，直接读写现有 localStorage 数据源
 * （mock「数据库」= hmx.users，与页面旧链路同源，刷新不丢）。
 * VITE_USE_MOCK=false 时 request.ts 不挂本 adapter，请求走真实后端（vite proxy）。
 */

const LATENCY_MS = 200;

function envelope<T>(success: boolean, code: number, message: string, data: T): Result<T> {
  return { success, code, message, data };
}

function respond<T>(config: InternalAxiosRequestConfig, status: number, body: Result<T>): AxiosResponse<Result<T>> {
  return { data: body, status, statusText: "", headers: {}, config };
}

/** 关键字过滤：登录名/用户名/手机/邮件，不区分大小写（与原页面 applyQuery 同语义，移到「服务端」） */
function filterUsers(rows: HmxUser[], keywords?: string): HmxUser[] {
  const kw = (keywords ?? "").trim().toLowerCase();
  if (!kw) return rows;
  return rows.filter((r) => [r.id, r.cUserName, r.cPhone, r.cEmail].some((v) => v.toLowerCase().includes(kw)));
}

type Handler = (config: InternalAxiosRequestConfig) => AxiosResponse<Result<any>>;

const routes: Record<string, Handler> = {
  "post /hmx.Service.Admin.Services/admin/getUsers": (config) => {
    const params = (config.params ?? {}) as { keywords?: string };
    return respond(config, 200, envelope(true, 0, "", filterUsers(loadUsers(), params.keywords)));
  },
  "post /hmx.Service.Admin.Services/admin/addOrEditUser": (config) => {
    const body = JSON.parse(String(config.data ?? "{}")) as Partial<HmxUser>;
    if (!body.id?.trim() || !body.cUserName?.trim()) {
      return respond(config, 200, envelope(false, 1001, "校验失败：登录名与用户名不能为空", null));
    }
    const rows = loadUsers();
    const user = { ...body, id: body.id.trim() } as HmxUser;
    const index = rows.findIndex((r) => r.id === user.id);
    if (index >= 0) rows[index] = user;
    else rows.push({ ...user, id: user.id || newUserId() });
    saveUsers(rows);
    return respond(config, 200, envelope(true, 0, "", user.id));
  },
  "post /hmx.Service.Admin.Services/admin/resetPassword": (config) => {
    const params = (config.params ?? {}) as { userid?: string };
    if (!params.userid) return respond(config, 200, envelope(false, 1001, "缺少参数 userid", null));
    if (!loadUsers().some((r) => r.id === params.userid)) return respond(config, 200, envelope(false, 1002, "用户不存在", null));
    return respond(config, 200, envelope(true, 0, "", "Abc@123456"));
  },
  "post /hmx.Service.Admin.Services/admin/modifyPassword": (config) => {
    const params = (config.params ?? {}) as { userid?: string; oldpasswd?: string; newpasswd?: string };
    if (!params.userid || !params.oldpasswd || !params.newpasswd)
      return respond(config, 200, envelope(false, 1001, "缺少参数", null));
    if (!loadUsers().some((r) => r.id === params.userid)) return respond(config, 200, envelope(false, 1002, "用户不存在", null));
    // 演示模式：hmx.users 不存密码（登录亦不校验），校验用户存在即视为修改成功
    return respond(config, 200, envelope(true, 0, "", null));
  },
  "post /hmx.Service.Admin.Services/admin/deleteUser": (config) => {
    const params = (config.params ?? {}) as { userid?: string };
    if (!params.userid) return respond(config, 200, envelope(false, 1001, "缺少参数 userid", null));
    saveUsers(loadUsers().filter((r) => r.id !== params.userid));
    return respond(config, 200, envelope(true, 0, "", params.userid));
  },
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
      const url = (config.url ?? "").replace(/^[^:]*(?:https?:)?\/\/[^/]+/, "").split("?")[0].replace(/^\/api(?=\/)/, "");
      const handler = routes[`${config.method ?? "get"} ${url}`];
      if (handler) {
        resolve(handler(config));
      } else {
        resolve(respond(config, 200, envelope(false, 404, `mock 未注册的端点: ${url}`, null)));
      }
    }, LATENCY_MS);
  });
}
