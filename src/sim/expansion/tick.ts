import { applyExpansionTurretCombat } from "./combat";
import { applyExpansionCorruption } from "./corruption";
import { applyExpansionBandwidthTrickle } from "./economy";
import { sameExpansionPosition } from "./grid";
import { moveExpansionIntrusions, spawnExpansionIntrusions } from "./intrusions";
import { applyExpansionLatencyTraps } from "./latency";
import { applyExpansionScrubberProgress } from "./scrubbing";
import { deriveExpansionSignalState } from "./state";
import type { ExpansionGameState } from "./types";
import { isCurrentExpansionWaveComplete, isFinalExpansionWave, startExpansionActivePhase, startExpansionPrepPhase } from "./waves";

export function tickExpansion(state: ExpansionGameState): ExpansionGameState {
  if (state.phase === "won" || state.phase === "lost") return { ...state, events: [] };
  const tickCount = state.tickCount + 1;
  const base = { ...state, tickCount, waveTick: state.waveTick + 1, events: [] };
  if (state.phase === "prep") {
    const prepTicksRemaining = Math.max(0, state.prepTicksRemaining - 1);
    const prep = { ...base, prepTicksRemaining };
    return prepTicksRemaining === 0 ? startExpansionActivePhase(prep) : prep;
  }

  const economy = applyExpansionBandwidthTrickle(base);
  const spawned = spawnExpansionIntrusions(economy);
  const moved = moveExpansionIntrusions(spawned);
  const trapped = applyExpansionLatencyTraps(moved);
  const combat = applyExpansionTurretCombat(trapped);
  const corrupted = applyExpansionCorruption(combat);
  const scrubbed = applyExpansionScrubberProgress(corrupted);
  const signal = deriveExpansionSignalState(scrubbed);
  const live = signal.status === "live";
  const afterSignal = live
    ? Math.min(scrubbed.config.coreIntegrityMax, scrubbed.coreIntegrity + scrubbed.config.coreIntegrityRegenPerLiveTick)
    : Math.max(0, scrubbed.coreIntegrity - scrubbed.config.coreIntegrityDrainPerSeveredTick);
  const breaches = scrubbed.intrusions.filter((intrusion) => sameExpansionPosition(intrusion.position, scrubbed.config.core));
  const contactDamage = breaches.reduce((total, intrusion) => total + scrubbed.config.enemies[intrusion.kind].coreContactDamage, 0);
  const coreIntegrity = Math.max(0, afterSignal - contactDamage);
  const routeDamage = scrubbed.coreIntegrity - afterSignal;
  const events = [
    ...scrubbed.events,
    ...(state.signal.status === "live" && signal.status === "severed" ? [{ type: "routeSevered" as const, tick: tickCount, previousRoute: state.signal.route }] : []),
    ...(routeDamage > 0 ? [{ type: "coreDamaged" as const, tick: tickCount, amount: routeDamage, integrity: coreIntegrity }] : []),
    ...breaches.map((intrusion) => ({ type: "coreBreach" as const, tick: tickCount, intrusionId: intrusion.id, amount: scrubbed.config.enemies[intrusion.kind].coreContactDamage, integrity: coreIntegrity })),
  ];
  const progressed: ExpansionGameState = {
    ...scrubbed,
    events,
    signal,
    coreIntegrity,
    uptimeTicks: scrubbed.uptimeTicks + (live ? 1 : 0),
    severedTicks: scrubbed.severedTicks + (live ? 0 : 1),
  };
  if (coreIntegrity <= 0) return { ...progressed, phase: "lost" };
  if (isCurrentExpansionWaveComplete(progressed)) {
    if (isFinalExpansionWave(progressed)) return { ...progressed, phase: "won" };
    return startExpansionPrepPhase(progressed, progressed.waveIndex + 1);
  }
  return progressed;
}
