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

// Captures console.error during `fn`, always restoring it afterward (even on throw), so
// failure-path tests can assert on what got logged and success-path tests can assert nothing did.
async function withCapturedErrors<T>(fn: () => Promise<T>): Promise<{ result: T; logs: string[] }> {
  const logs: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { logs.push(args.map(String).join(" ")); };
  try {
    const result = await fn();
    return { result, logs };
  } finally {
    console.error = original;
  }
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
// Every swallowed list_boards failure is logged with `[score] placement: list_boards failed: <message>`;
// a successful read (found or not) logs nothing.
{
  let registryUp = false;
  const { rpc, calls } = fakeRpc((fn) => fn === "list_boards"
    ? (registryUp ? { data: REGISTRY, error: null } : { data: null, error: { message: "down" } })
    : { data: [], error: null });
  const boards = createBoardIdCache();

  const failedRead = await withCapturedErrors(() => boards.resolve(rpc, CAMPAIGN_BOARD));
  assert.equal(failedRead.result, null);
  assert.deepEqual(failedRead.logs, ["[score] placement: list_boards failed: down"]);

  registryUp = true;
  const cachedMiss = await withCapturedErrors(() => boards.resolve(rpc, CAMPAIGN_BOARD));
  assert.equal(cachedMiss.result, CAMPAIGN_ID, "A failed registry read is not cached.");
  assert.deepEqual(cachedMiss.logs, [], "A successful read logs nothing.");

  assert.equal(await boards.resolve(rpc, EXPANSION_BOARD), EXPANSION_ID);
  assert.equal(await boards.resolve(rpc, CAMPAIGN_BOARD), CAMPAIGN_ID);
  assert.equal(calls.filter((c) => c.fn === "list_boards").length, 2, "Success is cached.");
  assert.deepEqual(calls[0]!.args, { p_game_slug: "gridwatch-signal-breach" });

  const noMatch = await withCapturedErrors(() => boards.resolve(rpc, { key: "campaign", ruleset: "r9" }));
  assert.equal(noMatch.result, null, "No board for an unregistered ruleset.");
  assert.deepEqual(noMatch.logs, [], "An unregistered ruleset is a successful read, not a failure.");

  const throwing: Rpc = async () => { throw new Error("offline"); };
  const thrownRead = await withCapturedErrors(() => createBoardIdCache().resolve(throwing, CAMPAIGN_BOARD));
  assert.equal(thrownRead.result, null);
  assert.deepEqual(thrownRead.logs, ["[score] placement: list_boards failed: offline"]);
}

// Campaign placement: sector entry + campaign standing on period 'all', limit 100.
{
  const { rpc, calls } = fakeRpc((fn) => {
    if (fn === "list_boards") return { data: REGISTRY, error: null };
    if (fn === "get_board_entry") return { data: [{ rank: 4, display_name: "Tester", score: 514, is_you: true }], error: null };
    if (fn === "get_my_standing") return { data: [{ rank: 2, total: 1540, field: 9 }], error: null };
    return { data: null, error: { message: fn } };
  });
  const { result, logs } = await withCapturedErrors(() => readCampaignPlacement(rpc, createBoardIdCache(), 1));
  assert.deepEqual(result, {
    bestScore: 514, sectorRank: 4, globalRank: 2, campaignTotal: 1540,
  });
  assert.deepEqual(logs, [], "A successful read-back logs nothing.");
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
  const errored = await withCapturedErrors(() => readCampaignPlacement(rpc, createBoardIdCache(), 2));
  assert.deepEqual(errored.result, {
    bestScore: null, sectorRank: null, globalRank: null, campaignTotal: null,
  }, "Read-back errors yield nulls.");
  assert.deepEqual(
    [...errored.logs].sort(),
    [
      "[score] placement: get_board_entry sector:2 failed: read failed",
      "[score] placement: get_my_standing failed: read failed",
    ],
    "Both failed read-backs are logged, by RPC name/entry key and the error's own message.",
  );

  const throwing: Rpc = async () => { throw new Error("offline"); };
  const thrownAtBoardLookup = await withCapturedErrors(() => readCampaignPlacement(throwing, createBoardIdCache(), 2));
  assert.deepEqual(thrownAtBoardLookup.result, {
    bestScore: null, sectorRank: null, globalRank: null, campaignTotal: null,
  }, "A thrown read never escapes.");
  assert.deepEqual(thrownAtBoardLookup.logs, ["[score] placement: list_boards failed: offline"]);

  // A rejection after the board id is already resolved is caught by readCampaignPlacement's
  // own try/catch (not boards.resolve's), and logged under its own label.
  const rejectingAfterLookup: Rpc = async (fn) =>
    fn === "list_boards" ? { data: REGISTRY, error: null } : Promise.reject(new Error("network drop"));
  const thrownAfterLookup = await withCapturedErrors(() => readCampaignPlacement(rejectingAfterLookup, createBoardIdCache(), 3));
  assert.deepEqual(thrownAfterLookup.result, {
    bestScore: null, sectorRank: null, globalRank: null, campaignTotal: null,
  }, "A rejected read-back call never escapes.");
  assert.deepEqual(thrownAfterLookup.logs, ["[score] placement: campaign placement failed: network drop"]);
}

// Expansion placement: the level entry on the expansion board.
{
  const { rpc, calls } = fakeRpc((fn) => fn === "list_boards"
    ? { data: REGISTRY, error: null }
    : { data: [{ rank: 1, display_name: "Tester", score: 812, is_you: true }], error: null });
  const { result, logs } = await withCapturedErrors(() => readExpansionPlacement(rpc, createBoardIdCache(), 7));
  assert.deepEqual(result, { bestScore: 812, levelRank: 1 });
  assert.deepEqual(logs, [], "A successful read-back logs nothing.");
  assert.deepEqual(calls.find((c) => c.fn === "get_board_entry")!.args, {
    p_board_id: EXPANSION_ID, p_period_key: "all", p_entry_key: "level:7", p_limit: 100,
  });
  const empty = fakeRpc((fn) => fn === "list_boards" ? { data: REGISTRY, error: null } : { data: [], error: null });
  const emptyRead = await withCapturedErrors(() => readExpansionPlacement(empty.rpc, createBoardIdCache(), 7));
  assert.deepEqual(emptyRead.result, { bestScore: null, levelRank: null });
  assert.deepEqual(emptyRead.logs, [], "An empty (not-in-top-100) result set is not a failure.");
}
{
  const { rpc } = fakeRpc((fn) => fn === "list_boards"
    ? { data: REGISTRY, error: null }
    : { data: null, error: { message: "read failed" } });
  const errored = await withCapturedErrors(() => readExpansionPlacement(rpc, createBoardIdCache(), 9));
  assert.deepEqual(errored.result, { bestScore: null, levelRank: null }, "Read-back errors yield nulls.");
  assert.deepEqual(errored.logs, ["[score] placement: get_board_entry level:9 failed: read failed"]);

  const rejectingAfterLookup: Rpc = async (fn) =>
    fn === "list_boards" ? { data: REGISTRY, error: null } : Promise.reject(new Error("network drop"));
  const rejected = await withCapturedErrors(() => readExpansionPlacement(rejectingAfterLookup, createBoardIdCache(), 9));
  assert.deepEqual(rejected.result, { bestScore: null, levelRank: null }, "A rejected read-back call never escapes.");
  assert.deepEqual(rejected.logs, ["[score] placement: expansion placement failed: network drop"]);
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
console.log("Score placement: pinned board ids with success-only caching, is_you read-back, null-on-failure with error logging, and legacy-compatible replies passed.");
