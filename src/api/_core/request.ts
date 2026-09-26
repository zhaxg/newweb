import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import ToastEventBus from "primevue/toasteventbus";
import { useAuthStore } from "@/stores/authStore";
/* 不 import @/router（index）：request → @/router → guard → store → api → request 是真实循环依赖。
   router 实例走叶桥 @/router/core/bridge —— 这是全仓唯一一个可从 router 外部引用的叶模块
   （清理已由守卫在落到 /login 时接管，故不再需要 dynamicRoutes）。 */
import { getRouter } from "@/router/core/bridge";
import { mockAdapter } from "@/mock/mockAdapter";
import type { Result } from "./types";
import { ApiError } from "./types";

/** 默认进程内 mock；VITE_USE_MOCK=false 时走真实后端（vite proxy /api） */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

/** 拦截层用的轻 toast：直发 PrimeVue ToastEventBus，无需组件注入上下文。
 *  双段结构与 useToast 同约（见 @/composables/useToast）：summary=severity 派生标题、detail=正文 */
const SEVERITY_TITLE = { success: "成功", info: "提示", warn: "警告", error: "错误" } as const;

export function toastMessage(msg: string, severity: keyof typeof SEVERITY_TITLE = "error") {
  ToastEventBus.emit("add", { severity, summary: SEVERITY_TITLE[severity], detail: msg, life: 2200 });
}

const instance = axios.create({ timeout: 15000 });
if (USE_MOCK) instance.defaults.adapter = mockAdapter;

instance.interceptors.request.use((config) => {
  const token = useAuthStore().session?.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** 401 单飞闸：并发请求齐 401 只有第一个执行登出清理 + toast + 回登录页，
 *  其余只 reject——防「登录已过期」toast 叠楼与重复 replace。
 *  导航落定即释放：重新登录后再次过期还要能走完整流程。 */
let sessionExpiredHandling = false;

/** 认证失败判定。真实后端的**主力形态**是 HTTP 200 + success:false + code "401"（**字符串**）：
 *  `{data:null, success:false, code:"401", message:"hmxapi: User is not authenticated"}`。
 *  mock 与部分网关则用 HTTP 401。两种都要走同一条登出链路——只认 HTTP 状态码的话，会话过期
 *  在生产环境只会弹一个 message toast，既不登出也不跳转，用户卡在死页面上（2026-09 修正）。
 *  String() 归一是为了同时兼容字符串 "401" 与数字 401。 */
function isUnauthenticated(code: unknown): boolean {
  return String(code) === "401";
}

/** 会话过期处理：清会话 + 回登录页。权限与动态路由的清理不在这里——导航到 /login 时守卫会
 *  就地执行（见 core/guard.ts 的 public 分支），本层对 router 的依赖仅剩实例桥一个叶模块。
 *  单飞闸：并发请求齐过期只有第一个执行，其余静默——防「登录已过期」toast 叠楼与重复 replace；
 *  导航落定即释放，重新登录后再次过期还要能走完整流程。 */
function handleSessionExpired(): void {
  if (sessionExpiredHandling) return;
  sessionExpiredHandling = true;
  const auth = useAuthStore();
  if (auth.session) auth.logout();
  const appRouter = getRouter();
  const current = appRouter.currentRoute.value;
  const nav =
    current.name !== "login" ? appRouter.replace({ name: "login", query: { redirect: current.fullPath } }) : null;
  Promise.resolve(nav)
    .catch(() => {})
    .finally(() => {
      sessionExpiredHandling = false;
    });
  toastMessage("登录已过期，请重新登录", "warn");
}

instance.interceptors.response.use(
  // 统一信封解包：success → data；认证失败 → 会话过期链路；其余业务失败 → toast + ApiError
  (response) => {
    const result = response.data as Result<unknown>;
    if (result?.success) return result.data as any;
    if (isUnauthenticated(result?.code)) {
      handleSessionExpired();
      return Promise.reject(new ApiError(result.code, result?.message || "未认证"));
    }
    const message = result?.message || "操作失败";
    toastMessage(message);
    return Promise.reject(new ApiError(result?.code ?? -1, message));
  },
  (error: AxiosError<Result>) => {
    // 兜底：网关/代理可能直接回 HTTP 401（真实后端本身不发，见 isUnauthenticated 注释）
    if (error.response?.status === 401) handleSessionExpired();
    else toastMessage("网络异常，请稍后重试", "error");
    return Promise.reject(error);
  },
);

/** 后端全站约定 /api/[area]/[controller]/[action]：接口定义里的 area 前缀在此统一补 /api，不改生成代码 */
function withApiPrefix(url: string): string {
  return url.startsWith("/api/") || url.startsWith("http") ? url : `/api${url.startsWith("/") ? "" : "/"}${url}`;
}

export const requestClient = {
  /** 返回已解包的业务 data（响应拦截器已把 Result<T> 拆封，axios 链上 resolve 的就是 data 本身） */
  request<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.request({ ...config, url: withApiPrefix(url) }) as unknown as Promise<T>;
  },
};
