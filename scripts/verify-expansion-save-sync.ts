import assert from "./assert";
import { emptyExpansionSave, expansionSaveKey, parseExpansionSave, readLocalExpansionSave, writeLocalExpansionSave, type ExpansionSave } from "../src/ui/expansionSave";
import { ExpansionSaveSync, type CloudExpansionSave, type ExpansionSaveTransport } from "../src/leaderboard/expansionSaveSync";

const save = (levels: number[]): ExpansionSave => ({ ...emptyExpansionSave(), clearedLevels: levels });
let cloud: CloudExpansionSave | null = null;
let writes = 0;
const transport: ExpansionSaveTransport = {
  async read() { return cloud; },
  async write(base, next) {
    writes += 1;
    if (cloud && cloud.revision !== base) return { status: "conflict", current: cloud };
    cloud = { revision: base + 1, save: next };
    return { status: "saved", current: cloud };
  },
};
const a = new ExpansionSaveSync(transport, null, () => {});
a.update(save([1])); await a.sync();
assert.equal(a.snapshot().status, "synced"); assert.equal(writes, 1);
const b = new ExpansionSaveSync(transport, null, () => {});
await b.sync(); assert.deepEqual(b.snapshot().value.save.clearedLevels, [1]);
a.update(save([1, 2])); await a.sync();
b.update(save([1, 3])); await b.sync();
assert.equal(b.snapshot().status, "conflict"); assert.equal(writes, 2);
b.resolveConflict("cloud"); assert.deepEqual(b.snapshot().value.save.clearedLevels, [1, 2]);
b.update(save([1, 2, 3])); await b.sync();
a.update(save([1, 2, 4])); await a.sync();
a.resolveConflict("local"); await a.sync();
assert.equal(a.snapshot().status, "synced"); assert.deepEqual((await transport.read())?.save.clearedLevels, [1, 2, 4]);

// A failed acknowledgment must not duplicate a successful write on retry.
const timeout = new ExpansionSaveSync({ ...transport, async write(base, next) { await transport.write(base, next); throw new Error("lost response"); } }, a.snapshot().value, () => {});
timeout.update(save([1, 2, 4, 5])); await timeout.sync(); assert.equal(timeout.snapshot().status, "error");
const beforeRetry = writes; await timeout.sync(); assert.equal(timeout.snapshot().status, "synced"); assert.equal(writes, beforeRetry);

// Edits while uploading stay pending at the newly acknowledged revision.
let unblock!: () => void;
const wait = new Promise<void>((resolve) => { unblock = resolve; });
const concurrent = new ExpansionSaveSync({ ...transport, async write(base, next) { await wait; return transport.write(base, next); } }, timeout.snapshot().value, () => {});
concurrent.update(save([1, 2, 4, 5, 6])); const work = concurrent.sync();
await Promise.resolve(); await Promise.resolve();
concurrent.update(save([1, 2, 4, 5, 6, 7])); unblock(); await work;
assert.equal(concurrent.snapshot().status, "pending"); await concurrent.sync();
assert.equal(concurrent.snapshot().status, "synced"); assert.deepEqual((await transport.read())?.save.clearedLevels, [1, 2, 4, 5, 6, 7]);

// A request belonging to a signed-out user cannot update the new account's UI/cache.
let finishRead!: (value: CloudExpansionSave | null) => void;
let notifications = 0;
const stale = new ExpansionSaveSync({ ...transport, read: () => new Promise((resolve) => { finishRead = resolve; }) }, null, () => { notifications += 1; });
const staleWork = stale.sync(); stale.dispose(); const count = notifications;
finishRead(cloud); await staleWork; stale.update(save([25]));
assert.equal(notifications, count);
const rollback = new ExpansionSaveSync({ ...transport, async read() { return { revision: 1, save: save([]) }; } }, concurrent.snapshot().value, () => {});
await rollback.sync(); assert.equal(rollback.snapshot().status, "conflict");
assert.deepEqual(rollback.snapshot().value.save, concurrent.snapshot().value.save);
const reset = new ExpansionSaveSync({ ...transport, async read() { return null; } }, concurrent.snapshot().value, () => {});
await reset.sync(); assert.equal(reset.snapshot().status, "conflict");
reset.resolveConflict("cloud"); assert.equal(reset.snapshot().value.revision, 0);
assert.deepEqual(reset.snapshot().value.save.clearedLevels, []);
const offline = new ExpansionSaveSync(null, null, () => {});
offline.update(save([1])); await offline.sync(); assert.equal(offline.snapshot().status, "offline");
const broken = new ExpansionSaveSync({ ...transport, async read() { throw new Error("offline"); } }, null, () => {});
broken.update(save([1])); await broken.sync(); assert.equal(broken.snapshot().value.dirty, true);

const storage = { values: new Map<string, string>(), getItem(key: string) { return this.values.get(key) ?? null; }, setItem(key: string, value: string) { this.values.set(key, value); } };
const owner1 = "11111111-1111-1111-1111-111111111111";
const owner2 = "22222222-2222-2222-2222-222222222222";
assert.equal(writeLocalExpansionSave(storage, owner1, a.snapshot().value), true);
assert.equal(readLocalExpansionSave(storage, owner2), null);
assert.equal(readLocalExpansionSave(storage, "guest"), null);
assert.deepEqual(readLocalExpansionSave(storage, owner1), a.snapshot().value);
assert.equal(writeLocalExpansionSave(null, owner1, a.snapshot().value), false);
assert.equal(writeLocalExpansionSave({ getItem() { throw new Error(); }, setItem() { throw new Error(); } }, owner1, a.snapshot().value), false);
storage.values.set(expansionSaveKey(owner1), "{"); assert.equal(readLocalExpansionSave(storage, owner1), null);
for (const value of [null, [], {}, { ...save([]), contentRevision: "expansion-1-r3" }, { ...save([]), clearedLevels: [26] }, { ...save([]), checkpoint: {} }]) assert.throws(() => parseExpansionSave(value), /invalid|checkpoint/i);
assert.throws(() => expansionSaveKey("arbitrary-user"), /owner/i);
console.log("Save sync: cross-device restore, conflicts, lost acknowledgments, concurrent edits, account disposal, offline/storage errors and namespace isolation pass.");
