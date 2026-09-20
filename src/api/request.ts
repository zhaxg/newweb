import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import ToastEventBus from "primevue/toasteventbus";
import { useAuthStore } from "@/stores/authStore";
import { usePermissionStore } from "@/stores/permissionStore";
import { router, resetUserRoutes } from "@/router";
import { mockAdapter } from "./mockAdapter";
import type { Result } from "./types";
import { ApiError } from "./types";

/** 默认进程内 mock；VITE_USE_MOCK=false 时走真实后端（vite proxy /api） */
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

/** 拦截层用的轻 toast：直发 PrimeVue ToastEventBus，无需组件注入上下文 */
export function toastMessage(msg: string) {
  ToastEventBus.emit("add", { severity: "info", summary: msg, life: 2200 });
}

const instance = axios.create({ timeout: 15000 });
if (USE_MOCK) instance.defaults.adapter = mockAdapter;

instance.interceptors.request.use((config) => {
  const token = useAuthStore().session?.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

instance.interceptors.response.use(
  // 统一信封解包：success → data；业务失败 → toast + ApiError（调用方 catch 即静默）
  (response) => {
    const result = response.data as Result<unknown>;
    if (result?.success) return result.data as any;
    const message = result?.message || "操作失败";
    toastMessage(message);
    return Promise.reject(new ApiError(result?.code ?? -1, message));
  },
  (error: AxiosError<Result>) => {
    if (error.response?.status === 401) {
      const auth = useAuthStore();
      if (auth.session) {
        auth.logout();
        usePermissionStore().reset();
        resetUserRoutes();
      }
      const current = router.currentRoute.value;
      if (current.name !== "login") {
        router.replace({ name: "login", query: { redirect: current.fullPath } });
      }
      toastMessage("登录已过期，请重新登录");
    } else {
      toastMessage("网络异常，请稍后重试");
    }
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
