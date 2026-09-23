import { createSavesClient, __setSupabaseForTests, type SavesClient, type ReconcileResult, type StoreResult, type SyncRecord, type CloudSave, type PromptAnswer } from "@gridwatch/account-kit";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { initAccount, saveOwner, onSaveOwnerChange } from "../src/leaderboard/account";
import { createExpansionCloudSave } from "../src/leaderboard/expansionCloudClient";
import { mayReconcileExpansionSave } from "../src/ui/expansionSavePolicy";
import { ExpansionAccountSave } from "../src/leaderboard/expansionAccountSave";
import { ExpansionLocalSave } from "../src/ui/expansionLocalSave";
import { emptyExpansionSave, expansionSaveKey } from "../src/ui/expansionSave";
import { encodeExpansionSave } from "../src/leaderboard/expansionSaveCodec";
import assert from "./assert";

const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
assert.equal(mayReconcileExpansionSave("active", false), false);
assert.equal(mayReconcileExpansionSave("active", true), false);
assert.equal(mayReconcileExpansionSave("prep", true), false);
assert.equal(mayReconcileExpansionSave("prep", false), true);
assert.equal(mayReconcileExpansionSave("lost", true), true);
assert.equal(mayReconcileExpansionSave("won", true), true);
function disk() { const data = new Map<string, string>(); return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } }; }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; }
function fixture() {
  const storage = disk();
  const local = new ExpansionLocalSave(storage, owner);
  let reconciliation = deferred<ReconcileResult>();
  let storing = deferred<StoreResult>();
  let stores = 0; let disposed = false; let adopted = 0;
  const client: SavesClient = {
    game: { gameSlug: "gridwatch-signal-breach", routeAlias: "breach", slots: ["expansion-1-r4"], schemaVersion: 1 },
    load: async () => ({ status: "none" }),
    reconcile: () => reconciliation.promise,
    store: () => { stores++; return storing.promise; },
    dispose: () => { disposed = true; },
  };
  const saves = new ExpansionAccountSave(local, owner, client, () => { adopted++; });
  return { storage, local, saves, get stores() { return stores; }, get disposed() { return disposed; }, get adopted() { return adopted; },
    resolve: (r: ReconcileResult) => reconciliation.resolve(r), stored: (r: StoreResult) => storing.resolve(r),
    next: () => { reconciliation = deferred(); storing = deferred(); } };
}
const cloud = { revision: 3, schemaVersion: 1, updatedAt: "2026-09-22T00:00:00Z", payload: encodeExpansionSave({ ...emptyExpansionSave(), clearedLevels: [1, 2] }) };

// Reconciliation must finish before any store. Owner caches never inherit guest data.
const f = fixture();
new ExpansionLocalSave(f.storage, "guest").clearLevel(9);
assert.deepEqual(f.saves.save.clearedLevels, []);
const loading = f.saves.retry();
f.saves.update({ ...f.saves.save, clearedLevels: [1] });
assert.equal(f.stores, 0);
f.resolve({ status: "use_cloud", save: cloud });
await loading;
assert.deepEqual(f.saves.save.clearedLevels, [1, 2]);
assert.equal(f.saves.cloudStatus, "synced");
assert.equal(f.adopted, 1);
assert.deepEqual(new ExpansionLocalSave(f.storage, "guest").save.clearedLevels, [9]);
assert.deepEqual(new ExpansionLocalSave(f.storage, other).save.clearedLevels, []);

// Only the exact acknowledged payload clears dirty. An earlier write cannot clear a newer edit.
f.next();
f.saves.update({ ...f.saves.save, clearedLevels: [1, 2, 3] });
await Promise.resolve();
const sent = encodeExpansionSave(f.saves.save);
f.saves.update({ ...f.saves.save, clearedLevels: [1, 2, 3, 4] });
f.saves.backgroundStored("expansion-1-r4", sent, 4, owner);
assert.equal(f.local.dirty, true);
f.saves.backgroundStored("expansion-1-r4", encodeExpansionSave(f.saves.save), 5, other);
assert.equal(f.local.dirty, true);
f.saves.backgroundStored("another-slot", encodeExpansionSave(f.saves.save), 5, owner);
assert.equal(f.local.dirty, true);
f.stored({ status: "stored", revision: 4, updatedAt: cloud.updatedAt });
await f.saves.settled();
assert.equal(f.local.dirty, true, "An older store must not acknowledge a newer payload");

const offline = fixture();
const failed = offline.saves.retry();
offline.resolve({ status: "error", error: { code: "network", message: "offline" } });
await failed;
offline.saves.clearLevel(1);
assert.equal(offline.stores, 0);
assert.equal(offline.local.dirty, true);
assert.equal(offline.saves.cloudStatus, "error");
offline.next();
const recovered = offline.saves.retry();
offline.resolve({ status: "uploaded", revision: 1 });
await recovered;
assert.equal(offline.local.dirty, false);
assert.equal(offline.saves.cloudStatus, "synced");

const stale = fixture();
const old = stale.saves.retry();
stale.saves.dispose();
stale.resolve({ status: "use_cloud", save: cloud });
await old;
stale.saves.backgroundStored("expansion-1-r4", cloud.payload, 3, owner);
assert.equal(stale.disposed, true);
assert.equal(stale.adopted, 0);
assert.equal(stale.storage.getItem(expansionSaveKey(owner)), null);

// v0.2.5 reports a discarded commit as error/message=discarded, NOT a new
// discriminant. Keep the released union exact and never treat it as confirmed.
const discarded = fixture();
discarded.local.clearLevel(1);
const dropped = discarded.saves.retry();
discarded.resolve({ status: "error", error: { code: "http", message: "discarded" } });
await dropped;
assert.equal(discarded.saves.cloudStatus, "error");
assert.equal(discarded.local.dirty, true);

const invalid = fixture();
const malformed = invalid.saves.retry();
invalid.resolve({ status: "use_cloud", save: { ...cloud, payload: { bad: true } } });
await malformed;
assert.equal(invalid.saves.cloudStatus, "blocked");
assert.equal(invalid.disposed, true);
invalid.saves.clearLevel(1);
await invalid.saves.retry();
assert.equal(invalid.stores, 0, "Failed cloud adoption must not reuse the kit's confirmed cloud revision to overwrite it");
assert.equal(invalid.saves.cloudStatus, "blocked");
assert.deepEqual(new ExpansionLocalSave(invalid.storage, owner).save.clearedLevels, [1]);

const fresh = fixture();
fresh.local.clearLevel(2);
const resetting = fresh.saves.retry();
fresh.resolve({ status: "fresh" });
await resetting;
assert.deepEqual(fresh.saves.save, emptyExpansionSave());
assert.equal(fresh.adopted, 1);
assert.equal(fresh.local.dirty, false);

const conflict = fixture();
new ExpansionLocalSave(conflict.storage, owner).clearLevel(6);
const raced = conflict.saves.retry();
conflict.resolve({ status: "use_cloud", save: cloud });
await raced;
assert.equal(conflict.saves.status, "conflict");
assert.deepEqual(new ExpansionLocalSave(conflict.storage, owner).save.clearedLevels, [6]);
assert.equal(conflict.adopted, 0);

// Exercise the RELEASED kit, with a two-device in-memory CAS server. No network,
// credentials, production saves, synthetic scores or handcrafted success adapter.
let server: CloudSave | null = null;
let online = true;
let requests = 0;
function device() {
  const storage = disk();
  const local = new ExpansionLocalSave(storage, owner);
  let record: SyncRecord | null = null;
  let answer: PromptAnswer = "primary";
  let prompts = 0;
  let adoptions = 0;
  const kit = createSavesClient({
    game: { gameSlug: "gridwatch-signal-breach", routeAlias: "breach", slots: ["expansion-1-r4"], schemaVersion: 1 },
    getSession: async () => ({ access_token: "isolated-test-token", user: { id: owner } }),
    state: { readRecord: () => record, writeRecord: (_u, _s, r) => { record = r; }, readOwner: () => owner, writeOwner: () => {}, deviceId: () => other },
    transport: {
      load: async (slot) => !online ? { kind: "network", message: "offline fixture" }
        : { kind: "ok", status: server ? 200 : 404, body: server ? { ...server, slot } : {}, retryAfterMs: null },
      store: async (_slot, body) => {
        requests++;
        if (!online) return { kind: "network", message: "offline fixture" };
        if (body.baseRevision !== (server?.revision ?? 0)) return { kind: "ok", status: 409, body: { cloud: { revision: server?.revision ?? 0 } }, retryAfterMs: null };
        server = { revision: body.baseRevision + 1, schemaVersion: 1, payload: body.payload, updatedAt: cloud.updatedAt };
        return { kind: "ok", status: 200, body: { revision: server.revision, updatedAt: server.updatedAt }, retryAfterMs: null };
      },
    },
    prompt: { ask: async () => { prompts++; return answer; }, dispose: () => {} },
    sleep: async () => {}, debounceMs: 0, windowRef: null,
  });
  const adapter = new ExpansionAccountSave(local, owner, kit, () => { adoptions++; });
  return { adapter, local, storage, choose: (a: PromptAnswer) => { answer = a; }, get prompts() { return prompts; }, get adoptions() { return adoptions; } };
}
const desktop = device();
await desktop.adapter.retry();
desktop.adapter.clearLevel(1);
await desktop.adapter.settled();
assert.equal(desktop.adapter.cloudStatus, "synced");
assert.equal(requests, 1);
const phone = device();
await phone.adapter.retry();
assert.deepEqual(phone.adapter.save.clearedLevels, [1]);
assert.equal(phone.adoptions, 1);
online = false;
phone.adapter.clearLevel(2);
await phone.adapter.settled();
assert.equal(phone.local.dirty, true);
online = true;
desktop.adapter.clearLevel(3);
await desktop.adapter.settled();
phone.choose("primary"); // Explicitly keep the cloud copy from desktop.
await phone.adapter.retry();
assert.equal(phone.prompts, 1);
assert.deepEqual(phone.adapter.save.clearedLevels, [1, 3]);
assert.equal(phone.local.dirty, false);
desktop.adapter.clearLevel(4);
await desktop.adapter.settled();
phone.choose("secondary"); // A 409 during store must retain the chosen local copy.
phone.adapter.clearLevel(5);
await phone.adapter.settled();
assert.equal(phone.prompts, 2);
assert.deepEqual(phone.adapter.save.clearedLevels, [1, 3, 5]);
await desktop.adapter.retry();
assert.deepEqual(desktop.adapter.save.clearedLevels, [1, 3, 5]);
desktop.adapter.dispose(); phone.adapter.dispose();

// Production factory fencing, with a fake Supabase client and a fetch tripwire.
// The account callback fires synchronously while the old session read is held.
const fakeSession = (id: string) => ({ user: { id }, access_token: "isolated-test-token" }) as Session;
let session: Session | null = fakeSession(owner);
let authChanged: (event: string, value: Session | null) => void = () => {};
let heldSession: ReturnType<typeof deferred<{ data: { session: Session | null }; error: null }>> | null = null;
__setSupabaseForTests({
  auth: {
    getSession: () => heldSession?.promise ?? Promise.resolve({ data: { session }, error: null }),
    onAuthStateChange: (cb: typeof authChanged) => { authChanged = cb; return { data: { subscription: { unsubscribe() {} } } }; },
  },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { handle: "test" }, error: null }) }) }) }),
} as unknown as SupabaseClient);
await initAccount();
assert.equal(saveOwner(), owner);
const originalFetch = globalThis.fetch;
let factoryRequests = 0;
globalThis.fetch = async () => { factoryRequests++; throw new Error("No real request allowed in this test"); };
const accountLocal = new ExpansionLocalSave(disk(), owner);
accountLocal.clearLevel(1);
const owned = createExpansionCloudSave(accountLocal, owner, () => { throw new Error("Stale adoption"); }, { ask: async () => "primary", dispose: () => {} });
const unsubscribe = onSaveOwnerChange(() => { if (saveOwner() !== owner) owned.dispose(); });
heldSession = deferred();
const pendingSession = heldSession;
const ownerRead = owned.retry();
await Promise.resolve(); await Promise.resolve();
session = fakeSession(other);
authChanged("SIGNED_IN", session);
heldSession = null;
pendingSession.resolve({ data: { session: fakeSession(owner) }, error: null });
await ownerRead;
assert.equal(factoryRequests, 0, "An old account's payload must not reach transport after an account switch");
assert.deepEqual(accountLocal.save.clearedLevels, [1]);
assert.equal(accountLocal.dirty, true);
unsubscribe();
globalThis.fetch = originalFetch;

console.log("Account save adapter: reconciliation gate, guest/account isolation, offline recovery, stale completion, payload-specific acknowledgments, invalid cloud data, fresh choice and stale-tab protection passed.");
console.log("Released kit integration: two devices converge; offline edits, explicit use-cloud and keep-local CAS conflicts passed against an isolated in-memory server.");
console.log("Production factory: switching accounts during a delayed session read disposes the old client before any transport request.");
