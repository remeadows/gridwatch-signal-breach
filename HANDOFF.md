# GridWatch Handoff

## Current State

- Playable single-level game is complete through five waves with win/loss, scoring, restart, HUD polish, Canvas animation, and minimal WebAudio SFX.
- Overhaul Phase 1 is committed as `6005afe` (`Add intro screen flow`): title screen, briefing flow, app-level screen state, and pointer gating.
- Overhaul Phase 2 is implemented in the current checkpoint: shared path-data icons, Canvas icon rendering, DOM SVG icons, picker icons, briefing icons, and board icon replacements.
- Phase 3 should start from the pushed Phase 2 baseline and focus only on board juice: background layer, route pulse, hover ghost, marker/enemy animation, corruption/event polish, and scanline/vignette styling.
- The working game URL in preview is `http://127.0.0.1:4173/gridwatch-signal-breach/` when `npm run preview` is running.

## Verification To Re-run

```sh
npm install
npm run build
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
rg -n "fetch|XMLHttpRequest|process\\.env|import\\.meta\\.env" src index.html package.json vite.config.ts README.md .github dist
find . -name '.env*' -print
rg -n "TODO|FIXME|XXX|HACK" src
rg -n ": any\b" src
```

Expected: install/build/dev/preview succeed, the app renders at `/gridwatch-signal-breach/`, the first `rg` command has no matches, `find` prints no `.env*` files, the `TODO` `rg` has no matches (the old `src/render/animator.ts` stub must stay gone), and the `any` `rg` has no matches.

## Important Caveats

- This directory is now its own standalone git repository. Its intended upstream is `https://github.com/remeadows/gridwatch-signal-breach.git`.
- Keep runtime dependencies empty. Only Vite and TypeScript are dev dependencies.
- Keep gameplay tuning in `src/data/` where practical. Score weights currently live in `src/sim/scoring.ts`.
- Do not add manual path drawing, backend/API calls, env files, additional levels, or extra waves unless the product scope changes.

## Good Next Checks

- Playtest W1-W5 after any tuning change and confirm W1 is forgiving while single-lane relay routes fail once Spoof Packets appear.
- If deploying to GitHub Pages, confirm the published URL matches the Vite base path and does not show a blank canvas.
