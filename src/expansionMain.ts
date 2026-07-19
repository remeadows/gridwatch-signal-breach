import "./expansion.css";
import { getExpansionLevelDefinition } from "./data/campaigns/expansion";
import { getExpansionLevelContentHash } from "./data/campaigns/expansion/contentManifest";
import { installExpansionKeyboardInput } from "./input/expansionKeyboard";
import { installExpansionPointerInput } from "./input/expansionPointer";
import { preloadPhase6BoardSprites } from "./render/assetRegistry";
import { preloadExpansionSprites } from "./render/expansionAssetRegistry";
import { drawExpansionGrid } from "./render/expansionRenderer";
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
let selectedTool: ExpansionPlayerTool = "latencyTrap";
let hover: GridPosition | null = null;
let keyboardFocus: GridPosition | null = null;
let running = false;
let paused = false;
let lastTime = performance.now();
let previousPhase = state.phase;
let clearRecorded = false;

document.documentElement.dataset.expansionPlay = "true";
document.documentElement.dataset.expansionLevel = String(levelId);
screen.hidden = true;
screen.setAttribute("aria-hidden", "true");
preloadPhase6BoardSprites();
preloadExpansionSprites();
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
  if (event.key === "Enter" && state.phase === "prep" && !running) { event.preventDefault(); launchWave(); }
  if ((event.key === "Escape" || event.key.toLowerCase() === "p") && running && (state.phase === "prep" || state.phase === "active")) paused = !paused;
});
document.addEventListener("visibilitychange", () => { if (document.hidden && running) paused = true; });

requestAnimationFrame(frame);

function frame(now: number): void {
  if (!paused && running && state.phase === "active") {
    let steps = 0;
    while (now - lastTime >= state.config.simulationTickMs && steps < 5 && state.phase === "active") {
      state = tickExpansion(state);
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
  drawExpansionGrid(renderContext, canvas, state, { hover, focus: keyboardFocus, selectedTool, buildMode: state.phase === "prep" && !running, timeMs: now });
  renderHud();
  renderPicker();
  renderPlayUi();
  renderOverlay();
  requestAnimationFrame(frame);
}

function dispatch(command: ExpansionSimCommand): void {
  state = applyExpansionCommand(state, command);
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
  selectedTool = "latencyTrap";
  hover = null;
  keyboardFocus = null;
  running = false;
  paused = false;
  clearRecorded = false;
  overlay.dataset.overlayKey = "";
}

function buildHud(): void {
  hud.className = "hud expansion-hud";
  hud.innerHTML = `<section class="hud-hero"><div class="hud-metric hud-metric-primary" data-metric="bandwidth"><span>Bandwidth</span><strong></strong></div><div class="hud-metric hud-metric-primary" data-metric="core"><span>Core</span><strong></strong></div></section><section class="hud-rail"><div class="hud-metric hud-metric-secondary" data-metric="level"><span>Level</span><strong></strong></div><div class="hud-metric hud-metric-secondary" data-metric="wave"><span>Wave</span><strong></strong></div><div class="hud-metric hud-metric-secondary" data-metric="phase"><span>Phase</span><strong></strong></div><div class="hud-metric hud-metric-secondary" data-metric="signal"><span>Signal</span><strong></strong></div><div class="hud-metric hud-metric-secondary" data-metric="intrusions"><span>Intrusions</span><strong></strong></div><div class="hud-metric hud-metric-secondary" data-metric="neutralized"><span>Neutralized</span><strong></strong></div><div class="hud-actions"><button class="neon-button neon-button-secondary" type="button" data-pause>PAUSE</button><button class="neon-button neon-button-secondary" type="button" data-exit>LEVEL SELECT</button></div></section>`;
  hud.querySelector("[data-pause]")?.addEventListener("click", () => { if (running) paused = !paused; });
  hud.querySelector("[data-exit]")?.addEventListener("click", openLevelSelect);
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
  if (target) target.textContent = value;
}

function buildPicker(): void {
  picker.className = "unit-picker expansion-picker";
  picker.innerHTML = "";
  const labels: Readonly<Record<ExpansionPlayerTool, readonly [string, string]>> = {
    relay: ["Relay", "Extend signal"], firewall: ["Firewall", "Block enemies"], turret: ["ICE", "Attack nearby"], scrubber: ["Scrubber", "Clean corruption"], overclock: ["Overclock", "Boost ICE"], latencyTrap: ["Latency Trap", "Delay 3 ticks · 3 charges"], sell: ["Sell", "Recover bandwidth"],
  };
  for (const tool of state.config.toolsUnlocked) {
    const button = document.createElement("button");
    button.type = "button"; button.dataset.tool = tool;
    const [label, purpose] = labels[tool];
    button.innerHTML = `<span class="expansion-tool-glyph">${tool === "latencyTrap" ? "⌁" : tool === "sell" ? "↓" : label.slice(0, 3).toUpperCase()}</span><span class="tool-name">${label}</span><span class="tool-purpose">${purpose}</span><span class="tool-cost" data-cost></span>`;
    button.addEventListener("click", () => { selectedTool = tool; });
    picker.append(button);
  }
}

function renderPicker(): void {
  for (const tool of state.config.toolsUnlocked) {
    const button = picker.querySelector<HTMLButtonElement>(`[data-tool="${tool}"]`);
    if (!button) continue;
    button.className = tool === selectedTool ? "tool-button selected" : "tool-button";
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
  readout.textContent = selectedTool === "latencyTrap" ? "LATENCY TRAP · WALK-THROUGH · 3 CHARGES · +3 MOVE DELAY · 10 BW" : `${selectedTool.toUpperCase()} · LOCAL CHAPTER 1 PLAYTEST`;
  playUi.append(readout);
}

function renderOverlay(): void {
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
  panel.innerHTML = `<h2 class="overlay-title">${state.phase === "won" ? "LEVEL CLEARED" : "DEADLINE MISSED"}</h2><strong class="operator-rating">${score.rating}</strong><p class="terminal-detail">${state.phase === "won" ? "Local progress saved. No score was submitted." : "Rebuild the route and layer more delay."}</p><dl class="score-breakdown"><dt>Core integrity</dt><dd>${score.integrity}</dd><dt>Neutralized</dt><dd>${state.neutralizedCount}</dd><dt>Signal uptime</dt><dd>${score.uptimePercent}%</dd><dt>Local score</dt><dd>${score.total}</dd></dl>`;
  const actions = document.createElement("div"); actions.className = "terminal-actions";
  if (state.phase === "won" && getExpansionLevelDefinition(levelId + 1)) actions.append(action("NEXT LEVEL ▸", () => openLevel(levelId + 1), true));
  actions.append(action("RETRY LEVEL", restart, true), action("LEVEL SELECT", openLevelSelect, false));
  panel.append(actions); overlay.innerHTML = ""; overlay.append(panel);
}

function action(label: string, onClick: () => void, primary: boolean): HTMLButtonElement {
  const button = document.createElement("button"); button.type = "button"; button.className = `neon-button neon-button-${primary ? "primary" : "secondary"}`; button.textContent = label; button.addEventListener("click", onClick); return button;
}

function openLevel(levelToOpen: number): void {
  const url = new URL(window.location.href); url.search = ""; url.searchParams.set("expansion-play", "1"); url.searchParams.set("level", String(levelToOpen)); window.location.assign(url.toString());
}

function openLevelSelect(): void {
  const url = new URL(window.location.href); url.search = ""; url.searchParams.set("expansion-nav", "1"); window.location.assign(url.toString());
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
