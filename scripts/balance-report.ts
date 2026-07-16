import { applyCommand } from "../src/sim/commands";
import { calculateScore } from "../src/sim/scoring";
import { SIM_RULESET_ID } from "../src/sim/ruleset";
import { createGameState } from "../src/sim/state";
import { tick } from "../src/sim/tick";
import type { GameState, GridPosition, UnitKind } from "../src/sim/types";
import { assertWithinTickBudget } from "./simulationLimits";

const FIXED_SEEDS = [
  "phase4-a",
  "phase4-b",
  "phase4-c",
  "gridwatch-signal-breach-phase-3",
] as const;

type Placement = Readonly<{
  unit: UnitKind;
  position: GridPosition;
}>;

type BuildPlan = readonly (readonly Placement[])[];

// Human-readable, deterministic plans discovered with scripts/search-balance.ts
// and then replayed unchanged across every fixed seed. They are intentionally
// compact rather than exhaustive: each sector uses the tools it is meant to
// teach, and later grants leave room for a player to adapt.
const GUIDED_PLANS: Readonly<Record<number, BuildPlan>> = {
  1: [
    [{ unit: "turret", position: { x: 1, y: 3 } }],
    [
      { unit: "firewall", position: { x: 6, y: 4 } },
      { unit: "turret", position: { x: 5, y: 4 } },
    ],
    [{ unit: "turret", position: { x: 3, y: 3 } }],
    [
      { unit: "firewall", position: { x: 4, y: 4 } },
      { unit: "turret", position: { x: 4, y: 5 } },
    ],
    [
      { unit: "firewall", position: { x: 2, y: 4 } },
      { unit: "turret", position: { x: 2, y: 5 } },
    ],
  ],
  2: [
    [
      { unit: "turret", position: { x: 5, y: 1 } },
      { unit: "turret", position: { x: 1, y: 5 } },
      { unit: "firewall", position: { x: 6, y: 2 } },
    ],
    [
      { unit: "turret", position: { x: 2, y: 4 } },
      { unit: "turret", position: { x: 0, y: 5 } },
    ],
    [
      { unit: "turret", position: { x: 2, y: 0 } },
      { unit: "turret", position: { x: 6, y: 0 } },
      { unit: "turret", position: { x: 0, y: 3 } },
    ],
    [
      { unit: "turret", position: { x: 0, y: 3 } },
      { unit: "turret", position: { x: 6, y: 0 } },
    ],
  ],
  3: [
    [
      { unit: "turret", position: { x: 6, y: 2 } },
      { unit: "turret", position: { x: 3, y: 7 } },
      { unit: "turret", position: { x: 2, y: 5 } },
      { unit: "turret", position: { x: 6, y: 5 } },
    ],
    [
      { unit: "turret", position: { x: 7, y: 3 } },
      { unit: "turret", position: { x: 7, y: 6 } },
      { unit: "firewall", position: { x: 6, y: 1 } },
    ],
    [{ unit: "overclock", position: { x: 7, y: 2 } }],
  ],
};

type Scenario = Readonly<{
  name: string;
  configure: (state: GameState) => GameState;
}>;

type RunResult = Readonly<{
  cleared: boolean;
  stoppedAtWave: number;
  integrity: number;
  bandwidth: number;
  neutralized: number;
  uptimePercent: number;
  score: number;
  corruptedTiles: number;
  remainingUnits: number;
}>;

const EXPECTED_PHASE4_RUNS: Readonly<Record<number, readonly RunResult[]>> = {
  1: [
    { cleared: true, stoppedAtWave: 5, integrity: 150, bandwidth: 48, neutralized: 24, uptimePercent: 100, score: 514, corruptedTiles: 1, remainingUnits: 10 },
    { cleared: true, stoppedAtWave: 5, integrity: 113, bandwidth: 49, neutralized: 24, uptimePercent: 74, score: 451, corruptedTiles: 1, remainingUnits: 10 },
    { cleared: true, stoppedAtWave: 5, integrity: 150, bandwidth: 48, neutralized: 24, uptimePercent: 100, score: 514, corruptedTiles: 1, remainingUnits: 10 },
    { cleared: true, stoppedAtWave: 5, integrity: 88, bandwidth: 50, neutralized: 24, uptimePercent: 64, score: 417, corruptedTiles: 1, remainingUnits: 10 },
  ],
  2: [
    { cleared: true, stoppedAtWave: 9, integrity: 62, bandwidth: 24, neutralized: 48, uptimePercent: 68, score: 622, corruptedTiles: 3, remainingUnits: 10 },
    { cleared: true, stoppedAtWave: 9, integrity: 150, bandwidth: 20, neutralized: 46, uptimePercent: 89, score: 709, corruptedTiles: 0, remainingUnits: 13 },
    { cleared: true, stoppedAtWave: 9, integrity: 150, bandwidth: 17, neutralized: 42, uptimePercent: 84, score: 662, corruptedTiles: 0, remainingUnits: 13 },
    { cleared: true, stoppedAtWave: 9, integrity: 149, bandwidth: 25, neutralized: 46, uptimePercent: 85, score: 706, corruptedTiles: 0, remainingUnits: 13 },
  ],
  3: [
    { cleared: true, stoppedAtWave: 12, integrity: 150, bandwidth: 46, neutralized: 44, uptimePercent: 100, score: 713, corruptedTiles: 2, remainingUnits: 9 },
    { cleared: true, stoppedAtWave: 12, integrity: 150, bandwidth: 57, neutralized: 38, uptimePercent: 100, score: 658, corruptedTiles: 1, remainingUnits: 9 },
    { cleared: true, stoppedAtWave: 12, integrity: 150, bandwidth: 50, neutralized: 46, uptimePercent: 100, score: 735, corruptedTiles: 1, remainingUnits: 9 },
    { cleared: true, stoppedAtWave: 12, integrity: 150, bandwidth: 43, neutralized: 42, uptimePercent: 100, score: 691, corruptedTiles: 2, remainingUnits: 9 },
  ],
};

const FROZEN_RUN_FIELDS: readonly (keyof RunResult)[] = [
  "cleared",
  "stoppedAtWave",
  "integrity",
  "bandwidth",
  "neutralized",
  "uptimePercent",
  "score",
  "corruptedTiles",
  "remainingUnits",
];

const scenarios: readonly Scenario[] = [
  {
    name: "Legacy v1 baseline",
    configure: applyLegacyBaseline,
  },
  {
    name: SIM_RULESET_ID,
    configure: (state) => state,
  },
];

const results = [1, 2, 3].flatMap((sector) =>
  scenarios.map((scenario) => ({
    sector,
    scenario: scenario.name,
    runs: FIXED_SEEDS.map((seed) => runGuidedSector(seed, sector, scenario)),
  })),
);

console.log("# Fixed-seed campaign balance report\n");
console.log(
  "Each row replays one readable build plan across four deterministic seeds; Sector 2 also scrubs visible corruption and restores a severed route before buying the listed defenses.\n",
);
console.log("| Sector | Scenario | Clears | Avg stop wave | Avg integrity | Avg uptime | Avg BW | Avg score |");
console.log("|---:|---|---:|---:|---:|---:|---:|---:|");

for (const result of results) {
  const clears = result.runs.filter((run) => run.cleared).length;
  console.log(
    `| ${result.sector} | ${result.scenario} | ${clears}/${result.runs.length} | ${average(result.runs.map((run) => run.stoppedAtWave)).toFixed(1)} | ${average(result.runs.map((run) => run.integrity)).toFixed(1)} | ${average(result.runs.map((run) => run.uptimePercent)).toFixed(1)}% | ${average(result.runs.map((run) => run.bandwidth)).toFixed(1)} | ${average(result.runs.map((run) => run.score)).toFixed(1)} |`,
  );
}

console.log(
  `\n${SIM_RULESET_ID}: opening grants 30/42/56 BW by sector; Firewall 8 BW; ICE 14 BW, range 2, damage 3.`,
);

console.log(`\n## ${SIM_RULESET_ID} run detail\n`);
console.log("| Sector | Seed | Result | Stop wave | Integrity | Uptime | BW | Kills | Corrupt | Units | Score |");
console.log("|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|");

for (const result of results.filter((entry) => entry.scenario === SIM_RULESET_ID)) {
  result.runs.forEach((run, index) => {
    console.log(
      `| ${result.sector} | ${FIXED_SEEDS[index]} | ${run.cleared ? "clear" : "loss"} | ${run.stoppedAtWave} | ${run.integrity} | ${run.uptimePercent}% | ${run.bandwidth} | ${run.neutralized} | ${run.corruptedTiles} | ${run.remainingUnits} | ${run.score} |`,
    );
  });
}

assertPhase4Acceptance(results);

function runGuidedSector(
  seed: string,
  sector: number,
  scenario: Scenario,
): RunResult {
  let state = scenario.configure(createGameState({ seed, sector }));
  let builtWave = -1;
  let ticks = 0;

  while (state.phase !== "won" && state.phase !== "lost") {
    if (state.phase === "prep") {
      if (builtWave !== state.waveIndex) {
        builtWave = state.waveIndex;

        if (sector === 2) {
          state = scrubVisibleCorruption(state);
          state = repairSignalWithRelays(state);
        }

        for (const purchase of GUIDED_PLANS[sector]?.[builtWave] ?? []) {
          state = applyCommand(state, {
            type: "placeUnit",
            position: purchase.position,
            unit: purchase.unit,
          });
        }
      }

      state = applyCommand(state, { type: "skipPrep" });
    }

    state = tick(state);
    ticks += 1;
    assertWithinTickBudget({
      scope: "campaign",
      ticks,
      state,
      sector,
      seed,
      ruleset: scenario.name,
    });
  }

  const score = calculateScore(state);
  const wave = state.config.waves[state.waveIndex];

  return {
    cleared: state.phase === "won",
    stoppedAtWave: wave?.id ?? state.waveIndex + 1,
    integrity: state.coreIntegrity,
    bandwidth: state.bandwidth,
    neutralized: state.neutralizedCount,
    uptimePercent: score.uptimePercent,
    score: score.total,
    corruptedTiles: state.grid.tiles.filter((tile) => tile.kind === "corrupted").length,
    remainingUnits: state.grid.tiles.filter((tile) =>
      tile.kind === "relay" ||
      tile.kind === "firewall" ||
      tile.kind === "turret" ||
      tile.kind === "scrubber" ||
      tile.kind === "overclock"
    ).length,
  };
}

function repairSignalWithRelays(state: GameState): GameState {
  if (state.signal.status === "live") {
    return state;
  }

  const candidates: GameState[] = [];

  for (let y = 0; y < state.grid.size; y += 1) {
    for (let x = 0; x < state.grid.size; x += 1) {
      const nextState = applyCommand(state, {
        type: "placeUnit",
        position: { x, y },
        unit: "relay",
      });

      if (nextState === state) {
        continue;
      }

      if (nextState.signal.status === "live") {
        return nextState;
      }

      candidates.push(nextState);
    }
  }

  for (const candidate of candidates) {
    for (let y = 0; y < state.grid.size; y += 1) {
      for (let x = 0; x < state.grid.size; x += 1) {
        const nextState = applyCommand(candidate, {
          type: "placeUnit",
          position: { x, y },
          unit: "relay",
        });

        if (nextState !== candidate && nextState.signal.status === "live") {
          return nextState;
        }
      }
    }
  }

  return state;
}

function scrubVisibleCorruption(state: GameState): GameState {
  let nextState = state;

  for (let y = 0; y < state.grid.size; y += 1) {
    for (let x = 0; x < state.grid.size; x += 1) {
      const tile = nextState.grid.tiles[y * state.grid.size + x];

      if (tile?.kind !== "corrupted") {
        continue;
      }

      nextState = applyCommand(nextState, {
        type: "placeUnit",
        position: { x, y },
        unit: "scrubber",
      });
    }
  }

  return nextState;
}

function applyLegacyBaseline(state: GameState): GameState {
  const currentFirstGrant = state.config.waves[0]?.bandwidthGrant ?? 0;
  const firstGrant =
    state.config.sectorId === 1
      ? 26
      : state.config.sectorId === 2
        ? 36
        : 38;
  const waves = state.config.waves.map((wave, index) =>
    index === 0
      ? {
          ...wave,
          bandwidthGrant: firstGrant,
        }
      : wave,
  );

  return {
    ...state,
    bandwidth: state.bandwidth + firstGrant - currentFirstGrant,
    config: {
      ...state.config,
      turretRange: 1,
      turretDamagePerTick: 4,
      units: {
        ...state.config.units,
        firewall: {
          ...state.config.units.firewall,
          cost: 10,
        },
        turret: {
          ...state.config.units.turret,
          cost: 18,
        },
      },
      waves,
    },
  };
}

function assertPhase4Acceptance(
  entries: readonly Readonly<{
    sector: number;
    scenario: string;
    runs: readonly RunResult[];
  }>[],
): void {
  const phase4 = entries.filter((entry) => entry.scenario === SIM_RULESET_ID);
  const losses = phase4.flatMap((entry) =>
    entry.runs.filter((run) => !run.cleared).map(() => entry.sector),
  );

  if (phase4.length !== 3 || losses.length > 0) {
    throw new Error(
      `${SIM_RULESET_ID} failed the fixed-seed campaign gate: ${losses.length} loss(es).`,
    );
  }

  for (const entry of phase4) {
    const expectedRuns = EXPECTED_PHASE4_RUNS[entry.sector];
    if (!expectedRuns || expectedRuns.length !== entry.runs.length) {
      throw new Error(
        `${SIM_RULESET_ID} fixed metrics are missing for sector ${entry.sector}.`,
      );
    }

    entry.runs.forEach((run, index) => {
      const expected = expectedRuns[index];
      const mismatches = FROZEN_RUN_FIELDS.flatMap((field) =>
        run[field] === expected[field]
          ? []
          : [`${field}: expected ${String(expected[field])}, received ${String(run[field])}`]
      );

      if (mismatches.length > 0) {
        throw new Error(
          `${SIM_RULESET_ID} fixed-seed metrics drifted for sector ${entry.sector}, ` +
            `seed ${FIXED_SEEDS[index]}: ${mismatches.join("; ")}.`,
        );
      }
    });
  }
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
