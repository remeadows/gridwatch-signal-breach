# Expansion public release — 2026-09-13

## Owner decisions

- Release three chapters / 25 levels / 125 waves to the public with saves and
  leaderboards. GitHub publication and Codex/CodeRabbit review are authorized.
- Current 21-family Blender roster is accepted. Approval metadata is updated;
  images, models, generator hashes and runtime assets are unchanged. This does
  not claim an unreported physical-phone test.
- The owner's Signal Breach saves may be reset if necessary. Prefer an additive
  new save namespace instead; no deletion is required for the current design.
  Other games, accounts and historical leaderboard rows remain untouched.

## Approved save contract — 2026-09-13

The owner approved the recommendation: cross-device cleared levels/unlocks and
settings, plus an unfinished-level checkpoint at each completed wave. Resume in
the next build phase with reconstructed hardware, bandwidth, damage, RNG and full
command history. Mid-wave changes are not saved; abandoning combat resumes the
previous completed-wave checkpoint. A checkpoint never awards a leaderboard
score. Do not label browser-only storage a working cloud save.

Use one active checkpoint per account and revision; a conflicting checkpoint
from another device requires an explicit choice. Guest progress must not silently
become the next signed-in user's save. No destructive reset is required.

## Verified implementation gaps

1. `src/ui/featureFlags.ts` restricts expansion navigation/play to preview hosts.
2. `src/ui/expansionProgressR4.ts` stores cleared levels/unlocks in localStorage;
   no expansion cloud-save path exists in this checkout.
3. `assertExpansionContentPublished` in the server's expansion validation module
   rejects every submission. A canonical immutable r4 registry, expansion replay
   bundle, server-derived score path and client submission UI are required.
4. The new stack has no GitHub review result yet. Local evidence is not remote
   CI, CodeRabbit approval, production auth or cloud persistence evidence.

## Ordered release packages

1. **Contract and art acceptance.** Record this approval; choose checkpoint
   semantics, account ownership and conflict policy before cloud-save code.
2. **Cloud saves.** Add optional authenticated persistence scoped to Signal
   Breach and content revision. Enforce owner-only RLS, validate schema and size,
   and isolate data on sign-out/account switch. Preserve local offline play;
   retry sync failures and show truthful local/sync/error status. Do not silently
   overwrite a newer save from another device. Cloud saves never prove scores.
3. **Validated expansion leaderboards.** Generate a frozen r4 server registry
   and replay bundle from the deterministic simulation. Require campaign,
   revision, level and content hash; derive results and scores on the server.
   Bound replay work; reject malformed, mixed-schema and unsupported payloads.
   Use revision-isolated per-level categories consistently for writes, reads
   and ranks. Do not mix scores from different boards or add a campaign total
   without a separately approved formula. Preserve legacy/phase4-v1 behavior.
4. **Client integration.** Add sign-in, pending submission/retry and sync UI to
   expansion. Handle account changes without leaking queued saves/scores. Expose
   production expansion navigation only after the compatible backend is ready;
   keep debug bypasses and preview shortcuts local-only.
5. **Verification and review.** Test saves across two browser contexts, offline
   recovery, reload, conflicts, sign-out, account isolation and malformed data.
   Test real valid replays, invalid rejection, duplicate submissions and exact
   category ranking against an isolated backend. Re-run existing campaign and
   three-game compatibility checks. Review completed local packages with Codex
   and CodeRabbit; push for protected PR review and resolve every conversation.
6. **Server-first rollout.** Capture a baseline and rollback revisions; verify
   additive migrations in an isolated database before production. Deploy the
   compatible server before the public client. Smoke-test real sign-in, save
   restore, valid score submission and all existing game boards. Roll back the
   client/activation on failure without deleting user data. Do not claim a live
   deployment from a successful push or build alone.

## Completion criteria

Public host offers all 25 authored levels through normal progression. Offline
play still works. Signed-in players can restore the agreed save checkpoint on
another device. Expansion scores are replay-validated and isolated from original
and other-game boards. Required GitHub checks/reviews are green, conversations
resolved, and deployed public flows have actual verification evidence.

No release-date guarantee: the existing local game is complete, but cloud saves
and accepted expansion scores are substantive implementation/testing work.

## First backend checkpoint — local implementation

- Replay-prefix checkpoint reconstruction: 100 boundaries, all 25 levels,
  exact restored states and continued wins. Reject malformed, future-command,
  wrong-content and non-boundary input.
- Account-keyed local envelope, bounded canonical payloads, optional cloud
  transport and optimistic sync controller. Explicit conflicts preserve local
  data; stale auth completions cannot notify/cache into the next account.
- Existing shared `game_saves` store is reused by two new fixed-game/fixed-slot
  authenticated RPCs. The migration changes no shared grants/policies and does
  not touch existing rows. It has NOT been applied to production.
- Disposable PostgreSQL checks pass; simultaneous CAS writers produce exactly
  one success and one conflict. CI includes the isolated SQL test lane.
- Gameplay/UI integration and actual two-device cloud-save QA remain next.
  Required pre-push CodeRabbit review is blocked by signed-out CLI credentials.
