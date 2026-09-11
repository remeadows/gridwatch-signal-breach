import { HUMAN_BUILD_PLANS, type HumanBuildPlan } from "./expansion-human-plans";
import { CHAPTER_03_HUMAN_BUILD_PLANS } from "./expansion-chapter03-human-plans";
import { points } from "../src/data/campaigns/expansion/r4/authoring";

export const R4_HUMAN_BUILD_PLANS: Readonly<Record<number, HumanBuildPlan>> = {
  ...Object.fromEntries([1, 2, 3, 4, 5].map((id) => [id, HUMAN_BUILD_PLANS[id]])),
  ...Object.fromEntries([6, 7, 8, 9, 10].map((id) => [id + 3, HUMAN_BUILD_PLANS[id]])),
  ...Object.fromEntries([11, 12, 13, 14, 15].map((id) => [id + 6, CHAPTER_03_HUMAN_BUILD_PLANS[id]])),
  22: { turret: points([[1, 3], [5, 5], [6, 3], [1, 1], [3, 6], [6, 6]]), arcIce: points([[3, 1], [2, 3], [5, 3], [1, 5], [5, 6], [7, 3]]), firewall: points([[7, 1], [0, 7], [7, 7]]), latencyTrap: [] },
  23: { turret: points([[1, 3], [5, 5], [6, 1], [1, 6], [4, 6], [7, 4]]), arcIce: points([[4, 2], [2, 3], [5, 1], [2, 5], [6, 4], [0, 4]]), firewall: points([[0, 0], [7, 7], [4, 7]]), latencyTrap: [] },
  24: { turret: points([[6, 3], [2, 2], [4, 4], [1, 6], [5, 6], [6, 0]]), arcIce: points([[2, 5], [5, 1], [2, 3], [5, 4], [0, 4], [7, 4]]), firewall: points([[7, 6], [0, 0], [4, 7]]), latencyTrap: [] },
  25: { turret: points([[2, 1], [6, 5], [3, 4], [1, 0], [5, 6], [1, 6], [6, 2]]), arcIce: points([[4, 3], [1, 2], [5, 4], [2, 4], [4, 6], [7, 5], [5, 1]]), firewall: points([[0, 7], [7, 0], [0, 4]]), latencyTrap: [] },
  14: {
    turret: points([[1, 2], [6, 1], [5, 4], [1, 6], [3, 2], [5, 2], [6, 5], [2, 3], [4, 5], [0, 1], [7, 6]]),
    latencyTrap: points([[2, 4], [3, 3], [5, 3], [6, 4], [1, 3], [3, 5]]), firewall: points([[3, 6], [7, 0], [0, 7]]),
  },
  15: {
    turret: points([[1, 5], [5, 1], [2, 3], [5, 3], [3, 1], [5, 5], [2, 6], [5, 6], [1, 1], [6, 1], [7, 6]]),
    latencyTrap: points([[1, 2], [3, 2], [5, 2], [3, 4], [5, 4], [6, 5]]), firewall: points([[4, 0], [0, 7], [7, 0]]),
  },
  16: {
    turret: points([[1, 1], [6, 6], [4, 2], [2, 5], [1, 4], [5, 3], [3, 6], [5, 1], [6, 5], [1, 6], [7, 2]]),
    latencyTrap: points([[2, 1], [2, 3], [3, 4], [4, 3], [5, 4], [5, 6]]), firewall: points([[6, 2], [0, 6], [7, 0]]),
  },
  6: {
    turret: points([[1, 1], [5, 1], [1, 6], [5, 6], [3, 1], [6, 4], [2, 3], [5, 4], [3, 6], [1, 3]]),
    latencyTrap: points([[2, 2], [4, 2], [5, 3], [2, 4], [5, 5]]), firewall: points([[0, 5], [7, 2]]),
  },
  7: {
    turret: points([[5, 1], [2, 6], [1, 3], [6, 4], [5, 6], [3, 1], [2, 4], [5, 3], [1, 6], [6, 1]]),
    latencyTrap: points([[3, 2], [4, 3], [4, 5], [3, 6], [4, 1], [2, 3]]), firewall: points([[0, 4], [7, 3]]),
  },
  8: {
    turret: points([[1, 1], [1, 4], [6, 6], [4, 2], [3, 5], [5, 5], [3, 1], [7, 3], [1, 6], [5, 1]]),
    latencyTrap: points([[2, 3], [4, 3], [5, 4], [6, 3], [3, 2], [2, 5]]), firewall: points([[0, 5], [7, 1]]),
  },
};
