import { CAMPAIGN_BOARD, EXPANSION_BOARD } from "../supabase/functions/submit-gridwatch-score/scoreBoard";
import {
  PLACEMENT_LIMIT,
  campaignReply,
  createBoardIdCache,
  expansionReply,
  readCampaignPlacement,
  readExpansionPlacement,
  yourEntry,
  yourStanding,
  type Rpc,
} from "../supabase/functions/submit-gridwatch-score/scorePlacement";
import assert from "./assert";

const CAMPAIGN_ID = "00000000-0000-4000-8000-0000000000c2";
const EXPANSION_ID = "00000000-0000-4000-8000-0000000000e4";
const REGISTRY = [
  { id: CAMPAIGN_ID, game_slug: "gridwatch-signal-breach", key: "campaign", ruleset: "r2", status: "active" },
  { id: EXPANSION_ID, game_slug: "gridwatch-signal-breach", key: "expansion", ruleset: "r4", status: "active" },
  { id: "ffffffff-0000-4000-8000-000000000000", game_slug: "grid-drift", key: "campaign", ruleset: "r2", status: "active" },
];

type Call = { fn: string; args: Record<string, unknown> };
function fakeRpc(answer: (fn: string, args: Record<string, unknown>) => { data: unknown; error: unknown }) {
  const calls: Call[] = [];
  const rpc: Rpc = async (fn, args) => {
    calls.push({ fn, args });
    return answer(fn, args);
  };
  return { rpc, calls };
}

// Row parsing: only the caller's row counts, and malformed rows read as "not found".
assert.deepEqual(yourEntry([
  { rank: 1, display_name: "Ace", score: 900, is_you: false },
  { rank: 2, display_name: "Tester", score: 514, is_you: true },
]), { rank: 2, score: 514 });
assert.equal(yourEntry([{ rank: 1, score: 900, is_you: false }]), null);
assert.equal(yourEntry([{ rank: 0, score: 900, is_you: true }]), null);
assert.equal(yourEntry(null), null);
assert.deepEqual(yourStanding([{ rank: 3, total: "1540", field: 7 }]), { rank: 3, total: 1540, field: 7 });
assert.equal(yourStanding([]), null);
assert.equal(yourStanding([{ rank: null, total: 1, field: 1 }]), null);

// Board ids: resolved once from list_boards, pinned by key + ruleset, cached only on success.
{
  let registryUp = false;
  const { rpc, calls } = fakeRpc((fn) => fn === "list_boards"
    ? (registryUp ? { data: REGISTRY, error: null } : { data: null, error: { message: "down" } })
    : { data: [], error: null });
  const boards = createBoardIdCache();
  assert.equal(await boards.resolve(rpc, CAMPAIGN_BOARD), null);
  registryUp = true;
  assert.equal(await boards.resolve(rpc, CAMPAIGN_BOARD), CAMPAIGN_ID, "A failed registry read is not cached.");
  assert.equal(await boards.resolve(rpc, EXPANSION_BOARD), EXPANSION_ID);
  assert.equal(await boards.resolve(rpc, CAMPAIGN_BOARD), CAMPAIGN_ID);
  assert.equal(calls.filter((c) => c.fn === "list_boards").length, 2, "Success is cached.");
  assert.deepEqual(calls[0]!.args, { p_game_slug: "gridwatch-signal-breach" });
  assert.equal(await boards.resolve(rpc, { key: "campaign", ruleset: "r9" }), null, "No board for an unregistered ruleset.");
  const throwing: Rpc = async () => { throw new Error("offline"); };
  assert.equal(await createBoardIdCache().resolve(throwing, CAMPAIGN_BOARD), null);
}

// Campaign placement: sector entry + campaign standing on period 'all', limit 100.
{
  const { rpc, calls } = fakeRpc((fn) => {
    if (fn === "list_boards") return { data: REGISTRY, error: null };
    if (fn === "get_board_entry") return { data: [{ rank: 4, display_name: "Tester", score: 514, is_you: true }], error: null };
    if (fn === "get_my_standing") return { data: [{ rank: 2, total: 1540, field: 9 }], error: null };
    return { data: null, error: { message: fn } };
  });
  assert.deepEqual(await readCampaignPlacement(rpc, createBoardIdCache(), 1), {
    bestScore: 514, sectorRank: 4, globalRank: 2, campaignTotal: 1540,
  });
  assert.deepEqual(calls.find((c) => c.fn === "get_board_entry")!.args, {
    p_board_id: CAMPAIGN_ID, p_period_key: "all", p_entry_key: "sector:1", p_limit: PLACEMENT_LIMIT,
  });
  assert.deepEqual(calls.find((c) => c.fn === "get_my_standing")!.args, { p_board_id: CAMPAIGN_ID, p_period_key: "all" });
  assert.equal(PLACEMENT_LIMIT, 100);
}
{
  const { rpc } = fakeRpc((fn) => fn === "list_boards"
    ? { data: REGISTRY, error: null }
    : { data: null, error: { message: "read failed" } });
  assert.deepEqual(await readCampaignPlacement(rpc, createBoardIdCache(), 2), {
    bestScore: null, sectorRank: null, globalRank: null, campaignTotal: null,
  }, "Read-back errors yield nulls.");
  const throwing: Rpc = async () => { throw new Error("offline"); };
  assert.deepEqual(await readCampaignPlacement(throwing, createBoardIdCache(), 2), {
    bestScore: null, sectorRank: null, globalRank: null, campaignTotal: null,
  }, "A thrown read never escapes.");
}

// Expansion placement: the level entry on the expansion board.
{
  const { rpc, calls } = fakeRpc((fn) => fn === "list_boards"
    ? { data: REGISTRY, error: null }
    : { data: [{ rank: 1, display_name: "Tester", score: 812, is_you: true }], error: null });
  assert.deepEqual(await readExpansionPlacement(rpc, createBoardIdCache(), 7), { bestScore: 812, levelRank: 1 });
  assert.deepEqual(calls.find((c) => c.fn === "get_board_entry")!.args, {
    p_board_id: EXPANSION_ID, p_period_key: "all", p_entry_key: "level:7", p_limit: 100,
  });
  const empty = fakeRpc((fn) => fn === "list_boards" ? { data: REGISTRY, error: null } : { data: [], error: null });
  assert.deepEqual(await readExpansionPlacement(empty.rpc, createBoardIdCache(), 7), { bestScore: null, levelRank: null });
}

// Replies keep every legacy field name; an improving run is its own best even without read-back.
const noPlacement = { bestScore: null, sectorRank: null, globalRank: null, campaignTotal: null };
assert.deepEqual(
  campaignReply({ outcome: { improved: true, total: 1540 }, placement: { bestScore: 514, sectorRank: 4, globalRank: 2, campaignTotal: 1540 }, runScore: 514, ruleset: "phase4-v1", rating: "Ghostline Architect", handle: "Tester" }),
  { ok: true, improved: true, runScore: 514, bestScore: 514, campaignScore: 1540, ruleset: "phase4-v1", rating: "Ghostline Architect", globalRank: 2, sectorRank: 4, handle: "Tester" },
);
assert.deepEqual(
  campaignReply({ outcome: { improved: true, total: null }, placement: noPlacement, runScore: 514, ruleset: "phase4-v1", rating: "A", handle: "Tester" }),
  { ok: true, improved: true, runScore: 514, bestScore: 514, campaignScore: null, ruleset: "phase4-v1", rating: "A", globalRank: null, sectorRank: null, handle: "Tester" },
);
assert.deepEqual(
  campaignReply({ outcome: { improved: false, total: null }, placement: { ...noPlacement, campaignTotal: 1540 }, runScore: 300, ruleset: "phase4-v1", rating: "A", handle: "Tester" }).campaignScore,
  1540,
  "A conflict (no total) falls back to the read-back standing total.",
);
assert.equal(
  campaignReply({ outcome: { improved: false, total: 1540 }, placement: noPlacement, runScore: 300, ruleset: "phase4-v1", rating: "A", handle: "Tester" }).bestScore,
  null,
  "A non-improving run never invents a best.",
);
assert.deepEqual(
  expansionReply({ outcome: { improved: false, total: 5000 }, placement: { bestScore: 812, levelRank: 3 }, runScore: 700, rating: "A", handle: "Tester", category: "expansion-v1:expansion-1-r4:level:7", contentRevision: "expansion-1-r4", level: 7 }),
  { ok: true, improved: false, runScore: 700, bestScore: 812, levelRank: 3, rating: "A", handle: "Tester", category: "expansion-v1:expansion-1-r4:level:7", contentRevision: "expansion-1-r4", level: 7 },
);
assert.equal("globalRank" in expansionReply({ outcome: { improved: true, total: 1 }, placement: { bestScore: null, levelRank: null }, runScore: 1, rating: "A", handle: "T", category: "c", contentRevision: "r", level: 1 }), false);
console.log("Score placement: pinned board ids with success-only caching, is_you read-back, null-on-failure and legacy-compatible replies passed.");
