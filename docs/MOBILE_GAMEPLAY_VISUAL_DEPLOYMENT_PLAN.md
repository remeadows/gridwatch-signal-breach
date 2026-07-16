# GridWatch Mobile, Gameplay, Visual, and Deployment Plan

Status: Phases 1–3 are merged. The initial `phase4-v1` tuning and compatibility
path are frozen in draft PR #42; production remains unchanged pending the
approved server-first promotion gate.

Date: 2026-07-15

## Outcome

Rebuild GridWatch: Signal Breach around a mobile-first, readable defense loop:
inspect the incoming threat, build without time pressure, launch the wave,
actively defend the signal, and receive a clear reward. Upgrade the presentation
with cinematic local assets and stronger combat feedback while preserving the
pure deterministic simulation, the twelve-wave/three-sector scope, offline play,
and the `GridWatchGamesDB` leaderboard.

The implementation order must be mobile playability first, rules clarity second,
visual upgrade third, and balance/agency fourth. Better art cannot rescue a board
that requires scrolling during live combat.

## Evidence From the Current Game

- The twelve waves are split unevenly: Sector 1 has waves 1–5, Sector 2 has
  6–9, and Sector 3 has 10–12.
- At a 390×844 viewport, the live control panel is approximately 517 px tall and
  the board is another 366 px. The page is approximately 1,263 px tall, so the
  player cannot see the full controls and board together.
- At 320×568, the controls still consume approximately 517 px and the 296 px
  board begins below them. Combat continues while the player scrolls between the
  tools and board.
- The 420 px breakpoint deliberately changes the six secondary HUD metrics to a
  single column, which makes the smallest phones the tallest layout.
- The canvas input fires on `pointerdown`, has no tap-versus-drag threshold, and
  has no canvas-specific `touch-action` policy.
- Before the first wave, a full-board START cover blocks placement. After START,
  the player gets roughly five seconds of prep. The copy says to start and then
  place defenses, which creates immediate pressure before the player understands
  the economy.
- Bandwidth is explained in the briefing, but the live UI does not show the next
  grant, trickle timing, earned deltas, or why an unaffordable tool is disabled.
- Wave 1 grants 26 bandwidth. A Firewall costs 10 and an ICE turret costs 18, so
  the player cannot try both. ICE costs 18 while only attacking at Manhattan
  range 1, which makes a mistaken placement especially punishing.
- The renderer is intentionally procedural and asset-free. The existing V2 spec's
  Phase 5 projection/2.5D work is not implemented.
- The optional leaderboard is already a two-surface system: the Pages client
  records deterministic commands, and the Supabase Edge Function replays a
  pinned simulation bundle before writing scores.
- The Edge Function contains a known global-board ambiguity: a null category can
  pool sector, standard, daily, weekly, and clear-marker rows. New score categories
  must not be added until that query behavior is explicitly resolved or isolated.
- `CONTEXT.md` and `SECURITY.md` still describe a no-auth/no-backend game, while
  the current sanctioned Supabase leaderboard uses Auth, an Edge Function, and
  shared database rows. This documentation drift should be corrected before a
  leaderboard-affecting release.

## Scope and Decision Gate

The user-stated goal of five enemy rounds per level means fifteen waves if a
"level" is one of the three sectors. The current repository rules cap the campaign
at exactly three sectors and twelve waves. Both requirements cannot be true at
the same time.

This plan therefore keeps the sanctioned twelve-wave campaign and makes the
current 5/4/3 structure intentional:

- Sector 1: five-wave onboarding and first climax.
- Sector 2: four-wave tactical escalation.
- Sector 3: three-wave boss sprint.

Moving to 5/5/5 is a separate product-scope decision. It would require an explicit
update to `AGENTS.md`, a new balance pass, replay/ruleset versioning, new score
categories or a new season, and fresh leaderboard acceptance criteria. It is not
part of the implementation described below.

## Product Pillars

1. **The board always wins the screen.** During play, the board, critical signal
   state, wave count, bandwidth, and tools are visible without document scrolling.
2. **Build first, launch when ready.** No new player should lose because they were
   reading while the prep clock ran.
3. **Every purchase explains itself.** Cost, purpose, range, valid placement, and
   affordability are visible at the moment of choice.
4. **Routing stays central.** Defense choices protect, bend, and recover the signal
   route; combat spectacle supports that decision rather than replacing it.
5. **Visual richness cannot reduce legibility.** Cinematic art belongs in title,
   sector, briefing, and result screens; the live board uses clear silhouettes,
   color, motion, and restrained texture.
6. **The leaderboard is never an afterthought.** Sim-affecting work is versioned
   and released compatibly with server replay.

## Target Gameplay Loop

### 1. Intel

Before every wave, show enemy types, count range, entry edges, the threatened
route segment, and the bandwidth grant. Introduce only one new concept at a time
in Sector 1.

### 2. Build

Freeze simulation time. Let the player place, sell, inspect ranges, preview the
enemy path, and read tool explanations. Use full refunds during this phase so
experimentation is safe. A prominent `LAUNCH WAVE` action replaces the automatic
prep countdown.

### 3. Defend

Run the deterministic assault. The player may place/sell at the active-phase
refund rate, pause, and respond to clear entry warnings. Every hit, kill,
corruption, route sever, repair, and bandwidth change needs immediate visual and
audio feedback.

### 4. Recover

When the final enemy is cleared, stop the clock, show what survived, repair rules,
the next grant, and one short tactical recommendation. Return to Build.

### 5. Debrief

At sector end, explain the score in plain language, show the unlocked sector/tool,
offer retry/continue, and keep leaderboard sign-in optional.

## Mobile-First Interaction and Layout

Target portrait layout:

```text
+--------------------------------+
| WAVE 1/5 | SIGNAL 150 LIVE | BW 26 |
+--------------------------------+
|                                |
|          8 × 8 BOARD           |
|                                |
+--------------------------------+
| RELAY | FIREWALL | ICE         |
| SELL  | SPECIAL  | PAUSE       |
+--------------------------------+
```

- Fit active play inside `100dvh`, including safe-area insets; disable document
  scrolling only while the play screen is active.
- Collapse the live HUD to Wave, Signal Strength/status, and Bandwidth. Move
  sector name, neutralized count, briefing, account, and detailed stats into the
  pause/details sheet.
- Keep at least 48 px touch targets for controls. Keep board cells at least about
  36 px on the 320 px baseline and enlarge them whenever the viewport allows.
- Use a fixed bottom tool dock: three columns by two rows in portrait, and a side
  dock in landscape/desktop. Do not use tiny horizontal scrolling controls for
  core tools.
- Keep the selected tool, range/coverage overlay, cost, and valid cells visible.
  Invalid taps should flash a short reason such as `NEED 4 BW`, `OCCUPIED`, or
  `SCRUBBER REQUIRES CORRUPTION`.
- Translate touch through `pointerup` with pointer capture and a movement
  threshold so swipes/cancels do not place units. Restrict `touch-action: none`
  to the canvas, not the whole document.
- Auto-pause on tab/background transitions and handle orientation changes without
  catch-up ticks.
- Preserve mouse hover previews and keyboard pause on desktop.

Mobile release matrix: 320×568, 360×800, 390/393×844/852, 420×900, 760 px tablet,
and phone landscape. Test iOS Safari and Android Chrome on real hardware before
production.

## Economy and Combat Clarity

### Make bandwidth understandable

- Label the resource consistently as `BW / BANDWIDTH` with the same icon wherever
  it appears.
- At Build start, animate `+26 WAVE GRANT`; during combat, show each trickle or
  bounty as a floating `+1 BW` and in a short event log.
- Each tool shows `owned purpose + cost + range/HP` rather than only a name and
  number.
- Disabled states show the exact shortage. Affordable states should be visually
  obvious without relying on color alone.
- Show the next wave grant before `LAUNCH WAVE` so spending is a decision rather
  than a guess.

### Initial tuning hypotheses to test, not final values

| Item | Current | First experiment | Reason |
|---|---:|---:|---|
| Wave 1 bandwidth | 26 | 30 | Lets a novice try a Firewall and ICE instead of being punished for exploring. |
| Firewall cost | 10 | 8–10 | Keep early path shaping accessible. |
| ICE cost | 18 | 14–16 | Reduce the cost of a mistaken placement. |
| ICE range | 1 | 2 with adjusted damage | Make placement more forgiving and combat more visible on an 8×8 board. |
| Build-phase refund | 40–50% | 100% | Encourage learning before launch. |
| Active-phase refund | 40–50% | 50–60% | Preserve consequence while allowing recovery. |

Do not ship these values from intuition alone. Evaluate fixed-seed playthroughs
for time-to-kill, bandwidth remaining, signal uptime, and sector clear rate.

### Accepted `phase4-v1` tuning

The fixed-seed campaign harness now replays the same readable per-sector plans
across four seeds. The legacy baseline clears 1/4 Sector 1 runs and 0/4 in
Sectors 2–3. The accepted ruleset clears 4/4 in all three sectors.

| Item | `phase4-v1` |
|---|---:|
| Sector 1 opening grant (W1) | 30 BW |
| Sector 2 opening grant (W6) | 42 BW |
| Sector 3 opening grant (W10) | 56 BW |
| Firewall cost / active refund | 8 / 4 BW |
| ICE cost / active refund | 14 / 8 BW |
| ICE range / damage | 2 / 3 per tick |
| Build-phase refund | 100% |

The larger Sector 3 opening grant buys distributed coverage against four entry
edges; it does not reduce Goliath health or remove the need to place Overclock
beside ICE. `npm run balance:report` is a CI gate and fails if any accepted
fixture loses.

### Add direct agency carefully

First make placement, range, path preview, and economy clear. Then playtest one
universal deterministic countermeasure: a once-per-wave `SIGNAL PULSE` targeted
at a board cell that briefly slows and damages intrusions in a small area. It
should charge from live-signal uptime, reinforcing the routing objective. Keep it
only if it improves fun without eclipsing ICE and Firewall placement. Adding it
requires a replay command and ruleset-version release; it is not a visual-only
feature.

Decision for `phase4-v1`: do not ship Signal Pulse. The accepted placement and
economy changes meet the fixed-seed clear target while retaining ICE, Firewall,
Scrubber, and Overclock as the meaningful verbs. A universal attack would add a
new replay surface without evidence that it improves fun beyond those choices.

## Twelve-Wave Campaign Plan

### Sector 1 — Perimeter Run, waves 1–5

- Wave 1: guided west-edge Probe. Highlight two useful ICE cells and explicitly
  say `30 BW received; ICE costs 14`.
- Wave 2: introduce multiple enemies and Firewall path shaping.
- Wave 3: introduce the Spoof and explain why one wall can be jumped.
- Wave 4: combine entry edges and teach selling/repositioning during Build.
- Wave 5: readable all-edge climax with a generous recovery window before it.

Success target: a new player understands the economy in under 30 seconds, clears
Wave 1 on the first try, and can clear the sector after at most one learning loss.

### Sector 2 — Relay Canyon, waves 6–9

- Wave 6: teach void terrain and one Hunter with clear target telegraphing.
- Wave 7: teach Splitter death behavior before mixing it with other threats.
- Wave 8: combine Hunter/Splitter pressure and make Scrubber value visible.
- Wave 9: sector mastery storm, not a surprise rule test.

Success target: losses feel attributable to an exposed unit or ignored corruption,
not to hidden targeting or insufficient purchasing power.

### Sector 3 — Core Vault, waves 10–12

- Wave 10: teach Overclock by previewing the affected ICE coverage/damage.
- Wave 11: mastery wave combining all prior threats.
- Wave 12: Goliath boss with an unmistakable spawn warning, boss health treatment,
  clear Firewall impact, and a strong victory sequence.

Success target: the Goliath is threatening but the player knows before launch
which formation can stop it.

## Visual and Asset Direction

### Attachment 1 evaluation

Keep:

- Cinematic operator portrait, rain, cyan/magenta lighting, strong framing, and
  bold readable hierarchy.
- Small monospaced system labels paired with a large clean display face.
- Sector/live badges and the feeling of an active mission feed.

Do not copy into live play:

- A portrait occupying half of a phone screen while combat is running.
- Dense decorative borders around every control.
- Photoreal detail inside 36–60 px board pieces, where it becomes noise.

Use the cinematic style on the title screen, mission briefing, sector cards,
enemy dossiers, boss warning, and results. Use simplified, high-contrast sprites
and effects on the board.

### Asset inventory before implementation

Create an approved inventory of the available GridWatchZero material and map each
source asset to a role. Initial target set:

- 1 operator hero image with portrait and wide crops.
- 3 sector key-art images.
- 6 enemy dossier portraits or silhouettes.
- 5 unit sprites plus Source, Core, and Sell/action icons.
- Route, corruption, hit, explosion, shield, spawn-warning, and victory effects.
- Optional local WOFF2 display and monospaced fonts with documented licenses.

For every asset record source/provenance, license/approval, crop-safe area,
dimensions, format, compressed size, and intended screen. Commit optimized local
WebP/PNG/SVG assets; do not load art from a CDN or generation service at runtime.

### Renderer direction

Do not begin with the existing Phase 5 tilted projection. Mobile hit accuracy and
board visibility are higher priorities. First upgrade the top-down board with:

- textured sector floors and distinct but quiet backgrounds;
- readable unit/enemy silhouettes and size hierarchy;
- range, coverage, spawn-edge, path, and targeting overlays;
- stronger route pulse, turret beams, impact bursts, corruption spread, damage
  states, and boss telegraphing;
- restrained shadows/bevels and one consistent light direction;
- reduced-motion support and a performance quality fallback.

Re-evaluate subtle 2.5D depth only after the flat mobile board passes input and
performance gates. If depth is added, render and pointer mapping must share one
transform and produce the same tactical information on every device.

## Leaderboard Protection Plan

`GridWatchGamesDB` must remain intact and optional. No visual/mobile phase may
alter score tables, Auth identity, the game slug, RLS, service-role isolation,
or existing score rows.

### Before any sim-affecting release

1. Define an explicit `SIM_VERSION`/ruleset identifier in the replay payload.
2. Keep the current validator available while introducing the new validator.
3. Use additive score categories/seasoning if balance or scoring changes make old
   and new scores incomparable. Never delete or rewrite historical rows.
4. Resolve the current global-board null-category pooling behavior before adding
   more aggregate/version categories.
5. Regenerate and diff `sim.bundle.js` in CI for every sim/data change.
6. Add golden replay fixtures for accepted win, accepted loss, malformed log,
   out-of-order commands, unfinished run, and score bounds.

### Compatible release order

1. Deploy a backward-compatible Edge Function that accepts both the current and
   new ruleset while the old client remains live.
2. Verify Auth, handle, reads, accepted replay, rejected replay, category, rank,
   and offline fallback in staging or a safe dedicated test category/account.
3. Deploy the new Pages client.
4. Run a production read smoke test and one controlled authenticated submission.
5. Keep the prior validator/Function revision available through the rollback
   window; retire it only after old clients no longer matter.

Cloudflare preview deployments should use no Supabase variables or a staging
Supabase project/branch. Do not point public previews at production writes, and do
not wildcard preview origins in Edge Function CORS.

## Attachment 2: Delivery and Deployment Evaluation

Attachment 2 is a strong engineering loop—Understand, Plan, Build, Test, Review,
Improve, Reflect—but it is not a complete deployment strategy by itself. It does
not define environments, compatibility between Pages and Supabase, production
gates, data preservation, or rollback.

Use it as the work cadence for every small pull request:

1. **Understand:** establish one player problem and baseline evidence.
2. **Plan:** define a small shippable slice, affected architecture, edge cases,
   and acceptance criteria.
3. **Build:** implement on a short-lived branch without expanding scope.
4. **Test:** run deterministic checks, desktop/mobile browser checks, offline
   checks, and validator checks when applicable.
5. **Review:** use the Cloudflare preview for visual/user review; use a safe
   Supabase environment for authenticated write tests.
6. **Improve:** fix the observed failures and repeat the same acceptance test.
7. **Reflect:** update `HANDOFF.md`, design docs, test fixtures, and this skill
   guide with what changed and what remains.

### Production topology

```text
feature branch / PR
        |
        +--> GitHub CI: install, audit, build, validator-sync, deterministic tests
        |
        +--> Cloudflare Pages preview: mobile/desktop/offline/user review
        |
        +--> Supabase staging/branch only when Auth/replay changes
        v
merge to protected main
        |
        +--> Cloudflare Pages production
        +--> version-compatible Supabase Edge Function release when required
        v
production smoke tests + rollback window + handoff update
```

Cloudflare's existing Git integration and PR previews are appropriate and should
remain. UI/render-only releases can use Pages rollback to a prior successful
production deployment. Sim releases also need a documented Edge Function rollback
to the previous source and pinned validator SHA. Database changes must be additive
so an application rollback never requires destructive data rollback.

## Phased Implementation Plan

### Phase 0 — Baseline and decisions

- Approve the twelve-wave interpretation or explicitly change project scope.
- Inventory GridWatchZero assets and approve the attachment 1 art direction.
- Capture fixed-seed W1–W12 baselines and mobile screenshots.
- Define success metrics and a small manual playtest script.
- Decide whether a Supabase staging project/branch is available.
- Align `CONTEXT.md`, `SECURITY.md`, README hosting copy, and verification notes
  with the current optional-leaderboard architecture.

Gate: no implementation begins without the wave-scope and leaderboard release
decisions recorded.

### Phase 1 — Mobile playability

- Replace the stacked mobile page with a single-viewport play shell.
- Compact the HUD, add the fixed tool dock, safe areas, landscape layout, and
  details/pause sheet.
- Rewrite tap handling and add orientation/background pause behavior.
- Keep simulation, scoring, and leaderboard payload unchanged.

Gate: full active play at 320×568 and 390×844 without document scrolling; ten
consecutive intended placements on real iOS and Android hardware without an
accidental placement.

### Phase 2 — Build phase and teaching

- Make every Build phase player-controlled and remove automatic prep pressure.
- Add wave intel, spawn-edge/path/range previews, contextual tool explanations,
  affordability reasons, and bandwidth delta feedback.
- Guide Wave 1 and progressively disclose later tools/threats.
- Version replay behavior if Build timing changes affect the deterministic sim.

Gate: a first-time player can explain how to earn/spend bandwidth, what Firewall
and ICE do, and how to launch a wave without opening the briefing.

### Phase 3 — Visual foundation and asset integration

- Establish the asset manifest, palette, typography, sprite scale, animation
  timing, accessibility, and bundle budgets.
- Upgrade title/briefing/sector/results with cinematic art.
- Upgrade the flat live board with sprites, overlays, feedback, and sector mood.
- Add reduced-motion and performance-quality fallbacks.

Gate: board state remains readable in a still image and in motion at the smallest
phone size; steady play stays near 60 fps on the agreed mid-range phone.

### Phase 4 — Balance and agency

- Run the bandwidth/cost/range/refund experiments with fixed seeds.
- Tune Sector 1 for learning, Sector 2 for tactical pressure, and Sector 3 for a
  fair boss sprint.
- Test the optional Signal Pulse; keep it only if it improves routing-centered
  decisions.
- Introduce replay/ruleset versioning and additive leaderboard categories before
  shipping incomparable balance/scoring changes.

Gate: the owner can clear Sector 1 comfortably on mobile, reach Sector 3 after a
reasonable learning curve, and explain why each loss occurred.

### Phase 5 — Full campaign and release candidate

- Complete W1–W12 win/loss/retry/navigation playthroughs on phone and desktop.
- Verify deterministic replay and client/server score agreement.
- Verify the optional offline path produces no Supabase traffic.
- Verify Auth, handle, Top 20 reads, score submission, keep-best behavior, and
  Command Nexus aggregate behavior in the approved environment.
- Use a Cloudflare preview for sign-off, then follow the compatible release order.

Gate: CI green, preview approved, no high audit findings, docs updated, rollback
rehearsed, and production smoke tests assigned.

## Success Scorecard

- No active-play document scrolling at 320×568 through 420×900 portrait sizes.
- Critical state and all available actions visible in one play viewport.
- First-time player understands Bandwidth, Firewall, ICE, Signal, and Launch in
  under 30 seconds.
- Wave 1 first-attempt success is the norm; Sector 1 clear requires no more than
  one learning loss for the target player.
- Every loss has a visible cause: route severed, hardware destroyed, corruption
  ignored, or Core contact.
- Board remains tactically legible with visual assets enabled and reduced motion.
- Near-60 fps target on agreed mid-range mobile hardware during the busiest wave.
- Game remains fully playable offline with leaderboard env vars absent.
- Existing leaderboard rows, Auth ownership, RLS, game slug, and historical scores
  remain intact.
- New sim releases are replay-versioned, server-validated, and rollback-capable.

## Explicitly Out of Scope

- A fourth sector, waves beyond twelve, multiplayer, a new backend, runtime asset
  generation, React/Phaser, or non-Supabase network features.
- Shipping the existing 2.5D projection before mobile input and board-fit gates.
- Destructive leaderboard migrations or resetting historical scores.
