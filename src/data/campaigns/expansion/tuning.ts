/** Immutable Expansion 1 ruleset tuning. Changes require a new replay ruleset. */
export const EXPANSION_1_R1_TUNING = {
  turretDamagePerTick: 4,
  scrubberCleanseTicks: 6,
  initialCoreIntegrity: 180,
  coreIntegrityMax: 180,
  coreIntegrityDrainPerSeveredTick: 1,
  coreIntegrityRegenPerLiveTick: 2,
} as const;
