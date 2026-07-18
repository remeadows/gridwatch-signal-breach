import { ENEMY_TUNING } from "../src/data/enemies";
import { UNIT_TUNING } from "../src/data/units";
import { replayRun } from "../src/sim/replay";
import {
  EXPANSION_ENEMY_PROTOTYPES,
  RUSHER_PROTOTYPE,
  createRusherPrototypeIntrusion,
  getExpansionEnemyPrototype,
  stepRusherPrototype,
  type RusherPrototypeState,
} from "../src/sim/expansion/rusherPrototype";
import {
  LATENCY_TRAP_CAPABILITIES,
  getNextEligibleMoveTick,
} from "../src/sim/expansion/latencyTrapPrototype";
import expansionFixture from "../docs/fixtures/expansion-v1-replay.json";
import {
  ReplayValidationError,
} from "../supabase/functions/submit-gridwatch-score/replayValidation";
import {
  assertExpansionContentPublished,
  canonicalizeExpansionReplay,
} from "../supabase/functions/submit-gridwatch-score/expansionReplayValidation";

const ENTRY = { x: 2, y: 3 };
const TRAP = { x: 3, y: 3 };
const EXIT = { x: 4, y: 3 };
const ROUTE = [ENTRY, TRAP, EXIT] as const;

// RU-01: Rusher identity exists only in the isolated expansion prototype.
expectEqual(Object.hasOwn(ENEMY_TUNING, "rusher"), false, "RU-01 changed current enemy tuning.");
expectEqual(getExpansionEnemyPrototype("rusher"), RUSHER_PROTOTYPE, "RU-01 Rusher lookup failed.");
expectEqual(getExpansionEnemyPrototype("probe"), undefined, "RU-01 leaked current enemies into expansion prototypes.");
expectDeepEqual(Object.keys(EXPANSION_ENEMY_PROTOTYPES), ["rusher"], "RU-01 prototype registry drifted.");
expectDeepEqual(
  RUSHER_PROTOTYPE,
  {
    id: "rusher",
    maxHp: 6,
    moveEveryTicks: 1,
    corruptionTicks: 6,
    spawnBatchSize: 1,
    chewDamage: 1,
    coreContactDamage: 1,
    targeting: "route",
    onDeathSpawn: null,
    specialMovement: null,
  },
  "RU-01 approved Rusher contract drifted.",
);

// RU-02: a Rusher moves once on each consecutive eligible active tick.
const cadenceStart = createState({ tickCount: 10, lastMoveTick: 9 });
const cadenceTick10 = stepRusherPrototype(cadenceStart);
const cadenceTick11 = stepRusherPrototype(cadenceTick10);
expectDeepEqual(cadenceTick10.intrusions.map((intrusion) => intrusion.position), [TRAP], "RU-02 tick-10 move drifted.");
expectDeepEqual(cadenceTick11.intrusions.map((intrusion) => intrusion.position), [EXIT], "RU-02 tick-11 move drifted.");
expectEqual(cadenceTick10.events.filter((event) => event.type === "rusherMoved").length, 1, "RU-02 moved more than once at tick 10.");
expectEqual(cadenceTick11.events.filter((event) => event.type === "rusherMoved").length, 1, "RU-02 moved more than once at tick 11.");

// RU-03: two real current-damage ICE combat steps neutralize exactly one Rusher.
expectEqual(UNIT_TUNING.turret.damagePerTick, 3, "RU-03 current ICE damage drifted.");
const iceStart = createState({
  tickCount: 10,
  lastMoveTick: 9,
  route: [TRAP],
  iceCoverage: [TRAP],
});
const afterFirstIce = stepRusherPrototype(iceStart);
const afterSecondIce = stepRusherPrototype(afterFirstIce);
expectEqual(afterFirstIce.intrusions[0]?.hp, 3, "RU-03 first ICE hit did not leave 3 HP.");
expectEqual(afterSecondIce.intrusions.length, 0, "RU-03 second ICE hit did not remove the Rusher.");
expectEqual(afterSecondIce.neutralizedCount, 1, "RU-03 neutralized count drifted.");

// RU-04: trap entry consumes a charge and makes the next move entryTick + 4.
const trapStart = createState({
  tickCount: 10,
  lastMoveTick: 9,
  traps: [{ position: TRAP, charges: 3 }],
});
const afterTrapEntry = stepRusherPrototype(trapStart);
expectEqual(afterTrapEntry.traps[0]?.charges, 2, "RU-04 did not consume one trap charge.");
expectEqual(getNextEligibleMoveTick(afterTrapEntry.intrusions[0]!), 14, "RU-04 next move tick drifted.");
expectDeepEqual(
  afterTrapEntry.events.filter((event) => event.type === "latencyTrapTriggered"),
  [{
    type: "latencyTrapTriggered",
    tick: 10,
    intrusionId: 1,
    position: TRAP,
    remainingCharges: 2,
    extraMoveDelayTicks: 3,
  }],
  "RU-04 trap event drifted.",
);

// RU-05: a delayed Rusher outside ICE coverage stays alive.
const delayedWithoutIce = stepRusherPrototype(afterTrapEntry);
expectEqual(delayedWithoutIce.intrusions[0]?.hp, 6, "RU-05 trap dealt damage without ICE.");
expectEqual(delayedWithoutIce.neutralizedCount, 0, "RU-05 trap neutralized without ICE.");

// RU-06: the trap is traversable and the delayed Rusher eventually exits it.
let traversed = afterTrapEntry;
while (traversed.tickCount <= 14) {
  traversed = stepRusherPrototype(traversed);
}
expectEqual(LATENCY_TRAP_CAPABILITIES.traversable, true, "RU-06 trap stopped being traversable.");
expectDeepEqual(traversed.intrusions[0]?.position, EXIT, "RU-06 Rusher did not leave the trap tile.");
expectEqual(traversed.intrusions[0]?.routeIndex, 2, "RU-06 route index drifted.");

// RU-07: a Firewall blocks entry and receives only the approved one damage.
const firewallStart = createState({
  tickCount: 10,
  lastMoveTick: 9,
  firewall: { position: TRAP, hp: 24 },
});
const afterFirewall = stepRusherPrototype(firewallStart);
expectDeepEqual(afterFirewall.intrusions[0]?.position, ENTRY, "RU-07 Rusher bypassed a Firewall.");
expectEqual(afterFirewall.firewall?.hp, 23, "RU-07 Rusher gained enhanced chew damage.");
expectDeepEqual(
  afterFirewall.events,
  [{
    type: "firewallDamaged",
    tick: 10,
    intrusionId: 1,
    position: TRAP,
    damage: 1,
    hp: 23,
  }],
  "RU-07 Firewall interaction drifted.",
);

// RU-08: repeated fixed prototype input yields an identical full state/event sequence.
const fixedScenario = createState({
  tickCount: 10,
  lastMoveTick: 9,
  traps: [{ position: TRAP, charges: 3 }],
  iceCoverage: [TRAP],
});
expectDeepEqual(
  runTicks(fixedScenario, 2),
  runTicks(fixedScenario, 2),
  "RU-08 repeated prototype sequence is not deterministic.",
);

// RU-09: the representative frozen current-campaign replay stays unchanged.
const legacyRegression = replayRun({ seed: "golden-loss-1", sector: 1, commands: [] });
expectEqual(legacyRegression.state.tickCount, 84, "RU-09 golden loss tick count drifted.");
expectEqual(legacyRegression.score.total, 38, "RU-09 golden loss score drifted.");

// RU-10: expansion replay remains stopped by the existing no-content guard.
expectThrows(
  () => assertExpansionContentPublished(canonicalizeExpansionReplay(expansionFixture, 5000)),
  (error: unknown) => error instanceof ReplayValidationError && /not published/.test(error.message),
  "RU-10 expansion no-content guard did not reject the replay.",
);

console.log("Rusher prototype verification passed.");

function createState(input: Readonly<{
  tickCount: number;
  lastMoveTick: number;
  route?: readonly Readonly<{ x: number; y: number }>[];
  traps?: RusherPrototypeState["traps"];
  iceCoverage?: RusherPrototypeState["iceCoverage"];
  firewall?: RusherPrototypeState["firewall"];
}>): RusherPrototypeState {
  const route = input.route ?? ROUTE;

  return {
    tickCount: input.tickCount,
    route,
    traps: input.traps ?? [],
    iceCoverage: input.iceCoverage ?? [],
    firewall: input.firewall ?? null,
    intrusions: [createRusherPrototypeIntrusion({
      id: 1,
      route,
      lastMoveTick: input.lastMoveTick,
    })],
    events: [],
    neutralizedCount: 0,
  };
}

function runTicks(initial: RusherPrototypeState, tickCount: number): readonly RusherPrototypeState[] {
  const states: RusherPrototypeState[] = [];
  let state = initial;

  for (let index = 0; index < tickCount; index += 1) {
    state = stepRusherPrototype(state);
    states.push(state);
  }

  return states;
}

function expectEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${String(expected)}, received ${String(actual)}.`);
  }
}

function expectDeepEqual(actual: unknown, expected: unknown, message: string): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    throw new Error(`${message} Expected ${expectedJson}, received ${actualJson}.`);
  }
}

function expectThrows(
  action: () => unknown,
  matches: (error: unknown) => boolean,
  message: string,
): void {
  try {
    action();
  } catch (error) {
    if (matches(error)) {
      return;
    }

    throw error;
  }

  throw new Error(message);
}
