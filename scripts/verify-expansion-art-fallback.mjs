import assert from "node:assert/strict";
import path from "node:path";
import { build } from "vite";

// Real Vite asset URL/glob handling, without modifying dist, starting a server,
// reading an env file, or making any network request. Only Image is simulated.
const result = await build({
  configFile: false,
  root: process.cwd(),
  envDir: false,
  publicDir: false,
  logLevel: "error",
  build: {
    write: false,
    emptyOutDir: false,
    copyPublicDir: false,
    assetsInlineLimit: 0,
    modulePreload: false,
    minify: false,
    rolldownOptions: {
      input: path.resolve("scripts/expansion-art-fallback-harness.ts"),
      preserveEntrySignatures: "strict",
      output: { format: "es" },
    },
  },
});
const outputs = Array.isArray(result) ? result : [result];
const chunks = outputs.flatMap((output) => output.output ?? []).filter((entry) => entry.type === "chunk");
assert.equal(chunks.length, 1, "The in-memory harness must be one self-contained module.");
assert.equal(chunks[0].imports.length, 0, "The test must not import or request external runtime chunks.");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(chunks[0].code).toString("base64")}`;

const saved = Object.fromEntries(["Image", "window", "document", "Path2D"].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const originalWarn = console.warn;
let scenarioNumber = 0;
try {
  await verifyOriginalCampaign();
  await verifyGlyphMode();
  await verifyPhase6Mode();
  await verifyFailedBlenderRoster();
  await verifyReadyAndDecodePaths();
} finally {
  console.warn = originalWarn;
  for (const [key, descriptor] of Object.entries(saved)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
}
console.log("Expansion art fallback verified: real Vite glob URLs, failed/pending glyph rendering, one-time warnings, cached failures, isolated rollback modes, and decode readiness.");

async function verifyOriginalCampaign() {
  for (const mode of ["blender-v2", "phase6", "glyphs"]) {
    const { api, images } = await scenario(mode === "blender-v2" ? "" : `?art=${mode}`);
    assert.equal(api.getBoardArtMode(), mode, "Original campaign must default to Blender with explicit rollback modes.");
    api.preloadBoardSprites(mode);
    const size = { width: 888, height: 888, dpr: 1 };
    const pendingFloor = api.getBoardBackgroundLayer(size, 1, "low", mode);
    assert.equal(images.length, mode === "glyphs" ? 0 : mode === "phase6" ? 13 : 16);
    for (const id of api.BOARD_SPRITE_IDS) {
      assert.equal(api.getBoardSpriteUrl(id, mode), api.getExpansionArtUrl(id, mode), "Both campaigns must share exactly the same authored sprite URL.");
      assert.equal(api.getBoardSprite(id, mode), null, "Pending originals must fall back safely.");
    }
    for (const image of images) image.emit("load");
    await Promise.resolve();
    const readyFloor = api.getBoardBackgroundLayer(size, 1, "low", mode);
    assert.equal(readyFloor === pendingFloor, mode !== "blender-v2", "A decoded floor must invalidate the pending cached background.");
    assert.equal(api.getBoardBackgroundLayer(size, 1, "low", mode), readyFloor, "Stable backgrounds must be cached.");
    for (const id of api.BOARD_SPRITE_IDS) {
      const sprite = api.getBoardSprite(id, mode);
      assert.equal(Boolean(sprite), mode !== "glyphs");
      if (sprite) assert.ok(sprite.src.includes(mode === "blender-v2" ? "gw-blender-v2-" : "gw-phase6-"));
    }
    for (const sector of [1, 2, 3]) {
      const floor = api.getBoardFloorSprite(sector, mode);
      assert.equal(Boolean(floor), mode === "blender-v2");
      if (floor) assert.ok(floor.src.includes(`floor-chapter${sector}`));
      renderOriginalRoster(api, mode, sector);
    }
  }
  const { api, images } = await scenario("");
  api.preloadBoardSprites("blender-v2");
  images.forEach((image) => image.emit("error"));
  for (let frame = 0; frame < 10; frame++) {
    for (const id of api.BOARD_SPRITE_IDS) assert.equal(api.getBoardSprite(id, "blender-v2"), null);
    for (const sector of [1, 2, 3]) assert.equal(api.getBoardFloorSprite(sector, "blender-v2"), null);
    renderOriginalRoster(api, "blender-v2", 1);
  }
  assert.equal(images.length, 16, "Original failures must not cause repeated requests.");
  console.log("Original campaign art verified: shared 13-family roster, three sector floors, rollback modes, pending/error fallback.");
}

function renderOriginalRoster(api, mode, sector) {
  let state = api.createGameState({ sector, seed: "original-art-test" });
  const hardware = ["relay", "firewall", "turret", "scrubber", "overclock"];
  hardware.forEach((kind, x) => { state.grid = api.setTile(state.grid, { x, y: 0 }, { kind, hp: 10 }); });
  const enemies = ["probe", "crawler", "spoof", "hunter", "splitter", "goliath"];
  state = { ...state, intrusions: enemies.map((kind, x) => ({
    id: x + 1, kind, hp: 12, maxHp: 12, position: { x, y: 6 }, previousPosition: { x, y: 6 },
    spawnedTick: 0, lastMoveTick: 0, corruption: null,
  })) };
  const before = JSON.stringify(state);
  const drawn = drawing();
  api.drawGrid(drawn.context, { width: 888, height: 888, dpr: 1 }, state, {
    interpolationAlpha: 1, flashAlpha: 0, shakeMagnitude: 0, timeMs: 0,
    hover: { x: 5, y: 1 }, focus: null, selectedTool: "firewall", buildMode: true,
    reducedMotion: true, effectsQuality: "low", artMode: mode,
  });
  assert.equal(JSON.stringify(state), before, "Original drawing must not mutate the simulation.");
  for (const id of api.BOARD_SPRITE_IDS) {
    const sprite = api.getBoardSprite(id, mode);
    if (sprite) assert.ok(drawn.drawnImages.includes(sprite), `Original board did not draw ${id} in ${mode}.`);
  }
}

async function scenario(search) {
  const images = [];
  const warnings = [];
  class MockImage {
    status = "pending";
    decoding = "auto";
    listeners = new Map();
    decode = () => Promise.resolve();
    addEventListener(type, listener, options) {
      const entries = this.listeners.get(type) ?? [];
      entries.push({ listener, once: Boolean(options?.once) });
      this.listeners.set(type, entries);
    }
    set src(value) {
      assert.equal(this.url, undefined, "A cached sprite must never be requested a second time.");
      this.url = value;
      images.push(this);
    }
    get src() { return this.url; }
    emit(type) {
      this.status = type === "load" ? "loaded" : "failed";
      for (const entry of [...(this.listeners.get(type) ?? [])]) {
        if (entry.once) this.listeners.set(type, this.listeners.get(type).filter((candidate) => candidate !== entry));
        entry.listener();
      }
    }
  }
  globalThis.Image = MockImage;
  globalThis.Path2D = class {};
  globalThis.window = { location: { search } };
  globalThis.document = { createElement: (tag) => {
    assert.equal(tag, "canvas", "Only the floor cache may create a DOM element.");
    return { width: 0, height: 0, getContext: () => drawing().context };
  } };
  console.warn = (...args) => warnings.push(args.join(" "));
  const api = await import(`${moduleUrl}#scenario-${++scenarioNumber}`);
  return { api, images, warnings, MockImage };
}

function drawing() {
  const glyphs = [];
  const drawnImages = [];
  const context = {
    clearRect() {}, fillRect() {}, strokeRect() {}, beginPath() {}, closePath() {},
    arc() {}, ellipse() {}, fill() {}, stroke() {}, moveTo() {}, lineTo() {},
    save() {}, restore() {}, setLineDash() {},
    translate() {}, rotate() {}, scale() {}, rect() {}, roundRect() {}, clip() {},
    quadraticCurveTo() {}, bezierCurveTo() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    fillText: (text) => glyphs.push(text),
    drawImage: (image) => {
      if (image instanceof globalThis.Image) assert.equal(image.status, "loaded", "A pending or broken image reached Canvas drawImage.");
      drawnImages.push(image);
    },
  };
  return { context, glyphs, drawnImages };
}

function renderRoster(api, mode) {
  const base = api.createExpansionGameState({ levelId: 11, seed: "art-fallback", contentHash: "art-fallback-test" });
  let grid = api.createExpansionGrid(8);
  const hardware = ["relay", "firewall", "turret", "scrubber", "overclock", "latencyTrap", "arcIce"];
  hardware.forEach((kind, index) => {
    grid = api.setExpansionTile(grid, { x: 1 + index % 6, y: 1 + Math.floor(index / 6) }, { kind, hp: 10, charges: 3 });
  });
  const kinds = ["probe", "crawler", "spoof", "hunter", "splitter", "goliath", "rusher", "sapper", "shieldDrone"];
  const intrusions = kinds.map((kind, index) => ({
    id: index + 1, kind, hp: 12, maxHp: 12,
    position: { x: 1 + index % 6, y: 4 + Math.floor(index / 6) },
    previousPosition: { x: 1 + index % 6, y: 4 + Math.floor(index / 6) },
    spawnedTick: 0, lastMoveTick: 0, corruption: null,
  }));
  const state = { ...base, grid, intrusions };
  const before = JSON.stringify(state);
  const drawn = drawing();
  api.drawExpansionGrid(drawn.context, {
    width: 888, height: 888,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 888, height: 888 }),
  }, state, {
    timeMs: 0, effects: [], intrusionPositions: new Map(intrusions.map((entry) => [entry.id, entry.position])),
    hover: null, focus: null, selectedTool: "arcIce", buildMode: true,
    rangePreviewEnabled: false, rangePreviewPosition: null,
    reducedMotion: true, lowQuality: true, artMode: mode,
  });
  assert.equal(JSON.stringify(state), before, "Art fallback must not mutate simulation state.");
  return drawn;
}

function assertCompleteGlyphRoster(glyphs) {
  for (const label of ["SOU", "COR", "REL", "FIR", "TUR", "SCR", "OVE", "LAT", "ARC", "PRO", "CRA", "SPO", "HUN", "SPL", "GOL", "RUS", "SAP", "SHD"]) {
    assert.ok(glyphs.includes(label), `Missing readable fallback glyph: ${label}.`);
  }
}

async function verifyGlyphMode() {
  const { api, images, warnings } = await scenario("?art=glyphs");
  assert.equal(api.getExpansionArtMode(), "glyphs");
  for (const level of api.EXPANSION_LEVELS) api.preloadExpansionLevelArt(level, "glyphs");
  for (const id of Object.keys(api.EXPANSION_ART_FAMILIES)) {
    assert.equal(api.getExpansionArtUrl(id, "glyphs"), null);
    assert.equal(api.getExpansionArtSprite(id, "glyphs"), null);
  }
  const drawn = renderRoster(api, "glyphs");
  assertCompleteGlyphRoster(drawn.glyphs);
  assert.equal(drawn.drawnImages.length, 0);
  assert.equal(images.length, 0, "Glyph mode must create no image requests at all.");
  assert.equal(warnings.length, 0, "Intentional glyph mode must not log asset failures.");
}

async function verifyPhase6Mode() {
  const { api, images, warnings } = await scenario("?art=phase6");
  assert.equal(api.getExpansionArtMode(), "phase6");
  for (const level of api.EXPANSION_LEVELS) api.preloadExpansionLevelArt(level, "phase6");
  assert.ok(images.length > 0, "Rollback mode must request its existing reviewed assets.");
  assert.ok(images.every((image) => !image.src.includes("blender")), "Phase6 must not request any Blender asset.");
  const before = images.length;
  for (const id of ["floorChapter1", "floorChapter2", "floorChapter3", "arcIce", "shieldDrone"]) {
    assert.equal(api.getExpansionArtUrl(id, "phase6"), null, `Phase6 has no ${id}; it must use the glyph/base-grid fallback.`);
    assert.equal(api.getExpansionArtSprite(id, "phase6"), null);
  }
  assert.equal(images.length, before, "Missing rollback families must not issue broken requests.");
  images.forEach((image) => image.emit("load"));
  await Promise.resolve();
  const drawn = renderRoster(api, "phase6");
  assert.ok(drawn.drawnImages.length > 0, "Reviewed rollback sprites must still render.");
  assert.ok(drawn.glyphs.includes("ARC") && drawn.glyphs.includes("SHD"), "New families must remain readable when using the old roster.");
  assert.ok(images.every((image) => !image.src.includes("blender")), "Rendering rollback mode requested Blender art.");
  assert.equal(warnings.length, 0);
}

async function verifyFailedBlenderRoster() {
  const { api, images, warnings } = await scenario("");
  assert.equal(api.getExpansionArtMode(), "blender-v2");
  const ids = Object.keys(api.EXPANSION_ART_FAMILIES);
  for (const id of ids) assert.equal(api.getExpansionArtSprite(id, "blender-v2"), null, "Loading sprites must use glyphs until ready.");
  assert.equal(images.length, ids.length, "The complete candidate roster must have a real Vite-resolved URL.");
  assert.ok(images.every((image) => image.src.includes("gw-blender-v2-")));
  assertCompleteGlyphRoster(renderRoster(api, "blender-v2").glyphs);
  images.forEach((image) => image.emit("error"));
  assert.equal(warnings.length, ids.length, "Each failed sprite should emit one useful warning.");
  assert.equal(new Set(warnings).size, ids.length, "Warnings must identify the failed family.");
  for (let frame = 0; frame < 20; frame += 1) {
    for (const level of api.EXPANSION_LEVELS) api.preloadExpansionLevelArt(level, "blender-v2");
    for (const id of ids) assert.equal(api.getExpansionArtSprite(id, "blender-v2"), null);
    const drawn = renderRoster(api, "blender-v2");
    assertCompleteGlyphRoster(drawn.glyphs);
    assert.equal(drawn.drawnImages.length, 0, "Failed sprites/floors must never be passed to drawImage.");
  }
  images.forEach((image) => image.emit("error"));
  assert.equal(images.length, ids.length, "Repeated frames must not retry failed requests.");
  assert.equal(warnings.length, ids.length, "Repeated frames/events must not spam failure warnings.");
  assert.equal(api.getExpansionArtSprite("relay", "phase6"), null);
  assert.equal(images.length, ids.length + 1, "A failed Blender URL must not poison the separate rollback URL cache.");
  const rollback = images.at(-1);
  rollback.emit("load");
  await Promise.resolve();
  assert.equal(api.getExpansionArtSprite("relay", "phase6"), rollback);
  assert.equal(api.getExpansionArtSprite("relay", "blender-v2"), null);
  assert.equal(api.getExpansionArtSprite("relay", "glyphs"), null);
  assert.equal(images.length, ids.length + 1);
}

async function verifyReadyAndDecodePaths() {
  const { api, images, warnings } = await scenario("?art=unexpected");
  assert.equal(api.getExpansionArtMode(), "blender-v2", "Unknown art values must retain the default mode.");
  api.getExpansionArtSprite("turret", "blender-v2");
  const pending = images[0];
  let finishDecode;
  pending.decode = () => new Promise((resolve) => { finishDecode = resolve; });
  pending.emit("load");
  assert.equal(api.getExpansionArtSprite("turret", "blender-v2"), null, "A decoding image must retain a safe pending fallback.");
  finishDecode();
  await Promise.resolve();
  assert.equal(api.getExpansionArtSprite("turret", "blender-v2"), pending);
  assert.equal(api.getExpansionArtSprite("turret", "blender-v2"), pending, "Ready images must be reused from cache.");
  api.getExpansionArtSprite("relay", "blender-v2");
  const rejectedDecode = images[1];
  rejectedDecode.decode = () => Promise.reject(new Error("Decode rejected after load"));
  rejectedDecode.emit("load");
  await Promise.resolve();
  assert.equal(api.getExpansionArtSprite("relay", "blender-v2"), rejectedDecode, "A successfully loaded image remains usable after decode rejection.");
  api.getExpansionArtSprite("source", "blender-v2");
  const noDecode = images[2];
  noDecode.decode = undefined;
  noDecode.emit("load");
  assert.equal(api.getExpansionArtSprite("source", "blender-v2"), noDecode, "Browsers without Image.decode must still show loaded sprites.");
  assert.equal(images.length, 3, "Ready cache lookups must not issue duplicate requests.");
  assert.equal(warnings.length, 0);
}
