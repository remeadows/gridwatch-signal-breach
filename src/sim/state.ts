import { ENEMY_TUNING } from "../data/enemies";
import { LEVEL_CONFIG, LEVEL_INITIAL_TILES } from "../data/level";
import { UNIT_TUNING } from "../data/units";
import { WAVE_TUNING } from "../data/waves";
import { createGrid, setTileKind } from "./grid";
import { createRng } from "./rng";
import { computeSignalRoute } from "./routing";
import { startPrepPhase } from "./waves";
import type { GameState, InitialTileDefinition, SignalState, SimConfig } from "./types";

export type CreateGameStateOptions = Readonly<{
  seed?: string | number;
  initialTiles?: readonly InitialTileDefinition[];
}>;

export function createGameState(options: CreateGameStateOptions = {}): GameState {
  const config = createSimConfig();
  let grid = createGrid(config.gridSize);

  for (const initialTile of options.initialTiles ?? LEVEL_INITIAL_TILES) {
    grid = setTileKind(grid, initialTile.position, initialTile.kind);
  }

  const baseState: GameState = {
    tickCount: 0,
    rng: createRng(options.seed ?? config.defaultSeed),
    grid,
    config,
    phase: "prep",
    waveIndex: 0,
    waveTick: 0,
    prepTicksRemaining: 0,
    activeTaunt: "",
    bandwidth: 0,
    waveSpawnedCount: 0,
    signal: {
      status: "severed",
      route: [],
      routeTick: 0,
    },
    intrusions: [],
    nextIntrusionId: 1,
    spawnedIntrusionCount: 0,
    neutralizedCount: 0,
    events: [],
    coreIntegrity: config.initialCoreIntegrity,
    uptimeTicks: 0,
    severedTicks: 0,
  };

  return withRecomputedSignal(startPrepPhase(baseState, 0));
}

export function withRecomputedSignal(state: GameState): GameState {
  return {
    ...state,
    signal: deriveSignalState(state),
  };
}

export function deriveSignalState(state: GameState): SignalState {
  const route = computeSignalRoute({
    grid: state.grid,
    source: state.config.source,
    core: state.config.core,
    relaySignalRange: state.config.relaySignalRange,
  });

  return {
    status: route ? "live" : "severed",
    route: route ?? [],
    routeTick: state.tickCount,
  };
}

export function isSignalLive(state: GameState): boolean {
  return state.signal.status === "live";
}

function createSimConfig(): SimConfig {
  return {
    gridSize: LEVEL_CONFIG.gridSize,
    source: {
      x: LEVEL_CONFIG.source.x,
      y: LEVEL_CONFIG.source.y,
    },
    core: {
      x: LEVEL_CONFIG.core.x,
      y: LEVEL_CONFIG.core.y,
    },
    relaySignalRange: UNIT_TUNING.relay.signalRange,
    firewallHardeningBonusTicks: UNIT_TUNING.firewall.hardeningBonusTicks,
    turretRange: UNIT_TUNING.turret.range,
    turretDamagePerTick: UNIT_TUNING.turret.damagePerTick,
    initialCoreIntegrity: LEVEL_CONFIG.initialCoreIntegrity,
    coreIntegrityMax: LEVEL_CONFIG.coreIntegrityMax,
    coreIntegrityDrainPerSeveredTick: LEVEL_CONFIG.coreIntegrityDrainPerSeveredTick,
    coreIntegrityRegenPerLiveTick: LEVEL_CONFIG.coreIntegrityRegenPerLiveTick,
    simulationTickMs: LEVEL_CONFIG.simulationTickMs,
    defaultSeed: LEVEL_CONFIG.defaultSeed,
    enemies: {
      probe: { ...ENEMY_TUNING.probe },
      crawler: { ...ENEMY_TUNING.crawler },
      spoof: { ...ENEMY_TUNING.spoof },
    },
    units: {
      relay: {
        cost: UNIT_TUNING.relay.cost,
        sellRefund: UNIT_TUNING.relay.sellRefund,
      },
      firewall: {
        cost: UNIT_TUNING.firewall.cost,
        sellRefund: UNIT_TUNING.firewall.sellRefund,
      },
      turret: {
        cost: UNIT_TUNING.turret.cost,
        sellRefund: UNIT_TUNING.turret.sellRefund,
      },
    },
    waves: WAVE_TUNING,
  };
}
