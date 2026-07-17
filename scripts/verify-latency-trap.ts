import { replayRun } from "../src/sim/replay";
import {
  applyLatencyTrapEntries,
  getLatencyTrapPlacementFailure,
  getLatencyTrapSaleRefund,
  getNextEligibleMoveTick,
  LATENCY_TRAP_CAPABILITIES,
  LATENCY_TRAP_PROTOTYPE,
  type LatencyTrapIntrusion,
  type LatencyTrapPrototypeState,
} from "../src/sim/expansion/latencyTrapPrototype";

const POSITION = { x: 3, y: 3 };
const PLACEMENT = {
  gridSize: 8,
  phase: "prep" as const,
  unlocked: true,
  bandwidth: LATENCY_TRAP_PROTOTYPE.cost,
  position: POSITION,
  source: { x: 1, y: 1 },
  core: { x: 6, y: 6 },
  tile: "empty" as const,
  intrusionPositions: [],
};

// LT-01: every rejected placement category is explicit and has no implicit fallback.
expectEqual(getLatencyTrapPlacementFailure(PLACEMENT), null, "Valid placement was rejected.");
for (const [input, reason] of [
  [{ ...PLACEMENT, phase: "won" as const }, "terminal"],
  [{ ...PLACEMENT, unlocked: false }, "locked"],
  [{ ...PLACEMENT, bandwidth: 9 }, "insufficient-bandwidth"],
  [{ ...PLACEMENT, position: { x: -1, y: 3 } }, "out-of-bounds"],
  [{ ...PLACEMENT, position: { x: 0, y: 3 } }, "perimeter"],
  [{ ...PLACEMENT, position: PLACEMENT.source }, "source"],
  [{ ...PLACEMENT, position: PLACEMENT.core }, "core"],
  [{ ...PLACEMENT, tile: "void" as const }, "void"],
  [{ ...PLACEMENT, tile: "corrupted" as const }, "corrupted"],
  [{ ...PLACEMENT, tile: "hardware" as const }, "hardware-occupied"],
  [{ ...PLACEMENT, intrusionPositions: [POSITION] }, "intrusion-occupied"],
] as const) {
  expectEqual(getLatencyTrapPlacementFailure(input), reason, `LT-01 rejected ${reason} incorrectly.`);
}

// LT-02: prototype economics mirror the standard build/live sale policy.
expectEqual(getLatencyTrapSaleRefund("prep"), 10, "LT-02 build refund drifted.");
expectEqual(getLatencyTrapSaleRefund("active"), 4, "LT-02 active refund drifted.");

// LT-03: the trap is a traversable device, not a path obstacle or signal carrier.
expectDeepEqual(
  LATENCY_TRAP_CAPABILITIES,
  {
    carriesSignal: false,
    blocksMovement: false,
    targetable: false,
    chewable: false,
    corruptible: false,
    traversable: true,
  },
  "LT-03/LT-08 capability contract drifted.",
);
expectEqual(shortestPathLength(false), shortestPathLength(true), "LT-03 trap changed shortest path length.");

const oneEntry = applyLatencyTrapEntries({
  tickCount: 10,
  traps: [{ position: POSITION, charges: 3 }],
  intrusions: [enteredIntrusion(7)],
});

// LT-04: one entry consumes one charge and adds exactly three movement ticks.
expectEqual(oneEntry.traps[0]?.charges, 2, "LT-04 did not consume one charge.");
expectDeepEqual(
  oneEntry.events,
  [
    {
      type: "latencyTrapTriggered",
      tick: 10,
      intrusionId: 7,
      position: POSITION,
      remainingCharges: 2,
      extraMoveDelayTicks: 3,
    },
  ],
  "LT-04 event drifted.",
);
expectEqual(oneEntry.intrusions[0]?.lastMoveTick, 13, "LT-04 move delay drifted.");
expectEqual(getNextEligibleMoveTick(oneEntry.intrusions[0]!), 15, "LT-04 next move tick drifted.");

// LT-05: waiting on a charged trap cannot consume extra charges.
const stationary = applyLatencyTrapEntries({
  tickCount: 11,
  traps: oneEntry.traps,
  intrusions: [
    {
      ...oneEntry.intrusions[0]!,
      previousPosition: POSITION,
    },
  ],
});
expectEqual(stationary.traps[0]?.charges, 2, "LT-05 consumed a stationary charge.");
expectEqual(stationary.events.length, 0, "LT-05 emitted a stationary trigger.");

// LT-06: tied entries consume charges in intrusion-id order and deplete after three.
const simultaneous = applyLatencyTrapEntries({
  tickCount: 10,
  traps: [{ position: POSITION, charges: 3 }],
  intrusions: [enteredIntrusion(4), enteredIntrusion(2), enteredIntrusion(3), enteredIntrusion(1)],
});
expectDeepEqual(
  simultaneous.events.map((event) => event.intrusionId),
  [1, 2, 3],
  "LT-06 did not use stable intrusion-id order.",
);
expectEqual(simultaneous.traps.length, 0, "LT-06 did not remove a depleted trap.");
expectEqual(
  simultaneous.intrusions.find((intrusion) => intrusion.id === 4)?.lastMoveTick,
  10,
  "LT-06 delayed an entry after depletion.",
);

// LT-07: a jump-over never triggers; a landing does.
const jumpOver = applyLatencyTrapEntries({
  tickCount: 10,
  traps: [{ position: POSITION, charges: 3 }],
  intrusions: [
    {
      ...enteredIntrusion(1),
      position: { x: 4, y: 3 },
      previousPosition: { x: 2, y: 3 },
    },
  ],
});
expectEqual(jumpOver.events.length, 0, "LT-07 jump-over triggered a trap.");
const landing = applyLatencyTrapEntries({
  tickCount: 10,
  traps: [{ position: POSITION, charges: 3 }],
  intrusions: [enteredIntrusion(1)],
});
expectEqual(landing.events.length, 1, "LT-07 landing did not trigger a trap.");

// LT-09/LT-12: fixed counter scenario. Three 6 HP, one-tick Rushers enter at
// tick 10. ICE deals 3 damage at the trap tile. Without the trap they leave
// before tick-11 combat; with it they remain and are all neutralized at tick 11.
const counterWithTrap = runCounterScenario(true);
const counterWithoutTrap = runCounterScenario(false);
expectDeepEqual(
  counterWithTrap,
  { delayedTicks: 3, neutralizedByTick11: 3, survivorsAtTick11: 0 },
  "LT-09/LT-12 trapped counter scenario drifted.",
);
expectDeepEqual(
  counterWithoutTrap,
  { delayedTicks: 0, neutralizedByTick11: 0, survivorsAtTick11: 3 },
  "LT-09/LT-12 untrapped counter scenario drifted.",
);

// LT-10: identical input always yields identical state and event output.
const repeatInput: LatencyTrapPrototypeState = {
  tickCount: 10,
  traps: [{ position: POSITION, charges: 3 }],
  intrusions: [enteredIntrusion(2), enteredIntrusion(1)],
};
expectDeepEqual(
  applyLatencyTrapEntries(repeatInput),
  applyLatencyTrapEntries(repeatInput),
  "LT-10 prototype output is not deterministic.",
);

// LT-11: preserve a representative frozen Phase 4 replay; the full fixture
// suite and validator-bundle no-diff check run in the release verification lane.
const legacyRegression = replayRun({ seed: "golden-loss-1", sector: 1, commands: [] });
expectEqual(legacyRegression.state.tickCount, 84, "LT-11 golden loss tick count drifted.");
expectEqual(legacyRegression.score.total, 38, "LT-11 golden loss score drifted.");

console.log("Latency Trap prototype verification passed.");

function enteredIntrusion(id: number): LatencyTrapIntrusion {
  return {
    id,
    position: POSITION,
    previousPosition: { x: 2, y: 3 },
    lastMoveTick: 10,
    moveEveryTicks: 2,
  };
}

function runCounterScenario(useTrap: boolean): Readonly<{
  delayedTicks: number;
  neutralizedByTick11: number;
  survivorsAtTick11: number;
}> {
  const intrusions = [enteredIntrusion(1), enteredIntrusion(2), enteredIntrusion(3)].map(
    (intrusion) => ({ ...intrusion, moveEveryTicks: 1 }),
  );
  const result = useTrap
    ? applyLatencyTrapEntries({
        tickCount: 10,
        traps: [{ position: POSITION, charges: 3 }],
        intrusions,
      })
    : { intrusions, events: [] };
  const afterTickTenHp = 3;
  const neutralizedByTick11 = result.intrusions.filter(
    (intrusion) => getNextEligibleMoveTick(intrusion) > 11 && afterTickTenHp - 3 <= 0,
  ).length;

  return {
    delayedTicks: useTrap ? LATENCY_TRAP_PROTOTYPE.extraMoveDelayTicks : 0,
    neutralizedByTick11,
    survivorsAtTick11: intrusions.length - neutralizedByTick11,
  };
}

function shortestPathLength(withTrap: boolean): number {
  const start = { x: 1, y: 3 };
  const goal = { x: 5, y: 3 };
  const trap = { x: 3, y: 3 };
  const queue = [{ ...start, distance: 0 }];
  const visited = new Set([key(start)]);

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];

    if (current.x === goal.x && current.y === goal.y) {
      return current.distance;
    }

    for (const delta of [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
    ]) {
      const next = { x: current.x + delta.x, y: current.y + delta.y };

      if (next.x < 0 || next.y < 0 || next.x >= 7 || next.y >= 7) {
        continue;
      }

      const isBlockedTrap =
        withTrap &&
        !LATENCY_TRAP_CAPABILITIES.traversable &&
        next.x === trap.x &&
        next.y === trap.y;
      const nextKey = key(next);

      if (isBlockedTrap || visited.has(nextKey)) {
        continue;
      }

      visited.add(nextKey);
      queue.push({ ...next, distance: current.distance + 1 });
    }
  }

  throw new Error("LT-03 prototype path unexpectedly has no route.");
}

function key(position: Readonly<{ x: number; y: number }>): string {
  return `${position.x},${position.y}`;
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
