import type { ExpansionGameState } from "./types";
import { getCurrentExpansionWave } from "./waves";

export function applyExpansionBandwidthTrickle(state: ExpansionGameState): ExpansionGameState {
  if (state.phase !== "active") return state;
  const wave = getCurrentExpansionWave(state);
  if (wave.bandwidthTricklePerTick <= 0 || state.waveTick % wave.bandwidthTrickleEveryTicks !== 0) return state;
  return { ...state, bandwidth: state.bandwidth + wave.bandwidthTricklePerTick };
}
