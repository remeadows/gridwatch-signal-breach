import type { GameState } from "../src/sim/types";

export const MAX_ANALYSIS_TICKS = 20_000;

type TickBudgetContext = Readonly<{
  scope: "campaign" | "wave";
  ticks: number;
  state: GameState;
  sector: number;
  seed: string;
  ruleset: string;
}>;

/** Stops deterministic analysis tools with enough context to reproduce a stalled run. */
export function assertWithinTickBudget(context: TickBudgetContext): void {
  if (context.ticks <= MAX_ANALYSIS_TICKS) {
    return;
  }

  const wave = context.state.config.waves[context.state.waveIndex];
  throw new Error(
    `${context.scope} exceeded ${MAX_ANALYSIS_TICKS} ticks: ` +
      `sector ${context.sector}, seed ${context.seed}, ` +
      `wave ${wave?.id ?? context.state.waveIndex + 1}, ruleset ${context.ruleset}.`,
  );
}
