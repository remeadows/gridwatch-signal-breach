# GridWatch: Signal Breach

A static browser-playable cyberpunk signal-routing defense game built with Vite, vanilla TypeScript, and HTML5 Canvas2D.

## What It Is

GridWatch: Signal Breach is a three-sector signal-routing defense campaign. Place relays, firewalls, ICE turrets, and sector-unlocked tools on 8x8 grids to keep the Source connected to the Core while intrusions corrupt the board over twelve deterministic waves.

The game is fully static: no backend, no API, no network calls, no secrets, and no environment files.

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
