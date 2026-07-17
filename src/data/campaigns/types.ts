import type {
  GridPosition,
  InitialTileDefinition,
  PlayerTool,
  WaveDefinition,
} from "../../sim/types";

/**
 * Campaign identity is intentionally separate from the legacy sector number.
 * A future expansion replay will identify a campaign and level; it must never
 * treat a new level as a fourth Signal Breach sector.
 */
export type CampaignId = "signal-breach" | "expansion-1";

export type CampaignDefinition = Readonly<{
  id: CampaignId;
  title: string;
  ruleset: string;
  contentRevision: string;
  chapters: readonly ChapterDefinition[];
}>;

export type ChapterDefinition = Readonly<{
  id: number;
  codename: string;
  levelIds: readonly number[];
  visualThemeId: string;
}>;

/**
 * Expansion level shape. Phase 7A deliberately registers no instances: level
 * data arrives only in later, separately reviewed chapter batches.
 */
export type LevelDefinition = Readonly<{
  id: number;
  chapterId: number;
  codename: string;
  gridSize: 8;
  source: GridPosition;
  core: GridPosition;
  voidTiles: readonly GridPosition[];
  initialTiles: readonly InitialTileDefinition[];
  toolsUnlocked: readonly PlayerTool[];
  waves: readonly WaveDefinition[];
  difficultyIndex: number;
  requiredMechanic: string | null;
}>;

/**
 * The original campaign retains its sector vocabulary and compatibility
 * surface. It has no ChapterDefinition or LevelDefinition records.
 */
export type SignalBreachCampaignDefinition = CampaignDefinition &
  Readonly<{
    id: "signal-breach";
    sectorIds: readonly number[];
  }>;

export type ExpansionCampaignDefinition = CampaignDefinition &
  Readonly<{
    id: "expansion-1";
  }>;
