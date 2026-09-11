import "./expansion.css";
import { getExpansionLevelDefinition } from "./data/campaigns/expansion";
import { getExpansionLevelContentHash } from "./data/campaigns/expansion/contentManifest";
import { installExpansionKeyboardInput } from "./input/expansionKeyboard";
import { installExpansionPointerInput } from "./input/expansionPointer";
import { getExpansionArtMode, getExpansionArtUrl, preloadExpansionLevelArt } from "./render/expansionBlenderRegistry";
import { getExpansionLevelArtRoster, type ExpansionVisualAssetId } from "./render/expansionArtCatalog";
import { drawExpansionGrid } from "./render/expansionRenderer";
import { ExpansionVisualTimeline } from "./render/expansionVisualTimeline";
import { applyExpansionCommand, calculateExpansionScore, createExpansionGameState, tickExpansion, type ExpansionPlayerTool, type ExpansionSimCommand } from "./sim/expansion";
import { getCurrentExpansionWave } from "./sim/expansion/waves";
import type { GridPosition } from "./sim/types";
import { loadGameProgress, markExpansionLevelCleared } from "./ui/progress";

const canvas = required<HTMLCanvasElement>("#game-canvas");
const context = canvas.getContext("2d");
if (!context) throw new Error("Canvas2D context is not available.");
const renderContext = context;
const hud = required<HTMLElement>("#hud-root");
const picker = required<HTMLElement>("#unit-picker-root");
const overlay = required<HTMLElement>("#overlay-root");
const playUi = required<HTMLElement>("#play-ui-root");
const screen = required<HTMLElement>("#screen-root");

const levelId = getRequestedLevelId();
const level = getRequiredLevel(levelId);
const contentHash = getExpansionLevelContentHash(levelId);
let seed = createSeed();
let state = createExpansionGameState({ levelId, contentHash, seed });
let selectedTool: ExpansionPlayerTool = defaultTool();
const artMode = getExpansionArtMode();
let hover: GridPosition | null = null;
let keyboardFocus: GridPosition | null = null;
let running = false;
let paused = false;
let lastTime = performance.now();
let previousPhase = state.phase;
let clearRecorded = false;
let lowQuality = new URLSearchParams(window.location.search).get("quality") === "low";
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = reducedMotionQuery.matches;
const visualTimeline = new ExpansionVisualTimeline();
let guideOpen = false;
let pausedBeforeGuide = false;
let guideReturnFocus: HTMLElement | null = null;
let pickerKey = "";
const toolStatus = document.createElement("p");
toolStatus.id = "expansion-tool-status";
toolStatus.className = "expansion-sr-only";
toolStatus.setAttribute("role", "status");
toolStatus.setAttribute("aria-live", "polite");
picker.after(toolStatus);
canvas.setAttribute("aria-describedby", toolStatus.id);
reducedMotionQuery.addEventListener("change", (event) => { reducedMotion = event.matches; });

document.documentElement.dataset.expansionPlay = "true";
document.documentElement.dataset.expansionLevel = String(levelId);
document.documentElement.dataset.artMode = artMode;
screen.hidden = true;
screen.setAttribute("aria-hidden", "true");
preloadExpansionLevelArt(level, artMode);
buildHud();
buildPicker();

installExpansionPointerInput({
  canvas,
  getState: () => state,
  getSelectedTool: () => selectedTool,
  isEnabled: () => !paused && (state.phase === "prep" || state.phase === "active"),
  onHover: (position) => { hover = position; },
  dispatch,
});
installExpansionKeyboardInput({
  canvas,
  getState: () => state,
  getSelectedTool: () => selectedTool,
  isEnabled: () => !paused && (state.phase === "prep" || state.phase === "active"),
  onFocus: (position) => { keyboardFocus = position; },
  dispatch,
});

window.addEventListener("keydown", (event) => {
  if (guideOpen) {
    if (event.key === "Escape") { event.preventDefault(); closeGuide(); }
    if (event.key === "Tab") { event.preventDefault(); overlay.querySelector<HTMLButtonElement>("[data-close-guide]")?.focus(); }
    return;
  }
  if (event.target instanceof HTMLButtonElement) return;
  if (event.key === "Enter" && state.phase === "prep" && !running) { event.preventDefault(); launchWave(); }
  if ((event.key === "Escape" || event.key.toLowerCase() === "p") && running && (state.phase === "prep" || state.phase === "active")) paused = !paused;
});
document.addEventListener("visibilitychange", () => { if (document.hidden && running) paused = true; });

requestAnimationFrame(frame);

function frame(now: number): void {
  visualTimeline.advance(now, paused);
  if (!paused && running && state.phase === "active") {
    let steps = 0;
    while (now - lastTime >= state.config.simulationTickMs && steps < 5 && state.phase === "active") {
      state = tickExpansion(state);
      visualTimeline.observe(state);
      lastTime += state.config.simulationTickMs;
      steps += 1;
    }
  } else {
    lastTime = now;
  }

  if (previousPhase === "active" && state.phase === "prep") running = false;
  if (state.phase === "won" && !clearRecorded) {
    // The immutable updater persists through its default browser-storage
    // argument; the reload-driven level-select flow reads that stored result.
    markExpansionLevelCleared(loadGameProgress(), levelId);
    clearRecorded = true;
  }
  previousPhase = state.phase;
  drawExpansionGrid(renderContext, canvas, state, {
    ...visualTimeline.snapshot(state, reducedMotion),
    hover, focus: keyboardFocus, selectedTool,
    buildMode: state.phase === "prep" && !running,
    reducedMotion, lowQuality, artMode,
  });
  renderHud();
  renderPicker();
  renderPlayUi();
  renderOverlay();
  requestAnimationFrame(frame);
}

function dispatch(command: ExpansionSimCommand): void {
  const previous = state;
  state = applyExpansionCommand(state, command);
  if (command.type !== "skipPrep") {
    const cell = `column ${command.position.x + 1}, row ${command.position.y + 1}`;
    toolStatus.textContent = state === previous
      ? `Cannot ${command.type === "sellUnit" ? "sell" : "build"} at ${cell}. Check the tile and available bandwidth.`
      : `${command.type === "sellUnit" ? "Unit sold" : "Unit placed"} at ${cell}. ${state.bandwidth} bandwidth remaining.`;
  }
}

function launchWave(): void {
  if (state.phase !== "prep" || running) return;
  dispatch({ type: "skipPrep" });
  running = true;
  paused = false;
  lastTime = performance.now();
}

function restart(): void {
  seed = createSeed();
  state = createExpansionGameState({ levelId, contentHash, seed });
  selectedTool = defaultTool();
  hover = null;
  keyboardFocus = null;
  running = false;
  paused = false;
  clearRecorded = false;
  guideOpen = false;
  previousPhase = state.phase;
  lastTime = performance.now();
  visualTimeline.reset(lastTime);
  pickerKey = "";
  toolStatus.textContent = "Level restarted. Select a tool and build your route.";
  playUi.dataset.playUiKey = "";
  overlay.dataset.overlayKey = "";
}

function buildHud(): void {
  hud.className = "hud expansion-hud";
  hud.innerHTML = `<section class="hud-hero"><div class="hud-metric hud-metric-primary" data-metric="bandwidth"><span>Bandwidth</span><strong></strong></div><div class="hud-metric hud-metric-primary" data-metric="core"><span>Core</span><strong></strong></div></section><section class="hud-rail"><div class="hud-metric hud-metric-secondary" data-metric="level"><span>Level</span><strong></strong></div><div class="hud-metric hud-metric-secondary" data-metric="wave"><span>Wave</span><strong></strong></div><div class="hud-metric hud-metric-secondary" data-metric="phase"><span>Phase</span><strong></strong></div><div class="hud-metric hud-metric-secondary" data-metric="signal"><span>Signal</span><strong></strong></div><div class="hud-metric hud-metric-secondary" data-metric="intrusions"><span>Intrusions</span><strong></strong></div><div class="hud-metric hud-metric-secondary" data-metric="neutralized"><span>Neutralized</span><strong></strong></div><div class="hud-actions"><button class="neon-button neon-button-secondary" type="button" data-pause>PAUSE</button><button class="neon-button neon-button-secondary" type="button" data-guide>FIELD GUIDE</button><button class="neon-button neon-button-secondary" type="button" data-quality aria-pressed="${lowQuality}">LOW EFFECTS</button><button class="neon-button neon-button-secondary" type="button" data-exit>LEVEL SELECT</button></div></section>`;
  hud.querySelector("[data-pause]")?.addEventListener("click", () => { if (running) paused = !paused; });
  hud.querySelector("[data-exit]")?.addEventListener("click", openLevelSelect);
  hud.querySelector("[data-guide]")?.addEventListener("click", openGuide);
  hud.querySelector("[data-quality]")?.addEventListener("click", () => {
    lowQuality = !lowQuality;
    hud.querySelector("[data-quality]")?.setAttribute("aria-pressed", String(lowQuality));
    toolStatus.textContent = lowQuality ? "Low effects enabled. All tactical indicators remain visible." : "Full effects enabled.";
  });
}

function renderHud(): void {
  const wave = getCurrentExpansionWave(state);
  setMetric("bandwidth", String(state.bandwidth));
  setMetric("core", String(state.coreIntegrity));
  setMetric("level", `L${String(levelId).padStart(2, "0")} · ${level.codename.split(" ")[0]}`);
  setMetric("wave", `W${state.waveIndex + 1}/5 · ${wave.label.split(" ")[0]}`);
  setMetric("phase", paused ? "PAUSED" : state.phase === "prep" ? "BUILD" : state.phase.toUpperCase());
  setMetric("signal", state.signal.status.toUpperCase());
  setMetric("intrusions", String(state.intrusions.length));
  setMetric("neutralized", String(state.neutralizedCount));
  const pause = hud.querySelector<HTMLButtonElement>("[data-pause]");
  if (pause) { pause.hidden = !running || state.phase === "won" || state.phase === "lost"; pause.textContent = paused ? "RESUME" : "PAUSE"; }
}

function setMetric(key: string, value: string): void {
  const target = hud.querySelector<HTMLElement>(`[data-metric="${key}"] strong`);
  if (target && target.textContent !== value) target.textContent = value;
}

function buildPicker(): void {
  picker.className = "unit-picker expansion-picker";
  picker.dataset.toolCount = String(state.config.toolsUnlocked.length);
  picker.setAttribute("role", "group");
  picker.setAttribute("aria-label", "Build tools");
  picker.innerHTML = "";
  const labels: Readonly<Record<ExpansionPlayerTool, readonly [string, string]>> = {
    relay: ["Relay", "Extend signal"], firewall: ["Firewall", "Block enemies"], turret: ["ICE", "Attack nearby"], arcIce: ["Arc ICE", "Break shields · chain 3"], scrubber: ["Scrubber", "Clean corruption"], overclock: ["Overclock", "Boost ICE"], latencyTrap: ["Latency Trap", "Delay 3 ticks · 3 charges"], sell: ["Sell", "Recover bandwidth"],
  };
  for (const tool of state.config.toolsUnlocked) {
    const button = document.createElement("button");
    button.type = "button"; button.dataset.tool = tool;
    const [label, purpose] = labels[tool];
    button.innerHTML = `<span class="expansion-tool-glyph" aria-hidden="true">${tool === "latencyTrap" ? "⌁" : tool === "sell" ? "↓" : label.slice(0, 3).toUpperCase()}</span><span class="tool-name">${label}</span><span class="tool-purpose">${purpose}</span><span class="tool-cost" data-cost></span>`;
    if (tool !== "sell") button.querySelector(".expansion-tool-glyph")?.replaceWith(createArtBadge(tool, label));
    button.setAttribute("aria-pressed", String(tool === selectedTool));
    button.addEventListener("click", () => {
      selectedTool = tool;
      toolStatus.textContent = `${label} selected. ${purpose}. ${tool === "sell" ? "Select a placed unit to sell it." : `Costs ${state.config.units[tool].cost} bandwidth. Select an available tile.`}`;
    });
    picker.append(button);
  }
}

function renderPicker(): void {
  const nextKey = `${selectedTool}-${state.bandwidth}-${state.phase}`;
  if (pickerKey === nextKey) return;
  pickerKey = nextKey;
  for (const tool of state.config.toolsUnlocked) {
    const button = picker.querySelector<HTMLButtonElement>(`[data-tool="${tool}"]`);
    if (!button) continue;
    button.className = tool === selectedTool ? "tool-button selected" : "tool-button";
    button.setAttribute("aria-pressed", String(tool === selectedTool));
    const cost = button.querySelector<HTMLElement>("[data-cost]");
    if (tool === "sell") { button.disabled = false; if (cost) cost.textContent = state.phase === "prep" ? "FULL" : "PART"; }
    else { const amount = state.config.units[tool].cost; button.disabled = state.bandwidth < amount; if (cost) cost.textContent = `${amount} BW`; }
  }
}

function renderPlayUi(): void {
  if (paused || state.phase === "won" || state.phase === "lost") { playUi.hidden = true; return; }
  playUi.hidden = false;
  playUi.className = "play-ui";
  const wave = getCurrentExpansionWave(state);
  const key = `${state.waveIndex}-${state.phase}-${running}-${selectedTool}`;
  if (playUi.dataset.playUiKey === key) return;
  playUi.dataset.playUiKey = key;
  playUi.innerHTML = "";
  if (state.phase === "prep" && !running) {
    const bar = document.createElement("section");
    bar.className = "build-bar";
    bar.innerHTML = `<div class="build-intel"><strong>BUILD · L${levelId} W${state.waveIndex + 1} · +${wave.bandwidthGrant} BW</strong><span>${wave.briefing} · ${wave.maxSpawnedIntrusions} intrusions</span></div>`;
    const launch = document.createElement("button"); launch.type = "button"; launch.className = "neon-button neon-button-primary build-launch"; launch.textContent = `LAUNCH W${state.waveIndex + 1} ▸`; launch.addEventListener("click", launchWave); bar.append(launch); playUi.append(bar);
  }
  const readout = document.createElement("div");
  readout.className = "tool-readout";
  readout.textContent = selectedTool === "arcIce"
    ? "ARC ICE · RANGE 3 · CHAIN UP TO 3 · 3/2/1 DAMAGE · IGNORES SHIELDS"
    : selectedTool === "latencyTrap"
    ? "LATENCY TRAP · WALK-THROUGH · 3 CHARGES · +3 MOVE DELAY · 10 BW"
    : level.requiredMechanic === "sapperSpacing"
      ? `${selectedTool.toUpperCase()} · SAPPER PRIORITIZES REACHABLE FIREWALLS · PULSE: UP TO 4 ORTHOGONAL TILES`
      : level.requiredMechanic === "shieldNetwork"
        ? `${selectedTool.toUpperCase()} · SHIELD LINKS REDUCE NORMAL ICE DAMAGE · ARC ICE PRIORITIZES DRONES`
        : `${selectedTool.toUpperCase()} · KEEP SOURCE CONNECTED TO CORE · CLEAR ALL FIVE WAVES`;
  playUi.append(readout);
}

function renderOverlay(): void {
  if (guideOpen) {
    overlay.hidden = false;
    if (overlay.dataset.overlayKey !== "guide") {
      overlay.dataset.overlayKey = "guide";
      overlay.innerHTML = `<div class="overlay-cover"><section class="overlay-panel expansion-guide" role="dialog" aria-modal="true" aria-labelledby="expansion-guide-title"><h2 id="expansion-guide-title" class="overlay-title">Field guide</h2><p>Connect Source to Core through Relays and Firewalls. Spend bandwidth to build, then launch each of the five waves. ICE fires automatically within ${state.config.turretRange} tiles.</p><p>Latency Traps delay enemies that step onto them. Each trap has three charges. Keep ICE close enough to cover the delayed enemies.</p>${getExpansionLevelArtRoster(level).includes("sapper") ? "<p><strong>Sapper:</strong> prioritizes reachable Firewalls, then other reachable hardware, then Core. Its dashed line marks its current target. On destruction, its pulse damages hardware in up to four orthogonal neighboring tiles; diagonals are safe. Keep important units out of that cross.</p>" : ""}${level.requiredMechanic === "shieldNetwork" ? "<p><strong>Shield Drone:</strong> blue links protect nearby enemies within two tiles, reducing each normal ICE hit by two damage (minimum one). Drones do not protect themselves or other drones. Eliminate the drone to remove its links.</p><p><strong>Arc ICE:</strong> seeks a Shield Drone within three tiles first, then chains to up to two more enemies within two tiles per jump. Hits deal 3, 2, then 1 damage and ignore shields. Normal ICE remains stronger against an isolated target. Hover or focus a tile to see placement range.</p>" : ""}<p>Build phases have no timer. You can also build during combat. Build-phase sales give a full refund; combat sales return part of the cost.</p><div class="expansion-guide-roster" data-guide-roster aria-label="Units and enemies in this level"></div><button class="neon-button neon-button-primary" type="button" data-close-guide>BACK TO GAME</button></section></div>`;
      const roster = overlay.querySelector<HTMLElement>("[data-guide-roster]");
      for (const id of getExpansionLevelArtRoster(level).filter((id) => !id.startsWith("floor"))) {
        const figure = document.createElement("figure");
        const label = assetLabel(id);
        const caption = document.createElement("figcaption");
        caption.textContent = label;
        figure.append(createArtBadge(id, label), caption);
        roster?.append(figure);
      }
      const close = overlay.querySelector<HTMLButtonElement>("[data-close-guide]");
      close?.addEventListener("click", closeGuide);
      close?.focus();
    }
    return;
  }
  if (paused) {
    overlay.hidden = false;
    if (overlay.dataset.overlayKey !== "paused") {
      overlay.dataset.overlayKey = "paused";
      overlay.innerHTML = `<div class="overlay-cover"><section class="overlay-panel pause-panel"><h2 class="overlay-title">Paused</h2><p>Expansion clock frozen.</p><button class="neon-button neon-button-primary" type="button" data-resume>▸ RESUME</button></section></div>`;
      overlay.querySelector("[data-resume]")?.addEventListener("click", () => { paused = false; });
    }
    return;
  }
  if (state.phase === "prep" || state.phase === "active") { overlay.hidden = true; overlay.dataset.overlayKey = state.phase; return; }
  overlay.hidden = false;
  if (overlay.dataset.overlayKey === state.phase) return;
  overlay.dataset.overlayKey = state.phase;
  const score = calculateExpansionScore(state);
  const panel = document.createElement("section");
  panel.className = "overlay-panel terminal-panel";
  panel.innerHTML = `<h2 class="overlay-title">${state.phase === "won" ? "LEVEL CLEARED" : "CORE LOST"}</h2><strong class="operator-rating">${score.rating}</strong><p class="terminal-detail">${state.phase === "won" ? "Progress saved on this browser." : level.requiredMechanic === "sapperSpacing" ? "Keep key hardware spaced apart and cover the Sapper approach with ICE." : "Reconnect the route and cover enemy approaches with ICE and delay."}</p><dl class="score-breakdown"><dt>Core integrity</dt><dd>${score.integrity}</dd><dt>Neutralized</dt><dd>${state.neutralizedCount}</dd><dt>Signal uptime</dt><dd>${score.uptimePercent}%</dd><dt>Local score</dt><dd>${score.total}</dd></dl>`;
  const actions = document.createElement("div"); actions.className = "terminal-actions";
  if (state.phase === "won" && getExpansionLevelDefinition(levelId + 1)) actions.append(action("NEXT LEVEL ▸", () => openLevel(levelId + 1), true));
  actions.append(action("RETRY LEVEL", restart, true), action("LEVEL SELECT", openLevelSelect, false));
  panel.append(actions); overlay.innerHTML = ""; overlay.append(panel);
}

function openGuide(): void {
  pausedBeforeGuide = paused;
  guideReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  guideOpen = true;
  paused = true;
}

function closeGuide(): void {
  guideOpen = false;
  paused = pausedBeforeGuide;
  overlay.dataset.overlayKey = "";
  guideReturnFocus?.focus();
}

function action(label: string, onClick: () => void, primary: boolean): HTMLButtonElement {
  const button = document.createElement("button"); button.type = "button"; button.className = `neon-button neon-button-${primary ? "primary" : "secondary"}`; button.textContent = label; button.addEventListener("click", onClick); return button;
}

function openLevel(levelToOpen: number): void {
  const url = navigationUrl(); url.searchParams.set("expansion-play", "1"); url.searchParams.set("level", String(levelToOpen)); window.location.assign(url.toString());
}

function openLevelSelect(): void {
  const url = navigationUrl(); url.searchParams.set("expansion-nav", "1"); url.searchParams.set("chapter", String(level.chapterId)); window.location.assign(url.toString());
}

function navigationUrl(): URL {
  const url = new URL(window.location.href);
  url.search = "";
  if (artMode !== "blender-v2") url.searchParams.set("art", artMode);
  if (lowQuality) url.searchParams.set("quality", "low");
  return url;
}

function defaultTool(): ExpansionPlayerTool {
  return level.requiredMechanic === "shieldNetwork" ? "arcIce" : level.requiredMechanic === "sapperSpacing" ? "firewall" : "latencyTrap";
}

function createArtBadge(id: ExpansionVisualAssetId, label: string): HTMLSpanElement {
  const badge = document.createElement("span");
  badge.className = "expansion-tool-glyph";
  badge.setAttribute("aria-hidden", "true");
  const fallback = document.createElement("span");
  fallback.textContent = label.slice(0, 3).toUpperCase();
  badge.append(fallback);
  const url = getExpansionArtUrl(id, artMode);
  if (url) {
    const image = document.createElement("img");
    image.alt = "";
    image.width = 64;
    image.height = 64;
    image.decoding = "async";
    image.hidden = true;
    image.addEventListener("load", () => { image.hidden = false; fallback.hidden = true; }, { once: true });
    image.addEventListener("error", () => { image.hidden = true; fallback.hidden = false; }, { once: true });
    image.src = url;
    badge.append(image);
  }
  return badge;
}

function assetLabel(id: ExpansionVisualAssetId): string {
  if (id === "turret") return "ICE";
  if (id === "arcIce") return "Arc ICE";
  if (id === "shieldDrone") return "Shield Drone";
  if (id === "latencyTrap") return "Latency Trap";
  return id[0]!.toUpperCase() + id.slice(1);
}

function getRequestedLevelId(): number {
  const requested = Number.parseInt(new URLSearchParams(window.location.search).get("level") ?? "1", 10);
  return Number.isInteger(requested) && getExpansionLevelDefinition(requested) ? requested : 1;
}

function createSeed(): string {
  const fixed = new URLSearchParams(window.location.search).get("seed");
  return fixed ?? `expansion-local-${levelId}-${Date.now().toString(36)}`;
}

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector); if (!element) throw new Error(`Missing ${selector}.`); return element;
}

function getRequiredLevel(id: number) {
  const definition = getExpansionLevelDefinition(id);
  if (!definition) throw new Error(`Expansion Level ${id} is not authored.`);
  return definition;
}
