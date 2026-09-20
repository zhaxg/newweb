import { createApp } from "vue";
import App from "./App.vue";
import { installPrimeVue } from "./lib/primeTheme";
import "./styles/globals.css";
import "./styles/agGrid.css";
import "./styles/prime-overrides.css";

const app = createApp(App);
installPrimeVue(app);
app.mount("#app");
