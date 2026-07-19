import type {
  EnemyKind,
  GamePhase,
  GridPosition,
  RngState,
  ScoreBreakdown,
  SpawnEdge,
  UnitKind,
} from "../types";

export const EXPANSION_RULESET_ID = "expansion-v1";
export const EXPANSION_CAMPAIGN_ID = "expansion-1";
export const EXPANSION_CONTENT_REVISION = "expansion-1-r1";

export const EXPANSION_TILE_KINDS = [
  "empty",
  "relay",
  "firewall",
  "turret",
  "scrubber",
  "overclock",
  "latencyTrap",
  "void",
  "corrupted",
] as const;

export type ExpansionTileKind = (typeof EXPANSION_TILE_KINDS)[number];
export type ExpansionChapterId = 1 | 2 | 3 | 4 | 5 | 6;
export type ExpansionHardwareKind = UnitKind | "latencyTrap";
export type ExpansionPlayerTool = ExpansionHardwareKind | "sell";
export type ExpansionEnemyKind = EnemyKind | "rusher";

export type ExpansionTileState = Readonly<{
  kind: ExpansionTileKind;
  hp?: number;
  progress?: number;
  charges?: number;
}>;

export type ExpansionGridState = Readonly<{
  size: number;
  tiles: readonly ExpansionTileState[];
}>;

export type ExpansionEnemyDefinition = Readonly<{
  maxHp: number;
  moveEveryTicks: number;
  corruptionTicks: number;
  spawnBatchSize: number;
  chewDamage: number;
  coreContactDamage: number;
  targeting: "route" | "units";
  onDeathSpawn: Readonly<{
    kind: ExpansionEnemyKind;
    count: number;
  }> | null;
}>;

export type ExpansionEnemyDefinitions = Readonly<
  Record<ExpansionEnemyKind, ExpansionEnemyDefinition>
>;

export type ExpansionHardwareDefinition = Readonly<{
  cost: number;
  sellRefund: number;
  hp: number | null;
  charges?: number;
  extraMoveDelayTicks?: number;
}>;

export type ExpansionHardwareDefinitions = Readonly<
  Record<ExpansionHardwareKind, ExpansionHardwareDefinition>
>;

export type ExpansionWaveDefinition = Readonly<{
  id: number;
  label: string;
  briefing: string;
  prepTicks: number;
  bandwidthGrant: number;
  bandwidthTricklePerTick: number;
  bandwidthTrickleEveryTicks: number;
  spawnFirstTick: number;
  spawnEveryTicks: number;
  maxActiveIntrusions: number;
  maxSpawnedIntrusions: number;
  perimeterPickAttempts: number;
  enemyWeights: Readonly<Record<ExpansionEnemyKind, number>>;
  scriptedSpawns?: readonly Readonly<{
    waveTick: number;
    kind: ExpansionEnemyKind;
  }>[];
  spawnEdges: readonly SpawnEdge[];
}>;

export type ExpansionInitialTileDefinition = Readonly<{
  position: GridPosition;
  kind: ExpansionHardwareKind;
}>;

export type ExpansionLevelDefinition = Readonly<{
  id: number;
  chapterId: ExpansionChapterId;
  codename: string;
  tagline: string;
  briefing: string;
  gridSize: 8;
  source: GridPosition;
  core: GridPosition;
  voidTiles: readonly GridPosition[];
  initialTiles: readonly ExpansionInitialTileDefinition[];
  toolsUnlocked: readonly ExpansionPlayerTool[];
  waves: readonly ExpansionWaveDefinition[];
  difficultyIndex: number;
  requiredMechanic: "latencyTrap";
}>;

export type ExpansionIntrusionCorruptionContact = Readonly<{
  position: GridPosition;
  progressTicks: number;
  requiredTicks: number;
}>;

export type ExpansionIntrusionState = Readonly<{
  id: number;
  kind: ExpansionEnemyKind;
  hp: number;
  maxHp: number;
  position: GridPosition;
  previousPosition: GridPosition;
  spawnedTick: number;
  lastMoveTick: number;
  corruption: ExpansionIntrusionCorruptionContact | null;
}>;

export type ExpansionSignalState = Readonly<{
  status: "live" | "severed";
  route: readonly GridPosition[];
  routeTick: number;
}>;

export type ExpansionSimEvent =
  | Readonly<{
      type: "intrusionSpawned";
      tick: number;
      intrusionId: number;
      kind: ExpansionEnemyKind;
      position: GridPosition;
    }>
  | Readonly<{
      type: "intrusionMoved";
      tick: number;
      intrusionId: number;
      from: GridPosition;
      to: GridPosition;
      jumped: boolean;
    }>
  | Readonly<{
      type: "latencyTrapTriggered";
      tick: number;
      intrusionId: number;
      position: GridPosition;
      remainingCharges: number;
      extraMoveDelayTicks: number;
    }>
  | Readonly<{
      type: "turretHit";
      tick: number;
      turretPosition: GridPosition;
      targetId: number;
      targetPosition: GridPosition;
      damage: number;
    }>
  | Readonly<{
      type: "intrusionNeutralized";
      tick: number;
      intrusionId: number;
      position: GridPosition;
    }>
  | Readonly<{
      type: "corruptionProgress";
      tick: number;
      intrusionId: number;
      position: GridPosition;
      progressTicks: number;
      requiredTicks: number;
    }>
  | Readonly<{
      type: "tileCorrupted";
      tick: number;
      intrusionId: number;
      position: GridPosition;
    }>
  | Readonly<{
      type: "unitDamaged";
      tick: number;
      intrusionId: number;
      position: GridPosition;
      unitKind: UnitKind;
      hp: number;
    }>
  | Readonly<{
      type: "tileCleansed";
      tick: number;
      position: GridPosition;
    }>
  | Readonly<{
      type: "coreBreach";
      tick: number;
      intrusionId: number;
      amount: number;
      integrity: number;
    }>
  | Readonly<{
      type: "intrusionSplit";
      tick: number;
      parentId: number;
      childIds: readonly number[];
      position: GridPosition;
    }>
  | Readonly<{
      type: "routeSevered";
      tick: number;
      previousRoute: readonly GridPosition[];
    }>
  | Readonly<{
      type: "coreDamaged";
      tick: number;
      amount: number;
      integrity: number;
    }>;

export type ExpansionSimConfig = Readonly<{
  campaignId: typeof EXPANSION_CAMPAIGN_ID;
  ruleset: typeof EXPANSION_RULESET_ID;
  contentRevision: typeof EXPANSION_CONTENT_REVISION;
  contentHash: string;
  levelId: number;
  chapterId: ExpansionChapterId;
  levelName: string;
  difficultyIndex: number;
  requiredMechanic: "latencyTrap";
  gridSize: 8;
  source: GridPosition;
  core: GridPosition;
  relaySignalRange: number;
  turretRange: number;
  turretDamagePerTick: number;
  toolsUnlocked: readonly ExpansionPlayerTool[];
  scrubberCleanseTicks: number;
  overclockBonusDamage: number;
  initialCoreIntegrity: number;
  coreIntegrityMax: number;
  coreIntegrityDrainPerSeveredTick: number;
  coreIntegrityRegenPerLiveTick: number;
  simulationTickMs: number;
  defaultSeed: string;
  enemies: ExpansionEnemyDefinitions;
  units: ExpansionHardwareDefinitions;
  waves: readonly ExpansionWaveDefinition[];
}>;

export type ExpansionGameState = Readonly<{
  tickCount: number;
  rng: RngState;
  grid: ExpansionGridState;
  config: ExpansionSimConfig;
  phase: GamePhase;
  waveIndex: number;
  waveTick: number;
  prepTicksRemaining: number;
  activeTaunt: string;
  bandwidth: number;
  waveSpawnedCount: number;
  waveScriptedSpawnIndex: number;
  signal: ExpansionSignalState;
  intrusions: readonly ExpansionIntrusionState[];
  nextIntrusionId: number;
  spawnedIntrusionCount: number;
  neutralizedCount: number;
  events: readonly ExpansionSimEvent[];
  coreIntegrity: number;
  uptimeTicks: number;
  severedTicks: number;
}>;

export type PlaceExpansionUnitCommand = Readonly<{
  type: "placeUnit";
  position: GridPosition;
  unit: ExpansionHardwareKind;
}>;

export type SellExpansionUnitCommand = Readonly<{
  type: "sellUnit";
  position: GridPosition;
}>;

export type SkipExpansionPrepCommand = Readonly<{
  type: "skipPrep";
}>;

export type ExpansionSimCommand =
  | PlaceExpansionUnitCommand
  | SellExpansionUnitCommand
  | SkipExpansionPrepCommand;

export type ExpansionRecordedCommand = Readonly<{
  t: number;
  c: ExpansionSimCommand;
}>;

export type ExpansionReplayInput = Readonly<{
  schema: 2;
  ruleset: typeof EXPANSION_RULESET_ID;
  campaign: typeof EXPANSION_CAMPAIGN_ID;
  level: number;
  contentRevision: typeof EXPANSION_CONTENT_REVISION;
  contentHash: string;
  seed: string;
  commands: readonly ExpansionRecordedCommand[];
}>;

export type ExpansionReplayResult = Readonly<{
  state: ExpansionGameState;
  score: ScoreBreakdown;
}>;
