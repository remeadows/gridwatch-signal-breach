import { MAX_BODY_BYTES, hasLoneSurrogate, validateAgainst, type SavePayload } from "@gridwatch/account-kit/saves-schema";
import { MAX_EXPANSION_REPLAY_COMMANDS, MAX_EXPANSION_REPLAY_TICKS, validateExpansionCommands } from "../sim/expansion/replay";
import { EXPANSION_CAMPAIGN_ID, EXPANSION_RULESET_ID, type ExpansionHardwareKind, type ExpansionRecordedCommand } from "../sim/expansion/types";
import { EXPANSION_SAVE_SLOT, parseExpansionSave, type ExpansionSave } from "../ui/expansionSave";
import { BREACH_EXPANSION_V1 } from "./expansionSaveSchema";

// Immutable wire opcode assignment. Never derive this from the evolving UI/tile order.
const UNITS: readonly ExpansionHardwareKind[] = Object.freeze(["relay", "firewall", "turret", "scrubber", "overclock", "latencyTrap", "arcIce"]);
const STRIDE = 1024;
const CELL_COUNT = 64;

export type ExpansionSavePayload = SavePayload & {
  contentRevision: "expansion-1-r4";
  clearedLevels: number[];
  settings: { lowEffects: boolean };
  checkpoint?: {
    completedWaves: number; tick: number; level: number; contentHash: string;
    seed: string; commands: number[];
  };
};

/** Upper bound for the complete kit StoreRequest, including both UUIDs and revision.
 * Pure sizing only: this does not create a request, account identity or network call. */
export function expansionSaveRequestBytes(payload: SavePayload): number {
  return new TextEncoder().encode(JSON.stringify({ schemaVersion: 1, baseRevision: Number.MAX_SAFE_INTEGER,
    payload, deviceId: "00000000-0000-0000-0000-000000000000", idempotencyKey: "00000000-0000-0000-0000-000000000000" })).length;
}

/** Compact only validated local saves. Unsupported legacy no-op coordinates throw:
 * callers must keep the local save and display an unsynced error, never drop history. */
export function encodeExpansionSave(value: unknown): ExpansionSavePayload {
  const save = parseExpansionSave(value);
  const payload: ExpansionSavePayload = { contentRevision: EXPANSION_SAVE_SLOT,
    clearedLevels: [...save.clearedLevels], settings: { ...save.settings } };
  if (save.checkpoint) {
    const { replay, tick, completedWaves } = save.checkpoint;
    payload.checkpoint = { completedWaves, tick, level: replay.level, contentHash: replay.contentHash,
      seed: replay.seed, commands: packExpansionCommands(replay.commands) };
  }
  validateWire(payload);
  return payload;
}

/** Cloud data is untrusted. Structural checks precede unpacking; deterministic
 * replay and the existing local size/identity checks precede adoption. */
export function decodeExpansionSave(value: unknown): ExpansionSave {
  validateWire(value);
  const checkpoint = value.checkpoint;
  return parseExpansionSave({ schema: 1, contentRevision: EXPANSION_SAVE_SLOT,
    clearedLevels: value.clearedLevels, settings: value.settings,
    checkpoint: checkpoint ? { schema: 1, completedWaves: checkpoint.completedWaves, tick: checkpoint.tick,
      replay: { schema: 2, campaign: EXPANSION_CAMPAIGN_ID, ruleset: EXPANSION_RULESET_ID,
        contentRevision: EXPANSION_SAVE_SLOT, contentHash: checkpoint.contentHash, level: checkpoint.level,
        seed: checkpoint.seed, commands: unpackExpansionCommands(checkpoint.commands) } } : null,
  });
}

function validateWire(value: unknown): asserts value is ExpansionSavePayload {
  const result = validateAgainst(BREACH_EXPANSION_V1, value);
  if (!result.ok) throw new Error(`Invalid expansion cloud save: ${result.detail}`);
  const payload = value as ExpansionSavePayload;
  if (payload.checkpoint && hasLoneSurrogate(payload.checkpoint.seed)) throw new Error("Invalid expansion cloud save: seed is not well-formed Unicode.");
  if (expansionSaveRequestBytes(payload) > MAX_BODY_BYTES) throw new Error("Expansion cloud save exceeds the request size limit.");
}

/** Command-level helpers are exported for exhaustive wire-contract tests. */
export function packExpansionCommands(value: readonly ExpansionRecordedCommand[]): number[] {
  const commands = validateExpansionCommands(value, EXPANSION_SAVE_SLOT);
  let previousTick = -1;
  return Array.from(commands, (entry) => {
    if (!entry) throw new Error("Invalid sparse cloud command log.");
    const { t, c } = entry;
    if (t < previousTick || t >= MAX_EXPANSION_REPLAY_TICKS) throw new Error("Cloud command tick is out of range or order.");
    previousTick = t;
    if (c.type === "skipPrep") return t * STRIDE;
    const { x, y } = c.position;
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > 7 || y < 0 || y > 7) throw new Error("Cloud command coordinates cannot be encoded; local history preserved.");
    const unitIndex = c.type === "placeUnit" ? UNITS.indexOf(c.unit) : -1;
    if (c.type === "placeUnit" && unitIndex < 0) throw new Error("Cloud command unit is not part of wire schema v1.");
    const opcode = c.type === "sellUnit" ? 1 : 2 + unitIndex;
    return t * STRIDE + opcode * CELL_COUNT + y * 8 + x;
  });
}

export function unpackExpansionCommands(value: readonly number[]): ExpansionRecordedCommand[] {
  if (!Array.isArray(value) || value.length > MAX_EXPANSION_REPLAY_COMMANDS) throw new Error("Invalid cloud command count.");
  const commands: ExpansionRecordedCommand[] = [];
  let previousTick = -1;
  // for..of intentionally visits sparse entries, which must not bypass validation.
  for (const packed of value) {
    if (!Number.isSafeInteger(packed) || packed < 0) throw new Error("Invalid packed cloud command.");
    const t = Math.floor(packed / STRIDE);
    const opcode = Math.floor((packed % STRIDE) / CELL_COUNT);
    const cell = packed % CELL_COUNT;
    if (t < previousTick || t >= MAX_EXPANSION_REPLAY_TICKS || opcode > 8 || (opcode === 0 && cell !== 0)) throw new Error("Invalid packed cloud command tick or opcode.");
    previousTick = t;
    const position = { x: cell % 8, y: Math.floor(cell / 8) };
    commands.push({ t, c: opcode === 0 ? { type: "skipPrep" } : opcode === 1 ? { type: "sellUnit", position }
      : { type: "placeUnit", position, unit: UNITS[opcode - 2]! } });
  }
  return commands;
}
