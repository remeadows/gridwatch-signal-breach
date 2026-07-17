import { SECTORS, type SectorDefinition } from "../levels";
import { SIM_RULESET_ID } from "../../sim/ruleset";
import type { SignalBreachCampaignDefinition } from "./types";

/**
 * A compatibility adapter around the existing immutable V2 sector data. The
 * objects are referenced directly so this manifest cannot reinterpret or copy
 * the original campaign's sector, wave, progress, or replay identities.
 */
export type SignalBreachSectorAdapter = Readonly<{
  campaignId: "signal-breach";
  sectorId: number;
  sector: SectorDefinition;
}>;

export const SIGNAL_BREACH_SECTOR_ADAPTERS: readonly SignalBreachSectorAdapter[] =
  SECTORS.map((sector) => ({
    campaignId: "signal-breach",
    sectorId: sector.id,
    sector,
  }));

export const SIGNAL_BREACH_CAMPAIGN: SignalBreachCampaignDefinition = {
  id: "signal-breach",
  title: "GridWatch: Signal Breach",
  ruleset: SIM_RULESET_ID,
  contentRevision: "signal-breach-v2",
  chapters: [],
  sectorIds: SIGNAL_BREACH_SECTOR_ADAPTERS.map(({ sectorId }) => sectorId),
};

export function getSignalBreachSectorAdapter(
  sectorId: number,
): SignalBreachSectorAdapter | undefined {
  return SIGNAL_BREACH_SECTOR_ADAPTERS.find(
    (candidate) => candidate.sectorId === sectorId,
  );
}
