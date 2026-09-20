import { createApp } from "vue";
import App from "./App.vue";
import { i18n } from "./i18n";
import { installPrimeVue } from "./lib/primeTheme";
import "./styles/globals.css";
import "./styles/agGrid.css";
import "./styles/prime-overrides.css";

const app = createApp(App);
app.use(i18n);
installPrimeVue(app);
app.mount("#app");
