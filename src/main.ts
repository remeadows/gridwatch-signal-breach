import "./style.css";
import { LEVEL_CONFIG } from "./data/level";
import { installPointerInput } from "./input/pointer";
import { drawGrid } from "./render/renderer";
import { applyCommand, createGameState, tick } from "./sim";
import { createAudioEngine } from "./ui/audio";
import { renderHud } from "./ui/hud";
import { renderOverlay } from "./ui/overlays";
import { renderUnitPicker } from "./ui/unitPicker";
import type { PlayerTool } from "./sim";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
const hudRoot = document.querySelector<HTMLElement>("#hud-root");
const unitPickerRoot = document.querySelector<HTMLElement>("#unit-picker-root");
const overlayRoot = document.querySelector<HTMLElement>("#overlay-root");

if (!canvas || !hudRoot || !unitPickerRoot || !overlayRoot) {
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
const audio = createAudioEngine();
let state = createGameState();
let selectedTool: PlayerTool = "relay";
let lastTickTime = performance.now();

installPointerInput({
  canvas: gameCanvas,
  getState: () => state,
  getSelectedTool: () => selectedTool,
  dispatch: (command) => {
    state = applyCommand(state, command);
  },
});

function drawFrame(now: number): void {
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

  drawGrid(
    renderContext,
    {
      width: gameCanvas.width,
      height: gameCanvas.height,
    },
    state,
    {
      interpolationAlpha,
      flashAlpha: 1 - interpolationAlpha,
      shakeMagnitude: state.events.some((event) => event.type === "coreDamaged")
        ? 8 * (1 - interpolationAlpha)
        : 0,
    },
  );
  renderHud(hudContainer, state);
  renderUnitPicker({
    root: unitPickerContainer,
    state,
    selectedTool,
    onSelect: (tool) => {
      selectedTool = tool;
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
    },
    onRestart: () => {
      state = createGameState();
      selectedTool = "relay";
      lastTickTime = performance.now();
    },
  });

  requestAnimationFrame(drawFrame);
}

requestAnimationFrame(drawFrame);
