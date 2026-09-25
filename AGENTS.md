# Agent Instructions

## Project Scope

GridWatch: Signal Breach is a static-first browser game and must remain fully
playable offline. The **one sanctioned exception** is the optional online
leaderboard (Supabase): OAuth sign-in and authenticated score submission with
server-side replay validation. The leaderboard and sign-in use the shared
GridWatch account kit (`@gridwatch/account-kit`), which owns the Supabase
project coordinates; no environment variables are needed. Sign-in happens on
Nexus (`https://nexus.warsignallabs.net/account/sign-in`) and returns the
player to the game. Outside the leaderboard, keep it static: no other
backends, API calls, secrets, runtime dependencies, or multiplayer. The core
simulation stays pure and deterministic.

Scores are written ONLY by the `submit-gridwatch-score` Edge Function, as one
service-role `submit_score` call per accepted run on the shared board registry
(`gridwatch-signal-breach / campaign / r2` for cleared sectors, `expansion / r4`
for expansion wins). The client reads boards through `list_boards`, `get_board`
and `get_board_entry`. Never call `record_score`, `get_leaderboard` or read
`public.scores` (Nexus retires them in leaderboards phase 5).

The current V2 product scope is a three-sector campaign with twelve total waves.
Keep that campaign immutable: do not add sectors or waves to it, and do not
renumber or reinterpret its sectors, waves, progress, scores, or replay
payloads.

## Approved Expansion Scope

**Release override (2026-09-13):** the owner now authorizes finishing public
expansion with optional authenticated cloud saves and replay-validated per-level
leaderboards, GitHub publication, and Codex/CodeRabbit review. Current Blender
art is accepted. Saves sync unlocks/settings and an unfinished level at completed
wave boundaries, not exact mid-wave state. Follow
`docs/EXPANSION_PUBLIC_RELEASE_PLAN.md`. This supersedes the earlier local-only
restriction and adds cloud saves to the sanctioned Supabase boundary. Preserve
offline play, original scoring, shared-game isolation and server-first rollout;
do not bypass review gates or reset/delete shared data.

**Current owner override (2026-09-11):** the local end state is exactly three
chapters / 25 levels split 8 / 8 / 9, five waves each. Follow
`docs/EXPANSION_25_LOCAL_PLAN.md`; retain r1/r2/r3 identities and use r4 for the
new layout. Deliver chapter-sized local checkpoints; no push or deploy. This
supersedes the historical 30-level/six-chapter roadmap.

The owner has additionally authorized exactly one separate `expansion-1`
campaign. Its r4 layout contains 25 standalone 8x8 levels arranged as three
chapters of 8 / 8 / 9 levels, with five waves per level (125 total). Each
level has fresh fixed starting conditions; units, bandwidth, damage, and stat
upgrades do not persist between levels. The original V2 campaign remains three
sectors and twelve waves.

Expansion work must use a new immutable replay ruleset, campaign/level identity,
progress namespace, and its own leaderboard board (`expansion / r4`; a new content
revision needs a new board registered by a Nexus migration). It must never
overload the existing `sector` identity, write the campaign board, rewrite or
delete leaderboard rows, or change behavior for `grid-drift` or `gridwatch-match`
in the shared GridWatchGamesDB.

Implement the expansion in reviewed local checkpoints: architecture first,
then one chapter at a time. The owner approved the existing 21-family Blender
CLI grid/roster rebuild and local CodeRabbit diff review for this milestone.
New mechanics, Supabase migrations, Edge Function deployment and publication
remain separately gated. Preserve the compatibility and owner-approval gates in
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
- `vite.config.ts` sets `base: "/play/breach/"` because the game is served through the Nexus proxy at `https://nexus.warsignallabs.net/play/breach/`; `public/_redirects` rewrites `/play/breach/*` to the dist root so the same build also serves at the old host root. It still disables the modulepreload polyfill to avoid generated `fetch()`.

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

Expected: install/build/dev/preview succeed, the app renders at `/play/breach/` (and still at `/` on the old host via the `_redirects` rewrite), the `rg` command matches only the sanctioned leaderboard code (`src/leaderboard/api.ts`, `boardReads.ts`, `expansionScoreApi.ts`, `expansionSaveApi.ts`), the rankings-read identifiers in `src/ui/screens.ts` and `src/ui/expansionLeaderboardUi.ts`, and bundled copies under `dist`, and `find` prints no `.env*` files.

For public-repo security checks, also run:

```sh
npm audit --audit-level=high
```

Expected: no high, critical, or unpatched production-impacting advisories.

## Git Notes

If this workspace is nested inside another local repository, scope staging and commits to this project directory unless the user explicitly asks otherwise. Do not push to an unrelated parent remote. The intended upstream for this game is `remeadows/gridwatch-signal-breach`.
