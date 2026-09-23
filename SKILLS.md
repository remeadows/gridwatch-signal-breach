# GridWatch Skill Guide

Last reviewed: 2026-09-23

Current leaderboard package: run `verify:expansion-leaderboard`,
`verify:expansion-score-client`, `verify:expansion-score-http`,
`verify:expansion-score-ui` and disposable
PostgreSQL `scripts/verify-expansion-score-database.sql`. Never run that fixture
against GridWatchGamesDB. Regenerate `build:expansion-validator` and verify the
original `build:validator` artifact remains unchanged. The r4 server-first client
latch is intentionally false until release. Follow
`docs/EXPANSION_LEADERBOARD_PACKAGE.md`; older blanket-rejection notes below
describe the historical protocol harness, not the new r4 dispatcher.

Current save package: the compatible Nexus server is deployed and the game now
uses released account-kit v0.2.5 in a local owner-bound adapter. Run
`verify:expansion-account-save` (including isolated two-device kit integration)
and `check:expansion-save-contract` (defaults to the installed kit) alongside
the existing codec/checkpoint/account/LAN lanes. Do not confuse these tests
with real authenticated two-device acceptance. The runtime uses shared kit
saves, not `expansionSaveApi.ts`'s historical standalone RPC prototype.

Upstream reconciliation: use `/play/breach/` on local ports 4391/4393.
Shared authentication comes from the account kit, not environment variables.
Dedicated LAN preview explicitly disables account networking. Before cloud-save
rollout, reconcile the local expansion RPC prototype with the shared Nexus save
service and register a compatible expansion schema. Older verification counts,
six-chapter references and root-host URLs below are historical.
The local schema/codec candidate is documented in
`docs/EXPANSION_SHARED_SAVE_CONTRACT.md`; test it with
`verify:expansion-save-codec` and the explicit companion-kit contract check.
Do not enable cloud writes until the reviewed kit/Nexus server is compatible.

Release override: the owner now requests public expansion with cloud saves and
leaderboards, permits GitHub review/publication, and accepts current Blender art.
Follow `docs/EXPANSION_PUBLIC_RELEASE_PLAN.md` for the new release scope; older
local-only passages below describe the completed milestone. Cloud saves are now
an authorized optional network capability, with offline play preserved. Physical
phone performance remains an evidence gap, not inferred from art acceptance.

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

Current local milestone: the owner approved three chapters (25 levels/125
waves, split 8 / 8 / 9), a consistent Blender-authored grid/roster, local verification/commits,
and sending this game's diff to CodeRabbit. Follow
`docs/EXPANSION_25_LOCAL_PLAN.md`; Chapters 4–6 and GitHub publication
are outside this milestone. Final contextual acceptance remains pending even
where source art or implementation was approved.

## Skill Routing

| Work | Skill | Project-specific note |
|---|---|---|
| Game design, gameplay, or interactive simulation | `axiom-games` | The available skill is oriented toward Apple game frameworks. Use its general game-loop discipline, but this repository's vanilla TypeScript/Canvas2D architecture is authoritative. |
| Browser interaction and mobile/desktop visual QA | `frontend-testing-debugging` plus available browser controls | Prefer the installed Computer Use browser API; test 320px, 390px, landscape and desktop viewports. Keep temporary screenshots outside the repo. Do not substitute viewport emulation for physical-phone acceptance. |
| Asset generation or editing | `imagegen` or local Blender | Generated assets must be local, optimized, documented, and usable offline. Expansion 3D assets may use the owner-approved reproducible Blender pipeline; keep editable `.blend` source and deterministic build scripts, then ship only pre-rendered raster sprites to Canvas2D. Never add a runtime image-generation or asset API. |
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
- Keep the core game fully playable offline. The leaderboard and Nexus sign-in
  (via the shared account kit) are the only sanctioned network features.
- Do not add sectors beyond the existing three or waves beyond the existing
  twelve without an explicit project-scope change.
- Preserve routing as the core verb: the player shapes the Source-to-Core signal
  route while defending it.
- Never expose the Supabase service-role key in the client or repository.
- Any sim or tuning change that affects replay must regenerate
  `supabase/functions/submit-gridwatch-score/sim.bundle.js` and be deployed in a
  version-compatible way with the Edge Function.

## Verification Lanes

### Local-first batch workflow

For each reviewed implementation batch, finish and verify the complete batch on
a fixed `http://127.0.0.1:[port]` first. Keep the development server available
for owner testing on desktop and mobile web. Run deterministic checks, local
Codex review, and local CodeRabbit review before publication. Do not push a
partial batch for remote preview; make one final push only after the owner has
accepted the finished localhost build. This workflow changes publication timing,
not the existing requirement for GitHub/CodeRabbit/Codex review of every push.
CodeRabbit must automatically review every non-draft pull request and every new
head commit. Its request-changes workflow must remain enabled, the current head
must receive the required approval, and every review conversation must be
resolved before merge. A skipped, paused, missing, stale, or failed CodeRabbit
review is a blocking gate, not permission to merge.

The enforced GitHub gate requires `build` from GitHub Actions App ID `15368`
and CodeRabbit's native `CodeRabbit` status from GitHub App ID `347564`.
CodeRabbit's request-changes workflow must remain enabled: actionable findings
produce a blocking `CHANGES_REQUESTED` review, and CodeRabbit changes that
review to `APPROVED` only after its findings are resolved. The ruleset also
requires one approval, dismisses stale approvals after pushes, requires approval
of the latest push by someone other than its pusher, and requires every review
conversation to be resolved. Do not substitute an unbound custom status for
CodeRabbit's native App identity.

### UI, input, rendering, copy, or local asset changes

Run the build, dev, preview, offline, mobile viewport, keyboard, pointer, and
performance checks relevant to the change. Confirm the game still runs fully
offline and signed out (the leaderboard and sign-in are the only network
features).

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
- Run `npm run verify:content` to prove each authored chapter contains exactly
  five levels and twenty-five waves, with all remaining chapters unauthored. Run
  `npm run expansion:content-report` to verify the literal immutable hashes.
- Verify the normal title flow with no flag, then use `?expansion-nav=1` only
  on localhost for acceptance QA. Check the campaign screen, six spoiler-safe
  chapter cards, the five-card Chapter 1 screen, level unlock progression, and
  `?expansion-play=1&level=N` at mobile and desktop widths. Confirm public hosts
  cannot activate either flag and expansion results expose no leaderboard path.
- Keyboard-check the expansion Canvas: Tab to the grid, use arrows to move the
  visible cell focus, press Space to place the selected tool, Delete/Backspace
  to sell, and Enter to launch the prepared wave. Confirm the expected
  bandwidth change and zero browser console errors.

### Expansion Chapter 1 simulation or tuning changes

- Run `npm run verify:expansion-sim`, `npm run expansion:balance`,
  `npm run verify:content`, `npm run verify:progress`, and the current replay
  checks. Balance must keep 20/20 fixed-seed guided clears, 5/5 empty-loadout
  losses, and the reviewed deterministic report hash.
- Run `npm run build:validator` and prove the committed `phase4-v1`
  `sim.bundle.js` is unchanged. Chapter 1 client work remains localhost-only
  until a separate server-first expansion validator/category release is
  approved and reviewed.

### Historical Chapter 2 mechanic-prototype lane

- Keep an unapproved prototype absent from playable expansion types, content,
  `src/sim/index.ts`, and the server validator bundle.
- For the Sapper proof, run `npm run verify:sapper`, the Chapter 1 content and
  replay gates, `npm run build:validator`, and confirm the validator bytes and
  `expansion-1-r1` hashes do not change.
- Use `?sapper-preview=1` only on `127.0.0.1` or another loopback hostname.
  Verify Step, Auto, Reset, safe spacing, clustered failure, target telemetry,
  390x844 and desktop layouts, horizontal overflow, and browser console output.
- Owner acceptance of the mechanic proof authorizes only a later, separate
  visual-intake decision. Production art, playable Chapter 2 content,
  Honeypot/Jammer, backend changes, and publication retain their own gates.

### Blender expansion-asset intake

- The owner approved Blender as a local source-authoring tool on 2026-09-08.
  The three-chapter milestone additionally authorizes the consistent expansion
  grid and roster, built as related local batches. It does not authorize runtime
  3D, WebGL or Three.js.
- Keep the editable `.blend`, deterministic Blender Python build script,
  transparent source master, optimized runtime sprite, modeling brief, and
  SHA-256 provenance together. The playable game consumes only the raster.
- Add one expansion family per visual-intake batch unless the plan explicitly
  groups related families. Keep `ownerApproved: false` until the owner accepts
  the contextual desktop/mobile preview.
- Run `npm run verify:assets`; release mode is expected to fail for a new asset
  until visual approval is recorded. Confirm existing approved assets remain
  release-clean separately from the candidate entry.

### Expansion replay-boundary changes

- Run `npm run verify:replays` to prove legacy, `phase4-v1`, and all rejected
  `expansion-v1` fixtures keep their expected routes.
- Run `npm run build:validator` and confirm `sim.bundle.js` is unchanged unless
  a reviewed simulator ruleset release intentionally changes it.
- Use `deno check supabase/functions/submit-gridwatch-score/index.ts` when
  available. Do not deploy the Edge Function, enable an expansion client, or
  write to GridWatchGamesDB until the separate server-compatibility gate is
  approved.

### Leaderboard or deployment changes

In addition to the applicable lanes:

- Verify anonymous/offline play makes no leaderboard request when signed out / offline.
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

# Current execution contract — 2026-09-11

Use `docs/EXPANSION_25_LOCAL_PLAN.md` for the approved 25-level (8/8/9) local
revision. Resolve content by revision plus level ID, isolate r4 progress, keep
historical fixtures immutable, and use full provenance-verified Blender CLI
rebuilds. Keep chapter-sized local checkpoints and test before commits. CodeRabbit
may review the diff; GitHub publication and deployment are not authorized.
