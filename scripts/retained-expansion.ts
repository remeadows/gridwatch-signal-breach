/** Test-only historical defaults. Production always resolves its current r4 data. */
import { getExpansionLevelDefinition as lookup } from "../src/data/campaigns/expansion";
import { getExpansionLevelContentHash as hash } from "../src/data/campaigns/expansion/contentManifest";
import { createExpansionGameState as create, type CreateExpansionGameStateOptions } from "../src/sim/expansion/state";
import type { ExpansionContentRevision } from "../src/sim/expansion/types";

export { EXPANSION_R3_LEVELS as EXPANSION_LEVELS } from "../src/data/campaigns/expansion/retained";
export { EXPANSION_R3_CONTENT_MANIFEST as EXPANSION_CONTENT_MANIFEST } from "../src/data/campaigns/expansion/contentManifest";
export { EXPANSION_R3_CONTENT_REVISION as EXPANSION_CONTENT_REVISION } from "../src/sim/expansion/types";
export const getExpansionLevelDefinition = (id: number, revision: string = "expansion-1-r3") => lookup(id, revision);
export const getExpansionLevelContentHash = (id: number, revision: ExpansionContentRevision = "expansion-1-r3") => hash(id, revision);
export const createExpansionGameState = (options: CreateExpansionGameStateOptions) => create({ ...options, contentRevision: options.contentRevision ?? "expansion-1-r3" });
