import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { installPrimeVue } from "./lib/primeTheme";
import { useLoadingScreen } from "./components/loading/loading";
import "./styles/globals.css";
import "./styles/agGrid.css";
import "./styles/prime-overrides.css";

/* 刷新白屏过渡：模块执行即显示（早于首帧渲染），首次导航完成（守卫里含
   拉菜单/注册路由等异步）后 2s 淡出移除 */
const { show, hide } = useLoadingScreen();
show();

const app = createApp(App);
app.use(createPinia());
app.use(router);
installPrimeVue(app);
app.mount("#app");
void router.isReady().then(hide);
