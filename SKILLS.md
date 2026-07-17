# GridWatch Skill Guide

Last reviewed: 2026-07-16

Use this file to select the right Codex skill and verification path for work in
GridWatch: Signal Breach. `AGENTS.md` remains the highest-priority project guide.

## Read First

Before structural, gameplay, deployment, or tuning work, read:

1. `AGENTS.md`
2. `CONTEXT.md`
3. `HANDOFF.md`
4. This file
5. `README.md`
6. The relevant design spec in `docs/`

There is currently no project-root `CLAUDE.md` or `MEMORY.md`. Treat
`CONTEXT.md` as the available project memory unless one of those files is added.
Its opening static-only description predates the optional leaderboard; use
`AGENTS.md` and `HANDOFF.md` as the authority for the sanctioned Supabase exception.

## Skill Routing

| Work | Skill | Project-specific note |
|---|---|---|
| Game design, gameplay, or interactive simulation | `axiom-games` | The available skill is oriented toward Apple game frameworks. Use its general game-loop discipline, but this repository's vanilla TypeScript/Canvas2D architecture is authoritative. |
| Browser interaction and mobile/desktop visual QA | `playwright` | Use the CLI workflow for 320, 390/393, 420, 760, and desktop viewport checks. Keep temporary artifacts out of the repository when the task is complete. |
| Asset generation or editing | `imagegen` | Generated assets must be local, optimized, documented, and usable offline. Never add a runtime image-generation or asset API. |
| Cloudflare Pages configuration or release work | `cloudflare` | Preserve Git-integrated previews and production deploys from `main`. Do not add Pages Functions or another backend. |
| Supabase Auth, leaderboard, database, or Edge Function work | `supabase` | `GridWatchGamesDB` is shared. Preserve RLS, Auth identity, the game slug, replay validation, and service-role isolation. |
| PostgreSQL changes for the leaderboard | `supabase-postgres-best-practices` | Prefer additive, reversible migrations. Never test writes against production casually. |
| Security review | `security-best-practices` | Pay special attention to browser-exposed keys, OAuth redirect origins, RLS, SECURITY DEFINER functions, CORS, and dependency supply chain. |
| Game or renderer tests | `axiom-testing` | Keep deterministic tests DOM-free where possible; test pointer/render agreement separately in a browser. |

## Architecture Invariants

- Keep deterministic game logic pure and DOM-free in `src/sim/`.
- Keep drawing and animation in `src/render/`, input translation in `src/input/`,
  UI and WebAudio in `src/ui/`, and tuning in `src/data/`.
- Stay on vanilla TypeScript, Vite, HTML, CSS, and Canvas2D.
- Keep the core game fully playable offline. The optional Supabase leaderboard is
  the only sanctioned network feature.
- Do not add sectors beyond the existing three or waves beyond the existing
  twelve without an explicit project-scope change.
- Preserve routing as the core verb: the player shapes the Source-to-Core signal
  route while defending it.
- Never expose the Supabase service-role key in the client or repository.
- Any sim or tuning change that affects replay must regenerate
  `supabase/functions/submit-gridwatch-score/sim.bundle.js` and be deployed in a
  version-compatible way with the Edge Function.

## Verification Lanes

### UI, input, rendering, copy, or local asset changes

Run the build, dev, preview, offline, mobile viewport, keyboard, pointer, and
performance checks relevant to the change. Confirm the game still works with no
`VITE_SUPABASE_*` values configured.

### Simulation, economy, balance, scoring, or wave changes

In addition to the UI lane:

- Run deterministic replay checks with pinned seeds.
- Run `npm run build:validator` and confirm the committed validator bundle is in
  sync.
- Playtest all affected sectors through a win and a loss.
- Treat leaderboard ruleset/version compatibility as a release blocker.

### Progress or expansion-navigation shell changes

- Run `npm run verify:progress` to cover V1-to-V2 migration, malformed-storage
  recovery, storage unavailability, and campaign namespace isolation.
- Run `npm run verify:content` to prove the expansion registry still has no
  authored playable levels and only the permitted navigation placeholder.
- Verify the normal title flow with no flag, then use `?expansion-nav=1` only
  for preview QA. Check the campaign screen, six spoiler-safe chapter cards,
  and one five-card level screen at 390px and desktop widths. Confirm no
  horizontal document overflow, console errors, or expansion launch path.

### Leaderboard or deployment changes

In addition to the applicable lanes:

- Verify anonymous/offline play makes no leaderboard request when unconfigured.
- Verify Auth, handle selection, leaderboard reads, accepted replay submission,
  rejected invalid replay, and best-score behavior in a safe environment.
- Verify Cloudflare preview before production, then smoke-test the custom domain.
- Keep a known-good Cloudflare deployment and Edge Function revision ready for
  rollback.

## Standard Commands

Use the commands in `AGENTS.md` and `HANDOFF.md` as the canonical checklist.
For current leaderboard-enabled builds, network/env searches must distinguish
the sanctioned code under `src/leaderboard/` and Supabase from accidental new
network dependencies elsewhere.
