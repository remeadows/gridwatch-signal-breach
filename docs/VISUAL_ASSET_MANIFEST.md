# GridWatch Visual Foundation Manifest

Last reviewed: 2026-07-16

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
| Phase 6 Source, Core, Relay, Firewall, ICE turret, Probe, Crawler, Spoof, Hunter | OpenAI ImageGen source masters; local chroma-key extraction; prompt/hash manifest | Local PNG/WebP + Canvas2D | Opt-in visual slices (`?art=phase6`) | 512 KiB runtime cap |

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
limited to Relay, ICE turret, and Probe. It is opt-in with `?art=phase6`; the
current glyph renderer remains the default and automatic fallback if an image
does not decode.

The machine-readable source, prompt provenance, dimension, alpha, byte-budget,
and SHA-256 records are in `src/assets/board/asset-manifest.json`. Run
`npm run verify:assets` before any visual push. `npm run verify:assets --
--release` additionally requires explicit owner approval for every shipped
asset.

## Phase 6C Foundation Slice

Source, Core, and Firewall extend the same opt-in Canvas2D path. Source and
Core retain their existing signal rings, integrity feedback, and tactical labels;
Firewall retains its gameplay HP pips. The owner accepted this foundation
direction before Phase 6D began. Glyph mode remains the default and fallback
for every piece.

## Phase 6D-A Enemy Slice

Crawler, Spoof, and Hunter extend the same opt-in Canvas2D path while keeping
their existing shadows, HP bars, corruption, and Spoof phase-offset feedback
procedural. Their source masters, prompt records, alpha extraction, dimensions,
and SHA-256 records are in the machine-readable manifest. These three new
pieces await contextual desktop/mobile approval; Probe remains the approved
hostile anchor. Glyph mode remains the default and fallback for every enemy.
