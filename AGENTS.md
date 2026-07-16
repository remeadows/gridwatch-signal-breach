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

The current V2 product scope is a three-sector campaign with twelve total waves.
Keep that campaign immutable: do not add sectors or waves to it, and do not
renumber or reinterpret its sectors, waves, progress, scores, or replay
payloads.

## Approved Expansion Scope

The owner has additionally authorized exactly one separate `expansion-1`
campaign. It contains 30 standalone 8x8 levels arranged as six chapters of five
levels, with five authored waves per level (150 expansion waves total). Each
level has fresh fixed starting conditions; units, bandwidth, damage, and stat
upgrades do not persist between levels. The original V2 campaign remains three
sectors and twelve waves.

Expansion work must use a new immutable replay ruleset, campaign/level identity,
progress namespace, and isolated leaderboard categories. It must never overload
the existing `sector` identity, reuse `phase4-v1` score categories, rewrite or
delete historical leaderboard rows, or change behavior for `grid-drift` or
`gridwatch-match` in the shared GridWatchGamesDB.

Implement the expansion in reviewed batches: architecture first, then one
five-level chapter at a time. Do not put all 30 levels in one branch or pull
request. This authorization does not approve expansion asset families, new
mechanics, Supabase migrations, or Edge Function deployment by itself; each
requires the compatibility and owner-approval gates in
`docs/PHASE5_ASSET_AND_30_LEVEL_EXPANSION_PLAN.md`.

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
