import type { ExpansionCampaignLevelDefinition } from "../types";
import { CHAPTER_01_LEVELS } from "./chapter01";
import { CHAPTER_02_LEVELS } from "./chapter02";
import { CHAPTER_03_LEVELS } from "./chapter03";

/** Historical records: never renumber, rebalance, or replace these definitions. */
export const EXPANSION_R3_LEVELS: readonly ExpansionCampaignLevelDefinition[] = [
  ...CHAPTER_01_LEVELS, ...CHAPTER_02_LEVELS, ...CHAPTER_03_LEVELS,
];

const RETAINED_LEVELS: Readonly<Record<string, readonly ExpansionCampaignLevelDefinition[]>> = {
  "expansion-1-r1": CHAPTER_01_LEVELS,
  "expansion-1-r2": [...CHAPTER_01_LEVELS, ...CHAPTER_02_LEVELS],
  "expansion-1-r3": EXPANSION_R3_LEVELS,
};

export function getRetainedExpansionLevel(levelId: number, revision: string): ExpansionCampaignLevelDefinition | undefined {
  if (!Number.isInteger(levelId) || !Object.prototype.hasOwnProperty.call(RETAINED_LEVELS, revision)) return undefined;
  return RETAINED_LEVELS[revision]?.find((level) => level.id === levelId);
}
