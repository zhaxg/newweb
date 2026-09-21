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
app.use(createPinia());
app.use(router);
app.use(hmxAgGridPlugin);
app.use(hmxPrimePlugin);
app.mount("#app");
