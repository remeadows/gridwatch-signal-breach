import { getExpansionLevelContentHash } from "../src/data/campaigns/expansion/contentManifest";
import { applyExpansionCommand } from "../src/sim/expansion/commands";
import { applyExpansionTurretCombat } from "../src/sim/expansion/combat";
import { createExpansionGrid, getExpansionTile, getExpansionTileKind, listExpansionPositions, sameExpansionPosition, setExpansionTile } from "../src/sim/expansion/grid";
import { moveExpansionIntrusions } from "../src/sim/expansion/intrusions";
import { MAX_EXPANSION_REPLAY_TICKS, replayExpansionRun } from "../src/sim/expansion/replay";
import { calculateExpansionScore } from "../src/sim/expansion/scoring";
import { createExpansionGameState } from "../src/sim/expansion/state";
import { tickExpansion } from "../src/sim/expansion/tick";
import type { ExpansionGameState, ExpansionHardwareKind, ExpansionRecordedCommand, ExpansionReplayInput, ExpansionSimCommand, PlaceExpansionUnitCommand } from "../src/sim/expansion/types";
import { stableStringify } from "./expansion-content-report-lib";
import { HUMAN_BUILD_PLANS, validateHumanBuildPlan, type HumanBuildPlan } from "./expansion-human-plans";

export const HUMAN_BALANCE_SEEDS = ["alpha", "bravo", "charlie", "delta"] as const;
export const HUMAN_ACTION_INTERVALS = [3, 6] as const;
type PlacementCounts = Record<ExpansionHardwareKind, number>;

export type HumanCommandAttempt = Readonly<{
  t: number;
  wave: number;
  phase: "prep" | "active";
  observedTick: number;
  command: PlaceExpansionUnitCommand;
  accepted: boolean;
  reason: "accepted" | "insufficient-bandwidth" | "occupied-by-intrusion" | "tile-changed" | "placement-rule";
}>;

export type HumanWaveMetrics = Readonly<{
  wave: number;
  outcome: "cleared" | "lost" | "timed-out";
  activeTicks: number;
  finalIntegrity: number;
  minimumIntegrity: number;
  uptimePercent: number;
  bandwidth: number;
  neutralized: number;
  score: number;
  successfulPlacements: PlacementCounts;
  rejectedCommands: number;
}>;

export function runHumanPacedLevel(input: Readonly<{
  levelId: number;
  seed: string;
  actionIntervalTicks: 3 | 6;
  plan?: HumanBuildPlan;
}>) {
  const plan = input.plan ?? HUMAN_BUILD_PLANS[input.levelId];
  if (!plan) throw new Error(`No authored human build plan for Level ${input.levelId}.`);
  const level = validateHumanBuildPlan(input.levelId, plan);
  const relayCommands: PlaceExpansionUnitCommand[] = level.initialTiles.filter((tile) => tile.kind === "relay").map((tile) => ({ type: "placeUnit", unit: "relay", position: tile.position }));
  const plannedCommands = createPlannedCommands(plan);
  let state = createExpansionGameState({ levelId: input.levelId, contentHash: getExpansionLevelContentHash(input.levelId), seed: input.seed });
  let observation = state;
  let lastObservationTick = state.tickCount;
  const commands: ExpansionRecordedCommand[] = [];
  const attempts: HumanCommandAttempt[] = [];
  const successfulPlacements = emptyPlacementCounts();
  const waves: HumanWaveMetrics[] = [];
  let waveStart = state;
  let waveMinimumIntegrity = state.coreIntegrity;
  let waveCounts = emptyPlacementCounts();
  let waveRejected = 0;

  function apply(command: ExpansionSimCommand, observedTick: number): void {
    const before = state;
    commands.push({ t: state.tickCount, c: command });
    state = applyExpansionCommand(state, command);
    if (command.type !== "placeUnit") return;
    const accepted = state !== before;
    attempts.push({ t: before.tickCount, wave: before.waveIndex + 1, phase: before.phase === "prep" ? "prep" : "active", observedTick, command, accepted, reason: accepted ? "accepted" : rejectionReason(before, command) });
    if (accepted) {
      successfulPlacements[command.unit] += 1;
      waveCounts[command.unit] += 1;
    } else {
      waveRejected += 1;
    }
  }

  while (state.phase !== "won" && state.phase !== "lost" && state.tickCount < MAX_EXPANSION_REPLAY_TICKS) {
    if (state.phase === "prep") {
      // Preparation has no time pressure, but visits each finite candidate once.
      // It does not conjure income, clear corruption instantly, or retry forever.
      for (const command of [...relayCommands, ...scrubberCommands(state), ...plannedCommands]) {
        if (isIntendedPlacement(state, command)) apply(command, state.tickCount);
      }
      apply({ type: "skipPrep" }, state.tickCount);
      observation = state;
      lastObservationTick = state.tickCount;
    } else if (state.tickCount - lastObservationTick >= input.actionIntervalTicks) {
      const command = [...relayCommands, ...scrubberCommands(observation), ...plannedCommands].find((candidate) => isIntendedPlacement(observation, candidate));
      if (command) apply(command, observation.tickCount);
      // The next decision sees this sampled board one interval later, including
      // the player's own just-issued action. No current-board repair oracle.
      observation = state;
      lastObservationTick = state.tickCount;
    }

    const previousWave = state.waveIndex;
    state = tickExpansion(state);
    waveMinimumIntegrity = Math.min(waveMinimumIntegrity, state.coreIntegrity);
    const terminal = state.phase === "won" || state.phase === "lost";
    const timedOut = !terminal && state.tickCount === MAX_EXPANSION_REPLAY_TICKS;
    if (state.waveIndex !== previousWave || terminal || timedOut) {
      const ticks = state.uptimeTicks + state.severedTicks - waveStart.uptimeTicks - waveStart.severedTicks;
      const liveTicks = state.uptimeTicks - waveStart.uptimeTicks;
      // startExpansionPrepPhase already grants the next wave's income. Remove
      // that grant when reporting the wave that just finished.
      const bandwidth = state.bandwidth - (state.phase === "prep" ? state.config.waves[state.waveIndex].bandwidthGrant : 0);
      waves.push({ wave: previousWave + 1, outcome: state.phase === "lost" ? "lost" : timedOut ? "timed-out" : "cleared", activeTicks: ticks, finalIntegrity: state.coreIntegrity, minimumIntegrity: waveMinimumIntegrity, uptimePercent: Math.round(liveTicks / Math.max(1, ticks) * 100), bandwidth, neutralized: state.neutralizedCount - waveStart.neutralizedCount, score: calculateExpansionScore({ ...state, bandwidth }).total, successfulPlacements: { ...waveCounts }, rejectedCommands: waveRejected });
      waveStart = state;
      waveMinimumIntegrity = state.coreIntegrity;
      waveCounts = emptyPlacementCounts();
      waveRejected = 0;
    }
  }

  validateActionCadence(attempts, input.actionIntervalTicks);
  const score = calculateExpansionScore(state);
  const replay: ExpansionReplayInput = { schema: 2, ruleset: state.config.ruleset, campaign: state.config.campaignId, contentRevision: state.config.contentRevision, level: input.levelId, contentHash: state.config.contentHash, seed: input.seed, commands };
  let replayVerified = false;
  if (state.phase === "won") {
    const replayed = replayExpansionRun(replay);
    if (stableStringify(replayed.state) !== stableStringify(state) || stableStringify(replayed.score) !== stableStringify(score)) throw new Error(`Winning command log failed exact replay for Level ${input.levelId}, ${input.seed}, interval ${input.actionIntervalTicks}.`);
    replayVerified = true;
  }
  return { levelId: input.levelId, seed: input.seed, actionIntervalTicks: input.actionIntervalTicks, observationDelayTicks: input.actionIntervalTicks, finalWave: state.waveIndex + 1, phase: state.phase, ticks: state.tickCount, integrity: state.coreIntegrity, minimumIntegrity: Math.min(...waves.map((wave) => wave.minimumIntegrity)), uptimePercent: score.uptimePercent, bandwidth: state.bandwidth, score, successfulPlacements, rejectedCommands: attempts.filter((attempt) => !attempt.accepted).length, waves, attempts, replay, replayVerified, state };
}

export async function buildHumanBalanceReport(input: Readonly<{
  levelIds?: readonly number[];
  plans?: Readonly<Record<number, HumanBuildPlan>>;
  seeds?: readonly string[];
}> = {}) {
  const levelIds = input.levelIds ?? Object.keys(HUMAN_BUILD_PLANS).map(Number);
  const plans = input.plans ?? HUMAN_BUILD_PLANS;
  const seeds = input.seeds ?? HUMAN_BALANCE_SEEDS;
  if (!levelIds.length || new Set(levelIds).size !== levelIds.length || !seeds.length || new Set(seeds).size !== seeds.length) throw new Error("Human report requires nonempty, unique level IDs and seeds.");
  const runs: Array<ReturnType<typeof runHumanPacedLevel> & { commandLogHash: string; finalStateHash: string }> = [];
  const emptyRuns: ReturnType<typeof runEmptyLevel>[] = [];
  for (const levelId of levelIds) {
    const plan = plans[levelId];
    if (!plan) throw new Error(`Missing human build plan for Level ${levelId}.`);
    validateHumanBuildPlan(levelId, plan);
    for (const seed of seeds) {
      const seeded = `human-level-${levelId}-${seed}`;
      for (const actionIntervalTicks of HUMAN_ACTION_INTERVALS) {
        const run = runHumanPacedLevel({ levelId, seed: seeded, actionIntervalTicks, plan });
        runs.push({ ...run, commandLogHash: await sha256(stableStringify(run.replay)), finalStateHash: await sha256(stableStringify(run.state)) });
      }
      const empty = runEmptyLevel(levelId, seeded);
      if (empty.phase !== "lost") throw new Error(`No-action baseline did not lose Level ${levelId}, ${seed}: ${empty.phase}.`);
      emptyRuns.push(empty);
    }
  }
  const groups = levelIds.flatMap((levelId) => HUMAN_ACTION_INTERVALS.map((interval) => {
    const matching = runs.filter((run) => run.levelId === levelId && run.actionIntervalTicks === interval);
    return { level: levelId, liveIntervalTicks: interval, wins: `${matching.filter((run) => run.phase === "won").length}/${matching.length}`, finalWaves: matching.map((run) => run.finalWave).join("/"), integrity: matching.map((run) => run.integrity).join("/"), minimumIntegrity: Math.min(...matching.map((run) => run.minimumIntegrity)), meanScore: Math.round(matching.reduce((sum, run) => sum + run.score.total, 0) / matching.length), rejectedCommands: matching.reduce((sum, run) => sum + run.rejectedCommands, 0), successfulPlacements: matching.reduce((total, run) => sumPlacementCounts(total, run.successfulPlacements), emptyPlacementCounts()), replayedWins: matching.filter((run) => run.replayVerified).length };
  }));
  return { model: "finite-authored-prep-one-live-action-per-interval-delayed-observation-v1", limitations: ["A deterministic input-policy experiment; not evidence of owner wins, fun, or phone rendering performance.", "Uses authored strategy coordinates and perfect recall of the player's own commands.", "Live decisions use one-interval-old board observations; dynamic placement rejection is counted.", "Per-wave metrics, every intended command, full winning replay logs, and exact final state are retained in runs."], groups, runs, emptyRuns };
}

export function runControlledSapperSpacingComparison() {
  const base = createExpansionGameState({ levelId: 6, contentHash: getExpansionLevelContentHash(6), seed: "controlled-spacing" });
  const rows = (["spaced", "clustered"] as const).map((formation) => {
    const relay = formation === "spaced" ? { x: 4, y: 1 } : { x: 4, y: 2 };
    let grid = createExpansionGrid(8);
    for (const [unit, position] of [["turret", { x: 2, y: 3 }], ["firewall", { x: 5, y: 3 }], ["relay", relay]] as const) grid = setExpansionTile(grid, position, { kind: unit, hp: base.config.units[unit].hp! });
    let state: ExpansionGameState = { ...base, phase: "active", grid, intrusions: [{ id: 1, kind: "sapper", hp: 16, maxHp: 16, position: { x: 3, y: 3 }, previousPosition: { x: 3, y: 3 }, spawnedTick: 0, lastMoveTick: 0, corruption: null }] };
    const hits = [];
    let pulse: { tick: number; x: number; y: number } | null = null;
    while (state.intrusions.length && state.tickCount < 10) {
      state = applyExpansionTurretCombat(moveExpansionIntrusions({ ...state, tickCount: state.tickCount + 1, events: [] }));
      for (const event of state.events) {
        if (event.type === "turretHit") hits.push({ tick: event.tick, damage: event.damage, target: event.targetPosition });
        if (event.type === "sapperDeathPulse") pulse = { tick: event.tick, ...event.position };
      }
    }
    return { formation, totalCost: base.config.units.turret.cost + base.config.units.firewall.cost + base.config.units.relay.cost, neutralized: state.neutralizedCount, hits, pulse, relaySurvived: getExpansionTileKind(state.grid, relay) === "relay", firewallHp: getExpansionTile(state.grid, { x: 5, y: 3 }).hp, turretHp: getExpansionTile(state.grid, { x: 2, y: 3 }).hp };
  });
  const [spaced, clustered] = rows;
  if (spaced.totalCost !== clustered.totalCost || stableStringify(spaced.hits) !== stableStringify(clustered.hits) || stableStringify(spaced.pulse) !== stableStringify(clustered.pulse) || spaced.neutralized !== 1 || clustered.neutralized !== 1 || !spaced.relaySurvived || clustered.relaySurvived || spaced.firewallHp !== clustered.firewallHp || spaced.turretHp !== clustered.turretHp) throw new Error("Equal-cost Sapper spacing experiment did not isolate relay spacing with identical fire and kill timing.");
  return { scope: "Controlled production-mechanic experiment; not a level difficulty test.", rows };
}

function createPlannedCommands(plan: HumanBuildPlan): PlaceExpansionUnitCommand[] {
  const result: PlaceExpansionUnitCommand[] = [];
  for (let index = 0; index < Math.max(plan.turret.length, plan.latencyTrap.length, plan.firewall.length, plan.arcIce?.length ?? 0); index += 1) {
    for (const unit of ["turret", "arcIce", "latencyTrap", "firewall"] as const) {
      const position = plan[unit]?.[index];
      if (position) result.push({ type: "placeUnit", unit, position });
    }
  }
  return result;
}

function scrubberCommands(state: ExpansionGameState): PlaceExpansionUnitCommand[] {
  return state.config.toolsUnlocked.includes("scrubber") ? listExpansionPositions(state.grid).filter((position) => getExpansionTileKind(state.grid, position) === "corrupted").map((position) => ({ type: "placeUnit", unit: "scrubber", position })) : [];
}

function isIntendedPlacement(state: ExpansionGameState, command: PlaceExpansionUnitCommand): boolean {
  return state.config.toolsUnlocked.includes(command.unit) && state.bandwidth >= state.config.units[command.unit].cost && getExpansionTileKind(state.grid, command.position) === (command.unit === "scrubber" ? "corrupted" : "empty") && !state.intrusions.some((intrusion) => sameExpansionPosition(intrusion.position, command.position));
}

function rejectionReason(state: ExpansionGameState, command: PlaceExpansionUnitCommand): HumanCommandAttempt["reason"] {
  if (state.bandwidth < state.config.units[command.unit].cost) return "insufficient-bandwidth";
  if (state.intrusions.some((intrusion) => sameExpansionPosition(intrusion.position, command.position))) return "occupied-by-intrusion";
  if (getExpansionTileKind(state.grid, command.position) !== (command.unit === "scrubber" ? "corrupted" : "empty")) return "tile-changed";
  return "placement-rule";
}

function validateActionCadence(attempts: readonly HumanCommandAttempt[], interval: number): void {
  const previousByWave = new Map<number, number>();
  for (const attempt of attempts) {
    if (attempt.phase !== "active") continue;
    const previous = previousByWave.get(attempt.wave);
    if (previous !== undefined && attempt.t - previous < interval) throw new Error("Human policy exceeded its live action cadence.");
    if (attempt.t - attempt.observedTick !== interval) throw new Error("Human policy did not use a one-interval-old observation.");
    previousByWave.set(attempt.wave, attempt.t);
  }
}

function runEmptyLevel(levelId: number, seed: string) {
  let state = createExpansionGameState({ levelId, contentHash: getExpansionLevelContentHash(levelId), seed });
  while (state.phase !== "won" && state.phase !== "lost" && state.tickCount < MAX_EXPANSION_REPLAY_TICKS) {
    if (state.phase === "prep") state = applyExpansionCommand(state, { type: "skipPrep" });
    state = tickExpansion(state);
  }
  return { levelId, seed, phase: state.phase, finalWave: state.waveIndex + 1, ticks: state.tickCount, score: calculateExpansionScore(state), integrity: state.coreIntegrity };
}

function emptyPlacementCounts(): PlacementCounts { return { relay: 0, firewall: 0, turret: 0, scrubber: 0, overclock: 0, latencyTrap: 0, arcIce: 0 }; }
function sumPlacementCounts(left: PlacementCounts, right: PlacementCounts): PlacementCounts { return Object.fromEntries(Object.entries(left).map(([unit, count]) => [unit, count + right[unit as ExpansionHardwareKind]])) as PlacementCounts; }
export async function sha256(value: string): Promise<string> { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""); }
