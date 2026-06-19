import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import jsx from "@vitejs/plugin-vue-jsx";
import path from "path";
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/manajemen-dashboard/" : "/",
  resolve: {
    alias: {
      "@": path.resolve("./src"),
    },
  },
  plugins: [vue(), jsx()],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ["vue"],
          naiveui: ["naive-ui"],
          echarts: ["echarts"],
          pdfjs: ["pdfjs-dist"],
          icons: ["@vicons/material"],
        },
      },
    },
  },
}));
