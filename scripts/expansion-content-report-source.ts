import { EXPANSION_LEVELS } from "../src/data/campaigns/expansion";
import { EXPANSION_CHAPTER_01_CONTENT_MANIFEST } from "../src/data/campaigns/expansion/contentManifest";
import { buildExpansionContentReport, stableStringify, validateExpansionContent } from "./expansion-content-report-lib";

/** Shared by verification and the explicit generated-report writer. */
export async function buildCurrentExpansionContentReport() {
  const levelHashes = Object.fromEntries(await Promise.all(EXPANSION_LEVELS.map(async (level) => [level.id, await sha256(stableStringify(level))])));
  const chapterOne = EXPANSION_LEVELS.filter((level) => level.chapterId === 1);
  if (await sha256(stableStringify(chapterOne)) !== EXPANSION_CHAPTER_01_CONTENT_MANIFEST.campaignHash) throw new Error("Frozen Chapter 1 campaign content changed; report regeneration refused.");
  for (const [levelId, hash] of Object.entries(EXPANSION_CHAPTER_01_CONTENT_MANIFEST.levelHashes)) {
    if (levelHashes[Number(levelId)] !== hash) throw new Error(`Frozen Chapter 1 Level ${levelId} content changed; report regeneration refused.`);
  }
  validateExpansionContent(EXPANSION_LEVELS);
  return buildExpansionContentReport(EXPANSION_LEVELS, await sha256(stableStringify(EXPANSION_LEVELS)), levelHashes);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
