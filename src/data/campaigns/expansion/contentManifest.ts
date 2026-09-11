import { EXPANSION_CHAPTER_01_CONTENT_REVISION, EXPANSION_CHAPTER_02_CONTENT_REVISION, EXPANSION_CONTENT_REVISION, type ExpansionContentRevision } from "../../../sim/expansion/types";

export const EXPANSION_CHAPTER_01_CONTENT_MANIFEST = {
  revision: EXPANSION_CHAPTER_01_CONTENT_REVISION,
  campaignHash: "bdf03c4361f59cae61c34466e3c2b90f93c1788c242b99ceb3d5b54f12129a33",
  levelHashes: {
    1: "f35da0796b40ab420ea3f341479f96b1afe3020623cfdb860669a0c0c4cc7aaa",
    2: "5c72a1ce4c8a930292d6038afab3e22c19fe6dd4664e4bcfe8181e24747725cd",
    3: "40141ce01f88b09273dd02e8bacf60319a986a77bbf26922cc68cf1fae24032e",
    4: "159d86b40eb5bb6bbc3f26b05880836279eea1cd7a2d9556472d95b36ad366db",
    5: "ca93798b40d8d69637d5c38349bcb2b227a610b385ad99c21b8fd41ee341a584",
  },
} as const;

/** Current additive manifest. Chapter 1 level hashes must stay identical to r1. */
export const EXPANSION_CHAPTER_02_CONTENT_MANIFEST = {
  revision: EXPANSION_CHAPTER_02_CONTENT_REVISION,
  campaignHash: "c8020a21a276d35837bc13766d38d611a2e9499b71a3836b8d3803cc4dbd4796",
  levelHashes: {
    ...EXPANSION_CHAPTER_01_CONTENT_MANIFEST.levelHashes,
    6: "9b97bd2f40a3da0f10df8f52be8908450c3071934830c6d2cf1596dc132f6917",
    7: "ab072f4b3bc463c1bd2f6552eada8b5ff2f204e4b2304aef151e0d4874d36fbc",
    8: "9ae65b56441e702a9ec6bca6e3d8402c9e7fe4fc1164579194474c43e2c329da",
    9: "b1689464bc53d69c9fb5462b897ea74d39f3eec6918a22dc5953210cc6b88189",
    10: "91284b14429bd25c626eea8e1925f2ff0b367fead03b0bd7a894cfc5a8782449",
  },
} as const;

type ContentManifest = Readonly<{ revision: ExpansionContentRevision; campaignHash: string; levelHashes: Readonly<Record<number, string>> }>;

/** r3 appends Chapter 3 without changing any r1/r2 level definition. */
export const EXPANSION_CONTENT_MANIFEST = {
  revision: EXPANSION_CONTENT_REVISION,
  campaignHash: "df1b0920da63f189bd7c83f745b4a511877db6162f3f92f47ee0afdc0eb58957",
  levelHashes: {
    ...EXPANSION_CHAPTER_02_CONTENT_MANIFEST.levelHashes,
    11: "4d179d245bdaff8972de44ce4aef0d95649a0c087e5670de097a33a6498e8c01",
    12: "faffd83329928d5d9a02c1862c64189a8d41246cf708e6462e0b66f7809dbe85",
    13: "f2fb1fb4513914141f85f5a80621ccd9fcb3a516f1285a6ef0e23fc776c9b967",
    14: "eaea3b61081c0747716fe83d9b197efa9b1911703112c10a2fa09c98eab62751",
    15: "3ee45632978317eae12d8fae7b88f72c1d6d1905e124a7437f81e1e9048a1ec6",
  },
} as const;

/** Older additive revisions only expose levels authored in that revision. */
const REVISION_MANIFESTS: Readonly<Record<ExpansionContentRevision, ContentManifest>> = {
  [EXPANSION_CHAPTER_01_CONTENT_REVISION]: EXPANSION_CHAPTER_01_CONTENT_MANIFEST,
  [EXPANSION_CHAPTER_02_CONTENT_REVISION]: EXPANSION_CHAPTER_02_CONTENT_MANIFEST,
  [EXPANSION_CONTENT_REVISION]: EXPANSION_CONTENT_MANIFEST,
};

export function getExpansionContentManifest(revision: string): ContentManifest {
  if (!Object.prototype.hasOwnProperty.call(REVISION_MANIFESTS, revision)) {
    throw new Error(`Unknown expansion content revision: ${revision}.`);
  }
  return REVISION_MANIFESTS[revision as ExpansionContentRevision];
}

export function getExpansionLevelContentHash(levelId: number, revision: ExpansionContentRevision = EXPANSION_CONTENT_REVISION): string {
  const manifest = getExpansionContentManifest(revision);
  const hash = Number.isInteger(levelId) ? manifest.levelHashes[levelId] : undefined;
  if (!hash) throw new Error(`No content hash for expansion level ${levelId} in ${revision}.`);
  return hash;
}
