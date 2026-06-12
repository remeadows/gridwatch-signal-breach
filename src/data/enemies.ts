export const ENEMY_TUNING = {
  probe: {
    maxHp: 7,
    moveEveryTicks: 2,
    corruptionTicks: 7,
    spawnBatchSize: 1,
  },
  crawler: {
    maxHp: 20,
    moveEveryTicks: 3,
    corruptionTicks: 3,
    spawnBatchSize: 1,
  },
  spoof: {
    maxHp: 12,
    moveEveryTicks: 2,
    corruptionTicks: 4,
    spawnBatchSize: 1,
  },
} as const;
