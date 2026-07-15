# GridWatch Handoff

## Active Phase 3 Work — 2026-07-15

- Codex is implementing the approved visual-foundation slice on
  `codex/visual-combat-feedback-phase-3`, stacked on the clean Phase 2 promotion
  branch. PR #40 (`codex/promote-build-phase-clarity` → `main`) is required
  because PR #39 was merged into the Phase 1 branch after Phase 1 had already
  been squash-merged to `main`.
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
- Phase 2 promotion draft PR #40 is open at
  `https://github.com/remeadows/gridwatch-signal-breach/pull/40`. Stacked Phase 3
  draft PR #41 is open at
  `https://github.com/remeadows/gridwatch-signal-breach/pull/41`; its Cloudflare
  preview is
  `https://codex-visual-combat-feedback.gridwatch-signal-breach.pages.dev`.

## Active Phase 2 Work — 2026-07-15

- Codex is implementing the approved economy/Build-phase clarity slice on
  `codex/build-phase-clarity`, stacked on the Phase 1 branch and draft PR #38.
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
- Full Build-phase refunds are deliberately deferred: changing the existing
  partial-refund rule would alter deterministic economy and requires a versioned
  ruleset/validator release. The UI reports the actual refund instead.
- Browser verification passed at 320×568, 390×844, 568×320, and 1440×900 with
  zero mobile document scroll. Pre-launch placement, clock freeze, invalid-tile
  feedback, affordability updates, Enter/click launch, next-wave Build re-entry,
  pause, four-tool and six-tool docks, and a request/error-free offline run were
  checked. Real iOS and Android hardware remains the promotion gate.
- Draft PR #39 is open at
  `https://github.com/remeadows/gridwatch-signal-breach/pull/39`. Its Cloudflare
  branch preview is
  `https://codex-build-phase-clarity.gridwatch-signal-breach.pages.dev`.

## Active Mobile Work — 2026-07-15

- Codex is implementing the approved Phase 0/Phase 1 mobile-playability slice on
  `codex/mobile-playability-phase-1`. The working tree now contains responsive
  UI/input changes; the deterministic simulation, scoring, wave data,
  leaderboard client, Supabase schema, and Edge Function remain untouched.
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
- Draft PR #38 is open at
  `https://github.com/remeadows/gridwatch-signal-breach/pull/38`. Its Cloudflare
  branch preview is
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
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
rg -n "TODO|FIXME|XXX|HACK" src
rg -n ": any\b" src
```

Expected: install/build/build:validator/dev/preview succeed, the app renders at the host root (`/`), `build:validator` leaves `sim.bundle.js` unchanged, the `TODO` `rg` has no matches (the old `src/render/animator.ts` stub must stay gone), and the `any` `rg` has no matches.

Note: the previous "zero network / no `import.meta.env`" invariant no longer holds — the optional leaderboard adds `fetch` calls in `src/leaderboard/` and reads `VITE_SUPABASE_*` env vars. The game still runs fully offline when those vars are unset.

## Important Caveats

- This directory is now its own standalone git repository. Its intended upstream is `https://github.com/remeadows/gridwatch-signal-breach.git`.
- The only sanctioned runtime dependency is `@supabase/supabase-js` for the optional leaderboard. Dev dependencies are Vite, TypeScript, and esbuild (esbuild only bundles the leaderboard validator via `npm run build:validator`).
- Keep gameplay tuning in `src/data/` where practical. Score weights currently live in `src/sim/scoring.ts`.
- The leaderboard is the one sanctioned network feature. `src/sim` must stay pure and deterministic (no `Math.random`/`Date.now`) — the server-side anti-cheat replays it verbatim. After any `src/sim` change, run `npm run build:validator` and commit the regenerated `supabase/functions/submit-gridwatch-score/sim.bundle.js`, then redeploy the Edge Function.
- Do not add manual path drawing, sectors beyond the existing three, or waves beyond the existing twelve unless the product scope changes again.

## Good Next Checks

- Merge Phase 2 promotion PR #40 before merging the stacked Phase 3 visual PR;
  then retarget Phase 3 to `main` if GitHub does not do so automatically.
- On the Phase 3 Cloudflare Pages preview, run ten consecutive intended placements
  on real iOS and Android hardware in portrait and landscape. Confirm backgrounding
  and rotation pause without advancing an unseen wave, reduced-motion behavior,
  and sustained frame pacing during the busiest visible wave.
- Playtest the Build-to-launch cadence across W1-W12 and record completion rate,
  first-failure wave, unused bandwidth, and most-used tools before changing
  economy values. Any later rules/tuning change must use the validator/Edge
  Function compatibility sequence in the plan.
- Do not start the old Phase 5 projection work before Phase 2 clarity is validated;
  re-evaluate 2.5D depth only after the game is legible and controllable.
- Playtest W1-W12 after any tuning change and confirm W1 is forgiving, sector 2 introduces hunter/splitter plus scrubber pressure cleanly, and sector 3's overclock tool has visible value against the scripted goliath.
- After a Cloudflare Pages deploy, confirm `https://GridWatch-SignalBreach.warsignallabs.net` loads and does not show a blank canvas (root-relative `/assets/...` paths must resolve).
