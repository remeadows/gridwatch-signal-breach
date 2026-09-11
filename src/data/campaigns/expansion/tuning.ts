/** Immutable Expansion 1 ruleset tuning. Changes require a new replay ruleset. */
export const EXPANSION_1_R1_TUNING = {
  turretDamagePerTick: 4,
  scrubberCleanseTicks: 6,
  initialCoreIntegrity: 180,
  coreIntegrityMax: 180,
  coreIntegrityDrainPerSeveredTick: 1,
  coreIntegrityRegenPerLiveTick: 2,
  scoring: {
    neutralizedWeight: 10,
    efficiencyBonusCap: 60,
    zeroLatencyWardenMinScore: 440,
    trafficControllerMinScore: 340,
  },
} as const;

/** Approved Chapter 2 Sapper contract. Keep synchronized with the mechanic proof. */
export const SAPPER_TUNING = {
  maxHp: 16,
  moveEveryTicks: 2,
  corruptionTicks: 4,
  spawnBatchSize: 1,
  chewDamage: 8,
  coreContactDamage: 2,
  deathPulseDamage: 6,
  deathPulseRange: 1,
  targeting: "firewallThenHardware",
  onDeathSpawn: null,
} as const;
