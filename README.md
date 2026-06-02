# GridWatch: Signal Breach

A static browser-playable cyberpunk signal-routing defense game built with Vite, vanilla TypeScript, and HTML5 Canvas2D.

## What It Is

GridWatch: Signal Breach is a single-level signal-routing defense game. Place relays, firewalls, and ICE turrets on an 8x8 grid to keep the Source connected to the Core while intrusions corrupt the board over five deterministic waves.

The game is fully static: no backend, no API, no network calls, no secrets, and no environment files.

## How Codex Helped

Codex scaffolded the Vite + TypeScript project, separated deterministic simulation code from Canvas rendering and DOM UI, implemented seeded wave logic and scoring, tuned the five-wave curve, and added GitHub Pages deployment support.

## Controls

- Select `Relay`, `Firewall`, `ICE`, or `Sell` from the left control panel.
- Click a grid tile to place the selected unit or sell an existing unit.
- Use `Skip prep` to start a wave early.
- Use `Restart` on the end screen to play again.

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
