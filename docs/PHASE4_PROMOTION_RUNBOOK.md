# Phase 4 Server-First Promotion Runbook

Status: prepared, not executed. This runbook does not authorize production
changes. Apply it only after the owner explicitly approves the maintenance
window and the controlled leaderboard writes.

## Scope and invariants

This promotes the frozen `phase4-v1` replay boundary for GridWatch: Signal
Breach without rewriting historical scores:

1. apply one additive migration;
2. deploy one backward-compatible Edge Function;
3. prove one omitted-ruleset legacy replay and one explicit `phase4-v1` replay;
4. merge the Pages client only after both paths and their rankings pass.

Never delete or rewrite legacy rows. Never dual-write tuned scores into legacy
categories. Do not add a preview Pages origin to the Edge Function CORS list.
Do not run `supabase db push`: the repository's consolidated historical SQL
files do not map one-to-one to the production migration ledger. Apply only the
named migration below.

## Frozen artifacts

| Artifact | Required value |
|---|---|
| Project | `GridWatchGamesDB` (`mggxfzzxrpjgpzhwiwqi`) |
| Migration | `supabase/migrations/20260716000516_isolate_gridwatch_leaderboard_categories.sql` |
| Ruleset | `phase4-v1` |
| Current validator SHA-256 | `48a3ecf68be9d05e57ccabb2c90e335669a1a1808fbda814ac7ea81a952dafa6` |
| Legacy validator source | pinned commit `fa0a5df7a5bae70068772566913d13e99fe137f0` |
| Replay fixture | `docs/fixtures/phase4-promotion-replay.json` |
| Edge rollback source | `8dd86a8d65c8a1be1022951309f87fc311138614` |

The fixture is deliberately score-comparable only within its selected ruleset.
It has been independently replayed against both implementations:

| Validator | Result | Terminal tick | Score |
|---|---|---:|---:|
| pinned legacy | won | 163 | 500 |
| `phase4-v1` | won | 146 | 514 |

## Read-only production baseline

Captured 2026-07-15 before any promotion action:

- Project status: `ACTIVE_HEALTHY`, PostgreSQL 17, `us-east-1`.
- Latest migration: `20260714145350_relax_score_cap_for_campaign_totals`.
- Edge Function: `submit-gridwatch-score` version 6, `verify_jwt=false`, bundle
  hash `a12a278cdc178b7de9924dc29e852356d83b722bb46a7014fff094ad41dfb47e`.
- GridWatch categories: `sector:1` (1 row, max 472), `sector:2` (1 row, max
  238), and `standard` (1 row, max 472). There are no `phase4-v1:*` rows.
- `get_leaderboard` and `record_score` are SECURITY DEFINER with
  `search_path=public`; the migration changes both to an empty search path.
- `record_score` is executable only by `service_role`. Public Top 20 reads via
  `get_leaderboard` are intentionally executable by `anon` and `authenticated`.
- Security Advisor baseline includes the intentional public Top 20 SECURITY
  DEFINER warnings and the intentional `scores` RLS-with-no-direct-policy info.
  Pre-existing warnings for `get_rank` execution and disabled leaked-password
  protection are not introduced by Phase 4 and require separate owner decisions.
- Performance Advisor baseline includes pre-existing profile-policy init-plan,
  unindexed-foreign-key, and unused-index findings. Phase 4 creates no table or
  policy and should add no new performance finding.
- A preflight from the branch preview returns `Access-Control-Allow-Origin:
  null`; `http://127.0.0.1:5173` is allowed. The public preview therefore cannot
  submit a score through browser CORS.

Re-capture row counts immediately before promotion. Players can legitimately
change the baseline between this snapshot and the maintenance window.

## Required people and approval

- Owner explicitly approves migration, Edge deployment, and two authenticated
  production replay submissions.
- One operator owns the deployment and rollback terminal.
- One authenticated test/owner account has a chosen handle. Do not create a
  disposable score and later delete it; both fixtures are valid deterministic
  runs and should remain as normal leaderboard history.
- Keep the prior Pages production deployment and Edge rollback commit available.

Stop if any item is missing.

## 1. Freeze and verify the candidate

From the clean PR branch:

```sh
git fetch origin --prune
test "$(git rev-parse HEAD)" = "$(gh pr view 42 --json headRefOid --jq .headRefOid)"
git status --short
gh pr checks 42
npm install
npm run build
npm run typecheck:tools
npm run verify:replays
npm run balance:report
npm audit --audit-level=high
npm run build:validator
shasum -a 256 supabase/functions/submit-gridwatch-score/sim.bundle.js
npx esbuild supabase/functions/submit-gridwatch-score/index.ts \
  --bundle --format=esm --platform=neutral --target=es2022 \
  '--external:jsr:*' '--external:https:*' \
  --outfile=/tmp/gridwatch-submit-score.mjs
git diff --exit-code
```

Expected: all commands pass, the validator hash matches the frozen value, and
the worktree remains clean.

## 2. Re-capture the pre-change database state

Use a read-only query and save the result in the maintenance log:

```sql
select s.category, count(*) as row_count, max(s.score) as max_score
from public.scores s
join public.games g on g.id = s.game_id
where g.slug = 'gridwatch-signal-breach'
group by s.category
order by s.category;

select p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       p.proconfig as settings,
       has_function_privilege('anon', p.oid, 'execute') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'execute') as service_role_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('get_leaderboard', 'record_score')
order by p.proname;
```

Stop if Phase 4 categories already exist unexpectedly or the live functions no
longer match the recorded privilege boundary.

## 3. Apply only the additive migration

Apply the exact contents of
`20260716000516_isolate_gridwatch_leaderboard_categories.sql` with the approved
Supabase migration action. Do not paste a modified copy and do not push other
local migration files.

Immediately verify:

```sql
select version, name
from supabase_migrations.schema_migrations
where version = '20260716000516';

select p.proname, p.proconfig,
       has_function_privilege('anon', p.oid, 'execute') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'execute') as service_role_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('get_leaderboard', 'record_score')
order by p.proname;

select *
from public.get_leaderboard(
  'gridwatch-signal-breach',
  'phase4-v1:global'
);
```

Expected before the controlled current submission:

- both functions have `search_path=""`;
- `get_leaderboard`: `anon`, `authenticated`, and `service_role` execute;
- `record_score`: only `service_role` execute;
- the `phase4-v1:global` selector is empty, not an error;
- the pre-change category counts are unchanged.

The Supabase advisor will continue warning that anonymous/authenticated callers
can execute the SECURITY DEFINER Top 20 RPC. That is intentional: it is the
bounded public leaderboard read. `scores` intentionally has RLS enabled with no
direct policies; clients cannot read or write it directly. See Supabase's
[SECURITY DEFINER advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
and [RLS-with-no-policy guidance](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Stop before Edge deployment if any verification differs.

## 4. Deploy the backward-compatible Edge Function

Deploy exactly these files from the reviewed PR head with `verify_jwt=false`:

- `supabase/functions/submit-gridwatch-score/index.ts`
- `supabase/functions/submit-gridwatch-score/replayValidation.ts`
- `supabase/functions/submit-gridwatch-score/sim.bundle.js`

With the Supabase CLI, the equivalent command is:

```sh
supabase functions deploy submit-gridwatch-score \
  --project-ref mggxfzzxrpjgpzhwiwqi \
  --no-verify-jwt
```

Record the new Edge version and bundle hash. Then run the no-write CORS probes:

```sh
curl --fail --silent --show-error --dump-header - --output /dev/null \
  -X OPTIONS \
  'https://mggxfzzxrpjgpzhwiwqi.supabase.co/functions/v1/submit-gridwatch-score' \
  -H 'Origin: https://codex-balance-agency-phase-4.gridwatch-signal-breach.pages.dev' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: authorization,apikey,content-type'

curl --fail --silent --show-error --dump-header - --output /dev/null \
  -X OPTIONS \
  'https://mggxfzzxrpjgpzhwiwqi.supabase.co/functions/v1/submit-gridwatch-score' \
  -H 'Origin: http://127.0.0.1:5173' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: authorization,apikey,content-type'
```

Expected: preview origin is `null`; localhost is echoed; both return 204.

## 5. Run controlled authenticated replay checks

Use an allowed production or localhost origin. Keep the access token out of
files, terminal history, screenshots, issue comments, and logs. Retrieve the
publishable anon key through the approved Supabase dashboard/tool; it is not a
service-role credential.

Prepare the two request bodies outside the repository:

```sh
cp docs/fixtures/phase4-promotion-replay.json /tmp/gridwatch-legacy.json
jq '. + {ruleset: "phase4-v1"}' \
  docs/fixtures/phase4-promotion-replay.json \
  > /tmp/gridwatch-phase4.json
```

Submit the legacy body first (no `ruleset` field), then the current body. Both
requests must carry the authenticated user's bearer token and the publishable
anon key. Expected responses:

| Check | Legacy request | Current request |
|---|---|---|
| HTTP | 200 | 200 |
| `ok` | `true` | `true` |
| `ruleset` | `legacy-v1` | `phase4-v1` |
| `runScore` | 500 | 514 |
| primary category | `sector:1` | `phase4-v1:sector:1` |
| rank scope | legacy sectors only | Phase 4 sectors only |

Then send an authenticated body with `ruleset: "phase4-v2"`. Expected: HTTP
400 `Unsupported ruleset.` and no score row. Send an unfinished current replay
with an empty command list. Expected: HTTP 422 and no score row.

Verify exact categories and isolation with read-only SQL:

```sql
select s.category, count(*) as row_count, max(s.score) as max_score
from public.scores s
join public.games g on g.id = s.game_id
where g.slug = 'gridwatch-signal-breach'
group by s.category
order by s.category;

select *
from public.get_leaderboard('gridwatch-signal-breach', null);

select *
from public.get_leaderboard(
  'gridwatch-signal-breach',
  'phase4-v1:global'
);
```

Confirm:

- legacy and current sector, clear-marker, standard, daily, and weekly rows are
  distinct;
- rejected requests added nothing;
- legacy global excludes standard/period/marker and every `phase4-v1:*` row;
- current global includes only `phase4-v1:sector:1..3` rows;
- re-submitting the same fixture reports `improved: false` and preserves the
  stored best;
- Edge logs contain no validator, RPC, or hub-alignment errors.

## 6. Client promotion and smoke test

Only after Step 5 passes:

1. mark PR #42 ready;
2. obtain required review/sign-off;
3. merge to `main`;
4. wait for the production Pages deployment;
5. verify title, briefing, Build/full-refund, live/partial-refund, one sector
   playthrough, current Top 20 reads, sign-in/handle, and score submission;
6. load once with `VITE_SUPABASE_*` absent or the browser offline and confirm no
   Supabase request and uninterrupted offline play.

Do not update Command Nexus to read Phase 4 aggregate/period rows in this
promotion. Its legacy board remains intact until a separate reviewed change
explicitly opts into the new categories.

## Rollback

### Migration failure

Stop. Do not deploy the Edge Function. Because the migration only replaces
functions, repair it with a new reviewed forward migration. Do not delete scores
or edit the production migration ledger.

### Edge failure before client merge

Redeploy `submit-gridwatch-score` from rollback commit
`8dd86a8d65c8a1be1022951309f87fc311138614` with `verify_jwt=false`. Leave the
additive migration in place; it is backward-compatible with legacy clients.
Repeat a legacy replay and legacy Top 20 read before ending the window.

### Client failure after merge

Roll Pages back to the prior successful production deployment. Leave the dual
validator and additive migration in place so old clients continue working.
If the Edge Function is also implicated, restore the rollback source above.

At no point does rollback delete or rewrite a leaderboard row.

## Sign-off record

Record these values in `HANDOFF.md` after the window:

- approval and operator;
- PR head, migration version, Edge version/hash, and Pages deployment;
- legacy/current/rejection response summaries;
- category counts before and after;
- legacy/current global results and both returned ranks;
- advisor/log review;
- rollback decision and outcome;
- remaining real-device or owner-playtest gates.
