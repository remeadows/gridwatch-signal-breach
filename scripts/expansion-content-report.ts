import contentReportFixture from "../docs/fixtures/expansion-1-r1-content-report.json";
import { EXPANSION_LEVELS } from "../src/data/campaigns/expansion";
import { EXPANSION_CHAPTER_01_CONTENT_MANIFEST } from "../src/data/campaigns/expansion/contentManifest";

const levelHashes = Object.fromEntries(
  await Promise.all(EXPANSION_LEVELS.map(async (level) => [level.id, await sha256(stableStringify(level))])),
);
const report = {
  schema: 1,
  campaign: "expansion-1",
  ruleset: "expansion-v1",
  contentRevision: "expansion-1-r1",
  chapter: 1,
  levelCount: EXPANSION_LEVELS.length,
  waveCount: EXPANSION_LEVELS.reduce((total, level) => total + level.waves.length, 0),
  campaignHash: await sha256(stableStringify(EXPANSION_LEVELS)),
  levelHashes,
  levels: EXPANSION_LEVELS.map((level) => ({
    id: level.id,
    codename: level.codename,
    difficultyIndex: level.difficultyIndex,
    waveCounts: level.waves.map((wave) => wave.maxSpawnedIntrusions),
  })),
};

console.log(JSON.stringify(report, null, 2));

if (report.campaignHash !== EXPANSION_CHAPTER_01_CONTENT_MANIFEST.campaignHash || JSON.stringify(report.levelHashes) !== JSON.stringify(EXPANSION_CHAPTER_01_CONTENT_MANIFEST.levelHashes)) {
  throw new Error("Committed expansion content hashes are stale. Regenerate the Chapter 1 content report.");
}

if (stableStringify(report) !== stableStringify(contentReportFixture)) {
  throw new Error("Committed expansion content report fixture is stale.");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
