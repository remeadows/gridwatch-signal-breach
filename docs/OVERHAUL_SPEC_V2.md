# GridWatch: Signal Breach — v2 Campaign / Depth / 3D Overhaul Spec

This is an implementation spec for a coding agent. It is self-contained: everything needed to
implement is in this document plus the repository source. Read the **Hard constraints** first.
The v1 spec (`docs/OVERHAUL_SPEC.md`) shipped successfully; this spec follows the same
conventions.

## Why

The game looks sellable now but plays once:

- `LEVEL_CONFIG.defaultSeed` is hardcoded, so every playthrough has identical spawns. The game
  is a puzzle with one solution.
- One 8×8 map, straight Source→Core route, 5 waves, done. No reason to return.
- ICE Turret (16cr, 6 dmg/tick, range 1) two-shots Probes and Spoofs and four-shots Crawlers —
  it dominates everything. Firewall (12cr, +8 corruption-delay ticks, bypassed by Spoofs) is
  strictly dominated and never worth buying.
- Corrupted tiles are permanent with no counterplay; the board only degrades.
- Navigation dead-ends: the end screen only offers "Restart", and the briefing is unreachable
  during play. The briefing never explains bandwidth, the relay range-2 connection rule,
  corruption permanence, prep/skip, or core regen.

Goal: a replayable 3-sector campaign with real build decisions (mazing, cleansing, buffing),
new threats with clear counters, and a tilted 2.5D presentation with a real lighting model —
while keeping the sim pure, deterministic, and dependency-free.

## Hard constraints

- **`src/sim/` changes ARE in scope this time** (unlike v1), but the sim must remain: pure and
  immutable (`createGameState`/`applyCommand`/`tick` signatures preserved, extended only with
  options), **deterministic given seed** (all randomness through `src/sim/rng.ts`; no
  `Math.random()`, no `Date.now()`, no DOM inside `src/sim/`), with all tuning numbers in
  `src/data/`.
- **Zero new npm dependencies. No external fetches. No binary assets.** Everything
  procedural/inline.
- **`npm run build` (tsc + vite) must pass after every phase.** Each phase below is
  independently shippable.
- Render-layer perf rules from v1 still apply: no `shadowBlur` in the per-frame path, no
  per-frame allocation of gradients/Path2Ds/canvases, cached background layer stays.
- All persistence in `localStorage` wrapped in `try/catch` (existing pattern in
  `src/ui/screens.ts`); on failure the game still runs with defaults.
- **`HANDOFF.md` must be updated** in the final phase: its "Do not add … additional levels, or
  extra waves" caveat is superseded by this spec (product scope changed). Also update the
  title tagline / briefing copy that says "five waves".

## Current architecture (orientation — verified)

- `src/sim/` — pure model. `tick()` pipeline: economy → spawn → move → combat → corruption →
  signal/integrity (`tick.ts`). Enemy movement: BFS to "targets" = non-source/core route
  tiles, fallback `[core]`; enemies may *enter* target tiles and corrupt them by standing
  (`intrusions.ts`, `corruption.ts`). All units (relay/firewall/turret) are already impassable
  to non-target movement; spoofs jump over a single unit tile (`getIntrusionNeighbors`).
  Firewall is a signal carrier (`routing.ts: isSignalCarrierKind`) with a corruption-delay
  bonus (`corruption.ts: getRequiredCorruptionTicks`).
- `src/data/` — `level.ts` (one map), `units.ts`, `enemies.ts` (note: `spawnWeight` and
  `INTRUSION_SPAWN_TUNING` are dead/unread — weights live on waves), `waves.ts` (5 waves),
  `briefing.ts`, `taunts.ts`.
- `src/render/` — `canvas.ts` (`getBoardMetrics`, `getGridPositionFromClientPoint` — the
  **single** pointer-math entry, called only from `pointer.ts`), `renderer.ts`
  (`drawGrid(context, size, state, frame)`, flat top-down), `background.ts` (cached
  full-canvas layer: backdrop+circuit+grid+brackets+vignette), `icons.ts`/`iconPaths.ts`
  (Path2D glyphs + glow sprites), `animator.ts` (pulse/hash/polyline helpers).
- `src/main.ts` — closure state `state`/`selectedTool`/`screen`/`hoverTile`/`lastTickTime`;
  RAF loop; sim tick gated on `screen === "playing"` with 350ms catch-up loop;
  `lastTickTime = performance.now()` reset on every entry into playing.
- `src/ui/screens.ts` — `AppScreen = "title" | "briefing" | "playing"`, keyed re-render via
  `root.dataset.screenKey`, `hasSeenBriefing`/`markBriefingSeen` localStorage helpers.
- `src/ui/overlays.ts` — prep panel + end ("terminal") panel with only Restart.
  `src/ui/hud.ts` rebuilds its DOM **every frame** (no keying) — fine for text, unsafe for
  buttons (a button recreated between pointerdown and pointerup never fires `click`).

---

## 1. Sim data model — sectors, levels, new tile/unit/enemy kinds

### 1.1 Type changes (`src/sim/types.ts`)

```ts
export const TILE_KINDS = [
  "empty", "relay", "firewall", "turret",
  "scrubber", "overclock",          // NEW unit tiles
  "void",                           // NEW terrain (never placeable/walkable)
  "corrupted",
] as const;

export type UnitKind = "relay" | "firewall" | "turret" | "scrubber" | "overclock";
export type PlayerTool = UnitKind | "sell";

export type TileState = Readonly<{
  kind: TileKind;
  hp?: number;        // set for every player unit tile; chewed down by blocked enemies
  progress?: number;  // scrubber only: cleanse ticks elapsed
}>;

export type EnemyKind = "probe" | "crawler" | "spoof" | "hunter" | "splitter" | "goliath";

export type EnemyDefinition = Readonly<{
  maxHp: number;
  moveEveryTicks: number;
  corruptionTicks: number;
  spawnBatchSize: number;
  chewDamage: number;           // NEW: damage per attack against a blocking unit tile
  coreContactDamage: number;    // NEW: integrity drain per tick while standing on the Core
  targeting: "route" | "units"; // NEW: "units" = hunter behavior (§4.1)
  onDeathSpawn: Readonly<{ kind: EnemyKind; count: number }> | null; // NEW: splitter (§4.2)
}>;
// DELETE the dead `spawnWeight` field, and DELETE `INTRUSION_SPAWN_TUNING` from
// src/data/enemies.ts (verified unreferenced; confirm with rg before deleting).

export type WaveDefinition = Readonly<{
  /* ...all existing fields unchanged... */
  enemyWeights: Readonly<Record<EnemyKind, number>>; // now requires all 6 keys (compile-enforced)
  scriptedSpawns?: readonly Readonly<{ waveTick: number; kind: EnemyKind }>[]; // NEW (§4.4)
}>;

export type SimConfig = Readonly<{
  /* existing fields, MINUS firewallHardeningBonusTicks (removed — §3), PLUS: */
  sectorId: number;
  sectorName: string;
  toolsUnlocked: readonly PlayerTool[];   // sell always included
  scrubberCleanseTicks: number;
  overclockBonusDamage: number;
}>;

export type UnitDefinition = Readonly<{
  cost: number;
  sellRefund: number;   // 0 for scrubber (not sellable)
  hp: number;           // chew durability (§3.3)
}>;
```

New `SimEvent` variants (append to the union):

```ts
| Readonly<{ type: "unitDamaged"; tick: number; intrusionId: number;
             position: GridPosition; unitKind: UnitKind; hp: number }>
| Readonly<{ type: "tileCleansed"; tick: number; position: GridPosition }>
| Readonly<{ type: "coreBreach"; tick: number; intrusionId: number;
             amount: number; integrity: number }>
| Readonly<{ type: "intrusionSplit"; tick: number; parentId: number;
             childIds: readonly number[]; position: GridPosition }>
```

### 1.2 Level/sector definitions — new file `src/data/levels.ts`

`src/data/level.ts` is replaced by `levels.ts` (prefer migrating all imports; `GRID_SIZE`
stays exported, value 8, asserted equal across all sectors).

```ts
export type SectorDefinition = Readonly<{
  id: number;                 // 1-based
  name: string;
  codename: string;           // short UI label, e.g. "PERIMETER RUN"
  gridSize: number;           // always 8 in v2; assert at module load
  source: GridPosition;
  core: GridPosition;
  voidTiles: readonly GridPosition[];        // interior-only — NEVER on the perimeter ring
  initialTiles: readonly InitialTileDefinition[]; // must yield a LIVE route at tick 0
  waves: readonly WaveDefinition[];          // per-sector wave list, waveIndex resets per sector
  toolsUnlocked: readonly PlayerTool[];
  tagline: string;            // one-liner for sector-select card
}>;

export const SECTORS: readonly SectorDefinition[]; // length 3
export const GRID_SIZE = 8;
export const CORE_TUNING = {
  initialCoreIntegrity: 150, coreIntegrityMax: 150,
  coreIntegrityDrainPerSeveredTick: 2, coreIntegrityRegenPerLiveTick: 1,
  simulationTickMs: 350, defaultSeed: "gridwatch-signal-breach-phase-3",
} as const;
```

Two invariants, enforced by `assert` at module load in `levels.ts`: (a) no void tile on the
perimeter (guarantees spawns and guarantees enemies are never void-locked — any blockage must
involve chewable player units, see §3.4); (b) no void/initial tile on source/core.

**Sector maps** (x→, y↓; `S` source, `C` core, `R` initial relay, `#` void):

Sector 1 — "PERIMETER RUN" (existing map, unchanged): S(0,3), C(7,4), relays
(2,3),(4,3),(6,3). Tools: relay, firewall, turret, sell. Waves 1–5.

Sector 2 — "RELAY CANYON": S(1,6), C(6,1). Voids: (2,2),(3,2),(4,2),(2,3),(4,4),(5,4),(4,5).
Initial relays: (1,4),(1,2),(2,1),(4,1). Tools: + scrubber. Waves 6–9.

```
   0 1 2 3 4 5 6 7
0  . . . . . . . .
1  . . R . R . C .
2  . R # # # . . .
3  . . # . . . . .
4  . R . . # # . .
5  . . . . # . . .
6  . S . . . . . .
7  . . . . . . . .
```

Sector 3 — "CORE VAULT": S(7,7), C(3,4). Voids:
(2,2),(3,2),(4,2),(5,2),(1,3),(1,4),(1,5),(5,3),(5,4),(2,6),(4,6),(5,6). Initial relays:
(6,6),(6,4),(4,4). Tools: + overclock. Waves 10–12. The vault has two gates: south
(3,6)→(3,5) and east (5,5)→(4,5).

```
   0 1 2 3 4 5 6 7
0  . . . . . . . .
1  . . . . . . . .
2  . . # # # # . .
3  . # . . . # . .
4  . # . C . # R .
5  . # . . . . . .
6  . . # . # # R .
7  . . . . . . . S
```

Relay-chain verification (every hop must be Manhattan ≤ 2 — keep this property when editing
maps): S2: (1,6)→(1,4)→(1,2)→(2,1)→(4,1)→(6,1) all = 2. S3: (7,7)→(6,6)=2 →(6,4)=2 →(4,4)=2
→(3,4)=1. **Signal hops are distance-based and are NOT blocked by void tiles** (the signal is
wireless) — this is intentional and gives sectors 2–3 their flavor: relays can hop canyons
enemies must walk around.

### 1.3 Void tile semantics (exact touch-points)

- `intrusions.ts: canIntrusionEnter` — void is not enterable (it already only admits
  `empty`/`corrupted`/targets; just ensure void never becomes a target).
- `intrusions.ts: isSpawnable` — already requires `kind === "empty"`; no change needed.
- `commands.ts: placeUnit` — already requires `empty` (or `corrupted` for scrubber, §5.1); no
  change needed.
- `corruption.ts: isCorruptiblePosition` — void excluded (it already whitelists unit kinds).
- `routing.ts` — void is not a carrier (`isSignalCarrierKind` unchanged); voids do not block
  hops (no change).
- Spoof jumps cannot cross voids: `isBlocker` returns true only for **unit** tiles (§3.2),
  never void.

### 1.4 `createGameState` / `state.ts`

```ts
export type CreateGameStateOptions = Readonly<{
  seed?: string | number;
  sector?: number;                                // 1-based, default 1
  initialTiles?: readonly InitialTileDefinition[]; // test hook, overrides sector tiles
}>;
```

`createSimConfig(sectorId: number)` reads `SECTORS[sectorId - 1]` (throw on missing) +
`CORE_TUNING` + `UNIT_TUNING` + `ENEMY_TUNING`. `units` record gains the two new kinds and
`hp` per kind. Grid construction: apply `voidTiles` (kind `"void"`), then `initialTiles` —
initial unit tiles must get `hp` via the helper below.

New helper in `src/sim/grid.ts`:

```ts
export function setTile(grid: GridState, position: GridPosition, tile: TileState): GridState;
// setTileKind(grid, pos, kind) stays and delegates to setTile(grid, pos, { kind })
```

Unit placement (commands.ts, state.ts initial tiles) uses
`setTile(grid, pos, { kind, hp: config.units[kind].hp })` (scrubber additionally
`progress: 0`).

`src/sim/index.ts`: export the new types (`UnitKind`, `WaveDefinition`, etc. as needed by UI).

---

## 2. Per-run seed randomization (`src/main.ts` only — sim untouched)

The sim is already deterministic *given* seed; only the call site changes.

```ts
function makeRunSeed(): string {
  const fixed = new URLSearchParams(window.location.search).get("seed");
  return fixed ?? `run-${Date.now().toString(36)}-${Math.floor(performance.now()).toString(36)}`;
}
```

- Every `createGameState` call in `main.ts` (initial boot, `onRestart`, sector start) passes
  `{ seed: makeRunSeed(), sector: currentSector }`. Restart re-rolls the seed (URL `?seed=`
  pins it for testing/balance work — document in a comment).
- `LEVEL_CONFIG.defaultSeed` (now `CORE_TUNING.defaultSeed`) remains the fallback inside
  `createGameState` when no seed is given, so existing tests/dev flows stay deterministic.
- `Date.now()` lives only in `main.ts` (composition root). Nothing in `src/sim/` or
  `src/render/` may call it.

---

## 3. Firewall rework — the maze wall, plus chew-through

Design decision: firewalls become **absolute movement blockers that enemies can attack
("chew") when no path exists**. We do NOT forbid wall-off placements: a global connectivity
check on every placement is more code, produces confusing rejected clicks, and removes the fun
of walling. Chew-through gives walls a price (HP) and a counter. Spoof identity is preserved
by its **existing jump**: a spoof hops any single-thickness wall (double-thick walls and
corners stop it). To prevent a softlock discovered in analysis (an off-route relay/turret wall
would strand enemies *today* — path null → idle forever → wave never completes), chew applies
to **all** unit tiles, with firewalls simply 2–4× more durable. Firewall = "the wall you
*want* chewed last".

### 3.1 Rule summary

- Firewall tiles are **never enterable** by any enemy, even when on the route (remove them
  from the target list). They can no longer be corrupted by standing — the hardening-bonus
  mechanic is deleted (`firewallHardeningBonusTicks` removed from `SimConfig`,
  `corruption.ts: getRequiredCorruptionTicks` collapses to `definition.corruptionTicks`,
  `UNIT_TUNING.firewall.hardeningBonusTicks` deleted).
- Firewalls remain **signal carriers** (`routing.ts` unchanged) — an all-firewall route spine
  cannot be stand-corrupted, only chewed or out-flanked by core contact (§3.5).
- Every unit tile has `hp` (from `config.units[kind].hp`). When an enemy's path to all targets
  is blocked, it paths *through* units in a second BFS and attacks the first unit tile on that
  path. At `hp <= 0` the tile becomes **`corrupted`** (not empty): a breach is a scar — it
  severs any route through it, opens a lane (corrupted is enterable), and is reclaimable with
  the Scrubber (§5.1). Emit `unitDamaged` per attack and the existing `tileCorrupted` on
  breach.

### 3.2 `src/sim/intrusions.ts` — exact changes

- `getIntrusionTargets(state)` → `getTargetSets(state)` computed once per `moveIntrusions`:

```ts
type TargetSets = Readonly<{ route: readonly GridPosition[]; units: readonly GridPosition[] }>;
// route: state.signal.route minus source, core, AND firewall tiles; fallback [core] when empty.
// units: all tiles of kind relay|turret|overclock|scrubber (reading order); empty allowed.
```

  Per-intrusion targets: `targeting === "units"` → `units` set, falling back to the `route`
  set when no unit tiles exist; `"route"` → `route` set.
- `canIntrusionEnter(state, position, targetKeys)`: target membership no longer overrides
  firewalls — add `if (getTileKind(...) === "firewall") return false;` *before* the target
  check. (Defensive: firewalls are also filtered out of target sets.)
- `isBlocker` (spoof jump): true for any **unit kind** tile
  (`relay|firewall|turret|scrubber|overclock`) that is not a target; false for
  void/corrupted/empty.
- `moveIntrusions`: convert the `.map()` to a sequential `for` loop threading `grid`,
  `events`, and the rebuilt `intrusions` array, because chew mutates tiles mid-loop (later
  intrusions must see updated HP/breaches — deterministic, array order). Per intrusion, on
  its move-cadence tick:
  1. Primary BFS to its targets (as today, with the rules above). Path of length ≥ 2 → move
     to `path[1]`, reset `corruption`, emit `intrusionMoved` (existing).
  2. No path → **breach BFS**: identical except `getNeighbors` also admits unit tiles (all
     five kinds) as passable *search* nodes (void still impassable; spoof jumps still added).
     If found and `path[1]` is a unit tile → **attack instead of moving**:
     `newHp = tile.hp - definition.chewDamage`; emit `unitDamaged`; if `newHp <= 0` →
     `setTile(grid, path[1], { kind: "corrupted" })` + emit `tileCorrupted` (reuse the
     existing event shape; its `intrusionId` is the chewer). Set
     `lastMoveTick = tickCount` (an attack consumes the move), `previousPosition = position`
     (no render slide).
  3. Breach path found but `path[1]` is NOT a unit tile → move normally along it.
  4. No path at all → idle with `lastMoveTick` updated (existing behavior; unreachable given
     the no-perimeter-voids invariant — every enclosure contains chewable units).

Attack cadence is the enemy's `moveEveryTicks`; `chewDamage` values in §7 are per-attack and
were tuned with that in mind.

### 3.3 Sell/refund

Flat `sellRefund` regardless of remaining HP (accepted simplification; firewall refund is 4 of
10 so the exploit ceiling is trivial). `commands.ts: isUnitKind` extends to all five kinds,
but `sellUnit` early-returns for `"scrubber"` (consumable, refund 0 — see §5.1).

### 3.4 No placement restriction — justification (record in commit message)

Wall-offs are legal. Counterplay is built-in: every unit is chewable, so total enclosure
converts to a damage race the player paid for; core contact damage (§3.5) punishes "open
core, walled route" turtling. This keeps `placeUnit` O(1), avoids rejected-click confusion,
and is the classic TD answer.

### 3.5 Core contact damage (`src/sim/tick.ts`)

New rule: any intrusion **standing on the Core tile** drains integrity by its
`coreContactDamage` per tick. Without this, an all-firewall route makes enemies path to the
(enterable, harmless) core and idle forever — analysis confirmed this exploit. Implementation
in `tick.ts` after corruption, merged into the existing integrity math:

```ts
const contactDamage = withCorruption.intrusions
  .filter((i) => samePosition(i.position, config.core))
  .reduce((sum, i) => sum + config.enemies[i.kind].coreContactDamage, 0);
// integrity delta = (isLive ? +regen : -drain) - contactDamage, clamped to [0, max].
// Emit one coreBreach event per contacting intrusion (amount = its contribution,
// integrity = final value) so the renderer can flash/shake per breach.
```

Core damage from contact also triggers the existing shake path in `main.ts` — extend the
`shakeMagnitude` condition to `event.type === "coreDamaged" || event.type === "coreBreach"`.

---

## 4. New enemies (sectors 2–3)

All behavior deterministic: kind/spawn position via existing weighted `nextInt` rolls;
everything else (targeting, split placement) is RNG-free.

### 4.1 Hunter — "it hunts your hardware" (sector 2)

`targeting: "units"` (§3.2): BFS targets are ALL player unit tiles
(relay/turret/overclock/scrubber, never firewall), not just the route. It enters the target
tile and stand-corrupts it fast (`corruptionTicks: 3` — your turret becomes a corrupted tile).
Counter: kill it on approach (medium HP), wall it (it chews at 5, slowly through firewall 24),
scrub the scar. Briefing identity: *"Hunter: ignores the route — anything you built is the
target."*

### 4.2 Splitter — "kill it somewhere convenient" (sector 2)

`onDeathSpawn: { kind: "probe", count: 2 }`. Implemented in `src/sim/combat.ts`: in the
surviving-intrusions loop, when a dying intrusion has `onDeathSpawn`, append children
immediately: ids from `nextIntrusionId` (threaded through; combat now also returns updated
`nextIntrusionId`/`spawnedIntrusionCount`), positions = first `count` of
`[ownPosition, N, E, S, W]` (that fixed order) whose tile kind is `empty` or `corrupted` and
in bounds; fewer if blocked — no RNG. Children: full probe stats,
`spawnedTick`/`lastMoveTick` = current tick, count toward `spawnedIntrusionCount` but **not**
`waveSpawnedCount` (they're bonus population, not spawn budget) and may exceed
`maxActiveIntrusions` (cap applies to the spawner only; bounded by splitter count). Emit
`intrusionSplit` + `intrusionSpawned` per child. Wave completion is safe: children sit in
`intrusions`, so `isCurrentWaveComplete` waits for them. Counter: focus it down at a turret
cluster so the probes die in the same kill zone; never let it die deep in your lattice.
Briefing: *"Splitter: bursts into probes on death — choose where it dies."*

### 4.3 Goliath — wave-12 boss (sector 3)

Huge HP (90), slow (`moveEveryTicks: 4`), `corruptionTicks: 2` (melts what it stands on),
`chewDamage: 24` (one-shots a fresh firewall per attack — walls buy time, not safety),
`coreContactDamage: 6`. Counter: overclocked turret stacks along a long forced path. Briefing
(sector-3 page only): *"Goliath: a siege engine. Walls slow it. Only massed, overclocked ICE
stops it."* Renderer: draw at 1.4× icon scale with a slow stomp bob.

### 4.4 Scripted spawns (`WaveDefinition.scriptedSpawns`)

Guarantees intro/boss appearances that weighted rolls can't. In
`intrusions.ts: spawnIntrusions`, **before** the cadence logic: for each `scriptedSpawns`
entry with `entry.waveTick === state.waveTick` (and `phase === "active"`), spawn one intrusion
of that kind via the existing `pickSpawnPosition` (consumes RNG → deterministic), ignoring
`maxActiveIntrusions`/`spawnEveryTicks` but **counting toward** `waveSpawnedCount` (budget
`maxSpawnedIntrusions` in §7 includes them). Then run the existing cadence spawn unchanged.
Used by waves 6 (hunter), 7 (splitter), 12 (goliath).

---

## 5. New tools

### 5.1 Scrubber — corruption counterplay (unlocks sector 2)

- **Placement**: `commands.ts: placeUnit` special case — scrubber is placeable ONLY on a
  `corrupted` tile (all other units only on `empty`, as today); intrusion-occupancy and
  bandwidth checks unchanged. Tile becomes
  `{ kind: "scrubber", hp: units.scrubber.hp, progress: 0 }`.
- **Behavior**: new file `src/sim/scrubbing.ts`, `applyScrubberProgress(state): GameState`,
  inserted in the tick pipeline after corruption (§5.3). Each scrubber tile: `progress + 1`;
  when `progress >= config.scrubberCleanseTicks` → tile becomes `empty`, emit `tileCleansed`.
  Scrubbers only progress during `active` phase (the prep branch of `tick()` returns early —
  document this; placing during prep is fine, work starts at wave-live).
- **Interactions** (all fall out of existing rules — verify, don't re-implement): blocks
  movement like any unit; spoofs jump it; blocked enemies chew it (hp 8 — fragile); hunters
  target it (`targeting: "units"`), enter it, and stand-corrupt it back to `corrupted`
  (counterplay loop). Not a signal carrier. Not sellable (`sellUnit` ignores it; refund 0).
- Defensive sim check: `placeUnit` rejects units not in `config.toolsUnlocked` (UI also hides
  them, §8.4).

### 5.2 Overclock node — turret amplifier (unlocks sector 3)

- Placeable on empty tiles like any unit. Not a carrier. Corruptible/chewable/
  hunter-targetable like a relay.
- **Effect** in `src/sim/combat.ts: applyTurretCombat`: per turret,
  `damage = config.turretDamagePerTick + config.overclockBonusDamage * adjacentOverclockCount`
  where `adjacentOverclockCount` = orthogonally adjacent tiles of kind `"overclock"` (no cap —
  at 14cr each, more than 2 per turret is self-balancing). Compute the per-turret damage once
  before the inner intrusion loop; `turretHit.damage` carries the boosted value (renderer can
  tint boosted beams).
- Renderer: faint amber link line from overclock to each adjacent turret in the ground pass.

### 5.3 Final tick pipeline (`src/sim/tick.ts`)

```
economy → spawnIntrusions (scripted + cadence) → moveIntrusions (move | chew)
→ applyTurretCombat (overclock bonus; splitter children) → applyIntrusionCorruption
→ applyScrubberProgress → signal recompute + integrity (regen/drain + core contact) → phase resolution
```

---

## 6. Icons + audio for new content

`src/render/iconPaths.ts`: extend `IconName` with
`"scrubber" | "overclock" | "hunter" | "splitter" | "goliath"` (void needs no icon — it's
terrain). Designs (24×24, distinct silhouettes, same conventions):

| Icon | Design | Color |
|---|---|---|
| Scrubber | rounded square with rotating-fan blades + sparkle tick (cleaner motif) | green `#5ee08a` |
| Overclock | turret-base square with a lightning bolt through it, corner heat ticks | amber `#f2c94c` |
| Hunter | predatory chevron-arrow with crosshair notch over a small "unit square" prey mark | red `#ff5f6e` |
| Splitter | a diamond visibly cracked into two offset halves with a fissure gap | purple `#b68cff` |
| Goliath | massive hexagonal plate stack, 3 horizontal armor bands, center eye-dot | deep red `#ff2957` |

`src/ui/audio.ts: playEvents` switch additions: `unitDamaged` → short low knock
(`playTone(140, 0.03, 0.05, "square")`), `tileCleansed` → rising chime, `coreBreach` → reuse
the `coreDamaged` alarm at higher gain, `intrusionSplit` → quick two-note blip. Exact tones at
implementer's discretion; keep procedural.

---

## 7. Tuning tables (the numbers, with reasoning)

All in `src/data/`. Tick = 350ms.

### 7.1 Units (`src/data/units.ts`)

| Unit | Cost | Refund | HP | Stats | Was | Reasoning |
|---|---|---|---|---|---|---|
| Relay | 7 | 3 | 6 | signalRange 2 | cost 6 | Slight tax: route extensions are the cheapest decision and were near-free. HP 6 = chewed fast; relays are not walls. |
| Firewall | 10 | 4 | 24 | impassable carrier | cost 12, +8 hardening | Cheaper than before with a REAL job. 24 HP = a lone crawler needs 4 attacks × 3 ticks = 12 ticks (4.2s) to breach — walls buy time, don't win alone. |
| ICE Turret | 18 | 8 | 10 | dmg **4**/tick, range 1 | cost 16, dmg 6 | The nerf that makes everything else matter. Probe (8hp) still dies in 2 ticks (chaff stays chaff), but a Crawler (26hp) needs 7 turret-ticks — more adjacency than one tile of pass-by gives. You must maze (firewalls) or double up. |
| Scrubber | 9 | 0 | 8 | cleanses in 12 ticks, consumable, corrupted-only | — | 12 ticks (4.2s) is long enough that mid-wave scrubbing is a gamble; HP 8 means enemies can interrupt it. |
| Overclock | 14 | 6 | 8 | +3 dmg to each orthogonally adjacent turret | — | Turret 4→7 per adjacent node. Two overclocked turrets (14/tick) kill the Goliath (90hp) in ~7 exposure ticks — the wave-12 answer, costing 18+18+14+14 = 64cr of commitment. |

### 7.2 Enemies (`src/data/enemies.ts`)

| Enemy | HP | Move every | Corrupt ticks | Chew dmg | Core contact | Special | Was |
|---|---|---|---|---|---|---|---|
| Probe | 8 | 2 | 6 | 2 | 1 | — | 7hp, corrupt 7 |
| Crawler | 26 | 3 | 3 | 6 | 2 | — | 20hp |
| Spoof | 14 | 2 | 4 | 2 | 1 | jumps single-thickness unit walls (existing mechanic) | 12hp, ignored firewall hardening (mechanic deleted) |
| Hunter | 18 | 2 | 3 | 5 | 1 | targets ALL unit tiles | NEW |
| Splitter | 16 | 3 | 5 | 3 | 1 | death → 2 probes | NEW |
| Goliath | 90 | 4 | 2 | 24 | 6 | wave-12 scripted boss | NEW |

Sanity math: bare turret vs crawler = 26/4 = 7 ticks of adjacency (≈ 2.3 tiles of pass-by at
move-3) → one turret can't solo it. Spoof vs single firewall wall: jumps it (identity
preserved); vs double wall: chews at 2/attack → 12 attacks → 24 ticks, i.e. double-walls
actually stop spoofs. Goliath vs firewall: 1 attack per breach, one wall ≈ 4 ticks bought.

### 7.3 Waves 1–12 (`src/data/waves.ts`, grouped per sector in `levels.ts`)

Columns: Prep / Grant / Trickle (amt per N ticks) / First / Every / MaxActive / MaxSpawned /
Weights P·C·S·H·Sp·G / Edges / Scripted.

| # | Label | Prep | Grant | Trickle | First | Every | Act | Spwn | Weights | Edges | Scripted |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Probe Trace | 14 | 26 | 0 | 2 | 12 | 1 | 1 | 10·0·0·0·0·0 | W | — |
| 2 | Crawler Pressure | 14 | 26 | 0 | 2 | 8 | 3 | 3 | 8·2·0·0·0·0 | W,N | — |
| 3 | Spoof Injection | 14 | 24 | 1/6 | 2 | 7 | 4 | 4 | 4·1·1·0·0·0 | N,S | — |
| 4 | Cross-Edge Breach | 14 | 20 | 1/5 | 1 | 5 | 5 | 7 | 5·2·2·0·0·0 | W,N,S | — |
| 5 | Signal Breach | 14 | 20 | 1/4 | 1 | 4 | 6 | 9 | 6·3·3·0·0·0 | all | — |
| 6 | Hunter Protocol | 20 | 36 | 1/6 | 2 | 7 | 4 | 6 | 5·2·0·3·0·0 | E,S | hunter @4 |
| 7 | Split Decision | 14 | 24 | 1/6 | 2 | 6 | 5 | 8 | 4·2·0·0·3·0 | N,E | splitter @4 |
| 8 | Pack Tactics | 14 | 22 | 1/5 | 1 | 5 | 6 | 10 | 4·3·2·2·2·0 | N,E,S | — |
| 9 | Canyon Storm | 14 | 20 | 1/4 | 1 | 4 | 7 | 12 | 5·3·3·3·2·0 | all | — |
| 10 | Vault Siege | 20 | 38 | 1/5 | 2 | 5 | 6 | 10 | 4·3·3·2·0·0 | all | — |
| 11 | Total Breach | 14 | 24 | 1/4 | 1 | 4 | 8 | 14 | 5·4·3·3·3·0 | all | — |
| 12 | Goliath Handshake | 16 | 28 | 1/4 | 1 | 5 | 7 | 10 | 4·2·2·2·2·0 | all | goliath @6 |

Notes: wave ids stay globally numbered 1–12 for flavor; each sector's `waves` array is its own
slice and `waveIndex` resets per sector (HUD shows `WAVE {wave.id} · {waveIndex+1}/{waves.length}`).
First wave of each sector has a fat grant (fresh `bandwidth: 0` state) and longer prep.
Goliath is scripted, never weighted (weight column G stays 0 — it's only ever scripted), and
wave 12's `maxSpawned: 10` includes it. Sector economy totals: S1 = 116 + trickle (~3 free
relays pre-placed); S2 = 102 + trickle against 4 pre-placed relays and scrubber upkeep;
S3 = 90 + trickle, forcing sell/reposition decisions before wave 12.

`perimeterPickAttempts`: keep existing values for waves 1–5; use 12 for 6–9 and 14 for 10–12.

---

## 8. Screens, navigation, persistence

### 8.1 App screen machine (`src/ui/screens.ts`, `src/main.ts`)

```ts
export type AppScreen = "title" | "sectorSelect" | "briefing" | "playing";
```

Briefing-during-play decision: **reuse the `"briefing"` screen value** plus a `main.ts`
closure var `let briefingReturn: AppScreen = "title";`. Rationale: the sim tick is already
gated on `screen === "playing"`, so switching to `"briefing"` pauses for free — no overlay
flag, no second pause mechanism. On briefing exit, `screen = briefingReturn`; if that is
`"playing"`, run the standard `lastTickTime = performance.now()` reset (existing pattern).
The else-branch in `drawFrame` (ambient backdrop + hidden HUD) must special-case: when
`screen === "briefing" && briefingReturn === "playing"`, keep drawing `drawGrid` (frozen
state) behind the briefing instead of the ambient backdrop. HUD/picker staying hidden during
that pause is fine and simpler — implementer's choice, but the sim must not tick.

Flow: title "JACK IN" → (first run: briefing →) **sectorSelect** → pick sector → playing.
Title tagline becomes `Hold the uplink. Take back the grid.`

### 8.2 Sector select screen

New renderer in `screens.ts` (same keyed pattern, key
`sectorSelect-${unlocked}-${clearedCsv}`): three `.sector-card` buttons from `SECTORS` showing
codename, tagline, wave range (`WAVES 6–9`), and status: `CLEARED` (cyan stamp) / `UNLOCKED` /
`LOCKED` (desaturated, disabled, lock glyph, no spoiler text — tagline replaced by
`SIGNAL ENCRYPTED`). Locked cards are `disabled`. A `BACK` button returns to title. Extend
`ScreenOptions`:

```ts
export type ScreenOptions = Readonly<{
  root: HTMLElement;
  screen: AppScreen;
  progress: CampaignProgress;            // NEW
  briefingMaxSector: number;             // NEW: gates briefing pages (§9)
  briefingFromPlay: boolean;             // NEW: shows RESUME styling/close button
  onStart: () => void;                   // title → briefing (first run) or sectorSelect
  onShowBriefing: () => void;
  onBriefingComplete: () => void;        // → sectorSelect, or back to playing when from play
  onSelectSector: (sectorId: number) => void; // NEW
  onBackToTitle: () => void;             // NEW (sectorSelect BACK)
}>;
```

### 8.3 Campaign persistence (`screens.ts`, same try/catch pattern as `hasSeenBriefing`)

```ts
export type CampaignProgress = Readonly<{
  highestUnlockedSector: number;     // 1..3, default 1
  clearedSectors: readonly number[]; // sorted unique
}>;
export function loadCampaignProgress(): CampaignProgress; // key "gridwatch.campaign.v1", JSON, try/catch → default
export function markSectorCleared(sectorId: number): CampaignProgress; // sets cleared + unlock min(sectorId+1, 3), saves, returns new
```

Keep the existing `gridwatch.briefingSeen` key untouched (no migration needed). Malformed
JSON → default (wrap `JSON.parse` in the try/catch).

In `main.ts`: track `let previousPhase: GamePhase = state.phase;` updated after the tick loop;
on transition `previousPhase !== "won" && state.phase === "won"` →
`progress = markSectorCleared(currentSector)`. Dev hook: `?sector=N` URL param sets the
initial `currentSector`, clamped to `[1, progress.highestUnlockedSector]`.

### 8.4 HUD + picker + overlays

- **`src/ui/hud.ts` restructure (required)**: convert to the keyed create-once /
  per-frame-update pattern (like `unitPicker.ts`, `root.dataset.ready`) — the current full
  innerHTML rebuild every frame would eat clicks on the new button (element replaced between
  pointerdown and pointerup → no `click`). Add to the rail: sector codename metric, wave
  metric `WAVE {id} · {n}/{total}`, and a **`BRIEFING` button** (`.neon-button-secondary`,
  created once) wired to a new option: `renderHud(root, state, { sectorName, onShowBriefing })`.
  Clicking it sets `briefingReturn = "playing"; screen = "briefing";` in `main.ts`.
- **`src/ui/unitPicker.ts`**: build buttons from `state.config.toolsUnlocked` (+ sell)
  instead of a hardcoded record; re-key `root.dataset.ready` with `toolsUnlocked.join(",")`
  so changing sector rebuilds. Add labels/tooltips for Scrubber ("Cleanses a corrupted tile —
  place ON corruption") and Overclock. The scrubber button disables additionally when no
  corrupted tile exists (cheap scan of `state.grid.tiles`).
- **`src/ui/overlays.ts` end screen**: extend `OverlayOptions` with
  `onReturnToTitle: () => void`, `onSectorSelect: () => void`,
  `onNextSector: (() => void) | null` (non-null only when `phase === "won"` and a next sector
  exists/just unlocked). Buttons in order: `NEXT SECTOR ▸` (primary, when present),
  `RETRY SECTOR` (the old Restart — fresh seed, same sector), `SECTOR SELECT`, `TITLE`.
  Won-final-sector variant: title text `GRID RECLAIMED`, detail
  `All twelve waves survived. The network is yours.` All wired in `main.ts`; every path that
  re-enters playing resets `lastTickTime`.
- **Hover ghost** (`renderer.ts: drawHoverGhost`): scrubber tool → valid (cyan) on
  `corrupted` tiles, invalid otherwise; overclock → telegraph highlights the 4 orthogonal
  neighbors tinted amber where turrets sit. Sell ghost skips scrubbers.

---

## 9. Briefing content v2 (`src/data/briefing.ts`, `src/ui/screens.ts`)

Replace the fixed 3-panel logic with a data-driven page list; `BRIEFING_PANEL_COUNT` deleted.

```ts
export type BriefingRow = Readonly<{ icon: IconName; name: string; detail: string }>;
export type BriefingPage = Readonly<{
  id: string;
  minSector: number;        // page shown when briefingMaxSector >= minSector
  title: string;
  kind: "signal" | "rows" | "text";
  body?: string;
  rows?: readonly BriefingRow[];
}>;
export const BRIEFING_PAGES: readonly BriefingPage[];
```

`screens.ts` filters `BRIEFING_PAGES` by `options.briefingMaxSector` (pass
`progress.highestUnlockedSector` — never spoils locked content), renders dots/NEXT/BACK from
the filtered length, and renders a `CLOSE ✕` button when `briefingFromPlay` (final button
text `RESUME UPLINK ▸` in that case, `INITIALIZE UPLINK ▸` otherwise). Page index resets on
screen change (existing behavior).

Pages (costs/values interpolated from `UNIT_TUNING`/`CORE_TUNING` so copy can't drift —
existing convention):

1. **THE SIGNAL** (minSector 1, kind "signal") — keep diagram; body gains the regen gap:
   *"…While the line is live the Core self-repairs (+1/tick). Severed, it bleeds (−2/tick).
   Zero means flatline."*
2. **YOUR ARSENAL** (1, rows) — rows filtered to `minSector` per unit. Updated firewall line:
   *"Firewall (10): a wall. Intrusions can't cross it — they must path around, or chew
   through its 24 HP."* New scrubber row (minSector 2), overclock row (minSector 3).
3. **PROTOCOLS** (1, rows) — the onboarding-gap page: *"BANDWIDTH: your build currency.
   Granted each wave, trickled during combat, spent to place, partly refunded on SELL."* /
   *"LINKING: the signal hops between Source, relays, firewalls, and Core when they're within
   2 tiles of each other — it hops gaps, even chasms."* / *"CORRUPTION: a corrupted tile is
   dead ground — it carries nothing and never recovers on its own. Scrub it or route around
   it."* / *"PREP: between waves the clock pauses for you. Build, sell, then SKIP PREP to
   start early."*
4. **THE THREATS** (1, rows) — Spoof line updated: *"Spoof: jumps a single wall. Double up."*
   Intro line: *"Intrusions corrupt your hardware by standing on it, chew through walls when
   boxed in, and drain the Core by touch. Clear every wave of the sector."*
5. **SECTOR 2 INTEL** (2, rows) — Hunter, Splitter, Scrubber rows + canyon/void note: *"Void
   chasms block movement — but not the signal."*
6. **SECTOR 3 INTEL** (3, rows) — Overclock row, Goliath row, vault note.

Add 2–3 new `taunts.ts` lines referencing chewing/hunters (e.g. *"Your walls are a chew
toy."*, *"I don't want your route. I want your toys."*) and retire the now-false *"Firewalls
slow amateurs. Spoofs walk through."*

---

## 10. 3D presentation — `src/render/projection.ts`

### 10.1 The transform

A single shared affine map between **board space** (the existing flat coordinate system:
`boardX ∈ [0, boardSize]`, `tileSize = boardSize / 8`, exactly what `getBoardMetrics`
describes today) and **screen space**:

```
screenX = origin.x + a * boardX + c * boardY
screenY = origin.y + d * boardY            (b = 0; rows stay horizontal)
```

Constants (single source of truth, exported for tests/tweaks):

```ts
export const PROJECTION_TUNING = {
  scaleX: 1,        // a
  skewX: -0.12,     // c — gentle leftward lean of far rows (parallelogram tilt)
  scaleY: 0.68,     // d — foreshortening; the "camera elevation"
  liftRatio: 0.22,  // unit extrusion height as fraction of tileSize (screen px = tileSize * liftRatio)
  markerLiftRatio: 0.32, // source/core stand taller
  verticalBias: 26, // px the squashed board is pushed down to leave headroom for tall pieces
} as const;
```

Why this projection and not a 45° diamond: rows stay rows, so painter's order is a trivial
per-row sort, captions/HP bars stay horizontal, the 8×8 still fits 720px
(632 + 0.12·632 ≈ 708 wide), and the inverse is two lines of exact algebra — pointer mapping
cannot drift. It is a true affine "dimetric tilt": the ground plane is compressed and
sheared; depth is sold by extrusion, lighting, shadows, and row overlap. (A
trapezoid/perspective look is NOT affine and is explicitly out of scope.)

```ts
export type Projection = Readonly<{
  origin: Readonly<{ x: number; y: number }>; // screen position of board-space (0,0)
  tileSize: number;                            // board-space px per tile (boardSize / gridSize)
  boardSize: number;
  a: number; c: number; d: number;             // matrix terms (b = 0)
  lift: number; markerLift: number;            // screen px
}>;

export function getProjection(size: CanvasSize, gridSize: number): Projection;
// boardSize = min(w,h) - 2*BOARD_PADDING (reuse the constant — move BOARD_PADDING here
// or keep importing from canvas.ts, one home only).
// origin.x = (w - boardSize + |c|*boardSize) / 2     → horizontally centers the parallelogram
// origin.y = (h - boardSize*d) / 2 + verticalBias

export function boardToScreen(p: Projection, bx: number, by: number): { x: number; y: number };
export function screenToBoard(p: Projection, sx: number, sy: number): { x: number; y: number };
// by = (sy - p.origin.y) / p.d;  bx = (sx - p.origin.x - p.c * by) / p.a;   (exact inverse)

export function screenToTile(p: Projection, gridSize: number, sx: number, sy: number): GridPosition | null;
// floor(board / tileSize), null when outside [0, gridSize) on either axis

export function tileCenterScreen(p: Projection, pos: GridPosition): { x: number; y: number };
export function applyGroundTransform(ctx: CanvasRenderingContext2D, p: Projection): void;
// ctx.transform(p.a, 0, p.c, p.d, p.origin.x, p.origin.y) — MULTIPLY onto the current
// transform (not setTransform), applied INSIDE the existing save/translate(shake) wrapper
// so screen shake survives (§11.4).
```

### 10.2 Pointer adaptation (`src/render/canvas.ts`, `src/input/pointer.ts`)

`getGridPositionFromClientPoint` keeps its signature and remains the only pointer entry (so
**`pointer.ts` needs zero changes**): keep the existing client→canvas-pixel scaling math,
then replace the rect test + floor with
`screenToTile(getProjection({width, height}, GRID_SIZE), …)`. `getBoardMetrics` stays for
board-space consumers (background layer) but its `originX/originY` are no longer screen
positions — grep all call sites and migrate any screen-positioning use to `Projection`.
Renderer and input now invert the *same* matrix by construction.

## 11. Renderer restructure — two passes (`src/render/renderer.ts`, `src/render/background.ts`)

### 11.1 Background split (`background.ts`)

Replace `getBoardBackgroundLayer(size)` with two cached layers:

- `getBackdropLayer(size)` — full-canvas, drawn at **identity**: dark gradient + vignette
  (unsquashed — these frame the screen, not the board).
- `getBoardSurfaceLayer(size)` — board-space content only (circuit texture, grid lines,
  corner brackets, baked illumination — §11.5), rendered ONCE flat into an offscreen canvas
  sized `boardSize × boardSize` at board coordinates `(0,0)`–`(boardSize,boardSize)`, then
  drawn each frame with the ground transform active via one `drawImage(layer, 0, 0)` — the
  ctx transform squashes it correctly for free. Cache keyed by size as today.

### 11.2 Ground pass (under `applyGroundTransform`)

Everything painted ON the floor, all in pure board coordinates (no origin math — the
transform owns it): board surface layer → per-tile floor fills (`drawTiles` floor part: empty
checker, corrupted glitch tile, **void tile**: near-black pit `#05080c` with a 1px inner rim
`rgba(120,255,238,0.10)` and two diagonal hazard slivers from the tile hash) → emissive route
wash + core light pool (§11.5) → relay/turret/overclock range telegraphs → hover tile outline
→ **signal route pulse** (unchanged math, board coords; dashes/packet get foreshortened by
the transform, which reads correctly) → route-cut and corruption flash effects → elliptical
contact shadows for pieces and hovering enemies (§11.5).

### 11.3 Piece pass (identity transform, painter's algorithm)

Pieces are drawn **upright** (unsquashed icons/text) at projected anchors. Build one
frame-local render list:

```ts
type PieceItem = Readonly<{ sortY: number; draw: () => void }>; // sortY = board-space y of the piece's ground point
```

Items: every occupied unit tile (sortY = `(pos.y + 0.5) * tileSize`), source/core markers,
every intrusion (sortY from the **interpolated** position), the hover ghost icon (sortY =
hover row + 0.01 so it draws over that row's floor). Sort ascending, draw in order —
back-to-front by row.

**Extruded unit piece** helper (procedural, plain fills, zero shadowBlur — cached glow
sprites are still used for the icon on the top face):

```ts
function drawExtrudedTile(ctx, proj, pos, opts: Readonly<{
  topFill: string; lift: number; alpha?: number;
}>): void;
// Side-wall and edge colors are DERIVED from topFill via shadeColor (§11.5) — callers pass
// one base color; the lighting model owns the rest.
```

Compute the 4 ground corners of the tile (inset 3px in board space) via `boardToScreen`;
lifted corners = same points with `screenY - lift`. Draw: (1) front (south) side quad between
the two south ground corners and their lifted copies — `shadeColor(topFill, 0.62)` (in
shadow, light comes from upper-left); (2) the **east** side quad (visible because
`skewX < 0` leans tops westward) — `shadeColor(topFill, 0.50)` (fully shadowed face); (3) top
face quad: `topFill` + lit/dark edge treatment per §11.5; (4) the unit's glow sprite centered
on the top face; (5) HP pips when damaged: `ceil(hp / maxHp * 4)` 3px squares along the top
face's south edge (red when ≤ half); (6) scrubber: progress arc (existing corruption-arc
technique, cyan-green) above the top face. Source/core use `markerLift`, keep their
rings/captions (captions drawn below the ground footprint, identity transform). Firewall
walls use its amber scheme so walls read as walls.

**Enemies**: hover/bob — `groundCenter = tileCenterScreen(interpolated position)`;
`pieceCenter.y = groundCenter.y - proj.lift * 0.7 - bob` with
`bob = Math.sin(frame.timeMs * 0.004 + intrusion.id) * 2.5`; contact shadow painted in the
ground pass (§11.5) with radius scaled by `1 - bob * 0.04`. Keep all existing per-kind
animation (probe rotation, crawler breath, spoof glitch double-draw), HP bar and corruption
arc at the piece position. Goliath at 1.4× scale. Turret beams (`drawHitFlashes`) draw in the
piece pass **after** the list, connecting `pieceCenter`s (so beams fly above the floor);
neutralized ring bursts likewise.

### 11.4 Frame skeleton + invariants

```
clearRect → drawImage(backdropLayer)            // identity
ctx.save(); ctx.translate(shake.x, shake.y);    // EXISTING shake wrapper — unchanged, outermost
  ctx.save(); applyGroundTransform(ctx, proj);  // ctx.transform (multiply), NOT setTransform,
    ...ground pass...                           // or the shake translate would be wiped
  ctx.restore();
  ...piece pass (sorted)...
  ...beams/bursts...
ctx.restore();
drawStatus(...)                                  // identity, unchanged
```

Shake survives because it wraps both passes (board AND pieces shake together); route pulse
survives because its math is untouched, only viewed through the transform.
`drawAmbientBackdrop` (title screen) gets the same treatment — ground transform around its
existing drawing, which makes the title backdrop a tilted plane for free. Replace `GRID_SIZE`
loop bounds in `renderer.ts` with `state.grid.size` while in there (background may keep the
constant; all sectors are 8). Perf budget unchanged from v1: 0 `shadowBlur`/frame, no
per-frame canvas/gradient allocation (the per-frame `PieceItem` array of ~20 closures is
acceptable; if GC noise appears, pre-allocate and reuse).

### 11.5 Lighting & shading model

One global key light, applied consistently to every surface, shadow, and bevel. New small
module **`src/render/shading.ts`**:

```ts
export const KEY_LIGHT = { dx: -0.6, dy: -0.8 } as const; // normalized, from upper-left

export function shadeColor(hex: string, factor: number): string;
// factor < 1 darkens toward black, factor > 1 lightens toward white. All derived
// wall/edge/bevel colors come from base palette colors through this function — the palette
// stays single-source.

export function getShadowSprite(radiusPx: number): HTMLCanvasElement;
// Cached (Map keyed by radius bucket): an offscreen canvas with ONE radial gradient
// (rgba(0,0,0,0.45) → transparent). Per-frame contact shadows are a single drawImage of
// this sprite, scaled — zero per-frame gradient allocation.
```

Application points:

1. **Extruded pieces** (§11.3): south wall `shadeColor(top, 0.62)`, east wall
   `shadeColor(top, 0.50)`. Top face gets a 1px **lit edge** on its north and west sides
   (`rgba(255,255,255,0.22)`) and a 1px **dark edge** on south and east
   (`shadeColor(top, 0.45)`) — cheap strokes, no gradients.
2. **Contact shadows** (ground pass): every piece and every enemy gets an elliptical shadow
   via `getShadowSprite`, drawn at the ground anchor **offset toward lower-right**
   (`+lift * 0.18` on both axes — opposite the key light). Enemy shadows shrink slightly as
   the bob rises (§11.3). Consistent offset direction is what sells a single light source.
3. **Board surface** (baked once into `getBoardSurfaceLayer`, §11.1): a low-alpha diagonal
   illumination gradient across the whole board (lighter at NW, darker at SE,
   ~`rgba(255,255,255,0.05)` → `rgba(0,0,0,0.10)`), plus per-tile bevels: 1px lit edge on
   each tile's top/left, 1px dark edge on bottom/right. Free at runtime — it's in the cached
   layer.
4. **Emissive (neon as local light)**: tiles orthogonally adjacent to the live route get a
   faint cyan wash (`rgba(34,224,196,0.06)` fill); the Core casts a soft pink radial pool
   under itself (one cached radial-gradient sprite, like `getShadowSprite`). When the route
   is severed, the wash switches to a dim red on the stub tiles. **Cache discipline**: the
   set of washed tiles is recomputed only when the route changes — cache keyed on
   `state.signal.routeTick` (route changes are rare). The pool sprite is rendered once.
5. **Goliath** gets a double-size shadow — cheap menace.

Verification for this section: light reads as ONE source — every wall pair is shaded on the
same sides, every shadow falls the same direction, every bevel highlight faces upper-left;
route wash updates when the route re-routes; devtools confirms no per-frame gradient
creation.

---

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Pointer/render disagreement under projection | One matrix in `projection.ts`; `screenToBoard` is the algebraic inverse of `boardToScreen`; `getGridPositionFromClientPoint` and the renderer both consume it. Manual check: hover every corner tile, ghost must track the cursor exactly. |
| Determinism breaks (new RNG draws, mid-loop grid threading, split/scripted ordering) | All randomness stays in `pickEnemyKind`/`pickSpawnPosition`; chew/split/scripted logic is RNG-free with fixed iteration orders (array order, N-E-S-W, reading order). Verify: two runs with `?seed=test` produce identical `tickCount`/`coreIntegrity`/`neutralizedCount` at game end. |
| Wave softlock (enemy permanently stuck → `isCurrentWaveComplete` never true) | Chew applies to ALL unit kinds; voids never on the perimeter (asserted in `levels.ts`); therefore a breach path always exists from any spawn point. |
| Turret nerf makes sector 1 unwinnable / firewall spam trivializes | Tuning table §7 is the starting point, not gospel — each phase's verify step includes a full sector playthrough; adjust grants ±4 and chew ±1 before touching mechanics. `?seed=` pins runs for A/B. |
| `enemyWeights` Record gains 6 required keys → wave table churn | Compile-enforced exhaustiveness is the point; tsc flags every missed wave. |
| HUD button recreated per frame eats clicks | §8.4 mandates converting `hud.ts` to keyed create-once/update (same as unitPicker). |
| localStorage unavailable / corrupt JSON | try/catch + defaults (`{highestUnlockedSector: 1, clearedSectors: []}`); existing pattern. |
| Briefing-from-play leaks catch-up ticks on resume | `lastTickTime = performance.now()` on EVERY transition into playing (existing pattern; now also the briefing-resume path). |
| Background cache squashed wrongly / vignette deformed | §11.1 split: backdrop+vignette at identity, board surface under transform. Verify visually at 720 and mobile sizes. |
| Inconsistent lighting reads as a bug | §11.5: ONE `KEY_LIGHT` constant; all shades via `shadeColor`; all shadow offsets from the same vector. Visual check in Phase 5 verify. |
| Splitter population explosion | Children = 2 probes per splitter, never recursive (probes have `onDeathSpawn: null`); bounded by per-wave splitter count. |
| Old saves / briefingSeen key conflicts | New key `gridwatch.campaign.v1`; old key untouched. |

---

## 13. Phased execution (each phase shippable; `npm run build` must pass)

### Phase 1 — Run seeds + global rebalance (~1.5–2h)
1. `main.ts`: `makeRunSeed()` + `?seed=` hook (§2); pass seed to all `createGameState` calls;
   restart re-rolls.
2. `src/data/units.ts` / `waves.ts`: turret 4 dmg / 18 cost, relay 7 cost, wave 1–5 grant
   rows from §7.3 (firewall row lands in Phase 2 with its rework). Delete dead `spawnWeight`
   + `INTRUSION_SPAWN_TUNING` (grep first).

**Verify:** two fresh runs spawn differently; `?seed=abc` runs identically twice; sector-1
waves still winnable with mazeless play (barely — it should feel tight); build passes.

### Phase 2 — Firewall blocker + chew + core contact (~4–5h)
1. `types.ts`: `TileState.hp`, `EnemyDefinition` chew/contact/targeting/onDeathSpawn fields
   (targeting `"route"` and `onDeathSpawn: null` for all three existing kinds), new events;
   remove `firewallHardeningBonusTicks`.
2. `grid.ts: setTile`; `commands.ts`/`state.ts` place units with hp.
3. `intrusions.ts`: target sets, firewall never-enterable, breach BFS + chew (§3.2,
   sequential loop). `corruption.ts`: drop hardening. `tick.ts`: core contact (§3.5).
4. `data`: firewall 10cr/24hp row, enemy chew/contact values, unit hp values.
5. Renderer: HP pips on damaged units (flat versions pre-projection); `unitDamaged` hit
   flash; audio knock. Briefing: PROTOCOLS page + updated firewall/spoof copy (§9 pages 1–4;
   the data-driven page model lands here).

**Verify:** enemies route around a firewall line; fully walling the west edge → enemies chew
(HP pips tick down) and breach into a corrupted tile that severs a route through it; a spoof
hops a 1-thick wall but not 2-thick; parking the route behind walls → leakers stand on Core
and integrity falls; no wave ever stalls (idle enemies). Build passes.

### Phase 3 — Sector campaign + navigation (~5–6h)
1. `src/data/levels.ts` (3 sectors per §1.2 — waves 6–12 may temporarily use only
   probe/crawler/spoof weights; keep the §7.3 row shapes), void tile semantics (§1.3),
   `createGameState({sector})`, `SimConfig.sectorId/sectorName/toolsUnlocked`.
2. `screens.ts`: `"sectorSelect"` screen + `CampaignProgress` storage (§8.2–8.3); `main.ts`:
   `currentSector`, win-detection unlock, `briefingReturn` machinery, `?sector=` hook.
3. `overlays.ts` end-screen buttons (§8.4); `hud.ts` keyed restructure + BRIEFING button +
   sector/wave metrics; `unitPicker.ts` from `toolsUnlocked`.
4. Renderer: void tiles (flat version); `renderer.ts` uses `state.grid.size`.
5. Title tagline + briefing wave-count copy updates.

**Verify:** title → sector select → sector 1 → win → "NEXT SECTOR" appears and sector 2
unlocks; reload persists unlocks; sector 2/3 maps render voids, initial relays give a LIVE
route at tick 0 in all three sectors; BRIEFING from HUD freezes the sim (countdown stops) and
resumes without a tick burst; end screen reaches title and sector select; locked sector 3
card is disabled and spoiler-free. Build passes.

### Phase 4 — New tools + enemies + final tuning (~5–6h)
1. `scrubbing.ts` + scrubber placement rule (§5.1); overclock in `combat.ts` (§5.2); pipeline
   order (§5.3).
2. Hunter targeting, splitter death-spawn in `combat.ts`, goliath stats, `scriptedSpawns` in
   `spawnIntrusions` (§4).
3. Final wave rows 6–12 (§7.3) with all six weight keys; tool unlock lists per sector.
4. Icons (§6), picker entries, hover-ghost rules for scrubber/overclock, sector 2/3 briefing
   intel pages (§9 pages 5–6), audio events, new taunts.

**Verify:** with `?seed=test&sector=2`: wave 6 always contains a hunter that beelines an
off-route turret; killing a splitter on empty ground yields exactly 2 probes at deterministic
positions (same seed → same positions); scrubber placed on a corrupted tile cleanses after 12
active ticks and is interruptible by a hunter; sector 3 wave 12 always spawns one goliath at
waveTick 6, it one-shots firewalls, and dies to 2 overclocked turrets on the vault gates;
full campaign clear possible. Build passes.

### Phase 5 — Projection + 2.5D pieces + lighting (~5–7h)
1. `src/render/projection.ts` (§10) + `canvas.ts` pointer rewrite.
2. `src/render/shading.ts` (§11.5): `KEY_LIGHT`, `shadeColor`, `getShadowSprite`.
3. `background.ts` two-layer split (§11.1) including baked board illumination + tile bevels.
4. `renderer.ts` two-pass restructure (§11.2–11.4): ground pass (with emissive route wash +
   core pool), sorted piece pass with `drawExtrudedTile` (lit/shadow walls + edge bevels),
   enemy bob + contact shadows, beams above floor, `drawAmbientBackdrop` projected.
5. Re-check hover ghost, route pulse, shake, status text under the transform.

**Verify:** hover ghost tracks the cursor on all four corner tiles and on mobile-sized CSS
scaling (pointer math exact); pieces on row 7 overlap pieces on row 6 correctly; **lighting
reads as one source** (wall shading sides, shadow offsets, and bevel highlights all
consistent with upper-left light); route wash updates when the route re-routes; devtools perf
during wave 11 (max ~11 intrusions + children): steady ≥58fps, zero shadowBlur calls and zero
gradient allocations in the frame path; shake moves board and pieces together; severed route
reads clearly under tilt. Build passes.

### Phase 6 — QA + docs (~2h)
1. Full campaign playthrough (win) + a loss + restart/sector-select/title loops; localStorage
   cleared mid-session doesn't crash.
2. Mobile pass 320/420/760px (sector select scrolls, briefing pages scroll, touch placement
   works).
3. Determinism audit: `rg "Math.random|Date.now|performance.now" src/sim` → no matches; two
   `?seed=` runs identical.
4. **Update `HANDOFF.md`**: scope change note (multi-sector campaign supersedes the "no
   additional levels/waves" caveat), new verification commands, new localStorage keys,
   `?seed=`/`?sector=` dev hooks. Update README wave counts.
5. `npm run build` + `npm run preview` smoke test of `dist/`.

Total estimate: ~23–28h across 6 independently shippable phases.
