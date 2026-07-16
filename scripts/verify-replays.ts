import { applyCommand } from "../src/sim/commands";
import type { RecordedCommand } from "../src/sim/replay";
import { ReplayError, replayRun } from "../src/sim/replay";
import { SIM_RULESET_ID } from "../src/sim/ruleset";
import { createGameState } from "../src/sim/state";
import { savePendingRun, takePendingRun } from "../src/leaderboard/pendingRun";
import promotionFixture from "../docs/fixtures/phase4-promotion-replay.json";
import {
  LEGACY_RULESET_ID,
  ReplayValidationError,
  canonicalizeCommands,
  categoryForRuleset,
  resolveRuleset,
} from "../supabase/functions/submit-gridwatch-score/replayValidation";

const WIN_COMMANDS: readonly RecordedCommand[] = [
  place(0, "turret", 1, 3),
  skip(0),
  place(5, "firewall", 6, 4),
  place(5, "turret", 5, 4),
  skip(5),
  place(32, "turret", 3, 3),
  skip(32),
  place(65, "firewall", 4, 4),
  place(65, "turret", 4, 5),
  skip(65),
  place(109, "firewall", 2, 4),
  place(109, "turret", 2, 5),
  skip(109),
];

expectEqual(promotionFixture.seed, "phase4-c", "Promotion replay seed drifted.");
expectEqual(promotionFixture.sector, 1, "Promotion replay sector drifted.");
expectDeepEqual(
  canonicalizeCommands(promotionFixture.commands, 5000),
  WIN_COMMANDS,
  "Promotion replay fixture is not canonical.",
);

const win = replayRun({
  seed: "phase4-c",
  sector: 1,
  commands: WIN_COMMANDS,
});
const repeatedWin = replayRun({
  seed: "phase4-c",
  sector: 1,
  commands: WIN_COMMANDS,
});

expectEqual(win.state.phase, "won", "Golden win must finish won.");
expectEqual(win.state.tickCount, 146, "Golden win tick count drifted.");
expectEqual(win.state.coreIntegrity, 150, "Golden win integrity drifted.");
expectEqual(win.score.total, 514, "Golden win score drifted.");
expectDeepEqual(repeatedWin, win, "Repeated replay must be byte-equivalent.");

const loss = replayRun({
  seed: "golden-loss-1",
  sector: 1,
  commands: [],
});

expectEqual(loss.state.phase, "lost", "Golden loss must finish lost.");
expectEqual(loss.state.tickCount, 84, "Golden loss tick count drifted.");
expectEqual(loss.score.total, 38, "Golden loss score drifted.");

const refundStart = createGameState({ seed: "refund-policy", sector: 1 });
const refundPlaced = applyCommand(refundStart, {
  type: "placeUnit",
  position: { x: 1, y: 3 },
  unit: "turret",
});
const refundInBuild = applyCommand(refundPlaced, {
  type: "sellUnit",
  position: { x: 1, y: 3 },
});
const refundActive = applyCommand(refundPlaced, { type: "skipPrep" });
const refundDuringWave = applyCommand(refundActive, {
  type: "sellUnit",
  position: { x: 1, y: 3 },
});

expectEqual(refundStart.bandwidth, 30, "Wave 1 grant drifted.");
expectEqual(refundPlaced.bandwidth, 16, "ICE cost drifted.");
expectEqual(refundInBuild.bandwidth, 30, "Build sale must fully refund ICE.");
expectEqual(refundDuringWave.bandwidth, 24, "Live sale must use the partial ICE refund.");

expectThrows(
  () =>
    replayRun({
      seed: "out-of-order",
      sector: 1,
      commands: [skip(1), skip(0)],
    }),
  (error: unknown) => error instanceof ReplayError && /out of order/.test(error.message),
);
expectThrows(
  () =>
    replayRun({
      seed: "phase4-c",
      sector: 1,
      commands: [...WIN_COMMANDS, skip(164)],
    }),
  (error: unknown) =>
    error instanceof ReplayError && /after the run ended/.test(error.message),
);

const legacy = resolveRuleset(undefined, SIM_RULESET_ID);
const current = resolveRuleset(SIM_RULESET_ID, SIM_RULESET_ID);

expectDeepEqual(legacy, { id: LEGACY_RULESET_ID, legacy: true }, "Legacy ruleset drifted.");
expectDeepEqual(current, { id: SIM_RULESET_ID, legacy: false }, "Current ruleset drifted.");
expectEqual(categoryForRuleset(legacy, "sector:1"), "sector:1", "Legacy category changed.");
expectEqual(
  categoryForRuleset(current, "sector:1"),
  `${SIM_RULESET_ID}:sector:1`,
  "Current category is not isolated.",
);
expectEqual(
  categoryForRuleset(current, "global"),
  `${SIM_RULESET_ID}:global`,
  "Current global selector is not isolated.",
);

const pendingStorage = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => pendingStorage.get(key) ?? null,
      removeItem: (key: string) => pendingStorage.delete(key),
      setItem: (key: string, value: string) => pendingStorage.set(key, value),
    },
  },
});

pendingStorage.set(
  "gridwatch.pendingRun",
  JSON.stringify({ seed: "pre-ruleset-oauth", sector: 1, commands: [] }),
);
expectEqual(
  takePendingRun()?.ruleset,
  LEGACY_RULESET_ID,
  "Unversioned OAuth pending runs must stay on the legacy validator.",
);
savePendingRun({
  ruleset: SIM_RULESET_ID,
  seed: "phase4-oauth",
  sector: 2,
  commands: [],
});
expectEqual(
  takePendingRun()?.ruleset,
  SIM_RULESET_ID,
  "Versioned OAuth pending runs must preserve their original ruleset.",
);
expectEqual(takePendingRun(), null, "Pending runs must be consumed exactly once.");

expectThrows(
  () => resolveRuleset("unknown", SIM_RULESET_ID),
  (error: unknown) => error instanceof ReplayValidationError,
);

expectDeepEqual(
  canonicalizeCommands(
    [
      {
        t: 0,
        ignored: true,
        c: { type: "skipPrep", ignored: true },
      },
    ],
    10,
  ),
  [{ t: 0, c: { type: "skipPrep" } }],
  "Canonicalization retained inert fields.",
);
expectThrows(
  () =>
    canonicalizeCommands(
      [
        {
          t: 0,
          c: {
            type: "placeUnit",
            position: { x: 1, y: 1 },
            unit: "rootkit",
          },
        },
      ],
      10,
    ),
  (error: unknown) => error instanceof ReplayValidationError,
);
expectThrows(
  () => canonicalizeCommands([skip(1), skip(0)], 10),
  (error: unknown) =>
    error instanceof ReplayValidationError && /out of order/.test(error.message),
);

console.log(`Replay verification passed for ${SIM_RULESET_ID}.`);

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
): void {
  try {
    action();
  } catch (error) {
    if (matches(error)) {
      return;
    }

    throw error;
  }

  throw new Error("Expected action to throw.");
}

function place(
  t: number,
  unit: "relay" | "firewall" | "turret" | "scrubber" | "overclock",
  x: number,
  y: number,
): RecordedCommand {
  return {
    t,
    c: {
      type: "placeUnit",
      position: { x, y },
      unit,
    },
  };
}

function skip(t: number): RecordedCommand {
  return {
    t,
    c: { type: "skipPrep" },
  };
}
