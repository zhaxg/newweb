import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { hmxPrimePlugin } from "./lib/primeTheme";
import { hmxAgGridPlugin } from "./lib/agGrid";
import { hmxErrorPlugin } from "./lib/globalError";
import { hmxPermissionPlugin } from "./composables/usePermission";
import { applyEffectsPreference } from "./lib/effectsPerf";
/* 拉丁默认字体：IBM Plex Sans 三档字重（latin 子集，无 unicode-range 的裸 @font-face）。
   中文仍由 --font-sans 栈里的 PingFang/雅黑兜底——Plex 无中文字形，浏览器逐字回退。 */
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-700.css";
import "./styles/globals.css";
import "./styles/scrollbar.css";
import "./styles/agGrid.css";
import "./styles/prime-overrides.css";
/* vue-print-designer 按需加载：见 src/lib/loadPrintDesigner.ts（设计器页/样例打印时再 import） */

/* 特效降级探测（软件渲染 → html.hmx-effects-off），一次即可，不阻塞挂载 */
applyEffectsPreference();

/* 刷新白屏过渡已移入路由守卫（首个 beforeEach 显示、首次导航完成移除；
   路由级开关 meta.loading，见 @/router 与 components/loading） */

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(hmxErrorPlugin);
app.use(hmxPermissionPlugin);
app.use(hmxAgGridPlugin);
app.use(hmxPrimePlugin);
app.mount("#app");
