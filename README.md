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

- Select `Relay`, `Firewall`, `ICE`, or `Sell` from the tool dock. Later sectors unlock `Scrubber` and `Overclock`.
- Tap or click a grid tile to place the selected unit or sell existing hardware.
- Build phases freeze time. Press `LAUNCH W#` when the route and defenses are ready.
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

### Expansion 1 Chapter 1 local acceptance

Chapter 1 is intentionally available only on `localhost`/`127.0.0.1` while its
separate server validator and leaderboard categories remain unpublished:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4175 --strictPort
```

Open `http://127.0.0.1:4175/?expansion-nav=1`. The five authored levels contain
five waves each and use isolated `expansion-v1` state, replay, content hashes,
and progress. Local results never submit to Supabase. These query flags are
hostname-gated and cannot enable expansion play on the public site.

Use `npm run verify:expansion-sim`, `npm run expansion:balance`, and
`npm run expansion:content-report` for the Chapter 1 deterministic gates.

## Deploy

The game is hosted on **Cloudflare Pages** at `https://GridWatch-SignalBreach.warsignallabs.net`, connected to this repository via Cloudflare's Git integration. Every push to `main` triggers a Cloudflare build.

Cloudflare Pages build settings:

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Node version:** pinned to `24` via `.nvmrc`

Pull requests get automatic Cloudflare preview deployments. A lightweight GitHub Actions workflow (`.github/workflows/ci.yml`) still builds and audits on every PR and push to `main` (the `build` status check), without deploying.

## Leaderboard (high scores)

A global + per-sector **Top 20** leaderboard, backed by Supabase (`GridWatchGamesDB`,
a shared multi-game database). Players view rankings from the title or game-over
screen. Submitting a score requires signing in with **Google or GitHub**; each
player picks a unique handle and the board keeps only their **personal best** per
sector (and a single best-across-sectors row on the global board).

**Identity & best-per-player.** Auth is handled by Supabase Auth (Google/GitHub
OAuth). A `profiles` row maps each user to their handle, `scores` are owned by
`user_id` with a unique `(game, category, user_id)`, and the Edge Function does a
keep-best upsert (`record_score`) so replaying a sector only ever updates your own
top score.

**Anti-cheat by replay.** The simulation is pure and deterministic, so the client
submits its run as `{ ruleset, seed, sector, commands }` rather than a score. A
Supabase Edge Function (`submit-gridwatch-score`) authenticates the player,
selects the immutable ruleset validator, replays the run, and stores the score
**it** computes — the client's claimed number is never trusted, and a tampered or
unfinished run is rejected. Legacy clients remain on a pinned validator while
new score categories keep incomparable tuning separate. RLS blocks all direct
writes/reads to the `scores` table; reads go through the `get_leaderboard` RPC,
writes through the function's service role only.

The validator runs a bundle generated from `src/sim`:

```sh
npm run build:validator   # regenerates supabase/functions/submit-gridwatch-score/sim.bundle.js
```

CI fails if the generated current-ruleset bundle drifts from `src/sim`, so
`phase4-v1` server validation matches this game build. Legacy submissions use
their deliberately pinned historical bundle instead.

Sim-affecting releases must deploy their additive migration and backward-
compatible Edge Function before the matching Pages client. See `HANDOFF.md` for
the active promotion gate.

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

**Auth providers.** Sign-in needs Google and GitHub enabled in **Supabase →
Authentication → Sign In / Providers** (each provider's OAuth app uses the callback
`https://<project-ref>.supabase.co/auth/v1/callback`), and the site origin plus
`http://localhost:5173` listed under **Authentication → URL Configuration**.
