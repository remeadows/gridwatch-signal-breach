# Expansion server-first release — 2026-09-23

## State

Owner authorized the next server-first release step after PR #84 merged.
Merged source: `4f8c10f6f6487f8b4770adc7446626005b46ca9a`.
PR review head `69d8a5f` received CodeRabbit approval, Codex completed with no
findings, and all review conversations were resolved. Main build, CodeQL and
Cloudflare Pages deployment passed. The PR monitor is paused.

Only `submit-gridwatch-score` in GridWatchGamesDB was deployed, from the exact
merged function package. No migration, grants, user data, saves, secrets, other
game function or public client activation was changed.

## Baseline and rollback

- Project: `mggxfzzxrpjgpzhwiwqi` (GridWatchGamesDB).
- Function ID: `fc0aee8f-99c3-42f1-8f5d-c583130ae581`.
- Before: ACTIVE version 9, `verify_jwt=false`, bundle
  `9de1cc7cfc7961b8846c9fb3c5688e437e5bb6b7e1f3c1840ed43177f112589e`.
- After: ACTIVE version 10, `verify_jwt=false`, bundle
  `f7653dfe8f994f6f32a913b138ff3f868f5060b29eb18f4d4104fe3f04ef2f57`.
- Deployment timestamp: 2026-09-23 18:01:06 UTC.
- Client rollback baseline: main `4f8c10f`, Pages deployment
  `5b79c0c5-e48b-4447-8fe1-e3812f00bd3c`, with expansion activation still off.
- Exact version-9 file contents and metadata are retained in the task's local
  visualization artifacts under `signal-breach-release-20260923/rollback-v9.json`.
  A working copy is at `/private/tmp/breach-release-20260923/rollback-v9.json`.
  The JSON file contents are exact; individually extracted temporary source
  files have an extra terminal newline and are not the canonical backup.

Rollback: redeploy only `submit-gridwatch-score` using the backup JSON's four
source files, `index.ts` entrypoint and existing `verify_jwt=false`. This creates
a new function version restoring version-9 behavior; do not alter shared DB
state. Keep public client activation off. After activation, roll back the client
latches first if saves/submissions regress, preserving all user data.

The gateway setting remains false because the handler services OPTIONS itself
and authenticates POST callers through Supabase `auth.getUser()` before replay
or database work. No authentication bypass was introduced.

## Verification

- Deno 2.9.1 `check --no-config --no-lock --node-modules-dir=none` passed on the
  actual merged entrypoint. Isolated dependency cache avoids changing app deps.
- An additional Deno runtime preflight imported the actual entrypoint and real
  Supabase client, with fake Auth/DB fetch responses and no network permission.
  Passed: auth rejection, malformed/oversized bodies, content-hash rejection,
  expansion win and exactly one isolated category write, original golden score
  514, Nexus CORS and method handling. No fixture submitted to production.
- `verify:expansion-leaderboard`, `verify:expansion-score-http`, and
  `verify:replays` passed. Both validator bundles regenerated without changes.
- Original simulator content exactly matches deployed version 9. Its SHA-256:
  `48a3ecf68be9d05e57ccabb2c90e335669a1a1808fbda814ac7ea81a952dafa6`.
- Expansion r4 SHA-256 remains
  `d1cb7506fa3c7017f8d85cfc71a2bdd5418a43254d6d843e44e6399b641b5008`.
- Downloaded version-10 source: all six reachable runtime files exactly match
  the merged package. The unused historical protocol and type declaration are
  omitted by the deploy bundler, as expected.
- Read-only production catalog inspection confirmed `record_score` executable
  only by service_role, not anon/authenticated. Exact-category leaderboard
  filtering and ranking remain compatible. No SQL mutations performed.
- Live OPTIONS: Nexus and old host receive their expected allowed origins;
  unknown origin receives `null`. Before deployment Nexus received `null`.
- Live GET returns 405; unsigned POST and deliberately invalid-session POST
  return 401. No genuine authenticated submission was attempted.
- Version-10 logs for the immediate smoke window show the six expected
  responses (three 204, two 401, one 405), with no 5xx or error-level events.
  This short observation is not an extended production monitoring window.
- Nexus game route returned HTTP 200. Read-only standard-board calls succeeded
  for all three games; the expansion Level 1 category read succeeded. These
  checks are not full game playtests or proof of accepted production scores.

## Remaining gates

Public expansion navigation is still preview-host-gated, and
`EXPANSION_LEADERBOARDS_RELEASED=false` remains unchanged. Prepare a separate,
locally tested activation PR and require Codex/CodeRabbit review before merge.
Keep debug shortcuts restricted to preview hosts.

After activation, verify genuine Nexus login/handle, a human-played clear and
score submission, best-score reads, two-device cloud checkpoint restore,
conflicts/account isolation, offline recovery, and original-campaign play.
Physical-phone acceptance and an extended production observation window remain
separate evidence gates. Do not equate local mocked Auth/DB tests with them.

The failed post-merge Dependabot Docker update is separate from passing release
CI: its PostgreSQL update hit `dependency_file_not_supported` / API 400. It was
not fixed or bypassed by this deployment.
