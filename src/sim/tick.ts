import { applyTurretCombat } from "./combat";
import { applyIntrusionCorruption } from "./corruption";
import { applyBandwidthTrickle } from "./economy";
import { samePosition } from "./grid";
import { moveIntrusions, spawnIntrusions } from "./intrusions";
import { applyScrubberProgress } from "./scrubbing";
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
  const withScrubbing = applyScrubberProgress(withCorruption);
  const signal = deriveSignalState(withScrubbing);
  const isLive = signal.status === "live";
  const drainAmount = isLive ? 0 : withScrubbing.config.coreIntegrityDrainPerSeveredTick;
  const regenAmount = isLive ? withScrubbing.config.coreIntegrityRegenPerLiveTick : 0;
  const coreIntegrityAfterSignal = isLive
    ? Math.min(
        withScrubbing.config.coreIntegrityMax,
        withScrubbing.coreIntegrity + regenAmount,
      )
    : Math.max(
        0,
        withScrubbing.coreIntegrity - drainAmount,
      );
  const contactBreaches = withScrubbing.intrusions
    .filter((intrusion) => samePosition(intrusion.position, withScrubbing.config.core))
    .map((intrusion) => ({
      intrusionId: intrusion.id,
      amount: withScrubbing.config.enemies[intrusion.kind].coreContactDamage,
    }));
  const contactDamage = contactBreaches.reduce(
    (total, breach) => total + breach.amount,
    0,
  );
  const coreIntegrity = Math.max(
    0,
    Math.min(
      withScrubbing.config.coreIntegrityMax,
      coreIntegrityAfterSignal - contactDamage,
    ),
  );
  const routeDrainAmount = withScrubbing.coreIntegrity - coreIntegrityAfterSignal;
  const events = [
    ...withScrubbing.events,
    ...(state.signal.status === "live" && signal.status === "severed"
      ? [
          {
            type: "routeSevered" as const,
            tick: nextTickCount,
            previousRoute: state.signal.route,
          },
        ]
      : []),
    ...(routeDrainAmount > 0
      ? [
          {
            type: "coreDamaged" as const,
            tick: nextTickCount,
            amount: routeDrainAmount,
            integrity: coreIntegrity,
          },
        ]
      : []),
    ...contactBreaches.map((breach) => ({
      type: "coreBreach" as const,
      tick: nextTickCount,
      intrusionId: breach.intrusionId,
      amount: breach.amount,
      integrity: coreIntegrity,
    })),
  ];

  const progressedState: GameState = {
    ...withScrubbing,
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
