import { getExpansionLevelContentHash } from "../data/campaigns/expansion/contentManifest";
import { applyExpansionCommand, createExpansionGameState, tickExpansion, EXPANSION_CAMPAIGN_ID, EXPANSION_RULESET_ID, type ExpansionGameState, type ExpansionRecordedCommand, type ExpansionReplayInput, type ExpansionSimCommand } from "../sim/expansion";
import { createExpansionCheckpoint, restoreExpansionCheckpoint, type ExpansionCheckpoint } from "../sim/expansion/checkpoint";
import { MAX_EXPANSION_REPLAY_COMMANDS } from "../sim/expansion/replay";

/** UI-owned run lifecycle; simulation stays pure. Resume retains the entire replay prefix. */
export class ExpansionRunSession {
  private current: ExpansionGameState;
  private readonly seed: string;
  private readonly commands: ExpansionRecordedCommand[];
  private recordingComplete = true;

  constructor(levelId: number, seed: string, checkpoint?: ExpansionCheckpoint) {
    if (checkpoint) {
      const restored = restoreExpansionCheckpoint(checkpoint);
      if (restored.state.config.levelId !== levelId) throw new Error("Checkpoint belongs to a different level.");
      this.current = restored.state;
      this.seed = restored.checkpoint.replay.seed;
      this.commands = structuredClone(restored.checkpoint.replay.commands) as ExpansionRecordedCommand[];
    } else {
      this.current = createExpansionGameState({ levelId, contentHash: getExpansionLevelContentHash(levelId), seed });
      this.seed = seed;
      this.commands = [];
    }
  }

  get state(): ExpansionGameState { return this.current; }

  dispatch(command: ExpansionSimCommand): void {
    const previous = this.current;
    this.current = applyExpansionCommand(previous, command);
    // Rejected input is a no-op and does not consume the bounded replay budget.
    if (this.current === previous) return;
    if (this.commands.length >= MAX_EXPANSION_REPLAY_COMMANDS) {
      this.recordingComplete = false;
      return; // Gameplay remains available; checkpoint/score export fails explicitly.
    }
    this.commands.push({ t: previous.tickCount, c: structuredClone(command) });
  }

  step(): void {
    if (this.current.phase === "active") this.current = tickExpansion(this.current);
  }

  checkpoint(): ExpansionCheckpoint {
    this.assertRecorded();
    return createExpansionCheckpoint(this.current, this.seed, this.commands);
  }

  replay(): ExpansionReplayInput {
    this.assertRecorded();
    return {
      schema: 2, campaign: EXPANSION_CAMPAIGN_ID, ruleset: EXPANSION_RULESET_ID,
      contentRevision: this.current.config.contentRevision,
      contentHash: this.current.config.contentHash, level: this.current.config.levelId,
      seed: this.seed, commands: structuredClone(this.commands),
    };
  }

  private assertRecorded(): void {
    if (!this.recordingComplete) throw new Error("This run exceeds the saved-command limit.");
  }
}
