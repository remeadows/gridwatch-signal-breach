export const UNIT_TUNING = {
  relay: {
    cost: 6,
    sellRefund: 3,
    signalRange: 2,
  },
  firewall: {
    cost: 12,
    sellRefund: 5,
    hardeningBonusTicks: 8,
  },
  turret: {
    cost: 16,
    sellRefund: 8,
    range: 1,
    damagePerTick: 6,
  },
} as const;
