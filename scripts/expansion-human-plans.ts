import { getExpansionLevelDefinition } from "../src/data/campaigns/expansion";
import type { ExpansionContentRevision, ExpansionLevelDefinition } from "../src/sim/expansion/types";
import type { GridPosition } from "../src/sim/types";

export type HumanBuildPlan = Readonly<Record<"turret" | "latencyTrap" | "firewall", readonly GridPosition[]> & { arcIce?: readonly GridPosition[] }>;

// Based on the historical guided formations. This separate lane repairs their
// illegal perimeter traps, void/Core placements, and conflicting tool positions.
// The historical fast-bot fixture remains unchanged for comparison.
export const HUMAN_BUILD_PLANS: Readonly<Record<number, HumanBuildPlan>> = {
  1: { turret: [{ x: 1, y: 3 }, { x: 5, y: 3 }, { x: 3, y: 5 }, { x: 5, y: 5 }, { x: 1, y: 5 }], latencyTrap: [{ x: 1, y: 4 }, { x: 3, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 5 }], firewall: [{ x: 2, y: 3 }, { x: 4, y: 5 }] },
  2: { turret: [{ x: 6, y: 1 }, { x: 3, y: 4 }, { x: 1, y: 4 }, { x: 4, y: 1 }, { x: 6, y: 3 }], latencyTrap: [{ x: 1, y: 3 }, { x: 3, y: 5 }, { x: 4, y: 3 }, { x: 6, y: 4 }, { x: 5, y: 1 }], firewall: [{ x: 1, y: 2 }, { x: 5, y: 2 }] },
  3: { turret: [{ x: 2, y: 2 }, { x: 5, y: 3 }, { x: 6, y: 4 }, { x: 4, y: 2 }, { x: 3, y: 1 }], latencyTrap: [{ x: 6, y: 3 }, { x: 5, y: 6 }, { x: 4, y: 4 }, { x: 3, y: 4 }, { x: 1, y: 2 }], firewall: [{ x: 6, y: 2 }, { x: 2, y: 4 }] },
  4: { turret: [{ x: 1, y: 2 }, { x: 6, y: 6 }, { x: 4, y: 2 }, { x: 5, y: 5 }, { x: 3, y: 1 }], latencyTrap: [{ x: 1, y: 1 }, { x: 3, y: 3 }, { x: 5, y: 2 }, { x: 4, y: 5 }, { x: 6, y: 2 }], firewall: [{ x: 1, y: 3 }, { x: 6, y: 3 }] },
  5: { turret: [{ x: 1, y: 2 }, { x: 4, y: 3 }, { x: 6, y: 5 }, { x: 3, y: 2 }, { x: 5, y: 4 }, { x: 2, y: 1 }], latencyTrap: [{ x: 6, y: 4 }, { x: 5, y: 6 }, { x: 4, y: 5 }, { x: 3, y: 4 }, { x: 2, y: 3 }], firewall: [{ x: 6, y: 2 }, { x: 1, y: 3 }] },
  6: { turret: [{ x: 1, y: 1 }, { x: 6, y: 1 }, { x: 1, y: 6 }, { x: 6, y: 6 }, { x: 3, y: 3 }, { x: 5, y: 5 }, { x: 1, y: 3 }, { x: 6, y: 3 }, { x: 3, y: 5 }, { x: 5, y: 3 }], latencyTrap: [{ x: 1, y: 2 }, { x: 6, y: 2 }, { x: 1, y: 5 }, { x: 6, y: 5 }, { x: 2, y: 1 }, { x: 4, y: 6 }], firewall: [{ x: 4, y: 2 }, { x: 7, y: 3 }, { x: 0, y: 7 }, { x: 4, y: 0 }] },
  7: { turret: [{ x: 0, y: 4 }, { x: 7, y: 1 }, { x: 3, y: 0 }, { x: 7, y: 7 }, { x: 1, y: 6 }, { x: 4, y: 0 }, { x: 7, y: 4 }, { x: 3, y: 6 }, { x: 1, y: 2 }, { x: 6, y: 2 }], latencyTrap: [{ x: 1, y: 3 }, { x: 6, y: 3 }, { x: 1, y: 5 }, { x: 6, y: 1 }, { x: 3, y: 5 }, { x: 5, y: 1 }], firewall: [{ x: 4, y: 6 }, { x: 0, y: 7 }, { x: 7, y: 0 }, { x: 3, y: 7 }] },
  8: { turret: [{ x: 7, y: 4 }, { x: 5, y: 4 }, { x: 3, y: 3 }, { x: 1, y: 3 }, { x: 6, y: 0 }, { x: 3, y: 7 }, { x: 0, y: 3 }, { x: 7, y: 7 }, { x: 4, y: 1 }, { x: 1, y: 5 }], latencyTrap: [{ x: 6, y: 5 }, { x: 5, y: 6 }, { x: 3, y: 6 }, { x: 1, y: 6 }, { x: 6, y: 4 }, { x: 1, y: 2 }], firewall: [{ x: 6, y: 6 }, { x: 7, y: 6 }, { x: 0, y: 0 }, { x: 4, y: 7 }] },
  9: { turret: [{ x: 0, y: 4 }, { x: 7, y: 4 }, { x: 4, y: 7 }, { x: 4, y: 0 }, { x: 1, y: 4 }, { x: 6, y: 4 }, { x: 3, y: 7 }, { x: 7, y: 1 }, { x: 0, y: 1 }, { x: 4, y: 2 }], latencyTrap: [{ x: 1, y: 6 }, { x: 6, y: 6 }, { x: 1, y: 2 }, { x: 6, y: 1 }, { x: 3, y: 3 }, { x: 4, y: 6 }], firewall: [{ x: 3, y: 1 }, { x: 0, y: 0 }, { x: 7, y: 7 }, { x: 1, y: 3 }] },
  10: { turret: [{ x: 0, y: 3 }, { x: 7, y: 4 }, { x: 3, y: 7 }, { x: 4, y: 0 }, { x: 1, y: 4 }, { x: 6, y: 6 }, { x: 3, y: 0 }, { x: 7, y: 2 }, { x: 0, y: 5 }, { x: 5, y: 4 }], latencyTrap: [{ x: 1, y: 1 }, { x: 6, y: 4 }, { x: 2, y: 6 }, { x: 5, y: 1 }, { x: 3, y: 6 }, { x: 6, y: 2 }], firewall: [{ x: 6, y: 3 }, { x: 7, y: 7 }, { x: 0, y: 0 }, { x: 5, y: 6 }] },
};

export function validateHumanBuildPlan(levelId: number, plan: HumanBuildPlan, contentRevision: ExpansionContentRevision = "expansion-1-r3"): ExpansionLevelDefinition {
  const level = getExpansionLevelDefinition(levelId, contentRevision);
  if (!level) throw new Error(`Human plan references unauthored Level ${levelId}.`);
  return validateHumanBuildPlanDefinition(level, plan);
}

/** Validate proposed content before it is registered for playable/replay use. */
export function validateHumanBuildPlanDefinition(level: ExpansionLevelDefinition, plan: HumanBuildPlan): ExpansionLevelDefinition {
  const levelId = level.id;
  const occupied = new Set<string>();
  for (const unit of ["turret", "latencyTrap", "firewall", "arcIce"] as const) {
    const positions = plan[unit] ?? [];
    if (positions.length && !level.toolsUnlocked.includes(unit)) throw new Error(`Level ${levelId} plan uses locked ${unit}.`);
    for (const position of positions) {
      const label = `Level ${levelId} ${unit} (${position.x},${position.y})`;
      if (!Number.isInteger(position.x) || !Number.isInteger(position.y) || position.x < 0 || position.y < 0 || position.x >= level.gridSize || position.y >= level.gridSize) throw new Error(`${label} is out of bounds.`);
      if ([level.source, level.core, ...level.voidTiles].some((candidate) => samePosition(candidate, position))) throw new Error(`${label} overlaps Source, Core, or void.`);
      if (unit === "latencyTrap" && [position.x, position.y].some((coordinate) => coordinate === 0 || coordinate === level.gridSize - 1)) throw new Error(`${label} is an illegal perimeter trap.`);
      const key = `${position.x},${position.y}`;
      if (occupied.has(key)) throw new Error(`${label} overlaps another planned unit.`);
      occupied.add(key);
      const initial = level.initialTiles.find((tile) => samePosition(tile.position, position));
      if (initial && initial.kind !== unit) throw new Error(`${label} conflicts with initial ${initial.kind}.`);
    }
  }
  return level;
}

function samePosition(left: GridPosition, right: GridPosition): boolean {
  return left.x === right.x && left.y === right.y;
}
