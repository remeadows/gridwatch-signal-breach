import { getExpansionLevelContentHash } from "../src/data/campaigns/expansion/contentManifest";
import { replayExpansionRun } from "../src/sim/expansion/replay";
import { EXPANSION_CONTENT_REVISION, type ExpansionReplayInput } from "../src/sim/expansion/types";

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
