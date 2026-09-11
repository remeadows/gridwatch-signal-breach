import assert from "./assert";
import { getExpansionLevelDefinition } from "../src/data/campaigns/expansion";
import { createExpansionGameState } from "../src/sim/expansion/state";
import { EXPANSION_R4_LEVELS } from "../src/data/campaigns/expansion/r4";

assert.equal(Object.isFrozen(EXPANSION_R4_LEVELS), true, "Current level membership and ordering must be runtime immutable");
assert.throws(() => createExpansionGameState({ levelId: 6, contentRevision: "expansion-1-r1", contentHash: "revision-lookup" }), /Unknown expansion level/);
assert.throws(() => createExpansionGameState({ levelId: 11, contentRevision: "expansion-1-r2", contentHash: "revision-lookup" }), /Unknown expansion level/);
assert.equal(getExpansionLevelDefinition(6, "expansion-1-r1"), undefined);
assert.equal(getExpansionLevelDefinition(11, "expansion-1-r2"), undefined);
assert.equal(getExpansionLevelDefinition(15, "expansion-1-r3")?.codename, "SHIELD FRONT");
assert.equal(getExpansionLevelDefinition(6, "expansion-1-r3")?.codename, "STANDOFF");
assert.equal(getExpansionLevelDefinition(6, "expansion-1-r4")?.codename, "SPLIT SECOND");
assert.equal(getExpansionLevelDefinition(25, "expansion-1-r4")?.codename, "SIGNAL UNBROKEN");
assert.equal(getExpansionLevelDefinition(26, "expansion-1-r4"), undefined);
assert.equal(createExpansionGameState({ levelId: 6, contentRevision: "expansion-1-r3", contentHash: "retained-state" }).config.levelName, "STANDOFF");
assert.equal(createExpansionGameState({ levelId: 6, contentRevision: "expansion-1-r4", contentHash: "current-state" }).config.levelName, "SPLIT SECOND");
assert.equal(getExpansionLevelDefinition(1, "unknown"), undefined);
for (const id of [0, -1, 1.5, NaN, Infinity, 16]) {
  assert.equal(getExpansionLevelDefinition(id, "expansion-1-r3"), undefined);
}
console.log("Revision-scoped level lookup rejects unsupported identities.");
