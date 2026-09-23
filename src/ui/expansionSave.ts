import { restoreExpansionCheckpoint, type ExpansionCheckpoint } from "../sim/expansion/checkpoint";
import type { ProgressStorage } from "./progress";

export const EXPANSION_SAVE_SLOT = "expansion-1-r4";
export const MAX_EXPANSION_SAVE_BYTES = 96000;
export type ExpansionSave = Readonly<{
  schema: 1;
  contentRevision: "expansion-1-r4";
  clearedLevels: readonly number[];
  settings: Readonly<{ lowEffects: boolean }>;
  checkpoint: ExpansionCheckpoint | null;
}>;
export type LocalExpansionSave = Readonly<{ revision: number; dirty: boolean; save: ExpansionSave }>;
// Only canonical, deeply frozen outputs enter these sets. Unknown/deserialized
// objects always cross the complete validation boundary; mutable input is never cached.
const validatedSaves = new WeakSet<object>();
const validatedCheckpoints = new WeakSet<object>();

export function emptyExpansionSave(): ExpansionSave {
  return { schema: 1, contentRevision: "expansion-1-r4", clearedLevels: [], settings: { lowEffects: false }, checkpoint: null };
}

/** Return a canonical copy. Cloud progress is unranked; scores require a full replay. */
export function parseExpansionSave(value: unknown): ExpansionSave {
  if (record(value) && validatedSaves.has(value)) return value as ExpansionSave;
  if (new TextEncoder().encode(JSON.stringify(value) ?? "").length > MAX_EXPANSION_SAVE_BYTES) throw new Error("Expansion save exceeds the size limit.");
  if (!record(value) || value.schema !== 1 || value.contentRevision !== EXPANSION_SAVE_SLOT || !Array.isArray(value.clearedLevels) || value.clearedLevels.length > 25 || !record(value.settings) || typeof value.settings.lowEffects !== "boolean") throw new Error("Invalid expansion save.");
  if (!value.clearedLevels.every((id) => typeof id === "number" && Number.isInteger(id) && id >= 1 && id <= 25)) throw new Error("Invalid saved level.");
  const checkpoint = value.checkpoint === null ? null
    : record(value.checkpoint) && validatedCheckpoints.has(value.checkpoint)
      ? value.checkpoint as ExpansionCheckpoint
      : freeze(restoreExpansionCheckpoint(value.checkpoint).checkpoint);
  if (checkpoint) validatedCheckpoints.add(checkpoint);
  const save: ExpansionSave = freeze({ schema: 1, contentRevision: EXPANSION_SAVE_SLOT, clearedLevels: [...new Set(value.clearedLevels as number[])].sort((a, b) => a - b), settings: { lowEffects: value.settings.lowEffects }, checkpoint });
  validatedSaves.add(save);
  return save;
}

/** Each account has its own cache. Guest saves are never silently attached to an account. */
export function expansionSaveKey(owner: string): string {
  if (owner !== "guest" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner)) throw new Error("Invalid save owner.");
  return `gridwatch.signal-breach.${EXPANSION_SAVE_SLOT}.save.v1.${owner.toLowerCase()}`;
}

export function readLocalExpansionSave(storage: ProgressStorage | null, owner: string): LocalExpansionSave | null {
  try {
    const raw = storage?.getItem(expansionSaveKey(owner));
    if (!raw || raw.length > MAX_EXPANSION_SAVE_BYTES + 1024) return null;
    const value: unknown = JSON.parse(raw);
    if (!record(value) || !Number.isSafeInteger(value.revision) || (value.revision as number) < 0 || typeof value.dirty !== "boolean") return null;
    return { revision: value.revision as number, dirty: value.dirty, save: parseExpansionSave(value.save) };
  } catch { return null; }
}

/** False must be surfaced to the player: an in-memory checkpoint is not a durable save. */
export function writeLocalExpansionSave(storage: ProgressStorage | null, owner: string, value: LocalExpansionSave): boolean {
  try {
    if (!storage || !Number.isSafeInteger(value.revision) || value.revision < 0) return false;
    storage.setItem(expansionSaveKey(owner), JSON.stringify({ ...value, save: parseExpansionSave(value.save) }));
    return true;
  } catch { return false; }
}

function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function freeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}
