# Expansion r4 leaderboard package

Local implementation, 2026-09-23. Publication is a separate reviewed step.

## Contract

- Endpoint: existing authenticated `submit-gridwatch-score`; game slug remains
  `gridwatch-signal-breach`. The bearer token's verified user owns the score.
- Identity: schema 2, `expansion-v1`, `expansion-1`, `expansion-1-r4`, level 1–25,
  exact authored content hash. Historical r1/r2/r3 identities stay unsupported
  for ranked submissions. Never reinterpret old identities as r4.
- Proof: seed and full canonical command history, maximum 5,000 commands,
  12,000 replay ticks, 512 KiB HTTP body. Server accepts only five-wave wins.
  Claimed score, category, handle and user ID do not determine the stored result.
- Category: `expansion-v1:expansion-1-r4:level:N`. Reads use that same exact
  category; submission exposes `levelRank`, never the generic RPC's global rank.
- The existing service-only `record_score` atomically keeps each user's best.
  Expansion makes one write and returns before original/hub/daily/weekly writes.
  Original legacy and phase4-v1 categories, scoring and replay bundles are intact.
  No DB migration, row deletion, shared-game grant change or score reset.

## Client and offline behavior

Rankings in Field Guide/victory require an explicit click. Winning runs can be
submitted under the displayed current account handle. There is one durable
pending run per owner in the separate `gridwatch.expansion.pendingScore.r4:`
namespace. A different new clear requires explicit replacement of the old run.
Storage failure shows retry copy, never a false submitted confirmation.

Guest proof is claimed only by clicking Submit as the signed-in handle; it is
persisted under that owner before sending. Failures retain it for retry under
that same owner. Owner changes during session lookup prevent requests, and
stale completions cannot clear another/newer pending record. Scores are not
auto-submitted after sign-in. The root page offers an explicit pending notice.
Browser storage is origin-local; a localhost/old-host run cannot be carried to
Nexus by an ordinary link. Public ranked play should begin on Nexus.

`EXPANSION_LEADERBOARDS_RELEASED=false` blocks both reads and submissions in
this package. Public expansion flags remain closed. Offline gameplay, saves,
and original account/leaderboard behavior are not activated or changed by this
latch. The LAN preview also retains its independent account-networking block.

## Verification

Run build/tool types, `verify:expansion-leaderboard`,
`verify:expansion-score-client`, `verify:expansion-score-http`, original replay,
`verify:expansion-score-ui` (lifecycle/ownership DOM port),
content/progress, save/codec/account/LAN and art regressions. HTTP harness mocks
Auth/DB ports and asserts actual dispatch routing; it is not a Deno deployment.
The old legacy bundle remains pinned remotely; legacy parity is covered by
existing tests, not the HTTP harness's intentionally throwing legacy stub.

Use `verify-expansion-score-database.sql` only in an empty disposable database.
It applies the actual leaderboard function migrations over a minimal baseline
schema and rolls back its fixtures. CI creates a separate DB in the isolated
PostgreSQL container. No production test scores are necessary.

Regenerate both validator artifacts before commit. The original must be
byte-identical. The new r4 bundle must remain immutable once published; later
sim/tuning changes need a new versioned artifact and category, not an overwrite.
This package's initial r4 SHA-256 is
`d1cb7506fa3c7017f8d85cfc71a2bdd5418a43254d6d843e44e6399b641b5008`.
CI regeneration guards client/server drift; record the deployed hash at release.

## Ordered publication gate

1. Finish local Codex/CodeRabbit review and owner preview acceptance. Include the
   original Blender parity and shared-save adapter in the full-release PR scope.
2. Publish the complete reviewed branch through protected PR review. Require
   current-head CodeRabbit/Codex review, CI and resolved conversations.
3. Capture current Edge/client deployment revisions and rollback artifacts.
   Run Deno validation and isolated endpoint checks in the deployment environment.
4. Deploy compatible Edge validator first; confirm Nexus CORS, original replay
   compatibility, exact category grants/reads and rejected malformed expansion.
5. Enable expansion navigation and leaderboard latch in the reviewed activation
   change, then deploy client to Nexus's proxied game route.
6. Perform real sign-in/handle, genuine gameplay win/submission, best-score read,
   two-device cloud checkpoint restore, offline retry and original-board smoke
   tests. Do not substitute synthetic fixtures for a production player's clear.
7. On failure roll back client/activation first; retain additive score/save data.
   Never reset other games' shared records to repair this release.
