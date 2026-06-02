import type { GameState, ScoreBreakdown } from "./types";

const NEUTRALIZED_WEIGHT = 10;
const EFFICIENCY_DIVISOR = 2;
const EFFICIENCY_CAP = 60;

export function calculateScore(state: GameState): ScoreBreakdown {
  const measuredTicks = state.uptimeTicks + state.severedTicks;
  const uptimePercent =
    measuredTicks === 0 ? 0 : Math.round((state.uptimeTicks / measuredTicks) * 100);
  const integrity = Math.max(0, state.coreIntegrity);
  const neutralized = state.neutralizedCount * NEUTRALIZED_WEIGHT;
  const uptimeScore = uptimePercent;
  const efficiencyBonus = Math.min(EFFICIENCY_CAP, Math.floor(state.bandwidth / EFFICIENCY_DIVISOR));
  const total = integrity + neutralized + uptimeScore + efficiencyBonus;

  return {
    integrity,
    neutralized,
    uptimePercent,
    uptimeScore,
    efficiencyBonus,
    total,
    rating: getOperatorRating(total, state.phase),
  };
}

function getOperatorRating(total: number, phase: GameState["phase"]): string {
  if (phase === "lost") {
    if (total >= 180) {
      return "Burned But Breathing";
    }

    return "Blackout Casualty";
  }

  if (total >= 360) {
    return "Ghostline Architect";
  }

  if (total >= 300) {
    return "Signal Warden";
  }

  if (total >= 240) {
    return "Relay Captain";
  }

  return "Patch Runner";
}
