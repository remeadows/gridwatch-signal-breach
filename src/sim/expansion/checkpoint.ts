import { getExpansionLevelContentHash } from "../../data/campaigns/expansion/contentManifest";
import { applyExpansionCommand } from "./commands";
import { ExpansionReplayError, MAX_EXPANSION_REPLAY_TICKS, validateExpansionCommands } from "./replay";
import { createExpansionGameState } from "./state";
import { tickExpansion } from "./tick";
import { EXPANSION_CAMPAIGN_ID, EXPANSION_RULESET_ID, type ExpansionGameState, type ExpansionRecordedCommand, type ExpansionReplayInput } from "./types";

/** Replay prefix, not a trusted state snapshot. No score or auth identity is saved. */
export type ExpansionCheckpoint = Readonly<{
  schema: 1;
  completedWaves: number;
  tick: number;
  replay: ExpansionReplayInput;
}>;

export function createExpansionCheckpoint(state: ExpansionGameState, seed: string, commands: readonly ExpansionRecordedCommand[]): ExpansionCheckpoint {
  if (state.phase !== "prep" || state.waveIndex < 1 || state.waveIndex > 4 || state.waveTick !== 0) {
    throw new ExpansionReplayError("Checkpoint requires a completed-wave boundary.");
  }
  return restoreExpansionCheckpoint({
    schema: 1, completedWaves: state.waveIndex, tick: state.tickCount,
    replay: { schema: 2, campaign: EXPANSION_CAMPAIGN_ID, ruleset: EXPANSION_RULESET_ID,
      contentRevision: state.config.contentRevision, contentHash: state.config.contentHash,
      level: state.config.levelId, seed, commands },
  }).checkpoint;
}

export function restoreExpansionCheckpoint(value: unknown): Readonly<{ checkpoint: ExpansionCheckpoint; state: ExpansionGameState }> {
  if (!record(value) || value.schema !== 1 || !integer(value.tick, 1, MAX_EXPANSION_REPLAY_TICKS) || !integer(value.completedWaves, 1, 4)) {
    throw new ExpansionReplayError("Invalid expansion checkpoint.");
  }
  const input = value.replay;
  if (!record(input) || "sector" in input || input.schema !== 2 || input.campaign !== EXPANSION_CAMPAIGN_ID || input.ruleset !== EXPANSION_RULESET_ID || input.contentRevision !== "expansion-1-r4" || !integer(input.level, 1, 25)) {
    throw new ExpansionReplayError("Checkpoint replay identity mismatch.");
  }
  if (typeof input.seed !== "string" || input.seed.length < 1 || input.seed.length > 200) throw new ExpansionReplayError("Invalid checkpoint seed.");
  if (input.contentHash !== getExpansionLevelContentHash(input.level, input.contentRevision)) throw new ExpansionReplayError("Checkpoint content hash mismatch.");
  const commands = validateExpansionCommands(input.commands, input.contentRevision);
  let previousTick = -1;
  for (const command of commands) {
    if (command.t < previousTick || command.t >= value.tick) throw new ExpansionReplayError("Checkpoint commands exceed the boundary or are out of order.");
    previousTick = command.t;
  }
  const replay: ExpansionReplayInput = {
    schema: 2, campaign: EXPANSION_CAMPAIGN_ID, ruleset: EXPANSION_RULESET_ID,
    contentRevision: input.contentRevision, contentHash: input.contentHash as string,
    level: input.level, seed: input.seed, commands,
  };
  let state = createExpansionGameState({ levelId: replay.level, contentRevision: replay.contentRevision, contentHash: replay.contentHash, seed: replay.seed });
  let cursor = 0;
  while (state.tickCount < value.tick) {
    if (state.phase === "won" || state.phase === "lost") throw new ExpansionReplayError("Checkpoint replay ended before boundary.");
    while (cursor < commands.length && commands[cursor]!.t === state.tickCount) {
      state = applyExpansionCommand(state, commands[cursor++]!.c);
    }
    state = tickExpansion(state);
  }
  if (cursor !== commands.length || state.phase !== "prep" || state.waveIndex !== value.completedWaves || state.waveTick !== 0) {
    throw new ExpansionReplayError("Checkpoint is not the claimed completed-wave boundary.");
  }
  return { checkpoint: { schema: 1, completedWaves: value.completedWaves, tick: value.tick, replay }, state };
}

function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function integer(value: unknown, min: number, max: number): value is number { return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max; }
