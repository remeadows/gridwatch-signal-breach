import { defineConfig } from "vite";

export default defineConfig({
  base: "/gridwatch-signal-breach/",
  build: {
    modulePreload: {
      polyfill: false,
    },
  },
});
