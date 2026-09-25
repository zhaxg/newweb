import type { App, Plugin } from "vue";

/* window 级监听只注册一次：多应用实例重复 use 时不再叠加 */
let windowListenersRegistered = false;

/* HMX 全局异常捕获插件：Vue 组件渲染/挂载错误 console.error + 阻止向上传播，
   避免崩溃整个 MainLayout；同时挂 unhandledrejection / error 的 window 监听。 */
export const hmxErrorPlugin: Plugin = {
  install(app: App) {
    app.config.errorHandler = (err, instance, info) => {
      console.error("[Vue Error]", err, info, instance);
    };
    if (windowListenersRegistered) return;
    windowListenersRegistered = true;
    // 未捕获的 Promise rejection（如 AG Grid 异步报错）
    window.addEventListener("unhandledrejection", (e) => {
      console.error("[UnhandledRejection]", e.reason);
      e.preventDefault();
    });
    // 未捕获的同步错误
    window.addEventListener("error", (e) => {
      console.error("[WindowError]", e.message, e.filename, e.lineno);
    });
  }
};
