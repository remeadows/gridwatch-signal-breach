import { defineConfig } from "vite";

export default defineConfig(({ command, mode }) => ({
  base: "/play/breach/",
  // This flag cannot be enabled in any build, including --mode lan-preview.
  define: { __EXPANSION_LAN_PREVIEW__: command === "serve" && mode === "lan-preview" },
  build: {
    modulePreload: {
      polyfill: false,
    },
  },
}));
