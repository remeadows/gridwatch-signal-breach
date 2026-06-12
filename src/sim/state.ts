import { ENEMY_TUNING } from "../data/enemies";
import { CORE_TUNING, SECTORS } from "../data/levels";
import { UNIT_TUNING } from "../data/units";
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
  sector?: number;
  initialTiles?: readonly InitialTileDefinition[];
}>;

export function createGameState(options: CreateGameStateOptions = {}): GameState {
  const sector = getSectorDefinition(options.sector ?? 1);
  const config = createSimConfig(sector.id);
  let grid = createGrid(config.gridSize);

  for (const voidTile of sector.voidTiles) {
    grid = setTile(grid, voidTile, { kind: "void" });
  }

  for (const initialTile of options.initialTiles ?? sector.initialTiles) {
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

function createSimConfig(sectorId: number): SimConfig {
  const sector = getSectorDefinition(sectorId);

  return {
    gridSize: sector.gridSize,
    sectorId: sector.id,
    sectorName: sector.codename,
    source: {
      x: sector.source.x,
      y: sector.source.y,
    },
    core: {
      x: sector.core.x,
      y: sector.core.y,
    },
    relaySignalRange: UNIT_TUNING.relay.signalRange,
    turretRange: UNIT_TUNING.turret.range,
    turretDamagePerTick: UNIT_TUNING.turret.damagePerTick,
    toolsUnlocked: sector.toolsUnlocked,
    scrubberCleanseTicks: UNIT_TUNING.scrubber.cleanseTicks,
    overclockBonusDamage: UNIT_TUNING.overclock.bonusDamage,
    initialCoreIntegrity: CORE_TUNING.initialCoreIntegrity,
    coreIntegrityMax: CORE_TUNING.coreIntegrityMax,
    coreIntegrityDrainPerSeveredTick: CORE_TUNING.coreIntegrityDrainPerSeveredTick,
    coreIntegrityRegenPerLiveTick: CORE_TUNING.coreIntegrityRegenPerLiveTick,
    simulationTickMs: CORE_TUNING.simulationTickMs,
    defaultSeed: CORE_TUNING.defaultSeed,
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
      scrubber: {
        cost: UNIT_TUNING.scrubber.cost,
        sellRefund: UNIT_TUNING.scrubber.sellRefund,
        hp: UNIT_TUNING.scrubber.hp,
      },
      overclock: {
        cost: UNIT_TUNING.overclock.cost,
        sellRefund: UNIT_TUNING.overclock.sellRefund,
        hp: UNIT_TUNING.overclock.hp,
      },
    },
    waves: sector.waves,
  };
}

function createInitialTile(config: SimConfig, kind: TileKind): TileState {
  if (!isUnitKind(kind)) {
    return { kind };
  }

  return {
    kind,
    hp: config.units[kind].hp,
    ...(kind === "scrubber" ? { progress: 0 } : {}),
  };
}

function isUnitKind(kind: TileKind): kind is UnitKind {
  return (
    kind === "relay" ||
    kind === "firewall" ||
    kind === "turret" ||
    kind === "scrubber" ||
    kind === "overclock"
  );
}

function getSectorDefinition(sectorId: number) {
  const sector = SECTORS.find((candidate) => candidate.id === sectorId);

  if (!sector) {
    throw new Error(`Unknown sector id: ${sectorId}.`);
  }

  return sector;
}
