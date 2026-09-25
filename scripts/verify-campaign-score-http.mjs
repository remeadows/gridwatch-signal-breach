import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { BOARD_IDS, OWNER_ID, boardRpc, loadScoreHandler } from "./score-http-harness.mjs";

// The V2 campaign path of the real HTTP entrypoint, with isolated Auth/DB ports: cleared
// sectors make exactly one service-role submit_score call to campaign / r2; lost and
// legacy-ruleset runs write nothing; every submit_score status maps to the documented HTTP.
const won = JSON.parse(await readFile(new URL("../docs/fixtures/phase4-promotion-replay.json", import.meta.url), "utf8"));
// Same seed and sector, launched straight into the waves with no defences: replays to a loss (score 33).
const lost = { ruleset: "phase4-v1", seed: won.seed, sector: won.sector, commands: [{ t: 0, c: { type: "skipPrep" } }] };
const writesOf = (h) => h.rpcCalls("submit_score").length + h.rpcCalls("record_score").length;

// A cleared sector: one write, campaign / r2, entry sector:1, replayed score 514.
{
  const h = await loadScoreHandler(boardRpc({
    submit_score: () => ({ data: { status: "ok", improved: true, total: 1540 }, error: null }),
    get_board_entry: () => ({ data: [
      { rank: 1, display_name: "Ace", score: 700, is_you: false },
      { rank: 3, display_name: "Tester", score: 514, is_you: true },
    ], error: null }),
    get_my_standing: () => ({ data: [{ rank: 2, total: 1540, field: 5 }], error: null }),
  }));
  const res = await h.send({ ...won, score: 99999, user_id: "forged" });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://nexus.warsignallabs.net");
  assert.deepEqual(await res.json(), {
    ok: true, improved: true, runScore: 514, bestScore: 514, campaignScore: 1540, ruleset: "phase4-v1",
    rating: "Ghostline Architect", globalRank: 2, sectorRank: 3, handle: "Tester",
  });
  const writes = h.rpcCalls("submit_score");
  assert.equal(writes.length, 1, "Exactly one write per accepted run.");
  assert.equal(writes[0].role, "admin");
  const args = writes[0].args;
  assert.equal(args.p_user_id, OWNER_ID);
  assert.equal(args.p_game_slug, "gridwatch-signal-breach");
  assert.equal(args.p_board_key, "campaign");
  assert.equal(args.p_ruleset, "r2");
  assert.deepEqual(args.p_entries, [{ key: "sector:1", score: 514 }]);
  assert.match(args.p_proof_hash, /^[0-9a-f]{64}$/);
  assert.equal(args.p_request_id, args.p_proof_hash, "The proof hash is the replay key.");
  assert.ok(Math.abs(Date.parse(args.p_achieved_at) - Date.now()) < 60_000, "achieved_at is server time.");
  assert.deepEqual(args.p_meta, { v: 1, ruleset: "phase4-v1", sector: 1, seed: "phase4-c", commandCount: won.commands.length, rating: "Ghostline Architect" });
  assert.equal(h.rpcCalls("record_score").length, 0, "No legacy record_score write.");
  assert.equal(h.state.calls.some((c) => c.table === "scores" || c.table === "games"), false, "No reads of public.scores or games.");
  for (const name of ["list_boards", "get_board_entry", "get_my_standing"]) {
    assert.equal(h.rpcCalls(name).every((c) => c.role === "user"), true, `${name} runs as the player.`);
  }
  assert.deepEqual(h.rpcCalls("get_board_entry")[0].args, { p_board_id: BOARD_IDS.campaign, p_period_key: "all", p_entry_key: "sector:1", p_limit: 100 });
  assert.deepEqual(h.rpcCalls("get_my_standing")[0].args, { p_board_id: BOARD_IDS.campaign, p_period_key: "all" });

  // The board id is cached after the first success: a second run resolves no registry.
  assert.equal((await h.send(won)).status, 200);
  assert.equal(h.rpcCalls("list_boards").length, 1);
  h.close();
}

// A lost run and a legacy-ruleset run: 200, ok:false, recorded:false, nothing written.
{
  const h = await loadScoreHandler();
  const res = await h.send(lost);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    ok: false, recorded: false, reason: "not-cleared", runScore: 33, rating: "Blackout Casualty",
    error: "Not recorded — sector not cleared. Only cleared sectors count on the leaderboard.",
  });
  for (const legacy of [{ seed: won.seed, sector: 1, commands: won.commands }, { ...won, ruleset: "legacy-v1" }]) {
    const legacyRes = await h.send(legacy);
    assert.equal(legacyRes.status, 200);
    assert.equal((await legacyRes.json()).reason, "retired-ruleset");
  }
  assert.equal(writesOf(h), 0, "Lost and legacy runs never write.");
  assert.equal(h.state.calls.length, 0, "They are answered before any profile or board access.");
  h.close();
}

// Handle, validation and replay rejections happen before any write.
{
  const h = await loadScoreHandler();
  h.state.handle = null;
  assert.equal((await h.send(won)).status, 409);
  h.state.handle = "Tester";
  assert.equal((await h.send({ ...won, sector: 4 })).status, 400);
  assert.equal((await h.send({ ...won, ruleset: "phase9-v1" })).status, 400);
  assert.equal((await h.send({ ...won, level: 1 })).status, 400, "Mixed replay schema.");
  assert.equal((await h.send({ ...won, commands: [{ t: 0, c: { type: "placeUnit", unit: "turret", position: { x: 99, y: 99 } } }] })).status, 422);
  assert.equal(writesOf(h), 0);
  h.close();
}

// submit_score statuses → HTTP. duplicate and request_conflict are already-logged successes.
const cases = [
  [{ status: "duplicate", improved: true, total: 1540 }, 200, { improved: false, campaignScore: 1540 }],
  [{ status: "request_conflict" }, 200, { improved: false, campaignScore: 514 }],
  [{ status: "invalid_time" }, 422, { ok: false, error: "Run too old to log." }],
  [{ status: "invalid_entry" }, 422, { ok: false, error: "Score rejected by the leaderboard." }],
  [{ status: "score_out_of_range" }, 422, { ok: false, error: "Score rejected by the leaderboard." }],
  [{ status: "invalid_request" }, 400, { ok: false, error: "Bad submission." }],
  [{ status: "unknown_board" }, 503, { ok: false, error: "Leaderboard season changed — try again later." }],
  [{ status: "ruleset_mismatch" }, 503, { ok: false, error: "Leaderboard season changed — try again later." }],
  [{ status: "surprise" }, 500, { ok: false, error: "Could not save score." }],
];
const logged = [];
const originalError = console.error;
console.error = (...args) => { logged.push(args.join(" ")); };
try {
  for (const [result, status, expected] of cases) {
    const h = await loadScoreHandler(boardRpc({ submit_score: () => ({ data: result, error: null }) }));
    const res = await h.send(won);
    assert.equal(res.status, status, `${result.status} → ${status}`);
    const body = await res.json();
    for (const [key, value] of Object.entries(expected)) assert.deepEqual(body[key], value, `${result.status}: ${key}`);
    h.close();
  }
  assert.ok(logged.includes("[score] submit_score ruleset_mismatch for gridwatch-signal-breach/campaign/r2"));
  assert.ok(logged.includes("[score] submit_score unknown_board for gridwatch-signal-breach/campaign/r2"));

  // A failed RPC call is a 500; a failed read-back after a committed write is still a 200.
  const broken = await loadScoreHandler(boardRpc({ submit_score: () => ({ data: null, error: { message: "boom" } }) }));
  const brokenRes = await broken.send(won);
  assert.equal(brokenRes.status, 500);
  assert.deepEqual(await brokenRes.json(), { ok: false, error: "Could not save score." });
  broken.close();
  const blind = await loadScoreHandler(boardRpc({ list_boards: () => ({ data: null, error: { message: "registry down" } }) }));
  const blindRes = await blind.send(won);
  assert.equal(blindRes.status, 200);
  const blindBody = await blindRes.json();
  assert.equal(blindBody.globalRank, null);
  assert.equal(blindBody.sectorRank, null);
  assert.equal(blindBody.bestScore, 514, "An improving run is its own best.");
  assert.equal(blindBody.campaignScore, 514);
  blind.close();
} finally {
  console.error = originalError;
}
console.log("Campaign HTTP: one campaign/r2 submit_score write per cleared sector, server-derived score/key/meta, lost and legacy runs not recorded, pre-write rejections, status → HTTP mapping and best-effort read-back passed.");
