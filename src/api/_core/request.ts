import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import ToastEventBus from "primevue/toasteventbus";
import { mockAdapter } from "@/mock/mockAdapter";
import type { Result } from "./types";
import { ApiError } from "./types";

/* ══ 依赖倒置：传输层不认识 store 与 router ══════════════════════════════════════
   本模块是依赖图最底层（api/common/menuRescTree → api/admin/request → 本模块），
   反向 import store / router 会成环——`request ↔ authStore` 就曾是一个真实的双向环
   （authStore → api/admin/request → 本模块 → authStore），AGENTS 里挂了很久的待办。
   现在改为：本模块只**声明**需要什么，由拥有者注入——

     token 提供者    ← authStore（它拥有 token）
     认证失败处理    ← router/core/guard（它拥有导航，且已在管落到 /login 的清理）

   箭头因此单向：应用 → 传输。这也是 soybean-admin 的 @sa/axios 的做法
   （那个包对应用零知识，行为全由 onRequest / onBackendFail 等 hook 注入）。 */

/** 未接线即调用 = 装配顺序被破坏。快速失败，而不是静默地「请求不带 token」 */
function notWired(name: string): never {
  throw new Error(`[request] ${name} 未接线：应在应用装配时注入（见 AGENTS「依赖倒置」）`);
}

let tokenProvider: () => string | undefined = () => notWired("tokenProvider");

/** 由 authStore 在模块求值时注入：返回当前会话 token（无会话返回 undefined） */
export function setTokenProvider(fn: () => string | undefined): void {
  tokenProvider = fn;
}

/** 认证失败时调用；返回 Promise 则被单飞闸等待（导航落定才释放） */
let authFailureHandler: () => unknown = () => {
  console.error("[request] authFailureHandler 未接线：认证失败无法登出与回登录页");
};

/** 由 router/core/guard 注入：清会话 + 导航回登录页（权限与动态路由的清理由守卫自己接管） */
export function setAuthFailureHandler(fn: () => unknown): void {
  authFailureHandler = fn;
}

/** 默认进程内 mock；VITE_USE_MOCK=false 时走真实后端（vite proxy /api）。
 *  不导出：全仓只有下面那行用它，对外没有消费方。 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

/** 拦截层用的轻 toast：直发 PrimeVue ToastEventBus，无需组件注入上下文。
 *  双段结构与 useToast 同约（见 @/composables/useToast）：summary=severity 派生标题、detail=正文。
 *  不导出：仅在下方拦截器内使用；组件里要发 toast 请用 @/composables/useToast。 */
const SEVERITY_TITLE = { success: "成功", info: "提示", warn: "警告", error: "错误" } as const;

function toastMessage(msg: string, severity: keyof typeof SEVERITY_TITLE = "error") {
  ToastEventBus.emit("add", { severity, summary: SEVERITY_TITLE[severity], detail: msg, life: 2200 });
}

const instance = axios.create({ timeout: 15000 });
if (USE_MOCK) instance.defaults.adapter = mockAdapter;

instance.interceptors.request.use((config) => {
  const token = tokenProvider();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** 认证失败单飞闸：并发请求齐失败只有第一个触发处理 + toast，其余静默——
 *  防「登录已过期」toast 叠楼与重复导航。处理落定即释放，重新登录后再次过期还要能走完整流程。
 *  闸放在传输层而非注入的处理器里：并发是传输层的关注点，处理器只管「怎么做」。 */
let authFailureHandling = false;

function handleAuthFailure(): void {
  if (authFailureHandling) return;
  authFailureHandling = true;
  Promise.resolve(authFailureHandler())
    .catch(() => {})
    .finally(() => {
      authFailureHandling = false;
    });
  toastMessage("登录已过期，请重新登录", "warn");
}

/** 认证失败判定。真实后端的**主力形态**是 HTTP 200 + success:false + code "401"（**字符串**）：
 *  `{data:null, success:false, code:"401", message:"hmxapi: User is not authenticated"}`。
 *  mock 与部分网关则用 HTTP 401。两种都要走同一条登出链路——只认 HTTP 状态码的话，会话过期
 *  在生产环境只会弹一个 message toast，既不登出也不跳转，用户卡在死页面上（2026-09 修正）。
 *  String() 归一是为了同时兼容字符串 "401" 与数字 401。 */
function isUnauthenticated(code: unknown): boolean {
  return String(code) === "401";
}

instance.interceptors.response.use(
  // 统一信封解包：success → data；认证失败 → handleAuthFailure；其余业务失败 → toast + ApiError
  (response) => {
    const result = response.data as Result<unknown>;
    if (result?.success) return result.data as any;
    if (isUnauthenticated(result?.code)) {
      handleAuthFailure();
      return Promise.reject(new ApiError(result.code, result?.message || "未认证"));
    }
    const message = result?.message || "操作失败";
    toastMessage(message);
    return Promise.reject(new ApiError(result?.code ?? -1, message));
  },
  (error: AxiosError<Result>) => {
    // 兜底：网关/代理可能直接回 HTTP 401（真实后端本身不发，见 isUnauthenticated 注释）
    if (error.response?.status === 401) handleAuthFailure();
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
