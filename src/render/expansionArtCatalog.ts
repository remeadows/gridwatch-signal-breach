import type { ExpansionLevelDefinition } from "../sim/expansion/types";

export const EXPANSION_ART_FAMILIES = {
  floorChapter1: "floor-chapter1", floorChapter2: "floor-chapter2", floorChapter3: "floor-chapter3",
  source: "source", core: "core", relay: "relay", firewall: "firewall", turret: "turret",
  scrubber: "scrubber", overclock: "overclock", latencyTrap: "latency-trap",
  probe: "probe", crawler: "crawler", spoof: "spoof", hunter: "hunter", splitter: "splitter",
  goliath: "goliath", rusher: "rusher", sapper: "sapper", arcIce: "arc-turret", shieldDrone: "shield-drone",
} as const;

export type ExpansionVisualAssetId = keyof typeof EXPANSION_ART_FAMILIES;
export type ExpansionArtMode = "blender-v2" | "phase6" | "glyphs";

export function isExpansionVisualAssetId(id: string): id is ExpansionVisualAssetId {
  return Object.prototype.hasOwnProperty.call(EXPANSION_ART_FAMILIES, id);
}

export function getExpansionFloorAssetId(chapterId: number): ExpansionVisualAssetId {
  if (chapterId === 1) return "floorChapter1";
  if (chapterId === 2) return "floorChapter2";
  if (chapterId === 3) return "floorChapter3";
  throw new Error(`No authored floor for Expansion Chapter ${chapterId}.`);
}

/** The same authored roster drives image preloading and active-byte verification. */
export function getExpansionLevelArtRoster(level: ExpansionLevelDefinition): readonly ExpansionVisualAssetId[] {
  const ids = new Set<ExpansionVisualAssetId>([getExpansionFloorAssetId(level.chapterId), "source", "core"]);
  for (const tool of level.toolsUnlocked) if (isExpansionVisualAssetId(tool)) ids.add(tool);
  for (const tile of level.initialTiles) if (isExpansionVisualAssetId(tile.kind)) ids.add(tile.kind);
  for (const wave of level.waves) {
    for (const [enemy, weight] of Object.entries(wave.enemyWeights)) {
      if (weight && isExpansionVisualAssetId(enemy)) ids.add(enemy);
    }
    for (const spawn of wave.scriptedSpawns ?? []) if (isExpansionVisualAssetId(spawn.kind)) ids.add(spawn.kind);
  }
  if (ids.has("splitter")) ids.add("probe");
  return [...ids];
}
