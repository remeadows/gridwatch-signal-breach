import { ENEMY_TUNING } from "../data/enemies";
import { LEVEL_CONFIG, LEVEL_INITIAL_TILES } from "../data/level";
import { UNIT_TUNING } from "../data/units";
import { WAVE_TUNING } from "../data/waves";
import { createGrid, setTile } from "./grid";
import { createRng } from "./rng";
import { computeSignalRoute } from "./routing";
import { startPrepPhase } from "./waves";
import type {
  GameState,
  InitialTileDefinition,
  SignalState,
  SimConfig,
  TileKind,
  TileState,
  UnitKind,
} from "./types";

export type CreateGameStateOptions = Readonly<{
  seed?: string | number;
  initialTiles?: readonly InitialTileDefinition[];
}>;

export function createGameState(options: CreateGameStateOptions = {}): GameState {
  const config = createSimConfig();
  let grid = createGrid(config.gridSize);

  for (const initialTile of options.initialTiles ?? LEVEL_INITIAL_TILES) {
    grid = setTile(grid, initialTile.position, createInitialTile(config, initialTile.kind));
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
        hp: UNIT_TUNING.relay.hp,
      },
      firewall: {
        cost: UNIT_TUNING.firewall.cost,
        sellRefund: UNIT_TUNING.firewall.sellRefund,
        hp: UNIT_TUNING.firewall.hp,
      },
      turret: {
        cost: UNIT_TUNING.turret.cost,
        sellRefund: UNIT_TUNING.turret.sellRefund,
        hp: UNIT_TUNING.turret.hp,
      },
    },
    waves: WAVE_TUNING,
  };
}

function createInitialTile(config: SimConfig, kind: TileKind): TileState {
  if (!isUnitKind(kind)) {
    return { kind };
  }

  return {
    kind,
    hp: config.units[kind].hp,
  };
}

function isUnitKind(kind: TileKind): kind is UnitKind {
  return kind === "relay" || kind === "firewall" || kind === "turret";
}
