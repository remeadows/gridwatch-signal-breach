import type { HumanBuildPlan } from "./expansion-human-plans";

/** Explicit finite formations for Chapter 3's Arc reach and spacing lessons. */
export const CHAPTER_03_HUMAN_BUILD_PLANS: Readonly<Record<number, HumanBuildPlan>> = {
  11: { turret: [{ x: 2, y: 3 }, { x: 6, y: 3 }, { x: 1, y: 5 }, { x: 6, y: 5 }, { x: 3, y: 5 }], arcIce: [{ x: 3, y: 2 }, { x: 5, y: 2 }, { x: 1, y: 2 }, { x: 5, y: 6 }, { x: 7, y: 3 }], firewall: [{ x: 0, y: 1 }, { x: 7, y: 6 }, { x: 4, y: 7 }], latencyTrap: [] },
  12: { turret: [{ x: 1, y: 4 }, { x: 5, y: 5 }, { x: 1, y: 1 }, { x: 6, y: 6 }, { x: 5, y: 0 }], arcIce: [{ x: 2, y: 4 }, { x: 4, y: 3 }, { x: 5, y: 1 }, { x: 1, y: 6 }, { x: 6, y: 3 }], firewall: [{ x: 0, y: 0 }, { x: 7, y: 7 }, { x: 6, y: 0 }], latencyTrap: [] },
  13: { turret: [{ x: 1, y: 1 }, { x: 6, y: 5 }, { x: 1, y: 5 }, { x: 6, y: 1 }, { x: 3, y: 6 }], arcIce: [{ x: 2, y: 1 }, { x: 5, y: 1 }, { x: 2, y: 5 }, { x: 5, y: 5 }, { x: 7, y: 5 }], firewall: [{ x: 0, y: 6 }, { x: 7, y: 6 }, { x: 4, y: 7 }], latencyTrap: [] },
  14: { turret: [{ x: 2, y: 1 }, { x: 1, y: 5 }, { x: 6, y: 3 }, { x: 0, y: 5 }, { x: 7, y: 2 }], arcIce: [{ x: 4, y: 5 }, { x: 2, y: 3 }, { x: 6, y: 6 }, { x: 1, y: 0 }, { x: 4, y: 0 }], firewall: [{ x: 6, y: 1 }, { x: 7, y: 0 }, { x: 0, y: 7 }, { x: 6, y: 7 }], latencyTrap: [] },
  15: { turret: [{ x: 1, y: 3 }, { x: 6, y: 4 }, { x: 4, y: 7 }, { x: 0, y: 2 }, { x: 7, y: 5 }], arcIce: [{ x: 5, y: 4 }, { x: 2, y: 3 }, { x: 5, y: 0 }, { x: 0, y: 5 }, { x: 7, y: 2 }], firewall: [{ x: 0, y: 3 }, { x: 7, y: 7 }, { x: 0, y: 0 }, { x: 2, y: 7 }], latencyTrap: [] },
};
