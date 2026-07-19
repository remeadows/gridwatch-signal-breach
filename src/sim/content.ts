import {
  getExpansionLevelDefinition,
  getSignalBreachSectorAdapter,
  type CampaignId,
  type ExpansionCampaignLevelDefinition,
  type SignalBreachSectorAdapter,
} from "../data/campaigns";

/**
 * Pure content-address resolver for the future replay/state boundary. It is
 * intentionally not wired into createGameState() in Phase 7A: doing so would
 * alter the frozen phase4-v1 validator bundle before expansion replay support
 * exists server-side.
 */
export type CampaignContentAddress =
  | Readonly<{
      campaignId: "signal-breach";
      sectorId: number;
    }>
  | Readonly<{
      campaignId: "expansion-1";
      levelId: number;
    }>;

export type ResolvedCampaignContent =
  | Readonly<{
      campaignId: "signal-breach";
      sector: SignalBreachSectorAdapter;
    }>
  | Readonly<{
      campaignId: "expansion-1";
      level: ExpansionCampaignLevelDefinition;
    }>;

export function resolveCampaignContent(
  address: CampaignContentAddress,
): ResolvedCampaignContent {
  if (address.campaignId === "signal-breach") {
    const sector = getSignalBreachSectorAdapter(address.sectorId);

    if (!sector) {
      throw new Error(`Unknown Signal Breach sector: ${address.sectorId}.`);
    }

    return { campaignId: address.campaignId, sector };
  }

  const level = getExpansionLevelDefinition(address.levelId);

  if (!level) {
    throw new Error(`Expansion level is not authored: ${address.levelId}.`);
  }

  return { campaignId: address.campaignId, level };
}

export function isKnownCampaignId(value: string): value is CampaignId {
  return value === "signal-breach" || value === "expansion-1";
}
