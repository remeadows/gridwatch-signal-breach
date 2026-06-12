# GridWatch Context

GridWatch: Signal Breach is a fully static browser game built with Vite, vanilla TypeScript, and Canvas2D. There is no backend, API, fetch/XHR, secrets, or environment configuration. The GitHub Pages base path is `/gridwatch-signal-breach/`.

## Architecture

- `src/main.ts` owns bootstrap, the animation loop, tick timing, and wires sim/render/input/UI together.
- `src/sim/` is the deterministic game model. It has no DOM access; state changes flow through `createGameState()`, `applyCommand()`, and `tick()`.
- `src/render/` draws the Canvas2D board, route, intrusions, flashes, and screen shake from sim state only.
- `src/input/` translates pointer clicks into sim commands.
- `src/ui/` renders HUD, unit picker, overlays, score screen, and small WebAudio event sounds.
- `src/data/` holds sectors, units, enemies, waves, and taunts tuning.

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
- `.github/workflows/pages.yml` builds `dist/` and deploys via GitHub Pages Actions when this project is the repository root.
