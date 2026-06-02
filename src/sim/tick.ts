import { applyTurretCombat } from "./combat";
import { applyIntrusionCorruption } from "./corruption";
import { applyBandwidthTrickle } from "./economy";
import { moveIntrusions, spawnIntrusions } from "./intrusions";
import { deriveSignalState } from "./state";
import type { GameState } from "./types";
import {
  isCurrentWaveComplete,
  isFinalWave,
  startActivePhase,
  startPrepPhase,
} from "./waves";

export function tick(state: GameState): GameState {
  if (state.phase === "won" || state.phase === "lost") {
    return {
      ...state,
      events: [],
    };
  }

  const nextTickCount = state.tickCount + 1;
  const nextBaseState: GameState = {
    ...state,
    tickCount: nextTickCount,
    waveTick: state.waveTick + 1,
    events: [],
  };

  if (state.phase === "prep") {
    const prepTicksRemaining = Math.max(0, state.prepTicksRemaining - 1);
    const prepState = {
      ...nextBaseState,
      prepTicksRemaining,
    };

    return prepTicksRemaining === 0 ? startActivePhase(prepState) : prepState;
  }

  const withEconomy = applyBandwidthTrickle(nextBaseState);
  const withSpawns = spawnIntrusions(withEconomy);
  const withMovement = moveIntrusions(withSpawns);
  const withCombat = applyTurretCombat(withMovement);
  const withCorruption = applyIntrusionCorruption(withCombat);
  const signal = deriveSignalState(withCorruption);
  const isLive = signal.status === "live";
  const drainAmount = isLive ? 0 : withCorruption.config.coreIntegrityDrainPerSeveredTick;
  const regenAmount = isLive ? withCorruption.config.coreIntegrityRegenPerLiveTick : 0;
  const coreIntegrity = isLive
    ? Math.min(
        withCorruption.config.coreIntegrityMax,
        withCorruption.coreIntegrity + regenAmount,
      )
    : Math.max(
        0,
        withCorruption.coreIntegrity - drainAmount,
      );
  const events = [
    ...withCorruption.events,
    ...(state.signal.status === "live" && signal.status === "severed"
      ? [
          {
            type: "routeSevered" as const,
            tick: nextTickCount,
            previousRoute: state.signal.route,
          },
        ]
      : []),
    ...(drainAmount > 0
      ? [
          {
            type: "coreDamaged" as const,
            tick: nextTickCount,
            amount: withCorruption.coreIntegrity - coreIntegrity,
            integrity: coreIntegrity,
          },
        ]
      : []),
  ];

  const progressedState: GameState = {
    ...withCorruption,
    events,
    signal,
    coreIntegrity,
    uptimeTicks: withCorruption.uptimeTicks + (isLive ? 1 : 0),
    severedTicks: withCorruption.severedTicks + (isLive ? 0 : 1),
  };

  if (progressedState.coreIntegrity <= 0) {
    return {
      ...progressedState,
      phase: "lost",
    };
  }

  if (isCurrentWaveComplete(progressedState)) {
    if (isFinalWave(progressedState)) {
      return {
        ...progressedState,
        phase: "won",
      };
    }

    return startPrepPhase(progressedState, progressedState.waveIndex + 1);
  }

  return progressedState;
}
