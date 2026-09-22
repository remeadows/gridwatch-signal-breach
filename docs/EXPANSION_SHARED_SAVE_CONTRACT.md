# Expansion shared-save contract — candidate v1

Status: implemented and tested locally, **not activated or deployed**. The game
still pins released account-kit v0.2.4 and does not configure `kit.saves`.
The companion is now in [account-kit PR #7](https://github.com/remeadows/gridwatch-account-kit/pull/7),
head `9d8643a`, proposing v0.2.5. No release tag exists yet; do not pin the
unreleased version or enable the game client before the reviewed server rollout.
CI and current-head CodeRabbit/Codex reviews pass with no unresolved conversations;
the PR remains open for owner merge. Nexus source and production are unchanged.
The companion registry patch is in the isolated account-kit checkout
`/tmp/signal-breach-account-kit-20260922`, branch
`codex/breach-expansion-save-schema`. No version/tag is reserved by this document.
Reviewed companion local commit: `ef5d859`. A recovery copy is checked in at
`companion-patches/account-kit-breach-save-v1.patch` so this package does not
depend on a temporary checkout surviving. Apply only to a clean kit v0.2.4
checkout (`git apply --unidiff-zero --check` first, then
`git apply --unidiff-zero`); reconcile newer upstream changes rather
than forcing the patch. Then run the full kit tests/typecheck/build and the
cross-repository verification below. This patch is not an installed dependency.

## Identity and ownership

| Field | Fixed value |
| --- | --- |
| Route alias | `breach` |
| Existing shared games slug | `gridwatch-signal-breach` |
| Slot | `expansion-1-r4` |
| Shared schema version | `1` |
| Local save schema | `1` (unchanged) |
| Reconstructed replay identity | schema `2`, `expansion-1`, `expansion-v1`, `expansion-1-r4` |

Only the r4 expansion slot is registered. The original campaign, r1/r2/r3,
Match, Zero, Drift and existing leaderboard categories are not repurposed.
Auth ownership remains the kit/Nexus responsibility; payloads contain no account
IDs, credentials, scores or trusted simulation snapshots. A cloud clear remains
unranked. Ranked scores require the separate server replay validator.

## Payload

Required: `contentRevision`, `clearedLevels` (at most 25 level IDs, 1–25),
`settings: { lowEffects: boolean }`. Optional `checkpoint` is **omitted** when
the local save has `checkpoint: null`.

A checkpoint contains `completedWaves` (1–4), `tick` (1–12000), `level` (1–25),
the immutable 64-character lowercase `contentHash`, the original nonempty
`seed` (at most 200 UTF-16 code units), and `commands` (at most 5000 integers).
The seed must be well-formed Unicode (no unpaired surrogates), as required by
the shared service's canonical request hashing.
Fixed replay identifiers are restored from this schema version, not guessed
from current content. The hash is carried and checked against the level manifest.

The immutable command encoding is:

`packed = tick * 1024 + opcode * 64 + y * 8 + x`

| Opcode | Meaning |
| --- | --- |
| 0 | `skipPrep`, cell bits must be zero |
| 1 | `sellUnit` |
| 2–8 | `placeUnit`: relay, firewall, turret, scrubber, overclock, latencyTrap, arcIce |
| 9–15 | Reserved; rejected during decoding |

Coordinates are integers 0–7. Command ticks are 0–11999, nondecreasing, with
same-tick order retained. Checkpoint restoration additionally requires every
command tick to precede the boundary. The maximum packed value is 12,287,551.
Never reorder this opcode table or reuse reserved values under schema v1.
New mechanics/layouts need explicit versioning and compatibility review.

## Trust, size and failure behavior

1. Encode only a canonical `parseExpansionSave` result. Never truncate history.
2. The shared schema rejects unknown fields and checks structural limits. It
   does **not** run the game simulation or prove the claimed progress.
3. On receive, validate structure before unpacking; reject reserved opcodes,
   sparse arrays, tick overflow and out-of-order commands.
4. Reconstruct the complete original replay prefix and pass it through existing
   deterministic checkpoint restoration before adopting any save.
5. Keep the existing 96,000-byte local JSON limit. A structurally valid compact
   cloud payload can expand beyond it; reject that payload without replacing
   local progress. This package does not enlarge the local persistence budget.
6. Existing replay validation permits out-of-grid no-op commands. Such histories
   cannot use this compact encoding: preserve them locally and report an explicit
   unsynced error. Real `ExpansionRunSession` captures only effective commands.
7. The size guard measures UTF-8 for the **whole** StoreRequest, reserving a
   maximum safe-integer revision and two 36-character UUIDs. The worst structural
   payload (5000 maximum integers, all clears, maximally JSON-escaped seed) is
   46,677 bytes, below the shared 65,536-byte limit. This is a wire bound, not a
   promise that a fabricated 5000-command checkpoint is semantically valid.

No failures authorize falling back to the old standalone RPC, silently dropping
a checkpoint, adopting guest saves into an account, or marking progress synced.
Those UI and account reconciliation behaviors must be implemented in the next
package before this codec can be used for cloud persistence.

## Verification and release gates

- `npm run verify:expansion-save-codec`: 100 exact checkpoint round trips and
  continued wins across all 25 levels, no-checkpoint mapping, settings/clears,
  all cells/opcodes at tick boundaries, corruption/identity/size rejection,
  and explicit out-of-grid no-op rejection without modifying local history.
- Companion kit: full unit suite, typecheck and build; Match tests unchanged
  except the additive registry expectation. Breach slots and payloads isolated.
- `npm run check:expansion-save-contract -- /path/to/built/account-kit`: exact
  schema descriptor comparison and all 102 payload fixtures accepted by the
  candidate registry, rejected as Match campaign data.
- The local game schema mirror is temporary because v0.2.4 has no Breach export.
  After the reviewed kit release, replace the mirror import with its released
  `BREACH_EXPANSION_V1` export and run this contract check in normal CI against
  the installed kit. Do not activate cloud saves with a divergent mirror.
- Review/release kit first; pin the released kit in Nexus and verify its existing
  generic save service and database prerequisites. Deploy compatible server
  before enabling account-owned reconciliation and writes in the game.
- Then test sign-in/out, account switching, guest isolation, stale completions,
  offline/reconnect, conflicts and background acknowledgments through the shared
  service. These end-to-end/auth/cross-device gates are **not** proven by codec tests.

No new Supabase migration is introduced here. The old expansion-specific RPC
migration remains an unapplied prototype, not the release deployment path.
