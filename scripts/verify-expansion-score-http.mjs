import { build } from "esbuild";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Exercise the actual HTTP dispatcher with isolated Auth/DB ports. This is not
// a Deno deployment test and makes no network calls or production score writes.
let handler;
let authorized = true;
const writes = [];
globalThis.__scoreTestClient = () => ({
  auth: { getUser: async () => ({ data: { user: authorized ? { id: "authenticated-owner" } : null }, error: authorized ? null : "expired" }) },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { handle: "Tester" }, error: null }) }) }) }),
  rpc: async (name, input) => {
    assert.equal(name, "record_score"); writes.push(input);
    return { data: [{ stored_score: input.p_score, improved: true, sector_rank: 1, global_rank: 1 }], error: null };
  },
});
globalThis.Deno = { env: { get: () => "isolated-test-value" }, serve: (fn) => { handler = fn; } };
const result = await build({ entryPoints: ["supabase/functions/submit-gridwatch-score/index.ts"], bundle: true, write: false, format: "esm", platform: "node", plugins: [{ name: "isolated-auth-and-legacy", setup(builder) {
  builder.onResolve({ filter: /^jsr:/ }, () => ({ path: "auth", namespace: "test" }));
  builder.onResolve({ filter: /^https:/ }, () => ({ path: "legacy", namespace: "test" }));
  builder.onLoad({ filter: /.*/, namespace: "test" }, ({ path }) => ({ contents: path === "auth"
    ? "export const createClient = (...args) => globalThis.__scoreTestClient(...args);"
    : "export class ReplayError extends Error {} export function replayRun() { throw new ReplayError('Legacy not exercised in HTTP harness'); }", loader: "js" }));
} }] });
await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
const report = JSON.parse(await readFile(new URL("../docs/fixtures/expansion-1-r4-chapter-1-human-evidence.json", import.meta.url), "utf8"));
const proof = report.runs.find((r) => r.actionIntervalTicks === 3 && r.seed.endsWith("alpha")).replay;
const request = (body, headers = { Authorization: "Bearer isolated-token" }) => new Request("https://isolated.invalid/submit", { method: "POST", headers: { Origin: "https://nexus.warsignallabs.net", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
assert.equal((await handler(request(proof, {}))).status, 401);
authorized = false;
assert.equal((await handler(request(proof))).status, 401);
authorized = true;
assert.equal(writes.length, 0);
assert.equal((await handler(request("x".repeat(524289)))).status, 413);
assert.equal((await handler(request("not-json"))).status, 400);
assert.equal((await handler(request(null))).status, 400);
assert.equal((await handler(request({ ...proof, contentRevision: "expansion-1-r3" }))).status, 422);
assert.equal(writes.length, 0);
const response = await handler(request({ ...proof, user_id: "forged", category: "phase4-v1:global", score: 999999 }));
assert.equal(response.status, 200);
assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://nexus.warsignallabs.net");
assert.equal(writes.length, 1, "Expansion must return before original/hub writes.");
assert.equal(writes[0].p_user_id, "authenticated-owner");
assert.equal(writes[0].p_category, "expansion-v1:expansion-1-r4:level:1");
assert.equal("globalRank" in await response.json(), false);
const original = JSON.parse(await readFile(new URL("../docs/fixtures/phase4-promotion-replay.json", import.meta.url), "utf8"));
assert.equal((await handler(request(original))).status, 200);
assert.equal(writes[1].p_category, "phase4-v1:sector:1");
assert.equal(writes[1].p_score, 514);
assert.equal(writes.slice(1).some((w) => w.p_category.startsWith("expansion")), false);
assert.equal((await handler(new Request("https://isolated.invalid", { method: "OPTIONS", headers: { Origin: "https://nexus.warsignallabs.net" } }))).status, 204);
assert.equal((await handler(new Request("https://isolated.invalid"))).status, 405);
delete globalThis.Deno; delete globalThis.__scoreTestClient;
console.log("Expansion HTTP: auth denial, bounded body, malformed identity, server-derived owner/score, Nexus CORS, single-category early return and unchanged original score 514 passed.");
