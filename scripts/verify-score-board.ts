import {
  CAMPAIGN_BOARD,
  EXPANSION_BOARD,
  GAME_SLUG,
  MAX_META_BYTES,
  campaignMeta,
  expansionBoardFor,
  expansionMeta,
  levelEntryKey,
  metaBytes,
  notRecordedReply,
  sectorEntryKey,
  submitArgs,
  submitOutcome,
  toCount,
} from "../supabase/functions/submit-gridwatch-score/scoreBoard";
import assert from "./assert";

const HASH = "a".repeat(64);
const NOW = new Date("2026-09-25T12:00:00.000Z");

// Boards and entry keys match the live registry rows (Nexus migration 20260924131533).
assert.equal(GAME_SLUG, "gridwatch-signal-breach");
assert.deepEqual(CAMPAIGN_BOARD, { key: "campaign", ruleset: "r2" });
assert.deepEqual(EXPANSION_BOARD, { key: "expansion", ruleset: "r4" });
assert.equal(expansionBoardFor("expansion-1-r4"), EXPANSION_BOARD);
assert.equal(expansionBoardFor("expansion-1-r3"), null);
assert.equal(expansionBoardFor("toString"), null, "Prototype keys are not revisions.");
for (const sector of [1, 2, 3]) assert.equal(/^sector:[0-9]{1,2}$/.test(sectorEntryKey(sector)), true);
for (const level of [1, 9, 25]) assert.equal(/^level:[0-9]{1,2}$/.test(levelEntryKey(level)), true);
assert.equal(sectorEntryKey(3), "sector:3");
assert.equal(levelEntryKey(12), "level:12");

// Meta stays far under the 4 KB cap even at the validator's limits: a 200-char seed of
// characters JSON must escape (6 bytes each), a 5,000-command log and a long rating.
const worstSeed = "\u0001".repeat(200);
const commands = Array.from({ length: 5000 }, (_, t) => ({ t, c: { type: "skipPrep" } }));
const worstCampaign = campaignMeta({ ruleset: "phase4-v1", sector: 3, seed: worstSeed, commandCount: commands.length, rating: "R".repeat(64) });
const worstExpansion = expansionMeta({ contentRevision: "expansion-1-r4", level: 25, seed: worstSeed, commandCount: commands.length, rating: "R".repeat(64) });
assert.equal(metaBytes(worstCampaign) < MAX_META_BYTES / 2, true, "Campaign meta must leave headroom under 4 KB.");
assert.equal(metaBytes(worstExpansion) < MAX_META_BYTES / 2, true, "Expansion meta must leave headroom under 4 KB.");
assert.equal(JSON.stringify(worstCampaign).includes("skipPrep"), false, "Commands never ride in meta.");
assert.deepEqual(worstCampaign, { v: 1, ruleset: "phase4-v1", sector: 3, seed: worstSeed, commandCount: 5000, rating: "R".repeat(64) });

// One entry, server time, proof hash as both request id and proof hash.
const meta = campaignMeta({ ruleset: "phase4-v1", sector: 1, seed: "phase4-c", commandCount: 13, rating: "Ghostline Architect" });
assert.deepEqual(
  submitArgs({ userId: "u1", board: CAMPAIGN_BOARD, entryKey: sectorEntryKey(1), score: 514, proofHash: HASH, achievedAt: NOW, meta }),
  {
    p_user_id: "u1",
    p_game_slug: "gridwatch-signal-breach",
    p_board_key: "campaign",
    p_ruleset: "r2",
    p_entries: [{ key: "sector:1", score: 514 }],
    p_achieved_at: "2026-09-25T12:00:00.000Z",
    p_request_id: HASH,
    p_proof_hash: HASH,
    p_meta: meta,
  },
);
assert.equal(/^[A-Za-z0-9_-]{16,64}$/.test(HASH), true, "A proof hash is a valid submit_score request id.");
assert.throws(
  () => submitArgs({ userId: "u1", board: CAMPAIGN_BOARD, entryKey: "sector:1", score: 1, proofHash: "A".repeat(64), achievedAt: NOW, meta }),
  /64 lowercase hex/,
);

// Status mapping.
assert.deepEqual(submitOutcome({ status: "ok", improved: true, total: 1500 }, CAMPAIGN_BOARD), { kind: "logged", improved: true, total: 1500 });
assert.deepEqual(submitOutcome({ status: "ok", improved: false, total: "1500" }, CAMPAIGN_BOARD), { kind: "logged", improved: false, total: 1500 });
assert.deepEqual(submitOutcome({ status: "ok", improved: true }, CAMPAIGN_BOARD), { kind: "logged", improved: true, total: null });
assert.deepEqual(submitOutcome({ status: "duplicate", improved: true, total: 900 }, CAMPAIGN_BOARD), { kind: "logged", improved: false, total: 900 });
assert.deepEqual(submitOutcome({ status: "request_conflict" }, CAMPAIGN_BOARD), { kind: "logged", improved: false, total: null });
assert.deepEqual(submitOutcome({ status: "invalid_time" }, CAMPAIGN_BOARD), { kind: "rejected", status: 422, error: "Run too old to log." });
assert.deepEqual(submitOutcome({ status: "invalid_entry" }, CAMPAIGN_BOARD), { kind: "rejected", status: 422, error: "Score rejected by the leaderboard." });
assert.deepEqual(submitOutcome({ status: "score_out_of_range" }, CAMPAIGN_BOARD), { kind: "rejected", status: 422, error: "Score rejected by the leaderboard." });
assert.deepEqual(submitOutcome({ status: "invalid_request" }, CAMPAIGN_BOARD), { kind: "rejected", status: 400, error: "Bad submission." });
for (const status of ["unknown_board", "ruleset_mismatch"]) {
  assert.deepEqual(submitOutcome({ status }, EXPANSION_BOARD), {
    kind: "rejected",
    status: 503,
    error: "Leaderboard season changed — try again later.",
    log: `submit_score ${status} for gridwatch-signal-breach/expansion/r4`,
  });
}
assert.deepEqual(submitOutcome({ status: "weird" }, CAMPAIGN_BOARD), {
  kind: "rejected",
  status: 500,
  error: "Could not save score.",
  log: 'submit_score unexpected result: {"status":"weird"}',
});
assert.equal(submitOutcome(null, CAMPAIGN_BOARD).kind, "rejected");
assert.equal(toCount(-1), null);
assert.equal(toCount(1.5), null);
assert.equal(toCount(""), null);
assert.equal(toCount("42"), 42);

// Not-recorded replies keep every field a cached client reads on its ok:false path.
assert.deepEqual(notRecordedReply("not-cleared", 33, "Blackout Casualty"), {
  ok: false,
  recorded: false,
  reason: "not-cleared",
  runScore: 33,
  rating: "Blackout Casualty",
  error: "Not recorded — sector not cleared. Only cleared sectors count on the leaderboard.",
});
assert.deepEqual(notRecordedReply("retired-ruleset", null, null), {
  ok: false,
  recorded: false,
  reason: "retired-ruleset",
  runScore: null,
  rating: null,
  error: "Not recorded — this run used retired rules. Replay the sector to rank.",
});
console.log("Score board: registry boards/keys, bounded meta, one-entry submit args, status mapping and not-recorded replies passed.");
