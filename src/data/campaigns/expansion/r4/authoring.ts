import type { ExpansionEnemyKind, ExpansionHardwareKind, ExpansionInitialTileDefinition, ExpansionLevelDefinition, ExpansionWaveDefinition } from "../../../../sim/expansion/types";
import type { GridPosition } from "../../../../sim/types";

export const ALL_EDGES = ["west", "north", "east", "south"] as const;
export const LATENCY_TOOLS = ["relay", "firewall", "turret", "scrubber", "latencyTrap", "sell"] as const;
export const SHIELD_TOOLS = ["relay", "firewall", "turret", "arcIce", "scrubber", "sell"] as const;
export type Point = readonly [number, number];
export const points = (values: readonly Point[]): GridPosition[] => values.map(([x, y]) => ({ x, y }));
export const tiles = (kind: ExpansionHardwareKind, values: readonly Point[]): ExpansionInitialTileDefinition[] => points(values).map((position) => ({ kind, position }));

/** r4 clones identities, never mutates the retained definitions. */
export function retainDesign(level: ExpansionLevelDefinition, id: number): ExpansionLevelDefinition {
  return { ...level, id, difficultyIndex: id * 100,
    ...(level.id === 5 ? { tagline: "The first hard checkpoint.", briefing: "The Goliath absorbs fire while Rushers race around it. Keep your relay chain alive through five holds before the outer lanes open." } : {}),
    ...(level.id === 10 ? { tagline: "Read the lock before the line collapses.", briefing: "Isolate bait, overlap ICE, and preserve a rebuild lane. Heavy enemies screen Sappers at this checkpoint before the final demolition tests." } : {}),
    ...(level.id === 15 ? { tagline: "Break the canopy. Keep the route.", briefing: "Combine Arc ICE and normal ICE to break linked formations. This checkpoint prepares you for four final shield-network challenges." } : {}),
  };
}

type WaveInput = Readonly<{
  label: string; briefing: string; grant: number; count: number; active: number; cadence: number;
  weights: Partial<Record<ExpansionEnemyKind, number>>;
  edges?: ExpansionWaveDefinition["spawnEdges"];
  scripts?: ExpansionWaveDefinition["scriptedSpawns"];
}>;
export function waves(inputs: readonly WaveInput[]): ExpansionWaveDefinition[] {
  if (inputs.length !== 5) throw new Error("r4 levels require exactly five authored waves");
  return inputs.map((input, index) => ({ id: index + 1, label: input.label, briefing: input.briefing,
    prepTicks: 18, bandwidthGrant: input.grant, bandwidthTricklePerTick: 1, bandwidthTrickleEveryTicks: 6,
    spawnFirstTick: 3, spawnEveryTicks: input.cadence, maxActiveIntrusions: input.active,
    maxSpawnedIntrusions: input.count, perimeterPickAttempts: 16, enemyWeights: input.weights,
    spawnEdges: input.edges ?? ALL_EDGES, ...(input.scripts ? { scriptedSpawns: input.scripts } : {}),
  }));
}
