/// <reference types="vite/client" />
/* vue-print-designer：加载 print-designer 自定义元素全局类型 */
/// <reference types="vue-print-designer" />

interface ImportMetaEnv {
  /** "false" 时请求层走真实后端（vite proxy），默认进程内 mock */
  readonly VITE_USE_MOCK?: string;
  /** 真实后端地址，供 vite proxy target 参考 */
  readonly VITE_API_TARGET?: string;
  /** 路由命名空间（权限资源 groupId），如 TDWEB */
  readonly VITE_ROUTER_NAMESPACE?: string;
  /** localStorage 加密层密钥（见 @/lib/encryptedStorage）：非空串即启用，空则明文 */
  readonly VITE_APP_STORE_SECURE_KEY?: string;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// PrimeVue 5 未随包发布该子模块的 d.ts（运行时是 mitt 实例）
declare module "primevue/toasteventbus" {
  const ToastEventBus: { on(type: string, listener: (event: any) => void): void; emit(type: string, event?: any): void; off(type: string, listener?: (event: any) => void): void };
  export default ToastEventBus;
}
