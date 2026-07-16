import {
  CAMPAIGNS,
  EXPANSION_CAMPAIGN,
  EXPANSION_LEVELS,
  getCampaignDefinition,
  SIGNAL_BREACH_CAMPAIGN,
  SIGNAL_BREACH_SECTOR_ADAPTERS,
} from "../src/data/campaigns";
import { SECTORS } from "../src/data/levels";
import { SIM_RULESET_ID } from "../src/sim/ruleset";
import { isKnownCampaignId, resolveCampaignContent } from "../src/sim/content";

expectDeepEqual(
  CAMPAIGNS.map((campaign) => campaign.id),
  ["signal-breach", "expansion-1"],
  "Campaign registry identity drifted.",
);
expectEqual(
  SIGNAL_BREACH_CAMPAIGN.ruleset,
  SIM_RULESET_ID,
  "Signal Breach ruleset drifted.",
);
expectDeepEqual(
  SIGNAL_BREACH_CAMPAIGN.sectorIds,
  [1, 2, 3],
  "Signal Breach sector identity drifted.",
);
expectEqual(
  SIGNAL_BREACH_CAMPAIGN.chapters.length,
  0,
  "The original sector campaign must not be reinterpreted as expansion chapters.",
);
expectEqual(
  SIGNAL_BREACH_SECTOR_ADAPTERS.length,
  SECTORS.length,
  "Every legacy sector needs exactly one adapter.",
);

for (const [index, sector] of SECTORS.entries()) {
  const adapter = SIGNAL_BREACH_SECTOR_ADAPTERS[index];

  expectEqual(adapter?.campaignId, "signal-breach", "Legacy campaign identity drifted.");
  expectEqual(adapter?.sectorId, sector.id, "Legacy sector ID drifted.");
  expectEqual(adapter?.sector, sector, "Legacy sector adapter copied or replaced content.");
}

expectEqual(
  getCampaignDefinition("signal-breach"),
  SIGNAL_BREACH_CAMPAIGN,
  "Signal Breach campaign lookup drifted.",
);
expectEqual(
  getCampaignDefinition("expansion-1"),
  EXPANSION_CAMPAIGN,
  "Expansion campaign lookup drifted.",
);
expectEqual(EXPANSION_CAMPAIGN.chapters.length, 0, "Phase 7A must not add chapters.");
expectEqual(EXPANSION_LEVELS.length, 0, "Phase 7A must not add expansion levels.");
expectEqual(
  EXPANSION_CAMPAIGN.contentRevision,
  "unpublished",
  "Expansion content must stay unpublished until its first reviewed chapter.",
);

const resolvedSector = resolveCampaignContent({
  campaignId: "signal-breach",
  sectorId: 1,
});

expectEqual(
  resolvedSector.campaignId,
  "signal-breach",
  "Signal Breach content resolution drifted.",
);
if (resolvedSector.campaignId === "signal-breach") {
  expectEqual(
    resolvedSector.sector.sector,
    SECTORS[0],
    "Signal Breach resolver must retain the original sector definition.",
  );
}

expectThrows(
  () => resolveCampaignContent({ campaignId: "expansion-1", levelId: 1 }),
  /not authored/,
  "Phase 7A must reject unshipped expansion content.",
);
expectThrows(
  () => resolveCampaignContent({ campaignId: "signal-breach", sectorId: 4 }),
  /Unknown Signal Breach sector/,
  "A fourth legacy sector must remain invalid.",
);
expectEqual(isKnownCampaignId("signal-breach"), true, "Known campaign was rejected.");
expectEqual(isKnownCampaignId("expansion-1"), true, "Known campaign was rejected.");
expectEqual(isKnownCampaignId("sector-4"), false, "Unknown campaign was accepted.");

console.log("Content abstraction verification passed with no expansion levels authored.");

function expectEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${String(expected)}, received ${String(actual)}.`);
  }
}

function expectDeepEqual(actual: unknown, expected: unknown, message: string): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    throw new Error(`${message} Expected ${expectedJson}, received ${actualJson}.`);
  }
}

function expectThrows(
  callback: () => void,
  pattern: RegExp,
  message: string,
): void {
  try {
    callback();
  } catch (error) {
    if (error instanceof Error && pattern.test(error.message)) {
      return;
    }

    throw error;
  }

  throw new Error(message);
}
