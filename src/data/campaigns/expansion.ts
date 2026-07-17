import type {
  ChapterDefinition,
  ExpansionCampaignDefinition,
  LevelDefinition,
} from "./types";

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
      codename: `CHAPTER ${String(chapterId).padStart(2, "0")}`,
      levelIds: Array.from(
        { length: LEVELS_PER_EXPANSION_CHAPTER },
        (_, levelIndex) => firstLevelId + levelIndex,
      ),
      visualThemeId: "pending",
    };
  });

export type ExpansionNavigationPlaceholderLevel = Readonly<{
  id: number;
  chapterId: number;
  codename: string;
  availability: "not-playable";
}>;

/**
 * The single Phase 7B placeholder is deliberately not a LevelDefinition. It
 * has no board, tools, waves, or tuning, so it cannot enter simulation, replay,
 * scoring, or leaderboard paths.
 */
export const EXPANSION_NAVIGATION_PLACEHOLDER_LEVELS: readonly ExpansionNavigationPlaceholderLevel[] = [
  {
    id: 1,
    chapterId: 1,
    codename: "UPLINK PENDING",
    availability: "not-playable",
  },
];

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
  chapters: EXPANSION_NAVIGATION_CHAPTERS,
};

export function getExpansionLevelDefinition(
  levelId: number,
): LevelDefinition | undefined {
  return EXPANSION_LEVELS.find((candidate) => candidate.id === levelId);
}

export function getExpansionNavigationPlaceholderLevel(
  levelId: number,
): ExpansionNavigationPlaceholderLevel | undefined {
  return EXPANSION_NAVIGATION_PLACEHOLDER_LEVELS.find(
    (candidate) => candidate.id === levelId,
  );
}
