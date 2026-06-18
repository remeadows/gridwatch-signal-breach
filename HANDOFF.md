# GridWatch Handoff

## Current State

- Playable V2 campaign is complete through Phase 4: three sectors, twelve final wave rows, sector select, campaign unlock persistence, win/loss, scoring, restart, HUD polish, Canvas animation, and minimal WebAudio SFX.
- Overhaul Phase 1 is merged: title screen, briefing flow, app-level screen state, and pointer gating.
- Overhaul Phase 2 is merged: shared path-data icons, Canvas icon rendering, DOM SVG icons, picker icons, briefing icons, and board icon replacements.
- Overhaul Phase 3 is merged: cached board background, route pulse, hover ghost, Source/Core treatment, animated intrusions, corruption/event polish, and scanline/vignette styling.
- Overhaul Phase 4 is implemented on the active branch: HUD hero metrics, terminal-style prep/end overlays, UI select/start blips, mobile layout QA, and scripted win/loss playthrough verification.
- V2 Phase 1 is merged: run seed randomization and global rebalance.
- V2 Phase 2 is merged: firewall blocker/chew behavior and core contact damage.
- V2 Phase 3 is merged: sector campaign navigation, void maps, sector unlocks, HUD briefing pause, and sector-specific tools.
- V2 Phase 4 is implemented on the active branch: scrubber cleansing, overclock combat links, Hunter/Splitter/Goliath enemy behaviors, scripted spawns, final W6-W12 tuning, new icons/audio/briefing intel, and taunts.
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
- Keep runtime dependencies empty. Dev dependencies are Vite, TypeScript, and esbuild (esbuild only bundles the leaderboard validator via `npm run build:validator`).
- Keep gameplay tuning in `src/data/` where practical. Score weights currently live in `src/sim/scoring.ts`.
- The leaderboard is the one sanctioned network feature. `src/sim` must stay pure and deterministic (no `Math.random`/`Date.now`) — the server-side anti-cheat replays it verbatim. After any `src/sim` change, run `npm run build:validator` and commit the regenerated `supabase/functions/submit-gridwatch-score/sim.bundle.js`, then redeploy the Edge Function.
- Do not add manual path drawing, sectors beyond the existing three, or waves beyond the existing twelve unless the product scope changes again.

## Good Next Checks

- Phase 5 is next: projection, 2.5D pieces, lighting, pointer rewrite, and render performance checks.
- Playtest W1-W12 after any tuning change and confirm W1 is forgiving, sector 2 introduces hunter/splitter plus scrubber pressure cleanly, and sector 3's overclock tool has visible value against the scripted goliath.
- After a Cloudflare Pages deploy, confirm `https://GridWatch-SignalBreach.warsignallabs.net` loads and does not show a blank canvas (root-relative `/assets/...` paths must resolve).
