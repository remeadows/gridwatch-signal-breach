import type { ExpansionGameState } from "./types";
import type { ScoreBreakdown } from "../types";

export function calculateExpansionScore(state: ExpansionGameState): ScoreBreakdown {
  const measured = state.uptimeTicks + state.severedTicks;
  const uptimePercent = measured === 0 ? 0 : Math.round(state.uptimeTicks / measured * 100);
  const integrity = Math.max(0, state.coreIntegrity);
  const neutralized = state.neutralizedCount * 10;
  const efficiencyBonus = Math.min(60, Math.floor(state.bandwidth / 2));
  const total = integrity + neutralized + uptimePercent + efficiencyBonus;
  return { integrity, neutralized, uptimePercent, uptimeScore: uptimePercent, efficiencyBonus, total, rating: state.phase === "lost" ? "Deadline Missed" : total >= 440 ? "Zero-Latency Warden" : total >= 340 ? "Traffic Controller" : "Route Keeper" };
}
