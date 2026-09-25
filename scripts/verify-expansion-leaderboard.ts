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
let reads = 0;
const deps: ExpansionScoreDependencies = {
  profile: async () => ({ handle: "Tester", error: false }),
  submit: async (args) => {
    writes++;
    assert.equal(args.p_game_slug, "gridwatch-signal-breach");
    assert.equal(args.p_board_key, "expansion");
    assert.equal(args.p_ruleset, "r4");
    assert.equal(args.p_user_id, "authenticated-owner");
    assert.deepEqual(args.p_entries, [{ key: "level:1", score: replayExpansionRun(replay as ExpansionReplayInput).score.total }]);
    assert.equal(args.p_proof_hash.length, 64);
    assert.equal(args.p_request_id, args.p_proof_hash);
    return writes === 1 ? { status: "ok", improved: true, total: 900 } : { status: "request_conflict" };
  },
  placement: async (level) => { reads++; assert.equal(level, 1); return { bestScore: 900, levelRank: 2 }; },
};
const success = await handleExpansionScore(replay, "authenticated-owner", deps);
assert.equal(success.status, 200);
assert.equal(success.body.levelRank, 2);
assert.equal(success.body.improved, true);
assert.equal(success.body.category, expansionScoreCategory(1));
assert.equal("globalRank" in success.body, false);
assert.equal(writes, 1, "Expansion makes one submit_score call to one board, no global/period/clear marker.");
assert.equal(reads, 1);
const resent = await handleExpansionScore(replay, "authenticated-owner", deps);
assert.equal(resent.status, 200, "A re-sent proof is an already-logged success.");
assert.equal(resent.body.improved, false);
const unreadable = await handleExpansionScore(replay, "authenticated-owner", { ...deps,
  submit: async () => ({ status: "ok", improved: true, total: 900 }),
  placement: async () => ({ bestScore: null, levelRank: null }) });
assert.equal(unreadable.status, 200, "A failed read-back never fails a committed write.");
assert.equal(unreadable.body.levelRank, null);
assert.equal(unreadable.body.bestScore, unreadable.body.runScore);
const mismatch = await handleExpansionScore(replay, "authenticated-owner", { ...deps, submit: async () => ({ status: "ruleset_mismatch" }) });
assert.equal(mismatch.status, 503);
assert.equal(mismatch.log, "submit_score ruleset_mismatch for gridwatch-signal-breach/expansion/r4");
assert.equal((await handleExpansionScore(replay, "authenticated-owner", { ...deps, submit: async () => ({ status: "invalid_entry" }) })).status, 422);
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
assert.equal((await handleExpansionScore(replay, "owner", { ...deps, submit: async () => null })).status, 500);
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
console.log("Expansion leaderboard: 25 server/client score matches; identity/hash/commands/budget/terminal rejection; one expansion/r4 submit_score write; status mapping and best-effort read-back; profile/errors; bounded request body passed.");
