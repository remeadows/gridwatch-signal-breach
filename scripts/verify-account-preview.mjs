import { build } from "esbuild";

// Test the dedicated LAN compile flag, not a runtime query-string switch. A
// client method touched by account initialization would throw in this fixture.
const result = await build({
  stdin: {
    contents: `
      import { __setSupabaseForTests } from "@gridwatch/account-kit";
      import { accountNetworkingEnabled, leaderboardConfig } from "./src/leaderboard/config";
      import { initAccount, accountState, signOut } from "./src/leaderboard/account";
      __setSupabaseForTests(new Proxy({}, { get() { throw new Error("LAN account client was accessed"); } }));
      if (accountNetworkingEnabled || leaderboardConfig.enabled) throw new Error("LAN networking enabled");
      await initAccount();
      await signOut();
      if (accountState() !== "disabled") throw new Error("LAN account state must be disabled");
    `,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  define: { __EXPANSION_LAN_PREVIEW__: "true" },
  bundle: true, format: "esm", platform: "node", target: "node24", write: false,
});
await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
console.log("LAN account preview: no client initialization or sign-out network access.");
