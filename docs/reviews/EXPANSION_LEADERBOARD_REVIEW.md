# Local expansion leaderboard review — 2026-09-23

Scope: new r4 validator/protocol, isolated score dispatcher, account-owned pending
proofs, ranking/submission UI, CI and regression tests. No simulation/content,
shared DB migration, dependency lock or original validator changes.

CodeRabbit local CLI reviewed uncommitted plus untracked files twice:

| Pass | Finding | Disposition |
| --- | --- | --- |
| 1 | Minor: rebuilt action controls lose keyboard focus | Preserve matching enabled focus or focusable panel fallback; restore after asynchronous completion. Verified in DOM-port regression and actual browser. |
| 1 | Major: one-shot victory tracking loses retry proof if storage fails | Retain owner-bound per-run offer until staging succeeds. Rebuild/retry tests pass; successful submission is not re-staged. |
| 2 | Minor: release-disabled pending notice still mounts on original entry | Return before host/listeners when disabled. Regression verifies no DOM or subscriptions. |

All findings addressed. The final small fixes (notice gate, bounded streaming
buffer and viewport anchoring) received local Codex inspection and regression
checks; do not treat a review snapshot as a post-fix GitHub approval. Required
current-head Codex/CodeRabbit PR review remains a publication gate.

## Evidence

- Build/tool types; 25 frozen-server/client winning score matches; malformed,
  mixed identity, wrong hash, unfinished, trailing/oversized command rejection.
- Real HTTP dispatch with mocked isolated Auth/DB: 401/400/413/422 paths, Nexus
  CORS, canonical authenticated owner, one expansion write, original score 514.
- Disposable PostgreSQL 16 using production function migrations: keep-best,
  duplicates, ties, level separation, original/other-game sentinels, client
  write denial. No migration needed or applied to the shared production DB.
- Client tests cover disabled networking, response checks, stalled response-body
  timeout, storage failure, explicit durable guest claim, owner/token races,
  newer pending proof preservation, duplicate-submit guard and retry.
- DOM-port UI tests cover staging failure across rebuild, no re-stage after
  success, explicit replacement, owner isolation, text-only handles, focus,
  listener disposal and disabled pending notice.
- Actual built browser flow: Wave 2 guest restore -> Field Guide -> View Level
  Rankings -> truthful release-pending response -> Back to Game. Desktop
  1280x720, 390x844, 320x740 and 844x390 landscape checked. Fixed narrow roster
  overflow and anchored long guide to viewport. No warning/error logs. Original
  title still renders; temporary QA tab closed and viewport override reset.
- Original/content/progress/save/account/LAN/art regressions pass, including
  100 checkpoint round trips and isolated two-device CAS. npm audit: zero
  vulnerabilities. Dev 4391/preview 4393 HTTP 200; no `.env*` files.

## Remaining release evidence

No push or deploy. No real production-auth browser score, no real two-device
cloud acceptance, no fresh physical-phone/performance test, no Deno-runtime
validation and no full human five-wave clear in this package. Synthetic fixtures
never went to production. Server-first activation and full-release PR approval
remain explicit steps; public navigation and leaderboard latch remain closed.
