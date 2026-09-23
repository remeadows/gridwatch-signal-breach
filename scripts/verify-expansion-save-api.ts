import assert from "./assert";
import { createExpansionSaveTransport } from "../src/leaderboard/expansionSaveApi";
import { emptyExpansionSave } from "../src/ui/expansionSave";

const config = { enabled: true, url: "https://test.invalid", anonKey: "test-publishable" };
let calls = 0;
let response: unknown = null;
let status = 200;
let seenToken: unknown;
let seenBody: unknown;
let seenUrl: unknown;
const request: typeof fetch = async (url, init) => {
  calls += 1; seenToken = new Headers(init?.headers).get("Authorization");
  seenBody = JSON.parse(String(init?.body)); seenUrl = url;
  return new Response(JSON.stringify(response), { status });
};
assert.equal(createExpansionSaveTransport({ ...config, enabled: false }, "test-token-a", request), null);
assert.equal(createExpansionSaveTransport(config, "", request), null);
assert.equal(calls, 0);
const a = createExpansionSaveTransport(config, "test-token-a", request)!;
const b = createExpansionSaveTransport(config, "test-token-b", request)!;
assert.equal(await a.read(), null); assert.equal(seenToken, "Bearer test-token-a");
assert.equal(seenUrl, "https://test.invalid/rest/v1/rpc/get_signal_breach_expansion_save");
await b.read(); assert.equal(seenToken, "Bearer test-token-b");
const save = emptyExpansionSave();
response = { status: "saved", current: { revision: 1, save } };
const result = await a.write(0, save); assert.equal(result.status, "saved");
assert.equal(seenToken, "Bearer test-token-a");
assert.deepEqual(seenBody, { p_base_revision: 0, p_payload: save });
assert.equal(seenUrl, "https://test.invalid/rest/v1/rpc/put_signal_breach_expansion_save");
async function rejects(run: () => Promise<unknown>) {
  let rejected = false; try { await run(); } catch { rejected = true; }
  assert.equal(rejected, true, "Malformed/error response must reject");
}
for (const value of [{ status: "invented", current: { revision: 1, save } }, { status: "saved", current: { revision: 0, save } }, { status: "saved", current: { revision: 1, save: {} } }]) { response = value; await rejects(() => a.write(0, save)); }
status = 403; await rejects(() => a.read());
status = 200; response = { revision: 1, save: { ...save, contentRevision: "other-game" } }; await rejects(() => a.read());
console.log("Cloud save transport: disabled/no-token mode makes no requests; captured auth, exact RPC body and response/error validation pass.");
