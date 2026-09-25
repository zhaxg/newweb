import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { hmxPrimePlugin } from "./lib/primeTheme";
import { hmxErrorPlugin } from "./lib/globalError";
import { hmxClickGuardPlugin } from "./lib/clickGuard";
import { hmxPermissionPlugin } from "./composables/usePermission";
import { useSettingsStore } from "./stores/settingsStore";
import { applyEffectsPreference } from "./lib/effectsPerf";
/* 拉丁默认字体：IBM Plex Sans 三档字重（latin 子集，无 unicode-range 的裸 @font-face）。
   中文仍由 --font-sans 栈里的 PingFang/雅黑兜底——Plex 无中文字形，浏览器逐字回退。 */
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-700.css";
import "./styles/globals.css";
import "./styles/scrollbar.css";
import "./styles/prime-overrides.css";
/* agGrid.css 随 @/lib/agGrid（首个表格页）加载，见该文件注册段 */
/* vue-print-designer 按需加载：见 pages/Widgets/XtraReportTemplateManager/loadPrintDesigner.ts
   的 ensurePrintDesigner()（设计器页 / 样例打印时再 import，避免 Web Component 进首屏链） */

/* 特效降级探测（软件渲染 → html.hmx-effects-off），一次即可，不阻塞挂载 */
applyEffectsPreference();

/* 刷新白屏过渡已移入路由守卫（首个 beforeEach 显示、首次导航完成移除；
   路由级开关 meta.loading，见 @/router 与 components/loading） */

const app = createApp(App);

app.use(createPinia());
/* 设置 store 立即实例化：其 immediate watch 负责首屏恢复 --hmx-scale 与主题色，
   不能等第一个组件用到它才生效（会先闪默认档） */
useSettingsStore();
app.use(router);
app.use(hmxErrorPlugin);
app.use(hmxClickGuardPlugin);
app.use(hmxPermissionPlugin);
/* ag-grid 模块注册/License/全局 gridOptions 不在这里：main.ts 静态引入 lib/agGrid 会把
   ag-grid community+enterprise 全家桶拖进首屏 entry chunk，初始化改随首个表格页的 lib/agGrid 求值执行 */
app.use(hmxPrimePlugin);
app.mount("#app");
