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
} as const;
