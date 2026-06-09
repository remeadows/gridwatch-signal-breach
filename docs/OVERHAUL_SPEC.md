# GridWatch: Signal Breach — Cyberpunk Visual/UX Overhaul Spec

This is an implementation spec for a coding agent. It is self-contained: everything needed to
implement is in this document plus the repository source. Read the **Hard constraints** first;
they are non-negotiable.

## Why

The game currently reads as "a basic board" to casual players:

- It boots straight into Wave 1 prep with no title screen and no explanation of what a signal,
  relay, or spoof is.
- Units are a diamond and two circles; enemies are colored dots; tiles are flat squares.
- The neon cyan/pink palette exists in `src/style.css` but the canvas barely uses it; there is
  no animation juice (no signal pulse, no glow, no placement preview).

Goal: a polished, sellable indie web game. Three pillars: **(1)** an intro/onboarding flow,
**(2)** distinctive cyberpunk iconography, **(3)** board "juice" — all without touching the
deterministic sim or adding dependencies.

## Hard constraints

- **`src/sim/` stays byte-identical.** Verify with `git diff --stat src/sim/` (must be empty).
  All animation derives from `performance.now()` in the render layer; it never feeds the sim.
  No `Math.random()` anywhere in render code.
- **Zero new npm dependencies. No external fetches. No binary assets.** Everything is
  procedural/inline (Vite's `modulePreload` polyfill is disabled on purpose — see HANDOFF.md).
- **`npm run build` (tsc + vite) must pass after every phase.** Each phase below is
  independently shippable.

## Current architecture (orientation)

- `src/sim/` — pure deterministic game model: `createGameState()`, `applyCommand(state, cmd)`,
  `tick(state)`. Immutable state. No DOM access.
- `src/render/renderer.ts` — all Canvas2D drawing via `drawGrid(context, size, state, frame)`.
  `src/render/canvas.ts` has board metrics + `getGridPositionFromClientPoint`.
  `src/render/animator.ts` is an unused stub.
- `src/input/pointer.ts` — `installPointerInput(options)`, pointerdown → place/sell commands.
- `src/ui/` — DOM: `hud.ts`, `unitPicker.ts`, `overlays.ts` (prep + end screens, keyed
  idempotent re-render via `root.dataset`), `audio.ts` (procedural WebAudio, has `playTone`).
- `src/data/` — tuning: `level.ts`, `units.ts` (`UNIT_TUNING`), `waves.ts`, `enemies.ts`,
  `taunts.ts`.
- `src/main.ts` — composition root. App state lives as closure vars (`state`, `selectedTool`,
  `lastTickTime`). RAF loop at 60fps; sim tick every `LEVEL_CONFIG.simulationTickMs` (350ms)
  via a catch-up `while` loop. Note the existing pattern: `lastTickTime = performance.now()`
  is reset in `onSkipPrep`/`onRestart` to prevent catch-up tick bursts.

---

## 1. App screen state machine

Introduce an app-level screen state that wraps (never touches) the sim's phases.

- New type `AppScreen = "title" | "briefing" | "playing"`. Lives as a closure variable in
  `src/main.ts` (exactly like `selectedTool`), **not** in `GameState`.
- New module **`src/ui/screens.ts`**, mirroring the `renderOverlay(options)` pattern in
  `src/ui/overlays.ts` (keyed re-render via `root.dataset`):

```ts
export type AppScreen = "title" | "briefing" | "playing";

export type ScreenOptions = Readonly<{
  root: HTMLElement;              // new #screen-root
  screen: AppScreen;
  onStart: () => void;            // title "JACK IN" → briefing (first visit) or playing
  onBriefingComplete: () => void; // briefing final button → playing
  onShowBriefing: () => void;     // title "MISSION BRIEFING" → briefing
}>;

export function renderScreens(options: ScreenOptions): void;
export function hasSeenBriefing(): boolean; // localStorage, try/catch wrapped
export function markBriefingSeen(): void;   // localStorage, try/catch wrapped
```

- localStorage key: `"gridwatch.briefingSeen" = "1"`. Wrap get/set in `try/catch` (Safari
  private mode throws); on failure default to showing the briefing.
- **Routing in `main.ts`:**
  - `let screen: AppScreen = "title";` and later (Phase 3) `let hoverTile: GridPosition | null = null;`
  - The RAF loop always runs (the canvas shows an ambient animated backdrop behind the title),
    but the sim-tick `while` loop is gated on `screen === "playing"`.
  - On every transition into `"playing"`: `lastTickTime = performance.now();` (same trick as
    `onSkipPrep`/`onRestart`).
  - `renderHud`, `renderUnitPicker`, `renderOverlay` are called only when playing; otherwise
    set `overlayRoot.hidden = true` so the Wave 1 prep panel never shows under the title.
  - `renderScreens(...)` is called every frame (it's keyed/idempotent).
  - Pointer input is gated via a new `isEnabled: () => screen === "playing"` option (see §4).
  - End-of-game "Restart" keeps current behavior (straight back into prep; do NOT bounce
    through the title).
- **Flow:** first visit: title → briefing → playing (`markBriefingSeen()` on completion).
  Return visit: title → playing directly via JACK IN; the title keeps a secondary
  "MISSION BRIEFING" button to re-read. The title screen always shows — it's one click and
  it's the game's face.
- **`index.html`:** add `<div id="screen-root"></div>` as the last child of `<body>` (sibling
  of `.app-shell`, stacking above everything). Query it in `main.ts` with the other roots.

## 2. Intro content

### Title screen (`screen === "title"`)

Full-viewport `div.screen.screen-title` over the dimmed game shell (dark translucent
background + `backdrop-filter: blur(6px)`).

- Logo in pure HTML/CSS: `GRIDWATCH` in large monospace caps with cyan `text-shadow` glow,
  `SIGNAL BREACH` subtitle in pink, a thin animated scanline underline, and a CSS glitch
  animation on hover (two pseudo-element copies offset with `clip-path` keyframes — no JS).
- Tagline: `Hold the uplink. Survive five waves.`
- Primary button **`▸ JACK IN`** (large, glowing). Secondary **`MISSION BRIEFING`**.
- Footer flavor line: `v1.0 // OPERATOR TERMINAL // GRIDWATCH NETSEC`.
- Behind it the canvas runs a new `drawAmbientBackdrop(context, size, timeMs)` exported from
  the renderer (circuit-grid background layer from §5.1 plus a slow traveling pulse — needs
  no `GameState`).

### Briefing (`screen === "briefing"`) — 3 paged panels with NEXT/BACK and progress dots

Copy lives in a new **`src/data/briefing.ts`** (consistent with `taunts.ts`). It imports
`UNIT_TUNING` from `src/data/units.ts` so costs in copy can never drift from tuning. Each
panel shows the exact in-game SVG icons (§3) so players recognize them on the board.

1. **THE SIGNAL** — Source and Core icons connected by a glowing CSS line. Copy: *"Route the
   signal from the SOURCE to the CORE. The cyan line is your lifeline — if it's cut, the Core
   bleeds integrity. Integrity hits zero, you're flatlined."*
2. **YOUR ARSENAL** — three rows: unit icon + name + cost + one-liner. *Relay (6): extends
   signal reach — the route flows through these. Firewall (12): hardened tile, slows
   corruption. ICE Turret (16): auto-fires at adjacent intrusions. Click a tool, click a
   tile. SELL refunds part of the cost.*
3. **THE THREATS** — three rows with enemy icons. *Probe: fast, weak, swarms. Crawler: slow,
   tough, corrupts tiles fast. Spoof: slips past firewall hardening. Intrusions corrupt tiles
   to sever your route. Survive all 5 waves.*

Final panel button: **`INITIALIZE UPLINK ▸`** → `onBriefingComplete()`. Panel index is local
state inside `screens.ts`, reset when the screen changes.

## 3. Iconography — single source, two consumers

`Path2D` accepts SVG path-data strings, so define every glyph **once** as path data and render
it on canvas via `new Path2D(d)` and in the DOM via inline `<svg>` strings. Picker buttons,
briefing panels, and board glyphs are then pixel-identical shapes.

### New file `src/render/iconPaths.ts` (pure data; no DOM/canvas imports)

```ts
export type IconName =
  | "relay" | "firewall" | "turret" | "sell"
  | "source" | "core"
  | "probe" | "crawler" | "spoof";

export type IconDef = Readonly<{
  fill: readonly string[];   // path data drawn filled (24×24 viewBox)
  stroke: readonly string[]; // path data drawn stroked (detail lines)
  color: string;             // primary neon color
  accent: string;            // stroke/highlight color
}>;

export const ICON_VIEWBOX = 24;
export const ICONS: Readonly<Record<IconName, IconDef>>;
```

Glyph designs (hand-authored path data, ~3–6 subpaths each, distinct silhouettes at 24px):

| Icon | Design | Color |
|---|---|---|
| Relay | diamond antenna node: solid diamond core, two broadcast arcs above, stem | cyan `#22e0c4` |
| Firewall | hexagonal shield with 3 horizontal brick-slot cutouts | amber `#f2c94c` |
| ICE Turret | angular crosshair cannon: square base, rotated barrel diamond, 4 corner ticks | blue `#4da3ff` |
| Sell | credit hex with down-chevron (recycle/refund motif) | pink `#ff4f91` |
| Source | broadcast tower: mast on base with 3 emission arcs | cyan `#22e0c4` |
| Core | hexagon, nested inverted triangle, center dot (reactor) | pink `#ff4f91` |
| Probe | small sharp triangle dart with tail-fin notch (reads fast/weak) | amber `#f2c94c` |
| Crawler | wide segmented beetle: 3 stacked chevron plates with leg ticks (reads slow tank) | red `#ff5f6e` |
| Spoof | split/mirrored diamond with a gap down the middle (glitch/duplicate motif) | purple `#b68cff` |

### New file `src/render/icons.ts` (canvas consumer)

```ts
export function drawIcon(
  ctx: CanvasRenderingContext2D,
  name: IconName,
  centerX: number,
  centerY: number,
  sizePx: number,
  opts?: Readonly<{ alpha?: number; rotation?: number; glow?: boolean }>,
): void;

// Pre-renders icon WITH shadowBlur glow once into an offscreen canvas;
// per-frame use is then a single drawImage.
export function getGlowSprite(name: IconName, sizePx: number): HTMLCanvasElement;
export function clearSpriteCaches(): void;
```

- Module-level caches: `Map<string, Path2D>` keyed by raw path data, and
  `Map<string, HTMLCanvasElement>` keyed by `` `${name}:${sizePx}` ``.
- `drawIcon`: `save(); translate(cx, cy); rotate(rotation ?? 0); scale(sizePx / ICON_VIEWBOX); translate(-12, -12);`
  then fill/stroke the cached `Path2D`s. No shadowBlur here.
- `getGlowSprite`: render into a canvas padded ~`sizePx * 0.5` per side for the blur halo,
  set `shadowColor`/`shadowBlur` once, draw, return. Used for static board glyphs; live
  `drawIcon` is used where rotation/pulse animation is needed (enemies).

### New file `src/ui/iconsSvg.ts` (DOM consumer)

```ts
export function svgIcon(name: IconName, sizePx?: number, className?: string): string;
```

Returns an inline `<svg viewBox="0 0 24 24">` string with the icon's neon fill/stroke and an
SVG filter drop-shadow glow. These strings are app-authored constants (not user input), so
`innerHTML` is safe — keep a comment in the file saying so.

### Consumers

- **`src/render/renderer.ts`:** replace `drawTileGlyph`/glyph-fill logic — `drawTiles` uses
  `getGlowSprite(kind, tileSize * 0.55)` + `drawImage` for relay/firewall/turret. `drawMarkers`
  replaces labeled circles with Source/Core icons (keep small "SRC"/"CORE" captions below for
  clarity). `drawIntrusions` replaces circles+letters with enemy icons (animated in §5.5).
- **`src/ui/unitPicker.ts` (restructure required):** the current per-frame update sets
  `button.textContent`, which would wipe SVG children. Build
  `icon + <span class="tool-name"> + <span class="tool-cost">` once inside the existing
  `!root.dataset.ready` branch; the per-frame loop must only mutate `button.className`,
  `button.disabled`, and the cost span's `textContent`. Add `title` tooltips with the unit
  one-liners from `src/data/briefing.ts`.
- **`src/ui/screens.ts`:** briefing panels use `svgIcon`.

## 4. Hover / ghost placement preview

### Input (`src/input/pointer.ts`)

Extend the options type:

```ts
export type PointerInputOptions = Readonly<{
  canvas: HTMLCanvasElement;
  getState: () => GameState;
  getSelectedTool: () => PlayerTool;
  dispatch: (command: SimCommand) => void;
  isEnabled: () => boolean;                         // NEW: false on title/briefing
  onHover: (position: GridPosition | null) => void; // NEW
}>;
```

- `pointermove`: if `!isEnabled()` or `event.pointerType !== "mouse"` → `onHover(null)`;
  else `onHover(getGridPositionFromClientPoint(...))` (reuse the existing function from
  `src/render/canvas.ts` — do not duplicate the math).
- `pointerleave` → `onHover(null)`.
- Gate the existing `pointerdown` handler with `isEnabled()`.
- Touch devices: hover is mouse-only by design; placement stays single-tap.

### State channel

`let hoverTile: GridPosition | null = null;` in `main.ts`, set by `onHover`, passed into the
renderer via the extended `RenderFrame` (§5). This is UI state only — never on `GameState`.

### Rendering (`drawHoverGhost` in renderer)

- Draw only when `frame.hover` is set, `state.phase` is `prep`/`active`, and the hovered tile
  is `"empty"` (or occupied, for the sell tool).
- Selected unit's icon at 45% alpha + pulsing tile outline. Validity tint: cyan outline if the
  tile is empty, not source/core, and `state.bandwidth >= cost`; red outline + 25% alpha icon
  otherwise. (The ghost is advisory — sim edge cases that still reject placement are fine.)
- Range telegraphs: relay → faint diamond of tiles within `state.config` relay signal range;
  turret → highlight the 4 orthogonal neighbors. Read ranges from `state.config`, never
  hardcode.
- Sell tool: red dashed outline + refund amount text over occupied tiles.

## 5. Renderer upgrades (`src/render/renderer.ts`), in impact order

First, a single signature change:

```ts
export type RenderFrame = {
  interpolationAlpha: number;
  flashAlpha: number;
  shakeMagnitude: number;
  timeMs: number;                 // NEW: performance.now() from the RAF callback
  hover: GridPosition | null;     // NEW
  selectedTool: PlayerTool;       // NEW
};
```

`main.ts` passes `timeMs: now`, `hover: hoverTile`, `selectedTool`. Keep
`DEFAULT_RENDER_FRAME` (if present) compiling. Also export
`drawAmbientBackdrop(context, size, timeMs)` for the title screen.

Then, in order:

1. **Cached static background — new file `src/render/background.ts`.**
   `getBoardBackgroundLayer(size: CanvasSize): HTMLCanvasElement` lazily renders ONCE to an
   offscreen canvas: the dark gradient backdrop (move `drawBackdrop` logic here), a
   circuit-board texture (per-tile deterministic traces: thin L-shaped lines + via dots,
   seeded by the tile hash `((x * 73856093) ^ (y * 19349663)) >>> 0` — stable frame-to-frame,
   zero RNG), the grid lines (moved here, dimmed to ~0.18 alpha so tiles pop), corner brackets
   framing the board, and a subtle radial vignette. `drawGrid` then starts with one
   `drawImage` instead of ~140 path ops. **This buys the perf budget for everything below.**
2. **Animated signal route pulse** (replaces the flat stroke): three layers — (a) wide soft
   under-glow stroke (`lineWidth ≈ 12`, `rgba(34,224,196,0.14)`); (b) main 4px cyan line;
   (c) traveling energy: `ctx.setLineDash([6, tileSize])` with
   `ctx.lineDashOffset = -(frame.timeMs * 0.12) % (tileSize + 6)` so bright dashes flow
   Source→Core; plus a bright "packet" dot placed at `(timeMs * 0.15) % polylineLength`.
   When `state.signal.status === "severed"`: no pulse, render dead route stubs in dim red.
3. **Icon glyphs with cached glow sprites** (§3). Occupied tiles also get a 1px inner border
   in the unit's accent color and a faint inner gradient (gradient created in the cached
   layer or once per frame — never per tile).
4. **Source/Core hero treatment** in `drawMarkers`: Core gets a slowly rotating outer hex
   ring (`rotation = timeMs * 0.0004`) and an integrity arc mapped to
   `state.coreIntegrity / state.config` max integrity, colored cyan→red (reuse the
   corruption-arc technique). Source gets expanding broadcast rings: 2 circles with radius
   `(timeMs * 0.03 + i * tileSize / 2) % tileSize`, alpha fading with radius. Plain strokes,
   no shadowBlur.
5. **Enemy redesign + animation** in `drawIntrusions` (keep the existing interpolation math):
   - Probe: icon rotated to face movement direction
     (`Math.atan2(current.y - previous.y, current.x - previous.x)`), fast spin ring.
   - Crawler: breathing scale `1 + 0.06 * Math.sin(timeMs * 0.004 + intrusion.id)` (id
     offsets desync pulses).
   - Spoof: glitch double-draw — icon twice at ±2px x-offset, 40% alpha, cyan/pink, before
     the main draw; offsets jittered by `Math.sin(timeMs * 0.02 + id * 3)`.
   - Keep HP bar + corruption arc; restyle HP bar (rounded dark backing, cyan→red as hp drops).
6. **Hover ghost** (§4) — drawn after units, before intrusions.
7. **Corrupted-tile glitch:** dark-red base + 2–3 horizontal "static" slivers whose y-offsets
   derive from `Math.floor(timeMs / 120)` + tile hash (time-quantized flicker, deterministic
   per frame) + a dim red X in the icon stroke style.
8. **Event juice retune:** turret beams become two-pass (wide faint + thin bright core);
   `intrusionNeutralized` events get an expanding ring burst at the event position;
   corruption flashes restyled.
9. **CRT scanlines + vignette in CSS, not canvas:** `.game-panel::after` —
   `position: absolute; inset: 0; pointer-events: none;` with
   `repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0 1px, transparent 1px 3px)` scanlines,
   a radial vignette, and a faint top sheen. Sits above the canvas, below `#overlay-root`
   (give overlay-root `z-index: 2`). Zero per-frame cost.
10. **Canvas text cleanup:** delete `drawTitle` (a DOM logo header replaces it — small
    `<h1 class="game-logo">` in the shell); restyle `drawStatus` as a slim monospace bottom
    ticker (keep it — it reads well during play).

**Repurpose `src/render/animator.ts`** (currently an unused stub) as shared animation math:
`pulse01(timeMs, periodMs, phase = 0)`, `hashTile(x, y)`, `polylineLength(points)`,
`pointAlongPolyline(points, distance)` — used by the renderer and background.

## 6. Typography + CSS (`src/style.css`, `index.html`)

**Font: pure system monospace stack, no woff2.** A repo-hosted font would add a binary asset
to a deliberately all-procedural repo, and the implementer may not have network access to
obtain one. The terminal aesthetic comes from `text-transform: uppercase` +
`letter-spacing: 0.08–0.18em`, more than the typeface:

```css
:root {
  --font-display: ui-monospace, "Cascadia Code", "SF Mono", "JetBrains Mono",
    Consolas, "Liberation Mono", monospace;
}
```

Use `--font-display` for: logo, HUD values, buttons, overlay/briefing headings. Body copy
stays on the existing system sans for readability. Mirror the stack in canvas text
(`drawStatus`, marker captions). Document the woff2 option in a CSS comment for the future.

CSS work items (keep the existing `#22e0c4` / `#ff4f91` palette; promote it to custom
properties):

- `:root` custom properties: `--neon-cyan`, `--neon-pink`, `--amber`, `--bg-deep`,
  `--panel-bg`, `--font-display`.
- Screen styles: `.screen`, `.screen-title`, `.screen-briefing`, `.briefing-panel`,
  `.panel-dots`, logo glitch keyframes, ~250ms fade transitions (`opacity` + `transform`).
- Shared `.neon-button`: clipped corners via `clip-path: polygon(...)` (angular cyberpunk
  shape), 1px neon border, inner gradient, `box-shadow` glow on hover/selected, 1px
  translateY on active.
- Unit picker: `display: grid; grid-template-columns: 28px 1fr auto` (icon | name | cost);
  selected state gets an animated box-shadow pulse; disabled state desaturated.
- HUD: Bandwidth and Core as the two hero metrics (larger, glowing values); thin animated
  "data stream" divider.
- `.game-panel::after` scanline/vignette layer (§5.9); `#overlay-root { z-index: 2 }`.
- Overlay panels (prep/end): clipped-corner panels, display-font headings; the taunt styled
  as a `> incoming transmission` terminal line with a blinking caret (`::after` animation);
  end-screen rating gets a stamp treatment.
- Mobile (existing `@media (max-width: 760px)`): screens get reduced padding/sizes; briefing
  scrolls (`overflow-y: auto; max-height: 100dvh`); verify at 320px width.

`src/ui/hud.ts` and `src/ui/overlays.ts` need only minor markup tweaks (class hooks, optional
inline SVG icons next to metrics) — the heavy lifting is CSS.

## 7. Risks and mitigations

| Risk | Mitigation |
|---|---|
| `ctx.shadowBlur` tanks 60fps (full Gaussian per draw) | Never in the per-frame path. Glow = pre-rendered sprites (`getGlowSprite`), layered wide/faint strokes, CSS shadows. Budget: 0 shadowBlur calls per frame in steady state. |
| Per-frame allocation / GC stutter | Cache `Path2D`s, sprites, background layer at module level; no `createLinearGradient` per tile. |
| Sim determinism contamination | Animation inputs are `frame.timeMs` + render-side tile hashes only; no `Math.random()` in render; no new `GameState` fields; `git diff --stat src/sim/` empty. |
| Catch-up tick burst on entering playing | Reset `lastTickTime = performance.now()` on every transition into playing (pattern already exists for restart/skip-prep). |
| unitPicker per-frame `textContent` wipes SVG | Restructure update path per §3. |
| localStorage throws (private mode) | try/catch in the briefing helpers; default to showing the briefing. |
| Mobile: hover meaningless, screens overflow | Hover gated to `pointerType === "mouse"`; briefing scrollable; test 320px and 760px. |
| `innerHTML` for SVG | Constant app-authored strings only; comment in `iconsSvg.ts`. |

## 8. Phased execution (each phase shippable; build must pass)

### Phase 1 — App states + intro flow (~3–4h)

1. `index.html`: add `#screen-root`; add `<h1 class="game-logo">` shell header.
2. New `src/data/briefing.ts` (copy + per-unit/enemy one-liners; imports `UNIT_TUNING`).
3. New `src/ui/screens.ts` (title + 3-panel briefing + localStorage helpers; §1–2).
4. `src/main.ts`: `screen` state; gate sim tick / HUD / picker / overlay; wire `renderScreens`;
   reset `lastTickTime` on entering playing.
5. `src/input/pointer.ts`: add the `isEnabled` gate only (hover comes in Phase 3).
6. `src/style.css`: custom properties, font stack, `.screen*` styles, logo, `.neon-button`.

**Verify:** `npm run dev` — title shows over the dimmed board with no prep countdown ticking
behind it; JACK IN → briefing (first run) → game starts with a full prep timer; reload →
briefing skipped, MISSION BRIEFING button reopens it; clicking the board on the title screen
places nothing. `npm run build` passes.

### Phase 2 — Iconography (~3–4h)

1. New `src/render/iconPaths.ts` (9 icons, §3 designs).
2. New `src/render/icons.ts` (Path2D cache, `drawIcon`, `getGlowSprite`).
3. New `src/ui/iconsSvg.ts` (`svgIcon`).
4. `src/render/renderer.ts`: swap tile glyphs / markers / intrusion visuals to icons (static —
   animation comes in Phase 3).
5. `src/ui/unitPicker.ts`: icon buttons + cost spans + tooltips; picker CSS.
6. `src/ui/screens.ts`: icons in briefing panels.

**Verify:** each unit/enemy visually distinct and identical between picker, briefing, and
board, at desktop and mobile sizes; check Firefox + Chromium; build passes.

### Phase 3 — Board juice (~4–6h)

1. Repurpose `src/render/animator.ts` (pulse/hash/polyline helpers).
2. New `src/render/background.ts` (cached circuit layer); renderer consumes it; remove
   now-redundant per-frame backdrop/grid drawing; export `drawAmbientBackdrop`.
3. `RenderFrame` extension (`timeMs`, `hover`, `selectedTool`) + `main.ts` plumbing.
4. Route pulse + packet dot; severed-state styling.
5. Source/Core hero treatment (rings, integrity arc).
6. Enemy animation (rotation / breathing / glitch).
7. `pointer.ts` `onHover` + `main.ts` `hoverTile` + `drawHoverGhost` with range telegraphs.
8. Corrupted-tile glitch; event juice retune; CSS scanline/vignette `::after`; remove canvas
   `drawTitle`.

**Verify:** devtools performance panel during Wave 5 (max ~9 intrusions): steady ≥58fps, no
GC spikes from per-frame allocation; route pulse flows Source→Core; hover ghost shows
cyan/red validity + relay range diamond; severed route reads clearly. Build passes.

### Phase 4 — Polish & QA (~2h)

1. HUD restyle (hero metrics); overlay/end-screen restyle; taunt terminal treatment.
2. Optional: UI blips in `src/ui/audio.ts` — add `playUi(kind: "select" | "start")` on top of
   the existing `playTone`.
3. Mobile pass at 320/420/760px; touch placement still works; briefing scrolls.
4. Full playthrough win + loss; restart loop; `git diff --stat src/sim/` empty;
   `npm run build` clean; `npm run preview` smoke test of `dist/`.

Total estimate: ~12–16h across 4 independently shippable phases.
