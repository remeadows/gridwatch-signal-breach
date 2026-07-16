import { applyCommand } from "../src/sim/commands";
import { calculateScore } from "../src/sim/scoring";
import { createGameState } from "../src/sim/state";
import { tick } from "../src/sim/tick";
import type { GameState, GridPosition, UnitKind } from "../src/sim/types";

const FIXED_SEEDS = [
  "phase4-a",
  "phase4-b",
  "phase4-c",
  "gridwatch-signal-breach-phase-3",
] as const;

const GUIDED_SECTOR_ONE_PLAN: readonly (readonly Readonly<{
  unit: UnitKind;
  position: GridPosition;
}>[])[] = [
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
];

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
}>;

const scenarios: readonly Scenario[] = [
  {
    name: "Current",
    configure: (state) => state,
  },
  {
    name: "First experiment",
    configure: applyFirstExperiment,
  },
];

const results = scenarios.map((scenario) => ({
  scenario: scenario.name,
  runs: FIXED_SEEDS.map((seed) => runGuidedSectorOne(seed, scenario)),
}));

console.log("# Sector 1 fixed-seed balance report\n");
console.log(
  "Guided plan: one opening ICE, then paired Firewall/ICE coverage around the existing signal chain.\n",
);
console.log("| Scenario | Clears | Avg stop wave | Avg integrity | Avg uptime | Avg score |");
console.log("|---|---:|---:|---:|---:|---:|");

for (const result of results) {
  const clears = result.runs.filter((run) => run.cleared).length;
  console.log(
    `| ${result.scenario} | ${clears}/${result.runs.length} | ${average(result.runs.map((run) => run.stoppedAtWave)).toFixed(1)} | ${average(result.runs.map((run) => run.integrity)).toFixed(1)} | ${average(result.runs.map((run) => run.uptimePercent)).toFixed(1)}% | ${average(result.runs.map((run) => run.score)).toFixed(1)} |`,
  );
}

console.log("\nFirst experiment: W1 grant 30 BW; Firewall 8 BW; ICE 16 BW, range 2, damage 3.");

function runGuidedSectorOne(seed: string, scenario: Scenario): RunResult {
  let state = scenario.configure(createGameState({ seed, sector: 1 }));
  let builtWave = -1;

  while (state.phase !== "won" && state.phase !== "lost") {
    if (state.phase === "prep") {
      if (builtWave !== state.waveIndex) {
        builtWave = state.waveIndex;

        for (const purchase of GUIDED_SECTOR_ONE_PLAN[builtWave] ?? []) {
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
  };
}

function applyFirstExperiment(state: GameState): GameState {
  const currentFirstGrant = state.config.waves[0]?.bandwidthGrant ?? 0;
  const firstGrant = 30;
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
      turretRange: 2,
      turretDamagePerTick: 3,
      units: {
        ...state.config.units,
        firewall: {
          ...state.config.units.firewall,
          cost: 8,
        },
        turret: {
          ...state.config.units.turret,
          cost: 16,
        },
      },
      waves,
    },
  };
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
