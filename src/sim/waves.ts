import { ANTAGONIST_TAUNTS } from "../data/taunts";
import { nextInt } from "./rng";
import type { GameState, WaveDefinition } from "./types";

export function getCurrentWave(state: GameState): WaveDefinition {
  const wave = state.config.waves[state.waveIndex];

  if (!wave) {
    throw new Error(`Missing wave at index ${state.waveIndex}.`);
  }

  return wave;
}

export function startPrepPhase(state: GameState, waveIndex: number): GameState {
  const wave = state.config.waves[waveIndex];

  if (!wave) {
    return {
      ...state,
      phase: "won",
      waveTick: 0,
      prepTicksRemaining: 0,
      activeTaunt: "",
      waveSpawnedCount: 0,
      events: [],
    };
  }

  const tauntPick = nextInt(state.rng, 0, ANTAGONIST_TAUNTS.length);

  return {
    ...state,
    rng: tauntPick.rng,
    phase: "prep",
    waveIndex,
    waveTick: 0,
    prepTicksRemaining: wave.prepTicks,
    activeTaunt: ANTAGONIST_TAUNTS[tauntPick.value],
    bandwidth: state.bandwidth + wave.bandwidthGrant,
    waveSpawnedCount: 0,
    events: [],
  };
}

export function startActivePhase(state: GameState): GameState {
  if (state.phase !== "prep") {
    return state;
  }

  return {
    ...state,
    phase: "active",
    waveTick: 0,
    prepTicksRemaining: 0,
    events: [],
  };
}

export function isCurrentWaveComplete(state: GameState): boolean {
  const wave = getCurrentWave(state);

  return (
    state.waveSpawnedCount >= wave.maxSpawnedIntrusions &&
    state.intrusions.length === 0
  );
}

export function isFinalWave(state: GameState): boolean {
  return state.waveIndex >= state.config.waves.length - 1;
}
