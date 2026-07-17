import type { ExpansionCampaignDefinition, LevelDefinition } from "./types";

/**
 * This is a registry placeholder only. Phase 7A must not ship an authored or
 * playable expansion level; later chapter PRs append immutable level records.
 */
export const EXPANSION_LEVELS: readonly LevelDefinition[] = [];

export const EXPANSION_CAMPAIGN: ExpansionCampaignDefinition = {
  id: "expansion-1",
  title: "GridWatch: Signal Breach Expansion",
  ruleset: "expansion-v1",
  contentRevision: "unpublished",
  chapters: [],
};

export function getExpansionLevelDefinition(
  levelId: number,
): LevelDefinition | undefined {
  return EXPANSION_LEVELS.find((candidate) => candidate.id === levelId);
}
