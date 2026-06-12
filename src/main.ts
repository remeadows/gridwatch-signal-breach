import "./style.css";
import { LEVEL_CONFIG } from "./data/level";
import { installPointerInput } from "./input/pointer";
import { drawAmbientBackdrop, drawGrid } from "./render/renderer";
import { applyCommand, createGameState, tick } from "./sim";
import { createAudioEngine } from "./ui/audio";
import { renderHud } from "./ui/hud";
import { renderOverlay } from "./ui/overlays";
import { hasSeenBriefing, renderScreens, type AppScreen } from "./ui/screens";
import { renderUnitPicker } from "./ui/unitPicker";
import type { GridPosition, PlayerTool } from "./sim";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
const hudRoot = document.querySelector<HTMLElement>("#hud-root");
const unitPickerRoot = document.querySelector<HTMLElement>("#unit-picker-root");
const overlayRoot = document.querySelector<HTMLElement>("#overlay-root");
const screenRoot = document.querySelector<HTMLElement>("#screen-root");

if (!canvas || !hudRoot || !unitPickerRoot || !overlayRoot || !screenRoot) {
  throw new Error("Game shell elements not found.");
}

const context = canvas.getContext("2d");

if (!context) {
  throw new Error("Canvas2D context is not available.");
}

const gameCanvas = canvas;
const renderContext = context;
const hudContainer = hudRoot;
const unitPickerContainer = unitPickerRoot;
const overlayContainer = overlayRoot;
const screenContainer = screenRoot;
const audio = createAudioEngine();

function makeRunSeed(): string {
  const fixed = new URLSearchParams(window.location.search).get("seed");
  return fixed ?? `run-${Date.now().toString(36)}-${Math.floor(performance.now()).toString(36)}`;
}

function createRunState(): ReturnType<typeof createGameState> {
  // ?seed= pins balance/debug runs; normal page loads and restarts reroll.
  return createGameState({ seed: makeRunSeed() });
}

let state = createRunState();
let selectedTool: PlayerTool = "relay";
let screen: AppScreen = "title";
let hoverTile: GridPosition | null = null;
let lastTickTime = performance.now();

installPointerInput({
  canvas: gameCanvas,
  getState: () => state,
  getSelectedTool: () => selectedTool,
  isEnabled: () => screen === "playing",
  onHover: (position) => {
    hoverTile = position;
  },
  dispatch: (command) => {
    state = applyCommand(state, command);
  },
});

function enterPlaying(): void {
  screen = "playing";
  lastTickTime = performance.now();
  audio.playUi("start");
}

function drawFrame(now: number): void {
  const canvasSize = {
    width: gameCanvas.width,
    height: gameCanvas.height,
  };

  if (screen === "playing") {
    while (
      state.phase !== "won" &&
      state.phase !== "lost" &&
      now - lastTickTime >= LEVEL_CONFIG.simulationTickMs
    ) {
      state = tick(state);
      audio.playEvents(state.events);
      lastTickTime += LEVEL_CONFIG.simulationTickMs;
    }

    const interpolationAlpha = Math.min(
      1,
      Math.max(0, (now - lastTickTime) / LEVEL_CONFIG.simulationTickMs),
    );

    drawGrid(renderContext, canvasSize, state, {
      interpolationAlpha,
      flashAlpha: 1 - interpolationAlpha,
      shakeMagnitude: state.events.some(
        (event) => event.type === "coreDamaged" || event.type === "coreBreach",
      )
        ? 8 * (1 - interpolationAlpha)
        : 0,
      timeMs: now,
      hover: hoverTile,
      selectedTool,
    });
    hudContainer.hidden = false;
    unitPickerContainer.hidden = false;
    renderHud(hudContainer, state);
    renderUnitPicker({
      root: unitPickerContainer,
      state,
      selectedTool,
      onSelect: (tool) => {
        selectedTool = tool;
        audio.playUi("select");
      },
    });
    renderOverlay({
      root: overlayContainer,
      state,
      onSkipPrep: () => {
        state = applyCommand(state, {
          type: "skipPrep",
        });
        lastTickTime = performance.now();
        audio.playUi("start");
      },
      onRestart: () => {
        state = createRunState();
        selectedTool = "relay";
        hoverTile = null;
        lastTickTime = performance.now();
        audio.playUi("start");
      },
    });
  } else {
    drawAmbientBackdrop(renderContext, canvasSize, now);
    hoverTile = null;
    hudContainer.hidden = true;
    unitPickerContainer.hidden = true;
    overlayContainer.hidden = true;
  }

  renderScreens({
    root: screenContainer,
    screen,
    onStart: () => {
      if (hasSeenBriefing()) {
        enterPlaying();
        return;
      }

      screen = "briefing";
    },
    onBriefingComplete: enterPlaying,
    onShowBriefing: () => {
      screen = "briefing";
    },
  });

  requestAnimationFrame(drawFrame);
}

requestAnimationFrame(drawFrame);
