import { getExpansionLevelContentHash } from "../../data/campaigns/expansion/contentManifest";
import { isExpansionHardwareKind } from "./capabilities";
import { applyExpansionCommand } from "./commands";
import { calculateExpansionScore } from "./scoring";
import { createExpansionGameState } from "./state";
import { tickExpansion } from "./tick";
import { EXPANSION_CAMPAIGN_ID, EXPANSION_CONTENT_REVISION, EXPANSION_RULESET_ID, type ExpansionRecordedCommand, type ExpansionReplayInput, type ExpansionReplayResult, type ExpansionSimCommand } from "./types";

export const MAX_EXPANSION_REPLAY_TICKS = 12000;
export const MAX_EXPANSION_REPLAY_COMMANDS = 5000;

export class ExpansionReplayError extends Error {
  constructor(message: string) { super(message); this.name = "ExpansionReplayError"; }
}

export function replayExpansionRun(input: ExpansionReplayInput): ExpansionReplayResult {
  if (input.schema !== 2 || input.ruleset !== EXPANSION_RULESET_ID || input.campaign !== EXPANSION_CAMPAIGN_ID || input.contentRevision !== EXPANSION_CONTENT_REVISION) throw new ExpansionReplayError("Expansion replay identity mismatch.");
  if (typeof input.seed !== "string") throw new ExpansionReplayError("Expansion replay seed must be a string.");
  let expectedContentHash: string;
  try {
    expectedContentHash = getExpansionLevelContentHash(input.level);
  } catch {
    throw new ExpansionReplayError("Expansion replay level is not authored.");
  }
  if (input.contentHash !== expectedContentHash) throw new ExpansionReplayError("Expansion content hash mismatch.");
  const commands = validateExpansionCommands(input.commands as unknown);
  let state = createExpansionGameState({ levelId: input.level, contentHash: input.contentHash, seed: input.seed });
  let index = 0;
  let ticks = 0;
  while (state.phase !== "won" && state.phase !== "lost") {
    while (index < commands.length && commands[index].t === state.tickCount) {
      state = applyExpansionCommand(state, commands[index].c);
      index += 1;
    }
    if (index < commands.length && commands[index].t < state.tickCount) throw new ExpansionReplayError("Command log is out of order.");
    state = tickExpansion(state);
    ticks += 1;
    if (ticks > MAX_EXPANSION_REPLAY_TICKS) throw new ExpansionReplayError("Expansion run exceeded the maximum tick budget.");
  }
  if (index < commands.length) throw new ExpansionReplayError("Command log contains commands after the run ended.");
  return { state, score: calculateExpansionScore(state) };
}

function validateExpansionCommands(value: unknown): readonly ExpansionRecordedCommand[] {
  if (!Array.isArray(value)) throw new ExpansionReplayError("Expansion command log must be an array.");
  if (value.length > MAX_EXPANSION_REPLAY_COMMANDS) throw new ExpansionReplayError("Expansion command log exceeds the maximum command count.");
  return value.map((entry) => validateExpansionRecordedCommand(entry));
}

function validateExpansionRecordedCommand(value: unknown): ExpansionRecordedCommand {
  if (!isRecord(value) || !Number.isInteger(value.t) || (value.t as number) < 0 || (value.t as number) > MAX_EXPANSION_REPLAY_TICKS) {
    throw new ExpansionReplayError("Expansion command has an invalid tick.");
  }
  return { t: value.t as number, c: validateExpansionCommand(value.c) };
}

function validateExpansionCommand(value: unknown): ExpansionSimCommand {
  if (!isRecord(value) || typeof value.type !== "string") throw new ExpansionReplayError("Expansion command is malformed.");
  if (value.type === "skipPrep") return { type: "skipPrep" };
  if (value.type === "sellUnit") return { type: "sellUnit", position: validatePosition(value.position) };
  if (value.type === "placeUnit") {
    if (typeof value.unit !== "string" || !isExpansionHardwareKind(value.unit)) throw new ExpansionReplayError("Expansion placement command has an invalid unit.");
    return { type: "placeUnit", position: validatePosition(value.position), unit: value.unit };
  }
  throw new ExpansionReplayError("Expansion command type is unknown.");
}

function validatePosition(value: unknown): Readonly<{ x: number; y: number }> {
  if (!isRecord(value) || !Number.isInteger(value.x) || !Number.isInteger(value.y)) throw new ExpansionReplayError("Expansion command position is invalid.");
  return { x: value.x as number, y: value.y as number };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
