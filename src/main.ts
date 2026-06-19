import { createApp } from "vue";
import naiveUI from "naive-ui";
import router from "./router/router";
import Provider from "./components/Provider.vue";
import "./index.css";

createApp(Provider).use(router).use(naiveUI).mount("#app");
