export const UNIT_TUNING = {
  relay: {
    cost: 7,
    sellRefund: 3,
    hp: 6,
    signalRange: 2,
  },
  firewall: {
    cost: 10,
    sellRefund: 4,
    hp: 24,
  },
  turret: {
    cost: 18,
    sellRefund: 8,
    hp: 10,
    range: 1,
    damagePerTick: 4,
  },
  scrubber: {
    cost: 9,
    sellRefund: 0,
    hp: 8,
    cleanseTicks: 12,
  },
  overclock: {
    cost: 14,
    sellRefund: 6,
    hp: 8,
    bonusDamage: 3,
  },
} as const;
