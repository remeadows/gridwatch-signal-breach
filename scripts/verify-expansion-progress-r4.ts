import assert from "./assert";
import { EXPANSION_R4_PROGRESS_KEY, loadExpansionR4Progress, markExpansionR4LevelCleared } from "../src/ui/expansionProgressR4";
import { PROGRESS_STORAGE_KEY } from "../src/ui/progress";
import { isExpansionChapterAvailable } from "../src/data/campaigns/expansion";

class MemoryStorage {
  values = new Map<string, string>();
  writes: string[] = [];
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.writes.push(key); this.values.set(key, value); }
}
function legacy(highest: number, cleared: unknown[]) {
  return JSON.stringify({ schema: 2, campaigns: { "signal-breach": { highestUnlockedSector: 3, clearedSectors: [1, 2, 3] }, "expansion-1": { highestUnlockedLevel: highest, clearedLevels: cleared } } });
}
for (const [oldHighest, nextHighest] of [[1, 1], [5, 5], [6, 9], [10, 13], [11, 17], [15, 21], [16, 22], [30, 22]]) {
  const storage = new MemoryStorage();
  const previous = legacy(oldHighest!, []);
  storage.values.set(PROGRESS_STORAGE_KEY, previous);
  const migrated = loadExpansionR4Progress(storage);
  assert.equal(migrated.highestUnlockedLevel, nextHighest);
  assert.equal(storage.getItem(PROGRESS_STORAGE_KEY), previous);
  assert.deepEqual(storage.writes, [EXPANSION_R4_PROGRESS_KEY]);
  storage.values.set(PROGRESS_STORAGE_KEY, legacy(30, [1, 2, 3]));
  assert.deepEqual(loadExpansionR4Progress(storage), migrated, "Migration must run only once");
}
const storage = new MemoryStorage();
const inconsistent = new MemoryStorage();
inconsistent.values.set(PROGRESS_STORAGE_KEY, legacy(1, [5, 10]));
assert.equal(loadExpansionR4Progress(inconsistent).highestUnlockedLevel, 17, "Recover access implied by historical clears before remapping");
storage.values.set(PROGRESS_STORAGE_KEY, legacy(16, Array.from({ length: 15 }, (_, index) => index + 1)));
const migrated = loadExpansionR4Progress(storage);
assert.deepEqual(migrated.clearedLevels, [1, 2, 3, 4, 5, 9, 10, 11, 12, 13, 17, 18, 19, 20, 21]);
assert.equal(migrated.highestUnlockedLevel, 22);
const original = storage.getItem(PROGRESS_STORAGE_KEY);
let progress = loadExpansionR4Progress(null);
for (let level = 1; level <= 25; level += 1) {
  progress = markExpansionR4LevelCleared(progress, level, storage);
  assert.equal(progress.highestUnlockedLevel, Math.min(25, level + 1));
  assert.deepEqual(loadExpansionR4Progress(storage), progress);
}
assert.equal(progress.clearedLevels.length, 25);
assert.equal(isExpansionChapterAvailable(2, 8), false);
assert.equal(isExpansionChapterAvailable(2, 9), true);
assert.equal(isExpansionChapterAvailable(3, 16), false);
assert.equal(isExpansionChapterAvailable(3, 17), true);
assert.equal(isExpansionChapterAvailable(4, 25), false);
assert.equal(storage.getItem(PROGRESS_STORAGE_KEY), original);
const writes = storage.writes.length;
for (const level of [0, -1, 1.5, 26, Infinity, NaN]) assert.equal(markExpansionR4LevelCleared(progress, level, storage), progress);
assert.equal(storage.writes.length, writes);
for (const raw of ["{", "null", "[]", JSON.stringify({ schema: 9 }), JSON.stringify({ schema: 2, campaigns: [] })]) {
  const broken = new MemoryStorage();
  broken.values.set(PROGRESS_STORAGE_KEY, raw);
  broken.values.set(EXPANSION_R4_PROGRESS_KEY, raw);
  assert.equal(loadExpansionR4Progress(broken).highestUnlockedLevel, 1);
}
const dirty = new MemoryStorage();
dirty.values.set(EXPANSION_R4_PROGRESS_KEY, JSON.stringify({ schema: 1, contentRevision: "expansion-1-r4", highestUnlockedLevel: 3, clearedLevels: [25, 25, 26, 0, "4", 8] }));
assert.deepEqual(loadExpansionR4Progress(dirty).clearedLevels, [8, 25]);
assert.equal(loadExpansionR4Progress(dirty).highestUnlockedLevel, 25);
const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
assert.equal(loadExpansionR4Progress(blocked).highestUnlockedLevel, 1);
assert.equal(markExpansionR4LevelCleared(loadExpansionR4Progress(blocked), 1, blocked).highestUnlockedLevel, 2);
console.log("r4 progress: migration, isolation, 8/16 boundaries, completion, reload and blocked storage pass.");
