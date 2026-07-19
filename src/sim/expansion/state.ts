import { getExpansionLevelDefinition } from "../../data/campaigns/expansion";
import { EXPANSION_1_R1_TUNING } from "../../data/campaigns/expansion/tuning";
import { ENEMY_TUNING } from "../../data/enemies";
import { CORE_TUNING } from "../../data/levels";
import { UNIT_TUNING } from "../../data/units";
import { createRng } from "../rng";
import { LATENCY_TRAP_PROTOTYPE } from "./latencyTrapPrototype";
import { createExpansionGrid, expansionPositionKey, setExpansionTile } from "./grid";
import { computeExpansionSignalRoute } from "./routing";
import { RUSHER_PROTOTYPE } from "./rusherPrototype";
import {
  EXPANSION_CAMPAIGN_ID,
  EXPANSION_CONTENT_REVISION,
  EXPANSION_RULESET_ID,
  type ExpansionGameState,
  type ExpansionHardwareKind,
  type ExpansionLevelDefinition,
  type ExpansionSignalState,
  type ExpansionSimConfig,
  type ExpansionTileState,
} from "./types";
import { startExpansionPrepPhase } from "./waves";

export type CreateExpansionGameStateOptions = Readonly<{
  levelId: number;
  contentHash: string;
  seed?: string | number;
}>;

export function createExpansionGameState(
  options: CreateExpansionGameStateOptions,
): ExpansionGameState {
  const level = getRequiredExpansionLevel(options.levelId);
  const config = createExpansionSimConfig(level, options.contentHash);
  let grid = createExpansionGrid(config.gridSize);

  for (const position of level.voidTiles) {
    grid = setExpansionTile(grid, position, { kind: "void" });
  }

  const reserved = new Set(level.voidTiles.map(expansionPositionKey));

  for (const initialTile of level.initialTiles) {
    const key = expansionPositionKey(initialTile.position);

    if (reserved.has(key)) {
      throw new Error(`Expansion initial tile overlaps void at ${key}.`);
    }

    grid = setExpansionTile(
      grid,
      initialTile.position,
      createInitialExpansionTile(config, initialTile.kind),
    );
  }

  const baseState: ExpansionGameState = {
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
    waveScriptedSpawnIndex: 0,
    signal: { status: "severed", route: [], routeTick: 0 },
    intrusions: [],
    nextIntrusionId: 1,
    spawnedIntrusionCount: 0,
    neutralizedCount: 0,
    events: [],
    coreIntegrity: config.initialCoreIntegrity,
    uptimeTicks: 0,
    severedTicks: 0,
  };

  return withRecomputedExpansionSignal(startExpansionPrepPhase(baseState, 0));
}

export function withRecomputedExpansionSignal(
  state: ExpansionGameState,
): ExpansionGameState {
  return { ...state, signal: deriveExpansionSignalState(state) };
}

export function deriveExpansionSignalState(
  state: ExpansionGameState,
): ExpansionSignalState {
  const route = computeExpansionSignalRoute({
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

function createExpansionSimConfig(
  level: ExpansionLevelDefinition,
  contentHash: string,
): ExpansionSimConfig {
  if (contentHash.trim().length < 8) {
    throw new Error("Expansion content hash is required.");
  }

  return {
    campaignId: EXPANSION_CAMPAIGN_ID,
    ruleset: EXPANSION_RULESET_ID,
    contentRevision: EXPANSION_CONTENT_REVISION,
    contentHash,
    levelId: level.id,
    chapterId: level.chapterId,
    levelName: level.codename,
    difficultyIndex: level.difficultyIndex,
    requiredMechanic: level.requiredMechanic,
    gridSize: level.gridSize,
    source: { ...level.source },
    core: { ...level.core },
    relaySignalRange: UNIT_TUNING.relay.signalRange,
    turretRange: UNIT_TUNING.turret.range,
    turretDamagePerTick: EXPANSION_1_R1_TUNING.turretDamagePerTick,
    toolsUnlocked: level.toolsUnlocked,
    scrubberCleanseTicks: EXPANSION_1_R1_TUNING.scrubberCleanseTicks,
    overclockBonusDamage: UNIT_TUNING.overclock.bonusDamage,
    initialCoreIntegrity: EXPANSION_1_R1_TUNING.initialCoreIntegrity,
    coreIntegrityMax: EXPANSION_1_R1_TUNING.coreIntegrityMax,
    coreIntegrityDrainPerSeveredTick: EXPANSION_1_R1_TUNING.coreIntegrityDrainPerSeveredTick,
    coreIntegrityRegenPerLiveTick: EXPANSION_1_R1_TUNING.coreIntegrityRegenPerLiveTick,
    simulationTickMs: CORE_TUNING.simulationTickMs,
    defaultSeed: `${EXPANSION_CAMPAIGN_ID}-chapter-1-level-${level.id}`,
    enemies: {
      probe: { ...ENEMY_TUNING.probe },
      crawler: { ...ENEMY_TUNING.crawler },
      spoof: { ...ENEMY_TUNING.spoof },
      hunter: { ...ENEMY_TUNING.hunter },
      splitter: { ...ENEMY_TUNING.splitter },
      goliath: { ...ENEMY_TUNING.goliath },
      rusher: { ...RUSHER_PROTOTYPE },
    },
    units: {
      relay: unit(UNIT_TUNING.relay),
      firewall: unit(UNIT_TUNING.firewall),
      turret: unit(UNIT_TUNING.turret),
      scrubber: unit(UNIT_TUNING.scrubber),
      overclock: unit(UNIT_TUNING.overclock),
      latencyTrap: {
        cost: LATENCY_TRAP_PROTOTYPE.cost,
        sellRefund: LATENCY_TRAP_PROTOTYPE.activeSaleRefund,
        hp: null,
        charges: LATENCY_TRAP_PROTOTYPE.charges,
        extraMoveDelayTicks: LATENCY_TRAP_PROTOTYPE.extraMoveDelayTicks,
      },
    },
    waves: level.waves,
  };
}

function unit(definition: Readonly<{ cost: number; sellRefund: number; hp: number }>) {
  return { cost: definition.cost, sellRefund: definition.sellRefund, hp: definition.hp };
}

function createInitialExpansionTile(
  config: ExpansionSimConfig,
  kind: ExpansionHardwareKind,
): ExpansionTileState {
  const definition = config.units[kind];
  return {
    kind,
    ...(definition.hp === null ? {} : { hp: definition.hp }),
    ...(definition.charges === undefined ? {} : { charges: definition.charges }),
    ...(kind === "scrubber" ? { progress: 0 } : {}),
  };
}

function getRequiredExpansionLevel(levelId: number): ExpansionLevelDefinition {
  const level = getExpansionLevelDefinition(levelId);
  if (!level) throw new Error(`Unknown expansion level id: ${levelId}.`);
  return level;
}
