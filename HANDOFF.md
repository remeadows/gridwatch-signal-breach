# GridWatch Handoff

## Active Phase 4 Work — 2026-07-15

- Codex is implementing the approved balance-and-agency foundation on
  `codex/balance-agency-phase-4`, based directly on merged Phase 3 PR #41.
- The initial `phase4-v1` ruleset is now frozen locally: opening grants are
  30/42/56 BW for Sectors 1/2/3, Firewall costs 8 BW, and ICE costs 14 BW with
  Manhattan range 2 and 3 damage per tick. Build-phase sales fully refund while
  active-wave sales retain the existing partial refunds.
- `npm run balance:report` replays readable guided plans across four fixed seeds
  per sector. The legacy baseline clears 1/4 Sector 1 runs and 0/4 in Sectors 2
  and 3. `phase4-v1` clears 4/4 in every sector; average Core integrity is 125.3,
  127.8, and 150 respectively. The report fails CI if any Phase 4 fixture loses.
- The optional Signal Pulse was not retained. The tuned routing, ICE, Firewall,
  Scrubber, and Overclock decisions clear the campaign without a universal
  attack that could eclipse placement.
- `phase4-v1` is exported by the generated simulator bundle. The Edge Function
  is prepared to keep omitted/`legacy-v1` submissions on the validator pinned
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
  SECURITY DEFINER functions to an empty search path.
- GridWatchGamesDB has not been changed and the Edge Function has not been
  deployed. The ruleset is now immutable and ready for the controlled
  server-first sequence: migration, backward-compatible Edge Function,
  controlled legacy/current submission checks, then merge the Pages client.
- A fresh read-only production baseline confirms the project is healthy, the
  migration is absent, no `phase4-v1:*` rows exist, and the live validator is
  still legacy-only Edge version 6. The public branch preview receives a `null`
  CORS origin while localhost remains allowed for the controlled smoke test.
  `docs/PHASE4_PROMOTION_RUNBOOK.md` records the exact fixture, checks, stop
  conditions, and non-destructive rollback sequence; it has not been executed.
- Local verification passes build/tool typecheck/replay/balance/audit, produces
  an idempotent validator bundle, and bundles the Edge Function with Deno/JSR
  imports externalized. The migration applies cleanly to an ephemeral PostgreSQL
  16 schema; seeded checks prove legacy and `phase4-v1` global boards exclude
  each other's sector and aggregate rows. Browser checks at 320×568, 390×844,
  568×320, and 1440×900 have no document overflow, console warning/error, or
  non-static request. Build and live ICE sales return 14 and 8 BW respectively;
  the constrained landscape dock keeps FULL/PARTIAL legible.
- Draft PR #42 is open at
  `https://github.com/remeadows/gridwatch-signal-breach/pull/42`. The frozen
  implementation at `ff527cc` passed CI, CodeQL, CodeRabbit, and Cloudflare
  Pages. The PR remains draft pending the explicitly approved server-first
  promotion and controlled replay checks.
- A substantive CodeRabbit CLI review of the full branch found no critical or
  warning issues. Its four minor copy/documentation inconsistencies were fixed;
  the focused follow-up review returned zero findings.

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
  checked. Real iOS and Android hardware remains the promotion gate.
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
  overlay; and the desktop Canvas remained 720×720. Real iOS and Android hardware
  placement testing remains a preview gate.
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
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
rg -n "TODO|FIXME|XXX|HACK" src
rg -n ": any\b" src
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
- Do not add manual path drawing, sectors beyond the existing three, or waves beyond the existing twelve unless the product scope changes again.

## Good Next Checks

- Review the frozen Phase 4 PR without pointing its public preview at production
  writes. GridWatchGamesDB and the production Edge Function remain unchanged.
- With explicit owner approval, apply the GridWatch-scoped migration, deploy the
  backward-compatible Edge Function, then verify Auth, handle, one legacy run,
  one `phase4-v1` run, exact categories, keep-best behavior, both ranks, and
  rollback before marking PR #42 ready and merging its tuned Pages client.
- On the Phase 3 Cloudflare Pages preview, run ten consecutive intended placements
  on real iOS and Android hardware in portrait and landscape. Confirm backgrounding
  and rotation pause without advancing an unseen wave, reduced-motion behavior,
  and sustained frame pacing during the busiest visible wave.
- Run owner and real-device playtests across W1-W12 and record completion rate,
  first-failure wave, unused bandwidth, and most-used tools. Any later tuning
  change must receive a new immutable ruleset and repeat the server-first path.
- Do not start the old Phase 5 projection work before Phase 2 clarity is validated;
  re-evaluate 2.5D depth only after the game is legible and controllable.
- Playtest W1-W12 after any tuning change and confirm W1 is forgiving, sector 2 introduces hunter/splitter plus scrubber pressure cleanly, and sector 3's overclock tool has visible value against the scripted goliath.
- After a Cloudflare Pages deploy, confirm `https://GridWatch-SignalBreach.warsignallabs.net` loads and does not show a blank canvas (root-relative `/assets/...` paths must resolve).
