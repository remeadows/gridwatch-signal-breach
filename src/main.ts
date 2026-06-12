import "./style.css";
import { SECTORS } from "./data/levels";
import { installPointerInput } from "./input/pointer";
import { drawAmbientBackdrop, drawGrid } from "./render/renderer";
import { applyCommand, createGameState, tick } from "./sim";
import { createAudioEngine } from "./ui/audio";
import { renderHud } from "./ui/hud";
import { renderOverlay } from "./ui/overlays";
import {
  hasSeenBriefing,
  loadCampaignProgress,
  markSectorCleared,
  renderScreens,
  type AppScreen,
  type CampaignProgress,
} from "./ui/screens";
import { renderUnitPicker } from "./ui/unitPicker";
import type { GamePhase, GridPosition, PlayerTool } from "./sim";

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
const MAX_SECTOR_ID = SECTORS.length;

function makeRunSeed(): string {
  const fixed = new URLSearchParams(window.location.search).get("seed");
  return fixed ?? `run-${Date.now().toString(36)}-${Math.floor(performance.now()).toString(36)}`;
}

function createRunState(): ReturnType<typeof createGameState> {
  // ?seed= pins balance/debug runs; normal page loads, restarts, and sector starts reroll.
  return createGameState({ seed: makeRunSeed(), sector: currentSector });
}

let progress: CampaignProgress = loadCampaignProgress();
let currentSector = getInitialSector(progress);
let state = createRunState();
let selectedTool: PlayerTool = getDefaultTool(state);
let screen: AppScreen = "title";
let briefingReturn: AppScreen = "sectorSelect";
let hoverTile: GridPosition | null = null;
let lastTickTime = performance.now();
let previousPhase: GamePhase = state.phase;

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

function enterPlaying(playStartAudio = true): void {
  screen = "playing";
  lastTickTime = performance.now();
  previousPhase = state.phase;

  if (playStartAudio) {
    audio.playUi("start");
  }
}

function startSector(sectorId: number): void {
  currentSector = clampSector(sectorId, progress.highestUnlockedSector);
  state = createRunState();
  selectedTool = getDefaultTool(state);
  hoverTile = null;
  enterPlaying();
}

function retrySector(): void {
  state = createRunState();
  selectedTool = getDefaultTool(state);
  hoverTile = null;
  enterPlaying();
}

function openSectorSelect(): void {
  screen = "sectorSelect";
  hoverTile = null;
  audio.playUi("select");
}

function returnToTitle(): void {
  screen = "title";
  hoverTile = null;
  audio.playUi("select");
}

function showBriefing(returnScreen: AppScreen): void {
  briefingReturn = returnScreen;
  screen = "briefing";
  hoverTile = null;
  audio.playUi("select");
}

function completeBriefing(): void {
  if (briefingReturn === "playing") {
    enterPlaying(false);
    return;
  }

  screen = briefingReturn;
  audio.playUi("select");
}

function drawFrame(now: number): void {
  const canvasSize = {
    width: gameCanvas.width,
    height: gameCanvas.height,
  };

  if (screen === "playing") {
    const tickMs = state.config.simulationTickMs;

    while (
      state.phase !== "won" &&
      state.phase !== "lost" &&
      now - lastTickTime >= tickMs
    ) {
      state = tick(state);

      if (previousPhase !== "won" && state.phase === "won") {
        progress = markSectorCleared(currentSector);
      }

      previousPhase = state.phase;
      audio.playEvents(state.events);
      lastTickTime += tickMs;
    }

    const interpolationAlpha = Math.min(
      1,
      Math.max(0, (now - lastTickTime) / tickMs),
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
    renderHud(hudContainer, state, {
      sectorName: state.config.sectorName,
      onShowBriefing: () => showBriefing("playing"),
    });
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
      onRestart: retrySector,
      onReturnToTitle: returnToTitle,
      onSectorSelect: openSectorSelect,
      onNextSector: getNextSectorHandler(),
    });
  } else {
    if (screen === "briefing" && briefingReturn === "playing") {
      drawGrid(renderContext, canvasSize, state, {
        interpolationAlpha: 1,
        flashAlpha: 0,
        shakeMagnitude: 0,
        timeMs: now,
        hover: null,
        selectedTool,
      });
    } else {
      drawAmbientBackdrop(renderContext, canvasSize, now);
    }

    hoverTile = null;
    hudContainer.hidden = true;
    unitPickerContainer.hidden = true;
    overlayContainer.hidden = true;
  }

  renderScreens({
    root: screenContainer,
    screen,
    progress,
    briefingMaxSector: progress.highestUnlockedSector,
    briefingFromPlay: screen === "briefing" && briefingReturn === "playing",
    onStart: () => {
      if (hasSeenBriefing()) {
        openSectorSelect();
        return;
      }

      showBriefing("sectorSelect");
    },
    onBriefingComplete: completeBriefing,
    onShowBriefing: () => showBriefing("sectorSelect"),
    onSelectSector: startSector,
    onBackToTitle: returnToTitle,
  });

  requestAnimationFrame(drawFrame);
}

requestAnimationFrame(drawFrame);

function getInitialSector(currentProgress: CampaignProgress): number {
  const requested = Number.parseInt(
    new URLSearchParams(window.location.search).get("sector") ?? "",
    10,
  );

  return Number.isFinite(requested)
    ? clampSector(requested, currentProgress.highestUnlockedSector)
    : 1;
}

function getNextSectorHandler(): (() => void) | null {
  if (state.phase !== "won") {
    return null;
  }

  const nextSector = currentSector + 1;

  if (nextSector > MAX_SECTOR_ID || nextSector > progress.highestUnlockedSector) {
    return null;
  }

  return () => startSector(nextSector);
}

function getDefaultTool(runState: ReturnType<typeof createGameState>): PlayerTool {
  return runState.config.toolsUnlocked.find((tool) => tool !== "sell") ?? "relay";
}

function clampSector(sectorId: number, maxUnlocked: number): number {
  return Math.min(
    MAX_SECTOR_ID,
    Math.max(1, Math.min(maxUnlocked, Math.floor(sectorId))),
  );
}
