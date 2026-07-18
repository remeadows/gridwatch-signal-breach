# GridWatch Visual Foundation Manifest

Last reviewed: 2026-07-18

## Shipping Policy

GridWatch remains fully playable offline. Every shipped visual is local,
deterministic, and rendered with HTML, CSS, SVG path data, or Canvas2D. There are
no CDN images, runtime generation calls, external fonts, or new network requests.

The supplied GridWatchZero attachment establishes the cinematic direction:
operator silhouette, rain, cyan/magenta edge light, strong negative space, and
small monospaced mission labels. It is a design reference only in this slice;
the original attachment is not copied into the public repository because its
source license and crop-safe master have not yet been documented.

## Current Visual Inventory

| Asset family | Source / provenance | Format | Intended role | Budget |
|---|---|---|---|---:|
| Operator terminal silhouette | Project-authored CSS shapes and gradients | CSS | Title and mission atmosphere | 0 transferred bytes beyond CSS |
| Perimeter Run floor | Project-authored deterministic Canvas2D lanes | Canvas2D | Sector 1 board mood | Cached layer |
| Relay Canyon floor | Project-authored deterministic Canvas2D fractures | Canvas2D | Sector 2 board mood | Cached layer |
| Core Vault floor | Project-authored deterministic Canvas2D rings | Canvas2D | Sector 3 board mood | Cached layer |
| Unit and intrusion glyphs | Existing project-owned path definitions | Canvas2D/SVG | Tactical silhouettes | Existing bundle |
| Combat effects | Project-authored deterministic Canvas2D primitives | Canvas2D | Spawn, hit, kill, corruption, boss, and damage feedback | Per-frame only |
| Sector key-art fields | Project-authored CSS gradients and geometric motifs | CSS | Sector-select cards | 0 transferred bytes beyond CSS |
| Phase 6 Source, Core, Relay, Firewall, ICE turret, Scrubber, Overclock, Probe, Crawler, Spoof, Hunter, Splitter, Goliath | OpenAI ImageGen source masters; local chroma-key extraction; prompt/hash manifest | Local PNG/WebP + Canvas2D | Default board presentation (`?art=glyphs` rollback) | 768 KiB runtime cap |
| Expansion 1 Rusher (owner approved) | OpenAI ImageGen source master; approved Probe/Hunter style references; local chroma-key extraction; prompt/hash manifest | Local PNG + Canvas2D QA preview | Query-gated `?rusher-preview=1` visual intake only; not live gameplay | 90 KiB asset cap; 25,829 bytes actual |
| Expansion 1 Latency Trap (owner approved) | OpenAI ImageGen source master; approved Firewall/Overclock style references; local chroma-key extraction; prompt/hash manifest | Local PNG + Canvas2D QA preview | Query-gated `?latency-trap-preview=1` visual intake only; not live gameplay | 90 KiB asset cap; 77,820 bytes actual |

## Palette and Tactical Semantics

- Signal / success: `#22e0c4`
- Hostile / breach: `#ff4f91` and `#ff2957`
- Firewall / boosted attack: `#f2c94c`
- ICE attack: `#4da3ff`
- Corruption / spoofing: `#b68cff`
- Cleanse / recovery: `#5ee08a`

Color is never the only state indicator. Hostile effects use angular shards and
warning rings; friendly effects use circles, route pulses, checks, and labels.

## Scale and Timing

- Normal intrusion body: about 48% of one tile.
- Goliath body: about 64% of one tile plus a labeled boss health plate.
- Impact feedback: one simulation interpolation window (350 ms at current tuning).
- Spawn portal: one simulation interpolation window with a persistent silhouette.
- Motion reduction: remove shake, bobbing, scan sweeps, traveling sparks, and
  decorative transitions while retaining static state rings and health bars.

## Performance Policy

- Board floor art is cached by canvas size, sector, and quality tier.
- `?quality=low` forces the low-effects tier for testing and older devices.
- Devices reporting four or fewer logical processors default to low effects.
- Low effects reduce background marks, particles, bloom layers, and animation.
- No effect may change hit targets, board geometry, simulation state, or replay.

## Future Approved-Asset Intake

Before importing a raster GridWatchZero asset, record its owner, approval or
license, source dimensions, crop-safe area, optimized dimensions, compressed
size, and exact screen role here. Keep title/briefing/sector/results art separate
from the live board so cinematic detail never obscures tactical cells.

## Phase 6B Vertical Slice

The approved art direction is Reactor-tech tactical realism: dark machined
metal, ceramic armor, carbon composite, restrained cyan/blue/magenta light, and
an orthographic approximately 70-degree board camera. The first raster slice is
limited to Relay, ICE turret, and Probe. It established the approved art
direction for the complete roster. The raster presentation is now the default;
`?art=glyphs` forces the prior glyph presentation, and glyphs remain the
automatic fallback if an image does not decode.

The machine-readable source, prompt provenance, dimension, alpha, byte-budget,
and SHA-256 records are in `src/assets/board/asset-manifest.json`. Run
`npm run verify:assets` before any visual push. `npm run verify:assets --
--release` additionally requires explicit owner approval for every shipped
asset.

## Phase 6C Foundation Slice

Source, Core, and Firewall extend the same Canvas2D path. Source and
Core retain their existing signal rings, integrity feedback, and tactical labels;
Firewall retains its gameplay HP pips. The owner accepted this foundation
direction before Phase 6D began. Glyph mode remains the explicit rollback and
automatic fallback for every piece.

## Phase 6D-A Enemy Slice

Crawler, Spoof, and Hunter extend the same Canvas2D path while keeping
their existing shadows, HP bars, corruption, and Spoof phase-offset feedback
procedural. Their source masters, prompt records, alpha extraction, dimensions,
and SHA-256 records are in the machine-readable manifest. These three new
pieces are included in the owner-approved roster; Probe remains the hostile
anchor. Glyph mode remains the explicit rollback and automatic fallback for
every enemy.

## Phase 6D-B Final Enemy Slice

Splitter and Goliath complete the current enemy roster on the same
Canvas2D path. Splitter retains the procedural death-spawn behavior from the
simulation, and Goliath retains its procedural warning ring, boss health plate,
and reduced-motion-safe feedback. Goliath uses a 384px alpha WebP runtime asset
within its 160 KiB per-boss limit; the aggregate cap is raised to 768 KiB, still
well inside the Phase 6 plan's 1.5 MiB full-roster ceiling. Both assets are
owner-approved. Glyph mode remains the explicit rollback and fallback.

## Phase 6C-B Final Hardware Slice

Scrubber and Overclock complete the current thirteen-family base roster. Their
cleansing and boost telegraphs remain procedural. The owner approved promotion
of the complete roster to the default board presentation; glyph mode remains an
explicit rollback and automatic load-failure fallback.

## Phase 8D Rusher Visual Intake

The first Expansion 1 hostile raster is a narrow, low-profile delta interceptor
generated with the built-in OpenAI ImageGen tool. It uses the approved Probe and
Hunter only as material, lighting, and camera references; its directional
silhouette is intentionally distinct from the broad Probe. The source master is
stored at `art/source/expansion1/gw-expansion1-rusher-master-v1.png`, the exact
prompt and processing record at
`art/prompts/expansion1/gw-expansion1-rusher-prompt-v1.md`, and the transparent
256×256 runtime asset at
`src/assets/board/expansion1/gw-expansion1-rusher-board-v1.png`.

The asset is visible only in the responsive `?rusher-preview=1` visual-QA lab.
That page compares it with the existing Probe at an actual 8×8 board scale,
checks 55/43/32 CSS-pixel legibility, exercises four rotations, and provides a
reduced-motion toggle. It does not add the Rusher to the live sprite registry,
simulator, expansion content, replay validator, or leaderboard. Normal game
loads do not request the lazy preview chunk or Rusher raster.

The owner accepted the localhost desktop/mobile preview on 2026-07-18, so the
manifest records `ownerApproved: true` and the release asset gate passes. The
aggregate manifest cap is 1.5 MiB, matching the previously approved full-roster
ceiling; the Rusher-inclusive runtime total was 733,029 bytes.

## Phase 8E Latency Trap Visual Intake

The first Expansion 1 defensive-mechanic raster is a low-profile octagonal
timing pad generated with the built-in OpenAI ImageGen tool. The approved
Firewall and Overclock are material, lighting, construction, and camera
references only. Its recessed central segmented induction ring and three
permanent capacitor housings distinguish it from a wall, turret, signal relay,
or explosive. The source master is stored at
`art/source/expansion1/gw-expansion1-latency-trap-master-v1.png`, the exact
prompt and processing record at
`art/prompts/expansion1/gw-expansion1-latency-trap-prompt-v1.md`, and the
transparent 256×256 runtime asset at
`src/assets/board/expansion1/gw-expansion1-latency-trap-board-v1.png`.

The asset is visible only in the responsive `?latency-trap-preview=1` visual-QA
lab. Its 8×8 board keeps the magenta hostile traversal lane separate from the
cyan Source-to-Core signal route, and places the Firewall, ICE range, and
corruption on distinct cells. Three, two, and one remaining-charge states are drawn
procedurally at 55/43/32 CSS pixels, as is the trigger pulse. The preview also
supports reduced motion and BFCache restoration. It does not add the Latency
Trap to the live sprite registry or simulator, publish expansion content,
change a replay validator, or touch the leaderboard/database. Normal game loads
do not request the lazy preview chunk or Latency Trap raster.

The owner accepted the production-built localhost desktop/mobile preview on
2026-07-18, so the machine-readable manifest records `ownerApproved: true` and
`npm run verify:assets -- --release` passes. The aggregate runtime total is now
810,849 bytes, below the existing 1.5 MiB full-roster ceiling.
