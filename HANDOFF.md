# GridWatch Handoff

## Current State

- Playable single-level game is complete through five waves with win/loss, scoring, restart, HUD polish, Canvas animation, and minimal WebAudio SFX.
- Latest project commit at the time these notes were written: `de7bf96` (`Harden GridWatch for Pages shipping`).
- The working game URL in preview is `http://127.0.0.1:4173/gridwatch-signal-breach/` when `npm run preview` is running.

## Verification To Re-run

```sh
npm install
npm run build
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
rg -n "fetch|XMLHttpRequest|process\\.env|import\\.meta\\.env" src index.html package.json vite.config.ts README.md .github dist
find . -name '.env*' -print
```

Expected: install/build/dev/preview succeed, the app renders at `/gridwatch-signal-breach/`, the `rg` command has no matches, and `find` prints no `.env*` files.

## Important Caveats

- This directory currently sits inside the larger git repo at `/Users/russmeadows/Dev`. GitHub Actions only runs workflows from the repo root. If GridWatch remains nested in that repo, move the Pages workflow to the root `.github/workflows/` and add the correct `working-directory`; if GridWatch becomes its own repo, the current workflow path is ready.
- Keep runtime dependencies empty. Only Vite and TypeScript are dev dependencies.
- Keep gameplay tuning in `src/data/` where practical. Score weights currently live in `src/sim/scoring.ts`.
- Do not add manual path drawing, backend/API calls, env files, additional levels, or extra waves unless the product scope changes.

## Good Next Checks

- Playtest W1-W5 after any tuning change and confirm W1 is forgiving while single-lane relay routes fail once Spoof Packets appear.
- If deploying to GitHub Pages, confirm the published URL matches the Vite base path and does not show a blank canvas.
