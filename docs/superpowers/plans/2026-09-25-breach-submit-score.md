# Signal Breach onto the shared board registry (leaderboards phase 3, game 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The `submit-gridwatch-score` Edge Function makes one service-role `submit_score` call per accepted run (cleared V2 sector → `gridwatch-signal-breach / campaign / r2`, entry `sector:<n>`; expansion win → `expansion / r4`, entry `level:<n>`) and stops writing `public.scores`; the in-game leaderboards read the new boards through `list_boards` / `get_board` / `get_board_entry`.

**Architecture:** The function keeps its auth check, body bound, payload validation and deterministic sim-replay anti-cheat exactly as today. Everything after "the replay says this run scored N" is replaced: the `record_score` primary write, the `sector-cleared:*` markers, the `standard` / `daily-*` / `weekly-*` hub-alignment block and its `public.scores` reads all go, and one `submit_score` RPC takes their place. The pure parts live in two new Node-testable modules next to `index.ts`: `scoreBoard.ts` (boards, entry keys, compact meta, RPC args, status → HTTP) and `scorePlacement.ts` (best-effort read-back as the player after the write, and the legacy-compatible response bodies). The client gets one small reader, `src/leaderboard/boardReads.ts`, that both the V2 leaderboard screen and the expansion level panel use. Response field names and types stay as they are, so bundles cached before the deploy keep working.

**Tech Stack:** TypeScript, Supabase Edge Function (Deno, `jsr:@supabase/supabase-js@2`), Supabase PostgREST RPC, Vite + vanilla TS client, esbuild-bundled Node verify scripts (`scripts/run-typescript.mjs` + `scripts/assert.ts`), no test framework.

**Spec:** `gridwatch-command-nexus` repo, `docs/superpowers/specs/2026-09-24-nexus-leaderboards-rebuild-design.md` (read it with `git -C "/Users/russmeadows/Dev/1 - WarSignalLabs/1 - Apps/2 - WebApps/gridwatch-command-nexus" show origin/main:docs/superpowers/specs/2026-09-24-nexus-leaderboards-rebuild-design.md`): §2 (write path), §3 (reads), §5 (board rows and the "Breach" mapping bullet), §6 (rollout). The database side is live: Nexus migrations `supabase/migrations/20260924131533_leaderboard_boards.sql` and `20260924135833_submit_score_board_lock.sql` on that repo's `origin/main`. Reference implementations of the same switch: Drift `worker/scoreBoard.js` (GWTetrisRace `origin/main`) and Match `worker/scoreBoard.ts` + its plan `docs/superpowers/plans/2026-09-25-match-submit-score.md` (GridWatchMatchWeb `origin/main`).

## Global Constraints

- Boards (seeded, live): `gridwatch-signal-breach / campaign / r2` — kind `sum`, `entry_key_pattern` `^sector:[0-9]{1,2}$`, `max_entry_score` 100000, periods `all, week`, headline; `gridwatch-signal-breach / expansion / r4` — kind `sum`, `^level:[0-9]{1,2}$`, `max_entry_score` 100000, period `all`, not headline.
- Breach "submits `{key: "sector:<n>", score}` **only for won (cleared) runs**, so the headline counts cleared sectors exactly as today's `sector-cleared` marker does. *Change:* in-game per-sector boards (`get_board_entry`) rank cleared runs only. The expansion path submits `{key: "level:<n>", score}` to `expansion / r4`." (spec §5)
- `submit_score(p_user_id uuid, p_game_slug text, p_board_key text, p_ruleset text, p_entries jsonb, p_achieved_at timestamptz, p_request_id text, p_proof_hash text, p_meta jsonb) returns jsonb` → `{status, improved, total}`. Statuses: `ok`, `duplicate`, `request_conflict`, `invalid_request`, `unknown_board`, `ruleset_mismatch`, `invalid_time`, `invalid_entry`, `score_out_of_range`. Returned as data, never raised. Executable by `service_role` only. `duplicate` returns the stored result with `status: "duplicate"`.
- `p_request_id` matches `^[A-Za-z0-9_-]{16,64}$`; `p_proof_hash` matches `^[0-9a-f]{64}$` or is null; `p_meta` is a JSON object of at most 4 KB (`octet_length(meta::text) <= 4096`) or null. `request_hash` covers slug, board, ruleset, entries, `achieved_at` (UTC), proof hash and meta; the replay window is 1 hour. `p_achieved_at` must be within `[now − 24 h, now + 5 min]`.
- Read RPCs (anon + authenticated): `list_boards(p_game_slug text)` → `(id, game_slug, game_name, key, ruleset, title, kind, periods, is_headline, status, sort_order, created_at, archived_at)`; `get_board(p_board_id uuid, p_period_key text, p_limit int default 20)` → `(rank bigint, display_name text, total bigint, updated_at, is_you boolean)`; `get_board_entry(p_board_id, p_period_key, p_entry_key, p_limit default 20)` → `(rank, display_name, score int, achieved_at, is_you)`; `get_my_standing(p_board_id, p_period_key)` → `(rank, total, field)`. `p_limit` is clamped to [1, 100]. Period keys: `all`, `w:IYYY-Www` (UTC).
- **Never write scores from the client.** The only writer is the Edge Function with `SUPABASE_SERVICE_ROLE_KEY` (a Supabase function secret; never committed, never echoed). Env names: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Guardrails (AGENTS.md / SKILLS.md): keep the game static apart from the sanctioned leaderboard/sign-in; the V2 three-sector campaign is immutable; expansion stays isolated from the campaign board; never change behaviour for `grid-drift` or `gridwatch-match`; never run a DB fixture against GridWatchGamesDB; `supabase db push` is forbidden.
- Do not touch `src/sim/**` or anything feeding `sim.bundle.js` / `expansion-r4.bundle.js` (`src/sim/**`, `scripts/expansion-score-validator-entry.ts`, `src/leaderboard/expansionScoreProtocol.ts`, `src/data/campaigns/expansion/contentManifest.ts`). Both bundles must stay byte-identical — the CI set checks it every task.
- Edge Function deploy (Russ-gated, manual): `supabase functions deploy submit-gridwatch-score --project-ref mggxfzzxrpjgpzhwiwqi --no-verify-jwt`. The static client deploys through Cloudflare Pages' Git integration: every push to `main` builds `dist/` and publishes it at `gridwatch-signal-breach.pages.dev`, which the Nexus worker proxies to players at `https://nexus.warsignallabs.net/play/breach/` (Nexus `worker/playProxy.ts`).
- **CI set** (the repo's `.github/workflows/ci.yml` minus the Docker DB fixtures, which this plan does not affect). Every task ends by running it from the repo root and seeing `CI SET GREEN` (≈1 minute). It picks up every `npm run` line in `ci.yml`, so scripts added by a task are included automatically:

```sh
bash -eo pipefail -c "$(cat <<'CI'
npm audit --audit-level=high
npm run build
node scripts/verify-expansion-migration-boundary.mjs
while IFS= read -r cmd; do echo "== $cmd"; $cmd </dev/null; done < <(grep -E '^ +npm run (typecheck:tools|verify:|check:|balance:|expansion:)' .github/workflows/ci.yml | sed 's/^ *//')
npm run build:validator
npm run build:expansion-validator
git diff --exit-code -- supabase/functions/submit-gridwatch-score/sim.bundle.js supabase/functions/submit-gridwatch-score/expansion-r4.bundle.js
echo "CI SET GREEN"
CI
)"
```

  Baseline on `origin/main` (`ff6238a`): 42 `npm run` steps, `CI SET GREEN`. Each task below says how many steps it should report.
- Edge Function type check (needs network on first run, writes no lockfile): `deno check --node-modules-dir=none --no-lock supabase/functions/submit-gridwatch-score/index.ts` → exit 0.

## Rulings made while planning

Controller rulings (binding):

1. **Board mapping.** Current-ruleset (`phase4-v1`) WON runs → `campaign / r2`, one entry `sector:<n>`, score = replayed score. LOST runs are not submitted to any board; the function answers HTTP 200 `{ok: false, recorded: false, reason: "not-cleared", runScore, rating, error}`. That is the only 200 shape cached V2 bundles render honestly: they take their `ok: false` path and print `error` verbatim ("Not recorded — sector not cleared. Only cleared sectors count on the leaderboard."), while an `ok: true` body would make them print "Run logged … Global #null". Legacy-ruleset runs (no `ruleset` / `"legacy-v1"`) are never written: the current client sends them only from a pending run stashed by a pre-phase-4 bundle (`takePendingRun` defaults a missing ruleset to `legacy-v1`); they get the same shape with `reason: "retired-ruleset"`, answered before any replay. Expansion WON runs (the only ones the r4 validator accepts) → `expansion / r4`, entry `level:<n>`; content revision `expansion-1-r4` maps to board ruleset `r4` (`expansionBoardFor`), any other revision has no board (a revision bump = new board, spec D7/D8). *Cost if wrong:* cached clients show the not-recorded line in error styling with SUBMIT re-enabled (re-clicking gets the same answer); changing the shape later is a function redeploy.
2. **Replay key.** `p_request_id` = `p_proof_hash` = the existing proof SHA-256 hex (64 chars). `p_achieved_at` = server time. `request_conflict` and `duplicate` are both "already logged" successes with `improved: false`. No client run-id. *Cost if wrong:* a genuine identical re-play of the same seed with the same command ticks inside an hour reads "already logged" (it is the same score anyway); the weekly period follows submission time, not play time (at most the delay between finishing and submitting).
3. **`p_meta`** is compact: V2 `{v: 1, ruleset, sector, seed, commandCount, rating}`, expansion `{v: 1, contentRevision, level, seed, commandCount, rating}`. The full proof (seed + every command) is covered by `p_proof_hash` only. Bound tested with a 200-char seed of JSON-escaped characters, a 5,000-command log and a 64-char rating: under 2 KB. *Cost if wrong:* the command logs are not kept server-side for later re-verification (nothing reads them today); restoring that needs a proof-storage table (a Nexus migration).
4. **Response compatibility.** Every existing field name and type is kept. `improved` from submit_score; `campaignScore` = submit_score `total` (falls back to the read-back standing total on `request_conflict`, which carries none); `bestScore` / `sectorRank` / `levelRank` from the `is_you` row of `get_board_entry(board, 'all', key, 100)`, `globalRank` from `get_my_standing(campaign, 'all')` — both with the player's own client — null when not found, except that an improving run's `bestScore` is its own score. A failure of these reads never fails the request. Status → HTTP: `invalid_time` / `invalid_entry` / `score_out_of_range` → 422, `invalid_request` → 400, `unknown_board` / `ruleset_mismatch` → 503 (logged), anything else → 500 (logged), RPC call failure → 500 "Could not save score." (the message Breach clients already show), no handle → 409 (unchanged). *Cost if wrong:* see Planner note 2 for the one case cached expansion bundles reject.
5. **Removal.** No `record_score` call, no hub-alignment block, no `.from("scores")` / `.from("games")` read remain in the function (Task 4 greps for them).
6. **In-game reads.** Board ids come from `list_boards('gridwatch-signal-breach')`, pinned by key + ruleset, cached only once found. V2 CAMPAIGN tab (was ALL) → `get_board(campaign, 'all')`; SECTOR n → `get_board_entry(campaign, 'all', 'sector:n')`; expansion level → `get_board_entry(expansion, 'all', 'level:n')`. Rows map onto the existing `LeaderboardEntry` shape (`display_name` → `handle`, `total`/`score` → `score`, `rating: null`, `metadata: {}`), with the expansion reader's stricter row validation now applied to both. Neither in-game table has a "you" slot and both read with the anon key, so `is_you` is not surfaced. *Cost if wrong:* a small UI follow-up with an authenticated read.
7. **Bundles.** Nothing under `src/sim/**` or feeding either validator bundle changes; the CI set proves both are byte-identical after every task.
8. **CI.** Every task ends green on the CI set above; each new verify script is added to `package.json` and `ci.yml` in the task that creates it.
9. **Docs + deploy.** HANDOFF entry (not deployed), AGENTS.md / SKILLS.md / README.md / `docs/EXPANSION_LEADERBOARD_PACKAGE.md` lines about `record_score` and categories updated, and a deploy section: edge function first (Russ-gated), then the static client; acceptance = one signed-in cleared sector + one expansion level win on Mac and iPhone, visible on the Nexus Breach Campaign / Expansion boards with the `is_you` highlight and the `YOU // #n OF m ON THE GRID` footer. Deploy waits until Match's phase-3 deploy is accepted.

Rulings made by the planner (each is also flagged in the Planner notes where it goes beyond the controller's text):

- **Legacy runs are answered before replay, and the pinned legacy validator import is removed** (`https://raw.githubusercontent.com/remeadows/gridwatch-signal-breach/fa0a5df…/sim.bundle.js`). Nothing would use it, and it is a remote import loaded at every cold start. *Cost if wrong:* re-scoring legacy runs means restoring two import lines from `ff6238a`.
- **The current client stops offering submission on a lost run** by passing `onSubmitScore: null` (the overlay's existing "submission unavailable" path — no new UI). *Cost if wrong:* a one-line revert in `src/main.ts`.
- **Placement copy says "Campaign #" instead of "Global #", and the ALL tab is labelled CAMPAIGN**, because both now show the campaign board (sum of cleared-sector bests), not a best-single-run global list. Same 8-character width as "SECTOR 1", so the 4-column tab grid is unchanged. *Cost if wrong:* copy.
- **Read-back runs as the player** (a user-scoped client built from the caller's bearer token), because `get_board_entry.is_you` and `get_my_standing` use `auth.uid()`. The campaign's two reads run in parallel (one extra round trip per submission).
- **Pure helpers are split by responsibility** (`scoreBoard.ts` write side, `scorePlacement.ts` read-back + replies) and tested under Node; `index.ts` stays the thin Deno entrypoint and is exercised end to end by the existing esbuild HTTP-harness technique, factored into `scripts/score-http-harness.mjs`.

## File structure

| File | Responsibility |
|---|---|
| `supabase/functions/submit-gridwatch-score/scoreBoard.ts` (new) | Board constants, entry keys, content revision → board, compact meta + size, `submit_score` args, status → outcome, not-recorded reply. Pure TS. |
| `supabase/functions/submit-gridwatch-score/scorePlacement.ts` (new) | Board-id cache from `list_boards`, `is_you` / standing parsing, best-effort campaign and expansion read-back, V2 and expansion response bodies. Pure TS. |
| `supabase/functions/submit-gridwatch-score/expansionScoreHandler.ts` | Expansion path: validate → handle → one `submit_score` → read-back → reply. Dependencies change from `record` to `submit` + `placement`. |
| `supabase/functions/submit-gridwatch-score/index.ts` | Deno entrypoint. V2 path: validate → legacy/lost not-recorded → handle → one `submit_score` → read-back → reply. Legacy import, `record_score`, hub alignment and period helpers removed. |
| `scripts/score-http-harness.mjs` (new) | Loads the real `index.ts` under Node with stub Auth/DB clients (records role + RPC calls); registry-shaped default RPC port. |
| `scripts/verify-score-board.ts`, `scripts/verify-score-placement.ts` (new) | Unit tests for the two pure modules. |
| `scripts/verify-campaign-score-http.mjs` (new) | V2 path through the HTTP entrypoint. |
| `scripts/verify-expansion-score-http.mjs`, `scripts/verify-expansion-leaderboard.ts` | Expansion path assertions move from `record_score` to `submit_score`. |
| `src/leaderboard/boardReads.ts` (new) | Client board reader: `list_boards` id cache, `get_board` / `get_board_entry`, row validation + mapping. |
| `src/leaderboard/api.ts` | `fetchLeaderboard` delegates to the reader; `SubmitResult` gains nullable ranks/best, `campaignScore` and the not-recorded variant. |
| `src/leaderboard/submitResultText.ts` (new) | Null-safe placement copy shared by the game-over panel and the post-sign-in notice. |
| `src/leaderboard/expansionScoreApi.ts` | `read` delegates to the reader; `submit` accepts null `bestScore` / `levelRank`. |
| `src/ui/account.ts`, `src/main.ts`, `src/ui/screens.ts`, `src/ui/expansionLeaderboardUi.ts` | Use the shared copy; no submit on lost runs; CAMPAIGN tab label; null-safe expansion confirmation. |
| `scripts/verify-board-reads.ts`, `scripts/verify-submit-result-text.ts` (new); `scripts/verify-expansion-score-client.ts`, `scripts/verify-expansion-score-ui.mjs` | Client tests. |
| `package.json`, `.github/workflows/ci.yml` | One `verify:*` script + CI line per new verify script. |
| `HANDOFF.md`, `AGENTS.md`, `SKILLS.md`, `README.md`, `docs/EXPANSION_LEADERBOARD_PACKAGE.md` | Record the change and the deploy procedure. |

---

### Task 1: `scoreBoard.ts`, the pure write-side helpers

**Files:**
- Create: `supabase/functions/submit-gridwatch-score/scoreBoard.ts`
- Create: `scripts/verify-score-board.ts`
- Modify: `package.json` (scripts), `.github/workflows/ci.yml` (the "Verify deterministic replay fixtures" step)

**Interfaces:**
- Consumes: nothing.
- Produces (all exported from `supabase/functions/submit-gridwatch-score/scoreBoard.ts`):
  - `GAME_SLUG = "gridwatch-signal-breach"`
  - `type BoardRef = Readonly<{ key: string; ruleset: string }>`; `CAMPAIGN_BOARD = { key: "campaign", ruleset: "r2" }`; `EXPANSION_BOARD = { key: "expansion", ruleset: "r4" }`
  - `expansionBoardFor(contentRevision: string): BoardRef | null`
  - `sectorEntryKey(sector: number): string` (`sector:<n>`); `levelEntryKey(level: number): string` (`level:<n>`)
  - `MAX_META_BYTES = 4096`; `type CampaignMeta`; `type ExpansionMeta`; `campaignMeta({ruleset, sector, seed, commandCount, rating}): CampaignMeta`; `expansionMeta({contentRevision, level, seed, commandCount, rating}): ExpansionMeta`; `metaBytes(meta): number`
  - `type SubmitScoreArgs` (the nine `p_*` fields); `submitArgs({userId, board, entryKey, score, proofHash, achievedAt: Date, meta}): SubmitScoreArgs` (throws if `proofHash` is not 64 lowercase hex)
  - `type SubmitOutcome = {kind: "logged"; improved: boolean; total: number | null} | {kind: "rejected"; status: number; error: string; log?: string}`; `submitOutcome(result: unknown, board: BoardRef): SubmitOutcome`
  - `toCount(value: unknown): number | null`
  - `type NotRecordedReason = "not-cleared" | "retired-ruleset"`; `notRecordedReply(reason, runScore: number | null, rating: string | null)` → `{ok: false, recorded: false, reason, runScore, rating, error}`

- [ ] **Step 1: Write the failing test** `scripts/verify-score-board.ts`:

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/run-typescript.mjs scripts/verify-score-board.ts`
Expected: FAIL — esbuild `Could not resolve "../supabase/functions/submit-gridwatch-score/scoreBoard"`, non-zero exit.

- [ ] **Step 3: Write `supabase/functions/submit-gridwatch-score/scoreBoard.ts`**

```ts
/* Write side of the shared board registry for Signal Breach (Nexus spec
   docs/superpowers/specs/2026-09-24-nexus-leaderboards-rebuild-design.md §2, §5).
   Boards: gridwatch-signal-breach / campaign / r2 (kind sum; one entry per CLEARED sector,
   keyed `sector:<n>`; the database sums them into the campaign total) and
   gridwatch-signal-breach / expansion / r4 (kind sum; one entry per won level, `level:<n>`).
   A new ruleset or content revision means a new board (spec D7): change the constants here
   together with the Nexus migration that registers it — submit_score answers
   ruleset_mismatch until both agree. Pure TypeScript (no Deno or Supabase imports) so the
   Node verify scripts can load it. */

export const GAME_SLUG = "gridwatch-signal-breach";

export type BoardRef = Readonly<{ key: string; ruleset: string }>;

export const CAMPAIGN_BOARD: BoardRef = { key: "campaign", ruleset: "r2" };
export const EXPANSION_BOARD: BoardRef = { key: "expansion", ruleset: "r4" };

// Expansion content revision → board. Only r4 is published; a later revision registers a new
// board, so an unknown revision has none.
const EXPANSION_BOARDS: Readonly<Record<string, BoardRef>> = { "expansion-1-r4": EXPANSION_BOARD };

export function expansionBoardFor(contentRevision: string): BoardRef | null {
  return Object.prototype.hasOwnProperty.call(EXPANSION_BOARDS, contentRevision)
    ? EXPANSION_BOARDS[contentRevision]
    : null;
}

export function sectorEntryKey(sector: number): string {
  return `sector:${sector}`;
}

export function levelEntryKey(level: number): string {
  return `level:${level}`;
}

// submit_score rejects p_meta above 4 KB (octet_length of the jsonb text). Meta is a compact
// summary; the full proof (seed + every command) is covered by p_proof_hash, not stored.
export const MAX_META_BYTES = 4096;

export type CampaignMeta = Readonly<{
  v: 1;
  ruleset: string;
  sector: number;
  seed: string;
  commandCount: number;
  rating: string;
}>;

export type ExpansionMeta = Readonly<{
  v: 1;
  contentRevision: string;
  level: number;
  seed: string;
  commandCount: number;
  rating: string;
}>;

export function campaignMeta(input: {
  ruleset: string;
  sector: number;
  seed: string;
  commandCount: number;
  rating: string;
}): CampaignMeta {
  return {
    v: 1,
    ruleset: input.ruleset,
    sector: input.sector,
    seed: input.seed,
    commandCount: input.commandCount,
    rating: input.rating,
  };
}

export function expansionMeta(input: {
  contentRevision: string;
  level: number;
  seed: string;
  commandCount: number;
  rating: string;
}): ExpansionMeta {
  return {
    v: 1,
    contentRevision: input.contentRevision,
    level: input.level,
    seed: input.seed,
    commandCount: input.commandCount,
    rating: input.rating,
  };
}

export function metaBytes(meta: CampaignMeta | ExpansionMeta): number {
  return new TextEncoder().encode(JSON.stringify(meta)).length;
}

export type SubmitScoreArgs = Readonly<{
  p_user_id: string;
  p_game_slug: string;
  p_board_key: string;
  p_ruleset: string;
  p_entries: readonly Readonly<{ key: string; score: number }>[];
  p_achieved_at: string;
  p_request_id: string;
  p_proof_hash: string;
  p_meta: CampaignMeta | ExpansionMeta;
}>;

const PROOF_HASH_RE = /^[0-9a-f]{64}$/;

/* One call per accepted run. Replay is deterministic, so an identical proof is the same run:
   the proof's SHA-256 is both the request id (^[A-Za-z0-9_-]{16,64}$) and the proof hash.
   achieved_at is server time — the client sends no clock. */
export function submitArgs(input: {
  userId: string;
  board: BoardRef;
  entryKey: string;
  score: number;
  proofHash: string;
  achievedAt: Date;
  meta: CampaignMeta | ExpansionMeta;
}): SubmitScoreArgs {
  if (!PROOF_HASH_RE.test(input.proofHash)) {
    throw new Error("proofHash must be 64 lowercase hex characters.");
  }
  return {
    p_user_id: input.userId,
    p_game_slug: GAME_SLUG,
    p_board_key: input.board.key,
    p_ruleset: input.board.ruleset,
    p_entries: [{ key: input.entryKey, score: input.score }],
    p_achieved_at: input.achievedAt.toISOString(),
    p_request_id: input.proofHash,
    p_proof_hash: input.proofHash,
    p_meta: input.meta,
  };
}

export type SubmitOutcome =
  | Readonly<{ kind: "logged"; improved: boolean; total: number | null }>
  | Readonly<{ kind: "rejected"; status: number; error: string; log?: string }>;

/* submit_score status → outcome. `duplicate` (same proof, same achieved_at) and
   `request_conflict` (same proof re-sent later, so a different achieved_at) both mean this
   exact run is already on the board: an "already logged" success that improved nothing. The
   two registry statuses mean this function is out of step with the board registry — a deploy
   problem, logged loudly, not the player's fault. */
export function submitOutcome(result: unknown, board: BoardRef): SubmitOutcome {
  const r = typeof result === "object" && result !== null ? (result as Record<string, unknown>) : {};
  const status = r.status;
  if (status === "ok") return { kind: "logged", improved: r.improved === true, total: toCount(r.total) };
  if (status === "duplicate") return { kind: "logged", improved: false, total: toCount(r.total) };
  if (status === "request_conflict") return { kind: "logged", improved: false, total: null };
  if (status === "invalid_time") return { kind: "rejected", status: 422, error: "Run too old to log." };
  if (status === "invalid_entry" || status === "score_out_of_range") {
    return { kind: "rejected", status: 422, error: "Score rejected by the leaderboard." };
  }
  if (status === "invalid_request") return { kind: "rejected", status: 400, error: "Bad submission." };
  if (status === "unknown_board" || status === "ruleset_mismatch") {
    return {
      kind: "rejected",
      status: 503,
      error: "Leaderboard season changed — try again later.",
      log: `submit_score ${status} for ${GAME_SLUG}/${board.key}/${board.ruleset}`,
    };
  }
  return {
    kind: "rejected",
    status: 500,
    error: "Could not save score.",
    log: `submit_score unexpected result: ${JSON.stringify(result)}`,
  };
}

// A non-negative safe integer from a jsonb/PostgREST number (bigint may arrive as a string).
export function toCount(value: unknown): number | null {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isSafeInteger(n) && n >= 0 ? n : null;
}

export type NotRecordedReason = "not-cleared" | "retired-ruleset";

const NOT_RECORDED_COPY: Readonly<Record<NotRecordedReason, string>> = {
  "not-cleared": "Not recorded — sector not cleared. Only cleared sectors count on the leaderboard.",
  "retired-ruleset": "Not recorded — this run used retired rules. Replay the sector to rank.",
};

/* HTTP 200 with ok:false and nothing written. Bundles cached before this change take their
   ok:false path and show `error` verbatim (no field they read is missing or null); the
   current client recognises `recorded: false` and shows it as information, not a failure. */
export function notRecordedReply(reason: NotRecordedReason, runScore: number | null, rating: string | null) {
  return {
    ok: false as const,
    recorded: false as const,
    reason,
    runScore,
    rating,
    error: NOT_RECORDED_COPY[reason],
  };
}
```

- [ ] **Step 4: Register the script.** In `package.json`, directly after the line `"verify:expansion-score-ui": "node scripts/verify-expansion-score-ui.mjs",` add:

```json
    "verify:score-board": "node scripts/run-typescript.mjs scripts/verify-score-board.ts",
```

In `.github/workflows/ci.yml`, directly after the line `          npm run verify:expansion-score-ui` add:

```yaml
          npm run verify:score-board
```

- [ ] **Step 5: Run the test and the type check**

Run: `npm run verify:score-board && npm run typecheck:tools`
Expected: `Score board: registry boards/keys, bounded meta, one-entry submit args, status mapping and not-recorded replies passed.` and a silent, zero-exit `tsc`.

- [ ] **Step 6: Run the CI set** (Global Constraints). Expected: 43 `== npm run …` steps, then `CI SET GREEN`.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/submit-gridwatch-score/scoreBoard.ts scripts/verify-score-board.ts package.json .github/workflows/ci.yml
git commit -m "feat(score): submit_score write helpers for campaign/r2 and expansion/r4

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `scorePlacement.ts`, best-effort read-back and response bodies

**Files:**
- Create: `supabase/functions/submit-gridwatch-score/scorePlacement.ts`
- Create: `scripts/verify-score-placement.ts`
- Modify: `package.json`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes (Task 1): `CAMPAIGN_BOARD`, `EXPANSION_BOARD`, `GAME_SLUG`, `levelEntryKey`, `sectorEntryKey`, `toCount`, `type BoardRef` from `./scoreBoard.ts`.
- Produces (exported from `supabase/functions/submit-gridwatch-score/scorePlacement.ts`):
  - `type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>` (structurally matches supabase-js `client.rpc`)
  - `type BoardIdCache = Readonly<{ resolve(rpc: Rpc, board: BoardRef): Promise<string | null> }>`; `createBoardIdCache(): BoardIdCache`
  - `PLACEMENT_LIMIT = 100`
  - `yourEntry(rows: unknown): {rank: number; score: number} | null`; `yourStanding(rows: unknown): {rank: number; total: number; field: number} | null`
  - `type CampaignPlacement = {bestScore, sectorRank, globalRank, campaignTotal}` (each `number | null`); `type ExpansionPlacement = {bestScore, levelRank}` (each `number | null`)
  - `readCampaignPlacement(rpc: Rpc, boards: BoardIdCache, sector: number): Promise<CampaignPlacement>` (never rejects)
  - `readExpansionPlacement(rpc: Rpc, boards: BoardIdCache, level: number): Promise<ExpansionPlacement>` (never rejects)
  - `campaignReply({outcome: {improved, total}, placement, runScore, ruleset, rating, handle})` → `{ok: true, improved, runScore, bestScore, campaignScore, ruleset, rating, globalRank, sectorRank, handle}`
  - `expansionReply({outcome, placement, runScore, rating, handle, category, contentRevision, level})` → `{ok: true, improved, runScore, bestScore, levelRank, rating, handle, category, contentRevision, level}`

- [ ] **Step 1: Write the failing test** `scripts/verify-score-placement.ts`:

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/run-typescript.mjs scripts/verify-score-placement.ts`
Expected: FAIL — esbuild `Could not resolve "../supabase/functions/submit-gridwatch-score/scorePlacement"`.

- [ ] **Step 3: Write `supabase/functions/submit-gridwatch-score/scorePlacement.ts`**

```ts
/* Read-back after a committed submit_score write, and the response bodies built from it.
   Reads run with the caller's user-scoped client so get_board_entry's is_you and
   get_my_standing resolve to that player (Nexus spec §3). They are best-effort: the write
   has already committed, so a failed read yields nulls, never a failed request. */
import {
  CAMPAIGN_BOARD,
  EXPANSION_BOARD,
  GAME_SLUG,
  levelEntryKey,
  sectorEntryKey,
  toCount,
  type BoardRef,
} from "./scoreBoard.ts";

// Structural match for supabase-js `client.rpc(fn, args)` (a thenable {data, error}).
export type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;

export type BoardIdCache = Readonly<{ resolve(rpc: Rpc, board: BoardRef): Promise<string | null> }>;

// Board ids come from list_boards. A found id is cached for the life of the isolate; a failed
// or incomplete registry read is not, so the next request tries again.
export function createBoardIdCache(): BoardIdCache {
  const ids = new Map<string, string>();
  const cacheKey = (board: BoardRef) => `${board.key}/${board.ruleset}`;
  return {
    async resolve(rpc, board) {
      const hit = ids.get(cacheKey(board));
      if (hit) return hit;
      try {
        const { data, error } = await rpc("list_boards", { p_game_slug: GAME_SLUG });
        if (error || !Array.isArray(data)) return null;
        for (const row of data) {
          if (isRecord(row) && row.game_slug === GAME_SLUG && typeof row.id === "string"
            && typeof row.key === "string" && typeof row.ruleset === "string") {
            ids.set(`${row.key}/${row.ruleset}`, row.id);
          }
        }
        return ids.get(cacheKey(board)) ?? null;
      } catch {
        return null;
      }
    },
  };
}

// get_board_entry clamps p_limit to [1, 100]; a player outside the top 100 reads as null.
export const PLACEMENT_LIMIT = 100;

export type EntryStanding = Readonly<{ rank: number; score: number }>;
export type BoardStanding = Readonly<{ rank: number; total: number; field: number }>;

export function yourEntry(rows: unknown): EntryStanding | null {
  if (!Array.isArray(rows)) return null;
  for (const row of rows) {
    if (!isRecord(row) || row.is_you !== true) continue;
    const rank = toCount(row.rank);
    const score = toCount(row.score);
    return rank !== null && rank >= 1 && score !== null ? { rank, score } : null;
  }
  return null;
}

export function yourStanding(rows: unknown): BoardStanding | null {
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!isRecord(row)) return null;
  const rank = toCount(row.rank);
  const total = toCount(row.total);
  const field = toCount(row.field);
  return rank !== null && rank >= 1 && total !== null && field !== null ? { rank, total, field } : null;
}

export type CampaignPlacement = Readonly<{
  bestScore: number | null;
  sectorRank: number | null;
  globalRank: number | null;
  campaignTotal: number | null;
}>;

export type ExpansionPlacement = Readonly<{ bestScore: number | null; levelRank: number | null }>;

export async function readCampaignPlacement(rpc: Rpc, boards: BoardIdCache, sector: number): Promise<CampaignPlacement> {
  const none: CampaignPlacement = { bestScore: null, sectorRank: null, globalRank: null, campaignTotal: null };
  try {
    const id = await boards.resolve(rpc, CAMPAIGN_BOARD);
    if (!id) return none;
    const [entry, standing] = await Promise.all([
      rpc("get_board_entry", { p_board_id: id, p_period_key: "all", p_entry_key: sectorEntryKey(sector), p_limit: PLACEMENT_LIMIT }),
      rpc("get_my_standing", { p_board_id: id, p_period_key: "all" }),
    ]);
    const mine = entry.error ? null : yourEntry(entry.data);
    const overall = standing.error ? null : yourStanding(standing.data);
    return {
      bestScore: mine?.score ?? null,
      sectorRank: mine?.rank ?? null,
      globalRank: overall?.rank ?? null,
      campaignTotal: overall?.total ?? null,
    };
  } catch {
    return none;
  }
}

export async function readExpansionPlacement(rpc: Rpc, boards: BoardIdCache, level: number): Promise<ExpansionPlacement> {
  const none: ExpansionPlacement = { bestScore: null, levelRank: null };
  try {
    const id = await boards.resolve(rpc, EXPANSION_BOARD);
    if (!id) return none;
    const entry = await rpc("get_board_entry", {
      p_board_id: id, p_period_key: "all", p_entry_key: levelEntryKey(level), p_limit: PLACEMENT_LIMIT,
    });
    const mine = entry.error ? null : yourEntry(entry.data);
    return { bestScore: mine?.score ?? null, levelRank: mine?.rank ?? null };
  } catch {
    return none;
  }
}

type Logged = Readonly<{ improved: boolean; total: number | null }>;

/* The V2 response keeps every field name bundles cached before this change read. globalRank
   is now the player's rank on the campaign board (sum of cleared-sector bests); sectorRank and
   bestScore come from the sector entry. When this run improved, it IS the stored best, so
   bestScore never reads null in that case even if the read-back failed. */
export function campaignReply(input: {
  outcome: Logged;
  placement: CampaignPlacement;
  runScore: number;
  ruleset: string;
  rating: string;
  handle: string;
}) {
  const { outcome, placement } = input;
  return {
    ok: true as const,
    improved: outcome.improved,
    runScore: input.runScore,
    bestScore: placement.bestScore ?? (outcome.improved ? input.runScore : null),
    campaignScore: outcome.total ?? placement.campaignTotal,
    ruleset: input.ruleset,
    rating: input.rating,
    globalRank: placement.globalRank,
    sectorRank: placement.sectorRank,
    handle: input.handle,
  };
}

// The expansion response echoes category/contentRevision/level exactly as before: cached
// clients reject a success whose echo does not match the proof they sent.
export function expansionReply(input: {
  outcome: Logged;
  placement: ExpansionPlacement;
  runScore: number;
  rating: string;
  handle: string;
  category: string;
  contentRevision: string;
  level: number;
}) {
  const { outcome, placement } = input;
  return {
    ok: true as const,
    improved: outcome.improved,
    runScore: input.runScore,
    bestScore: placement.bestScore ?? (outcome.improved ? input.runScore : null),
    levelRank: placement.levelRank,
    rating: input.rating,
    handle: input.handle,
    category: input.category,
    contentRevision: input.contentRevision,
    level: input.level,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
```

- [ ] **Step 4: Register the script.** In `package.json`, directly after the `"verify:score-board"` line add:

```json
    "verify:score-placement": "node scripts/run-typescript.mjs scripts/verify-score-placement.ts",
```

In `.github/workflows/ci.yml`, directly after `          npm run verify:score-board` add:

```yaml
          npm run verify:score-placement
```

- [ ] **Step 5: Run the test and the type check**

Run: `npm run verify:score-placement && npm run typecheck:tools`
Expected: `Score placement: pinned board ids with success-only caching, is_you read-back, null-on-failure and legacy-compatible replies passed.` and a silent `tsc`.

- [ ] **Step 6: Run the CI set.** Expected: 44 steps, `CI SET GREEN`.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/submit-gridwatch-score/scorePlacement.ts scripts/verify-score-placement.ts package.json .github/workflows/ci.yml
git commit -m "feat(score): best-effort is_you read-back and legacy-compatible replies

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Expansion path writes through `submit_score` (expansion / r4)

**Files:**
- Create: `scripts/score-http-harness.mjs`
- Modify: `supabase/functions/submit-gridwatch-score/expansionScoreHandler.ts` (whole file)
- Modify: `supabase/functions/submit-gridwatch-score/index.ts` (imports, a module-level board-id cache, a user-scoped `Rpc`, the expansion block)
- Modify: `scripts/verify-expansion-score-http.mjs` (whole file), `scripts/verify-expansion-leaderboard.ts` (the dependency block)

**Interfaces:**
- Consumes (Tasks 1–2): `expansionBoardFor`, `expansionMeta`, `levelEntryKey`, `submitArgs`, `submitOutcome`, `type SubmitScoreArgs` from `./scoreBoard.ts`; `expansionReply`, `type ExpansionPlacement`, `createBoardIdCache`, `readExpansionPlacement`, `type Rpc` from `./scorePlacement.ts`.
- Produces:
  - `type ExpansionScoreDependencies = { profile(userId): Promise<{handle: string | null; error: boolean}>; submit(args: SubmitScoreArgs): Promise<unknown>; placement(level: number): Promise<ExpansionPlacement> }` (`submit` resolves to the raw jsonb result, or `null` when the RPC call failed)
  - `handleExpansionScore(payload, userId, deps): Promise<{status: number; body: Record<string, unknown>; log?: string}>`
  - `scripts/score-http-harness.mjs` exports `OWNER_ID`, `BOARD_IDS = {campaign, expansion}`, `REGISTRY`, `boardRpc(overrides?)`, `loadScoreHandler(rpc?) → {state, request, send(body, headers?), rpcCalls(name), close()}`; `state` has `authorized`, `handle`, `profileError`, `rpc`, `calls` (`{role: "user" | "admin", name, args}` or `{role, table}`), `handler`.
  - In `index.ts`: module-level `boardIds` (a `BoardIdCache`) and per-request `userRpc: Rpc`, both used again by Task 4.

- [ ] **Step 1: Write the harness** `scripts/score-http-harness.mjs` (test infrastructure; it replaces the inline loader of `verify-expansion-score-http.mjs`):

```js
import { build } from "esbuild";

// Loads the real submit-gridwatch-score HTTP entrypoint (index.ts) under Node with isolated
// Auth/DB ports. No Deno deployment, network call or production score write is involved:
// jsr:@supabase/supabase-js is replaced by a stub client and any https: import by a stub.

export const OWNER_ID = "authenticated-owner";
export const BOARD_IDS = {
  campaign: "00000000-0000-4000-8000-0000000000c2",
  expansion: "00000000-0000-4000-8000-0000000000e4",
};
export const REGISTRY = [
  { id: BOARD_IDS.campaign, game_slug: "gridwatch-signal-breach", key: "campaign", ruleset: "r2", status: "active" },
  { id: BOARD_IDS.expansion, game_slug: "gridwatch-signal-breach", key: "expansion", ruleset: "r4", status: "active" },
];

/* A registry-shaped RPC port: list_boards, submit_score (ok, improved, total = submitted
   score), get_board_entry (the caller at rank 1 with the last submitted score) and
   get_my_standing. `overrides[name](args, role)` replaces any one of them. */
export function boardRpc(overrides = {}) {
  let last = 0;
  return (name, args, role) => {
    if (name === "submit_score") last = args.p_entries[0].score;
    if (Object.prototype.hasOwnProperty.call(overrides, name)) return overrides[name](args, role);
    if (name === "list_boards") return { data: REGISTRY, error: null };
    if (name === "submit_score") return { data: { status: "ok", improved: true, total: last }, error: null };
    if (name === "get_board_entry") {
      return { data: [{ rank: 1, display_name: "Tester", score: last, achieved_at: "2026-09-25T12:00:00Z", is_you: true }], error: null };
    }
    if (name === "get_my_standing") return { data: [{ rank: 1, total: last, field: 1 }], error: null };
    return { data: null, error: { message: `unexpected rpc ${name}` } };
  };
}

let loads = 0;

export async function loadScoreHandler(rpc = boardRpc()) {
  const state = { authorized: true, handle: "Tester", profileError: null, rpc, calls: [], handler: null };
  globalThis.__scoreTestClient = (_url, _key, options) => {
    // The per-request user client carries the caller's bearer token; the admin client doesn't.
    const role = options?.global?.headers?.Authorization ? "user" : "admin";
    return {
      auth: {
        getUser: async () => state.authorized
          ? { data: { user: { id: OWNER_ID } }, error: null }
          : { data: { user: null }, error: "expired" },
      },
      from: (table) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => {
              state.calls.push({ role, table });
              return { data: table === "profiles" && state.handle ? { handle: state.handle } : null, error: state.profileError };
            },
          }),
        }),
      }),
      rpc: async (name, args) => {
        state.calls.push({ role, name, args });
        return state.rpc(name, args, role);
      },
    };
  };
  globalThis.Deno = { env: { get: () => "isolated-test-value" }, serve: (fn) => { state.handler = fn; } };
  const result = await build({
    entryPoints: ["supabase/functions/submit-gridwatch-score/index.ts"], bundle: true, write: false, format: "esm", platform: "node",
    plugins: [{ name: "isolated-auth-and-remote", setup(builder) {
      builder.onResolve({ filter: /^jsr:/ }, () => ({ path: "auth", namespace: "test" }));
      builder.onResolve({ filter: /^https:/ }, () => ({ path: "remote", namespace: "test" }));
      builder.onLoad({ filter: /.*/, namespace: "test" }, ({ path }) => ({ loader: "js", contents: path === "auth"
        ? "export const createClient = (...args) => globalThis.__scoreTestClient(...args);"
        : "export class ReplayError extends Error {} export function replayRun() { throw new ReplayError('Remote import not exercised in HTTP harness'); }" }));
    } }],
  });
  // A unique suffix gives every load its own module instance (and its own board-id cache).
  const source = `${result.outputFiles[0].text}\n// harness load ${++loads}\n`;
  await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const request = (body, headers = { Authorization: "Bearer isolated-token" }) => new Request("https://isolated.invalid/submit", {
    method: "POST",
    headers: { Origin: "https://nexus.warsignallabs.net", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return {
    state,
    request,
    send: (body, headers) => state.handler(request(body, headers)),
    rpcCalls: (name) => state.calls.filter((c) => c.name === name),
    close() { delete globalThis.Deno; delete globalThis.__scoreTestClient; },
  };
}
```

- [ ] **Step 2: Rewrite the failing HTTP test.** Replace the whole of `scripts/verify-expansion-score-http.mjs` with (the original V2 run is still on `record_score` until Task 4, so it is stubbed here):

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { BOARD_IDS, OWNER_ID, boardRpc, loadScoreHandler } from "./score-http-harness.mjs";

// Exercise the actual HTTP dispatcher with isolated Auth/DB ports. This is not
// a Deno deployment test and makes no network calls or production score writes.
const legacyRecord = (input) => ({ data: [{ stored_score: input.p_score, improved: true, sector_rank: 1, global_rank: 1 }], error: null });
const harness = await loadScoreHandler(boardRpc({ record_score: legacyRecord }));
const { state, send, rpcCalls } = harness;
const report = JSON.parse(await readFile(new URL("../docs/fixtures/expansion-1-r4-chapter-1-human-evidence.json", import.meta.url), "utf8"));
const proof = report.runs.find((r) => r.actionIntervalTicks === 3 && r.seed.endsWith("alpha")).replay;
assert.equal((await send(proof, {})).status, 401);
state.authorized = false;
assert.equal((await send(proof)).status, 401);
state.authorized = true;
assert.equal(state.calls.length, 0);
assert.equal((await send("x".repeat(524289))).status, 413);
assert.equal((await send("not-json")).status, 400);
assert.equal((await send(null)).status, 400);
assert.equal((await send({ ...proof, contentRevision: "expansion-1-r3" })).status, 422);
assert.equal(state.calls.length, 0);

const response = await send({ ...proof, user_id: "forged", category: "phase4-v1:global", score: 999999 });
assert.equal(response.status, 200);
assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://nexus.warsignallabs.net");
const writes = rpcCalls("submit_score");
assert.equal(writes.length, 1, "Expansion makes exactly one write.");
assert.equal(writes[0].role, "admin", "The write uses the service-role client.");
const args = writes[0].args;
assert.equal(args.p_user_id, OWNER_ID);
assert.equal(args.p_game_slug, "gridwatch-signal-breach");
assert.equal(args.p_board_key, "expansion");
assert.equal(args.p_ruleset, "r4");
assert.deepEqual(args.p_entries.map((e) => e.key), [`level:${proof.level}`]);
assert.notEqual(args.p_entries[0].score, 999999, "The score is replayed server-side, never claimed.");
assert.match(args.p_proof_hash, /^[0-9a-f]{64}$/);
assert.equal(args.p_request_id, args.p_proof_hash);
assert.ok(Math.abs(Date.parse(args.p_achieved_at) - Date.now()) < 60_000, "achieved_at is server time.");
assert.deepEqual(Object.keys(args.p_meta).sort(), ["commandCount", "contentRevision", "level", "rating", "seed", "v"]);
assert.equal(rpcCalls("record_score").length, 0, "Expansion never touches the legacy scores table.");
const readBack = rpcCalls("get_board_entry");
assert.equal(readBack.length, 1);
assert.equal(readBack[0].role, "user", "Read-back runs as the player so is_you resolves.");
assert.deepEqual(readBack[0].args, { p_board_id: BOARD_IDS.expansion, p_period_key: "all", p_entry_key: `level:${proof.level}`, p_limit: 100 });
const body = await response.json();
assert.equal(body.ok, true);
assert.equal(body.levelRank, 1);
assert.equal(body.bestScore, args.p_entries[0].score);
assert.equal(body.category, `expansion-v1:expansion-1-r4:level:${proof.level}`, "Cached clients check the category echo.");
assert.equal(body.contentRevision, "expansion-1-r4");
assert.equal(body.level, proof.level);
assert.equal("globalRank" in body, false);

const original = JSON.parse(await readFile(new URL("../docs/fixtures/phase4-promotion-replay.json", import.meta.url), "utf8"));
assert.equal((await send(original)).status, 200);
const originalWrites = rpcCalls("record_score");
assert.equal(originalWrites[0].args.p_category, "phase4-v1:sector:1");
assert.equal(originalWrites[0].args.p_score, 514);
assert.equal(originalWrites.some((w) => w.args.p_category.startsWith("expansion")), false);
assert.equal(rpcCalls("submit_score").length, 1, "The original run never writes the expansion board.");
assert.equal((await state.handler(new Request("https://isolated.invalid", { method: "OPTIONS", headers: { Origin: "https://nexus.warsignallabs.net" } }))).status, 204);
assert.equal((await state.handler(new Request("https://isolated.invalid"))).status, 405);
harness.close();
console.log("Expansion HTTP: auth denial, bounded body, malformed identity, server-derived owner/score, Nexus CORS, one expansion/r4 submit_score write with user-scoped read-back, and unchanged original score 514 passed.");
```

- [ ] **Step 3: Update the handler unit test.** In `scripts/verify-expansion-leaderboard.ts`, replace this block:

```ts
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
```

with:

```ts
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
```

In the same file replace
`assert.equal((await handleExpansionScore(replay, "owner", { ...deps, record: async () => null })).status, 500);`
with
`assert.equal((await handleExpansionScore(replay, "owner", { ...deps, submit: async () => null })).status, 500);`
and replace the final `console.log(...)` line with:

```ts
console.log("Expansion leaderboard: 25 server/client score matches; identity/hash/commands/budget/terminal rejection; one expansion/r4 submit_score write; status mapping and best-effort read-back; profile/errors; bounded request body passed.");
```

- [ ] **Step 4: Run both tests to verify they fail**

Run: `node scripts/verify-expansion-score-http.mjs; node scripts/run-typescript.mjs scripts/verify-expansion-leaderboard.ts`
Expected: both FAIL — the HTTP test with `AssertionError … Expansion makes exactly one write.` (0 `submit_score` calls; the old handler calls `record_score`), the handler test with `Values differ: expected 200, got 500` (the old handler calls the missing `deps.record`).

- [ ] **Step 5: Rewrite `supabase/functions/submit-gridwatch-score/expansionScoreHandler.ts`** (whole file):

```ts
import { validateExpansionScore, ExpansionScoreError } from "./expansion-r4.bundle.js";
import { expansionBoardFor, expansionMeta, levelEntryKey, submitArgs, submitOutcome, type SubmitScoreArgs } from "./scoreBoard.ts";
import { expansionReply, type ExpansionPlacement } from "./scorePlacement.ts";

export type ExpansionScoreDependencies = {
  profile(userId: string): Promise<{ handle: string | null; error: boolean }>;
  // The raw submit_score jsonb result, or null when the RPC call itself failed.
  submit(args: SubmitScoreArgs): Promise<unknown>;
  // Best-effort read-back with the caller's own client; never throws.
  placement(level: number): Promise<ExpansionPlacement>;
};

export type ExpansionScoreResult = { status: number; body: Record<string, unknown>; log?: string };

/** Auth is checked by the HTTP entrypoint. One submit_score call to expansion / r4; never the campaign board. */
export async function handleExpansionScore(payload: unknown, userId: string, deps: ExpansionScoreDependencies): Promise<ExpansionScoreResult> {
  let validated;
  try { validated = validateExpansionScore(payload); }
  catch (error) {
    return { status: 422, body: { ok: false, error: error instanceof ExpansionScoreError ? error.message : "Replay failed." } };
  }
  try {
    const board = expansionBoardFor(validated.proof.contentRevision);
    if (!board) {
      return { status: 503, body: { ok: false, error: "Leaderboard season changed — try again later." },
        log: `no expansion board for ${validated.proof.contentRevision}` };
    }
    const profile = await deps.profile(userId);
    if (profile.error) return { status: 500, body: { ok: false, error: "Could not load your profile." } };
    if (!profile.handle) return { status: 409, body: { ok: false, error: "Choose a handle before submitting." } };
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(validated.proof)));
    const proofHash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    const meta = expansionMeta({ contentRevision: validated.proof.contentRevision, level: validated.proof.level,
      seed: validated.proof.seed, commandCount: validated.proof.commands.length, rating: validated.rating });
    const raw = await deps.submit(submitArgs({ userId, board, entryKey: levelEntryKey(validated.proof.level),
      score: validated.score, proofHash, achievedAt: new Date(), meta }));
    if (raw === null) return { status: 500, body: { ok: false, error: "Could not save score." } };
    const outcome = submitOutcome(raw, board);
    if (outcome.kind === "rejected") return { status: outcome.status, body: { ok: false, error: outcome.error }, log: outcome.log };
    const placement = await deps.placement(validated.proof.level);
    return { status: 200, body: expansionReply({ outcome, placement, runScore: validated.score, rating: validated.rating,
      handle: profile.handle, category: validated.category, contentRevision: validated.proof.contentRevision, level: validated.proof.level }) };
  } catch { return { status: 500, body: { ok: false, error: "Could not save score. Retry when online." } }; }
}
```

- [ ] **Step 6: Wire it in `supabase/functions/submit-gridwatch-score/index.ts`.** Four edits:

(a) After `import { readReplayBody } from "./requestBody.ts";` add:

```ts
import { createBoardIdCache, readExpansionPlacement, type Rpc } from "./scorePlacement.ts";
```

(b) After `const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;` add:

```ts

// Board ids from list_boards, cached per isolate once found (never on failure).
const boardIds = createBoardIdCache();
```

(c) Directly after the `if (authError || !user) { … 401 … }` block add:

```ts
  // Read-back after a write runs as the player, so is_you / get_my_standing resolve to them.
  const userRpc: Rpc = (fn, args) => userClient.rpc(fn, args);
```

(d) Replace the whole expansion block (from `// A separate frozen r4 validator/category path.` through its closing `}`) with:

```ts
  // A separate frozen r4 validator and board. Always return here: expansion must
  // never write the campaign board below.
  if (payload.ruleset === EXPANSION_RULESET_ID) {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const result = await handleExpansionScore(payload, user.id, {
      profile: async (userId) => {
        const { data, error } = await admin.from("profiles").select("handle").eq("user_id", userId).maybeSingle();
        return { handle: data?.handle ?? null, error: Boolean(error) };
      },
      submit: async (args) => {
        const { data, error } = await admin.rpc("submit_score", args);
        if (error) console.error("[score] submit_score call failed:", error);
        return error ? null : data;
      },
      placement: (level) => readExpansionPlacement(userRpc, boardIds, level),
    });
    if (result.log) console.error(`[score] ${result.log}`);
    return json(result.body, result.status, origin);
  }
```

- [ ] **Step 7: Run the tests, the type checks and the Deno check**

Run: `npm run verify:expansion-score-http && npm run verify:expansion-leaderboard && npm run typecheck:tools && deno check --node-modules-dir=none --no-lock supabase/functions/submit-gridwatch-score/index.ts`
Expected: the two pass lines (`Expansion HTTP: … passed.`, `Expansion leaderboard: … passed.`), a silent `tsc`, and `deno check` exit 0 (it prints `Check supabase/functions/submit-gridwatch-score/index.ts` on a cold cache). `git status --short` shows no `deno.lock`.

- [ ] **Step 8: Run the CI set.** Expected: 44 steps, `CI SET GREEN`.

- [ ] **Step 9: Commit**

```bash
git add scripts/score-http-harness.mjs scripts/verify-expansion-score-http.mjs scripts/verify-expansion-leaderboard.ts supabase/functions/submit-gridwatch-score/expansionScoreHandler.ts supabase/functions/submit-gridwatch-score/index.ts
git commit -m "feat(score): expansion wins write expansion/r4 through submit_score

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: V2 path writes one `submit_score` (campaign / r2); legacy writes removed

**Files:**
- Modify: `supabase/functions/submit-gridwatch-score/index.ts` (whole file)
- Create: `scripts/verify-campaign-score-http.mjs`
- Modify: `scripts/verify-expansion-score-http.mjs` (the original-run assertions), `package.json`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes (Tasks 1–3): `CAMPAIGN_BOARD`, `campaignMeta`, `notRecordedReply`, `sectorEntryKey`, `submitArgs`, `submitOutcome` from `./scoreBoard.ts`; `campaignReply`, `createBoardIdCache`, `readCampaignPlacement`, `readExpansionPlacement`, `type Rpc` from `./scorePlacement.ts`; `handleExpansionScore` (Task 3); the harness (Task 3).
- Produces — the HTTP contract of `POST /functions/v1/submit-gridwatch-score` for V2 payloads `{ruleset, seed, sector, commands}`:
  - cleared sector → `200 {ok: true, improved, runScore, bestScore: number|null, campaignScore: number|null, ruleset, rating, globalRank: number|null, sectorRank: number|null, handle}`
  - lost run → `200 {ok: false, recorded: false, reason: "not-cleared", runScore, rating, error}`; legacy ruleset → `200 {ok: false, recorded: false, reason: "retired-ruleset", runScore: null, rating: null, error}`
  - `401` no/expired token, `400` bad payload, `413` body > 512 KiB, `422` replay rejection or `invalid_time`/`invalid_entry`/`score_out_of_range`, `409` no handle, `503` registry mismatch, `500` RPC failure / unexpected status, `405` non-POST, `204` preflight.

- [ ] **Step 1: Write the failing test** `scripts/verify-campaign-score-http.mjs`:

```js
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
```

- [ ] **Step 2: Update the expansion HTTP test's original-run check.** In `scripts/verify-expansion-score-http.mjs`, replace

```js
const legacyRecord = (input) => ({ data: [{ stored_score: input.p_score, improved: true, sector_rank: 1, global_rank: 1 }], error: null });
const harness = await loadScoreHandler(boardRpc({ record_score: legacyRecord }));
```

with

```js
const harness = await loadScoreHandler(boardRpc());
```

and replace

```js
const originalWrites = rpcCalls("record_score");
assert.equal(originalWrites[0].args.p_category, "phase4-v1:sector:1");
assert.equal(originalWrites[0].args.p_score, 514);
assert.equal(originalWrites.some((w) => w.args.p_category.startsWith("expansion")), false);
assert.equal(rpcCalls("submit_score").length, 1, "The original run never writes the expansion board.");
```

with

```js
const originalWrites = rpcCalls("submit_score").slice(1);
assert.equal(originalWrites.length, 1);
assert.equal(originalWrites[0].args.p_board_key, "campaign", "The original run never writes the expansion board.");
assert.deepEqual(originalWrites[0].args.p_entries, [{ key: "sector:1", score: 514 }]);
```

- [ ] **Step 3: Run both to verify they fail**

Run: `node scripts/verify-campaign-score-http.mjs; node scripts/verify-expansion-score-http.mjs`
Expected: both FAIL with `AssertionError … 500 !== 200` — the old V2 path still calls `record_score`, which the registry-shaped stub answers with an error, so the cleared-sector request returns 500.

- [ ] **Step 4: Replace `supabase/functions/submit-gridwatch-score/index.ts`** with:

```ts
// Server-side score validator for "GridWatch: Signal Breach".
//
// Anti-cheat: the game simulation is pure and deterministic, so this function
// REPLAYS the submitted run with the exact game code (bundled from src/sim) and
// stores the score IT computes. The number a client claims is never trusted.
//
// Identity: the caller must be signed in (Supabase Auth). The score is attributed
// to their user id and displayed under the handle from their profile.
//
// Storage: one service-role submit_score call per accepted run on the shared board
// registry (Nexus spec 2026-09-24 §2): cleared V2 sectors → campaign / r2 entry
// `sector:<n>`, expansion wins → expansion / r4 entry `level:<n>`. The database
// keeps each entry's best and sums the campaign total. Lost and legacy-ruleset runs
// are answered "not recorded" and write nothing.
//
// verify_jwt is intentionally false so this function can handle the CORS preflight
// itself; the user's token is validated manually below.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { replayRun, ReplayError, SIM_RULESET_ID } from "./sim.bundle.js";
import {
  EXPANSION_RULESET_ID,
  ReplayValidationError,
  assertNoExpansionReplayIdentity,
  canonicalizeCommands,
  resolveRuleset,
  type CanonicalCommand,
  type ResolvedRuleset,
} from "./replayValidation.ts";
import { handleExpansionScore } from "./expansionScoreHandler.ts";
import { readReplayBody } from "./requestBody.ts";
import {
  CAMPAIGN_BOARD,
  campaignMeta,
  notRecordedReply,
  sectorEntryKey,
  submitArgs,
  submitOutcome,
} from "./scoreBoard.ts";
import {
  campaignReply,
  createBoardIdCache,
  readCampaignPlacement,
  readExpansionPlacement,
  type Rpc,
} from "./scorePlacement.ts";

const MAX_COMMANDS = 5000;
const MAX_SCORE = 100000;
const VALID_SECTORS = new Set([1, 2, 3]);

const ALLOWED_ORIGINS = new Set([
  "https://nexus.warsignallabs.net",
  "https://GridWatch-SignalBreach.warsignallabs.net",
  "https://gridwatch-signalbreach.warsignallabs.net",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Board ids from list_boards, cached per isolate once found (never on failure).
const boardIds = createBoardIdCache();

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, 405, origin);
  }

  // Authenticate the caller. The browser sends the signed-in user's access token.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ ok: false, error: "Sign in to submit a score." }, 401, origin);
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return json({ ok: false, error: "Your session has expired — sign in again." }, 401, origin);
  }
  // Read-back after a write runs as the player, so is_you / get_my_standing resolve to them.
  const userRpc: Rpc = (fn, args) => userClient.rpc(fn, args);

  let payload: Record<string, unknown>;
  try {
    payload = await readReplayBody(req) as Record<string, unknown>;
  } catch (error) {
    const oversized = error instanceof Error && error.message === "Replay body too large.";
    return json({ ok: false, error: oversized ? "Replay body too large." : "Invalid JSON body." }, oversized ? 413 : 400, origin);
  }

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return json({ ok: false, error: "Invalid replay payload." }, 400, origin);
  }

  // A separate frozen r4 validator and board. Always return here: expansion must
  // never write the campaign board below.
  if (payload.ruleset === EXPANSION_RULESET_ID) {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const result = await handleExpansionScore(payload, user.id, {
      profile: async (userId) => {
        const { data, error } = await admin.from("profiles").select("handle").eq("user_id", userId).maybeSingle();
        return { handle: data?.handle ?? null, error: Boolean(error) };
      },
      submit: async (args) => {
        const { data, error } = await admin.rpc("submit_score", args);
        if (error) console.error("[score] submit_score call failed:", error);
        return error ? null : data;
      },
      placement: (level) => readExpansionPlacement(userRpc, boardIds, level),
    });
    if (result.log) console.error(`[score] ${result.log}`);
    return json(result.body, result.status, origin);
  }

  const seed = payload.seed;
  const sector = payload.sector;
  const commands = payload.commands;

  if (typeof seed !== "string" || seed.length === 0 || seed.length > 200) {
    return json({ ok: false, error: "Invalid seed." }, 400, origin);
  }
  if (typeof sector !== "number" || !VALID_SECTORS.has(sector)) {
    return json({ ok: false, error: "Invalid sector." }, 400, origin);
  }
  let ruleset: ResolvedRuleset;
  let canonicalCommands: CanonicalCommand[];
  try {
    ruleset = resolveRuleset(payload.ruleset, SIM_RULESET_ID);
    assertNoExpansionReplayIdentity(payload);
    canonicalCommands = canonicalizeCommands(commands, MAX_COMMANDS);
  } catch (err) {
    if (err instanceof ReplayValidationError) {
      return json({ ok: false, error: err.message }, 400, origin);
    }
    return json({ ok: false, error: "Invalid replay payload." }, 400, origin);
  }

  // Pre-phase-4 (legacy-v1) runs belong to no board: the campaign board is r2 and scores
  // only current-ruleset clears. Answer before replaying anything; nothing is written.
  if (ruleset.legacy) {
    return json(notRecordedReply("retired-ruleset", null, null), 200, origin);
  }

  let score: number;
  let rating: string;
  let phase: string;
  try {
    const result = replayRun({ seed, sector, commands: canonicalCommands });
    score = result.score.total;
    rating = result.score.rating;
    phase = result.state.phase;
  } catch (err) {
    if (err instanceof ReplayError) {
      return json({ ok: false, error: `Rejected: ${err.message}` }, 422, origin);
    }
    return json({ ok: false, error: "Replay failed." }, 422, origin);
  }

  if (phase !== "won" && phase !== "lost") {
    return json({ ok: false, error: "Run did not reach a finished state." }, 422, origin);
  }
  if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
    return json({ ok: false, error: "Score out of bounds." }, 422, origin);
  }
  // The campaign board counts cleared sectors only (spec §5): a lost run is not recorded.
  if (phase === "lost") {
    return json(notRecordedReply("not-cleared", score, rating), 200, origin);
  }

  const proof = { ruleset: ruleset.id, seed, sector, commands: canonicalCommands };
  const proofHash = await sha256Hex(JSON.stringify(proof));

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // The player must have chosen a handle (display name) before submitting.
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("handle")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError) {
    return json({ ok: false, error: "Could not load your profile." }, 500, origin);
  }
  if (!profile?.handle) {
    return json({ ok: false, error: "Choose a handle before submitting." }, 409, origin);
  }

  // One write: the database keeps the sector best improve-only and re-sums the campaign
  // total for `all` and the ISO week of achieved_at.
  const { data: submitted, error: submitError } = await admin.rpc("submit_score", submitArgs({
    userId: user.id,
    board: CAMPAIGN_BOARD,
    entryKey: sectorEntryKey(sector),
    score,
    proofHash,
    achievedAt: new Date(),
    meta: campaignMeta({ ruleset: ruleset.id, sector, seed, commandCount: canonicalCommands.length, rating }),
  }));
  if (submitError) {
    console.error("[score] submit_score call failed:", submitError);
    return json({ ok: false, error: "Could not save score." }, 500, origin);
  }
  const outcome = submitOutcome(submitted, CAMPAIGN_BOARD);
  if (outcome.kind === "rejected") {
    if (outcome.log) console.error(`[score] ${outcome.log}`);
    return json({ ok: false, error: outcome.error }, outcome.status, origin);
  }

  const placement = await readCampaignPlacement(userRpc, boardIds, sector);
  return json(
    campaignReply({ outcome, placement, runScore: score, ruleset: ruleset.id, rating, handle: profile.handle }),
    200,
    origin,
  );
});
```

The proof object for current-ruleset runs is unchanged (`{ruleset, seed, sector, commands}`), so the proof hash of a given run is the same as before. `replayValidation.ts` is untouched (`categoryForRuleset` and `LEGACY_RULESET_ID` stay exported; `verify-replays.ts` still covers them).

- [ ] **Step 5: Register the script.** In `package.json`, directly after the `"verify:score-placement"` line add:

```json
    "verify:campaign-score-http": "node scripts/verify-campaign-score-http.mjs",
```

In `.github/workflows/ci.yml`, directly after `          npm run verify:score-placement` add:

```yaml
          npm run verify:campaign-score-http
```

- [ ] **Step 6: Run the tests, the Deno check and the removal grep**

Run:

```sh
npm run verify:campaign-score-http && npm run verify:expansion-score-http && npm run verify:expansion-leaderboard \
  && deno check --node-modules-dir=none --no-lock supabase/functions/submit-gridwatch-score/index.ts \
  && ! grep -nE 'record_score|from\("scores"\)|from\("games"\)|raw\.githubusercontent|hub-alignment|dailyCategory|weeklyCategory' supabase/functions/submit-gridwatch-score/*.ts \
  && echo "NO LEGACY WRITES"
```

Expected: `Campaign HTTP: … passed.`, `Expansion HTTP: … passed.`, `Expansion leaderboard: … passed.`, `deno check` exit 0, then `NO LEGACY WRITES`.

- [ ] **Step 7: Run the CI set.** Expected: 45 steps, `CI SET GREEN` (the bundle diff proves `sim.bundle.js` and `expansion-r4.bundle.js` are byte-identical).

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/submit-gridwatch-score/index.ts scripts/verify-campaign-score-http.mjs scripts/verify-expansion-score-http.mjs package.json .github/workflows/ci.yml
git commit -m "feat(score): cleared sectors write campaign/r2 through submit_score; drop record_score and hub alignment

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: In-game reads from the board registry

**Files:**
- Create: `src/leaderboard/boardReads.ts`
- Create: `scripts/verify-board-reads.ts`
- Modify: `src/leaderboard/api.ts` (imports, remove `authHeaders`, replace `fetchLeaderboard`)
- Modify: `src/leaderboard/expansionScoreApi.ts` (imports, `read`)
- Modify: `src/ui/screens.ts` (the ALL tab label)
- Modify: `scripts/verify-expansion-score-client.ts` (fake fetch + read assertions), `package.json`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `type FetchLeaderboardResult`, `type LeaderboardEntry` from `src/leaderboard/api.ts` (type-only); `leaderboardConfig` from `src/leaderboard/config.ts`. The test compares against `CAMPAIGN_BOARD` / `EXPANSION_BOARD` from Task 1.
- Produces (exported from `src/leaderboard/boardReads.ts`):
  - `type BoardRef`; `CAMPAIGN_BOARD = {key: "campaign", ruleset: "r2"}`; `EXPANSION_BOARD = {key: "expansion", ruleset: "r4"}`; `BOARD_READ_LIMIT = 20`
  - `type BoardReaderConfig = Readonly<{enabled: boolean; url: string; anonKey: string; gameSlug: string}>`
  - `createBoardReader(config, request?: typeof fetch): { campaign(): Promise<FetchLeaderboardResult>; campaignSector(sector: number): Promise<FetchLeaderboardResult>; expansionLevel(level: number): Promise<FetchLeaderboardResult> }`
  - `fetchLeaderboard(sector: number | null)` keeps its signature (null → campaign board).

- [ ] **Step 1: Write the failing test** `scripts/verify-board-reads.ts`:

```ts
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
```

- [ ] **Step 2: Update the expansion client test.** In `scripts/verify-expansion-score-client.ts`, replace

```ts
let requests = 0;
let response: unknown = success;
const fakeFetch: typeof fetch = async (url, init) => {
  requests++;
  assert.equal(new URL(String(url)).origin, config.url);
  assert.equal(init?.method, "POST");
  const body = JSON.parse(String(init?.body));
  if (String(url).includes("/functions/")) {
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer isolated-token");
    assert.deepEqual(body, proof);
    assert.equal("score" in body, false);
  } else assert.deepEqual(body, { p_game: config.gameSlug, p_category: expansionScoreCategory(proof.level) });
  return Response.json(response);
};
```

with

```ts
const REGISTRY = [{ id: "00000000-0000-4000-8000-0000000000e4", game_slug: "gridwatch-signal-breach", key: "expansion", ruleset: "r4", status: "active" }];
let requests = 0;
let response: unknown = success;
const fakeFetch: typeof fetch = async (url, init) => {
  requests++;
  assert.equal(new URL(String(url)).origin, config.url);
  assert.equal(init?.method, "POST");
  const body = JSON.parse(String(init?.body));
  if (String(url).includes("/functions/")) {
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer isolated-token");
    assert.deepEqual(body, proof);
    assert.equal("score" in body, false);
  } else if (String(url).endsWith("/rest/v1/rpc/list_boards")) {
    assert.deepEqual(body, { p_game_slug: config.gameSlug });
    return Response.json(REGISTRY);
  } else {
    assert.equal(String(url), `${config.url}/rest/v1/rpc/get_board_entry`);
    assert.deepEqual(body, { p_board_id: REGISTRY[0]!.id, p_period_key: "all", p_entry_key: `level:${proof.level}`, p_limit: 20 });
  }
  return Response.json(response);
};
```

and replace

```ts
response = [{ rank: 1, handle: "<not-html>", score: 100 }];
assert.equal((await api.read(proof.level)).ok, true);
response = [{ rank: 0, handle: "x", score: 100 }];
assert.equal((await api.read(proof.level)).ok, false);
```

with

```ts
response = [{ rank: 1, display_name: "<not-html>", score: 100, achieved_at: "2026-09-25T12:00:00Z", is_you: false }];
const read = await api.read(proof.level);
assert.equal(read.ok && read.entries[0]!.handle, "<not-html>", "display_name maps onto the row handle.");
response = [{ rank: 0, display_name: "x", score: 100 }];
assert.equal((await api.read(proof.level)).ok, false);
```

- [ ] **Step 3: Run both to verify they fail**

Run: `node scripts/run-typescript.mjs scripts/verify-board-reads.ts; node scripts/run-typescript.mjs scripts/verify-expansion-score-client.ts`
Expected: FAIL — `Could not resolve "../src/leaderboard/boardReads"`, and the client test fails its first `read` with `display_name maps onto the row handle.: expected <not-html>, got false` (the old reader posts to `rpc/get_leaderboard`, which the new fake rejects).

- [ ] **Step 4: Write `src/leaderboard/boardReads.ts`**

```ts
import type { FetchLeaderboardResult, LeaderboardEntry } from "./api";

/* In-game reads of the shared board registry (Nexus spec 2026-09-24 §3). Board ids come
   from list_boards and are pinned by key + ruleset — the same boards
   supabase/functions/submit-gridwatch-score/scoreBoard.ts writes. Reads use the public anon
   key (is_you is therefore never set; the in-game tables have no "you" slot). */
export type BoardRef = Readonly<{ key: string; ruleset: string }>;
export const CAMPAIGN_BOARD: BoardRef = { key: "campaign", ruleset: "r2" };
export const EXPANSION_BOARD: BoardRef = { key: "expansion", ruleset: "r4" };

// Top 20, matching the in-game tables (the RPCs clamp p_limit to [1, 100]).
export const BOARD_READ_LIMIT = 20;
const REQUEST_TIMEOUT_MS = 10_000;

export type BoardReaderConfig = Readonly<{ enabled: boolean; url: string; anonKey: string; gameSlug: string }>;

export type BoardReader = Readonly<{
  campaign(): Promise<FetchLeaderboardResult>;
  campaignSector(sector: number): Promise<FetchLeaderboardResult>;
  expansionLevel(level: number): Promise<FetchLeaderboardResult>;
}>;

export function createBoardReader(config: BoardReaderConfig, request: typeof fetch = fetch): BoardReader {
  let ids: ReadonlyMap<string, string> | null = null;
  const refKey = (board: BoardRef) => `${board.key}/${board.ruleset}`;

  async function rpc(fn: string, body: Record<string, unknown>): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await request(`${config.url}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: config.anonKey, Authorization: `Bearer ${config.anonKey}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`${fn} failed (${response.status}).`);
      // Inside the deadline: a stalled body aborts too.
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  // Cached only once the wanted board is found; a failed or incomplete registry read is retried.
  async function boardId(board: BoardRef): Promise<string | null> {
    const cached = ids?.get(refKey(board));
    if (cached) return cached;
    const rows = await rpc("list_boards", { p_game_slug: config.gameSlug });
    if (!Array.isArray(rows)) return null;
    const found = new Map<string, string>();
    for (const row of rows) {
      if (isRecord(row) && row.game_slug === config.gameSlug && typeof row.id === "string"
        && typeof row.key === "string" && typeof row.ruleset === "string") {
        found.set(`${row.key}/${row.ruleset}`, row.id);
      }
    }
    const id = found.get(refKey(board)) ?? null;
    if (id) ids = found;
    return id;
  }

  async function read(board: BoardRef, fn: "get_board" | "get_board_entry", args: Record<string, unknown>, scoreField: "total" | "score"): Promise<FetchLeaderboardResult> {
    if (!config.enabled) return { ok: false, error: "Leaderboard is offline." };
    try {
      const id = await boardId(board);
      if (!id) return { ok: false, error: "Rankings could not be loaded. Retry when online." };
      const data = await rpc(fn, { p_board_id: id, p_period_key: "all", ...args, p_limit: BOARD_READ_LIMIT });
      const entries = toEntries(data, scoreField);
      return entries ? { ok: true, entries } : { ok: false, error: "Invalid leaderboard response." };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof DOMException && error.name === "AbortError"
          ? "Leaderboard request timed out."
          : "Rankings could not be loaded. Retry when online.",
      };
    }
  }

  return {
    campaign: () => read(CAMPAIGN_BOARD, "get_board", {}, "total"),
    campaignSector: (sector) => read(CAMPAIGN_BOARD, "get_board_entry", { p_entry_key: `sector:${sector}` }, "score"),
    expansionLevel: (level) => read(EXPANSION_BOARD, "get_board_entry", { p_entry_key: `level:${level}` }, "score"),
  };
}

// Maps registry rows onto the in-game row shape; rejects the whole response if any row is
// malformed (the same guard the expansion reader always had).
function toEntries(data: unknown, scoreField: "total" | "score"): LeaderboardEntry[] | null {
  if (!Array.isArray(data) || data.length > BOARD_READ_LIMIT) return null;
  const entries: LeaderboardEntry[] = [];
  for (const row of data) {
    if (!isRecord(row)) return null;
    const rank = row.rank;
    const score = row[scoreField];
    const at = scoreField === "total" ? row.updated_at : row.achieved_at;
    if (typeof row.display_name !== "string" || typeof rank !== "number" || !Number.isSafeInteger(rank) || rank < 1
      || typeof score !== "number" || !Number.isSafeInteger(score) || score < 0) return null;
    entries.push({ rank, handle: row.display_name, score, rating: null, metadata: {}, created_at: typeof at === "string" ? at : "" });
  }
  return entries;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
```

- [ ] **Step 5: Point `src/leaderboard/api.ts` at it.** Replace the first two import lines

```ts
import { SIM_RULESET_ID, type RecordedCommand } from "../sim";
import { leaderboardConfig } from "./config";
```

with

```ts
import type { RecordedCommand } from "../sim";
import { createBoardReader } from "./boardReads";
import { leaderboardConfig } from "./config";
```

Delete the whole `function authHeaders(): Record<string, string> { … }` function (it has no other caller). Replace everything from the comment `// Reads the Top 20 for this immutable ruleset.` to the end of the file (the old `fetchLeaderboard`) with:

```ts
// Reads the Top 20 from the shared board registry: `sector` null is the campaign board
// (each player's sum of cleared-sector bests), otherwise that sector's entry ranking on the
// same board (cleared runs only).
const boards = createBoardReader(leaderboardConfig);

export function fetchLeaderboard(sector: number | null): Promise<FetchLeaderboardResult> {
  return sector === null ? boards.campaign() : boards.campaignSector(sector);
}
```

- [ ] **Step 6: Point the expansion reader at it.** In `src/leaderboard/expansionScoreApi.ts`, replace

```ts
import type { FetchLeaderboardResult, LeaderboardEntry } from "./api";
```

with

```ts
import type { FetchLeaderboardResult } from "./api";
import { createBoardReader } from "./boardReads";
```

Directly after the line `export function createExpansionScoreApi(config: { enabled: boolean; url: string; anonKey: string; gameSlug: string }, request: typeof fetch = fetch) {` add:

```ts
  const boards = createBoardReader(config, request);
```

and replace the whole `async read(level: number): Promise<FetchLeaderboardResult> { … },` member with:

```ts
    // Level ranking on the expansion / r4 board (entry `level:<n>`).
    async read(level: number): Promise<FetchLeaderboardResult> {
      if (!config.enabled) return { ok: false, error: "Expansion leaderboard is disabled in this build." };
      try { expansionScoreCategory(level); } catch { return { ok: false, error: "Rankings unavailable. Check your connection and retry." }; }
      return boards.expansionLevel(level);
    },
```

- [ ] **Step 7: Relabel the tab.** In `src/ui/screens.ts`, in `LEADERBOARD_FILTERS`, replace `  { label: "ALL", value: null },` with `  { label: "CAMPAIGN", value: null },` (same width as `SECTOR 1`; the rows are campaign totals now, and the ALL-tab sector label reads empty because campaign rows carry no `metadata.sector`).

- [ ] **Step 8: Register the script.** In `package.json`, directly after the `"verify:campaign-score-http"` line add:

```json
    "verify:board-reads": "node scripts/run-typescript.mjs scripts/verify-board-reads.ts",
```

In `.github/workflows/ci.yml`, directly after `          npm run verify:campaign-score-http` add:

```yaml
          npm run verify:board-reads
```

- [ ] **Step 9: Run the tests and the checks**

Run: `npm run verify:board-reads && npm run verify:expansion-score-client && npm run typecheck:tools && npm run build && ! grep -rn "get_leaderboard" src && echo "NO LEGACY READS"`
Expected: `Board reads: … passed.`, `Expansion score client: … passed.` (the stalled-body case waits its 10 s deadline), silent `tsc`, a clean Vite build, then `NO LEGACY READS`.

- [ ] **Step 10: Run the CI set.** Expected: 46 steps, `CI SET GREEN`.

- [ ] **Step 11: Commit**

```bash
git add src/leaderboard/boardReads.ts src/leaderboard/api.ts src/leaderboard/expansionScoreApi.ts src/ui/screens.ts scripts/verify-board-reads.ts scripts/verify-expansion-score-client.ts package.json .github/workflows/ci.yml
git commit -m "feat(leaderboard): in-game boards read campaign/r2 and expansion/r4 from the registry

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: V2 client renders the new submit results

**Files:**
- Create: `src/leaderboard/submitResultText.ts`
- Create: `scripts/verify-submit-result-text.ts`
- Modify: `src/leaderboard/api.ts` (`SubmitResult`)
- Modify: `src/ui/account.ts` (import + the SUBMIT handler)
- Modify: `src/main.ts` (import, `maybeAutoSubmitPendingRun` notice, `onSubmitScore` gate)
- Modify: `package.json`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes (Task 4): the V2 HTTP contract (nullable `bestScore` / `globalRank` / `sectorRank` / `campaignScore`; the not-recorded 200 body).
- Produces:
  - `SubmitResult` = `{ok: true; improved; runScore; bestScore: number | null; campaignScore: number | null; ruleset; rating; globalRank: number | null; sectorRank: number | null; handle}` | `{ok: false; recorded: false; reason: string; error: string}` | `{ok: false; error: string}`
  - `describeSubmitResult(result: SubmitResult, where: "panel" | "notice"): { text: string; kind: "success" | "info" | "error"; settled: boolean }`

- [ ] **Step 1: Write the failing test** `scripts/verify-submit-result-text.ts`:

```ts
import type { SubmitResult } from "../src/leaderboard/api";
import { describeSubmitResult } from "../src/leaderboard/submitResultText";
import assert from "./assert";

const base = { ok: true as const, runScore: 514, campaignScore: 1540, ruleset: "phase4-v1", rating: "Ghostline Architect", handle: "Tester" };
const improved: SubmitResult = { ...base, improved: true, bestScore: 514, globalRank: 2, sectorRank: 3 };
const stood: SubmitResult = { ...base, improved: false, runScore: 300, bestScore: 514, globalRank: 2, sectorRank: 3 };

// Full placement: the copy players already know, with the campaign rank labelled as such.
assert.deepEqual(describeSubmitResult(improved, "panel"), { text: "New best 514! Campaign #2 · Sector #3.", kind: "success", settled: true });
assert.deepEqual(describeSubmitResult(stood, "panel"), { text: "This run: 300. Your best 514 stands — Campaign #2 · Sector #3.", kind: "success", settled: true });
assert.equal(describeSubmitResult(improved, "notice").text, "Run logged — new best 514! Campaign #2 · Sector #3.");
assert.equal(describeSubmitResult(stood, "notice").text, "Run logged. Your best 514 stands — Campaign #2 · Sector #3.");

// Missing read-back never prints "null".
const blind: SubmitResult = { ...base, improved: true, bestScore: null, globalRank: null, sectorRank: null };
assert.equal(describeSubmitResult(blind, "panel").text, "New best 514!");
assert.equal(describeSubmitResult(blind, "notice").text, "Run logged — new best 514!");
const blindStood: SubmitResult = { ...base, improved: false, runScore: 300, bestScore: null, globalRank: 4, sectorRank: null };
assert.equal(describeSubmitResult(blindStood, "panel").text, "This run: 300. Your best stands — Campaign #4.");
for (const result of [blind, blindStood]) {
  for (const where of ["panel", "notice"] as const) assert.equal(describeSubmitResult(result, where).text.includes("null"), false);
}

// Not recorded (lost / retired rules): information, settled — no retry offered.
const notCleared: SubmitResult = { ok: false, recorded: false, reason: "not-cleared", error: "Not recorded — sector not cleared. Only cleared sectors count on the leaderboard." };
assert.deepEqual(describeSubmitResult(notCleared, "panel"), { text: notCleared.error, kind: "info", settled: true });
assert.equal(describeSubmitResult(notCleared, "notice").text, notCleared.error);

// Real failures stay errors and leave SUBMIT retryable.
const failed: SubmitResult = { ok: false, error: "Could not save score." };
assert.deepEqual(describeSubmitResult(failed, "panel"), { text: "Could not save score.", kind: "error", settled: false });
assert.equal(describeSubmitResult(failed, "notice").text, "Couldn't log your last run: Could not save score.");
console.log("Submit result text: campaign/sector placement copy, null-safe read-back, not-recorded info and retryable errors passed.");
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/run-typescript.mjs scripts/verify-submit-result-text.ts`
Expected: FAIL — `Could not resolve "../src/leaderboard/submitResultText"`.

- [ ] **Step 3: Widen `SubmitResult`.** In `src/leaderboard/api.ts`, replace the whole `export type SubmitResult = …;` declaration with:

```ts
export type SubmitResult =
  | Readonly<{
      ok: true;
      // True when this run beat the player's previous best for the sector.
      improved: boolean;
      // The score this run earned vs. the player's stored best for the sector.
      runScore: number;
      bestScore: number | null;
      // The player's campaign total (sum of cleared-sector bests).
      campaignScore: number | null;
      ruleset: string;
      rating: string;
      // Rank on the campaign board, and on this sector's entry ranking. Null when the
      // server could not read them back after a committed write.
      globalRank: number | null;
      sectorRank: number | null;
      // The handle the score is stored under (from the player's profile).
      handle: string;
    }>
  // A lost or retired-ruleset run: validated, deliberately not written (HTTP 200).
  | Readonly<{ ok: false; recorded: false; reason: string; error: string }>
  | Readonly<{ ok: false; error: string }>;
```

- [ ] **Step 4: Write `src/leaderboard/submitResultText.ts`**

```ts
import type { SubmitResult } from "./api";

/* Player-facing copy for a V2 submission result, shared by the game-over panel ("panel") and
   the post-sign-in leaderboard notice ("notice"). Ranks and bests can be null when the
   server's read-back after a committed write failed or the player sits outside the top 100:
   the copy leaves them out instead of printing "#null". `settled` means the run needs no
   further action (logged, or deliberately not recorded) — the SUBMIT button stays done. */
export type SubmitResultText = Readonly<{ text: string; kind: "success" | "info" | "error"; settled: boolean }>;

export function describeSubmitResult(result: SubmitResult, where: "panel" | "notice"): SubmitResultText {
  if (!result.ok) {
    if ("recorded" in result && result.recorded === false) return { text: result.error, kind: "info", settled: true };
    return { text: where === "notice" ? `Couldn't log your last run: ${result.error}` : result.error, kind: "error", settled: false };
  }
  const ranks = [
    result.globalRank != null ? `Campaign #${result.globalRank}` : null,
    result.sectorRank != null ? `Sector #${result.sectorRank}` : null,
  ].filter((part): part is string => part !== null).join(" · ");
  const best = result.bestScore ?? (result.improved ? result.runScore : null);
  let text: string;
  if (result.improved) {
    const head = where === "notice" ? `Run logged — new best ${best}!` : `New best ${best}!`;
    text = ranks ? `${head} ${ranks}.` : head;
  } else {
    const stands = best !== null ? `Your best ${best} stands` : "Your best stands";
    const head = where === "notice" ? `Run logged. ${stands}` : `This run: ${result.runScore}. ${stands}`;
    text = ranks ? `${head} — ${ranks}.` : `${head}.`;
  }
  return { text, kind: "success", settled: true };
}
```

- [ ] **Step 5: Use it in the game-over panel.** In `src/ui/account.ts`, after `import type { SubmitResult } from "../leaderboard/api";` add:

```ts
import { describeSubmitResult } from "../leaderboard/submitResultText";
```

and in `renderReady`'s SUBMIT handler replace

```ts
        const result = await onSubmit();
        if (result.ok) {
          submitted = true;
          const placement = `Global #${result.globalRank} · Sector #${result.sectorRank}`;
          setStatus(
            result.improved
              ? `New best ${result.bestScore}! ${placement}.`
              : `This run: ${result.runScore}. Your best ${result.bestScore} stands — ${placement}.`,
            "success",
          );
          render();
        } else {
          submit.disabled = false;
          setStatus(result.error, "error");
        }
```

with

```ts
        const result = await onSubmit();
        const outcome = describeSubmitResult(result, "panel");
        if (outcome.settled) {
          submitted = true;
          setStatus(outcome.text, outcome.kind);
          render();
        } else {
          submit.disabled = false;
          setStatus(outcome.text, outcome.kind);
        }
```

- [ ] **Step 6: Use it in `src/main.ts`, and stop offering submission on a lost run.** After `import { submitScore } from "./leaderboard/api";` add:

```ts
import { describeSubmitResult } from "./leaderboard/submitResultText";
```

In `maybeAutoSubmitPendingRun`, replace

```ts
  leaderboardNotice = result.ok
    ? result.improved
      ? `Run logged — new best ${result.bestScore}! Global #${result.globalRank} · Sector #${result.sectorRank}.`
      : `Run logged. Your best ${result.bestScore} stands — Global #${result.globalRank} · Sector #${result.sectorRank}.`
    : `Couldn't log your last run: ${result.error}`;
```

with

```ts
  leaderboardNotice = describeSubmitResult(result, "notice").text;
```

In the `renderOverlay({ … })` call, replace

```ts
      onSubmitScore: leaderboardConfig.enabled
        ? () =>
```

with

```ts
      // Only cleared sectors count on the campaign board, so a lost run offers no submission.
      onSubmitScore: leaderboardConfig.enabled && state.phase === "won"
        ? () =>
```

(`renderOverlay` already hides the submit section when `onSubmitScore` is null, and the overlay key includes the phase, so the won/lost panels never share state.)

- [ ] **Step 7: Register the script.** In `package.json`, directly after the `"verify:board-reads"` line add:

```json
    "verify:submit-result-text": "node scripts/run-typescript.mjs scripts/verify-submit-result-text.ts",
```

In `.github/workflows/ci.yml`, directly after `          npm run verify:board-reads` add:

```yaml
          npm run verify:submit-result-text
```

- [ ] **Step 8: Run the test and the checks**

Run: `npm run verify:submit-result-text && npm run typecheck:tools && npm run build && ! grep -n "Global #" src/main.ts src/ui/account.ts && echo "COPY UPDATED"`
Expected: `Submit result text: … passed.`, silent `tsc`, clean build (the `tsc` inside `npm run build` proves `account.ts` / `main.ts` compile against the widened type), then `COPY UPDATED`.

- [ ] **Step 9: Run the CI set.** Expected: 47 steps, `CI SET GREEN`.

- [ ] **Step 10: Commit**

```bash
git add src/leaderboard/submitResultText.ts src/leaderboard/api.ts src/ui/account.ts src/main.ts scripts/verify-submit-result-text.ts package.json .github/workflows/ci.yml
git commit -m "feat(leaderboard): null-safe campaign placement copy; no submission on a lost run

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Expansion client accepts a committed score without read-back

**Files:**
- Modify: `src/leaderboard/expansionScoreApi.ts` (`ExpansionSubmitResult`, submit validation)
- Modify: `src/ui/expansionLeaderboardUi.ts` (confirmation message)
- Modify: `scripts/verify-expansion-score-client.ts`, `scripts/verify-expansion-score-ui.mjs`

**Interfaces:**
- Consumes (Task 3): the expansion 200 body with `bestScore: number | null`, `levelRank: number | null`.
- Produces: `ExpansionSubmitResult` success variant with `bestScore: number | null; levelRank: number | null`; confirmation copy `Verified <run> · Best <best> · Level rank #<rank>`, omitting a null best and showing `Level rank updating` for a null rank.

- [ ] **Step 1: Write the failing tests.** In `scripts/verify-expansion-score-client.ts`, directly after

```ts
response = { ...success, category: "phase4-v1:global" };
assert.equal((await api.submit(proof, "isolated-token")).ok, false);
```

add

```ts
response = { ...success, bestScore: null, levelRank: null };
assert.equal((await api.submit(proof, "isolated-token")).ok, true, "A committed score with no read-back is still a success.");
for (const bad of [{ bestScore: 99 }, { bestScore: -1 }, { levelRank: 0 }, { levelRank: "1" }, { bestScore: undefined }]) {
  response = { ...success, ...bad };
  assert.equal((await api.submit(proof, "isolated-token")).ok, false, `Rejects ${JSON.stringify(bad)}`);
}
```

In `scripts/verify-expansion-score-ui.mjs`, replace

```js
for (const result of [
  { ok: true, runScore: 123, bestScore: 456, levelRank: 2 },
  { ok: false, error: "Temporary score service failure. Retry this run." },
]) {
```

with

```js
for (const [result, expected] of [
  [{ ok: true, runScore: 123, bestScore: 456, levelRank: 2 }, /Verified 123 · Best 456 · Level rank #2/],
  [{ ok: true, runScore: 321, bestScore: null, levelRank: null }, /Verified 321 · Level rank updating/],
  [{ ok: false, error: "Temporary score service failure. Retry this run." }, /Temporary score service failure/],
]) {
```

and replace

```js
  const expected = result.ok ? /Verified 123 · Best 456 · Level rank #2/ : /Temporary score service failure/;
  assert.match(panel.element.textContent, expected, "Same-owner refresh must not discard a submission result.");
```

with

```js
  assert.match(panel.element.textContent, expected, "Same-owner refresh must not discard a submission result.");
  assert.doesNotMatch(panel.element.textContent, /null/, "Missing read-back is never printed as null.");
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node scripts/run-typescript.mjs scripts/verify-expansion-score-client.ts; node scripts/verify-expansion-score-ui.mjs`
Expected: both FAIL — `A committed score with no read-back is still a success.: expected true, got false`, and the UI test with `AssertionError … Same-owner refresh must not discard a submission result.` whose actual text starts `Verified 321 · Best null · Level rank #null`.

- [ ] **Step 3: Accept nulls in `src/leaderboard/expansionScoreApi.ts`.** Replace

```ts
export type ExpansionSubmitResult = { ok: false; error: string } | {
  ok: true; improved: boolean; runScore: number; bestScore: number; levelRank: number;
  rating: string; handle: string; category: string; level: number; contentRevision: string;
};
```

with

```ts
// bestScore / levelRank are null when the server's read-back after a committed write failed
// (or the player sits outside the level's top 100); the score itself was still logged.
export type ExpansionSubmitResult = { ok: false; error: string } | {
  ok: true; improved: boolean; runScore: number; bestScore: number | null; levelRank: number | null;
  rating: string; handle: string; category: string; level: number; contentRevision: string;
};
const count = (value: unknown, min: number): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= min;
```

and in `submit`, replace the two validation lines

```ts
          typeof data.runScore !== "number" || !Number.isSafeInteger(data.runScore) || data.runScore < 0 || typeof data.bestScore !== "number" || !Number.isSafeInteger(data.bestScore) || data.bestScore < data.runScore ||
          typeof data.levelRank !== "number" || !Number.isSafeInteger(data.levelRank) || data.levelRank < 1 || typeof data.improved !== "boolean" || typeof data.rating !== "string" || typeof data.handle !== "string") {
```

with

```ts
          !count(data.runScore, 0) || (data.bestScore !== null && (!count(data.bestScore, 0) || data.bestScore < data.runScore)) ||
          (data.levelRank !== null && !count(data.levelRank, 1)) || typeof data.improved !== "boolean" || typeof data.rating !== "string" || typeof data.handle !== "string") {
```

- [ ] **Step 4: Null-safe confirmation in `src/ui/expansionLeaderboardUi.ts`.** Replace

```ts
        message = result.ok ? `Verified ${result.runScore} · Best ${result.bestScore} · Level rank #${result.levelRank}` : result.error;
```

with

```ts
        message = result.ok ? verifiedMessage(result) : result.error;
```

and directly above `/** Nexus sign-in returns to the game root; offer an explicit pending submission. */` add:

```ts
// Null best/rank (read-back unavailable after a committed write) are left out, never "#null".
function verifiedMessage(result: { runScore: number; bestScore: number | null; levelRank: number | null }): string {
  return [
    `Verified ${result.runScore}`,
    result.bestScore !== null ? `Best ${result.bestScore}` : null,
    result.levelRank !== null ? `Level rank #${result.levelRank}` : "Level rank updating",
  ].filter((part) => part !== null).join(" · ");
}

```

- [ ] **Step 5: Run the tests and the checks**

Run: `npm run verify:expansion-score-client && npm run verify:expansion-score-ui && npm run typecheck:tools && npm run build`
Expected: `Expansion score client: … passed.`, `Expansion score UI: … passed.`, silent `tsc`, clean build.

- [ ] **Step 6: Run the CI set.** Expected: 47 steps, `CI SET GREEN`.

- [ ] **Step 7: Commit**

```bash
git add src/leaderboard/expansionScoreApi.ts src/ui/expansionLeaderboardUi.ts scripts/verify-expansion-score-client.ts scripts/verify-expansion-score-ui.mjs
git commit -m "feat(expansion): accept a logged score without read-back; never print null ranks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Full verification, local browser check, docs and the deploy procedure

**Files:**
- Modify: `HANDOFF.md` (new top entry), `AGENTS.md`, `SKILLS.md`, `README.md`, `docs/EXPANSION_LEADERBOARD_PACKAGE.md`

**Interfaces:**
- Consumes: Tasks 1–7 on the branch.
- Produces: docs only.

- [ ] **Step 1: Run the CI set, the Deno check and the static-site checks**

Run the CI set (Global Constraints) → 47 steps, `CI SET GREEN`. Then:

```sh
deno check --node-modules-dir=none --no-lock supabase/functions/submit-gridwatch-score/index.ts && echo DENO_OK
rg -n "fetch|XMLHttpRequest|process\\.env|import\\.meta\\.env" src index.html package.json vite.config.ts README.md .github | cut -d: -f1 | sort -u
find . -name '.env*' -not -path './node_modules/*' -print
```

Expected: `DENO_OK`; the `rg` file list is exactly `src/leaderboard/api.ts`, `src/leaderboard/boardReads.ts`, `src/leaderboard/expansionSaveApi.ts`, `src/leaderboard/expansionScoreApi.ts`, `src/ui/expansionLeaderboardUi.ts`, `src/ui/screens.ts`; `find` prints nothing. If Docker is running, also run the two DB fixture commands from the CI "Verify expansion save database isolation" step against the disposable container exactly as `ci.yml` does (never against GridWatchGamesDB); they exercise only the historical migrations this plan does not touch.

- [ ] **Step 2: Local browser check (read-only).** Start `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`, open `http://127.0.0.1:5173/play/breach/`, open LEADERBOARD from the title. At 1280×800 and at 375×812: the tabs read `CAMPAIGN · SECTOR 1 · SECTOR 2 · SECTOR 3` on one row with no horizontal overflow; each tab shows either rows or `No scores yet. Be the first to hold the grid.` (the live boards may be empty) and never `Rankings unavailable`; the Network panel shows `rpc/list_boards` once, then `rpc/get_board` / `rpc/get_board_entry`, and no `rpc/get_leaderboard`; the console has no errors. Open an expansion level's VIEW LEVEL RANKINGS: same rules. Do not submit a score (that would write production). Stop the dev server.

- [ ] **Step 3: HANDOFF entry.** Insert directly under the `# GridWatch Handoff` title (before `## PR #86 review follow-up — 2026-09-23`), filling `<N>` with the step count from Step 1:

```markdown
## Leaderboards phase 3 — Breach writes through the shared board registry (not deployed) — 2026-09-25

- **Plan / branch:** `docs/superpowers/plans/2026-09-25-breach-submit-score.md`, branch
  `feat/breach-submit-score`. Implements Nexus spec §6 phase 3, game 3 (gridwatch-command-nexus:
  `docs/superpowers/specs/2026-09-24-nexus-leaderboards-rebuild-design.md`). The database side is
  live (Nexus migrations `20260924131533_leaderboard_boards`, `20260924135833_submit_score_board_lock`);
  no migration in this repo.
- **Edge Function:** one service-role `submit_score` call per accepted run — cleared V2 sector →
  `gridwatch-signal-breach / campaign / r2`, entry `sector:<n>`; expansion win → `expansion / r4`,
  entry `level:<n>`. Request id = proof SHA-256, achieved_at = server time, meta =
  `{v, ruleset|contentRevision, sector|level, seed, commandCount, rating}` (full proof covered by
  the hash only). Every `record_score` call, the `sector-cleared:*` markers, the
  `standard`/`daily-*`/`weekly-*` hub-alignment block and all `public.scores` reads are gone.
  Replay anti-cheat unchanged; `sim.bundle.js` and `expansion-r4.bundle.js` byte-identical.
- **Not recorded:** lost V2 runs and legacy-ruleset runs get HTTP 200
  `{ok:false, recorded:false, reason, error}` and write nothing; the pinned legacy validator import
  is removed. The current client no longer offers submission on a lost run.
- **Responses:** every existing field kept. `duplicate` / `request_conflict` = already logged
  (`improved:false`). `campaignScore` = board total; `bestScore`, `sectorRank`, `levelRank`
  (`get_board_entry` is_you row) and `globalRank` (now the campaign-board rank, `get_my_standing`)
  are read back as the player, null if unavailable. HTTP: 422 invalid_time / invalid_entry /
  score_out_of_range, 400 invalid_request, 503 unknown_board / ruleset_mismatch (logged), 500
  other / RPC failure, 409 no handle.
- **In-game reads:** `list_boards` → `get_board(campaign,'all')` (tab renamed ALL → CAMPAIGN),
  `get_board_entry(campaign,'all','sector:n')`, `get_board_entry(expansion,'all','level:n')`.
  No `get_leaderboard` call remains. Placement copy says "Campaign #" (was "Global #").
- **Behaviour changes (spec §5):** per-sector rankings count cleared runs only; the headline is
  the sum of cleared-sector bests; no daily board (campaign has all-time + week).
- **Compat:** bundles cached before the deploy keep working. Two rare degraded cases, both
  after a committed write whose read-back failed or ranks the player outside the top 100: a
  cached V2 bundle prints `#null`; a cached expansion bundle says "Invalid score response"
  and keeps the run pending (a retry is answered as already logged).
- **Evidence:** CI set <N>/<N> `npm run` steps green, both bundles byte-identical, `deno check`
  clean, local browser check at 1280 and 375 px (read-only).

**Deploy — Russ-gated, and only after Match's phase-3 deploy is accepted.**
1. Merge nothing yet. Review and approve the PR; CI green.
2. **Edge Function first**, from the approved PR head (Cloudflare Pages deploys the client the
   moment the PR merges, so the function must go out before the merge): in a clean detached
   checkout of that commit run
   `deno check --node-modules-dir=none --no-lock supabase/functions/submit-gridwatch-score/index.ts`, then
   `supabase functions deploy submit-gridwatch-score --project-ref mggxfzzxrpjgpzhwiwqi --no-verify-jwt`.
   Record the new version (rollback = version 10, i.e. redeploy the function from `ff6238a`). No-write
   probes: `OPTIONS` with `Origin: https://nexus.warsignallabs.net` → 204 with that origin echoed;
   unauthenticated `POST` → 401. The old client keeps working against the new function.
3. **Then the static client:** merge the PR. Cloudflare Pages builds `main` and publishes
   `gridwatch-signal-breach.pages.dev`; players get it through `https://nexus.warsignallabs.net/play/breach/`.
   Confirm the Pages deployment succeeded and hard-refresh.
4. **Acceptance (Mac and iPhone, signed in):** clear one V2 sector → `New best <n>! Campaign #r · Sector #s.`;
   win one expansion level → `Verified <n> · Best <n> · Level rank #r`. On Nexus Leaderboards → Signal
   Breach: the Campaign board shows your row with the `is_you` highlight and `YOU // #n OF m ON THE GRID`,
   and the Expansion board (board picker) shows your level total the same way. In game, CAMPAIGN and the
   cleared SECTOR tab list you. A lost run shows no submit section. Supabase function logs show no
   `[score]` errors. Record pass/fail here. Then Zero.
5. **Rollback:** redeploy the function from `ff6238a` (writes `public.scores` again; the new client
   still renders its responses); roll Pages back to the previous production deployment in the
   Cloudflare dashboard if the client itself misbehaves.
```

- [ ] **Step 4: AGENTS.md.** At the end of the first paragraph of `## Project Scope` (after `The core simulation stays pure and deterministic.`) add a new paragraph:

```markdown
Scores are written ONLY by the `submit-gridwatch-score` Edge Function, as one
service-role `submit_score` call per accepted run on the shared board registry
(`gridwatch-signal-breach / campaign / r2` for cleared sectors, `expansion / r4`
for expansion wins). The client reads boards through `list_boards`, `get_board`
and `get_board_entry`. Never call `record_score`, `get_leaderboard` or read
`public.scores` (Nexus retires them in leaderboards phase 5).
```

Replace

```markdown
Expansion work must use a new immutable replay ruleset, campaign/level identity,
progress namespace, and isolated leaderboard categories. It must never overload
the existing `sector` identity, reuse `phase4-v1` score categories, rewrite or
delete historical leaderboard rows, or change behavior for `grid-drift` or
`gridwatch-match` in the shared GridWatchGamesDB.
```

with

```markdown
Expansion work must use a new immutable replay ruleset, campaign/level identity,
progress namespace, and its own leaderboard board (`expansion / r4`; a new content
revision needs a new board registered by a Nexus migration). It must never
overload the existing `sector` identity, write the campaign board, rewrite or
delete leaderboard rows, or change behavior for `grid-drift` or `gridwatch-match`
in the shared GridWatchGamesDB.
```

In `## Verification`, inside the `Expected:` sentence, replace

```markdown
the `rg` command matches only the sanctioned leaderboard path (`src/leaderboard/api.ts`, plus the `fetchLeaderboard` identifier in `src/ui/screens.ts` and bundled copies under `dist`)
```

with

```markdown
the `rg` command matches only the sanctioned leaderboard code (`src/leaderboard/api.ts`, `boardReads.ts`, `expansionScoreApi.ts`, `expansionSaveApi.ts`), the rankings-read identifiers in `src/ui/screens.ts` and `src/ui/expansionLeaderboardUi.ts`, and bundled copies under `dist`
```

- [ ] **Step 5: SKILLS.md.** Replace

```markdown
Current leaderboard package: run `verify:expansion-leaderboard`,
`verify:expansion-score-client`, `verify:expansion-score-http`,
`verify:expansion-score-ui` and disposable
PostgreSQL `scripts/verify-expansion-score-database.sql`. Never run that fixture
against GridWatchGamesDB.
```

with

```markdown
Current leaderboard package (shared board registry since 2026-09-25): run
`verify:score-board`, `verify:score-placement`, `verify:campaign-score-http`,
`verify:board-reads`, `verify:submit-result-text`, `verify:expansion-leaderboard`,
`verify:expansion-score-client`, `verify:expansion-score-http` and
`verify:expansion-score-ui`. Writes go through one `submit_score` call per run
(`campaign / r2`, `expansion / r4`); `record_score` is no longer called. Disposable
PostgreSQL `scripts/verify-expansion-score-database.sql` covers only the historical
`record_score` migrations. Never run that fixture against GridWatchGamesDB.
```

and after the bullet ending `be deployed in a
  version-compatible way with the Edge Function.` add:

```markdown
- A replay ruleset or expansion content revision change needs a NEW board
  (Nexus migration) plus the matching constants in
  `supabase/functions/submit-gridwatch-score/scoreBoard.ts` and
  `src/leaderboard/boardReads.ts`; until both agree `submit_score` answers
  `ruleset_mismatch` (HTTP 503).
```

- [ ] **Step 6: README.md.** In `## Leaderboard (high scores)`, replace the paragraph starting `A global + per-sector **Top 20** leaderboard` with:

```markdown
A campaign + per-sector **Top 20** leaderboard, backed by Supabase (`GridWatchGamesDB`,
a shared multi-game database) through the GridWatch board registry that Nexus also
reads. Players view rankings from the title or game-over screen. Submitting a score
requires signing in — sign-in starts on Nexus and returns you to the game; each
player picks a unique handle. Only **cleared** sectors count: the board keeps each
player's best per sector, and the campaign ranking is the sum of those bests.
```

replace the paragraph starting `**Identity & best-per-player.**` with:

```markdown
**Identity & best-per-player.** Auth is handled by the shared GridWatch account
kit via Supabase Auth on Nexus. A `profiles` row maps each user to their handle.
The Edge Function writes each accepted run with one service-role `submit_score`
call; the database keeps each player's best per entry (improve-only) and sums the
campaign total, so replaying a sector only ever improves your own score.
```

and in the paragraph starting `**Anti-cheat by replay.**` replace its last three sentences (from `Legacy clients remain on a pinned validator` to the end of the paragraph) with:

```markdown
Lost runs and runs from retired rulesets are answered "not recorded". The board
tables have no client grants; reads go through `list_boards` / `get_board` /
`get_board_entry`, writes through the function's service role only.
```

- [ ] **Step 7: docs/EXPANSION_LEADERBOARD_PACKAGE.md.** Replace

```markdown
- Category: `expansion-v1:expansion-1-r4:level:N`. Reads use that same exact
  category; submission exposes `levelRank`, never the generic RPC's global rank.
- The existing service-only `record_score` atomically keeps each user's best.
  Expansion makes one write and returns before original/hub/daily/weekly writes.
```

with

```markdown
- Board (since 2026-09-25): `gridwatch-signal-breach / expansion / r4`, entry
  `level:N`. Reads use `get_board_entry` on that board; submission exposes
  `levelRank` (the player's `is_you` row), never a campaign rank. The response
  still echoes the historical category string `expansion-v1:expansion-1-r4:level:N`
  because cached clients check it.
- One service-role `submit_score` call keeps each user's best per level. Expansion
  makes exactly that one write and never touches the campaign board.
```

- [ ] **Step 8: Check and commit**

Run: `git diff --check`
Expected: no output.

```bash
git add HANDOFF.md AGENTS.md SKILLS.md README.md docs/EXPANSION_LEADERBOARD_PACKAGE.md
git commit -m "docs(handoff): Breach phase 3 — submit-gridwatch-score through submit_score (not deployed)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Self-review (run while planning)

- **Spec coverage.** §2 write path: Tasks 1, 3, 4 (one call per run, `service_role` only, request id / proof hash / meta shape, status set mapped). §3 reads: Tasks 2 (read-back with `get_board_entry` / `get_my_standing`) and 5 (`list_boards`, `get_board`, `get_board_entry`). §5 Breach row + mapping bullet: campaign / r2 `sector:<n>` for won runs only, expansion / r4 `level:<n>` (Tasks 3–4, board constants tested against the registry patterns in Task 1). §6 phase 3: validator switch + in-game readers in one PR, docs recorded, deploy verified by a signed-in run on Mac and iPhone (Task 8). §8 "validator unit tests for the submit_score mapping and error-status handling": `verify-score-board.ts`, `verify-campaign-score-http.mjs`, `verify-expansion-leaderboard.ts`. No gaps found.
- **Placeholder scan.** The only fill-ins are measured values (`<N>` steps, deploy version) in the HANDOFF text, which the executor records from Step 1 / the deploy.
- **Type consistency.** `BoardRef`, `CAMPAIGN_BOARD`, `EXPANSION_BOARD`, `SubmitScoreArgs`, `SubmitOutcome`, `Rpc`, `BoardIdCache`, `CampaignPlacement`, `ExpansionPlacement`, `ExpansionScoreDependencies.submit/placement`, `SubmitResult`, `ExpansionSubmitResult` and `describeSubmitResult` use the same names and shapes in every task that mentions them; the client board constants are asserted equal to the server ones (Task 5).
- **Dry run.** Every code block above was applied to an isolated copy of `origin/main` (`ff6238a`) while planning. Each task's new tests were run against the pre-task code and failed with the messages quoted in its "verify it fails" step, then passed after the task's implementation. `deno check` passed after Tasks 3 and 4, and the full CI set reported 47 `npm run` steps and `CI SET GREEN` with both bundles byte-identical. The docs edits (Task 8) and the browser check were not dry-run.

## Planner notes for controller

1. **Ruling 1 — "200 with an honest not-recorded shape".** Implemented as HTTP 200 with `ok: false, recorded: false`. An `ok: true` body cannot be honest for cached V2 bundles: they would print "Run logged … Global #null". With `ok: false` they show the error text verbatim (styled as an error, SUBMIT re-enabled). The current client shows it as information. If the controller meant `ok: true`, say so; it is a one-function change.
2. **Ruling 4 vs cached expansion bundles.** "Null when not found" conflicts with the expansion client's strict response check in bundles cached before the deploy: they reject `levelRank: null` (and a null `bestScore`) as "Invalid score response. Your pending run was retained." This happens only when the read-back fails or the player ranks outside a level's top 100. The server narrows it (an improving run's `bestScore` is its own score), the retry is answered as already logged, and the current client (Task 7) accepts nulls. The alternative, a fabricated rank, would break the honest-states rule, so I kept nulls.
3. **Deploy order vs Cloudflare Pages.** The static client auto-deploys when the PR merges to `main`. "Edge function first" therefore means deploying the function from the approved PR head **before** merging, as `docs/PHASE4_PROMOTION_RUNBOOK.md` already does ("Deploy exactly these files from the reviewed PR head"). Both directions are compatible (old client + new function, new client + old function), so a mistake here causes a short consistency gap, not an outage.
4. **Beyond the literal rulings.** (a) The pinned legacy validator import (raw GitHub URL) is removed, because legacy runs are answered before replay. (b) The current client stops offering submission on lost runs, using the overlay's existing null path. (c) The copy changes "Global #" to "Campaign #" and the tab label ALL to CAMPAIGN. Each is small and reversible; veto any of them before execution if you want.
5. **Could not verify.** The live registry rows (I relied on the migration source and the controller's statement that the boards are seeded). The Cloudflare Pages project settings (taken from `README.md` / `CONTEXT.md` and Nexus `worker/playProxy.ts`). That Nexus renders the Breach Expansion board through its board picker. That `supabase functions deploy` bundles the new `.ts` siblings (deno check resolves them; the deploy itself is Russ-gated).
