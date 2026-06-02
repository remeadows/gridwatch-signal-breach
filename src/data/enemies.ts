export const ENEMY_TUNING = {
  probe: {
    maxHp: 7,
    moveEveryTicks: 2,
    corruptionTicks: 7,
    spawnWeight: 6,
    spawnBatchSize: 1,
  },
  crawler: {
    maxHp: 20,
    moveEveryTicks: 3,
    corruptionTicks: 3,
    spawnWeight: 3,
    spawnBatchSize: 1,
  },
  spoof: {
    maxHp: 12,
    moveEveryTicks: 2,
    corruptionTicks: 4,
    spawnWeight: 2,
    spawnBatchSize: 1,
  },
} as const;

export const INTRUSION_SPAWN_TUNING = {
  firstTick: 2,
  everyTicks: 3,
  maxActive: 9,
  maxSpawned: 34,
  perimeterPickAttempts: 8,
} as const;
