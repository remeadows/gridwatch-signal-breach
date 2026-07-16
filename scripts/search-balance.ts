import { applyCommand } from "../src/sim/commands";
import { calculateScore } from "../src/sim/scoring";
import { createGameState } from "../src/sim/state";
import { tick } from "../src/sim/tick";
import type { GameState, GridPosition, UnitKind } from "../src/sim/types";

// Analysis helper, not a CI gate. Usage:
// npm run balance:search -- <sector> [seed] [beam-width] [max-builds-per-wave]
declare const process: Readonly<{
  argv: readonly string[];
}>;

const [sectorArg, seedArg, beamArg, maxBuildsArg] = process.argv.slice(3);
const sector = Number.parseInt(sectorArg ?? "1", 10);
const seed = seedArg ?? `phase4-search-sector-${sector}`;
const beamWidth = Number.parseInt(beamArg ?? "28", 10);
const maxBuildsPerWave = Number.parseInt(maxBuildsArg ?? "4", 10);

if (![1, 2, 3].includes(sector)) {
  throw new Error("Sector must be 1, 2, or 3.");
}
if (!Number.isInteger(beamWidth) || beamWidth < 1) {
  throw new Error("Beam width must be a positive integer.");
}
if (!Number.isInteger(maxBuildsPerWave) || maxBuildsPerWave < 0) {
  throw new Error("Maximum builds per wave must be a non-negative integer.");
}

type Placement = Readonly<{
  unit: UnitKind;
  position: GridPosition;
}>;

type Candidate = Readonly<{
  state: GameState;
  plan: readonly (readonly Placement[])[];
}>;

let candidates: readonly Candidate[] = [
  {
    state: createGameState({ sector, seed }),
    plan: [],
  },
];

while (candidates.some((candidate) => candidate.state.phase === "prep")) {
  const advanced: Candidate[] = [];

  for (const candidate of candidates) {
    if (candidate.state.phase !== "prep") {
      advanced.push(candidate);
      continue;
    }

    for (const build of findWaveBuilds(candidate.state)) {
      advanced.push({
        state: build.result,
        plan: [...candidate.plan, build.placements],
      });
    }
  }

  candidates = advanced
    .sort((a, b) => compareResults(b.state, a.state))
    .slice(0, beamWidth);

  const leader = candidates[0];
  console.log(
    `W${leader.state.config.waves[Math.min(leader.state.waveIndex, leader.state.config.waves.length - 1)]?.id ?? "?"} frontier: ${describe(leader.state)}`,
  );

  if (candidates.every((candidate) => candidate.state.phase !== "prep")) {
    break;
  }
}

const winner = [...candidates].sort((a, b) => compareResults(b.state, a.state))[0];

console.log(`\nSector ${sector}, seed ${seed}: ${describe(winner.state)}`);
console.log(JSON.stringify(winner.plan, null, 2));

function findWaveBuilds(state: GameState): readonly Readonly<{
  placements: readonly Placement[];
  result: GameState;
}>[] {
  let frontier: readonly Readonly<{
    state: GameState;
    placements: readonly Placement[];
    result: GameState;
  }>[] = [
    {
      state,
      placements: [],
      result: runWave(state),
    },
  ];
  let all = [...frontier];

  for (let depth = 0; depth < maxBuildsPerWave; depth += 1) {
    const expanded: Array<{
      state: GameState;
      placements: readonly Placement[];
      result: GameState;
    }> = [];

    for (const candidate of frontier) {
      for (const placement of getPlacements(candidate.state)) {
        const nextState = applyCommand(candidate.state, {
          type: "placeUnit",
          unit: placement.unit,
          position: placement.position,
        });

        if (nextState === candidate.state) {
          continue;
        }

        expanded.push({
          state: nextState,
          placements: [...candidate.placements, placement],
          result: runWave(nextState),
        });
      }
    }

    frontier = expanded
      .sort((a, b) => compareResults(b.result, a.result))
      .slice(0, beamWidth);
    all = [...all, ...frontier];
  }

  return all
    .sort((a, b) => compareResults(b.result, a.result))
    .slice(0, beamWidth);
}

function getPlacements(state: GameState): readonly Placement[] {
  const units = state.config.toolsUnlocked.filter(
    (tool): tool is UnitKind => tool !== "sell",
  );
  const placements: Placement[] = [];

  for (let y = 0; y < state.grid.size; y += 1) {
    for (let x = 0; x < state.grid.size; x += 1) {
      for (const unit of units) {
        if (state.bandwidth < state.config.units[unit].cost) {
          continue;
        }

        placements.push({ unit, position: { x, y } });
      }
    }
  }

  return placements;
}

function runWave(state: GameState): GameState {
  let result = applyCommand(state, { type: "skipPrep" });
  const waveIndex = state.waveIndex;

  while (
    result.phase !== "won" &&
    result.phase !== "lost" &&
    result.waveIndex === waveIndex
  ) {
    result = tick(result);
  }

  return result;
}

function compareResults(a: GameState, b: GameState): number {
  return resultValue(a) - resultValue(b);
}

function resultValue(state: GameState): number {
  const terminal = state.phase === "won" ? 10_000_000 : state.phase === "lost" ? -10_000_000 : 0;
  const score = calculateScore(state);

  return (
    terminal +
    state.waveIndex * 1_000_000 +
    state.coreIntegrity * 10_000 +
    score.uptimePercent * 100 +
    state.neutralizedCount * 10 +
    state.bandwidth
  );
}

function describe(state: GameState): string {
  const score = calculateScore(state);
  return `${state.phase}, index ${state.waveIndex}, core ${state.coreIntegrity}, BW ${state.bandwidth}, uptime ${score.uptimePercent}%, score ${score.total}`;
}
