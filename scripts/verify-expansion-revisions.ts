import { getExpansionLevelContentHash } from "./retained-expansion";
import { replayExpansionRun } from "../src/sim/expansion/replay";
import { EXPANSION_R3_CONTENT_REVISION as EXPANSION_CONTENT_REVISION, type ExpansionReplayInput } from "../src/sim/expansion/types";

const current: ExpansionReplayInput = {
  schema: 2, ruleset: "expansion-v1", campaign: "expansion-1", level: 2,
  contentRevision: EXPANSION_CONTENT_REVISION,
  contentHash: getExpansionLevelContentHash(2),
  seed: "expansion-empty-replay", commands: [],
};
const historical = { ...current, contentRevision: "expansion-1-r1" } as ExpansionReplayInput;
const oldResult = replayExpansionRun(historical);
const newResult = replayExpansionRun(current);
assert(oldResult.state.config.contentRevision === "expansion-1-r1", "Replay lost its original content revision.");
assert(oldResult.state.phase === "lost" && oldResult.state.tickCount === 100 && oldResult.score.total === 50, "Historical Level 2 replay changed.");
assert(JSON.stringify(oldResult.score) === JSON.stringify(newResult.score), "Additive revision changed Chapter 1 score.");
assert(JSON.stringify(oldResult.state.grid) === JSON.stringify(newResult.state.grid), "Additive revision changed Chapter 1 final grid.");
expectReject({ ...historical, level: 6, contentHash: getExpansionLevelContentHash(6) }, "r1 accepted a later chapter.");
const r2Input: ExpansionReplayInput = { ...current, level: 6, contentRevision: "expansion-1-r2", contentHash: getExpansionLevelContentHash(6, "expansion-1-r2") };
const r2Result = replayExpansionRun(r2Input);
const r3Equivalent = replayExpansionRun({ ...r2Input, contentRevision: EXPANSION_CONTENT_REVISION });
assert(r2Result.state.config.contentRevision === "expansion-1-r2", "Replay lost retained r2 identity.");
assert(JSON.stringify(r2Result.score) === JSON.stringify(r3Equivalent.score) && JSON.stringify(r2Result.state.grid) === JSON.stringify(r3Equivalent.state.grid), "r3 changed retained r2 gameplay.");
expectReject({ ...r2Input, level: 11, contentHash: getExpansionLevelContentHash(11) }, "r2 accepted Chapter 3.");
for (const input of [historical, r2Input]) {
  expectReject({ ...input, commands: [{ t: 0, c: { type: "placeUnit", unit: "arcIce", position: { x: 1, y: 1 } } }] }, `${input.contentRevision} accepted a later weapon identity.`);
}
expectReject({ ...current, contentRevision: "expansion-1-r999" } as unknown as ExpansionReplayInput, "Unknown revision accepted.");
expectReject({ ...historical, contentHash: "0".repeat(64) }, "Historical revision ignored the content hash.");
expectReject({ ...current, sector: 1 } as unknown as ExpansionReplayInput, "Mixed sector/level identity accepted.");
expectReject({ ...current, contentRevision: undefined } as unknown as ExpansionReplayInput, "Missing revision accepted.");
console.log("Expansion revision checks passed: r1 retained, current additive revision equivalent, identity boundaries reject invalid inputs.");

function assert(value: boolean, message: string): asserts value { if (!value) throw new Error(message); }
function expectReject(input: ExpansionReplayInput, message: string): void {
  let rejected = false;
  try { replayExpansionRun(input); } catch { rejected = true; }
  assert(rejected, message);
}
