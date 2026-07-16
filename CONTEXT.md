# GridWatch Context

GridWatch: Signal Breach is a static-first browser game built with Vite, vanilla
TypeScript, and Canvas2D. The game remains fully playable offline. Its one
sanctioned network feature is the optional Supabase leaderboard: Auth, reads,
and replay-validated score submissions are enabled only when
`VITE_SUPABASE_*` build variables are configured. The Vite base path is `/` so
the app is served from the root of its host (Cloudflare Pages).

## Architecture

- `src/main.ts` owns bootstrap, the animation loop, tick timing, and wires sim/render/input/UI together.
- `src/sim/` is the deterministic game model. It has no DOM access; state changes flow through `createGameState()`, `applyCommand()`, and `tick()`.
- `src/render/` draws the Canvas2D board, route, intrusions, flashes, and screen shake from sim state only.
- `src/input/` translates pointer clicks into sim commands.
- `src/ui/` renders HUD, unit picker, overlays, score screen, and small WebAudio event sounds.
- `src/data/` holds sectors, units, enemies, waves, and taunts tuning.
- `src/leaderboard/` contains the optional Supabase client boundary. The service
  role remains only in the Edge Function runtime.

## Simulation Notes

- The campaign has three 8x8 sectors. Sector 1 uses Source `(0,3)` and Core `(7,4)`; sectors 2 and 3 add void terrain and different Source/Core positions.
- Signal routing is auto-computed by BFS through Source, Relay tiles, and Core; corrupted tiles break routes.
- Intrusions spawn from wave-defined perimeter edges, including scripted Hunter, Splitter, and Goliath appearances in sectors 2-3. They pathfind toward the current route, Core, or player hardware depending on enemy targeting.
- Firewalls block movement and can be chewed through. ICE turrets damage intrusions in Manhattan range, with sector 3 Overclock nodes boosting adjacent turrets.
- Sector 2 unlocks Scrubbers, which cleanse corrupted tiles after 12 active ticks. Splitters spawn deterministic probes on death; the wave-12 Goliath is scripted and punishes unsupported walls.
- The V2 campaign has exactly twelve waves split across three sectors. Prep commonly lasts `14` ticks, with `350ms` simulation ticks, so standard prep is about five seconds.
- Scoring combines core integrity, neutralized intrusions, signal uptime percentage, and unused bandwidth efficiency.

## Build And Deploy

- Run locally with `npm install`, `npm run dev`, `npm run build`, and `npm run preview`.
- `vite.config.ts` disables Vite's modulepreload polyfill so the built bundle contains no generated `fetch()`.
- Hosting is on Cloudflare Pages (`GridWatch-SignalBreach.warsignallabs.net`) via Cloudflare's Git integration: each push to `main` runs `npm run build` and publishes `dist/`. Node is pinned to `24` via `.nvmrc`.
- `.github/workflows/ci.yml` builds and audits on PRs and pushes to `main` (emits the `build` status check required by `.github/rulesets/main-protection.json`); it does not deploy.
- Supabase migrations and the score-validation Edge Function are promoted
  separately from Pages. Any sim-affecting client release must follow the
  compatible server-first order recorded in `HANDOFF.md`.
