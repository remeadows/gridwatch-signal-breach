# GridWatch Handoff

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

- On the Phase 1 Cloudflare Pages preview, run ten consecutive intended placements
  on real iOS and Android hardware in portrait and landscape. Confirm backgrounding
  and rotation pause without advancing an unseen wave.
- After the real-device gate, begin Phase 2 economy/Build-phase clarity. Any Build
  timing change that affects replay must be versioned and released with the
  validator/Edge Function compatibility sequence in the plan.
- Do not start the old Phase 5 projection work before Phase 2 clarity is validated;
  re-evaluate 2.5D depth only after the game is legible and controllable.
- Playtest W1-W12 after any tuning change and confirm W1 is forgiving, sector 2 introduces hunter/splitter plus scrubber pressure cleanly, and sector 3's overclock tool has visible value against the scripted goliath.
- After a Cloudflare Pages deploy, confirm `https://GridWatch-SignalBreach.warsignallabs.net` loads and does not show a blank canvas (root-relative `/assets/...` paths must resolve).
