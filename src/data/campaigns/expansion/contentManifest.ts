import { EXPANSION_CONTENT_REVISION } from "../../../sim/expansion/types";

export const EXPANSION_CHAPTER_01_CONTENT_MANIFEST = {
  revision: EXPANSION_CONTENT_REVISION,
  campaignHash: "bdf03c4361f59cae61c34466e3c2b90f93c1788c242b99ceb3d5b54f12129a33",
  levelHashes: {
    1: "f35da0796b40ab420ea3f341479f96b1afe3020623cfdb860669a0c0c4cc7aaa",
    2: "5c72a1ce4c8a930292d6038afab3e22c19fe6dd4664e4bcfe8181e24747725cd",
    3: "40141ce01f88b09273dd02e8bacf60319a986a77bbf26922cc68cf1fae24032e",
    4: "159d86b40eb5bb6bbc3f26b05880836279eea1cd7a2d9556472d95b36ad366db",
    5: "ca93798b40d8d69637d5c38349bcb2b227a610b385ad99c21b8fd41ee341a584",
  },
} as const;

export function getExpansionLevelContentHash(levelId: number): string {
  const hash = EXPANSION_CHAPTER_01_CONTENT_MANIFEST.levelHashes[levelId as keyof typeof EXPANSION_CHAPTER_01_CONTENT_MANIFEST.levelHashes];
  if (!hash) throw new Error(`No Chapter 1 content hash for expansion level ${levelId}.`);
  return hash;
}
