import contentReportFixture from "../docs/fixtures/expansion-1-r1-content-report.json";
import { EXPANSION_LEVELS } from "../src/data/campaigns/expansion";
import { EXPANSION_CHAPTER_01_CONTENT_MANIFEST } from "../src/data/campaigns/expansion/contentManifest";
import {
  buildExpansionContentReport,
  stableStringify,
  validateExpansionContent,
} from "./expansion-content-report-lib";

const levelHashes = Object.fromEntries(
  await Promise.all(EXPANSION_LEVELS.map(async (level) => [level.id, await sha256(stableStringify(level))])),
);
validateExpansionContent(EXPANSION_LEVELS);
const report = buildExpansionContentReport(
  EXPANSION_LEVELS,
  await sha256(stableStringify(EXPANSION_LEVELS)),
  levelHashes,
);

console.log(JSON.stringify(report, null, 2));

if (report.campaignHash !== EXPANSION_CHAPTER_01_CONTENT_MANIFEST.campaignHash || JSON.stringify(report.levelHashes) !== JSON.stringify(EXPANSION_CHAPTER_01_CONTENT_MANIFEST.levelHashes)) {
  throw new Error("Committed expansion content hashes are stale. Regenerate the Chapter 1 content report.");
}

if (stableStringify(report) !== stableStringify(contentReportFixture)) {
  throw new Error("Committed expansion content report fixture is stale.");
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
