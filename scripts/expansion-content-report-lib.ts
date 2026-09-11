import { getExpansionLevelContentHash } from "../src/data/campaigns/expansion/contentManifest";
import { createExpansionGameState } from "../src/sim/expansion/state";
import { EXPANSION_CAMPAIGN_ID, EXPANSION_CONTENT_REVISION, EXPANSION_RULESET_ID } from "../src/sim/expansion/types";
import type {
  ExpansionEnemyDefinition,
  ExpansionEnemyKind,
  ExpansionHardwareKind,
  ExpansionLevelDefinition,
  ExpansionPlayerTool,
  ExpansionWaveDefinition,
} from "../src/sim/expansion/types";
import type { GridPosition, SpawnEdge } from "../src/sim/types";

export const EXPANSION_DOCK_TOOL_LIMIT = 6;
export const EXPANSION_UNIT_TOOL_LIMIT = 5;

const ENEMY_KINDS: readonly ExpansionEnemyKind[] = [
  "probe",
  "crawler",
  "spoof",
  "hunter",
  "splitter",
  "goliath",
  "rusher",
  "sapper",
  "shieldDrone",
];
const HARDWARE_KINDS: readonly ExpansionHardwareKind[] = [
  "relay",
  "firewall",
  "turret",
  "scrubber",
  "overclock",
  "latencyTrap",
  "arcIce",
];
const PLAYER_TOOLS: readonly ExpansionPlayerTool[] = [...HARDWARE_KINDS, "sell"];
const SPAWN_EDGES: readonly SpawnEdge[] = ["north", "east", "south", "west"];

export type ExpansionContentReport = ReturnType<typeof buildExpansionContentReport>;

export function buildExpansionContentReport(
  levels: readonly ExpansionLevelDefinition[],
  campaignHash: string,
  levelHashes: Readonly<Record<number, string>>,
) {
  const reportLevels = levels.map((level) => {
    const state = createExpansionGameState({
      levelId: level.id,
      contentHash: levelHashes[level.id] ?? getExpansionLevelContentHash(level.id),
      seed: "content-report",
    });
    const waves = level.waves.map((wave) => ({
      campaign: state.config.campaignId,
      chapterId: level.chapterId,
      levelId: level.id,
      id: wave.id,
      label: wave.label,
      spawnEdges: [...wave.spawnEdges],
      scriptedSpawns: [...(wave.scriptedSpawns ?? [])],
      enemyWeights: { ...wave.enemyWeights },
      maxActiveIntrusions: wave.maxActiveIntrusions,
      maxSpawnedIntrusions: wave.maxSpawnedIntrusions,
      prepTicks: wave.prepTicks,
      spawnFirstTick: wave.spawnFirstTick,
      spawnEveryTicks: wave.spawnEveryTicks,
      perimeterPickAttempts: wave.perimeterPickAttempts,
      economy: {
        bandwidthGrant: wave.bandwidthGrant,
        bandwidthTricklePerTick: wave.bandwidthTricklePerTick,
        bandwidthTrickleEveryTicks: wave.bandwidthTrickleEveryTicks,
      },
      threatBudget: calculateWaveThreatBudget(wave, state.config.enemies),
    }));

    return {
      campaign: state.config.campaignId,
      chapterId: level.chapterId,
      id: level.id,
      codename: level.codename,
      contentHash: levelHashes[level.id] ?? getExpansionLevelContentHash(level.id),
      difficultyIndex: level.difficultyIndex,
      requiredMechanic: level.requiredMechanic,
      threatBudget: waves.reduce((total, wave) => total + wave.threatBudget, 0),
      waveCount: level.waves.length,
      gridSize: level.gridSize,
      source: level.source,
      core: level.core,
      voidTiles: [...level.voidTiles],
      initialTiles: [...level.initialTiles],
      toolsUnlocked: [...level.toolsUnlocked],
      toolCount: level.toolsUnlocked.length,
      waves,
    };
  });

  return {
    schema: 2,
    campaign: EXPANSION_CAMPAIGN_ID,
    ruleset: EXPANSION_RULESET_ID,
    contentRevision: EXPANSION_CONTENT_REVISION,
    chapters: [...new Set(levels.map((level) => level.chapterId))],
    levelCount: levels.length,
    waveCount: levels.reduce((total, level) => total + level.waves.length, 0),
    dockToolLimit: EXPANSION_DOCK_TOOL_LIMIT,
    threatBudgetModel: "v2-weighted-enemy-pressure-targeting-pulse-concurrency-edges-cadence-scripts-minus-economy",
    campaignHash,
    levelHashes,
    levels: reportLevels,
  } as const;
}

export function validateExpansionContent(levels: readonly ExpansionLevelDefinition[]): void {
  requireUnique(levels.map((level) => level.id), "Expansion level IDs");
  let previousDifficulty = Number.NEGATIVE_INFINITY;
  let previousThreatBudget = Number.NEGATIVE_INFINITY;
  let previousChapterId = 0;

  for (const level of levels) {
    assert(Number.isInteger(level.id) && level.id > 0, `Level ${level.id} has an invalid ID.`);
    assert(level.gridSize === 8, `Level ${level.id} must use an 8x8 grid.`);
    assert(level.waves.length === 5, `Level ${level.id} must contain exactly five waves.`);
    assert(["latencyTrap", "sapperSpacing", "shieldNetwork"].includes(level.requiredMechanic), `Level ${level.id} references an unknown required mechanic.`);
    assert(level.difficultyIndex > previousDifficulty, `Level ${level.id} difficultyIndex is not strictly increasing.`);
    previousDifficulty = level.difficultyIndex;

    validatePosition(level.source, level.gridSize, `Level ${level.id} Source`);
    validatePosition(level.core, level.gridSize, `Level ${level.id} Core`);
    assert(positionKey(level.source) !== positionKey(level.core), `Level ${level.id} Source overlaps Core.`);

    requireUnique(level.voidTiles.map(positionKey), `Level ${level.id} void positions`);
    requireUnique(level.initialTiles.map((tile) => positionKey(tile.position)), `Level ${level.id} initial-tile positions`);
    const voidPositions = new Set(level.voidTiles.map(positionKey));
    for (const position of level.voidTiles) validatePosition(position, level.gridSize, `Level ${level.id} void tile`);
    assert(!voidPositions.has(positionKey(level.source)), `Level ${level.id} Source overlaps void.`);
    assert(!voidPositions.has(positionKey(level.core)), `Level ${level.id} Core overlaps void.`);

    for (const tile of level.initialTiles) {
      validatePosition(tile.position, level.gridSize, `Level ${level.id} initial tile`);
      assert(HARDWARE_KINDS.includes(tile.kind), `Level ${level.id} references unknown initial hardware ${tile.kind}.`);
      assert(!voidPositions.has(positionKey(tile.position)), `Level ${level.id} initial tile overlaps void at ${positionKey(tile.position)}.`);
      assert(positionKey(tile.position) !== positionKey(level.source), `Level ${level.id} initial tile overlaps Source.`);
      assert(positionKey(tile.position) !== positionKey(level.core), `Level ${level.id} initial tile overlaps Core.`);
      assert(level.toolsUnlocked.includes(tile.kind), `Level ${level.id} initial ${tile.kind} is not in toolsUnlocked.`);
    }

    requireUnique(level.toolsUnlocked, `Level ${level.id} tool IDs`);
    assert(level.toolsUnlocked.every((tool) => PLAYER_TOOLS.includes(tool)), `Level ${level.id} references an unknown tool.`);
    assert(level.toolsUnlocked.includes("sell"), `Level ${level.id} must include Sell.`);
    assert(level.toolsUnlocked.length <= EXPANSION_DOCK_TOOL_LIMIT, `Level ${level.id} exceeds the six-slot dock limit.`);
    assert(level.toolsUnlocked.filter((tool) => tool !== "sell").length <= EXPANSION_UNIT_TOOL_LIMIT, `Level ${level.id} exceeds five unit tools.`);

    requireUnique(level.waves.map((wave) => wave.id), `Level ${level.id} wave IDs`);
    let levelThreatBudget = 0;
    const state = createExpansionGameState({ levelId: level.id, contentHash: "content-validation", seed: "content-validation" });
    assert(state.signal.status === "live", `Level ${level.id} initial route is not live.`);
    for (const wave of level.waves) {
      validateWave(level, wave, state.config.enemies);
      levelThreatBudget += calculateWaveThreatBudget(wave, state.config.enemies);
    }
    // A new chapter teaches its counter at lower traffic. This proxy does not
    // price shield synergy or learning; paced runs measure the actual margin.
    if (previousChapterId === level.chapterId) assert(levelThreatBudget > previousThreatBudget, `Level ${level.id} within-chapter threat budget is not strictly increasing.`);
    previousThreatBudget = levelThreatBudget;
    previousChapterId = level.chapterId;
  }
}

export function calculateWaveThreatBudget(
  wave: ExpansionWaveDefinition,
  enemies: Readonly<Record<ExpansionEnemyKind, ExpansionEnemyDefinition>>,
): number {
  const totalWeight = ENEMY_KINDS.reduce((total, kind) => total + (wave.enemyWeights[kind] ?? 0), 0);
  const weightedEnemyPressure = ENEMY_KINDS.reduce(
    (total, kind) => total + (wave.enemyWeights[kind] ?? 0) * calculateEnemyPressure(enemies[kind]),
    0,
  );
  const averageEnemyPressure = totalWeight === 0 ? 0 : Math.ceil(weightedEnemyPressure / totalWeight);
  const scriptedPressure = (wave.scriptedSpawns ?? []).reduce(
    (total, spawn) => total + calculateEnemyPressure(enemies[spawn.kind]) * 2,
    0,
  );
  const cadencePressure = Math.ceil(24 / wave.spawnEveryTicks) * 5;
  const economyRelief = wave.bandwidthGrant + Math.floor(
    30 * wave.bandwidthTricklePerTick / wave.bandwidthTrickleEveryTicks,
  );
  return Math.max(1, (
    wave.maxSpawnedIntrusions * averageEnemyPressure +
    wave.maxActiveIntrusions * 10 +
    wave.spawnEdges.length * 8 +
    cadencePressure +
    scriptedPressure -
    economyRelief
  ));
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function validateWave(
  level: ExpansionLevelDefinition,
  wave: ExpansionWaveDefinition,
  enemies: Readonly<Record<ExpansionEnemyKind, ExpansionEnemyDefinition>>,
): void {
  const identity = `Level ${level.id} Wave ${wave.id}`;
  assert(Number.isInteger(wave.id) && wave.id > 0, `${identity} has an invalid ID.`);
  assert(wave.spawnEdges.length > 0, `${identity} has no spawn edges.`);
  requireUnique(wave.spawnEdges, `${identity} spawn edges`);
  assert(wave.spawnEdges.every((edge) => SPAWN_EDGES.includes(edge)), `${identity} references an unknown spawn edge.`);
  assert(Number.isInteger(wave.maxActiveIntrusions) && wave.maxActiveIntrusions > 0, `${identity} has an invalid active limit.`);
  assert(Number.isInteger(wave.maxSpawnedIntrusions) && wave.maxSpawnedIntrusions > 0, `${identity} has an invalid spawn limit.`);
  assert(wave.maxActiveIntrusions <= wave.maxSpawnedIntrusions, `${identity} active limit exceeds spawn limit.`);
  assert(Number.isInteger(wave.prepTicks) && wave.prepTicks >= 0, `${identity} has invalid prep ticks.`);
  assert(Number.isInteger(wave.spawnFirstTick) && wave.spawnFirstTick >= 0, `${identity} has an invalid first spawn tick.`);
  assert(Number.isInteger(wave.spawnEveryTicks) && wave.spawnEveryTicks > 0, `${identity} has an invalid cadence.`);
  assert(Number.isInteger(wave.perimeterPickAttempts) && wave.perimeterPickAttempts > 0, `${identity} has invalid perimeter attempts.`);
  assert(Number.isInteger(wave.bandwidthGrant) && wave.bandwidthGrant >= 0, `${identity} has an invalid bandwidth grant.`);
  assert(Number.isInteger(wave.bandwidthTricklePerTick) && wave.bandwidthTricklePerTick >= 0, `${identity} has an invalid bandwidth trickle.`);
  assert(Number.isInteger(wave.bandwidthTrickleEveryTicks) && wave.bandwidthTrickleEveryTicks > 0, `${identity} has an invalid trickle cadence.`);

  const weightKeys = Object.keys(wave.enemyWeights);
  assert(weightKeys.every((key) => ENEMY_KINDS.includes(key as ExpansionEnemyKind)), `${identity} has invalid enemy references.`);
  assert(ENEMY_KINDS.every((kind) => wave.enemyWeights[kind] === undefined || (Number.isInteger(wave.enemyWeights[kind]) && (wave.enemyWeights[kind] ?? 0) >= 0)), `${identity} has invalid enemy weights.`);
  assert(ENEMY_KINDS.some((kind) => (wave.enemyWeights[kind] ?? 0) > 0), `${identity} has no weighted enemy.`);

  const scripts = wave.scriptedSpawns ?? [];
  assert(scripts.length <= wave.maxSpawnedIntrusions, `${identity} scripts exceed the spawn limit.`);
  let previousScriptTick = Number.NEGATIVE_INFINITY;
  for (const script of scripts) {
    assert(ENEMY_KINDS.includes(script.kind), `${identity} references unknown scripted enemy ${script.kind}.`);
    assert(Number.isInteger(script.waveTick) && script.waveTick >= 0, `${identity} has an invalid scripted spawn tick.`);
    assert(script.waveTick >= previousScriptTick, `${identity} scripted spawns are not ordered by tick.`);
    previousScriptTick = script.waveTick;
    assert(enemies[script.kind] !== undefined, `${identity} scripted enemy ${script.kind} has no tuning.`);
  }
}

function calculateEnemyPressure(enemy: ExpansionEnemyDefinition): number {
  const movementPressure = Math.ceil(12 / enemy.moveEveryTicks) * 5;
  const corruptionPressure = Math.ceil(12 / enemy.corruptionTicks) * 4;
  const targetingPressure = enemy.targeting === "units" ? 8 : enemy.targeting === "firewallThenHardware" ? 14 : 0;
  const splitPressure = enemy.onDeathSpawn ? enemy.onDeathSpawn.count * 6 : 0;
  const pulsePressure = (enemy.deathPulseDamage ?? 0) * (enemy.deathPulseRange ?? 0) * 2;
  return enemy.maxHp + movementPressure + corruptionPressure + enemy.spawnBatchSize * 2 + enemy.chewDamage * 2 + enemy.coreContactDamage * 8 + targetingPressure + splitPressure + pulsePressure;
}

function validatePosition(position: GridPosition, gridSize: number, label: string): void {
  assert(Number.isInteger(position.x) && Number.isInteger(position.y), `${label} is not integer-aligned.`);
  assert(position.x >= 0 && position.y >= 0 && position.x < gridSize && position.y < gridSize, `${label} is outside the 8x8 board.`);
}

function requireUnique(values: readonly (string | number)[], label: string): void {
  assert(new Set(values).size === values.length, `${label} contain duplicates.`);
}

function positionKey(position: GridPosition): string {
  return `${position.x},${position.y}`;
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
