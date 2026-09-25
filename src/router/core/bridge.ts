/**
 * router 单例桥：给「不能 import `@/router`（index）」的消费方提供已创建的 router 实例。
 *
 * 为什么存在：`request → @/router → guard → permissionStore → menuRescTree → api → request`
 * 是一条真实的模块循环依赖；usePermission 同理。根因是消费方只要一个「实例」，却被拖进整个
 * index（建表 + 守卫 + 注册）。index 在 createRouter 后调用 attachRouter 挂载，本桥只依赖
 * Router 类型，是叶模块——谁 import 它都不会造回边。
 *
 * 引用约束：✅ **叶模块，router 外部可安全 import**（现消费方：api/_core/request、composables/usePermission）。
 * core/ 下只有本文件与 dynamicRoutes.ts 是叶模块；guard / fromMenu 依赖 store 与页面组件，**勿外部引用**。
 */
import type { Router } from "vue-router";

let instance: Router | null = null;

/** @/router/index 求值时调用（createRouter 之后），晚于任何业务请求可能发生的时机 */
export function attachRouter(router: Router): void {
  instance = router;
}

/** 取 router 实例。未 attach 即使用 = 模块求值顺序被破坏，快速失败暴露问题而非静默 undefined */
export function getRouter(): Router {
  if (!instance) {
    throw new Error("router bridge 未初始化：@/router/index 求值时未调用 attachRouter");
  }
  return instance;
}
