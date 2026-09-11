import assert from "./assert";
import { getExpansionLevelDefinition } from "../src/data/campaigns/expansion";
import { createExpansionGameState } from "../src/sim/expansion/state";

assert.throws(() => createExpansionGameState({ levelId: 6, contentRevision: "expansion-1-r1", contentHash: "revision-lookup" }), /Unknown expansion level/);
assert.throws(() => createExpansionGameState({ levelId: 11, contentRevision: "expansion-1-r2", contentHash: "revision-lookup" }), /Unknown expansion level/);
assert.equal(getExpansionLevelDefinition(6, "expansion-1-r1"), undefined);
assert.equal(getExpansionLevelDefinition(11, "expansion-1-r2"), undefined);
assert.equal(getExpansionLevelDefinition(15, "expansion-1-r3")?.codename, "SHIELD FRONT");
assert.equal(getExpansionLevelDefinition(1, "unknown"), undefined);
for (const id of [0, -1, 1.5, NaN, Infinity, 16]) {
  assert.equal(getExpansionLevelDefinition(id, "expansion-1-r3"), undefined);
}
console.log("Revision-scoped level lookup rejects unsupported identities.");
