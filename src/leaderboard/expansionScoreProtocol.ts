import { getExpansionLevelContentHash } from "../data/campaigns/expansion/contentManifest";
import type { ExpansionReplayInput, ExpansionRecordedCommand, ExpansionHardwareKind } from "../sim/expansion/types";

export const EXPANSION_SCORE_REVISION = "expansion-1-r4";
export const MAX_EXPANSION_SCORE_BYTES = 524288;
export const EXPANSION_SCORE_UNITS = ["relay", "firewall", "turret", "scrubber", "overclock", "latencyTrap", "arcIce"] as const;
export class ExpansionScoreError extends Error {
  constructor(message: string) { super(message); this.name = "ExpansionScoreError"; }
}
export function expansionScoreCategory(level: number): string {
  if (!Number.isInteger(level) || level < 1 || level > 25) throw new ExpansionScoreError("Invalid expansion level.");
  return `expansion-v1:expansion-1-r4:level:${level}`;
}

/** Canonical wire proof: no client score, account identity, sector or inert fields. */
export function canonicalExpansionScoreReplay(raw: unknown): ExpansionReplayInput {
  if (!record(raw) || "sector" in raw || raw.schema !== 2 || raw.ruleset !== "expansion-v1" || raw.campaign !== "expansion-1") fail("Invalid expansion replay identity.");
  if (raw.contentRevision !== EXPANSION_SCORE_REVISION) fail("Expansion content is not published.");
  const level = raw.level;
  if (typeof level !== "number") fail("Invalid expansion level.");
  expansionScoreCategory(level);
  if (raw.contentHash !== getExpansionLevelContentHash(level, EXPANSION_SCORE_REVISION)) fail("Expansion content hash mismatch.");
  if (typeof raw.seed !== "string" || raw.seed.length < 1 || raw.seed.length > 200) fail("Invalid seed.");
  if (!Array.isArray(raw.commands) || raw.commands.length > 5000) fail("Invalid or oversized command log.");
  let previous = 0;
  const commands: ExpansionRecordedCommand[] = raw.commands.map((entry: unknown) => {
    if (!record(entry) || typeof entry.t !== "number" || !Number.isInteger(entry.t) || entry.t < previous || entry.t > 12000 || !record(entry.c)) fail("Invalid command tick or order.");
    previous = entry.t;
    const c = entry.c;
    if (c.type === "skipPrep") return { t: entry.t, c: { type: "skipPrep" } };
    if (c.type !== "placeUnit" && c.type !== "sellUnit") fail("Invalid command type.");
    if (!record(c.position) || !coordinate(c.position.x) || !coordinate(c.position.y)) fail("Invalid command position.");
    const position = { x: c.position.x, y: c.position.y };
    if (c.type === "sellUnit") return { t: entry.t, c: { type: "sellUnit", position } };
    if (!EXPANSION_SCORE_UNITS.some((unit) => unit === c.unit)) fail("Invalid expansion unit.");
    return { t: entry.t, c: { type: "placeUnit", position, unit: c.unit as ExpansionHardwareKind } };
  });
  return { schema: 2, ruleset: "expansion-v1", campaign: "expansion-1", contentRevision: EXPANSION_SCORE_REVISION,
    level, contentHash: raw.contentHash as string, seed: raw.seed, commands };
}
function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function coordinate(value: unknown): value is number { return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 8; }
function fail(message: string): never { throw new ExpansionScoreError(message); }
