import { ANTAGONIST_TAUNTS } from "../../data/taunts";
import { nextInt } from "../rng";
import type { ExpansionGameState, ExpansionWaveDefinition } from "./types";

export function getCurrentExpansionWave(state: ExpansionGameState): ExpansionWaveDefinition {
  const wave = state.config.waves[state.waveIndex];
  if (!wave) throw new Error(`Missing expansion wave at index ${state.waveIndex}.`);
  return wave;
}

export function startExpansionPrepPhase(
  state: ExpansionGameState,
  waveIndex: number,
): ExpansionGameState {
  const wave = state.config.waves[waveIndex];
  if (!wave) {
    return { ...state, phase: "won", waveTick: 0, prepTicksRemaining: 0, activeTaunt: "", waveSpawnedCount: 0, events: [] };
  }
  const pick = nextInt(state.rng, 0, ANTAGONIST_TAUNTS.length);
  return {
    ...state,
    rng: pick.rng,
    phase: "prep",
    waveIndex,
    waveTick: 0,
    prepTicksRemaining: wave.prepTicks,
    activeTaunt: ANTAGONIST_TAUNTS[pick.value],
    bandwidth: state.bandwidth + wave.bandwidthGrant,
    waveSpawnedCount: 0,
  };
}

export function startExpansionActivePhase(state: ExpansionGameState): ExpansionGameState {
  if (state.phase !== "prep") return state;
  return { ...state, phase: "active", waveTick: 0, prepTicksRemaining: 0, events: [] };
}

export function isCurrentExpansionWaveComplete(state: ExpansionGameState): boolean {
  const wave = getCurrentExpansionWave(state);
  return state.waveSpawnedCount >= wave.maxSpawnedIntrusions && state.intrusions.length === 0;
}

export function isFinalExpansionWave(state: ExpansionGameState): boolean {
  return state.waveIndex >= state.config.waves.length - 1;
}
