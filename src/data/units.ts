export const UNIT_TUNING = {
  relay: {
    cost: 7,
    sellRefund: 3,
    signalRange: 2,
  },
  firewall: {
    cost: 12,
    sellRefund: 5,
    hardeningBonusTicks: 8,
  },
  turret: {
    cost: 18,
    sellRefund: 8,
    range: 1,
    damagePerTick: 4,
  },
} as const;
