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

/** Approved Chapter 3 contract; unavailable to older content revisions. */
export const ARC_ICE_RULES = {
  cost: 20, sellRefund: 10, hp: 10,
  firstTargetRange: 3, chainJumpRange: 2,
  chainDamage: [3, 2, 1] as readonly number[],
} as const;

export const SHIELD_DRONE_RULES = {
  maxHp: 12, moveEveryTicks: 3, corruptionTicks: 8,
  spawnBatchSize: 1, chewDamage: 1, coreContactDamage: 1,
  targeting: "route", onDeathSpawn: null,
  shieldRange: 2, shieldReduction: 2,
} as const;
