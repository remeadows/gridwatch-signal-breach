import { defineConfig } from "vite";

export default defineConfig(({ command, mode }) => ({
  base: "/",
  // This flag cannot be enabled in any build, including --mode lan-preview.
  define: { __EXPANSION_LAN_PREVIEW__: command === "serve" && mode === "lan-preview" },
  // The phone-acceptance dev server must never expose leaderboard credentials.
  envPrefix: mode === "lan-preview" ? "GRIDWATCH_UNUSED_PUBLIC_" : "VITE_",
  build: {
    modulePreload: {
      polyfill: false,
    },
  },
}));
