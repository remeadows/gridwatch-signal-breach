# GridWatch: Signal Breach

A static browser-playable cyberpunk signal-routing defense game built with Vite, vanilla TypeScript, and HTML5 Canvas2D.

## What It Is

GridWatch: Signal Breach is a three-sector signal-routing defense campaign. Place relays, firewalls, ICE turrets, scrubbers, and overclock nodes on 8x8 grids to keep the Source connected to the Core while probes, crawlers, spoofs, hunters, splitters, and a goliath corrupt the board over twelve deterministic waves.

The game itself is a static client (no game logic on a server). The only network
feature is an optional **high-score leaderboard** (see below); with no leaderboard
env vars configured, the game runs fully offline with no network calls.

## How Codex Helped

Codex scaffolded the Vite + TypeScript project, separated deterministic simulation code from Canvas rendering and DOM UI, implemented seeded wave logic and scoring, added the V2 sector campaign navigation, and added GitHub Pages deployment support.

## Controls

- Select `Relay`, `Firewall`, `ICE`, or `Sell` from the left control panel. Later sectors unlock `Scrubber` and `Overclock`.
- Click a grid tile to place the selected unit or sell an existing unit.
- Use `Skip prep` to start a wave early.
- Use `BRIEFING` in the HUD to pause and review the mission notes.
- Use `Retry Sector`, `Sector Select`, `Title`, or `Next Sector` from the end screen.

## Local Development

```sh
npm install
npm run dev
npm run build
npm run preview
```

The Vite base path is `/` so the app is served from the root of its host.

## Deploy

The game is hosted on **Cloudflare Pages** at `https://GridWatch-SignalBreach.warsignallabs.net`, connected to this repository via Cloudflare's Git integration. Every push to `main` triggers a Cloudflare build.

Cloudflare Pages build settings:

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Node version:** pinned to `24` via `.nvmrc`

Pull requests get automatic Cloudflare preview deployments. A lightweight GitHub Actions workflow (`.github/workflows/ci.yml`) still builds and audits on every PR and push to `main` (the `build` status check), without deploying.

## Leaderboard (high scores)

A global + per-sector **Top 20** leaderboard, backed by Supabase (`GridWatchGamesDB`,
a shared multi-game database). Players view rankings from the title screen and submit
their run with a handle on the game-over screen.

**Anti-cheat by replay.** The simulation is pure and deterministic, so the client
submits its run as `{ seed, sector, commands }` rather than a score. A Supabase
Edge Function (`submit-gridwatch-score`) replays the run with the *exact* game code
and stores the score **it** computes — the client's claimed number is never trusted,
and a tampered or unfinished run is rejected. RLS blocks all direct writes/reads to
the `scores` table; reads go through the `get_leaderboard` RPC, writes through the
function's service role only.

The validator runs a bundle generated from `src/sim`:

```sh
npm run build:validator   # regenerates supabase/functions/submit-gridwatch-score/sim.bundle.js
```

CI fails if that bundle drifts from `src/sim`, so the server-side logic always
matches the game.

### Configuration

Set two build-time env vars in the **Cloudflare Pages** project (and `.env.local`
for local dev — see `.env.example`). Both are publishable; protection comes from RLS
plus replay validation, not secrecy:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

These are **build-time** variables: Vite inlines them when the site is built, so
after adding or changing them in the Cloudflare Pages project you must trigger a
fresh production build (push to `main` or retry the latest deployment) for the
values to take effect.

The Supabase **service-role** key is never in the repo or frontend — it lives only in
the Edge Function's runtime environment. If the env vars are absent, the leaderboard
UI degrades gracefully and the game stays fully offline.
