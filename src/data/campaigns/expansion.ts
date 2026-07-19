import type {
  ChapterDefinition,
  ExpansionCampaignDefinition,
  ExpansionCampaignLevelDefinition,
} from "./types";
import { EXPANSION_CONTENT_REVISION, EXPANSION_RULESET_ID } from "../../sim/expansion/types";
import { CHAPTER_01_LEVELS } from "./expansion/chapter01";

const EXPANSION_CHAPTER_COUNT = 6;
const LEVELS_PER_EXPANSION_CHAPTER = 5;

/**
 * Navigation metadata is intentionally distinct from authored level data. It
 * lets the disabled Phase 7B shell show six spoiler-safe chapter slots without
 * implying that any of their 30 level definitions exist yet.
 */
export const EXPANSION_NAVIGATION_CHAPTERS: readonly ChapterDefinition[] =
  Array.from({ length: EXPANSION_CHAPTER_COUNT }, (_, index) => {
    const chapterId = index + 1;
    const firstLevelId = index * LEVELS_PER_EXPANSION_CHAPTER + 1;

    return {
      id: chapterId,
      codename: chapterId === 1 ? "LATENCY FRONT" : `CHAPTER ${String(chapterId).padStart(2, "0")}`,
      levelIds: Array.from(
        { length: LEVELS_PER_EXPANSION_CHAPTER },
        (_, levelIndex) => firstLevelId + levelIndex,
      ),
      visualThemeId: chapterId === 1 ? "latency-front" : "pending",
    };
  });

export type ExpansionNavigationPlaceholderLevel = Readonly<{
  id: number;
  chapterId: number;
  codename: string;
  availability: "not-playable";
}>;

/** Retained only as a compatibility surface for the retired Phase 7B shell. */
export const EXPANSION_NAVIGATION_PLACEHOLDER_LEVELS: readonly ExpansionNavigationPlaceholderLevel[] = [];

/**
 * Chapter 1 contains the first five authored expansion levels. Later reviewed
 * chapter batches append their own immutable expansion-only records.
 */
export const EXPANSION_LEVELS: readonly ExpansionCampaignLevelDefinition[] = CHAPTER_01_LEVELS;

export const EXPANSION_CAMPAIGN: ExpansionCampaignDefinition = {
  id: "expansion-1",
  title: "GridWatch: Signal Breach Expansion",
  ruleset: EXPANSION_RULESET_ID,
  contentRevision: EXPANSION_CONTENT_REVISION,
  chapters: EXPANSION_NAVIGATION_CHAPTERS,
};

export function getExpansionLevelDefinition(
  levelId: number,
): ExpansionCampaignLevelDefinition | undefined {
  return EXPANSION_LEVELS.find((candidate) => candidate.id === levelId);
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
