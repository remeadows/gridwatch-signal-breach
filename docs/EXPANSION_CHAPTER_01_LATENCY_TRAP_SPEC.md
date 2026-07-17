# Expansion Chapter 1: Latency Trap Specification

Status: approved for an isolated deterministic prototype on 2026-07-17. It
does not authorize an authored expansion level, a raster asset, a validator
deployment, a Supabase migration, or an expansion-client release.

Date: 2026-07-17

## 1. Approved prototype contract

The owner approved the following first Chapter 1 mechanic for an isolated
`expansion-v1` prototype:

| Property | Proposed value |
| --- | --- |
| Player-facing name | Latency Trap |
| Tool identifier | `latencyTrap` |
| Place cost | 10 bandwidth |
| Build-phase sale refund | Full cost, following the existing build-sale rule |
| Active-wave sale refund | 4 bandwidth |
| Charges | 3 intrusions entering the tile |
| Effect | Add 3 active simulation ticks to the intruding unit's next move delay |
| Damage | None |
| Signal role | None; it does not carry, extend, or sever signal |
| Pathing role | Traversable; it cannot block, reroute, or be chewed through |
| Placement | Empty, non-perimeter board tile only |
| Depletion | Remove itself immediately after its third trigger |

The values above are the prototype baseline, not a published balance promise.
They may be tuned before any level is published. Once an `expansion-v1` level
is accepted for leaderboard scoring, a material change requires a new immutable
content/ruleset identity rather than a mutation of this behavior.

## 2. Player contract

Tool card copy:

```text
LATENCY TRAP
10 BW - DELAY 3 INTRUSIONS
The first three intrusions that enter are delayed. It does not block a route.
```

Pre-wave briefing copy:

```text
FAST INTRUSIONS INBOUND - place a LATENCY TRAP on their lane to create ICE time.
```

The player must understand these facts before launching the tutorial wave:

1. The trap is a limited-use timing tool, not a wall.
2. It is consumed by the first three intrusions to enter its tile.
3. It gives ICE more shots; it does not attack or repair anything itself.
4. A Firewall still controls the route. A trap never creates a detour.

The board presentation must make the number of remaining charges visible with
three small procedural pips. The pips and trigger pulse are render-only and
must not become a second source of game state.

## 3. Why this mechanic belongs in Chapter 1

Chapter 1 re-establishes routing while introducing fast pressure. The Latency
Trap gives the player a simple, readable response to a fast fragile enemy
without replacing the existing decisions:

| Existing tool | Remains responsible for | Latency Trap must not replace it |
| --- | --- | --- |
| Relay | Carrying and extending the Source-to-Core signal route | The trap never carries signal. |
| Firewall | Blocking a lane and forcing a detour | Intrusions walk through a trap; it never changes a path. |
| ICE turret | Damaging/neutralizing intrusions | The trap deals zero damage and has no targeting. |
| Scrubber | Recovering corrupted ground | The trap neither cleanses nor protects a corrupted tile. |
| Overclock | Increasing adjacent ICE damage | The trap adds time, not damage. |

At the proposed cost, a player with the current Sector 1-style 30 bandwidth
opening can choose one trap plus one ICE turret and still have 6 bandwidth. It
cannot substitute for an 8-bandwidth Firewall: it has no blocking or damage
absorption behavior and disappears after three entries.

## 4. Exact deterministic behavior

### 4.1 Placement and sale

`latencyTrap` is a selectable player tool only in an expansion level that lists
it in `toolsUnlocked`. A placement succeeds only when all of the following are
true:

- the game is neither won nor lost;
- the target tile is in bounds, empty, and not corrupted;
- the target is not Source, Core, a void, the board perimeter, another unit, or
  occupied by an intrusion;
- the player has at least 10 bandwidth; and
- the level explicitly unlocks the tool.

The perimeter restriction preserves the current perimeter spawn contract. A
trap cannot deny, reserve, or silently reshape a spawn candidate.

The trap follows the standard sale timing rule: a build-phase sale restores 10
bandwidth and an active-wave sale restores 4 bandwidth. A depleted trap removes
itself, so it cannot be sold after its last charge is spent. There is no
cooldown button, re-arm action, manual targeting, or charge transfer.

### 4.2 Traversal and triggering

The trap occupies a tile but is explicitly traversable:

- normal intrusions may enter and leave it exactly as they enter an empty tile;
- a Spoof that jumps over it does not trigger it; a Spoof that lands on it does;
- the trap is not a movement blocker, a unit target, a corruption target, or a
  valid chew target;
- it has no HP and no route/signal semantics; and
- a Hunter ignores it when selecting hardware targets.

After `moveIntrusions()` completes on an active tick, process entered traps in
stable intrusion-id order. An intrusion has entered when its `position` differs
from `previousPosition` and its new tile is a charged latency trap. For each
such entry:

1. consume exactly one charge from that tile;
2. set the intruder's move timing so its next movement is delayed by exactly
   three additional active ticks beyond its normal `moveEveryTicks` cadence;
3. emit one deterministic `latencyTrapTriggered` event; and
4. if this was charge three, replace the trap tile with `empty` in the same
   state transition.

Do not trigger a trap when an intrusion is stationary on it, spawns on it, or
is killed later in the same tick. The perimeter restriction prevents normal
wave spawns from originating on a trap. Multiple intrusions entering the same
trap in one tick consume charges in ascending intrusion-id order; any entrant
after the third passes through normally.

The proposed implementation must use the simulator tick count, never a browser
timer. With the current 350 ms tick length, a three-tick increment buys 1.05
seconds of movement time. It does not pause combat: ICE continues to fire on
each active tick while the intrusion waits.

### 4.3 State and event contract

The implementation PR may refine exact TypeScript names, but it must preserve
the following information and invariants:

```ts
type TileKind = /* existing kinds */ | "latencyTrap";
type PlayerTool = /* existing tools */ | "latencyTrap";

type LatencyTrapDefinition = Readonly<{
  cost: 10;
  activeSaleRefund: 4;
  charges: 3;
  extraMoveDelayTicks: 3;
}>;

type TileState = Readonly<{
  kind: TileKind;
  hp?: number;
  progress?: number;
  charges?: number; // latencyTrap only: integer 1..3 while present
}>;

type IntrusionState = Readonly<{
  // existing fields
  lastMoveTick: number; // advanced deterministically by the trap's 3 ticks
}>;

type SimEvent =
  | /* existing events */
  | Readonly<{
      type: "latencyTrapTriggered";
      tick: number;
      intrusionId: number;
      position: GridPosition;
      remainingCharges: number;
      extraMoveDelayTicks: 3;
}>;
```

`latencyTrap` must not be forced through the existing `UnitDefinition` HP
contract. It is player hardware, but it has no HP. The implementation may add a
broader `HardwareKind`/capability model or a dedicated trap definition; it must
not invent a fake positive HP solely to reuse firewall/relay code. Generic
targeting, corruption, and damage paths must consult the explicit capability
model before accessing unit HP.

The effect must be represented as an adjustment to deterministic move timing,
not by mutating an enemy definition, globally slowing an enemy kind, using a
wall-like path rule, or relying on renderer state. Applying the effect after
movement preserves the existing tick order:

```text
economy -> spawns -> movement -> latency traps -> ICE combat -> corruption
-> scrubbing -> signal/core resolution -> wave transition
```

For the current movement condition (`tickCount - lastMoveTick >=
moveEveryTicks`), the exact prototype update is:

```ts
lastMoveTick = state.tickCount + 3;
```

That preserves the normal enemy cadence and adds exactly three active ticks to
the next move. Do not replace it with a global status timer or subtract from
`moveEveryTicks`.

This order means the entrant uses a charge even if ICE neutralizes it in that
same tick. That is deliberate: the trigger occurred before the shot, and it
keeps event order deterministic.

## 5. Prototype boundaries

The first implementation must be an isolated expansion-mechanic PR. It may add
pure simulator helpers and deterministic tests, but it must not:

- author a playable Chapter 1 level or any of the 150 expansion waves;
- add the Rusher or another new enemy to a shippable campaign;
- alter `phase4-v1`, legacy inputs, existing sectors, current balance reports,
  or their golden replay outputs;
- change the deployed validator bundle, Edge Function, Supabase schema/RPCs,
  leaderboard categories, or any GridWatchGamesDB row;
- expose an expansion launch path, score submission, or public feature flag;
- generate or import a raster asset; or
- add a runtime dependency, API request, account requirement, native app, or
  non-deterministic clock.

The current Phase 7C no-write guard remains authoritative. Until a reviewed
content registry is published, any structurally valid `expansion-v1` replay
continues to stop before simulation and database access.

## 6. Required implementation shape

The later prototype must make "traversable hardware" an explicit simulation
concept. Do not solve the feature with scattered exceptions such as treating
the trap as an empty tile in one pathing function and as a normal unit in
another.

At minimum, centralize these predicates or equivalent data-driven properties:

```text
isBlockingHardwareKind(kind)
isTargetableHardwareKind(kind)
isCorruptibleHardwareKind(kind)
isTraversableHardwareKind(kind)
```

For `latencyTrap`, the required truth table is:

| Predicate/behavior | Result |
| --- | --- |
| Carries signal | No |
| Blocks movement | No |
| Is path target | No |
| Can be chewed | No |
| Can be corrupted | No |
| Can be selected/sold before depletion | Yes |
| Occupies its placement tile | Yes |
| Triggers on entry | Yes, while charges remain |

Existing unit behavior must be captured in regression tests before adding the
new predicate layer. In particular, Firewall must stay blocking/chewable,
Relay/Turret/Scrubber/Overclock must preserve their current targetability and
corruption behavior, and Spoof's one-wall jump must remain unchanged.

## 7. Acceptance tests

All tests are pure simulator tests and use fixed seeds. They must assert the
whole relevant state/event sequence, not only a final score.

| ID | Test | Required result |
| --- | --- | --- |
| LT-01 | Locked, unaffordable, terminal, out-of-bounds, perimeter, Source, Core, void, corrupted, hardware-occupied, and intrusion-occupied placement | Every named category is rejected with a stable reason; a valid empty interior tile succeeds. |
| LT-02 | Valid placement and build/live sale | Cost/refunds are exactly 10/10/4; standard sale behavior stays intact. |
| LT-03 | Route and path comparison against an empty tile | The trap never changes the computed signal route or the shortest movement path. |
| LT-04 | One entering intrusion | Exactly one charge is consumed, one event is emitted, and next movement is delayed by exactly 3 ticks. |
| LT-05 | One stationary intrusion on a trap | No extra charge/event/delay is applied. |
| LT-06 | Four entries into a three-charge trap | The first three, ordered by intrusion id for a tied tick, are delayed; the fourth is not; tile becomes empty. |
| LT-07 | Normal traversal, Spoof jump-over, and Spoof landing | Normal entry and landing trigger; jump-over does not. |
| LT-08 | Hunter targeting, chew path, and corruption contact | The trap is never targeted, chewed, or corrupted. |
| LT-09 | ICE fires during the delay | An ICE turret continues normal per-tick damage while an intrusion waits. |
| LT-10 | Fixed-seed replay twice | Identical terminal state, event sequence, score, tick count, and canonical replay result. |
| LT-11 | Representative frozen legacy/`phase4-v1` replay | The fixed golden loss keeps its terminal tick count and score. |

The prototype must also include this deterministic counter comparison:

- At active tick 10, three Rusher-like intrusions with 6 HP and a one-tick move
  cadence enter one charged trap tile.
- One ICE turret deals the current 3 damage per active tick and covers only the
  trap tile. Combat occurs after movement, as in the current tick order.
- Without the trap, each intrusion takes one 3-damage shot at tick 10, leaves
  before tick-11 combat, and all three remain alive at tick 11.
- With the trap, all three receive exactly a three-tick delay, remain for
  tick-11 combat, take a second shot, and all three are neutralized by tick 11.

The required measured result is exactly `3/3` neutralized with the trap versus
`0/3` without it at tick 11. The same test must prove the device is traversable
and does not increase the shortest path length. Exact Chapter 1 waves and
Rusher production tuning remain separate content decisions.

### 7.1 Separate artifact and compatibility gates

Do not conflate the pure prototype tests with artifact validation. Before a
prototype PR ships, run these independently:

```sh
npm run verify:latency-trap
npm run verify:replays
npm run balance:report
npm run build:validator
git diff --exit-code -- supabase/functions/submit-gridwatch-score/sim.bundle.js
```

The final command must be clean. This prototype is intentionally unexported
from the live simulator entry point, so it must not change the validator bundle
or the frozen legacy/`phase4-v1` simulation surface.

## 8. Balance and UX approval gates

Before the mechanic may appear in a Chapter 1 level, demonstrate all of the
following:

- a player can explain the three-charge limit and non-wall behavior from the
  tool card plus a pre-wave callout;
- a trap placement is useful against fast pressure but not a mandatory answer
  to ordinary Probes;
- an ICE-free trap plan cannot neutralize enemies merely by delaying them;
- placing a trap behind an ICE coverage area is materially better than placing
  it where no ICE can exploit the time;
- a Firewall still has a distinct and stronger route-control purpose;
- desktop and mobile screenshots show charge pips, selection, route, range,
  and corruption without ambiguity; and
- no existing campaign state, replay, leaderboard row, or shared database
  behavior changes.

The owner must review the deterministic evidence and the mobile/desktop
prototype presentation before the separate Rusher, asset-intake, map, and wave
work begins.

## 9. Follow-on sequence

1. Create one isolated prototype PR containing only the deterministic mechanic,
   its tests, and compatible expansion-only model plumbing.
2. Run Codex and CodeRabbit reviews before the push; resolve all Critical and
   Warning findings.
3. Review the counter-positive/counter-negative evidence and mobile/desktop
   presentation with the owner.
4. Separately specify and approve the Rusher, then perform its asset intake.
5. Only after both mechanics/art gates pass, author Chapter 1's five maps and
   twenty-five waves in their own reviewed content batch.

No step in this sequence authorizes Chapter 2 work or bulk asset generation.
