import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

// Explicit companion-checkout path; never replaces the game's pinned dependency.
const candidate = process.argv[2];
if (!candidate) throw new Error("Usage: npm run check:expansion-save-contract -- /path/to/built/account-kit");
const kit = await import(pathToFileURL(resolve(candidate, "dist/saves-schema/index.js")).href);
const { outputFiles } = await build({ entryPoints: ["scripts/verify-expansion-save-codec.ts"],
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent" });
const game = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`);
const descriptor = (schema) => JSON.stringify(schema, (_key, value) => value instanceof RegExp
  ? { pattern: value.source, flags: value.flags } : value);
assert.equal(descriptor(kit.BREACH_EXPANSION_V1), descriptor(game.BREACH_EXPANSION_V1), "Game mirror must equal the shared schema exactly");
assert.deepEqual(kit.resolveSaveGame("breach"), { slug: "gridwatch-signal-breach", slots: ["expansion-1-r4"], schemaVersion: 1 });
for (const payload of game.encodedSaveFixtures) {
  assert.deepEqual(kit.validatePayload("gridwatch-signal-breach", 1, "expansion-1-r4", payload), { ok: true });
  assert.doesNotThrow(() => kit.canonicalJson(payload), "Payload must support the shared request hash");
  assert.equal(kit.validatePayload("gridwatch-match", 1, "campaign", payload).ok, false);
}
console.log(`Companion account-kit contract matches exactly; ${game.encodedSaveFixtures.length} game payloads validated and isolated from Match.`);
