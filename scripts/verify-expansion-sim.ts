import { getExpansionLevelContentHash } from "../src/data/campaigns/expansion/contentManifest";
import { applyExpansionCommand } from "../src/sim/expansion/commands";
import { applyExpansionTurretCombat } from "../src/sim/expansion/combat";
import { createExpansionGrid, getExpansionTile, listExpansionPositions, sameExpansionPosition, setExpansionTile } from "../src/sim/expansion/grid";
import { getExpansionSapperTarget, getOpenExpansionSpawnPositions, moveExpansionIntrusions, spawnExpansionIntrusions } from "../src/sim/expansion/intrusions";
import { applyExpansionLatencyTraps } from "../src/sim/expansion/latency";
import { ExpansionReplayError, replayExpansionRun } from "../src/sim/expansion/replay";
import { createExpansionGameState } from "../src/sim/expansion/state";
import { tickExpansion } from "../src/sim/expansion/tick";
import { EXPANSION_CAMPAIGN_ID, EXPANSION_CONTENT_REVISION, EXPANSION_RULESET_ID, type ExpansionGameState, type ExpansionIntrusionState, type ExpansionReplayInput } from "../src/sim/expansion/types";
import { startExpansionPrepPhase } from "../src/sim/expansion/waves";

const hash = getExpansionLevelContentHash(1);
const initial = createExpansionGameState({ levelId: 1, contentHash: hash, seed: "expansion-sim-check" });
const perimeterRejected = applyExpansionCommand(initial, { type: "placeUnit", position: { x: 0, y: 2 }, unit: "latencyTrap" });
expectEqual(perimeterRejected, initial, "Latency Trap was placed on the perimeter.");

// Scrubber is intentionally not sellable: ordinary sale empties its cell and
// would otherwise replace paid, timed cleansing with instant refunded cleanup.
const scrubberBase = createExpansionGameState({ levelId: 2, contentHash: getExpansionLevelContentHash(2), seed: "scrubber-no-instant-sale" });
const scrubberPosition = { x: 1, y: 1 };
const corruptedScrubberBase = { ...scrubberBase, grid: setExpansionTile(scrubberBase.grid, scrubberPosition, { kind: "corrupted" }) };
const placedScrubber = applyExpansionCommand(corruptedScrubberBase, { type: "placeUnit", position: scrubberPosition, unit: "scrubber" });
expectEqual(getExpansionTile(placedScrubber.grid, scrubberPosition).kind, "scrubber", "Scrubber fixture requires a legal placement on corruption.");
expectEqual(getExpansionTile(placedScrubber.grid, scrubberPosition).progress, 0, "Placed Scrubber must start with no cleansing progress.");
expectEqual(placedScrubber.bandwidth, scrubberBase.bandwidth - scrubberBase.config.units.scrubber.cost, "Scrubber placement did not charge its full cost.");
expectEqual(placedScrubber.config.scrubberCleanseTicks, 6, "Scrubber cleanse duration drifted from six active ticks.");
for (const phase of ["prep", "active"] as const) {
  const workingScrubber = { ...placedScrubber, phase };
  const attemptedSale = applyExpansionCommand(workingScrubber, { type: "sellUnit", position: scrubberPosition });
  expectEqual(attemptedSale, workingScrubber, `${phase}: selling Scrubber must be rejected without changing state.`);
  expectEqual(attemptedSale.bandwidth, placedScrubber.bandwidth, `${phase}: attempted Scrubber sale must not refund bandwidth.`);
  expectEqual(getExpansionTile(attemptedSale.grid, scrubberPosition).kind, "scrubber", `${phase}: attempted Scrubber sale instantly cleansed corruption.`);
}
expectEqual(getExpansionTile(tickExpansion(placedScrubber).grid, scrubberPosition).progress, 0, "Build phase advanced Scrubber cleanup before launch.");
let cleaningScrubber = applyExpansionCommand(placedScrubber, { type: "skipPrep" });
cleaningScrubber = {
  ...cleaningScrubber,
  // Isolate the full tick pipeline from enemy interference and income; the
  // production cleansing duration, command rules and scrub stage are intact.
  config: { ...cleaningScrubber.config, waves: cleaningScrubber.config.waves.map((wave) => ({ ...wave, spawnFirstTick: 100, scriptedSpawns: [], bandwidthTricklePerTick: 0 })) },
};
for (let tick = 1; tick <= 6; tick += 1) {
  cleaningScrubber = tickExpansion(cleaningScrubber);
  const tile = getExpansionTile(cleaningScrubber.grid, scrubberPosition);
  expectEqual(cleaningScrubber.bandwidth, placedScrubber.bandwidth, "Scrubber completion must not refund its purchase.");
  if (tick < 6) {
    expectEqual(tile.kind, "scrubber", "Scrubber cleansed its cell before six active ticks.");
    expectEqual(tile.progress, tick, "Scrubber did not advance by exactly one active tick.");
    expectEqual(applyExpansionCommand(cleaningScrubber, { type: "sellUnit", position: scrubberPosition }), cleaningScrubber, "Partially completed Scrubber became sellable.");
    expectEqual(cleaningScrubber.events.some((event) => event.type === "tileCleansed"), false, "Scrubber emitted cleanup feedback before completion.");
  } else {
    expectEqual(tile.kind, "empty", "Scrubber did not finish cleansing and disappear on its sixth active tick.");
    expectEqual(cleaningScrubber.events.filter((event) => event.type === "tileCleansed" && sameExpansionPosition(event.position, scrubberPosition)).length, 1, "Scrubber completion must emit exactly one tile-cleansed event.");
  }
}
expectEqual(getExpansionTile(corruptedScrubberBase.grid, scrubberPosition).kind, "corrupted", "Scrubber lifecycle mutated its input grid.");

const spawnGuardBase: ExpansionGameState = {
  ...initial,
  bandwidth: 1_000,
  config: { ...initial.config, waves: [initial.config.waves[0]] },
};
const initialSpawnPositions = getOpenExpansionSpawnPositions(spawnGuardBase);
let spawnGuarded = spawnGuardBase;
for (const position of initialSpawnPositions.slice(0, -1)) {
  spawnGuarded = applyExpansionCommand(spawnGuarded, { type: "placeUnit", position, unit: "relay" });
}
const finalSpawnPosition = initialSpawnPositions.at(-1);
if (!finalSpawnPosition) throw new Error("Level 1 Wave 1 has no valid spawn position.");
expectEqual(getOpenExpansionSpawnPositions(spawnGuarded).length, 1, "Spawn-cell fixture did not leave one opening.");
expectEqual(
  applyExpansionCommand(spawnGuarded, { type: "placeUnit", position: finalSpawnPosition, unit: "relay" }),
  spawnGuarded,
  "Placement consumed the final valid spawn cell.",
);

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
expectEqual(scriptedAtCap.waveScriptedSpawnIndex, 0, "Blocked scripted spawn was marked complete instead of pending.");
const retriedScripted = spawnExpansionIntrusions({
  ...scriptedAtCap,
  waveTick: 9,
  intrusions: scriptedAtCap.intrusions.slice(1),
});
expectEqual(retriedScripted.waveScriptedSpawnIndex, 1, "Blocked scripted spawn was not retried.");
expectEqual(retriedScripted.intrusions.some((intrusion) => intrusion.kind === "goliath"), true, "Retried scripted Goliath did not spawn before cadence enemies.");
const finalWave = levelFive.config.waves[4];
const quotaReserved = spawnExpansionIntrusions({
  ...levelFive,
  phase: "active",
  waveIndex: 4,
  waveTick: finalWave.spawnFirstTick,
  waveSpawnedCount: finalWave.maxSpawnedIntrusions - 1,
});
expectEqual(quotaReserved.waveSpawnedCount, finalWave.maxSpawnedIntrusions - 1, "Cadence spawn consumed the scripted Goliath quota.");

// Use authored Level 5 terrain and legal placements. A Goliath destroys damaged
// ICE before a Hunter moves; generic targets must retain their start-of-tick snapshot.
let genericTargetBase = levelFive;
for (const position of listExpansionPositions(genericTargetBase.grid)) {
  genericTargetBase = applyExpansionCommand(genericTargetBase, { type: "sellUnit", position });
}
for (const [unit, x, y] of [["turret", 1, 0], ["firewall", 2, 1], ["firewall", 3, 0], ["relay", 4, 1]] as const) {
  genericTargetBase = applyExpansionCommand(genericTargetBase, { type: "placeUnit", unit, position: { x, y } });
  expectEqual(getExpansionTile(genericTargetBase.grid, { x, y }).kind, unit, "Generic-target regression fixture requires a legal placement.");
}
const genericTargetState: ExpansionGameState = {
  ...genericTargetBase,
  tickCount: 1_000,
  waveIndex: 4,
  phase: "active",
  grid: setExpansionTile(genericTargetBase.grid, { x: 1, y: 0 }, { kind: "turret", hp: 1 }),
  intrusions: [
    testIntrusion(genericTargetBase, 1, "goliath", { x: 2, y: 0 }, 996),
    testIntrusion(genericTargetBase, 2, "hunter", { x: 1, y: 1 }, 996),
  ],
};
const genericTargetMoved = moveExpansionIntrusions(genericTargetState);
expectEqual(getExpansionTile(genericTargetMoved.grid, { x: 1, y: 0 }).kind, "corrupted", "Goliath did not destroy the fixture's damaged ICE.");
expectDeepEqual(genericTargetMoved.intrusions.find((intrusion) => intrusion.kind === "hunter")?.position, { x: 1, y: 0 }, "Chapter 1 Hunter refreshed targets after an earlier enemy's chew.");
expectEqual(getExpansionTile(genericTargetState.grid, { x: 1, y: 0 }).kind, "turret", "Movement mutated the input grid.");

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

const chapterTwo = createExpansionGameState({ levelId: 6, contentHash: getExpansionLevelContentHash(6), seed: "sapper-production" });
let priorityGrid = createExpansionGrid(8);
priorityGrid = setExpansionTile(priorityGrid, { x: 1, y: 3 }, { kind: "relay", hp: 6 });
priorityGrid = setExpansionTile(priorityGrid, { x: 5, y: 3 }, { kind: "firewall", hp: 24 });
const productionSapper = {
  id: 51,
  kind: "sapper" as const,
  hp: 16,
  maxHp: 16,
  position: { x: 0, y: 3 },
  previousPosition: { x: 0, y: 3 },
  spawnedTick: 0,
  lastMoveTick: 0,
  corruption: null,
};
const priorityState: ExpansionGameState = { ...chapterTwo, tickCount: 2, phase: "active", grid: priorityGrid, intrusions: [productionSapper] };
expectDeepEqual(getExpansionSapperTarget(priorityState, productionSapper)?.position, { x: 5, y: 3 }, "Production Sapper did not prefer a reachable Firewall over a nearer Relay.");
const waitingSapper = moveExpansionIntrusions({ ...priorityState, tickCount: 1 });
expectDeepEqual(waitingSapper.intrusions[0]?.position, productionSapper.position, "Production Sapper moved before its two-tick cadence.");
const movedSapper = moveExpansionIntrusions(priorityState);
expectEqual(sameExpansionPosition(movedSapper.intrusions[0]!.position, productionSapper.position), false, "Production Sapper did not move on its two-tick cadence.");

let chewGrid = createExpansionGrid(8);
chewGrid = setExpansionTile(chewGrid, { x: 5, y: 3 }, { kind: "firewall", hp: 24 });
const chewed = moveExpansionIntrusions({ ...priorityState, grid: chewGrid, intrusions: [{ ...productionSapper, position: { x: 4, y: 3 }, previousPosition: { x: 4, y: 3 } }] });
expectEqual(getExpansionTile(chewed.grid, { x: 5, y: 3 }).hp, 16, "Production Sapper chew damage drifted from eight.");

let pulseGrid = createExpansionGrid(8);
pulseGrid = setExpansionTile(pulseGrid, { x: 3, y: 2 }, { kind: "relay", hp: 6 });
pulseGrid = setExpansionTile(pulseGrid, { x: 4, y: 3 }, { kind: "firewall", hp: 24 });
pulseGrid = setExpansionTile(pulseGrid, { x: 2, y: 3 }, { kind: "turret", hp: 10 });
pulseGrid = setExpansionTile(pulseGrid, { x: 7, y: 7 }, { kind: "turret", hp: 10 });
pulseGrid = setExpansionTile(pulseGrid, { x: 4, y: 4 }, { kind: "relay", hp: 6 });
const pulseState: ExpansionGameState = {
  ...chapterTwo,
  tickCount: 20,
  phase: "active",
  config: { ...chapterTwo.config, turretRange: 10 },
  grid: pulseGrid,
  intrusions: [{ ...productionSapper, id: 52, hp: 4, position: { x: 3, y: 3 }, previousPosition: { x: 3, y: 3 } }],
};
const pulsed = applyExpansionTurretCombat(pulseState);
expectEqual(pulsed.intrusions.length, 0, "Production ICE did not neutralize the Sapper.");
expectEqual(pulsed.events.find((event) => event.type === "sapperDeathPulse")?.affectedHardware, 3, "Production Sapper pulse did not hit exactly three orthogonal hardware tiles.");
expectEqual(getExpansionTile(pulsed.grid, { x: 3, y: 2 }).kind, "empty", "Production Sapper pulse did not remove the adjacent Relay.");
expectEqual(pulsed.events.some((event) => event.type === "hardwareDestroyed" && event.cause === "deathPulse"), true, "Production Sapper pulse omitted its hardware-destruction event.");
expectEqual(getExpansionTile(pulsed.grid, { x: 4, y: 3 }).hp, 18, "Production Sapper pulse damage drifted from six.");
expectEqual(getExpansionTile(pulsed.grid, { x: 2, y: 3 }).hp, 4, "Production Sapper pulse did not damage adjacent ICE exactly once.");
expectEqual(getExpansionTile(pulsed.grid, { x: 7, y: 7 }).hp, 10, "Production Sapper pulse escaped its orthogonal one-tile radius.");
expectEqual(getExpansionTile(pulsed.grid, { x: 4, y: 4 }).hp, 6, "Production Sapper pulse damaged diagonal hardware.");
expectThrows(
  () => applyExpansionTurretCombat({
    ...pulseState,
    config: { ...pulseState.config, enemies: { ...pulseState.config.enemies, sapper: { ...pulseState.config.enemies.sapper, deathPulseRange: 2 } } },
  }),
  Error,
  "An enabled Sapper pulse with an unsupported range must fail instead of silently disappearing.",
);
const disabledPulse = applyExpansionTurretCombat({
  ...pulseState,
  config: { ...pulseState.config, enemies: { ...pulseState.config.enemies, sapper: { ...pulseState.config.enemies.sapper, deathPulseDamage: 0, deathPulseRange: 0 } } },
});
expectEqual(disabledPulse.events.some((event) => event.type === "sapperDeathPulse"), false, "A disabled Sapper pulse must remain a no-op.");
expectDeepEqual(disabledPulse.grid, pulseState.grid, "A disabled Sapper pulse damaged hardware.");

// Production uses the common persistent Core-contact rule. The isolated lab's
// one-shot Core arrival is a demonstration simplification, not this contract.
const coreApproach = { x: chapterTwo.config.core.x - 1, y: chapterTwo.config.core.y };
let sapperAtCore: ExpansionGameState = {
  ...chapterTwo,
  tickCount: 1,
  phase: "active",
  grid: createExpansionGrid(8),
  waveSpawnedCount: chapterTwo.config.waves[0].maxSpawnedIntrusions,
  waveScriptedSpawnIndex: chapterTwo.config.waves[0].scriptedSpawns?.length ?? 0,
  intrusions: [testIntrusion(chapterTwo, 1, "sapper", coreApproach, 0)],
};
for (let contactTick = 1; contactTick <= 3; contactTick += 1) {
  const previousIntegrity = sapperAtCore.coreIntegrity;
  sapperAtCore = tickExpansion(sapperAtCore);
  expectEqual(sapperAtCore.intrusions.length, 1, "Production Sapper disappeared after Core contact.");
  expectDeepEqual(sapperAtCore.intrusions[0]?.position, chapterTwo.config.core, "Sapper did not remain at the Core without hardware targets.");
  const breachEvents = sapperAtCore.events.filter((event) => event.type === "coreBreach");
  expectEqual(breachEvents.length, 1, "Sapper did not emit exactly one Core-contact event per active tick.");
  expectEqual(breachEvents[0]?.amount, 2, "Sapper Core contact must deal two damage per active tick.");
  expectEqual(sapperAtCore.coreIntegrity, previousIntegrity - chapterTwo.config.coreIntegrityDrainPerSeveredTick - 2, "Sapper contact was not applied independently of severed-route drain.");
  expectEqual(sapperAtCore.events.some((event) => event.type === "sapperDeathPulse"), false, "Core contact incorrectly triggered a Sapper death pulse.");
}

// Level 9 has hardware east and south of the Splitter. The added ICE blocks
// west; only its own tile and a Relay cleared by an earlier pulse can spawn children.
let splitPulseBase = createExpansionGameState({ levelId: 9, contentHash: getExpansionLevelContentHash(9), seed: "splitter-pulse-order" });
for (const [unit, x, y] of [["turret", 3, 3], ["relay", 4, 2]] as const) {
  splitPulseBase = applyExpansionCommand(splitPulseBase, { type: "placeUnit", unit, position: { x, y } });
  expectEqual(getExpansionTile(splitPulseBase.grid, { x, y }).kind, unit, "Splitter/pulse regression fixture requires a legal placement.");
}
for (const sapperFirst of [true, false]) {
  const sapper = { ...testIntrusion(splitPulseBase, sapperFirst ? 1 : 2, "sapper", { x: 3, y: 2 }, 0), hp: 4 };
  const splitter = { ...testIntrusion(splitPulseBase, sapperFirst ? 2 : 1, "splitter", { x: 4, y: 3 }, 0), hp: 4 };
  const expectedChildren = sapperFirst ? [{ x: 4, y: 3 }, { x: 4, y: 2 }] : [{ x: 4, y: 3 }];
  let orderedResult: ExpansionGameState | undefined;
  for (const reversedInput of [false, true]) {
    const afterDeaths = applyExpansionTurretCombat({
      ...splitPulseBase,
      tickCount: 20,
      phase: "active",
      intrusions: reversedInput ? [splitter, sapper] : [sapper, splitter],
      nextIntrusionId: 3,
    });
    expectDeepEqual(afterDeaths.intrusions.map((intrusion) => intrusion.position), expectedChildren, "Splitter children did not use the grid at their ID-ordered death resolution.");
    expectEqual(getExpansionTile(afterDeaths.grid, { x: 4, y: 2 }).kind, "empty", "Sapper did not clear the adjacent Relay.");
    expectEqual(getExpansionTile(splitPulseBase.grid, { x: 4, y: 2 }).kind, "relay", "Death processing mutated the input grid.");
    const deathEvents = afterDeaths.events.filter((event) => event.type === "sapperDeathPulse" || event.type === "intrusionSplit");
    expectDeepEqual(deathEvents.map((event) => event.type), sapperFirst ? ["sapperDeathPulse", "intrusionSplit"] : ["intrusionSplit", "sapperDeathPulse"], "Sapper/Splitter death order did not follow intrusion IDs.");
    if (orderedResult) {
      expectDeepEqual(afterDeaths.intrusions, orderedResult.intrusions, "Input array order changed ID-ordered child spawning.");
      expectDeepEqual(deathEvents, orderedResult.events.filter((event) => event.type === "sapperDeathPulse" || event.type === "intrusionSplit"), "Input array order changed ID-ordered death events.");
    }
    orderedResult = afterDeaths;
  }
}

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
for (const seed of [null, 42, {}]) {
  expectThrows(
    () => replayExpansionRun({ ...replay, seed } as unknown as ExpansionReplayInput),
    ExpansionReplayError,
    "Expansion replay accepted a non-string seed.",
  );
}
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

console.log("Expansion simulator verification passed: placement, paid Scrubber lifecycle, spawn guard, frozen generic targets, Sapper/Splitter death ordering, Sapper priority/chew/pulse, trap ordering, replay identity, and determinism.");

function testIntrusion(state: ExpansionGameState, id: number, kind: ExpansionIntrusionState["kind"], position: ExpansionIntrusionState["position"], lastMoveTick: number): ExpansionIntrusionState {
  const hp = state.config.enemies[kind].maxHp;
  return { id, kind, hp, maxHp: hp, position, previousPosition: position, spawnedTick: 0, lastMoveTick, corruption: null };
}

function expectEqual<T>(actual: T, expected: T, message: string): void { if (actual !== expected) throw new Error(message); }
function expectDeepEqual(actual: unknown, expected: unknown, message: string): void { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(message); }
function expectThrows(callback: () => void, errorType: new (message: string) => Error, message: string): void { try { callback(); } catch (error) { if (error instanceof errorType) return; throw error; } throw new Error(message); }
