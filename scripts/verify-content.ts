import contentReportFixture from "../docs/fixtures/expansion-1-r1-content-report.json";
import {
  CAMPAIGNS,
  EXPANSION_CAMPAIGN,
  EXPANSION_LEVELS,
  EXPANSION_NAVIGATION_CHAPTERS,
  EXPANSION_NAVIGATION_PLACEHOLDER_LEVELS,
  getCampaignDefinition,
  isExpansionChapterAvailable,
  isExpansionChapterAuthored,
  SIGNAL_BREACH_CAMPAIGN,
  SIGNAL_BREACH_SECTOR_ADAPTERS,
} from "../src/data/campaigns";
import { SECTORS } from "../src/data/levels";
import { getExpansionHardwareCapabilities } from "../src/sim/expansion/capabilities";
import { createExpansionGameState } from "../src/sim/expansion/state";
import { EXPANSION_CAMPAIGN_ID, EXPANSION_CONTENT_REVISION, EXPANSION_RULESET_ID } from "../src/sim/expansion/types";
import { EXPANSION_CHAPTER_01_CONTENT_MANIFEST, getExpansionLevelContentHash } from "../src/data/campaigns/expansion/contentManifest";
import { SIM_RULESET_ID } from "../src/sim/ruleset";
import { isKnownCampaignId, resolveCampaignContent } from "../src/sim/content";
import {
  buildExpansionContentReport,
  stableStringify,
  validateExpansionContent,
} from "./expansion-content-report-lib";

expectDeepEqual(CAMPAIGNS.map((campaign) => campaign.id), ["signal-breach", "expansion-1"], "Campaign registry identity drifted.");
expectEqual(SIGNAL_BREACH_CAMPAIGN.ruleset, SIM_RULESET_ID, "Signal Breach ruleset drifted.");
expectDeepEqual(SIGNAL_BREACH_CAMPAIGN.sectorIds, [1, 2, 3], "Signal Breach sector identity drifted.");
expectEqual(SIGNAL_BREACH_CAMPAIGN.chapters.length, 0, "The original sector campaign must not become chapters.");
expectEqual(SIGNAL_BREACH_SECTOR_ADAPTERS.length, SECTORS.length, "Every legacy sector needs one adapter.");
for (const [index, sector] of SECTORS.entries()) {
  expectEqual(SIGNAL_BREACH_SECTOR_ADAPTERS[index]?.sector, sector, "Legacy content was copied or replaced.");
}
expectEqual(getCampaignDefinition("signal-breach"), SIGNAL_BREACH_CAMPAIGN, "Signal Breach lookup drifted.");
expectEqual(getCampaignDefinition("expansion-1"), EXPANSION_CAMPAIGN, "Expansion lookup drifted.");

expectEqual(EXPANSION_CAMPAIGN.id, EXPANSION_CAMPAIGN_ID, "Expansion campaign identity drifted.");
expectEqual(EXPANSION_CAMPAIGN.ruleset, EXPANSION_RULESET_ID, "Expansion ruleset drifted.");
expectEqual(EXPANSION_CAMPAIGN.contentRevision, EXPANSION_CONTENT_REVISION, "Expansion revision drifted.");
expectDeepEqual(EXPANSION_NAVIGATION_CHAPTERS.map((chapter) => chapter.id), [1, 2, 3, 4, 5, 6], "Expansion chapters drifted.");
for (const chapter of EXPANSION_NAVIGATION_CHAPTERS) expectEqual(chapter.levelIds.length, 5, `Chapter ${chapter.id} must reserve five levels.`);
expectEqual(isExpansionChapterAuthored(1), true, "Authored Chapter 1 was reported as unavailable.");
for (const chapterId of [2, 3, 4, 5, 6]) expectEqual(isExpansionChapterAuthored(chapterId), false, `Unauthored Chapter ${chapterId} was unlocked.`);
expectEqual(isExpansionChapterAvailable(1, 1), true, "Chapter 1 was not available at fresh progress.");
expectEqual(isExpansionChapterAvailable(2, 30), false, "Reserved Chapter 2 became available without authored content.");
expectEqual(EXPANSION_NAVIGATION_PLACEHOLDER_LEVELS.length, 0, "Authored Chapter 1 must not retain a fake placeholder.");
expectDeepEqual(EXPANSION_LEVELS.map((level) => level.id), [1, 2, 3, 4, 5], "This batch must contain exactly Chapter 1.");
expectEqual(EXPANSION_LEVELS.reduce((total, level) => total + level.waves.length, 0), 25, "Chapter 1 must contain 25 authored waves.");
validateExpansionContent(EXPANSION_LEVELS);
const contentReport = buildExpansionContentReport(
  EXPANSION_LEVELS,
  EXPANSION_CHAPTER_01_CONTENT_MANIFEST.campaignHash,
  EXPANSION_CHAPTER_01_CONTENT_MANIFEST.levelHashes,
);
expectEqual(stableStringify(contentReport), stableStringify(contentReportFixture), "Expansion content report fixture drifted.");

for (const level of EXPANSION_LEVELS) {
  expectEqual(level.chapterId, 1, `Level ${level.id} escaped Chapter 1.`);
  expectEqual(level.gridSize, 8, `Level ${level.id} must use an 8x8 board.`);
  expectEqual(level.waves.length, 5, `Level ${level.id} must have five waves.`);
  expectDeepEqual(level.waves.map((wave) => wave.id), [1, 2, 3, 4, 5], `Level ${level.id} wave IDs drifted.`);
  expectEqual(level.requiredMechanic, "latencyTrap", `Level ${level.id} mechanic gate drifted.`);
  expectEqual(level.toolsUnlocked.includes("latencyTrap"), true, `Level ${level.id} did not unlock Latency Trap.`);
  expectEqual(level.toolsUnlocked.includes("scrubber"), level.id >= 2, `Level ${level.id} Scrubber progression drifted.`);
  expectEqual(level.toolsUnlocked.includes("overclock"), false, `Level ${level.id} introduced an unapproved Chapter 1 tool.`);
  const state = createExpansionGameState({ levelId: level.id, contentHash: getExpansionLevelContentHash(level.id), seed: "content-check" });
  expectEqual(state.signal.status, "live", `Level ${level.id} initial route is not live.`);
  expectEqual(state.config.campaignId, EXPANSION_CAMPAIGN_ID, `Level ${level.id} lost campaign identity.`);
  expectEqual(state.config.contentRevision, EXPANSION_CONTENT_REVISION, `Level ${level.id} revision drifted.`);
}

const trap = getExpansionHardwareCapabilities("latencyTrap");
expectDeepEqual(trap, { carriesSignal: false, blocksMovement: false, targetable: false, chewable: false, corruptible: false, traversable: true }, "Latency Trap capability contract drifted.");
const rusher = createExpansionGameState({ levelId: 1, contentHash: getExpansionLevelContentHash(1) }).config.enemies.rusher;
expectDeepEqual({ maxHp: rusher.maxHp, moveEveryTicks: rusher.moveEveryTicks, corruptionTicks: rusher.corruptionTicks, chewDamage: rusher.chewDamage, coreContactDamage: rusher.coreContactDamage, targeting: rusher.targeting }, { maxHp: 6, moveEveryTicks: 1, corruptionTicks: 6, chewDamage: 1, coreContactDamage: 1, targeting: "route" }, "Rusher production tuning drifted.");

const resolved = resolveCampaignContent({ campaignId: "expansion-1", levelId: 1 });
expectEqual(resolved.campaignId, "expansion-1", "Expansion resolver rejected Chapter 1.");
expectThrows(() => resolveCampaignContent({ campaignId: "expansion-1", levelId: 6 }), /not authored/, "Chapter 2 content leaked into this batch.");
expectThrows(() => resolveCampaignContent({ campaignId: "signal-breach", sectorId: 4 }), /Unknown Signal Breach sector/, "A fourth legacy sector became valid.");
expectEqual(isKnownCampaignId("signal-breach"), true, "Known campaign rejected.");
expectEqual(isKnownCampaignId("expansion-1"), true, "Known campaign rejected.");
expectEqual(isKnownCampaignId("sector-4"), false, "Unknown campaign accepted.");

console.log(JSON.stringify(contentReport, null, 2));
console.log("Content verification passed: frozen V2 plus Expansion 1 Chapter 1 (5 levels / 25 waves).");

function expectEqual<T>(actual: T, expected: T, message: string): void { if (actual !== expected) throw new Error(`${message} Expected ${String(expected)}, received ${String(actual)}.`); }
function expectDeepEqual(actual: unknown, expected: unknown, message: string): void { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message} Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`); }
function expectThrows(callback: () => void, pattern: RegExp, message: string): void { try { callback(); } catch (error) { if (error instanceof Error && pattern.test(error.message)) return; throw error; } throw new Error(message); }
