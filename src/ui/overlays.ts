import type { SubmitResult } from "../leaderboard/api";
import { calculateScore } from "../sim/scoring";
import { getCurrentWave } from "../sim/waves";
import type { GameState } from "../sim/types";
import { createAccountPanel } from "./account";

export type OverlayOptions = Readonly<{
  root: HTMLElement;
  state: GameState;
  onSkipPrep: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
  onSectorSelect: () => void;
  onNextSector: (() => void) | null;
  onViewLeaderboard: () => void;
  // Null when the leaderboard is unconfigured; the submit UI is then hidden.
  // Submits the current run for the signed-in player (identity comes from auth).
  onSubmitScore: (() => Promise<SubmitResult>) | null;
  // UI clock gates. Before the run is started, a START cover holds the prep
  // timer; while paused, a PAUSE cover obscures the grid. Both take precedence
  // over the phase-driven overlays.
  runStarted: boolean;
  paused: boolean;
  onStartRun: () => void;
  onResume: () => void;
}>;

export function renderOverlay(options: OverlayOptions): void {
  const { root, state, onSkipPrep, runStarted, paused, onStartRun, onResume } = options;
  root.className = "overlay-root";

  // Clock-gate covers win over phase overlays: the player must START the run,
  // and a PAUSE cover can interrupt an active wave.
  if (!runStarted) {
    root.hidden = false;
    renderStartCover(root, state, onStartRun);
    return;
  }

  if (paused) {
    root.hidden = false;
    renderPauseCover(root, onResume);
    return;
  }

  if (state.phase === "active") {
    root.hidden = true;
    root.dataset.overlayKey = "active";
    return;
  }

  root.hidden = false;

  if (state.phase === "prep") {
    renderPrepOverlay(root, state, onSkipPrep);
    return;
  }

  renderTerminalOverlay(options);
}

// Full-grid cover shown before a run begins. The prep countdown stays frozen
// until the player presses START.
function renderStartCover(
  root: HTMLElement,
  state: GameState,
  onStartRun: () => void,
): void {
  if (root.dataset.overlayKey === "start") {
    return;
  }

  const wave = getCurrentWave(state);
  const cover = document.createElement("div");
  const panel = document.createElement("section");
  const eyebrow = document.createElement("p");
  const title = document.createElement("h2");
  const detail = document.createElement("p");
  const button = document.createElement("button");

  root.innerHTML = "";
  root.dataset.overlayKey = "start";
  cover.className = "overlay-cover";
  panel.className = "overlay-panel start-panel";
  eyebrow.className = "overlay-eyebrow";
  eyebrow.textContent = `${state.config.sectorName} // WAVE ${wave.id}`;
  title.className = "overlay-title";
  title.textContent = "Stand by to defend";
  detail.textContent =
    "The prep timer is frozen. Press START to begin — then place your defenses before the wave hits.";
  button.type = "button";
  button.className = "neon-button neon-button-primary";
  button.textContent = "▸ START";
  button.addEventListener("click", onStartRun);

  panel.append(eyebrow, title, detail, button);
  cover.append(panel);
  root.append(cover);
}

// Full-grid cover shown while the match is paused.
function renderPauseCover(root: HTMLElement, onResume: () => void): void {
  if (root.dataset.overlayKey === "paused") {
    return;
  }

  const cover = document.createElement("div");
  const panel = document.createElement("section");
  const title = document.createElement("h2");
  const detail = document.createElement("p");
  const button = document.createElement("button");

  root.innerHTML = "";
  root.dataset.overlayKey = "paused";
  cover.className = "overlay-cover";
  panel.className = "overlay-panel pause-panel";
  title.className = "overlay-title";
  title.textContent = "Paused";
  detail.textContent = "Signal frozen. The grid is holding.";
  button.type = "button";
  button.className = "neon-button neon-button-primary";
  button.textContent = "▸ RESUME";
  button.addEventListener("click", onResume);

  panel.append(title, detail, button);
  cover.append(panel);
  root.append(cover);
}

function renderPrepOverlay(root: HTMLElement, state: GameState, onSkipPrep: () => void): void {
  const wave = getCurrentWave(state);
  const key = `prep-${wave.id}`;

  if (root.dataset.overlayKey !== key) {
    const panel = document.createElement("section");
    const title = document.createElement("h2");
    const taunt = document.createElement("p");
    const countdown = document.createElement("p");
    const button = document.createElement("button");

    root.innerHTML = "";
    root.dataset.overlayKey = key;
    panel.className = "overlay-panel prep-panel";
    title.dataset.overlayTitle = "true";
    title.className = "overlay-title";
    taunt.className = "overlay-taunt";
    taunt.dataset.overlayTaunt = "true";
    countdown.className = "overlay-countdown";
    countdown.dataset.overlayCountdown = "true";
    button.type = "button";
    button.className = "neon-button neon-button-primary";
    button.textContent = "Skip prep";
    button.addEventListener("click", onSkipPrep);
    panel.append(title, taunt, countdown, button);
    root.append(panel);
  }

  const title = root.querySelector<HTMLElement>("[data-overlay-title]");
  const taunt = root.querySelector<HTMLElement>("[data-overlay-taunt]");
  const countdown = root.querySelector<HTMLElement>("[data-overlay-countdown]");

  if (title) {
    title.textContent = `Wave ${wave.id}: ${wave.label}`;
  }

  if (taunt) {
    taunt.textContent = `> incoming transmission: ${state.activeTaunt}`;
  }

  if (countdown) {
    countdown.textContent = `${Math.ceil((state.prepTicksRemaining * state.config.simulationTickMs) / 1000)}s`;
  }
}

function renderTerminalOverlay(options: OverlayOptions): void {
  const {
    root,
    state,
    onRestart,
    onReturnToTitle,
    onSectorSelect,
    onNextSector,
    onViewLeaderboard,
    onSubmitScore,
  } = options;
  const key = `${state.phase}-${onNextSector ? "next" : "final"}`;
  if (root.dataset.overlayKey === key) {
    return;
  }

  const panel = document.createElement("section");
  const title = document.createElement("h2");
  const rating = document.createElement("strong");
  const detail = document.createElement("p");
  const scoreList = document.createElement("dl");
  const actions = document.createElement("div");
  const score = calculateScore(state);
  const isFinalCampaignWin = state.phase === "won" && !onNextSector;

  root.innerHTML = "";
  root.dataset.overlayKey = key;
  panel.className = "overlay-panel terminal-panel";
  title.className = "overlay-title";
  title.textContent =
    state.phase === "won"
      ? isFinalCampaignWin
        ? "GRID RECLAIMED"
        : "Core held"
      : "Core collapsed";
  rating.className = "operator-rating";
  rating.textContent = score.rating;
  detail.className = "terminal-detail";
  detail.textContent =
    state.phase === "won"
      ? isFinalCampaignWin
        ? "All twelve waves survived. The network is yours."
        : "Sector waves survived."
      : `Integrity reached ${state.coreIntegrity}.`;
  scoreList.className = "score-breakdown";
  appendScoreRow(scoreList, "Core integrity", score.integrity);
  appendScoreRow(scoreList, `Neutralized x10 (${state.neutralizedCount})`, score.neutralized);
  appendScoreRow(scoreList, `Signal uptime (${score.uptimePercent}%)`, score.uptimeScore);
  appendScoreRow(scoreList, "Bandwidth efficiency", score.efficiencyBonus);
  appendScoreRow(scoreList, "Score", score.total);
  actions.className = "terminal-actions";

  if (onNextSector) {
    actions.append(createActionButton("NEXT SECTOR ▸", "primary", onNextSector));
  }

  actions.append(
    createActionButton("RETRY SECTOR", "primary", onRestart),
    createActionButton("LEADERBOARD", "secondary", onViewLeaderboard),
    createActionButton("SECTOR SELECT", "secondary", onSectorSelect),
    createActionButton("TITLE", "secondary", onReturnToTitle),
  );

  panel.append(title, rating, detail, scoreList);
  if (onSubmitScore) {
    panel.append(createSubmitSection(onSubmitScore));
  }
  panel.append(actions);
  root.append(panel);
}

// Builds the "submit to leaderboard" block — an auth-aware account panel that
// handles sign-in, handle choice, and the SUBMIT action. The terminal panel is
// rebuilt only when its overlay key changes, so submission state persists.
function createSubmitSection(onSubmitScore: () => Promise<SubmitResult>): HTMLElement {
  const section = document.createElement("div");
  const label = document.createElement("p");

  section.className = "submit-section";
  label.className = "submit-label";
  label.textContent = "Log your score to the leaderboard";

  section.append(label, createAccountPanel({ mode: "submit", onSubmit: onSubmitScore }));
  return section;
}

function appendScoreRow(root: HTMLElement, label: string, value: number): void {
  const term = document.createElement("dt");
  const detail = document.createElement("dd");

  term.textContent = label;
  detail.textContent = String(value);
  root.append(term, detail);
}

function createActionButton(
  label: string,
  variant: "primary" | "secondary",
  onClick: () => void,
): HTMLButtonElement {
  const button = document.createElement("button");

  button.type = "button";
  button.className = `neon-button neon-button-${variant}`;
  button.textContent = label;
  button.addEventListener("click", onClick);

  return button;
}
