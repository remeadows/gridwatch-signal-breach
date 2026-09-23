import type {
  ChapterDefinition,
  ExpansionCampaignDefinition,
  ExpansionCampaignLevelDefinition,
} from "./types";
import { EXPANSION_CAMPAIGN_ID, EXPANSION_CONTENT_REVISION, EXPANSION_RULESET_ID } from "../../sim/expansion/types";
import { getRetainedExpansionLevel } from "./expansion/retained";
import { EXPANSION_R4_CHAPTERS, EXPANSION_R4_LEVELS } from "./expansion/r4";

/** Current r4 navigation. Historical replay identity lives in retained.ts. */
export const EXPANSION_NAVIGATION_CHAPTERS: readonly ChapterDefinition[] = EXPANSION_R4_CHAPTERS;

export type ExpansionNavigationPlaceholderLevel = Readonly<{
  id: number;
  chapterId: number;
  codename: string;
  availability: "not-playable";
}>;

/** Retained only as a compatibility surface for the retired Phase 7B shell. */
export const EXPANSION_NAVIGATION_PLACEHOLDER_LEVELS: readonly ExpansionNavigationPlaceholderLevel[] = [];

/** Current local campaign: three chapters, 25 levels, 125 waves. */
export const EXPANSION_LEVELS: readonly ExpansionCampaignLevelDefinition[] = EXPANSION_R4_LEVELS;

export const EXPANSION_CAMPAIGN: ExpansionCampaignDefinition = {
  id: EXPANSION_CAMPAIGN_ID,
  title: "GridWatch: Signal Breach Expansion",
  ruleset: EXPANSION_RULESET_ID,
  contentRevision: EXPANSION_CONTENT_REVISION,
  chapters: EXPANSION_NAVIGATION_CHAPTERS,
};

export function getExpansionLevelDefinition(
  levelId: number,
  contentRevision: string = EXPANSION_CONTENT_REVISION,
): ExpansionCampaignLevelDefinition | undefined {
  if (contentRevision === "expansion-1-r4") return EXPANSION_R4_LEVELS.find((level) => level.id === levelId);
  return getRetainedExpansionLevel(levelId, contentRevision);
}

export function isExpansionChapterAuthored(chapterId: number): boolean {
  const chapter = EXPANSION_NAVIGATION_CHAPTERS.find(
    (candidate) => candidate.id === chapterId,
  );
  return Boolean(
    chapter && chapter.levelIds.every((levelId) => getExpansionLevelDefinition(levelId)),
  );
}

export function isExpansionChapterAvailable(
  chapterId: number,
  highestUnlockedLevel: number,
): boolean {
  const chapter = EXPANSION_NAVIGATION_CHAPTERS.find(
    (candidate) => candidate.id === chapterId,
  );
  const firstLevelId = chapter?.levelIds[0];
  return Boolean(
    firstLevelId !== undefined &&
    isExpansionChapterAuthored(chapterId) &&
    firstLevelId <= highestUnlockedLevel,
  );
}

export function getExpansionNavigationPlaceholderLevel(
  levelId: number,
): ExpansionNavigationPlaceholderLevel | undefined {
  return EXPANSION_NAVIGATION_PLACEHOLDER_LEVELS.find(
    (candidate) => candidate.id === levelId,
  );
}
