# GridWatch Phase 5, 3D Asset, and 30-Level Expansion Plan

Status: Phase 6's full thirteen-family roster is owner-approved and is the
default board presentation after PR #51; `?art=glyphs` remains the rollback and
automatic load-failure fallback. The owner approved the `expansion-1` level
definition below, and the documentation-only scope authority merged in PR #52.
Phase 7A completed in PR #53, Phase 7B in PR #54, and Phase 7C's isolated
replay boundary in PR #55. The reviewed no-write validator route is active in
production before any expansion client exists. It must not add playable
expansion level content, assets, database behavior, or deployment beyond the
separately approved server promotion recorded in `HANDOFF.md`.

Date: 2026-07-16

Owner: Russ Meadows

Implementation owner: Codex or assigned model

Review policy: Codex review and CodeRabbit review on every GitHub push

## 1. Executive decision

Keep the current Phase 5 release-candidate work. The existing three-sector,
twelve-wave `phase4-v1` campaign is proven, deployed, and owner-accepted on
desktop and mobile web. Freeze its simulation, score categories, and replay
validator.

Start the visual upgrade as Phase 6. Use high-detail, pre-rendered 3D raster
pieces inside the existing flat Canvas2D board. Do not add a runtime 3D engine,
tilt the board, or change pointer geometry during the first asset pass. This
delivers the requested realism without sacrificing mobile readability or the
working game.

Treat the requested thirty new levels as a separate expansion campaign. The
proposed definition is:

- 30 new levels;
- 5 waves per level;
- 6 chapters of 5 levels each;
- 150 new wave rows total;
- fresh, fixed starting conditions per level;
- no persistent stat upgrades;
- a new immutable replay ruleset and isolated leaderboard categories.

This level definition is owner-approved. It follows the original product goal
of five rounds per level, but it turns the expansion into a substantial content
program rather than a single feature.

## 2. Non-negotiable boundaries

1. Preserve the current `phase4-v1` campaign byte-for-byte wherever practical.
2. Keep vanilla TypeScript, Vite, HTML, CSS, and Canvas2D. Do not add React,
   Phaser, WebGL, Three.js, or another game framework.
3. Keep the core game fully playable without Supabase configuration. Local
   static assets are allowed; runtime asset-generation and CDN calls are not.
4. Keep routing from Source to Core as the central verb.
5. Keep an 8x8 board for the first thirty-level expansion release. A larger grid
   would reopen mobile input, layout, and performance risks.
6. Never rewrite or delete historical leaderboard rows.
7. Keep `GridWatchGamesDB` compatibility for `grid-drift`, `gridwatch-match`,
   and `gridwatch-signal-breach`.
8. Do not reuse `phase4-v1` categories for expansion scores.
9. Do not replace tactical state with color alone. Silhouette, shape, motion,
   labels, and health/effect overlays remain authoritative.
10. Do not generate the full asset roster until a three-piece vertical slice
    passes contextual, mobile, performance, and owner-approval gates.
11. Do not put all thirty levels into one branch or pull request.
12. No native iOS or Android application is in scope. Mobile means the web game
    in mobile Safari or Chrome.

## 3. Current baseline and evidence

### 3.1 Accepted game baseline

- PR #43 is merged to `main` as `43fe0e4`.
- Cloudflare production deployment `ba311ad0-4f66-4d3a-a187-6c16a6cbe7db`
  serves that merge.
- The owner cleared all three sectors and reported that Sectors 1 and 2 feel
  challenging but good, with ICE and Firewalls both useful.
- The owner reported that mobile-web testing looks good.
- Production desktop Chromium and mobile WebKit checks passed with no document
  overflow, failed requests, or console errors.
- The live Phase 4 leaderboard result remains 514.

### 3.2 Rendering baseline

- The canvas backing size is 720x720.
- The board is 632x632 after padding, so each 8x8 tile is approximately 79x79
  backing pixels.
- Current unit glyphs draw at roughly 55% of one tile, approximately 43 backing
  pixels. Normal enemies draw at roughly 42%, and Goliath at 58%.
- Tool-dock icons render at 28x28 CSS pixels.
- Current pieces are project-authored 24-unit `Path2D`/SVG glyphs with Canvas
  glow and procedural effects.
- The built production bundle is approximately 336 KB before raster assets.
- High/low effects quality and reduced-motion paths already exist.

### 3.3 Screenshot assessment

The supplied gameplay screenshot shows that the layout, hierarchy, route,
tool costs, and board state are readable. The weakness is the piece language:

- Relay, Source, and Core look like related neon symbols rather than distinct
  physical machines.
- Firewall and ICE read as toolbar icons placed on squares, not installed
  defenses with mass, material, and damage potential.
- Enemies lack a strong scale hierarchy and mechanical personality at rest.
- The board already contains strong magenta/cyan route and threat effects, so
  new sprites must not compete with those effects.
- More detail alone will fail. The pieces need better silhouette, material,
  height, and contact with the board while retaining immediate recognition at
  approximately 40-55 CSS pixels on a phone.

## 4. Approval record and implementation gates

The owner approved the campaign definition and its isolation from the accepted
campaign. The existing owner-approved Phase 6 roster establishes the current
rendering direction. Expansion implementation remains gated as follows:

1. **Level semantics — approved:** thirty standalone 8x8 levels means six
   chapters of five levels, with five waves per level, for 150 new waves.
2. **Rendering strategy — approved:** realistic pre-rendered 3D sprites on the
   existing top-down Canvas2D board, not a runtime 3D engine or tilted board.
3. **Future expansion visual families — separately gated:** use the approved
   Phase 6 visual language and generate/approve each family through the asset
   intake process before it ships; do not bulk-generate an expansion roster.
   The asset, Supabase migration, and Edge Function compatibility/owner-approval
   gates in Sections 9, 15, and 18 also apply.
4. **Campaign isolation — approved:** identify each expansion run by campaign
   and level, never by `sector`; use a new immutable ruleset, replay identity,
   progress namespace, and isolated leaderboard categories. Preserve `phase4-v1`
   byte-for-byte and leave `grid-drift`/`gridwatch-match` shared-database
   behavior unchanged.

### 4.1 Scope-authority update

The current `AGENTS.md` and `CONTEXT.md` preserve the original three-sector,
twelve-wave campaign and now define the separate approved expansion envelope.
This planning document does not itself authorize code. The first
documentation-only expansion change must amend `AGENTS.md`, `CONTEXT.md`, and
`HANDOFF.md` to authorize exactly the approved thirty-level expansion while
keeping the original campaign capped at three sectors and twelve waves. No model
may add expansion code, content, assets, or database behavior before that
scope-authority change is reviewed and merged.

After that merge, Phase 7 may establish architecture only: exactly 30 standalone
8x8 expansion levels in six chapters of five, with five waves per level. It must
identify every expansion run by campaign and level, never by a new `sector`
value; use a new immutable ruleset, separate replay identity, progress namespace,
and isolated leaderboard categories. `phase4-v1` behavior must remain
byte-equivalent, including its replay payloads and score categories, and the
existing `grid-drift`/`gridwatch-match` shared-GridWatchGamesDB behavior must
remain unchanged. Do not add expansion-level content in Phase 7.

## 5. Phase numbering

The existing Phase 5 remains the current release-candidate phase.

| Phase | Scope | Shipping unit |
|---|---|---|
| 5 | Close current W1-W12 release-candidate evidence | Documentation/verification PR |
| 6A | Three visual style frames | Discussion artifacts; no production code |
| 6B | Three-piece asset vertical slice | One render-only PR behind an art flag |
| 6C | Current friendly hardware roster | Two small asset PRs |
| 6D | Current enemy roster and visual RC | Two small asset PRs |
| 7 | Campaign/level architecture, still using old content | One or more architecture PRs |
| 8 | Expansion Chapter 1, Levels 1-5 | Chapter release |
| 9 | Expansion Chapter 2, Levels 6-10 | Chapter release |
| 10 | Expansion Chapter 3, Levels 11-15 | Chapter release |
| 11 | Expansion Chapter 4, Levels 16-20 | Chapter release |
| 12 | Expansion Chapter 5, Levels 21-25 | Chapter release |
| 13 | Expansion Chapter 6, Levels 26-30 | Chapter release |
| 14 | Full expansion release candidate | Verification/release PRs |

## 6. Phase 5 closeout

Phase 5 is not replaced by asset work. Close it first with a documentation-only
or verification-only change:

1. Record PR #43 merge and deployment as complete in `HANDOFF.md`.
2. Record owner clearance of all three sectors and the mobile-web acceptance.
3. Re-run current production smoke checks and the shared-database read-only hash
   check if any deployment changed since PR #43.
4. Keep `phase4-v1` as the current immutable production ruleset.
5. Mark current balance as frozen. Later changes must use a new ruleset.
6. Preserve the current Pages and Edge Function rollback identifiers.

Phase 5 is complete when the handoff contains no pending PR #43 gate and the
owner-acceptance evidence is recorded.

## 7. Phase 6 visual target

### 7.1 Art direction

Target **tactical industrial realism**:

- physically believable machined metal, ceramic armor, carbon composite,
  cabling, vents, fasteners, lenses, antennae, and emissive channels;
- a dark neutral body palette that lets semantic colors remain readable;
- cyan/teal signal emitters for Source and Relay;
- magenta containment/reactor light for Core;
- yellow/gold mass and blocking language for Firewall;
- cool blue optics and emitters for ICE;
- green recovery language for Scrubber;
- gold electrical amplification language for Overclock;
- hostile red, magenta, or violet accents for enemies, with silhouettes doing
  most of the identification work;
- restrained self-shadowing and highlights that imply real depth;
- no baked floor, cast shadow, labels, logos, typography, watermark, particles,
  route lines, health bars, or environmental background.

The renderer will continue drawing contact shadows, selection rings, damage
feedback, targeting, route pulses, health bars, and status telegraphs. Those
effects must remain separate so reduced motion and low quality still work.

### 7.2 Camera and lighting bible

Every production sprite must use the same locked recipe:

- orthographic or very long-lens camera;
- approximately 68-72 degrees above the board plane;
- centered object with no perspective distortion;
- object upright relative to the board;
- neutral studio key from upper-left and a weak lower-right fill;
- restrained cyan/magenta rim light only where semantic color permits;
- no cast shadow or floor reflection;
- centered in a square canvas with at least 11% clear margin on all sides;
- object occupies no more than 78% of the source canvas;
- transparent final background;
- no clipped antennae, barrels, shields, or appendages.

Enemy sprites should be orientation-neutral unless direction is functionally
important. If direction matters, the asset must face east and the implementation
must prove that Canvas rotation does not make its baked lighting look wrong. Do
not create four directional variants until the one-sprite approach fails a
contextual test.

### 7.3 Three contextual options

Before production assets, create exactly three visual options by editing a copy
of the supplied live-game screenshot. Change only the board pieces; preserve
layout, HUD, board geometry, colors, text, route, and controls.

Each option must replace the same three representatives:

- Relay: tests friendly signal hardware and emissive detail;
- `turret` (the ICE board unit): tests weapon readability and mechanical mass;
- Probe: tests hostile silhouette and motion direction.

The three option briefs are:

1. **Industrial PBR:** dark machined steel, ceramic panels, controlled wear,
   exposed fasteners, restrained emitters.
2. **Black-ops composite:** carbon composite, matte armor, fewer exposed parts,
   sharper stealth silhouettes, precise optics.
3. **Reactor-tech realism:** denser power conduits, glass/energy chambers used
   sparingly, stronger internal illumination, still physically believable.

The owner chooses one option. Do not average the three directions together.

### 7.4 Current production roster

The first complete visual roster contains thirteen base families. `turret` is
the internal code name for ICE.

| Asset ID | Game role | Required silhouette/material language | Runtime scale in tile | Initial variants |
|---|---|---|---:|---:|
| `source` | Signal origin | Broadcast mast, wide antenna crown, stable base | 68% | 1 |
| `core` | Protected objective | Heavy reactor vault, magenta central chamber | 72% | 1 |
| `relay` | Extends signal | Compact mast/repeater, open signal crown | 58% | 1 |
| `firewall` | Blocks enemies | Wide armored barricade, obvious front face | 76% wide | 1 base; damage states later |
| `turret` | ICE attack | Stable base, visible emitter/barrel/optic | 62% | 1 base; split head later only if proven |
| `scrubber` | Cleans corruption | Service module, articulated cleansing emitter | 60% | 1 |
| `overclock` | Boosts ICE | Power amplifier, coils/capacitors, gold energy | 60% | 1 |
| `probe` | Fast light enemy | Arrow/needle drone, strong forward point | 46% | 1 |
| `crawler` | Heavy route enemy | Low multi-leg armored chassis | 52% | 1 |
| `spoof` | Wall-jumping enemy | Split/phase body with a broken central silhouette | 48% | 1 |
| `hunter` | Hardware hunter | Predatory sensor head, narrow aggressive chassis | 50% | 1 |
| `splitter` | Spawns probes | Paired shell halves around a bright core | 50% | 1 |
| `goliath` | Boss | Massive vault-breaker, heavy frontal armor | 70% | 1 |

The Sell action remains a UI icon. It is not a physical board asset.

### 7.5 State strategy

Do not generate dozens of states initially. Base sprites plus existing Canvas
effects are the first release. Add raster state variants only when a specific
readability test proves they are necessary.

Candidate second-pass variants:

- Firewall: intact, damaged below 67% HP, critical below 34% HP.
- Core: stable, warning below 50% integrity, critical below 20%.
- Goliath: armor-broken state if a future mechanic requires it.
- `turret`: separate rotating head only if target direction is unclear with
  beams.

HP bars, pips, corruption rings, selection rings, route state, Overclock links,
and attack impacts stay procedural and authoritative.

## 8. Asset production pipeline

### 8.1 Directory contract

Create these directories only after the visual direction is approved:

```text
art/
  prompts/phase6/
  source/phase6/
src/assets/board/phase6/
docs/visual-qa/phase6/
```

Rules:

- `art/prompts/phase6/`: one Markdown prompt record per asset and iteration.
- `art/source/phase6/`: the selected, cropped, alpha master only; rejected
  generations stay outside the repository.
- `src/assets/board/phase6/`: optimized runtime WebP or PNG assets imported by
  Vite.
- `docs/visual-qa/phase6/`: approved contact sheet and contextual screenshots,
  not every intermediate image.
- Never reference files under `$CODEX_HOME/generated_images` from project code.
- Never add a CDN URL or runtime generation call.
- Never overwrite an approved file silently. Use a new versioned filename.

### 8.2 Naming contract

Use lowercase kebab-case:

```text
gw-phase6-relay-master-v1.png
gw-phase6-relay-board-v1.webp
gw-phase6-relay-prompt-v1.md
```

If a state is approved:

```text
gw-phase6-firewall-board-intact-v1.webp
gw-phase6-firewall-board-damaged-v1.webp
gw-phase6-firewall-board-critical-v1.webp
```

### 8.3 Generation mode

Use the built-in ImageGen path by default. Generate each asset separately; do
not use one sprite sheet as the production source and crop it into individual
pieces.

For simple opaque pieces:

1. Generate on a perfectly flat chroma-key background.
2. Choose a key color absent from the asset.
3. Copy the selected output into `art/source/phase6/`.
4. Remove the key locally with the installed ImageGen helper using soft matte
   and despill.
5. Validate transparent corners, subject coverage, and edge fringe.
6. Retry once with one-pixel edge contraction if required.

Highly reflective, glass, translucent, smoke, or energy-heavy designs may fail
chroma-key extraction. Do not silently switch tools or models. If that happens,
pause and obtain owner approval before using a true native-transparency CLI
fallback.

### 8.4 Prompt template

Every production prompt record must use this structure:

```text
Use case: stylized-concept
Asset type: GridWatch Signal Breach Canvas2D board sprite
Primary request: <one physical game piece and its function>
Input images: Image 1: approved style anchor; Image 2: current gameplay context reference
Scene/backdrop: perfectly flat solid <key color> chroma-key background
Subject: <shape, mechanism, and functional focal points>
Style/medium: highly detailed pre-rendered 3D game asset; tactical industrial realism
Composition/framing: orthographic, 68-72 degrees above board, centered square cutout, 11% minimum margin
Lighting/mood: neutral upper-left studio key, weak lower-right fill, restrained semantic rim light
Color palette: dark neutral body; <semantic accent>; preserve silhouette in grayscale
Materials/textures: machined metal, ceramic armor, carbon composite, real fasteners and wear kept subtle
Constraints: single isolated object; no floor; no cast shadow; no text; no logo; no watermark; no particles; no route; no health bar; no clipped parts
Avoid: toy-like plastic, flat icon design, cartoon proportions, excessive bloom, tiny surface noise, background scenery
```

Every follow-up iteration changes one thing only and repeats all invariants.

### 8.5 Consistency anchors

After the owner selects a style frame:

1. Produce and approve Relay first.
2. Use the approved Relay master as the friendly-hardware style anchor.
3. Produce and approve Probe first for enemies.
4. Use the approved Probe master as the hostile style anchor.
5. Produce `turret` third to validate the ICE weapon role and the
   friendly/enemy relationship.
6. Use those three approved masters as references for every later generation.
7. Never approve an asset only in isolation; compare it in the live board at
   desktop and mobile size.

### 8.6 Source and runtime specifications

| Property | Standard piece | Boss piece |
|---|---:|---:|
| Selected alpha master | 1024x1024 minimum | 1536x1536 preferred |
| Runtime board asset | 256x256 | 384x384 |
| Runtime target bytes | <= 90 KB | <= 160 KB |
| Master target bytes | <= 2 MB | <= 4 MB |
| Transparent margin | >= 11% | >= 8% |
| Runtime color space | sRGB | sRGB |
| Runtime animation | Canvas effects | Canvas effects |

Phase 6 runtime assets must total no more than 1.5 MB compressed. The full
initial page transfer, including existing JS/CSS and Phase 6 sprites, must remain
below 2.5 MB compressed. The expansion may split later chapter assets by entry
point, but it may not preload every future chapter on the title screen.

### 8.7 Manifest contract

Add a machine-readable `src/assets/board/asset-manifest.json` and keep
`docs/VISUAL_ASSET_MANIFEST.md` as the human summary. Each entry includes:

```json
{
  "id": "relay",
  "version": "phase6-v1",
  "role": "board-unit",
  "source": "art/source/phase6/gw-phase6-relay-master-v1.png",
  "runtime": "src/assets/board/phase6/gw-phase6-relay-board-v1.webp",
  "prompt": "art/prompts/phase6/gw-phase6-relay-prompt-v1.md",
  "sourceDimensions": [1024, 1024],
  "runtimeDimensions": [256, 256],
  "maxBytes": 90000,
  "hasAlpha": true,
  "generator": "OpenAI ImageGen",
  "generatedAt": "<ISO-8601 UTC timestamp>",
  "referenceAssets": ["<approved style-anchor SHA-256>"],
  "promptSha256": "<computed from prompt record>",
  "camera": "orthographic-70deg",
  "light": "upper-left",
  "semanticAccent": "signal-cyan",
  "ownerApproved": false,
  "sourceSha256": "<computed from source>",
  "runtimeSha256": "<computed from runtime>"
}
```

Do not set `ownerApproved` to true without explicit owner approval.

### 8.8 Asset validation script

Add a zero-runtime-dependency Node script at `scripts/verify-assets.mjs` and an
`npm run verify:assets` command. The script must:

- parse the manifest;
- confirm every source, runtime, and prompt file exists;
- reject duplicate IDs or versions;
- verify PNG/WebP signatures and dimensions;
- verify alpha support;
- enforce per-file and aggregate byte budgets;
- compute and compare `sourceSha256` and `runtimeSha256` against their
  respective files;
- compute and compare `promptSha256`, and require generation/provenance fields;
- reject path traversal and files outside approved directories;
- fail when an imported runtime asset has no manifest record;
- fail when `ownerApproved` is false in explicit `--release` mode.

The script must not optimize or rewrite images. Validation and mutation remain
separate operations. `npm run verify:assets` is the working validation lane;
`npm run verify:assets -- --release` is the shipping lane and must run in CI
before a build whose default art mode includes Phase 6 assets.

## 9. Renderer integration plan

### 9.1 Files

Add:

- `src/render/assetRegistry.ts`
- `src/render/drawBoardSprite.ts`
- `src/assets/board/asset-manifest.json`
- `scripts/verify-assets.mjs`

Modify only as needed:

- `src/render/renderer.ts`
- `src/render/visualTheme.ts`
- `src/main.ts`
- `package.json`
- `docs/VISUAL_ASSET_MANIFEST.md`

Do not touch `src/sim/`, `src/data/waves.ts`, score calculation, leaderboard
code, migrations, or the Edge Function in the visual-only phase.

### 9.2 Loading

- Import runtime asset URLs statically so Vite fingerprints and bundles them.
- Load with `HTMLImageElement`; call `decode()` where supported.
- Do not use explicit `fetch()` for assets.
- Cache one decoded image per asset ID/version.
- The game must not show a blank piece while an image is unavailable.
- Preserve the existing vector glyph as an automatic fallback.
- A failed sprite must log one concise warning, use the fallback, and keep the
  game playable.

### 9.3 Drawing order

Keep the current flat board and hit geometry. Draw in this order:

1. cached floor and grid;
2. tile fills, voids, corruption;
3. procedural contact shadow;
4. board sprite;
5. route and effect overlays according to existing tactical priority;
6. HP pips/bars, selection, targeting, and status telegraphs.

If a sprite obscures the route or a range telegraph, the overlay wins. Tactical
information is more important than realism.

### 9.4 Art feature flag and rollback

During Phase 6B, support:

```text
?art=glyphs
?art=phase6
```

- `glyphs` forces the current production renderer.
- `phase6` forces the new assets.
- The preview default may be `phase6` only after the vertical slice is ready.
- Keep glyph fallback code through at least one production release after the
  complete Phase 6 roster ships.

Rollback is a Pages rollback or switching the default back to glyphs. No sim,
validator, database, or score rollback is involved.

## 10. Phase 6 acceptance gates

### 10.1 Vertical-slice gate

Relay, `turret` (the ICE board unit), and Probe must pass all of these before
generating the other ten families:

- recognizable without labels at 1440x900, 390x844, 320x568, and 568x320;
- distinguishable in grayscale by silhouette;
- visually grounded inside the current tile without crossing hit boundaries;
- no visible chroma fringe on dark, cyan, magenta, or corrupted tiles;
- route, range, health, corruption, and selection overlays remain legible;
- no document overflow or hit-target change;
- no console error or failed static request;
- p95 frame time remains <= 16.7 ms during the busiest current wave on the
  agreed mid-range phone;
- render regression is <= 2 ms p95 versus glyph mode on the same device/run;
- peak decoded sprite memory for the current roster remains <= 24 MB;
- owner approves the contextual desktop and mobile screenshots.

If the three-piece slice fails, revise the art direction or rendering method.
Do not compensate by generating the full roster.

### 10.2 Full-roster gate

- all thirteen base families have approved manifest entries;
- every unit and enemy is identifiable in a still image;
- Source, Relay, and Core cannot be mistaken for one another;
- Firewall and `turret` remain immediately distinct under damage/effects;
- Goliath clearly reads as a boss before the health plate is read;
- reduced-motion and low-quality modes preserve state;
- runtime sprite total <= 1.5 MB compressed;
- offline mode uses only local static assets and makes no leaderboard request
  when Supabase variables are absent;
- production can fall back to glyphs without changing a replay or score.

## 11. Expansion product model

### 11.1 Campaign separation

Keep two top-level campaigns:

```text
Campaign: signal-breach
  Existing Sectors 1-3
  Existing Waves 1-12
  Ruleset phase4-v1
  Existing progress and leaderboard categories

Campaign: expansion-1
  New Chapters 1-6
  New Levels 1-30
  Five waves per level
  New ruleset expansion-v1
  New progress and leaderboard categories
```

Do not renumber the existing sectors or waves. Do not call new levels Sector 4
through Sector 33. `sector` remains a legacy/current-campaign concept;
`campaignId`, `chapterId`, and `levelId` are expansion concepts.

### 11.2 Run boundaries

Each new level is an independent score/replay run:

- one 8x8 map;
- one Source and one Core;
- a fixed starting layout;
- a fixed available-tool list;
- five Build/combat waves;
- a fresh bandwidth and integrity state;
- win, loss, retry, and next-level navigation;
- no carried units, bandwidth, damage, or stat upgrades between levels.

This keeps replays bounded and leaderboard comparisons fair. Progress unlocks
content; it does not create permanent combat advantages.

### 11.3 Mobile tool limit

The current dock is proven with at most five unit tools plus Sell. Keep that
limit for expansion levels. Each level declares a fixed tool list of at most
five unit types plus Sell. Do not add a player-configurable loadout in the first
expansion ruleset; it would enlarge the replay payload and the balance matrix.

If custom loadouts are later approved, they become an explicit immutable replay
input and a new ruleset.

## 12. Expansion architecture

### 12.1 Data types

Introduce, without deleting current compatibility types:

```ts
type CampaignId = "signal-breach" | "expansion-1";

type CampaignDefinition = Readonly<{
  id: CampaignId;
  title: string;
  ruleset: string;
  contentRevision: string;
  chapters: readonly ChapterDefinition[];
}>;

type ChapterDefinition = Readonly<{
  id: number;
  codename: string;
  levelIds: readonly number[];
  visualThemeId: string;
}>;

type LevelDefinition = Readonly<{
  id: number;
  chapterId: number;
  codename: string;
  gridSize: 8;
  source: GridPosition;
  core: GridPosition;
  voidTiles: readonly GridPosition[];
  initialTiles: readonly InitialTileDefinition[];
  toolsUnlocked: readonly PlayerTool[];
  waves: readonly WaveDefinition[];
  difficultyIndex: number;
  requiredMechanic: string | null;
}>;
```

The exact names may change, but the separation may not be collapsed back into a
single `SECTORS` array.

### 12.2 File layout

Proposed layout:

```text
src/data/campaigns/
  signalBreach.ts
  expansion.ts
  expansion/
    chapter01.ts
    chapter02.ts
    chapter03.ts
    chapter04.ts
    chapter05.ts
    chapter06.ts
    enemyTuning.ts
    unitTuning.ts
    waveArchetypes.ts
src/sim/content.ts
scripts/verify-content.ts
```

Keep existing exports as adapters while `phase4-v1` remains supported. Do not
move and rewrite every current file in one PR.

### 12.3 Authored waves versus generation

Do not use open-ended procedural generation. Use authored level data plus a
small set of deterministic wave archetype helpers.

Every one of the 150 resulting wave rows must be inspectable in a frozen content
report. `scripts/verify-content.ts` must emit and validate:

- immutable content revision, campaign content SHA-256, and per-level SHA-256;
- campaign/chapter/level/wave identity;
- spawn edges and scripted spawns;
- enemy weights;
- maximum active/spawned enemies;
- grant and trickle values;
- computed threat budget;
- required counter/mechanic;
- duplicate IDs and invalid references;
- monotonic level difficulty index;
- per-level five-wave count;
- initial route validity;
- 8x8 bounds and void/initial-tile overlap rules;
- dock tool-count limit.

Canonicalize the report with stable key ordering before hashing it. Commit the
human-readable report, its campaign SHA-256, and every per-level SHA-256 for
review, but keep TypeScript source as the runtime authority. The generated
validator registry must bind each accepted campaign/level/content revision to
the expected per-level hash and immutable simulator implementation. `npm run
verify:content` must rebuild the report and registry and fail on any diff.

Use immutable additive content revisions such as `expansion-1-r1` for the first
published chapter and `expansion-1-r2` when a later chapter is added. Previously
published level definitions and per-level hashes must remain byte-identical in
later revisions. The Edge Function must retain every deployed revision needed
to validate stored or pending replays. A later chapter may reuse the current
bundle only after all earlier golden replays remain byte-equivalent; otherwise
its registry entry must dispatch older revisions to their pinned prior bundle.
If a published level or its tuning must change, create a new ruleset and
score-category version; never mutate the meaning of `expansion-v1` in place.

### 12.4 State creation

Add a new state-creation input while preserving the current call:

```ts
createGameState({ seed, sector })
createGameState({ seed, campaignId: "expansion-1", levelId })
```

The first form must continue producing the current `phase4-v1` state. Reject
mixed `sector` and `campaignId/levelId` inputs. Never infer expansion identity
from a sector number.

### 12.5 Progress storage

Keep the current `gridwatch.campaign.v1` data intact. Add a new versioned root:

```text
gridwatch.progress.v2
```

Proposed shape:

```json
{
  "schema": 2,
  "campaigns": {
    "signal-breach": {
      "clearedSectors": [1, 2, 3],
      "highestUnlockedSector": 3
    },
    "expansion-1": {
      "clearedLevels": [],
      "highestUnlockedLevel": 1
    }
  }
}
```

Migration reads and sanitizes the old key, writes the new key, and never deletes
the old key in the first release. Malformed or unavailable storage must fall
back to Level 1 without crashing.

### 12.6 Screens and navigation

Add:

1. Campaign select: Current Campaign / Expansion.
2. Chapter select: six chapter cards, spoiler-safe locking.
3. Level select: five levels for the selected chapter.
4. Results: Retry Level / Level Select / Next Level / Campaign Select.

Do not show thirty cards in one mobile grid. The title screen keeps the current
briefing and leaderboard entry points.

## 13. Expansion content budget

The first expansion ruleset should add at most:

- 4 new placeable weapons/defenses;
- 8 new standard enemy families;
- 6 chapter-boss families or boss variants;
- 6 new floor/sector themes;
- 30 level maps;
- 150 authored wave results.

This is a maximum, not a quota. Reuse existing units and enemies where they
create meaningful combinations.

### 13.1 Proposed new weapons

Names are working names and require owner approval.

| Working name | Function | Strategic role | Non-overlap rule |
|---|---|---|---|
| Latency Trap | Slows the first N enemies entering its tile/area | Buys routing time | Must not become a cheaper Firewall |
| Arc ICE | Chains reduced damage across nearby enemies | Swarm counter | Must remain weaker than ICE on one target |
| Honeypot | Redirects hardware-targeting enemies for a limited time | Protects key Relay/ICE clusters | Carries no signal and deals no damage |
| Rail ICE | Slow, expensive line attack with armor penetration | Brute/boss counter | Must not replace normal ICE for general defense |

Keep all four as placeable deterministic units. Do not introduce real-time
cooldown buttons or aim controls in `expansion-v1`.

### 13.2 Proposed new enemies

Names are working names and require mechanic prototypes before art production.

| Working name | Behavior | Required readable telegraph | Primary counter |
|---|---|---|---|
| Rusher | Very fast, fragile route attack | Long forward silhouette/trail | Latency Trap or normal ICE coverage |
| Sapper | Prefers Firewalls and damages adjacent hardware on death | Pulsing demolition core | Kill away from clustered hardware |
| Jammer | Temporarily suppresses nearby signal carriers | Visible interference radius | ICE focus or alternate route |
| Shield Drone | Reduces damage to nearby enemies | Explicit shield links | Focus Shield Drone first |
| Leech | Drains a bounded amount of bandwidth while attached | Tether to HUD/route target | Fast elimination; drain cannot go below zero |
| Wraith | Ignores one blocker interaction, then becomes solid | Phase charge consumed indicator | Layered defense and reveal timing |
| Brute | Armor reduces small hits | Armor plates and blocked-hit sparks | Rail ICE or Overclocked attacks |
| Architect | Creates temporary corruption pressure at range | Target tile warning before effect | Hunter-style interception/ICE focus |

Do not approve an enemy whose behavior cannot be explained in one briefing row
and one pre-wave telegraph.

### 13.3 Chapter ladder

| Chapter | Levels | Design focus | New content ceiling | Boss gate |
|---|---:|---|---|---|
| 1 | 1-5 | Re-establish routing with faster pressure | Latency Trap; Rusher | Speed-control boss |
| 2 | 6-10 | Hardware targeting and formation spacing | Honeypot; Sapper/Jammer | Target-priority boss |
| 3 | 11-15 | Swarms and support enemies | Arc ICE; Shield Drone | Shield-network boss |
| 4 | 16-20 | Armor and line-of-fire planning | Rail ICE; Brute | Armor-break boss |
| 5 | 21-25 | Bandwidth pressure and dynamic disruption | Leech/Wraith/Architect mixes | Multi-mechanic boss |
| 6 | 26-30 | Full-system mastery and elite combinations | No new core rule after Level 27 | Final multi-stage boss |

Chapter 6 stops adding major mechanics after Level 27. Levels 28-30 test mastery
rather than teaching under maximum pressure.

## 14. Difficulty model

### 14.1 Increasing difficulty

Each level must have a strictly greater `difficultyIndex` and threat budget than
the previous level. Raw HP is not sufficient evidence. The index includes:

- total effective enemy HP;
- movement/corruption pressure;
- spawn concurrency;
- number of active edges;
- targeting complexity;
- support-enemy multipliers;
- boss/scripted-event multipliers;
- starting map constraint;
- available bandwidth and tool counter value.

New-weapon tutorial levels may be forgiving, but their computed and observed
challenge must still exceed the preceding level.

### 14.2 Automated balance evidence

For every level:

1. Store one readable guided build plan.
2. Replay it across at least four fixed seeds.
3. Require 4/4 deterministic clears before release.
4. Freeze terminal wave, integrity, uptime, bandwidth, kills, corrupt tiles,
   remaining hardware, score, and tick count.
5. Require an empty-command run to lose.
6. On a mechanic-introduction level, prove a counter-positive plan succeeds and
   a counter-negative plan performs materially worse.
7. Enforce a tick budget so no enemy/pathing combination stalls forever.

Suggested guided-plan integrity floors:

| Levels | Median terminal integrity floor |
|---:|---:|
| 1-5 | 100 |
| 6-10 | 90 |
| 11-15 | 80 |
| 16-20 | 70 |
| 21-25 | 60 |
| 26-30 | 50 |

These are automation safety margins, not player difficulty promises.

### 14.3 Manual acceptance

Because the static-first product has no gameplay telemetry backend, owner/manual
playtests remain authoritative. Record for each level:

- attempts to first clear;
- first failure wave;
- terminal integrity and bandwidth;
- most/least used tools;
- cause of each loss;
- whether the new mechanic was understood before launch;
- mobile input or frame-rate issue;
- whether Level N felt harder than Level N-1.

Target attempt bands for an experienced owner:

- Levels 1-10: clear in 1-2 attempts.
- Levels 11-20: clear in 1-3 attempts.
- Levels 21-25: clear in 2-4 attempts.
- Levels 26-29: clear in 2-5 attempts.
- Level 30: clear in 3-6 attempts after learning the final boss.

If difficulty misses, change data under a new prerelease content revision. Once
scores are accepted in production, incomparable changes require a new immutable
ruleset/category version.

## 15. Replay and leaderboard design

### 15.1 Frozen current contract

Do not change how `phase4-v1` resolves or validates:

```json
{
  "ruleset": "phase4-v1",
  "seed": "...",
  "sector": 1,
  "commands": []
}
```

The pinned legacy validator and current Phase 4 validator remain available.

### 15.2 Expansion replay schema

Use a new explicit schema; do not overload `sector`:

```json
{
  "schema": 2,
  "ruleset": "expansion-v1",
  "campaign": "expansion-1",
  "level": 1,
  "contentRevision": "expansion-1-r1",
  "contentHash": "<sha256 of canonical Level 1 definition>",
  "seed": "...",
  "commands": []
}
```

The Edge Function must choose validation by ruleset before interpreting
campaign-specific fields. It must then require the replay's campaign, level,
content revision, and per-level content hash to match its immutable generated
validator registry before simulating. Reject payloads containing both `sector`
and `campaign/level`, unknown revisions, or hash mismatches.

### 15.3 Score categories

Use exact, isolated categories:

```text
expansion-v1:level:01
...
expansion-v1:level:30
```

`expansion-v1:level:NN` is the one canonical category for `record_score`
writes, reads, ranks, and UI display for that level. A terminal replay is
submitted at most once through the existing pending-run/idempotency flow.
Campaign progress records a clear locally and does not write a second
`level-cleared` score row. Do not pool raw scores from different levels; they
are not comparable.

For the first chapter release, show per-level boards only. Defer a campaign-total
board until its formula, tie behavior, missing-level behavior, and Command Nexus
behavior are explicitly approved.

If a campaign-total board is later added, store it in an exact new category
such as `expansion-v1:campaign-total`; do not reuse `standard`,
`phase4-v1:global`, or the legacy null-category board.

### 15.4 Shared database protection

Prefer no database migration for the first expansion chapter: generic exact
categories and the existing `record_score` RPC may be sufficient.

If any shared RPC must change:

1. capture exact raw-row and visible-board hashes for all three games;
2. test the migration in PostgreSQL with tie and concurrent-write cases;
3. use one additive forward migration;
4. prove signatures and grants unchanged unless a reviewed requirement says
   otherwise;
5. promote server-first;
6. re-run exact three-game snapshots;
7. deploy the compatible Edge Function;
8. verify old and new replay paths;
9. only then expose the expansion client.

Command Nexus must continue reading the current categories until it deliberately
adds an expansion-aware display.

## 16. Expansion implementation sequence

### Phase 7A - Content abstraction without behavior change

- Confirm the approved scope-authority update is already merged.
- Add campaign/level definitions and adapters.
- Keep current title/sector flow as default.
- Prove current `phase4-v1` golden replays are byte-equivalent.
- Do not add a fourth sector or any expansion level yet.

Gate: validator bundle behavior and Phase 4 metrics are unchanged.

### Phase 7B - Progress and navigation shell

- Add versioned progress storage and migration.
- Add Campaign, Chapter, and Level select screens behind a disabled feature
  flag.
- Populate only one non-playable placeholder level record for navigation tests;
  do not ship it as playable content.

Gate: old progress survives, malformed storage is safe, and mobile navigation
does not show thirty cards at once.

### Phase 7C - Expansion replay boundary

- Add `expansion-v1` replay schema and validator routing.
- Keep the client feature disabled.
- Add rejected mixed-schema, invalid-level, invalid-campaign, and unsupported
  ruleset fixtures.
- Deploy compatible server support before any public expansion client.

Gate: legacy, Phase 4, and expansion fixture paths pass together.

### Phases 8-13 - One chapter at a time

For each five-level chapter:

1. Prototype one new mechanic in an isolated sim test.
2. Prove its counter and failure mode.
3. Approve the mechanic before generating its production art.
4. Add the enemy/unit asset through the Phase 6 pipeline.
5. Author five maps and twenty-five waves.
6. Generate the content report.
7. Add guided plans and fixed metrics.
8. Complete desktop and mobile playtests.
9. Promote compatible server support first if the sim changed.
10. Expose the chapter in a Pages preview.
11. Obtain owner sign-off before merge.

No chapter PR may contain the next chapter's unfinished mechanics.

### Phase 14 - Expansion release candidate

- Full Levels 1-30 clear path.
- Loss/retry/next-level/campaign navigation.
- Progress migration and cleared-level persistence.
- Offline mode with no Supabase calls when unconfigured.
- Auth, handle, per-level reads, accepted score, rejected score, and keep-best.
- Old `phase4-v1` replay and leaderboard regression.
- Shared three-game database snapshots if any migration occurred.
- Low quality, reduced motion, portrait, landscape, background/resume.
- Asset-budget, content-budget, replay, balance, audit, and build gates.
- Cloudflare preview approval and rollback rehearsal.

## 17. Pull request and push protocol

### 17.1 Branch and scope

- Branch from current `origin/main` with `codex/` prefix.
- One concern per PR.
- Maximum asset batch: four related families.
- Maximum content batch: one mechanic or five levels, not both when the mechanic
  is still unproven.
- Never push directly to `main`.
- Prefer squash merge so `main` retains linear history.

### 17.2 Before every push

The implementing model must:

1. Confirm the worktree contains no `.env`, token, key, credential, or private
   user data.
2. Inspect `git diff --stat` and the complete diff.
3. Run `git diff --check`.
4. Run the relevant verification lane.
5. Run a Codex review covering correctness, deterministic behavior, asset
   provenance, mobile UX, accessibility, performance, and leaderboard impact.
6. Run CodeRabbit locally with agent-readable output against the correct base:

   ```sh
   coderabbit review --agent --base origin/main
   ```

7. Fix all Critical and Warning findings.
8. Re-run both reviews until clean or only explicitly documented Info findings
   remain.
9. Commit only the reviewed scope.
10. Push once.

Do not execute commands suggested by review output without independently
verifying them against the repository and task.

### 17.3 After every push

1. Open or refresh the PR.
2. Wait for CI/build, CodeQL, Cloudflare Pages, and GitHub CodeRabbit.
3. Run a fresh Codex PR diff review.
4. For asset PRs, attach desktop and mobile contextual screenshots plus the
   contact sheet; code review alone is not visual approval.
5. Reply to every actionable review comment with the fixing commit.
6. Resolve a thread only after the fix is verified.
7. If another push is required, repeat the full pre-push and post-push cycle.
8. Merge only with all checks green, zero unresolved actionable threads, clean
   local review, and required owner visual/playtest approval.

### 17.4 Required PR description sections

Every PR uses:

```text
Why
Scope
Out of scope
Files/contracts changed
Replay/ruleset impact
Leaderboard/shared-DB impact
Asset provenance and budget impact
Desktop/mobile evidence
Automated verification
Rollback
Owner approval required
```

## 18. Verification matrix

### 18.1 Every change

```sh
npm install
npm run build
npm run typecheck:tools
npm audit --audit-level=high
git diff --check
```

### 18.2 Asset/render change

```sh
npm run verify:assets
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Verify glyph and Phase 6 modes at 320x568, 390x844, 420x900, 568x320,
760x420, and 1440x900. Exercise reduced motion, low quality, every current unit,
every current enemy, damage, corruption, selection, range, attack, boss, and
offline mode.

### 18.3 Sim/content change

```sh
npm run verify:content
npm run verify:replays
npm run balance:report
npm run build:validator
git diff --exit-code -- supabase/functions/submit-gridwatch-score/sim.bundle.js
```

The last command is expected to be clean only after the regenerated validator
bundle is committed. A sim PR must include the matching reviewed bundle.

### 18.4 Leaderboard/server change

- verify omitted legacy replay;
- verify explicit `phase4-v1` replay;
- verify explicit `expansion-v1` replay;
- reject unsupported ruleset and mixed schemas;
- verify no-write invalid replay;
- verify per-level category isolation;
- verify keep-best and tie behavior;
- verify public read and authenticated write paths;
- inspect Edge logs and advisors;
- if a shared RPC changed, prove all three games' rows and visible boards remain
  unchanged outside the intended new categories.

## 19. Rollback strategy

### Visual rollback

- Force `?art=glyphs` during diagnosis.
- Change the preview default back to glyphs if the asset gate fails.
- Roll Pages back to the last known-good deployment.
- Never remove glyph fallback in the same release that first enables raster
  sprites.

### Expansion client rollback

- Keep the expansion feature flag off until server validation is active.
- Hide the Expansion campaign entry without touching current progress or scores.
- Roll Pages back; old clients continue using `phase4-v1`.

### Server rollback

- Keep old validators available.
- Restore the prior compatible Edge Function only if it still accepts all
  deployed clients.
- Leave additive categories and migrations in place.
- Never delete expansion or historical score rows during rollback.

## 20. Failure-first review

Mode: Codex sequential

### 20.1 Dominant failure path

The project bulk-generates realistic assets and hand-authors 150 waves before
proving small-screen readability and campaign isolation. Art becomes visually
inconsistent, mobile pieces turn into noisy blobs, expansion scoring leaks into
the current board, and the resulting monolithic PR cannot be reviewed or rolled
back safely.

### 20.2 Ranked risks

| # | Class | Risk | Evidence | Mitigation | Validation |
|---:|---|---|---|---|---|
| 1 | Tiger | Realistic detail is unreadable at actual mobile tile size | Current pieces draw at roughly 43-58 backing pixels | Three-piece contextual vertical slice before roster generation | Owner identifies all three at 320/390px without labels |
| 2 | Tiger | Image generations drift in camera, materials, and proportions | Thirteen current families plus future families require separate generations | Lock two approved anchors, one prompt template, and one-asset approvals | Contact sheet and contextual compare for every batch |
| 3 | Tiger | Expansion corrupts current replay or leaderboard behavior | Current payload, Edge validator, RPC, and categories are hard-coded to three sectors | Separate campaign schema/ruleset/categories; preserve `phase4-v1`; server-first | All legacy/Phase 4/expansion fixtures pass together |
| 4 | Elephant | Thirty five-wave levels are 150 waves, not a small update | User goal says five rounds per level | Six chapter releases with five levels each; no monolithic branch | Chapter 1 ships and passes before Chapters 2-6 are committed |
| 5 | Tiger | Difficulty becomes HP inflation instead of new decisions | Existing wave data is mostly numeric weights/cadence | Threat budget plus counter-positive/counter-negative tests | Every new mechanic has a readable counter and measurable value |
| 6 | Tiger | Raster transfer/decode cost damages mobile performance | Current production is only about 336 KB | 1.5 MB Phase 6 runtime cap, lazy future chapters, decoded-memory gate | p95 frame and memory measurement on agreed phone |
| 7 | Tiger | More tools overwhelm the mobile dock | Current UI is proven at five unit tools plus Sell | Fixed per-level tool list capped at five unit types | No scroll/overlap at 320x568 and 568x320 |
| 8 | Unknown | Highly reflective/glass assets cannot be cleanly keyed to alpha | Requested realism conflicts with chroma extraction | Prefer opaque materials; obtain approval before native-transparency fallback | Alpha fringe test on four board backgrounds |
| 9 | Tiger | A lesser model loses cross-phase constraints | Current invariants span sim, render, Edge, DB, and deployment | File map, gates, review template, handoff updates after each PR | Fresh model can state current phase, rollback, and next gate from docs |
| 10 | Paper Tiger | A runtime 3D engine is required for realistic pieces | Canvas already supports raster sprites, effects, scaling, and caching | Use pre-rendered 3D sprites; retain flat board | Vertical slice demonstrates depth without framework change |

### 20.3 Hidden assumptions

| # | Assumption type | Assumption | Failure | Validation |
|---:|---|---|---|---|
| 1 | Most likely false | More detail automatically looks better | Detail collapses into noise at 40-55 CSS pixels | Contextual mobile style frames |
| 2 | Largest blast radius | Thirty levels can reuse current sector identity | Replay parsing, progress, and categories collide | Separate campaign/level proof before content |
| 3 | Least discussed | Every level can be strictly harder while also teaching new tools fairly | Tutorial levels feel easier or new tools trivialize prior threats | Monotonic threat index plus owner comparison |
| 4 | Architecture invalidator | Raw scores across thirty different levels are globally comparable | Global ranking rewards level choice, not mastery | Per-level boards only until aggregate formula approval |
| 5 | Business-case invalidator | The art/content volume can be reviewed as fast as it can be generated | Review debt accumulates and inconsistent work ships | Four-family asset cap and five-level chapter cap |

**The one nobody is discussing:** a photorealistic-looking object must still be
identifiable at roughly 40-55 CSS pixels while cyan/magenta effects, route lines,
health bars, and corruption are active around it.

Validate this with Relay, `turret` (the ICE board unit), and Probe on the live
board before generating the remaining roster.

## 21. Kill criteria

Stop or re-scope when any condition occurs:

- Stop Phase 6 asset generation if the three-piece slice is not identifiable at
  320x568 after two directed art revisions.
- Stop Phase 6 production if the selected style cannot maintain one camera,
  light, and material language across Relay, `turret`, and Probe.
- Revert to simpler stylized 3D if runtime asset total exceeds 1.5 MB or render
  p95 regresses by more than 2 ms on the agreed phone.
- Freeze an asset PR if provenance, prompt record, alpha validation, owner
  approval, or manifest hash is missing.
- Do not start expansion content until `phase4-v1` golden replays remain
  byte-equivalent through the campaign abstraction.
- Stop the expansion release if Chapter 1 cannot deliver five increasingly
  difficult, owner-clearable levels without changing the accepted current
  campaign.
- Re-scope any new enemy that cannot be explained in one briefing row and one
  pre-wave telegraph.
- Do not expose expansion scores if old clients, current Phase 4 boards, or either
  other game in GridWatchGamesDB changes unexpectedly.
- Freeze every push with unresolved Critical/Warning CodeRabbit or Codex review
  findings.
- Do not merge a visual PR without contextual mobile approval; code review is
  not visual approval.

## 22. Definition of done

### Phase 6 done

- one owner-approved visual direction;
- thirteen consistent base asset families;
- local, optimized, manifested, and provenance-recorded files;
- contextual desktop/mobile screenshots;
- glyph fallback and Pages rollback proven;
- no sim, replay, score, DB, or input change;
- mobile performance and bundle budgets pass;
- all push/PR review gates pass.

### Thirty-level expansion done

- six chapters and thirty levels, five waves each;
- strictly increasing reviewed difficulty evidence;
- full new mechanic/enemy/weapon tutorials and counters;
- deterministic guided clears and frozen metrics;
- owner playtest evidence for every chapter;
- versioned progress migration;
- isolated `expansion-v1` replay and per-level score categories;
- legacy and `phase4-v1` compatibility retained;
- offline mode retained;
- shared database protected;
- full desktop/mobile release-candidate verification;
- rollback rehearsed;
- CodeRabbit and Codex reviews clean on every push.

## 23. Decision gate

**Verdict: Go after mitigations.**

Do not commit production asset or expansion resources until these blockers are
resolved:

1. Confirm that thirty levels means thirty five-wave levels (150 waves).
2. Approve pre-rendered 3D Canvas2D pieces instead of runtime 3D/projection.
3. Choose one of three contextual style frames after they are generated.
4. Approve a separate expansion campaign and per-level leaderboard contract.
5. Pass the Relay/`turret`/Probe mobile vertical-slice gate before full-roster
   generation.
