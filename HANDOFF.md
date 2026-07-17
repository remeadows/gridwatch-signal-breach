# GridWatch Handoff

## Phase 7B In Progress — 2026-07-16

- PR #53 merged Phase 7A's reviewed campaign/content abstraction as `4411fc0`.
  It retains the original V2 sector data by reference and leaves `expansion-1`
  with zero authored, playable levels.
- Work now proceeds on `codex/phase7b-progress-navigation`. This batch adds a
  versioned `gridwatch.progress.v2` root that migrates and preserves
  `gridwatch.campaign.v1`, plus campaign/chapter/level navigation behind the
  disabled-by-default `?expansion-nav=1` QA flag. The shell must display only
  six chapter slots and one disabled non-playable placeholder; it cannot create
  an expansion game state, replay, score, or leaderboard submission.
- Phase 7B must not alter the live state/replay path, add a fourth V2 sector or
  any authored expansion level, alter `phase4-v1` metrics or the validator
  bundle, touch GridWatchGamesDB, or deploy an Edge Function.

## Phase 5 Accepted / Phase 6+ Planning — 2026-07-16

- PR #43 merged the reviewed Phase 4 hardening and shared-database compatibility
  work to `main` as `43fe0e4fb106d3027e03b90fab90e8a9894db87e`.
  Cloudflare production deployment `ba311ad0-4f66-4d3a-a187-6c16a6cbe7db`
  serves that merge.
- The owner cleared all three sectors, found Sectors 1 and 2 challenging but
  fair, verified that ICE and Firewalls are useful, and accepted mobile-web
  playability. Keep Phase 5; the accepted balance is now frozen.
- PR #44 merged the owner-accepted render-only Phase 6B Relay/ICE-turret/Probe
  vertical slice as `922b78d`. The owner reviewed it on Mac and iPhone. The
  Source/Core/Firewall foundation followed in PR #45; Crawler/Spoof/Hunter in
  PR #48 (`18a47bd`); Splitter/Goliath in PR #49 (`988fcf9`); and the final
  Scrubber/Overclock slice in PR #50 (`6a41353`). The owner then approved the
  complete thirteen-family roster for the default board presentation. PR #51
  merged that default-art rollout as `8e1284b`: normal loads use Phase 6 art,
  `?art=glyphs` and automatic per-sprite glyph fallback remain available, and
  the production custom domain serves the merged resolver and sampled Source,
  Scrubber, and Goliath assets with HTTP 200. This remained a render-only
  change with no sim, replay, score, database, Edge Function, or deployment
  configuration change.
- The owner approved the separate `expansion-1` definition: 30 standalone 8x8
  levels, six chapters of five levels, five waves per level (150 expansion
  waves), fresh fixed starting conditions, and no persistent stat upgrades.
  PR #52's documentation-only scope authority authorizes isolated
  campaign/level, replay, progress, and leaderboard identities while freezing
  the original three-sector/twelve-wave `phase4-v1` campaign. It does not
  authorize expansion level content, assets, Supabase migrations, or Edge
  Function deployment by itself.
- The initial `phase4-v1` ruleset is now frozen locally: opening grants are
  30/42/56 BW for Sectors 1/2/3, Firewall costs 8 BW, and ICE costs 14 BW with
  Manhattan range 2 and 3 damage per tick. Build-phase sales fully refund while
  active-wave sales retain the existing partial refunds.
- `npm run balance:report` replays readable guided plans across four fixed seeds
  per sector. The legacy baseline clears 1/4 Sector 1 runs and 0/4 in Sectors 2
  and 3. `phase4-v1` clears 4/4 in every sector; average Core integrity is 125.3,
  127.8, and 150 respectively. The report freezes every per-seed terminal wave,
  integrity, uptime, bandwidth, kill, corruption, remaining-unit, and score
  metric; CI fails on any drift or tick-budget overrun.
- The optional Signal Pulse was not retained. The tuned routing, ICE, Firewall,
  Scrubber, and Overclock decisions clear the campaign without a universal
  attack that could eclipse placement.
- `phase4-v1` is exported by the generated simulator bundle. Production Edge
  Function version 8 keeps omitted/`legacy-v1` submissions on the validator pinned
  to commit `fa0a5df`, while explicitly versioned submissions use the local
  Phase 4 bundle and prefixed score categories. The tuned client submits the
  explicit ruleset; pending OAuth runs preserve their original ruleset, and old
  unversioned pending runs resolve to `legacy-v1`.
- Phase 4 aggregate/daily/weekly rows are prefixed too. The existing Command
  Nexus hub therefore continues showing its legacy `standard`/period boards and
  will not display tuned runs until it explicitly opts into the new ruleset.
  This is intentional score isolation; do not dual-write tuned scores into
  legacy categories to make the hub appear current.
- Replay validation and canonicalization are now pure/testable. Golden fixtures
  cover a deterministic accepted win, accepted loss, repeated-run equality,
  out-of-order commands, commands after terminal state, inert-field stripping,
  unsupported rulesets, invalid units, Build/live refunds, current global
  category isolation, and legacy/current OAuth pending-run compatibility.
- The additive migration
  `20260716000516_isolate_gridwatch_leaderboard_categories.sql` preserves the
  legacy null-category board, adds an exact `phase4-v1:global` selector across
  only the three tuned sector categories, and isolates returned global ranks by
  ruleset. Other games using the shared RPC retain their existing behavior. It
  also replaces implicit PUBLIC execute with explicit grants and pins both
  SECURITY DEFINER functions to an empty search path. The reviewed SQL was
  applied to GridWatchGamesDB as migration-ledger version `20260716012745`.
- GridWatchGamesDB is shared by `grid-drift`, `gridwatch-match`, and
  `gridwatch-signal-breach`. Review of PR #42 found a concurrency race in the
  shared `record_score` keep-best path, so follow-up migration
  `20260716015402_harden_gridwatch_leaderboard_writes.sql` uses one atomic
  conflict-gated upsert. Signal Breach alone receives tied-score `rank()`
  semantics; the other two games retain deterministic `row_number()` ordering.
  The migration gives `get_leaderboard`, `record_score`, and Grid Drift's
  authenticated `get_rank` RPC the same score/timestamp/row-ID ordering while
  preserving all signatures and grants. The reviewed SQL is now active as
  migration-ledger version `20260716024816`.
- The approved server-first promotion, PR #43 backend hardening, merge, and
  final Pages smoke are complete. Edge version 8 is active with
  `verify_jwt=false` and bundle hash
  `002797c7a1351c9eba789ab3827a61c395be51505f6683eb7d5d07477bca400a`.
  The preview CORS origin remains `null`; localhost remains allowed.
- Exact pre/post raw-row and visible-board hashes match for all three shared-DB
  games. Grid Drift remains at six rows with best 11710, GridWatch Match remains
  at zero rows, and Signal Breach remains at eleven rows with Phase 4 best 514.
  No-op keep-best writes for Grid Drift and Signal Breach returned
  `improved: false`; the shared function signatures and grants are unchanged.
- Authenticated production checks under the existing `Russ` handle passed:
  legacy returned score 500/rank 1, `phase4-v1` returned score 514/rank 1,
  unsupported `phase4-v2` returned HTTP 400, and a command after terminal state
  returned HTTP 422. Repeating the Phase 4 fixture returned `improved: false`
  with best score 514. Legacy and Phase 4 global boards each contain only their
  own comparable sector row.
- An empty command log was initially used as the planned 422 probe, but the
  deterministic sim correctly runs it to a terminal 33-point loss, which is a
  valid submission under the existing win-or-loss policy. It did not improve
  any stored best. The runbook now uses a post-terminal command as the 422
  no-write probe instead.
- Local verification passes build/tool typecheck/replay/balance/audit, produces
  an idempotent validator bundle, and bundles the Edge Function with Deno/JSR
  imports externalized. The migration applies cleanly to an ephemeral PostgreSQL
  16 schema; seeded checks prove legacy and `phase4-v1` global boards exclude
  each other's sector and aggregate rows. Browser checks at 320×568, 390×844,
  568×320, and 1440×900 have no document overflow, console warning/error, or
  non-static request. Build and live ICE sales return 14 and 8 BW respectively;
  the constrained landscape dock keeps FULL/PARTIAL legible.
- PR #42 merged at `ed0cdccd92386852a98091e64d1aec1c96e9a061`; PR #43 then
  merged its ten ready-state fixes plus the shared-database compatibility
  hardening discovered during follow-up review.
- The reported production URL issue was checked independently. The custom
  domain serves HTTP 200, both hashed assets serve HTTP 200 with correct MIME
  types, and the title/briefing flow works in Chromium and WebKit at desktop and
  mobile-web viewports without console or request failures. Cloudflare production
  is now `main` at `43fe0e4`; the live bundle contains `phase4-v1`, and its
  public leaderboard returns `Russ` at 514.
- A substantive CodeRabbit CLI review of the initial full branch found no
  critical or warning issues. The ready-state PR #42 review later found ten
  additional issues, including the shared keep-best race. PR #43's first GitHub
  review found three further compatibility/documentation issues; all are fixed
  and pass the PostgreSQL 16 rank/concurrency harness. PR #43's refreshed CI,
  CodeQL, CodeRabbit, and Pages checks are green with no unresolved review
  threads. PR #43 is merged and the owner acceptance above closes the pending
  Phase 5 playability gate.

## Completed Phase 3 — 2026-07-15

- The approved visual-foundation slice was implemented on
  `codex/visual-combat-feedback-phase-3` and merged to `main` through PR #41.
- The title now uses a cinematic local CSS operator/rain treatment derived from
  the approved attachment direction. Sector cards, briefing panels, results,
  board chrome, and ambient page lighting share sector-aware visual tokens.
- The top-down board has three cached floor moods: Perimeter lanes, Canyon
  fractures, and Vault rings. Live feedback now includes hostile spawn portals,
  ICE impact rings/sparks/damage values, neutralization bursts, intrusion
  shadows, stronger corruption/damage treatment, Hunter hardware target locks,
  and a labeled Goliath health plate.
- Wave 12 receives an explicit `BOSS BUILD`, `GOLIATH INBOUND`, and `ENGAGE W12`
  warning. The pure presentation helper was verified against the scripted
  Goliath wave definition.
- `prefers-reduced-motion` disables shake, bobbing, traveling route packets,
  scan motion, and decorative animation while preserving state indicators.
  `?quality=low` (also selected automatically on devices reporting four or fewer
  logical processors) reduces cached texture marks and particle counts.
- `docs/VISUAL_ASSET_MANIFEST.md` records provenance, palette semantics, scale,
  timing, bundle policy, performance fallback, and the intake gate for future
  approved GridWatchZero raster assets. No runtime asset or font request was
  added.
- This slice does not modify `src/sim`, waves, units, scoring, leaderboard code,
  Supabase, or the validator bundle. GridWatchGamesDB remains untouched.
- Browser verification passed at 320×568, 390×844, 568×320, and 1440×900 with
  no mobile document overflow. Forced low-quality and reduced-motion modes were
  exercised, offline mode made no non-static requests, and the browser console
  had no errors. A 120-frame active Core Vault sample sustained the test
  machine's 120 Hz refresh with a 9.7 ms p95 frame time; real mid-range phone
  profiling remains the promotion gate.
- Phase 2 promotion PR #40 and Phase 3 PR #41 are merged. The historical Phase
  3 Cloudflare preview remains at
  `https://codex-visual-combat-feedback.gridwatch-signal-breach.pages.dev`.

## Completed Phase 2 — 2026-07-15

- The approved economy/Build-phase clarity slice was implemented on
  `codex/build-phase-clarity`, merged through PR #39, and promoted to `main`
  through PR #40 after the Phase 1 work in PR #38.
- Every prep interval is now an unlimited, player-controlled Build phase. The
  player can place or sell hardware while deterministic time is frozen, then
  press `LAUNCH W#` (or Enter) to record the existing `skipPrep` command and run
  the wave. The next Build phase freezes immediately after the previous wave.
- Build intel now identifies the wave grant, intrusion count/types, and entry
  edges. Canvas entry markers and likely-path previews make the threat readable
  before launch; Wave 1 explicitly teaches that ICE attacks and Firewalls block.
- Tool cards now explain purpose, show costs as bandwidth, and distinguish an
  unaffordable `NEED #` state from the Scrubber's `WAIT` state. The in-canvas
  readout reports grants, placement costs, sale refunds, invalid placement
  reasons, and bandwidth trickle. A successful placement keeps its range or
  effect area highlighted for touch players.
- This slice does not change `src/sim`, wave/unit tuning, scoring, leaderboard
  code, the Supabase schema, or the score-validation Edge Function. A replay
  boundary check confirmed that placements before launch and between waves
  reproduce exactly through the existing command log and validator. The
  generated validator bundle remains byte-identical.
- Phase 2 deliberately deferred full Build-phase refunds because they alter the
  deterministic economy. Phase 4 now implements them inside the versioned
  `phase4-v1` ruleset while preserving partial refunds during live waves.
- Browser verification passed at 320×568, 390×844, 568×320, and 1440×900 with
  zero mobile document scroll. Pre-launch placement, clock freeze, invalid-tile
  feedback, affordability updates, Enter/click launch, next-wave Build re-entry,
  pause, four-tool and six-tool docks, and a request/error-free offline run were
  checked. Real-device mobile-web testing in Safari on iPhone/iPad and Chrome
  on Android remains the promotion gate; no native app work is in scope.
- The historical Phase 2 branch preview remains at
  `https://codex-build-phase-clarity.gridwatch-signal-breach.pages.dev`.

## Completed Phase 1 Mobile Work — 2026-07-15

- The approved Phase 0/Phase 1 mobile-playability slice was implemented on
  `codex/mobile-playability-phase-1` and merged through PR #38. The deterministic
  simulation, scoring, wave data, leaderboard client, Supabase schema, and Edge
  Function remained untouched.
- The required pre-read found no project-root `CLAUDE.md`, `MEMORY.md`, or prior
  `SKILLS.md`. `CONTEXT.md` was used as the available project memory, and a new
  `SKILLS.md` now records project-specific skill routing and verification lanes.
- The durable proposal is in
  `docs/MOBILE_GAMEPLAY_VISUAL_DEPLOYMENT_PLAN.md`.
- Phase 1 replaces the stacked mobile page with a `100dvh` play shell, compact
  four-metric HUD, fixed tool dock, safe-area padding, and a three-column narrow
  landscape layout. End-of-run panels become scrollable full-screen sheets on
  mobile.
- Pointer input now commits a primary tap on release, captures the active pointer,
  and cancels a placement after more than 10 px of movement. Live play auto-pauses
  when the page is hidden, receives `pagehide`, or the screen orientation changes.
- Browser verification passed at 320×568 portrait, 390×844 portrait, 568×320
  landscape, and 1440×900 desktop. Both mobile orientations had zero document
  scroll; a 24 px drag left bandwidth unchanged; `pagehide` produced the paused
  overlay; and the desktop Canvas remained 720×720. Real-device mobile-web
  placement testing in Safari on iPhone/iPad and Chrome on Android remains a
  preview gate; no native app work is in scope.
- Current wave distribution remains 5/4/3 across the three sectors. The approved
  interpretation preserves the existing twelve-wave campaign.
- Attachment 1 is recommended as the cinematic direction for title, briefing,
  sector, boss-warning, and results screens—not as a space-consuming live-play
  layout. The accessible attachment inventory contains only attachments 1 and 2;
  no larger GridWatchZero library is present in the local attachment directory.
  Attachment 2 is useful as a continuous delivery loop but needs explicit
  environment, leaderboard compatibility, promotion, and rollback gates.
- Protect `GridWatchGamesDB`: visual/mobile work should not touch the leaderboard;
  any later sim/tuning change needs replay ruleset versioning, validator-bundle
  synchronization, additive score handling, and a compatible Edge Function-first
  release.
- The historical Phase 1 branch preview remains at
  `https://codex-mobile-playability-pha.gridwatch-signal-breach.pages.dev`.

## Current State

- Playable V2 campaign is complete through Phase 4: three sectors, twelve final wave rows, sector select, campaign unlock persistence, win/loss, scoring, restart, HUD polish, Canvas animation, and minimal WebAudio SFX.
- Overhaul Phase 1 is merged: title screen, briefing flow, app-level screen state, and pointer gating.
- Overhaul Phase 2 is merged: shared path-data icons, Canvas icon rendering, DOM SVG icons, picker icons, briefing icons, and board icon replacements.
- Overhaul Phase 3 is merged: cached board background, route pulse, hover ghost, Source/Core treatment, animated intrusions, corruption/event polish, and scanline/vignette styling.
- Overhaul Phase 4 is on `main`: HUD hero metrics, terminal-style prep/end overlays, UI select/start blips, mobile layout QA, and scripted win/loss playthrough verification.
- V2 Phase 1 is merged: run seed randomization and global rebalance.
- V2 Phase 2 is merged: firewall blocker/chew behavior and core contact damage.
- V2 Phase 3 is merged: sector campaign navigation, void maps, sector unlocks, HUD briefing pause, and sector-specific tools.
- V2 Phase 4 is on `main`: scrubber cleansing, overclock combat links, Hunter/Splitter/Goliath enemy behaviors, scripted spawns, final W6-W12 tuning, new icons/audio/briefing intel, and taunts.
- Phase 5 is owner-accepted on desktop and mobile web. Its three-sector,
  twelve-wave `phase4-v1` simulation, replay validator, and score categories are
  the frozen production baseline.
- The working game URL in preview is `http://127.0.0.1:4173/` when `npm run preview` is running.

## Verification To Re-run

```sh
npm install
npm run build
npm run build:validator   # must produce no git diff (CI enforces this)
npm run typecheck:tools
npm run verify:replays
npm run balance:report
npm audit --audit-level=high
rg -n "TODO|FIXME|XXX|HACK" src
rg -n ": any\b" src
```

Then verify each long-running server from a separate shell. Start dev in shell
A, run the health check in shell B, and stop shell A with Ctrl-C:

```sh
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

```sh
curl -fsS http://127.0.0.1:5173/ > /dev/null
```

Repeat for preview, again stopping the server with Ctrl-C after the health
check:

```sh
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

```sh
curl -fsS http://127.0.0.1:4173/ > /dev/null
```

Expected: install/build/build:validator/tool typecheck/replay/balance/dev/preview
succeed, audit finds no high vulnerabilities, the app renders at the host root
(`/`), `build:validator` leaves `sim.bundle.js` unchanged, the `TODO` `rg` has
no matches (the old `src/render/animator.ts` stub must stay gone), and the `any`
`rg` has no matches.

Note: the previous "zero network / no `import.meta.env`" invariant no longer holds — the optional leaderboard adds `fetch` calls in `src/leaderboard/` and reads `VITE_SUPABASE_*` env vars. The game still runs fully offline when those vars are unset.

## Important Caveats

- This directory is now its own standalone git repository. Its intended upstream is `https://github.com/remeadows/gridwatch-signal-breach.git`.
- The only sanctioned runtime dependency is `@supabase/supabase-js` for the optional leaderboard. Dev dependencies are Vite, TypeScript, and esbuild (esbuild only bundles the leaderboard validator via `npm run build:validator`).
- Keep gameplay tuning in `src/data/` where practical. Score weights currently live in `src/sim/scoring.ts`.
- The leaderboard is the one sanctioned network feature. `src/sim` must stay pure and deterministic (no `Math.random`/`Date.now`) — the server-side anti-cheat replays it verbatim. After any `src/sim` change, run `npm run build:validator` and commit the regenerated `supabase/functions/submit-gridwatch-score/sim.bundle.js`, then redeploy the Edge Function.
- Do not add manual path drawing, sectors beyond the existing three, or waves
  beyond the existing twelve under the current repository scope. The proposed
  thirty-level expansion remains planning-only until the owner approves its
  level semantics and a documentation-only scope-authority update amends
  `AGENTS.md`, `CONTEXT.md`, and this handoff.

## Good Next Checks

- Keep glyph fallback through at least one production release after the default
  Phase 6 rollout. Use `?art=glyphs` for a visual diagnostic or rollback.
- Review and merge the documentation-only expansion scope authority before any
  expansion implementation. Then begin Phase 7 campaign/level architecture
  with existing content only; do not add a fourth current-campaign sector or an
  expansion level in that first implementation batch.
- Keep every GitHub push behind both Codex and CodeRabbit review.
- After any future Cloudflare Pages deploy, confirm
  `https://GridWatch-SignalBreach.warsignallabs.net` loads, hashed root-relative
  assets resolve, offline mode stays playable, and current `phase4-v1` replay
  and leaderboard behavior remain unchanged.
