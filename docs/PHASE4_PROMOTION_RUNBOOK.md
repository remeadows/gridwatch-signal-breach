# Phase 4 Server-First Promotion Runbook

Status: the original server-first steps and PR #42 Pages promotion were executed
2026-07-16. PR #43's reviewed shared-RPC migration and Edge hardening are also
active in production; the PR merge and final Pages smoke remain.

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
| Original migration | `supabase/migrations/20260716000516_isolate_gridwatch_leaderboard_categories.sql` |
| Follow-up migration | `supabase/migrations/20260716015402_harden_gridwatch_leaderboard_writes.sql` |
| Original applied migration ledger version | `20260716012745` |
| Follow-up applied migration ledger version | `20260716024816` |
| Ruleset | `phase4-v1` |
| Current validator SHA-256 | `48a3ecf68be9d05e57ccabb2c90e335669a1a1808fbda814ac7ea81a952dafa6` |
| Active Edge Function | version 8; `002797c7a1351c9eba789ab3827a61c395be51505f6683eb7d5d07477bca400a` |
| Legacy validator source | pinned commit `fa0a5df7a5bae70068772566913d13e99fe137f0` |
| Replay fixture | `docs/fixtures/phase4-promotion-replay.json` |
| Follow-up Edge rollback source | `ed0cdccd92386852a98091e64d1aec1c96e9a061` |

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
test "$(git rev-parse HEAD)" = "$(gh pr view 43 --json headRefOid --jq .headRefOid)"
test -z "$(git status --porcelain)"
gh pr checks 43
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
test -z "$(git status --porcelain)"
```

Expected: all commands pass, the validator hash matches the frozen value, and
the worktree remains clean.

## 2. Re-capture the pre-change database state

Use a read-only query and save the result in the maintenance log:

```sql
select g.slug, s.category, count(*) as row_count, max(s.score) as max_score
from public.games g
left join public.scores s on s.game_id = g.id
group by g.slug, s.category
order by g.slug, s.category;

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
  and p.proname in ('get_leaderboard', 'get_rank', 'record_score')
order by p.proname;
```

Stop if Phase 4 categories already exist unexpectedly or the live functions no
longer match the recorded privilege boundary.

GridWatchGamesDB is shared by `grid-drift`, `gridwatch-match`, and
`gridwatch-signal-breach`. When a follow-up changes any shared RPC, first hash
every persisted score row for those games:

```sql
select g.slug,
       count(s.id) as score_rows,
       count(distinct s.category) as categories,
       md5(coalesce(jsonb_agg(jsonb_build_array(
         s.id,
         s.user_id,
         s.category,
         s.score,
         s.rating,
         s.metadata,
         s.proof,
         s.proof_hash,
         to_char(
           s.created_at at time zone 'UTC',
           'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
         )
       ) order by s.id) filter (where s.id is not null), '[]'::jsonb)::text)
         as all_score_rows_hash
from public.games g
left join public.scores s on s.game_id = g.id
where g.slug in ('grid-drift', 'gridwatch-match', 'gridwatch-signal-breach')
group by g.slug
order by g.slug;
```

Also hash the visible board results before and after the migration:

```sql
with cases(label, slug, category) as (
  values
    ('drift-global', 'grid-drift', null::text),
    ('drift-standard', 'grid-drift', 'standard'),
    ('match-global', 'gridwatch-match', null::text),
    ('match-standard', 'gridwatch-match', 'standard'),
    ('breach-legacy-global', 'gridwatch-signal-breach', null::text),
    ('breach-phase4-global', 'gridwatch-signal-breach', 'phase4-v1:global'),
    ('breach-legacy-standard', 'gridwatch-signal-breach', 'standard'),
    ('breach-phase4-standard', 'gridwatch-signal-breach', 'phase4-v1:standard')
), rows as (
  select c.label, l.rank, l.score, l.created_at
  from cases c
  left join lateral public.get_leaderboard(c.slug, c.category) l on true
)
select label,
       count(score) as rows,
       min(score) as min_score,
       max(score) as max_score,
       coalesce(jsonb_agg(
         jsonb_build_array(score, created_at)
         order by score desc, created_at
       ) filter (where score is not null), '[]'::jsonb) as ordered_content,
       md5(coalesce(string_agg(
         coalesce(score::text, '') || ':' ||
         coalesce(created_at::text, ''),
         '|' order by score desc, created_at
       ), '')) as content_snapshot,
       md5(coalesce(string_agg(
         coalesce(rank::text, '') || ':' ||
         coalesce(score::text, '') || ':' ||
         coalesce(created_at::text, ''),
         '|' order by score desc, created_at, rank
       ), '')) as rank_snapshot
from rows
group by label
order by label;

with cases(label, category) as (
  values
    ('breach-legacy-global', null::text),
    ('breach-phase4-global', 'phase4-v1:global'),
    ('breach-legacy-standard', 'standard'),
    ('breach-phase4-standard', 'phase4-v1:standard')
), rows as (
  select c.label, l.rank, l.score, l.created_at
  from cases c
  cross join lateral public.get_leaderboard(
    'gridwatch-signal-breach',
    c.category
  ) l
)
select r.label,
       r.rank,
       r.score,
       r.created_at,
       count(*) over (partition by r.label, r.score) > 1 as tied_score,
       r.rank = 1 + (
         select count(*)
         from rows higher
         where higher.label = r.label
           and higher.score > r.score
       ) as signal_rank_valid
from rows r
order by r.label, r.score desc, r.created_at;
```

Require every row count, score bound, `ordered_content`, and `content_snapshot`
to match exactly.
Also require `rank_snapshot` to match for Grid Drift and GridWatch Match. A
Signal Breach `rank_snapshot` may differ only when the unchanged result set
contains tied scores: compare the ordered `(score, created_at)` tuples directly
and require each post-migration rank to equal one plus the number of returned
rows with a strictly greater score. If a Signal Breach board has no ties, its
`rank_snapshot` must also match exactly.

## 3. Apply only missing migrations, in order

Check the production ledger before applying anything:

```sql
select version, name
from supabase_migrations.schema_migrations
where name in (
  'isolate_gridwatch_leaderboard_categories',
  'harden_gridwatch_leaderboard_writes'
)
order by version;
```

If `isolate_gridwatch_leaderboard_categories` is absent, apply the exact
contents of `20260716000516_isolate_gridwatch_leaderboard_categories.sql` with
the approved Supabase migration action. If ledger version `20260716012745` is
already present, as it is on the recorded compatibility path, do not reapply
the original migration; skip directly to the follow-up below. Do not paste a
modified copy and do not push other local migration files.

Immediately verify:

```sql
select version, name
from supabase_migrations.schema_migrations
where version = '20260716012745'
  and name = 'isolate_gridwatch_leaderboard_categories';

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

Expected after the original migration:

- both functions have `search_path=""`;
- `get_leaderboard`: `anon`, `authenticated`, and `service_role` execute;
- `record_score`: only `service_role` execute;
- the `phase4-v1:global` selector succeeds; it is empty before the first current
  submission and must match the captured baseline on a follow-up window;
- the pre-change category counts are unchanged.

The Supabase advisor will continue warning that anonymous/authenticated callers
can execute the SECURITY DEFINER Top 20 RPC. That is intentional: it is the
bounded public leaderboard read. `scores` intentionally has RLS enabled with no
direct policies; clients cannot read or write it directly. See Supabase's
[SECURITY DEFINER advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
and [RLS-with-no-policy guidance](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Stop before Edge deployment if any verification differs.

### Ready-state review follow-up

If `harden_gridwatch_leaderboard_writes` is absent from the ledger, apply the
exact contents of `20260716015402_harden_gridwatch_leaderboard_writes.sql` next.
If it is already recorded, do not reapply it; verify the live definitions and
continue with the post-change checks. This migration makes the shared
`record_score` keep-best write atomic. Its leaderboard tie-rank change is
explicitly limited to `gridwatch-signal-breach`; Grid Drift and GridWatch Match
retain their deterministic `row_number()` order so Grid Drift's separate
`get_rank` RPC remains aligned with its visible board. Both non-Signal RPCs use
the score row ID only as a final deterministic tiebreaker when score and
timestamp are identical.

After this follow-up, `get_leaderboard`, `get_rank`, and `record_score` must all
have `search_path=""`. `get_rank` must retain `authenticated` and `service_role`
execute while denying `anon`; the other two functions retain the privilege
boundary recorded above.

After the follow-up migration, repeat the cross-game snapshot query above and
apply its content/rank comparison rules. Recheck the function privileges and
empty search paths. Stop if any stored score/category changes, any
`all_score_rows_hash` or `content_snapshot` changes, or either non-Signal-Breach
`rank_snapshot` differs. Also stop if a Signal Breach `rank_snapshot` changes on
a board without ties, or if any tied-board rank differs from one plus the number
of returned rows with a strictly greater score.

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
jq 'del(.ruleset)' \
  docs/fixtures/phase4-promotion-replay.json \
  > /tmp/gridwatch-legacy.json
cp docs/fixtures/phase4-promotion-replay.json /tmp/gridwatch-phase4.json
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
400 `Unsupported ruleset.` and no score row. For a replay-level 422 probe, append
`{"t":200,"c":{"type":"skipPrep"}}` to the current fixture's command list.
The run ends at tick 146, so the extra command must return HTTP 422
`Rejected: Command log contains commands after the run ended.` before any write.

Do not use an empty command list as the 422 probe. With the current deterministic
simulation, an empty log continues ticking until the Core reaches a terminal
loss; that completed loss is valid under the established win-or-loss submission
policy.

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

## 6. Follow-up promotion and smoke test

Only after Step 5 passes:

1. require PR #43's refreshed checks and review to pass;
2. obtain required review/sign-off;
3. merge PR #43 to `main`;
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
`ed0cdccd92386852a98091e64d1aec1c96e9a061` with `verify_jwt=false`. Leave the
additive migration in place; it is backward-compatible with legacy clients.
Repeat a legacy replay and legacy Top 20 read before ending the window.

### Client failure after merge

Roll Pages back to the prior successful production deployment. Leave the dual
validator and additive migration in place so old clients continue working.
If the Edge Function is also implicated, restore the rollback source above.

At no point does rollback delete or rewrite a leaderboard row.

## Sign-off record

Server-first window executed by Codex after explicit owner approval on
2026-07-16:

- PR head at freeze: `a8842937a22bb0ba9462e1811aece3ec7879b467`.
- Reviewed migration artifact:
  `20260716000516_isolate_gridwatch_leaderboard_categories.sql`; Supabase ledger
  version: `20260716012745`.
- Edge Function: version 7, `verify_jwt=false`, bundle hash
  `0460a604158edc6ed0720f5240f37a8990cbe0b806c2ff554c0f6992318f69be`.
- CORS: public branch preview `null`; `http://127.0.0.1:5173` echoed; both 204.
- Authenticated legacy fixture: HTTP 200, `legacy-v1`, score/best 500,
  `improved: true`, global/sector rank 1.
- Authenticated current fixture: HTTP 200, `phase4-v1`, score/best 514,
  `improved: true`, global/sector rank 1. Repeat returned `improved: false` and
  preserved best 514.
- Unsupported `phase4-v2`: HTTP 400 `Unsupported ruleset.`; post-terminal
  command: HTTP 422 with no write.
- The originally planned empty-command 422 probe instead produced a valid
  terminal 33-point loss and `improved: false`; it added no category and changed
  no stored best. This runbook was corrected to reflect deterministic behavior.
- Before: 3 GridWatch rows/categories (`sector:1` 472, `sector:2` 238,
  `standard` 472). After: 11 rows, including distinct legacy and Phase 4 sector,
  clear-marker, standard, daily, and weekly categories.
- Legacy global: `Russ`, 500, rank 1. Phase 4 global: `Russ`, 514, rank 1.
  Each selector excludes the other ruleset and aggregate/period/marker rows.
- Edge logs show the expected 200/400/422 responses and no validator, RPC, or
  hub-alignment error. Security/performance advisors contain only the recorded
  intentional or pre-existing findings; the migration added no new finding.
- Rollback was not required. PR #42 later merged as `ed0cdcc`; Cloudflare
  production deployment `d98c8100-fbbb-49bd-af74-1dcd669b21ae` and the custom
  domain passed desktop Chromium, mobile Chromium, and mobile WebKit smoke tests.
- Remaining gates: refreshed checks on the production-evidence update, PR #43
  merge/final production smoke, owner W1-W12 playtest, and real-device checks in
  mobile Safari and mobile Chrome web browsers.

PR #43 shared-database hardening executed by Codex after explicit owner approval
on 2026-07-16:

- Frozen PR head: `d8afd228b4bc229c85c0efa680d8a50bbb527f6e`.
- Follow-up migration artifact:
  `20260716015402_harden_gridwatch_leaderboard_writes.sql`; Supabase ledger
  version: `20260716024816`.
- Exact structured raw-row and ordered visible-board hashes matched before and
  after for `grid-drift`, `gridwatch-match`, and `gridwatch-signal-breach`.
  Counts/bests remained 6/11710, 0/none, and 11/514 respectively.
- No-op keep-best RPC calls for Grid Drift standard 11710 and Signal Breach
  Phase 4 sector 1 score 514 both returned `improved: false`. Function
  signatures and grants were unchanged; all three shared functions now have an
  empty `search_path`.
- Security and performance advisors gained no new finding. Existing intentional
  public-read/RLS notices and unrelated project notices remain owner decisions.
- Edge Function version 8 is active with `verify_jwt=false`, validator SHA-256
  `48a3ecf68be9d05e57ccabb2c90e335669a1a1808fbda814ac7ea81a952dafa6`,
  and bundle hash
  `002797c7a1351c9eba789ab3827a61c395be51505f6683eb7d5d07477bca400a`.
  Production and localhost CORS probes returned 204 with the expected origins;
  preview remained `null`. Unauthenticated POST returned 401 and GET returned
  405; the corresponding v8 logs contain no 5xx.
- Live desktop/mobile-web browser smokes passed for all three games. Signal
  Breach returned Phase 4 best 514, Grid Drift returned 11710, and GridWatch
  Match rendered at desktop and 390px WebKit widths with no console/request
  failures or horizontal overflow; its unauthenticated score endpoint remained
  401.
