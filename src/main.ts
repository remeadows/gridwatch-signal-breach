import "./style.css";
import { SECTORS } from "./data/levels";
import { installPointerInput } from "./input/pointer";
import { drawAmbientBackdrop, drawGrid } from "./render/renderer";
import { getBoardArtMode, preloadPhase6BoardSprites } from "./render/assetRegistry";
import { getEffectsQuality } from "./render/visualTheme";
import { applyCommand, createGameState, SIM_RULESET_ID, tick } from "./sim";
import { createAudioEngine } from "./ui/audio";
import { renderHud } from "./ui/hud";
import { renderOverlay } from "./ui/overlays";
import { renderPlayUi, type PlayNotice } from "./ui/playUi";
import {
  hasSeenBriefing,
  renderScreens,
  type AppScreen,
} from "./ui/screens";
import {
  getSignalBreachProgress,
  loadGameProgress,
  markSectorCleared,
  type GameProgress,
  type SignalBreachProgress,
} from "./ui/progress";
import { isExpansionNavigationEnabled } from "./ui/featureFlags";
import { renderUnitPicker } from "./ui/unitPicker";
import { getCommandFeedback } from "./ui/toolInfo";
import { leaderboardConfig } from "./leaderboard/config";
import { submitScore } from "./leaderboard/api";
import { accessToken, accountState, initAccount, onAccountChange } from "./leaderboard/account";
import { savePendingRun, takePendingRun } from "./leaderboard/pendingRun";
import type { GamePhase, GridPosition, PlayerTool, RecordedCommand, SimCommand } from "./sim";
import { getCurrentWave } from "./sim/waves";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
const hudRoot = document.querySelector<HTMLElement>("#hud-root");
const unitPickerRoot = document.querySelector<HTMLElement>("#unit-picker-root");
const overlayRoot = document.querySelector<HTMLElement>("#overlay-root");
const playUiRoot = document.querySelector<HTMLElement>("#play-ui-root");
const screenRoot = document.querySelector<HTMLElement>("#screen-root");

if (!canvas || !hudRoot || !unitPickerRoot || !overlayRoot || !playUiRoot || !screenRoot) {
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
const playUiContainer = playUiRoot;
const screenContainer = screenRoot;
const audio = createAudioEngine();
const MAX_SECTOR_ID = SECTORS.length;
const expansionNavigationEnabled = isExpansionNavigationEnabled();
const effectsQuality = getEffectsQuality();
const boardArtMode = getBoardArtMode();
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = reducedMotionQuery.matches;

document.documentElement.dataset.effectsQuality = effectsQuality;
document.documentElement.dataset.artMode = boardArtMode;
if (boardArtMode === "phase6") {
  preloadPhase6BoardSprites();
}
reducedMotionQuery.addEventListener("change", (event) => {
  reducedMotion = event.matches;
});

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

let progress: GameProgress = loadGameProgress();
let currentSector = getInitialSector(getSignalBreachProgress(progress));
let selectedExpansionChapterId = 1;
document.documentElement.dataset.sector = String(currentSector);
let currentSeed = "";
let recordedCommands: RecordedCommand[] = [];
let state = createRunState();
let selectedTool: PlayerTool = getDefaultTool(state);
let screen: AppScreen = "title";
let briefingReturn: AppScreen = "sectorSelect";
let leaderboardReturn: AppScreen = "title";
let hoverTile: GridPosition | null = null;
let inspectedTile: GridPosition | null = null;
let lastTickTime = performance.now();
let previousPhase: GamePhase = state.phase;
// UI-only clock gates (no effect on the deterministic sim or replay format):
// each prep phase is an unlimited Build phase. LAUNCH records the existing
// skipPrep command, then the sim ticks only while that wave is running.
let runStarted = false;
let paused = false;
let gameplayNotice: PlayNotice | null = createWaveGrantNotice(state);
// Banner shown on the leaderboard after a run is auto-submitted post-sign-in.
let leaderboardNotice: string | null = null;
let pendingRunHandled = false;

installPointerInput({
  canvas: gameCanvas,
  getState: () => state,
  getSelectedTool: () => selectedTool,
  isEnabled: () => screen === "playing" && !paused && isMatchInProgress(),
  onHover: (position) => {
    hoverTile = position;
  },
  dispatch: handlePlayerCommand,
});

// Keyboard pause toggle. Escape / P mirror the HUD pause button during a live
// match. (Space is intentionally excluded — it activates focused buttons and
// scrolls the page.)
window.addEventListener("keydown", (event) => {
  if (
    event.key === "Enter" &&
    screen === "playing" &&
    state.phase === "prep" &&
    !runStarted
  ) {
    event.preventDefault();
    launchWave();
    return;
  }

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

// Mobile browsers can suspend the page or rotate the viewport without a clean
// animation-frame handoff. Pause before either transition so returning to the
// game never advances an unseen wave or creates a catch-up burst.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseForInterruption();
  }
});
window.addEventListener("pagehide", pauseForInterruption);
window.screen.orientation?.addEventListener("change", pauseForInterruption);

function enterPlaying(playStartAudio = true): void {
  screen = "playing";
  lastTickTime = performance.now();
  previousPhase = state.phase;

  if (playStartAudio) {
    audio.playUi("start");
  }
}

function startSector(sectorId: number): void {
  currentSector = clampSector(
    sectorId,
    getSignalBreachProgress(progress).highestUnlockedSector,
  );
  document.documentElement.dataset.sector = String(currentSector);
  state = createRunState();
  selectedTool = getDefaultTool(state);
  hoverTile = null;
  inspectedTile = null;
  armRun();
  gameplayNotice = createWaveGrantNotice(state);
  enterPlaying();
}

function retrySector(): void {
  state = createRunState();
  selectedTool = getDefaultTool(state);
  hoverTile = null;
  inspectedTile = null;
  armRun();
  gameplayNotice = createWaveGrantNotice(state);
  enterPlaying();
}

// Resets the clock gates for a fresh Build phase. Placement remains enabled,
// but deterministic time stays frozen until the player launches the wave.
function armRun(): void {
  runStarted = false;
  paused = false;
}

// The match clock may only be controlled (started/paused) while a wave is in
// prep or active — not on the win/loss terminal screen.
function isMatchInProgress(): boolean {
  return state.phase === "prep" || state.phase === "active";
}

function launchWave(): void {
  if (runStarted || state.phase !== "prep") {
    return;
  }

  const wave = getCurrentWave(state);
  dispatch({ type: "skipPrep" });
  runStarted = true;
  lastTickTime = performance.now();
  showGameplayNotice(`Wave ${wave.id} live · hold the signal`, "info", 2400);
  audio.playUi("start");
}

function pauseMatch(): void {
  if (!runStarted || paused || !isMatchInProgress()) {
    return;
  }
  paused = true;
  audio.playUi("select");
}

function pauseForInterruption(): void {
  if (screen === "playing" && runStarted && !paused && isMatchInProgress()) {
    pauseMatch();
  }
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
  inspectedTile = null;
  audio.playUi("select");
}

function openCampaignSelect(): void {
  if (!expansionNavigationEnabled) {
    openSectorSelect();
    return;
  }

  screen = "campaignSelect";
  hoverTile = null;
  inspectedTile = null;
  audio.playUi("select");
}

function selectCampaign(campaignId: "signal-breach" | "expansion-1"): void {
  if (campaignId === "signal-breach") {
    openSectorSelect();
    return;
  }

  selectedExpansionChapterId = 1;
  screen = "chapterSelect";
  hoverTile = null;
  inspectedTile = null;
  audio.playUi("select");
}

function selectExpansionChapter(chapterId: number): void {
  selectedExpansionChapterId = Math.min(6, Math.max(1, Math.floor(chapterId)));
  screen = "levelSelect";
  hoverTile = null;
  inspectedTile = null;
  audio.playUi("select");
}

function openChapterSelect(): void {
  screen = "chapterSelect";
  hoverTile = null;
  inspectedTile = null;
  audio.playUi("select");
}

function openLeaderboard(): void {
  leaderboardReturn = screen === "playing" ? "sectorSelect" : screen;
  leaderboardNotice = null;
  screen = "leaderboard";
  hoverTile = null;
  inspectedTile = null;
  audio.playUi("select");
}

function closeLeaderboard(): void {
  leaderboardNotice = null;
  screen = leaderboardReturn;
  hoverTile = null;
  inspectedTile = null;
  audio.playUi("select");
}

// Persists the just-finished run before an OAuth sign-in redirect so it can be
// auto-submitted when the player returns signed in.
function stashPendingRunForSignIn(): void {
  pendingRunHandled = false;
  savePendingRun({
    ruleset: SIM_RULESET_ID,
    seed: currentSeed,
    sector: currentSector,
    commands: recordedCommands,
  });
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
    ruleset: pending.ruleset,
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
  inspectedTile = null;
  audio.playUi("select");
}

function showBriefing(returnScreen: AppScreen): void {
  briefingReturn = returnScreen;
  screen = "briefing";
  hoverTile = null;
  inspectedTile = null;
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
    // Hold deterministic time throughout Build and while paused. Advancing
    // lastTickTime on launch/resume avoids a catch-up burst.
    const clockRunning = runStarted && !paused;

    while (
      clockRunning &&
      state.phase !== "won" &&
      state.phase !== "lost" &&
      now - lastTickTime >= tickMs
    ) {
      const phaseBeforeTick = state.phase;
      const bandwidthBeforeTick = state.bandwidth;
      state = tick(state);
      const enteredBuild = phaseBeforeTick === "active" && state.phase === "prep";

      if (previousPhase !== "won" && state.phase === "won") {
        progress = markSectorCleared(progress, currentSector);
      }

      if (state.bandwidth > bandwidthBeforeTick && !enteredBuild) {
        showGameplayNotice(
          `+${state.bandwidth - bandwidthBeforeTick} BW · signal trickle`,
          "good",
        );
      }

      previousPhase = state.phase;
      audio.playEvents(state.events);
      lastTickTime += tickMs;

      if (enteredBuild) {
        runStarted = false;
        paused = false;
        inspectedTile = null;
        lastTickTime = now;
        const nextWave = getCurrentWave(state);
        showGameplayNotice(
          `+${nextWave.bandwidthGrant} BW · wave ${nextWave.id} grant`,
          "good",
          3200,
        );
        break;
      }
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
      focus: inspectedTile,
      selectedTool,
      buildMode: state.phase === "prep" && !runStarted,
      reducedMotion,
      effectsQuality,
      artMode: boardArtMode,
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
        inspectedTile = null;
        gameplayNotice = null;
        audio.playUi("select");
      },
    });
    renderPlayUi({
      root: playUiContainer,
      state,
      selectedTool,
      buildMode: state.phase === "prep" && !runStarted,
      paused,
      notice: gameplayNotice,
      now,
      onLaunchWave: launchWave,
    });
    renderOverlay({
      root: overlayContainer,
      state,
      paused,
      onResume: resumeMatch,
      onRestart: retrySector,
      onReturnToTitle: returnToTitle,
      onSectorSelect: openSectorSelect,
      onNextSector: getNextSectorHandler(),
      onViewLeaderboard: openLeaderboard,
      onSubmitScore: leaderboardConfig.enabled
        ? () =>
            submitScore({
              ruleset: SIM_RULESET_ID,
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
        focus: null,
        selectedTool,
        buildMode: false,
        reducedMotion,
        effectsQuality,
        artMode: boardArtMode,
      });
    } else {
      drawAmbientBackdrop(
        renderContext,
        canvasSize,
        now,
        reducedMotion,
        effectsQuality,
      );
    }

    hoverTile = null;
    hudContainer.hidden = true;
    unitPickerContainer.hidden = true;
    overlayContainer.hidden = true;
    playUiContainer.hidden = true;
  }

  renderScreens({
    root: screenContainer,
    screen,
    progress,
    expansionNavigationEnabled,
    selectedExpansionChapterId,
    briefingMaxSector: getSignalBreachProgress(progress).highestUnlockedSector,
    briefingFromPlay: screen === "briefing" && briefingReturn === "playing",
    onStart: () => {
      if (hasSeenBriefing()) {
        openCampaignSelect();
        return;
      }

      showBriefing(expansionNavigationEnabled ? "campaignSelect" : "sectorSelect");
    },
    onBriefingComplete: completeBriefing,
    onShowBriefing: () => showBriefing(
      expansionNavigationEnabled ? "campaignSelect" : "sectorSelect",
    ),
    onSelectSector: startSector,
    onSelectCampaign: selectCampaign,
    onSelectExpansionChapter: selectExpansionChapter,
    onBackToCampaignSelect: openCampaignSelect,
    onBackToChapterSelect: openChapterSelect,
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

function getInitialSector(currentProgress: SignalBreachProgress): number {
  const requested = Number.parseInt(
    new URLSearchParams(window.location.search).get("sector") ?? "",
    10,
  );

  return Number.isFinite(requested)
    ? clampSector(requested, currentProgress.highestUnlockedSector)
    : 1;
}

function handlePlayerCommand(command: SimCommand): void {
  const before = state;
  dispatch(command);
  const feedback = getCommandFeedback(before, state, command);

  if (command.type === "placeUnit" && state !== before) {
    inspectedTile = command.position;
  } else if (command.type === "sellUnit" && state !== before) {
    inspectedTile = null;
  }

  if (feedback) {
    showGameplayNotice(feedback.message, feedback.tone);
  }
}

function createWaveGrantNotice(runState: ReturnType<typeof createGameState>): PlayNotice {
  const wave = getCurrentWave(runState);
  return {
    message: `+${wave.bandwidthGrant} BW · wave ${wave.id} grant`,
    tone: "good",
    expiresAt: performance.now() + 4000,
  };
}

function showGameplayNotice(
  message: string,
  tone: PlayNotice["tone"],
  durationMs = 1800,
): void {
  gameplayNotice = {
    message,
    tone,
    expiresAt: performance.now() + durationMs,
  };
}

function getNextSectorHandler(): (() => void) | null {
  if (state.phase !== "won") {
    return null;
  }

  const nextSector = currentSector + 1;

  if (
    nextSector > MAX_SECTOR_ID ||
    nextSector > getSignalBreachProgress(progress).highestUnlockedSector
  ) {
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
