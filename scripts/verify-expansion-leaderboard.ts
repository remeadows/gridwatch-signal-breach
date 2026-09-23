import chapter1 from "../docs/fixtures/expansion-1-r4-chapter-1-human-evidence.json";
import chapter2 from "../docs/fixtures/expansion-1-r4-chapter-2-human-evidence.json";
import chapter3 from "../docs/fixtures/expansion-1-r4-chapter-3-human-evidence.json";
import { validateExpansionScore } from "../supabase/functions/submit-gridwatch-score/expansion-r4.bundle.js";
import { handleExpansionScore, type ExpansionScoreDependencies } from "../supabase/functions/submit-gridwatch-score/expansionScoreHandler";
import { readReplayBody } from "../supabase/functions/submit-gridwatch-score/requestBody";
import { replayExpansionRun, type ExpansionReplayInput } from "../src/sim/expansion";
import { canonicalExpansionScoreReplay, expansionScoreCategory, MAX_EXPANSION_SCORE_BYTES } from "../src/leaderboard/expansionScoreProtocol";
import assert from "./assert";

const fixtures = [chapter1, chapter2, chapter3].flatMap((report) => report.runs.filter((r) => r.actionIntervalTicks === 3 && r.seed.endsWith("alpha")));
assert.equal(fixtures.length, 25);
for (const fixture of fixtures) {
  const replay = fixture.replay as ExpansionReplayInput;
  const validated = validateExpansionScore({ ...replay, score: 999999, user_id: "forged" });
  assert.equal(validated.score, replayExpansionRun(replay).score.total);
  assert.equal(validated.category, `expansion-v1:expansion-1-r4:level:${replay.level}`);
  assert.deepEqual(validated.proof, replay);
  assert.equal(new TextEncoder().encode(JSON.stringify(replay)).length < MAX_EXPANSION_SCORE_BYTES, true);
}
const replay = fixtures[0]!.replay;
let writes = 0;
const deps: ExpansionScoreDependencies = {
  profile: async () => ({ handle: "Tester", error: false }),
  record: async (input) => {
    writes++;
    assert.equal(input.p_slug, "gridwatch-signal-breach");
    assert.equal(input.p_user_id, "authenticated-owner");
    assert.equal(input.p_category, expansionScoreCategory(1));
    assert.equal(input.p_proof_hash.length, 64);
    return { stored_score: input.p_score, improved: writes === 1, sector_rank: 2 };
  },
};
const success = await handleExpansionScore(replay, "authenticated-owner", deps);
assert.equal(success.status, 200);
assert.equal("levelRank" in success.body && success.body.levelRank, 2);
assert.equal("globalRank" in success.body, false);
assert.equal(writes, 1, "Expansion writes only one exact category, no global/period/clear marker.");
assert.equal((await handleExpansionScore(replay, "authenticated-owner", deps)).status, 200);
for (const bad of [null, [], { ...replay, sector: 1 }, { ...replay, campaign: "grid-drift" },
  { ...replay, contentRevision: "expansion-1-r3" }, { ...replay, level: 26 }, { ...replay, contentHash: "a".repeat(64) },
  { ...replay, seed: "" }, { ...replay, commands: [] },
  { ...replay, commands: [{ t: -1, c: { type: "skipPrep" } }] },
  { ...replay, commands: [{ t: 12001, c: { type: "skipPrep" } }] },
  { ...replay, commands: [{ t: 2, c: { type: "skipPrep" } }, { t: 1, c: { type: "skipPrep" } }] },
  { ...replay, commands: [{ t: 0, c: { type: "placeUnit", unit: "rootkit", position: { x: 0, y: 0 } } }] },
  { ...replay, commands: [{ t: 0, c: { type: "sellUnit", position: { x: 8, y: 0 } } }] },
  { ...replay, commands: [...replay.commands, { t: 12000, c: { type: "skipPrep" } }] },
  { ...replay, commands: Array.from({ length: 5001 }, () => ({ t: 0, c: { type: "skipPrep" } })) },
]) {
  const before = writes;
  assert.equal((await handleExpansionScore(bad, "authenticated-owner", deps)).status, 422);
  assert.equal(writes, before, "Rejected replay must never reach database writes.");
}
const handleless = { ...deps, profile: async () => ({ handle: null, error: false }) };
assert.equal((await handleExpansionScore(replay, "owner", handleless)).status, 409);
assert.equal((await handleExpansionScore(replay, "owner", { ...deps, profile: async () => ({ handle: null, error: true }) })).status, 500);
assert.equal((await handleExpansionScore(replay, "owner", { ...deps, record: async () => null })).status, 500);
assert.deepEqual(await readReplayBody(new Request("https://test.invalid", { method: "POST", body: JSON.stringify(replay) })), replay);
let bounded = false;
try { await readReplayBody(new Request("https://test.invalid", { method: "POST", body: "x".repeat(1025) }), 1024); }
catch (error) { bounded = error instanceof Error && error.message === "Replay body too large."; }
assert.equal(bounded, true);
// Many tiny chunks must behave exactly like a single body, with bounded memory.
const wire = new TextEncoder().encode(JSON.stringify(replay));
let offset = 0;
const stream = new ReadableStream<Uint8Array>({ pull(controller) {
  if (offset === wire.length) controller.close();
  else controller.enqueue(wire.subarray(offset, ++offset));
} });
assert.deepEqual(await readReplayBody({ body: stream } as Request), replay);
assert.deepEqual(canonicalExpansionScoreReplay({ ...replay, score: 1234 }), replay);
console.log("Expansion leaderboard: 25 server/client score matches; identity/hash/commands/budget/terminal rejection; single-category writes; profile/errors; bounded request body passed.");
