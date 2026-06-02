import { getCurrentWave } from "./waves";
import type { GameState } from "./types";

export function applyBandwidthTrickle(state: GameState): GameState {
  if (state.phase !== "active") {
    return state;
  }

  const wave = getCurrentWave(state);

  if (
    wave.bandwidthTricklePerTick <= 0 ||
    state.waveTick % wave.bandwidthTrickleEveryTicks !== 0
  ) {
    return state;
  }

  return {
    ...state,
    bandwidth: state.bandwidth + wave.bandwidthTricklePerTick,
  };
}
