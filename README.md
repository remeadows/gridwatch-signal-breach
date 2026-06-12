# GridWatch: Signal Breach

A static browser-playable cyberpunk signal-routing defense game built with Vite, vanilla TypeScript, and HTML5 Canvas2D.

## What It Is

GridWatch: Signal Breach is a three-sector signal-routing defense campaign. Place relays, firewalls, ICE turrets, scrubbers, and overclock nodes on 8x8 grids to keep the Source connected to the Core while probes, crawlers, spoofs, hunters, splitters, and a goliath corrupt the board over twelve deterministic waves.

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

The Vite base path is `/gridwatch-signal-breach/` for GitHub Pages.

## Deploy

This repo includes a GitHub Actions workflow at `.github/workflows/pages.yml`. Push to `main`, enable GitHub Pages for Actions in the repository settings, and GitHub will publish the built `dist/` artifact.
