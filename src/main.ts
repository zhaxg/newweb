import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { hmxPrimePlugin } from "./lib/primeTheme";
import { hmxAgGridPlugin } from "./lib/agGrid";
import { applyEffectsPreference } from "./lib/effectsPerf";
import "./styles/globals.css";
import "./styles/agGrid.css";
import "./styles/prime-overrides.css";

/* 特效降级探测（软件渲染 → html.hmx-effects-off），一次即可，不阻塞挂载 */
applyEffectsPreference();

/* 刷新白屏过渡已移入路由守卫（首个 beforeEach 显示、首次导航完成移除；
   路由级开关 meta.loading，见 @/router 与 components/loading） */

const app = createApp(App);

/* ── 全局异常捕获 ── */
// Vue 组件渲染/挂载错误：捕获后 console.error + 阻止向上传播，避免崩溃整个 MainLayout
app.config.errorHandler = (err, instance, info) => {
  console.error("[Vue Error]", err, info, instance);
};
// 未捕获的 Promise rejection（如 AG Grid 异步报错）
window.addEventListener("unhandledrejection", (e) => {
  console.error("[UnhandledRejection]", e.reason);
  e.preventDefault();
});
// 未捕获的同步错误
window.addEventListener("error", (e) => {
  console.error("[WindowError]", e.message, e.filename, e.lineno);
});

app.use(createPinia());
app.use(router);
app.use(hmxAgGridPlugin);
app.use(hmxPrimePlugin);
app.mount("#app");
