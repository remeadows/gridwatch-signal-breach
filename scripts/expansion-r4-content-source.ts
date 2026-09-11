import { EXPANSION_R4_LEVELS } from "../src/data/campaigns/expansion/r4";
import manifest from "../src/data/campaigns/expansion/r4/manifest.json";
import { EXPANSION_R4_CONTENT_REVISION } from "../src/sim/expansion/types";
import { buildExpansionContentReport, stableStringify, validateExpansionContent } from "./expansion-content-report-lib";
import { sha256 } from "./expansion-human-balance-lib";
import assert from "./assert";

export async function buildR4Manifest() {
  return { revision: EXPANSION_R4_CONTENT_REVISION, campaignHash: await sha256(stableStringify(EXPANSION_R4_LEVELS)),
    levelHashes: Object.fromEntries(await Promise.all(EXPANSION_R4_LEVELS.map(async (level) => [level.id, await sha256(stableStringify(level))]))) };
}

export async function buildR4ContentReport() {
  validateExpansionContent(EXPANSION_R4_LEVELS, EXPANSION_R4_CONTENT_REVISION);
  const current = await buildR4Manifest();
  assert.deepEqual(current, manifest, "Stale r4 manifest; regenerate and review it first");
  return buildExpansionContentReport(EXPANSION_R4_LEVELS, current.campaignHash, current.levelHashes, EXPANSION_R4_CONTENT_REVISION);
}
