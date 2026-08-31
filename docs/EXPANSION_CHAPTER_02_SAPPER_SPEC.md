# Expansion 1 Chapter 2 Sapper Mechanic Proof

Status: local prototype approved; production mechanic and art not yet approved
Owner approval to prototype: 2026-07-19
Campaign: `expansion-1`
Future chapter: Chapter 2, Levels 6-10

## 1. Purpose

Chapter 2 is about hardware targeting and formation spacing. The Sapper is the
smallest mechanic that can prove that idea without also introducing Honeypot,
Jammer, a boss, production art, or authored level content.

The prototype must answer one player-facing question:

> Can the player read the Sapper's target, spread important hardware, and
> neutralize it far enough away that its death pulse does not punish the build?

The answer must be visible in one local Canvas2D lab and reproducible by pure,
DOM-free tests before the mechanic is considered for production.

## 2. Scope boundary

This batch may add:

- one expansion-only Sapper prototype module;
- deterministic verification for the contract below;
- one asset-free, localhost-only mechanic lab at `?sapper-preview=1`;
- documentation and handoff updates.

This batch does **not** authorize:

- adding `sapper` to the playable expansion enemy vocabulary;
- Levels 6-10, their maps, waves, balance data, or content hashes;
- Sapper production art or any new asset-family manifest entry;
- Honeypot, Jammer, or a Chapter 2 boss;
- a new replay ruleset, validator bundle, score category, migration, Edge
  Function deployment, leaderboard write, or public feature flag;
- any change to Chapter 1, the frozen V2 campaign, `phase4-v1`, or the other
  games using GridWatchGamesDB.

The prototype module must remain absent from `src/sim/index.ts`, the playable
expansion configuration, and the server validator bundle.

## 3. Proposed deterministic contract

The working values are deliberately easy to reason about and remain proposals
until owner acceptance of the local lab.

| Field | Prototype value | Intent |
|---|---:|---|
| HP | 16 | Four Expansion ICE hits at 4 damage each |
| Movement cadence | every 2 active ticks | Slow enough to create a spacing decision |
| Direct chew damage | 8 | Breaks an unattended 24 HP Firewall in three attacks |
| Core contact damage | 2 | Fallback only; not the mechanic's primary threat |
| Death-pulse damage | 6 | Destroys an adjacent 6 HP Relay and wounds tougher hardware |
| Death-pulse range | Manhattan 1 | Orthogonal neighbors only; diagonals are safe |
| Spawn batch | 1 | Prevents pulse stacking from becoming unreadable by default |

### 3.1 Target selection

At each eligible movement tick, a Sapper selects exactly one target:

1. Find all reachable Firewalls. If at least one exists, select the Firewall
   with the shortest traversable path.
2. If no Firewall is reachable, select the nearest reachable Relay, ICE,
   Scrubber, or Overclock hardware.
3. If no hardware is reachable, path toward the Core.
4. Equal path lengths use stable board order: lowest `y`, then lowest `x`.
5. Path neighbors use north, east, south, west order. Void and non-target
   hardware block traversal.

Firewall priority is strict: a farther reachable Firewall wins over a nearer
Relay. This is the pre-wave telegraph and the formation-planning hook.

### 3.2 Tick order

The prototype executes one active tick in this order:

1. Process Sappers by ascending intrusion ID.
2. On an eligible movement tick, move one orthogonal cell toward the selected
   target, or chew the target if it occupies the next cell.
3. Resolve Expansion ICE coverage by ascending intrusion ID for 4 damage.
4. When a Sapper reaches zero HP, emit one death pulse.
5. Apply that pulse to orthogonally adjacent hardware in board order
   (`y`, then `x`). Each piece is hit at most once by that Sapper.
6. Remove destroyed hardware. A death pulse never chains, damages the Core, or
   creates another pulse.

No browser time, random source, object iteration order, or animation state may
affect the result.

## 4. Counter and failure mode

### Counter: standoff formation

- Put the Firewall ahead of the Relay/ICE cluster.
- Leave at least one clear tile between the expected neutralization tile and
  important hardware.
- Cover the approach with ICE so four hits land before the Sapper becomes
  orthogonally adjacent.

Expected result: the Sapper is neutralized and its pulse affects zero hardware.

### Failure: clustered formation

- Put Relay or ICE beside the Sapper's likely death tile near its target
  Firewall.
- Use the same ICE damage and Sapper timing as the safe formation.

Expected result: the pulse hits every adjacent hardware tile once, destroying
the 6 HP Relay and visibly damaging the Firewall and ICE.

The local lab must provide both formations with the same enemy stats and combat
timing so the spacing decision—not hidden tuning—is responsible for the
difference.

## 5. Required verification

| Gate | Required evidence |
|---|---|
| SA-01 | Sapper exists only in the isolated prototype registry |
| SA-02 | Exact prototype constants match Section 3 |
| SA-03 | Reachable Firewall wins over a closer non-Firewall |
| SA-04 | Equal targets resolve by stable board order |
| SA-05 | Movement cadence and 8-damage chewing are exact |
| SA-06 | Four 4-damage ICE hits neutralize one Sapper |
| SA-07 | Pulse hits orthogonal hardware once and excludes diagonals |
| SA-08 | Standoff formation takes zero hardware damage |
| SA-09 | Clustered formation demonstrates the documented failure |
| SA-10 | Identical fixed input produces identical states and events |
| SA-11 | Representative frozen V2 replay remains unchanged |
| SA-12 | Chapter 1 content/replay gates and validator bytes remain unchanged |

## 6. Local acceptance gate

Serve the completed batch only at:

```text
http://127.0.0.1:4177/?sapper-preview=1
```

The owner should test both formation modes on desktop and mobile web, use Step,
Auto, and Reset, and confirm that target priority and pulse damage are readable
without production art. Acceptance authorizes a separate Sapper visual-intake
batch; it does not authorize Chapter 2 content, Honeypot, Jammer, backend work,
or publication by itself.
