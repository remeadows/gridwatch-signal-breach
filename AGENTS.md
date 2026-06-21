# Agent Instructions

## Project Scope

GridWatch: Signal Breach is a static-first browser game and must remain fully
playable offline. The **one sanctioned exception** is the optional online
leaderboard (Supabase): OAuth sign-in (Google/GitHub) and authenticated score
submission with server-side replay validation. This adds a build-time
dependency (`@supabase/supabase-js`), `VITE_SUPABASE_*` env vars, and network
calls — but only when those vars are configured. With them absent the game runs
with no backend, no accounts, and no network traffic. Outside the leaderboard,
keep it static: no other backends, API calls, secrets, runtime dependencies, or
multiplayer. The core simulation stays pure and deterministic.

The current V2 product scope is a three-sector campaign with twelve total waves. Do not add sectors beyond the existing three, and do not add waves beyond the existing twelve-wave campaign.

Use vanilla TypeScript, Vite, and HTML5 Canvas2D only. Do not add React, Phaser, or another game framework.

The canonical public repository is `https://github.com/remeadows/gridwatch-signal-breach`.

## Architecture Rules

- Keep deterministic game logic in `src/sim/`. This code should stay pure and DOM-free.
- Keep all Canvas2D drawing and animation in `src/render/`.
- Keep pointer-to-command translation in `src/input/`.
- Keep HUD, overlays, unit picker, scoring display, and WebAudio UI effects in `src/ui/`.
- Keep gameplay tuning in `src/data/` when practical. Avoid burying tuning numbers in logic.
- Preserve routing as the core verb: players place/sell units, and the sim computes the Source-to-Core signal route.

## Important Files

- Read `CONTEXT.md` before structural work.
- Read `HANDOFF.md` before deployment, verification, or tuning work.
- `src/main.ts` wires the app together and owns the requestAnimationFrame loop.
- `vite.config.ts` sets `base: "/"` (served from the host root on Cloudflare Pages) and disables the modulepreload polyfill to avoid generated `fetch()`.

## Verification

Run the checks relevant to your change. For any shipping or behavior change, run:

```sh
npm install
npm run build
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
rg -n "fetch|XMLHttpRequest|process\\.env|import\\.meta\\.env" src index.html package.json vite.config.ts README.md .github dist
find . -name '.env*' -print
```

Expected: install/build/dev/preview succeed, the app renders at the host root (`/`), the `rg` command has no matches, and `find` prints no `.env*` files.

For public-repo security checks, also run:

```sh
npm audit --audit-level=high
```

Expected: no high, critical, or unpatched production-impacting advisories.

## Git Notes

If this workspace is nested inside another local repository, scope staging and commits to this project directory unless the user explicitly asks otherwise. Do not push to an unrelated parent remote. The intended upstream for this game is `remeadows/gridwatch-signal-breach`.
