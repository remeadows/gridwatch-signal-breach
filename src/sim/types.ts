export const TILE_KINDS = [
  "empty",
  "relay",
  "firewall",
  "turret",
  "scrubber",
  "overclock",
  "void",
  "corrupted",
] as const;

export type TileKind = (typeof TILE_KINDS)[number];
export type UnitKind = "relay" | "firewall" | "turret" | "scrubber" | "overclock";
export type PlayerTool = UnitKind | "sell";

export type GridPosition = Readonly<{
  x: number;
  y: number;
}>;

export type TileState = Readonly<{
  kind: TileKind;
  hp?: number;
  progress?: number;
}>;

export type GridState = Readonly<{
  size: number;
  tiles: readonly TileState[];
}>;

export type SignalStatus = "live" | "severed";

export type SignalState = Readonly<{
  status: SignalStatus;
  route: readonly GridPosition[];
  routeTick: number;
}>;

export type EnemyKind = "probe" | "crawler" | "spoof" | "hunter" | "splitter" | "goliath";

export type EnemyDefinition = Readonly<{
  maxHp: number;
  moveEveryTicks: number;
  corruptionTicks: number;
  spawnBatchSize: number;
  chewDamage: number;
  coreContactDamage: number;
  targeting: "route" | "units";
  onDeathSpawn: Readonly<{
    kind: EnemyKind;
    count: number;
  }> | null;
}>;

export type EnemyDefinitions = Readonly<Record<EnemyKind, EnemyDefinition>>;

export type IntrusionCorruptionContact = Readonly<{
  position: GridPosition;
  progressTicks: number;
  requiredTicks: number;
}>;

export type IntrusionState = Readonly<{
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  position: GridPosition;
  previousPosition: GridPosition;
  spawnedTick: number;
  lastMoveTick: number;
  corruption: IntrusionCorruptionContact | null;
}>;

export type SpawnEdge = "north" | "east" | "south" | "west";

export type WaveDefinition = Readonly<{
  id: number;
  label: string;
  prepTicks: number;
  bandwidthGrant: number;
  bandwidthTricklePerTick: number;
  bandwidthTrickleEveryTicks: number;
  spawnFirstTick: number;
  spawnEveryTicks: number;
  maxActiveIntrusions: number;
  maxSpawnedIntrusions: number;
  perimeterPickAttempts: number;
  enemyWeights: Readonly<Record<EnemyKind, number>>;
  scriptedSpawns?: readonly Readonly<{
    waveTick: number;
    kind: EnemyKind;
  }>[];
  spawnEdges: readonly SpawnEdge[];
}>;

export type GamePhase = "prep" | "active" | "won" | "lost";

export type UnitDefinition = Readonly<{
  cost: number;
  sellRefund: number;
  hp: number;
}>;

export type UnitDefinitions = Readonly<Record<UnitKind, UnitDefinition>>;

export type InitialTileDefinition = Readonly<{
  position: GridPosition;
  kind: TileKind;
}>;

export type SimEvent =
  | Readonly<{
      type: "intrusionSpawned";
      tick: number;
      intrusionId: number;
      kind: EnemyKind;
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

export type ScoreBreakdown = Readonly<{
  integrity: number;
  neutralized: number;
  uptimePercent: number;
  uptimeScore: number;
  efficiencyBonus: number;
  total: number;
  rating: string;
}>;

export type RngState = Readonly<{
  seed: string;
  state: number;
}>;

export type SimConfig = Readonly<{
  gridSize: number;
  sectorId: number;
  sectorName: string;
  source: GridPosition;
  core: GridPosition;
  relaySignalRange: number;
  turretRange: number;
  turretDamagePerTick: number;
  toolsUnlocked: readonly PlayerTool[];
  scrubberCleanseTicks: number;
  overclockBonusDamage: number;
  initialCoreIntegrity: number;
  coreIntegrityMax: number;
  coreIntegrityDrainPerSeveredTick: number;
  coreIntegrityRegenPerLiveTick: number;
  simulationTickMs: number;
  defaultSeed: string;
  enemies: EnemyDefinitions;
  units: UnitDefinitions;
  waves: readonly WaveDefinition[];
}>;

export type GameState = Readonly<{
  tickCount: number;
  rng: RngState;
  grid: GridState;
  config: SimConfig;
  phase: GamePhase;
  waveIndex: number;
  waveTick: number;
  prepTicksRemaining: number;
  activeTaunt: string;
  bandwidth: number;
  waveSpawnedCount: number;
  signal: SignalState;
  intrusions: readonly IntrusionState[];
  nextIntrusionId: number;
  spawnedIntrusionCount: number;
  neutralizedCount: number;
  events: readonly SimEvent[];
  coreIntegrity: number;
  uptimeTicks: number;
  severedTicks: number;
}>;
