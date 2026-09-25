import { BOARD_READ_LIMIT, CAMPAIGN_BOARD, EXPANSION_BOARD, createBoardReader } from "../src/leaderboard/boardReads";
import * as server from "../supabase/functions/submit-gridwatch-score/scoreBoard";
import assert from "./assert";

// The client reads exactly the boards the Edge Function writes.
assert.deepEqual(CAMPAIGN_BOARD, server.CAMPAIGN_BOARD);
assert.deepEqual(EXPANSION_BOARD, server.EXPANSION_BOARD);
assert.equal(BOARD_READ_LIMIT, 20);

const config = { enabled: true, url: "https://isolated.invalid", anonKey: "test-public", gameSlug: "gridwatch-signal-breach" };
const CAMPAIGN_ID = "00000000-0000-4000-8000-0000000000c2";
const EXPANSION_ID = "00000000-0000-4000-8000-0000000000e4";
const REGISTRY = [
  { id: CAMPAIGN_ID, game_slug: "gridwatch-signal-breach", key: "campaign", ruleset: "r2", status: "active" },
  { id: EXPANSION_ID, game_slug: "gridwatch-signal-breach", key: "expansion", ruleset: "r4", status: "active" },
];

type Seen = { fn: string; body: Record<string, unknown>; headers: Headers };
function fakeFetch(answer: (fn: string, body: Record<string, unknown>) => { status?: number; json: unknown }) {
  const seen: Seen[] = [];
  const request: typeof fetch = async (url, init) => {
    const fn = String(url).replace(`${config.url}/rest/v1/rpc/`, "");
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    seen.push({ fn, body, headers: new Headers(init?.headers) });
    assert.equal(init?.method, "POST");
    const out = answer(fn, body);
    return Response.json(out.json, { status: out.status ?? 200 });
  };
  return { request, seen };
}

// Campaign (CAMPAIGN tab): get_board on the campaign board, 'all', top 20, total → score.
{
  const { request, seen } = fakeFetch((fn) => fn === "list_boards"
    ? { json: REGISTRY }
    : { json: [
      { rank: 1, display_name: "Ace", total: 1540, updated_at: "2026-09-25T10:00:00Z", is_you: false },
      { rank: 2, display_name: "<b>Tester</b>", total: 514, updated_at: "2026-09-25T11:00:00Z", is_you: false },
    ] });
  const reader = createBoardReader(config, request);
  const result = await reader.campaign();
  assert.deepEqual(result, { ok: true, entries: [
    { rank: 1, handle: "Ace", score: 1540, rating: null, metadata: {}, created_at: "2026-09-25T10:00:00Z" },
    { rank: 2, handle: "<b>Tester</b>", score: 514, rating: null, metadata: {}, created_at: "2026-09-25T11:00:00Z" },
  ] });
  assert.deepEqual(seen.map((s) => s.fn), ["list_boards", "get_board"]);
  assert.deepEqual(seen[0]!.body, { p_game_slug: "gridwatch-signal-breach" });
  assert.deepEqual(seen[1]!.body, { p_board_id: CAMPAIGN_ID, p_period_key: "all", p_limit: 20 });
  assert.equal(seen[1]!.headers.get("Authorization"), "Bearer test-public", "Reads use the public anon key.");
  assert.equal(seen[1]!.headers.get("apikey"), "test-public");

  // SECTOR n tab: get_board_entry on the same board; the registry is not re-read.
  await reader.campaignSector(2);
  assert.deepEqual(seen.map((s) => s.fn), ["list_boards", "get_board", "get_board_entry"]);
  assert.deepEqual(seen[2]!.body, { p_board_id: CAMPAIGN_ID, p_period_key: "all", p_entry_key: "sector:2", p_limit: 20 });
}

// status: list_boards orders active boards first, then archived. An archived duplicate for the
// same key + ruleset must never overwrite the active id, and a board that exists only as
// archived is not-found (the same behaviour the module already defines for a missing board).
{
  const ARCHIVED_DUPLICATE_ID = "00000000-0000-4000-8000-0000000000c9";
  const withArchivedDuplicate = [
    ...REGISTRY,
    { id: ARCHIVED_DUPLICATE_ID, game_slug: "gridwatch-signal-breach", key: "campaign", ruleset: "r2", status: "archived" },
  ];
  const { request, seen } = fakeFetch((fn) => fn === "list_boards" ? { json: withArchivedDuplicate } : { json: [] });
  const result = await createBoardReader(config, request).campaign();
  assert.equal(result.ok, true);
  assert.deepEqual(seen[1]!.body, { p_board_id: CAMPAIGN_ID, p_period_key: "all", p_limit: 20 }, "An archived duplicate listed after the active row must not override the active id.");

  const onlyArchivedCampaign = [
    { id: ARCHIVED_DUPLICATE_ID, game_slug: "gridwatch-signal-breach", key: "campaign", ruleset: "r2", status: "archived" },
  ];
  const { request: archivedOnlyRequest } = fakeFetch((fn) => fn === "list_boards" ? { json: onlyArchivedCampaign } : { json: [] });
  assert.deepEqual(
    await createBoardReader(config, archivedOnlyRequest).campaign(),
    { ok: false, error: "Rankings could not be loaded. Retry when online." },
    "An archived-only board is not-found.",
  );
}

// Expansion level: get_board_entry on the expansion board, score → score.
{
  const { request, seen } = fakeFetch((fn) => fn === "list_boards"
    ? { json: REGISTRY }
    : { json: [{ rank: 1, display_name: "Tester", score: 812, achieved_at: "2026-09-25T12:00:00Z", is_you: false }] });
  const result = await createBoardReader(config, request).expansionLevel(7);
  assert.deepEqual(result, { ok: true, entries: [{ rank: 1, handle: "Tester", score: 812, rating: null, metadata: {}, created_at: "2026-09-25T12:00:00Z" }] });
  assert.deepEqual(seen[1]!.body, { p_board_id: EXPANSION_ID, p_period_key: "all", p_entry_key: "level:7", p_limit: 20 });
}

// Empty board is a success (honest "no scores yet"), not an error.
{
  const { request } = fakeFetch((fn) => ({ json: fn === "list_boards" ? REGISTRY : [] }));
  assert.deepEqual(await createBoardReader(config, request).campaign(), { ok: true, entries: [] });
}

// Registry failure is not cached; a missing board is not cached; success is.
{
  let registry: { status?: number; json: unknown } = { status: 503, json: { message: "down" } };
  const { request, seen } = fakeFetch((fn) => fn === "list_boards" ? registry : { json: [] });
  const reader = createBoardReader(config, request);
  assert.equal((await reader.campaign()).ok, false);
  registry = { json: [REGISTRY[1]] };
  assert.equal((await reader.campaign()).ok, false, "No campaign board registered.");
  registry = { json: REGISTRY };
  assert.equal((await reader.campaign()).ok, true);
  assert.equal((await reader.campaignSector(1)).ok, true);
  assert.equal(seen.filter((s) => s.fn === "list_boards").length, 3);
}

// Row validation rejects the whole response; transport failures degrade to ok:false.
for (const rows of [
  [{ rank: 0, display_name: "x", total: 1 }],
  [{ rank: 1, display_name: 7, total: 1 }],
  [{ rank: 1, display_name: "x", total: -1 }],
  [{ rank: 1, display_name: "x", total: 1.5 }],
  Array.from({ length: 21 }, (_, i) => ({ rank: i + 1, display_name: "x", total: 1 })),
  { rank: 1 },
]) {
  const { request } = fakeFetch((fn) => ({ json: fn === "list_boards" ? REGISTRY : rows }));
  assert.deepEqual(await createBoardReader(config, request).campaign(), { ok: false, error: "Invalid leaderboard response." });
}
{
  const { request } = fakeFetch((fn) => fn === "list_boards" ? { json: REGISTRY } : { status: 500, json: { message: "boom" } });
  assert.equal((await createBoardReader(config, request).campaignSector(1)).ok, false);
  const offline: typeof fetch = async () => { throw new TypeError("offline"); };
  assert.deepEqual(await createBoardReader(config, offline).campaign(), { ok: false, error: "Rankings could not be loaded. Retry when online." });
}

// Disabled builds (LAN preview) never touch the network.
{
  let calls = 0;
  const counting: typeof fetch = async () => { calls++; return Response.json([]); };
  const reader = createBoardReader({ ...config, enabled: false }, counting);
  assert.deepEqual(await reader.campaign(), { ok: false, error: "Leaderboard is offline." });
  assert.equal((await reader.expansionLevel(1)).ok, false);
  assert.equal(calls, 0);
}
console.log("Board reads: client/server board agreement, campaign get_board and sector/level get_board_entry, success-only registry caching, row validation, offline and disabled paths passed.");
