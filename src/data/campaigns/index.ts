import { EXPANSION_CAMPAIGN } from "./expansion";
import { SIGNAL_BREACH_CAMPAIGN } from "./signalBreach";
import type { CampaignDefinition, CampaignId } from "./types";

export {
  EXPANSION_CAMPAIGN,
  EXPANSION_LEVELS,
  EXPANSION_NAVIGATION_CHAPTERS,
  EXPANSION_NAVIGATION_PLACEHOLDER_LEVELS,
  getExpansionLevelDefinition,
  getExpansionNavigationPlaceholderLevel,
  isExpansionChapterAuthored,
  type ExpansionNavigationPlaceholderLevel,
} from "./expansion";
export {
  getSignalBreachSectorAdapter,
  SIGNAL_BREACH_CAMPAIGN,
  SIGNAL_BREACH_SECTOR_ADAPTERS,
  type SignalBreachSectorAdapter,
} from "./signalBreach";
export type {
  CampaignDefinition,
  CampaignId,
  ChapterDefinition,
  ExpansionCampaignDefinition,
  ExpansionCampaignLevelDefinition,
  LevelDefinition,
  SignalBreachCampaignDefinition,
} from "./types";

export const CAMPAIGNS: readonly CampaignDefinition[] = [
  SIGNAL_BREACH_CAMPAIGN,
  EXPANSION_CAMPAIGN,
];

export function getCampaignDefinition(
  campaignId: CampaignId,
): CampaignDefinition | undefined {
  return CAMPAIGNS.find((candidate) => candidate.id === campaignId);
}
