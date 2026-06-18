import { applyCommand, type SimCommand } from "./commands";
import { calculateScore } from "./scoring";
import { createGameState } from "./state";
import { tick } from "./tick";
import type { GameState, ScoreBreakdown } from "./types";

// A command paired with the tickCount at which it was dispatched during play.
// Because the simulation is fully deterministic, recording (tick, command) is
// enough to reproduce a run exactly — which lets the server recompute the score
// instead of trusting whatever number the client claims.
export type RecordedCommand = Readonly<{
  t: number;
  c: SimCommand;
}>;

export type ReplayInput = Readonly<{
  seed: string;
  sector: number;
  commands: readonly RecordedCommand[];
}>;

export type ReplayResult = Readonly<{
  state: GameState;
  score: ScoreBreakdown;
}>;

// Generous ceiling so a malformed/malicious log can never spin forever. A real
// 12-wave run is well under this.
export const MAX_REPLAY_TICKS = 20000;

export class ReplayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReplayError";
  }
}

// Replays a run from its seed + recorded command log and returns the final
// state and authoritative score. Throws ReplayError on a malformed log.
//
// Mirrors the live loop in main.ts: between two tick() calls, zero or more
// commands are applied at the current tickCount. We reproduce that by draining
// every command tagged for the current tick (in recorded order) before each
// tick(). The number of ticks to reach a terminal state is deterministic given
// the commands, so placement is exact.
export function replayRun(input: ReplayInput): ReplayResult {
  let state = createGameState({ seed: input.seed, sector: input.sector });
  const commands = input.commands;
  let index = 0;
  let ticks = 0;

  while (state.phase !== "won" && state.phase !== "lost") {
    while (index < commands.length && commands[index].t === state.tickCount) {
      state = applyCommand(state, commands[index].c);
      index += 1;
    }

    if (index < commands.length && commands[index].t < state.tickCount) {
      throw new ReplayError("Command log is out of order.");
    }

    state = tick(state);
    ticks += 1;

    if (ticks > MAX_REPLAY_TICKS) {
      throw new ReplayError("Run exceeded the maximum tick budget.");
    }
  }

  // The real client cannot dispatch commands after a run ends, so any leftover
  // commands indicate a tampered log.
  if (index < commands.length) {
    throw new ReplayError("Command log contains commands after the run ended.");
  }

  return { state, score: calculateScore(state) };
}
