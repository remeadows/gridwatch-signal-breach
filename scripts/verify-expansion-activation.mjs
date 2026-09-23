import { build } from "esbuild";
import assert from "node:assert/strict";

for (const lan of [false, true]) {
  const result = await build({ stdin: { contents: `
    export * from "./src/ui/featureFlags";
    export { canOpenExpansionLevel } from "./src/ui/expansionLevelAccess";
    export { expansionScoreApi } from "./src/leaderboard/expansionScoreApi";
  `, resolveDir: process.cwd(), loader: "ts" }, define: { __EXPANSION_LAN_PREVIEW__: String(lan) }, bundle: true, format: "esm", platform: "node", write: false });
  const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
  assert.equal(api.expansionScoreApi.enabled, !lan, "Released scores remain disabled in network-free LAN mode.");
  assert.equal(api.canOpenExpansionLevel(1, [], undefined), true);
  assert.equal(api.canOpenExpansionLevel(25, [], undefined), false, "Direct link cannot unlock a fresh account.");
  assert.equal(api.canOpenExpansionLevel(9, [1, 2, 3, 4, 5, 6, 7, 8], undefined), true);
  assert.equal(api.canOpenExpansionLevel(10, [1, 2, 3, 4, 5, 6, 7, 8], undefined), false);
  assert.equal(api.canOpenExpansionLevel(17, [], 17), true, "Existing valid checkpoint remains resumable.");
  assert.equal(api.canOpenExpansionLevel(22, [], undefined, 22), true, "Retained guest access is preserved.");
  assert.equal(api.canOpenExpansionLevel(22, [], undefined), false, "Guest access never grants account unlocks.");
  for (const level of [0, 26, NaN, 1.5]) assert.equal(api.canOpenExpansionLevel(level, [], undefined, 25), false);
  for (const hostname of ["nexus.warsignallabs.net", "gridwatch-signalbreach.warsignallabs.net", "branch.pages.dev", "127.0.0.1", "192.168.1.7"]) {
    const preview = hostname === "127.0.0.1" || (lan && hostname === "192.168.1.7");
    const location = (search = "") => { globalThis.window = { location: { hostname, search } }; };
    location();
    assert.equal(api.isExpansionNavigationEnabled(), true, `Normal navigation on ${hostname}`);
    assert.equal(api.isExpansionPlayEnabled(), false);
    location("?campaign=expansion-1&level=1");
    assert.equal(api.isExpansionPlayEnabled(), true, `Normal gameplay route on ${hostname}`);
    location("?campaign=expansion-1&view=levels&chapter=2");
    assert.equal(api.isExpansionPlayEnabled(), false);
    assert.equal(api.isExpansionLevelSelectRequested(), true);
    location("?expansion-play=1&level=25");
    assert.equal(api.isExpansionPlayEnabled(), preview, "Debug jump must remain private.");
    location("?expansion-nav=1&chapter=3");
    assert.equal(api.isExpansionLevelSelectRequested(), preview);
    location("?expansion-nav=0");
    assert.equal(api.isExpansionNavigationEnabled(), !preview, "Public query must not hide released navigation.");
    for (const flag of ["latency-trap-preview", "rusher-preview", "sapper-preview"]) {
      location(`?${flag}=1`);
      assert.equal(api.isPrototypePreviewEnabled(flag), preview);
    }
  }
}
delete globalThis.window;
console.log("Expansion activation: public navigation/play/return routes, private debug jumps/prototypes and network-free LAN scores passed.");
