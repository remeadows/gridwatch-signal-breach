import { getExpansionLevelContentHash } from "../src/data/campaigns/expansion/contentManifest";
import { applyExpansionCommand } from "../src/sim/expansion/commands";
import { applyExpansionTurretCombat } from "../src/sim/expansion/combat";
import { getExpansionTile, sameExpansionPosition, setExpansionTile } from "../src/sim/expansion/grid";
import { spawnExpansionIntrusions } from "../src/sim/expansion/intrusions";
import { applyExpansionLatencyTraps } from "../src/sim/expansion/latency";
import { ExpansionReplayError, replayExpansionRun } from "../src/sim/expansion/replay";
import { createExpansionGameState } from "../src/sim/expansion/state";
import { EXPANSION_CAMPAIGN_ID, EXPANSION_CONTENT_REVISION, EXPANSION_RULESET_ID, type ExpansionReplayInput } from "../src/sim/expansion/types";
import { startExpansionPrepPhase } from "../src/sim/expansion/waves";

const hash = getExpansionLevelContentHash(1);
const initial = createExpansionGameState({ levelId: 1, contentHash: hash, seed: "expansion-sim-check" });
const perimeterRejected = applyExpansionCommand(initial, { type: "placeUnit", position: { x: 0, y: 2 }, unit: "latencyTrap" });
expectEqual(perimeterRejected, initial, "Latency Trap was placed on the perimeter.");

const withTrap = applyExpansionCommand(initial, { type: "placeUnit", position: { x: 1, y: 4 }, unit: "latencyTrap" });
expectEqual(withTrap.signal.status, "live", "Latency Trap altered the signal route.");
expectEqual(getExpansionTile(withTrap.grid, { x: 1, y: 4 }).charges, 3, "Latency Trap did not start with three charges.");

const entryState = {
  ...withTrap,
  tickCount: 10,
  phase: "active" as const,
  intrusions: [{
    id: 1,
    kind: "rusher" as const,
    hp: 6,
    maxHp: 6,
    position: { x: 1, y: 4 },
    previousPosition: { x: 0, y: 4 },
    spawnedTick: 8,
    lastMoveTick: 10,
    corruption: null,
  }],
};
const triggered = applyExpansionLatencyTraps(entryState);
expectEqual(triggered.intrusions[0]?.lastMoveTick, 13, "Latency Trap did not add the approved three-tick delay.");
expectEqual(getExpansionTile(triggered.grid, { x: 1, y: 4 }).charges, 2, "Latency Trap did not consume exactly one charge.");
expectEqual(triggered.events.at(-1)?.type, "latencyTrapTriggered", "Latency Trap event ordering drifted.");

const completingEvent = { type: "routeSevered" as const, tick: 12, previousRoute: initial.signal.route };
const nextPrep = startExpansionPrepPhase({ ...initial, events: [completingEvent] }, 1);
expectEqual(nextPrep.events[0], completingEvent, "Wave transition discarded events from the completing tick.");

const levelFive = createExpansionGameState({ levelId: 5, contentHash: getExpansionLevelContentHash(5), seed: "scripted-cap" });
const cappedIntrusions = Array.from({ length: levelFive.config.waves[4].maxActiveIntrusions }, (_, index) => ({
  id: index + 1,
  kind: "rusher" as const,
  hp: 6,
  maxHp: 6,
  position: { x: 1, y: 0 },
  previousPosition: { x: 1, y: 0 },
  spawnedTick: 0,
  lastMoveTick: 0,
  corruption: null,
}));
const scriptedAtCap = spawnExpansionIntrusions({ ...levelFive, phase: "active", waveIndex: 4, waveTick: 8, intrusions: cappedIntrusions });
expectEqual(scriptedAtCap.intrusions.length, cappedIntrusions.length, "Scripted spawn exceeded the active-intrusion cap.");

const splitPosition = { x: 3, y: 4 };
const splitState = {
  ...initial,
  phase: "active" as const,
  config: { ...initial.config, turretRange: 10 },
  grid: setExpansionTile(initial.grid, splitPosition, { kind: "latencyTrap", charges: 3 }),
  intrusions: [{
    id: 1,
    kind: "splitter" as const,
    hp: 1,
    maxHp: 1,
    position: splitPosition,
    previousPosition: splitPosition,
    spawnedTick: 0,
    lastMoveTick: 0,
    corruption: null,
  }],
};
const split = applyExpansionTurretCombat(splitState);
expectEqual(split.intrusions.length > 0, true, "Defeated splitter did not spawn any children.");
expectEqual(split.intrusions.some((intrusion) => sameExpansionPosition(intrusion.position, splitPosition)), false, "Splitter child bypassed trap entry processing by spawning on a trap.");
expectEqual(split.intrusions.some((intrusion) => sameExpansionPosition(intrusion.position, split.config.source) || sameExpansionPosition(intrusion.position, split.config.core)), false, "Splitter child spawned on Source or Core.");

const replay: ExpansionReplayInput = {
  schema: 2,
  ruleset: EXPANSION_RULESET_ID,
  campaign: EXPANSION_CAMPAIGN_ID,
  level: 2,
  contentRevision: EXPANSION_CONTENT_REVISION,
  contentHash: getExpansionLevelContentHash(2),
  seed: "expansion-empty-replay",
  commands: [],
};
const first = replayExpansionRun(replay);
const second = replayExpansionRun(replay);
expectDeepEqual(first, second, "Expansion replay is not deterministic.");
expectEqual(first.state.phase, "lost", "Empty replay unexpectedly cleared Level 2.");
expectThrows(
  () => replayExpansionRun({ ...replay, contentHash: "0".repeat(64) }),
  ExpansionReplayError,
  "Expansion replay accepted the wrong content hash.",
);
for (const commands of [
  [{ t: -1, c: { type: "skipPrep" } }],
  [{ t: 0.5, c: { type: "skipPrep" } }],
  [{ t: 0, c: { type: "placeUnit", position: { x: 1, y: 1 }, unit: "rootkit" } }],
  [{ t: 0, c: { type: "sellUnit", position: { x: Number.NaN, y: 1 } } }],
] as const) {
  expectThrows(
    () => replayExpansionRun({ ...replay, commands: commands as unknown as ExpansionReplayInput["commands"] }),
    ExpansionReplayError,
    "Expansion replay accepted a malformed command.",
  );
}

console.log("Expansion simulator verification passed: placement, trap ordering, replay identity, and determinism.");

function expectEqual<T>(actual: T, expected: T, message: string): void { if (actual !== expected) throw new Error(message); }
function expectDeepEqual(actual: unknown, expected: unknown, message: string): void { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(message); }
function expectThrows(callback: () => void, errorType: new (message: string) => Error, message: string): void { try { callback(); } catch (error) { if (error instanceof errorType) return; throw error; } throw new Error(message); }
