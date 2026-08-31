import { ENEMY_TUNING } from "../src/data/enemies";
import { EXPANSION_1_R1_TUNING } from "../src/data/campaigns/expansion/tuning";
import { EXPANSION_LEVELS } from "../src/data/campaigns/expansion";
import { replayRun } from "../src/sim/replay";
import {
  CHAPTER_02_ENEMY_PROTOTYPES,
  SAPPER_PROTOTYPE,
  createSapperPrototypeIntrusion,
  getChapter02EnemyPrototype,
  selectSapperPrototypeTarget,
  stepSapperPrototype,
  type SapperPrototypeHardware,
  type SapperPrototypeState,
} from "../src/sim/expansion/sapperPrototype";

const ENTRY = { x: 0, y: 3 };
const CORE = { x: 7, y: 3 };

// SA-01: identity remains isolated from current and playable expansion content.
expectEqual(Object.hasOwn(ENEMY_TUNING, "sapper"), false, "SA-01 changed current enemy tuning.");
expectEqual(getChapter02EnemyPrototype("sapper"), SAPPER_PROTOTYPE, "SA-01 Sapper lookup failed.");
expectEqual(getChapter02EnemyPrototype("hunter"), undefined, "SA-01 leaked existing enemies into the Chapter 2 prototype.");
expectDeepEqual(Object.keys(CHAPTER_02_ENEMY_PROTOTYPES), ["sapper"], "SA-01 prototype registry drifted.");
expectEqual(JSON.stringify(EXPANSION_LEVELS).includes("sapper"), false, "SA-01 leaked Sapper into playable Chapter 1 content.");

// SA-02: exact proposed constants remain reviewable in one frozen object.
expectDeepEqual(SAPPER_PROTOTYPE, {
  id: "sapper",
  maxHp: 16,
  moveEveryTicks: 2,
  corruptionTicks: 4,
  spawnBatchSize: 1,
  chewDamage: 8,
  coreContactDamage: 2,
  deathPulseDamage: 6,
  deathPulseRange: 1,
  targeting: "firewallThenHardware",
  onDeathSpawn: null,
  specialMovement: null,
}, "SA-02 proposed Sapper contract drifted.");

// SA-03: strict Firewall preference beats a nearer Relay.
const priorityState = createState({
  hardware: [
    hardware("relay", 1, 3, 6),
    hardware("firewall", 5, 3, 24),
  ],
});
expectDeepEqual(
  selectSapperPrototypeTarget(priorityState, priorityState.intrusions[0]!)?.position,
  { x: 5, y: 3 },
  "SA-03 Sapper did not prefer the reachable Firewall.",
);

// SA-04: equal path lengths resolve by y, then x.
const tieState = createState({
  hardware: [
    hardware("firewall", 2, 4, 24),
    hardware("firewall", 2, 2, 24),
  ],
});
expectDeepEqual(
  selectSapperPrototypeTarget(tieState, tieState.intrusions[0]!)?.position,
  { x: 2, y: 2 },
  "SA-04 equal targets did not resolve in stable board order.",
);

// SA-05: move only every two ticks and chew for exactly eight.
let cadence = createState({
  tickCount: 0,
  lastMoveTick: 0,
  hardware: [hardware("firewall", 2, 3, 24)],
});
cadence = stepSapperPrototype(cadence);
cadence = stepSapperPrototype(cadence);
expectDeepEqual(cadence.intrusions[0]?.position, ENTRY, "SA-05 moved before the two-tick cadence.");
cadence = stepSapperPrototype(cadence);
expectDeepEqual(cadence.intrusions[0]?.position, { x: 1, y: 3 }, "SA-05 eligible move drifted.");
cadence = stepSapperPrototype(cadence);
cadence = stepSapperPrototype(cadence);
expectEqual(cadence.hardware[0]?.hp, 16, "SA-05 chew damage was not exactly eight.");

// SA-06: four real Expansion ICE hits neutralize exactly one Sapper.
expectEqual(EXPANSION_1_R1_TUNING.turretDamagePerTick, 4, "SA-06 Expansion ICE damage drifted.");
const stationary = createState({
  lastMoveTick: 100,
  iceCoverage: [ENTRY],
});
const fourHits = runTicks(stationary, 4);
expectEqual(fourHits.intrusions.length, 0, "SA-06 four ICE hits did not neutralize the Sapper.");
expectEqual(fourHits.neutralizedCount, 1, "SA-06 neutralized count drifted.");

// SA-07: the pulse hits each orthogonal neighbor once and excludes diagonals.
const pulseState = createState({
  lastMoveTick: 100,
  intrusionHp: 4,
  iceCoverage: [ENTRY],
  hardware: [
    hardware("relay", 0, 2, 6),
    hardware("turret", 1, 3, 10),
    hardware("scrubber", 1, 2, 8),
  ],
});
const pulsed = stepSapperPrototype(pulseState);
expectDeepEqual(
  pulsed.events.filter((event) => event.type === "hardwarePulseDamaged").map((event) => event.position),
  [{ x: 0, y: 2 }, { x: 1, y: 3 }],
  "SA-07 pulse area or board-order resolution drifted.",
);
expectEqual(pulsed.hardware.some((item) => item.kind === "scrubber" && item.hp === 8), true, "SA-07 damaged a diagonal Scrubber.");

// SA-08/SA-09: same Sapper/ICE timing, spacing alone changes the outcome.
const safe = runFormation("safe");
const clustered = runFormation("clustered");
expectDeepEqual(safe, {
  neutralized: 1,
  pulseAffected: 0,
  remaining: [
    ["relay", 6],
    ["firewall", 24],
    ["turret", 10],
  ],
}, "SA-08 standoff counter drifted.");
expectDeepEqual(clustered, {
  neutralized: 1,
  pulseAffected: 3,
  remaining: [
    ["firewall", 18],
    ["turret", 4],
  ],
}, "SA-09 clustered failure drifted.");

// SA-10: repeated fixed input yields identical full state and event output.
const repeatInput = createFormation("clustered");
expectDeepEqual(runTicks(repeatInput, 8), runTicks(repeatInput, 8), "SA-10 prototype is not deterministic.");

// SA-11/SA-12: frozen representative V2 result and Chapter 1 envelope remain unchanged.
const legacyRegression = replayRun({ seed: "golden-loss-1", sector: 1, commands: [] });
expectEqual(legacyRegression.state.tickCount, 84, "SA-11 golden loss tick count drifted.");
expectEqual(legacyRegression.score.total, 38, "SA-11 golden loss score drifted.");
expectDeepEqual(EXPANSION_LEVELS.map((level) => level.id), [1, 2, 3, 4, 5], "SA-12 Chapter 1 level envelope drifted.");
expectEqual(EXPANSION_LEVELS.reduce((total, level) => total + level.waves.length, 0), 25, "SA-12 Chapter 1 wave envelope drifted.");

console.log("Sapper prototype verification passed.");

function createState(input: Readonly<{
  tickCount?: number;
  lastMoveTick?: number;
  intrusionHp?: number;
  hardware?: readonly SapperPrototypeHardware[];
  iceCoverage?: readonly Readonly<{ x: number; y: number }>[];
}> = {}): SapperPrototypeState {
  const intrusion = createSapperPrototypeIntrusion({
    id: 1,
    position: ENTRY,
    lastMoveTick: input.lastMoveTick ?? 0,
  });
  return {
    gridSize: 8,
    tickCount: input.tickCount ?? 0,
    core: CORE,
    voidTiles: [],
    hardware: input.hardware ?? [],
    iceCoverage: input.iceCoverage ?? [],
    intrusions: [{ ...intrusion, hp: input.intrusionHp ?? intrusion.hp }],
    events: [],
    neutralizedCount: 0,
    coreDamage: 0,
  };
}

function createFormation(mode: "safe" | "clustered"): SapperPrototypeState {
  const clustered = mode === "clustered";
  return createState({
    hardware: clustered
      ? [
          hardware("relay", 3, 2, 6),
          hardware("firewall", 4, 3, 24),
          hardware("turret", 3, 4, 10),
        ]
      : [
          hardware("relay", 5, 1, 6),
          hardware("firewall", 5, 3, 24),
          hardware("turret", 5, 5, 10),
        ],
    iceCoverage: [{ x: 2, y: 3 }, { x: 3, y: 3 }],
  });
}

function runFormation(mode: "safe" | "clustered") {
  const result = runTicks(createFormation(mode), 8);
  const pulse = result.events.find((event) => event.type === "sapperDeathPulse");
  return {
    neutralized: result.neutralizedCount,
    pulseAffected: pulse?.affectedHardware ?? -1,
    remaining: result.hardware.map((item) => [item.kind, item.hp] as const),
  };
}

function runTicks(initial: SapperPrototypeState, count: number): SapperPrototypeState {
  let state = initial;
  for (let index = 0; index < count; index += 1) state = stepSapperPrototype(state);
  return state;
}

function hardware(
  kind: SapperPrototypeHardware["kind"],
  x: number,
  y: number,
  hp: number,
): SapperPrototypeHardware {
  return { kind, position: { x, y }, hp };
}

function expectEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`${message} Expected ${String(expected)}, received ${String(actual)}.`);
}

function expectDeepEqual(actual: unknown, expected: unknown, message: string): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) throw new Error(`${message} Expected ${expectedJson}, received ${actualJson}.`);
}
