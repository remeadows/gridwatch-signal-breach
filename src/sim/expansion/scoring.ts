import { EXPANSION_1_R1_TUNING } from "../../data/campaigns/expansion/tuning";
import type { ExpansionGameState } from "./types";
import type { ScoreBreakdown } from "../types";

export function calculateExpansionScore(state: ExpansionGameState): ScoreBreakdown {
  const measured = state.uptimeTicks + state.severedTicks;
  const uptimePercent = measured === 0 ? 0 : Math.round(state.uptimeTicks / measured * 100);
  const integrity = Math.max(0, state.coreIntegrity);
  const neutralized = state.neutralizedCount * EXPANSION_1_R1_TUNING.scoring.neutralizedWeight;
  const efficiencyBonus = Math.min(EXPANSION_1_R1_TUNING.scoring.efficiencyBonusCap, Math.floor(state.bandwidth / 2));
  const total = integrity + neutralized + uptimePercent + efficiencyBonus;
  return {
    integrity,
    neutralized,
    uptimePercent,
    uptimeScore: uptimePercent,
    efficiencyBonus,
    total,
    rating: state.phase === "lost"
      ? "Deadline Missed"
      : total >= EXPANSION_1_R1_TUNING.scoring.zeroLatencyWardenMinScore
        ? "Zero-Latency Warden"
        : total >= EXPANSION_1_R1_TUNING.scoring.trafficControllerMinScore
          ? "Traffic Controller"
          : "Route Keeper",
  };
}
