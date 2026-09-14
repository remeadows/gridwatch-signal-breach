import { defineConfig } from "vite";

export default defineConfig({
  base: "/play/breach/",
  build: {
    modulePreload: {
      polyfill: false,
    },
  },
});
