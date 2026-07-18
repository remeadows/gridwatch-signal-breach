# Expansion Chapter 1: Rusher Specification

Status: approved for an isolated deterministic prototype on 2026-07-18. This
does not authorize adding a Rusher to a playable level, generating/importing its
raster asset, changing a validator bundle, deploying an Edge Function, migrating
Supabase, or exposing expansion gameplay.

## 1. Purpose and scope

The Rusher is Chapter 1's single new enemy family. Its job is to make a
well-routed but lightly covered lane feel urgent without adding a new targeting,
collision, status, or pathing system. The player answer is to create enough ICE
exposure on the route, optionally using the already-prototyped Latency Trap to
turn one short pass into two ICE shots.

This is a specification-only batch. It may be used to approve the enemy's
identity and later guide an isolated data/simulation prototype and a separate
asset-intake request. It must not author any Chapter 1 map or wave.

## 2. Proposed player-facing contract

Tooling and briefing copy must describe the Rusher in one row:

```text
RUSHER — FAST, FRAGILE ROUTE ATTACK
Moves every tick. Keep it in ICE coverage; a Latency Trap buys one more shot.
```

Pre-wave callout:

```text
RUSHERS INBOUND — fast contacts on the signal route. Cover their lane with ICE.
```

The player must be able to infer all of the following without inspecting a
stat screen:

1. It follows the signal route toward the Core.
2. It moves faster than every current standard route enemy.
3. It is fragile enough for two normal ICE hits to neutralize.
4. A Latency Trap delays movement; it does not block the Rusher or damage it.

## 3. Proposed deterministic data contract

The first implementation must use an expansion-only enemy definition and
`expansion-v1` content/ruleset identity. It must not append `rusher` to the
current campaign's enemy union, wave weights, `phase4-v1` tuning, or legacy
replay vocabulary.

| Property | Proposed value | Reason |
| --- | ---: | --- |
| Identifier | `rusher` | Expansion-only, stable content identifier. |
| Maximum HP | 6 | Exactly two current 3-damage ICE hits; fragile by design. |
| Movement cadence | Every 1 active tick | Establishes the Chapter 1 speed-pressure lesson. |
| Corruption cadence | Every 6 active ticks | Matches Probe corruption pressure; speed, not rapid corruption, is its threat. |
| Spawn batch size | 1 | Keeps each entrant and trap charge legible. |
| Chew damage | 1 | It may use normal boxed-in route behavior but is not a wall-breaker. |
| Core contact damage | 1 | It is dangerous through speed/concurrency, not a high-damage breach. |
| Targeting | `route` | It never retargets player hardware. |
| Death spawn | None | No hidden second threat or new on-death system. |
| Special movement | None | No jump, phase, teleport, shield, or immunity. |

The value `moveEveryTicks: 1` means a Rusher moved at active tick *t* is next
eligible at *t + 1*. If a Rusher enters a charged Latency Trap on tick *t*, the
approved Latency Trap contract writes `lastMoveTick = t + 3`; with the Rusher's
one-tick cadence, its next movement is tick *t + 4*. The added wait is exactly
three active ticks and does not alter the Rusher definition globally.

## 4. Counterplay and non-overlap

| Player response | Expected result | Must not become |
| --- | --- | --- |
| One normal ICE exposure tick | Rusher survives at 3 HP and continues if it can move next tick. | An automatic one-shot answer. |
| Two normal ICE exposure ticks | Rusher is neutralized. | A requirement for Overclock or a new weapon. |
| Charged Latency Trap inside ICE coverage | Entry consumes one charge, Rusher waits three active ticks, and ICE can take the second shot. | A damaging trap or route blocker. |
| Charged Latency Trap outside ICE coverage | Rusher is delayed but remains alive. | A self-sufficient defense. |
| Firewall | Continues to control the route and can buy more time if the Rusher is boxed in. | An obsolete alternative to the trap. |

The Rusher must not receive special immunity to ICE, Firewalls, corruption,
Scrubbers, Overclock, or normal deterministic movement. Existing rules decide
those interactions. The only Chapter 1-specific interaction is that entering a
charged Latency Trap applies the already-approved generic three-tick movement
delay.

## 5. Simulation and replay boundary

When implementation is separately approved, keep the Rusher in pure
`src/sim/` expansion content/data. The feature must preserve the tick order:

```text
economy -> spawns -> movement -> latency traps -> ICE combat -> corruption
-> scrubbing -> signal/core resolution -> wave transition
```

The data and replay boundary must satisfy these invariants:

- Rusher spawn selection is valid only for a published `expansion-1` level.
- A legacy or `phase4-v1` replay cannot contain `rusher` data and must retain
  its current terminal state, event sequence, score, and tick count.
- The pre-existing `expansion-v1` no-content guard continues rejecting all
  expansion payloads before simulation and database access until a reviewed
  content registry is published.
- No new global enemy modifier, browser timer, renderer-owned state, or
  non-deterministic randomness may control Rusher movement.
- The Rusher does not require a new replay command. Spawn and movement remain
  deterministic consequences of level content and the fixed seed.

## 6. Required deterministic evidence before any Chapter 1 content

The later implementation PR must add fixed-seed tests that assert relevant
state and events, not only final scores.

| ID | Scenario | Required result |
| --- | --- | --- |
| RU-01 | Expansion-only registry lookup | `rusher` resolves only inside the published expansion content boundary; legacy and `phase4-v1` do not gain it. |
| RU-02 | Cadence | An unimpeded Rusher moves on consecutive active ticks and never moves twice in one tick. |
| RU-03 | ICE exposure | A 6-HP Rusher has 3 HP after one normal ICE hit and is neutralized after the second. |
| RU-04 | Latency Trap entry | A Rusher entering a charged trap consumes one charge, emits the trap event, and next moves at `entryTick + 4`. |
| RU-05 | Trap without ICE | The same delayed Rusher remains alive if no ICE covers the trap tile. |
| RU-06 | Trap traversal | A Rusher can enter and leave the trap tile; shortest movement path and signal route are unchanged. |
| RU-07 | Normal blockage | A Rusher follows existing route/boxed-in Firewall handling; it gains no bypass or enhanced chewing behavior. |
| RU-08 | Fixed prototype scenario twice | Same initial state and tick count yield an identical full state/event sequence. |
| RU-09 | Frozen campaign fixtures | Existing legacy and `phase4-v1` fixtures remain byte-equivalent in their asserted results. |
| RU-10 | No-content rejection | A structurally valid expansion replay remains rejected before simulation/database access until the reviewed registry is published. |

The prototype counter in the Latency Trap specification remains the narrow
reference case: at tick 11, three 6-HP one-tick Rushers are `3/3` neutralized
with a charged trap under ICE coverage and `0/3` neutralized without it.

RU-08 proves deterministic prototype behavior without pretending unpublished
content has a canonical scored replay. The first reviewed Chapter 1 content
batch must separately add a fixed-seed `expansion-v1` replay that proves
identical terminal state, event sequence, score, tick count, and canonical
replay result on repeated runs.

## 7. Visual and asset-intake contract

No raster asset is authorized by this document. Before any generated/imported
Rusher art is committed, create a separate asset-intake record in
`docs/VISUAL_ASSET_MANIFEST.md` and `src/assets/board/asset-manifest.json`.
That record must include owner/license, source-master hash, exact prompt,
source dimensions, crop-safe area, optimized runtime dimensions, alpha result,
compressed byte size, and owner approval.

The proposed visual target is a low-profile, forward-leaning interceptor drone:

| Requirement | Constraint |
| --- | --- |
| Board silhouette | Long pointed nose forward; rear stabilizers make direction readable at 40–55 CSS pixels. |
| Camera/light | Same orthographic ~70-degree board camera and cyan/magenta rim-light language as the approved Phase 6 roster. |
| Material | Dark ceramic/carbon body with restrained cyan core; no bright effect that competes with ICE blue or Core magenta. |
| Scale | Normal intrusion body remains about 48% of a tile; no larger than Probe's occupied footprint. |
| Motion cue | Renderer-owned forward trail/afterimage is optional, reduced-motion safe, and never changes hitboxes, cadence, or replay. |
| Tactical overlays | Existing hostile HP, spawn, selection, and neutralization feedback remain authoritative; artwork cannot replace them. |
| Performance | One local alpha WebP/PNG only; match the Phase 6 fallback path and remain inside the aggregate 1.5 MiB runtime cap. |

Asset acceptance requires contextual board renders at 320×568, 390×844,
568×320, and desktop. At each mobile size, the owner must identify the Rusher's
direction and distinguish it from Probe, Spoof, and ICE effects without labels.
Glyph fallback remains mandatory until the raster asset has decoded and passed
the same contextual review.

## 8. Explicit non-goals

This specification does not authorize:

- Rusher production tuning, code, renderer work, audio, or asset generation;
- Chapter 1 maps, five-level release, twenty-five waves, boss design, or any
  other enemy family;
- a public expansion launch path, campaign navigation enablement, or scoring;
- a new validator bundle, Edge Function deployment, Supabase migration/RPC,
  leaderboard category, or GridWatchGamesDB write; or
- changes to the original three-sector/twelve-wave campaign, its identities,
  `phase4-v1`, legacy replay behavior, or the shared GridWatchGamesDB behavior
  for Grid Drift and GridWatch Match.

## 9. Approval and follow-on sequence

1. Owner approves or adjusts the exact Rusher contract above.
2. Build an isolated expansion-only Rusher/Latency Trap simulator prototype
   with the RU tests and unchanged legacy validator artifact.
3. Complete a separate asset-intake request and contextual visual approval;
   do not generate a bulk enemy roster before the mechanic evidence passes.
4. Review desktop/mobile presentation evidence against the counterplay table.
5. Only then author Chapter 1's five maps and twenty-five waves in a separate,
   reviewed content batch.

At every implementation push, run Codex and CodeRabbit review. Resolve all
Critical and Warning findings before merge. Do not begin Chapter 2 work from
this branch.
