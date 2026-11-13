import { createApp } from "vue";
import { createPinia } from "pinia";
import { createI18n } from "vue-i18n";
import App from "./App.vue";
import router from "./router";
import { messages } from "./i18n/messages";
import { useThemeStore } from "./stores/theme";
import { useSyncStore } from "./stores/sync";
import { initializePwa, registerPwaServiceWorker } from "./lib/pwa";
import "./style.css";

const savedLang = (localStorage.getItem("pfa-lang") as "th" | "en") || (navigator.language.startsWith("th") ? "th" : "en");

const i18n = createI18n({
  legacy: false,
  locale: savedLang,
  fallbackLocale: "en",
  messages,
});

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(i18n);
app.use(router);
initializePwa();
app.mount("#app");

useThemeStore().apply();
useSyncStore().listen();
registerPwaServiceWorker();
