import { PROGRESS_STORAGE_KEY, type ProgressStorage } from "./progress";
import { readLocalExpansionSave } from "./expansionSave";

export const EXPANSION_R4_PROGRESS_KEY = "gridwatch.expansion-1.r4.progress.v1";
export const EXPANSION_R4_LEVEL_COUNT = 25;
const RETAINED_AUTHORED_LEVEL_COUNT = 15;
const RETAINED_ACCESS_LIMIT = 30;
export type ExpansionR4Progress = Readonly<{
  schema: 1;
  contentRevision: "expansion-1-r4";
  highestUnlockedLevel: number;
  clearedLevels: readonly number[];
}>;

function makeProgress(highest: number, cleared: readonly number[]): ExpansionR4Progress {
  const clearedLevels = [...new Set(cleared)].sort((a, b) => a - b);
  return {
    schema: 1, contentRevision: "expansion-1-r4",
    highestUnlockedLevel: Math.min(EXPANSION_R4_LEVEL_COUNT, Math.max(1, highest, ...clearedLevels.map((id) => id + 1))),
    clearedLevels,
  };
}

/** Guest navigation reads canonical clears without dual-writing the legacy key. */
export function loadPlayableExpansionR4Progress(storage: ProgressStorage | null = browserStorage()): ExpansionR4Progress {
  const retained = loadExpansionR4Progress(storage);
  const local = readLocalExpansionSave(storage, "guest");
  return makeProgress(retained.highestUnlockedLevel, [...retained.clearedLevels, ...(local?.save.clearedLevels ?? [])]);
}

/** Copy historical earned access once. Never call the legacy writer or mutate old keys. */
export function loadExpansionR4Progress(storage: ProgressStorage | null = browserStorage()): ExpansionR4Progress {
  if (!storage) return makeProgress(1, []);
  const current = parse(read(storage, EXPANSION_R4_PROGRESS_KEY));
  if (current?.schema === 1 && current.contentRevision === "expansion-1-r4") {
    return makeProgress(validId(current.highestUnlockedLevel, EXPANSION_R4_LEVEL_COUNT) ? current.highestUnlockedLevel : 1, ids(current.clearedLevels, EXPANSION_R4_LEVEL_COUNT));
  }
  const root = parse(read(storage, PROGRESS_STORAGE_KEY));
  const campaigns = root?.schema === 2 && record(root.campaigns) ? root.campaigns : null;
  const old = campaigns && record(campaigns["expansion-1"]) ? campaigns["expansion-1"] : null;
  const oldCleared = ids(old?.clearedLevels, RETAINED_AUTHORED_LEVEL_COUNT);
  const cleared = oldCleared.map(mapRetainedLevel);
  const oldHighest = Math.max(validId(old?.highestUnlockedLevel, RETAINED_ACCESS_LIMIT) ? old.highestUnlockedLevel : 1, ...oldCleared.map((id) => id + 1));
  const highest = mapRetainedAccess(oldHighest);
  const migrated = makeProgress(highest, cleared);
  save(storage, migrated);
  return migrated;
}

export function markExpansionR4LevelCleared(
  current: ExpansionR4Progress, levelId: number, storage: ProgressStorage | null = browserStorage(),
): ExpansionR4Progress {
  if (!validId(levelId, EXPANSION_R4_LEVEL_COUNT)) return current;
  const next = makeProgress(current.highestUnlockedLevel, [...current.clearedLevels, levelId]);
  if (storage) save(storage, next);
  return next;
}

function mapRetainedLevel(id: number): number { return id <= 5 ? id : id <= 10 ? id + 3 : id + 6; }
function mapRetainedAccess(id: number): number { return id > RETAINED_AUTHORED_LEVEL_COUNT ? 22 : mapRetainedLevel(id); }
function validId(value: unknown, max: number): value is number { return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= max; }
function ids(value: unknown, max: number): number[] { return Array.isArray(value) ? value.filter((id): id is number => validId(id, max)) : []; }
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function parse(value: string | null): Record<string, unknown> | null {
  try { const parsed: unknown = JSON.parse(value ?? "null"); return record(parsed) ? parsed : null; } catch { return null; }
}
function read(storage: ProgressStorage, key: string): string | null { try { return storage.getItem(key); } catch { return null; } }
function save(storage: ProgressStorage, value: ExpansionR4Progress): void { try { storage.setItem(EXPANSION_R4_PROGRESS_KEY, JSON.stringify(value)); } catch { /* Optional persistence. */ } }
function browserStorage(): ProgressStorage | null { try { return window.localStorage; } catch { return null; } }
