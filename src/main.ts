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
import { leaderboardConfig } from "./leaderboard/config";
import { submitScore } from "./leaderboard/api";
import { accessToken, accountState, initAccount, onAccountChange } from "./leaderboard/account";
import { savePendingRun, takePendingRun } from "./leaderboard/pendingRun";
import type { GamePhase, GridPosition, PlayerTool, RecordedCommand, SimCommand } from "./sim";

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
  // Capture the exact seed and reset the command log so the run can be replayed
  // (and its score re-validated) server-side on submission.
  currentSeed = makeRunSeed();
  recordedCommands = [];
  return createGameState({ seed: currentSeed, sector: currentSector });
}

// Records every command with the tickCount at which it was applied, then applies
// it. The (tick, command) log + seed fully reproduces the run for the server-side
// anti-cheat replay. Routing all commands through here keeps the log authoritative.
function dispatch(command: SimCommand): void {
  recordedCommands.push({ t: state.tickCount, c: command });
  state = applyCommand(state, command);
}

let progress: CampaignProgress = loadCampaignProgress();
let currentSector = getInitialSector(progress);
let currentSeed = "";
let recordedCommands: RecordedCommand[] = [];
let state = createRunState();
let selectedTool: PlayerTool = getDefaultTool(state);
let screen: AppScreen = "title";
let briefingReturn: AppScreen = "sectorSelect";
let leaderboardReturn: AppScreen = "title";
let hoverTile: GridPosition | null = null;
let lastTickTime = performance.now();
let previousPhase: GamePhase = state.phase;
// UI-only clock gates (no effect on the deterministic sim or the recorded
// command log): the sim ticks on wall-clock only while a run has been started
// and isn't paused.
let runStarted = false;
let paused = false;
// Banner shown on the leaderboard after a run is auto-submitted post-sign-in.
let leaderboardNotice: string | null = null;
let pendingRunHandled = false;

installPointerInput({
  canvas: gameCanvas,
  getState: () => state,
  getSelectedTool: () => selectedTool,
  isEnabled: () => screen === "playing" && runStarted && !paused,
  onHover: (position) => {
    hoverTile = position;
  },
  dispatch: (command) => {
    dispatch(command);
  },
});

// Keyboard pause toggle. Escape / P mirror the HUD pause button during a live
// match. (Space is intentionally excluded — it activates focused buttons and
// scrolls the page.)
window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" && event.key !== "p" && event.key !== "P") {
    return;
  }
  if (screen !== "playing" || !runStarted) {
    return;
  }
  if (paused) {
    resumeMatch();
  } else {
    pauseMatch();
  }
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
  armRun();
  enterPlaying();
}

function retrySector(): void {
  state = createRunState();
  selectedTool = getDefaultTool(state);
  hoverTile = null;
  armRun();
  enterPlaying();
}

// Resets the clock gates for a fresh run: the prep timer stays frozen behind
// the START cover until the player explicitly begins.
function armRun(): void {
  runStarted = false;
  paused = false;
}

// The match clock may only be controlled (started/paused) while a wave is in
// prep or active — not on the win/loss terminal screen.
function isMatchInProgress(): boolean {
  return state.phase === "prep" || state.phase === "active";
}

function startRun(): void {
  if (runStarted) {
    return;
  }
  runStarted = true;
  lastTickTime = performance.now();
  audio.playUi("start");
}

function pauseMatch(): void {
  if (!runStarted || paused || !isMatchInProgress()) {
    return;
  }
  paused = true;
  audio.playUi("select");
}

function resumeMatch(): void {
  if (!runStarted || !paused) {
    return;
  }
  paused = false;
  lastTickTime = performance.now();
  audio.playUi("start");
}

function openSectorSelect(): void {
  screen = "sectorSelect";
  hoverTile = null;
  audio.playUi("select");
}

function openLeaderboard(): void {
  leaderboardReturn = screen === "playing" ? "sectorSelect" : screen;
  leaderboardNotice = null;
  screen = "leaderboard";
  hoverTile = null;
  audio.playUi("select");
}

function closeLeaderboard(): void {
  leaderboardNotice = null;
  screen = leaderboardReturn;
  hoverTile = null;
  audio.playUi("select");
}

// Persists the just-finished run before an OAuth sign-in redirect so it can be
// auto-submitted when the player returns signed in.
function stashPendingRunForSignIn(): void {
  pendingRunHandled = false;
  savePendingRun({ seed: currentSeed, sector: currentSector, commands: recordedCommands });
}

// After sign-in completes (player has a session + handle), submit any run that
// was stashed before the redirect, then surface the result on the leaderboard.
async function maybeAutoSubmitPendingRun(): Promise<void> {
  if (pendingRunHandled || accountState() !== "ready") {
    return;
  }
  const pending = takePendingRun();
  if (!pending) {
    return;
  }
  pendingRunHandled = true;
  const result = await submitScore({
    seed: pending.seed,
    sector: pending.sector,
    commands: pending.commands,
    accessToken: accessToken() ?? "",
  });
  leaderboardNotice = result.ok
    ? result.improved
      ? `Run logged — new best ${result.bestScore}! Global #${result.globalRank} · Sector #${result.sectorRank}.`
      : `Run logged. Your best ${result.bestScore} stands — Global #${result.globalRank} · Sector #${result.sectorRank}.`
    : `Couldn't log your last run: ${result.error}`;
  screen = "leaderboard";
  hoverTile = null;
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
    // Hold the sim clock until the player presses START, and freeze it while
    // paused. Advancing lastTickTime on resume/start avoids a catch-up burst.
    const clockRunning = runStarted && !paused;

    while (
      clockRunning &&
      state.phase !== "won" &&
      state.phase !== "lost" &&
      now - lastTickTime >= tickMs
    ) {
      state = tick(state);

      if (previousPhase !== "won" && state.phase === "won") {
        progress = markSectorCleared(progress, currentSector);
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
      onPause: pauseMatch,
      canPause: runStarted && !paused && isMatchInProgress(),
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
      runStarted,
      paused,
      onStartRun: startRun,
      onResume: resumeMatch,
      onSkipPrep: () => {
        dispatch({ type: "skipPrep" });
        lastTickTime = performance.now();
        audio.playUi("start");
      },
      onRestart: retrySector,
      onReturnToTitle: returnToTitle,
      onSectorSelect: openSectorSelect,
      onNextSector: getNextSectorHandler(),
      onViewLeaderboard: openLeaderboard,
      onSubmitScore: leaderboardConfig.enabled
        ? () =>
            submitScore({
              seed: currentSeed,
              sector: currentSector,
              commands: recordedCommands,
              accessToken: accessToken() ?? "",
            })
        : null,
      onBeforeSignIn: stashPendingRunForSignIn,
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
    onShowLeaderboard: openLeaderboard,
    onCloseLeaderboard: closeLeaderboard,
    leaderboardNotice,
  });

  requestAnimationFrame(drawFrame);
}

// Restore any existing session and complete a pending OAuth redirect so the
// leaderboard knows who the player is. No-op when the leaderboard is offline.
// When the player becomes signed-in with a handle, auto-submit a run that was
// stashed before the redirect.
onAccountChange(() => {
  void maybeAutoSubmitPendingRun();
});
void initAccount();

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
