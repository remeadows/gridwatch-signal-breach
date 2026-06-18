import type { SubmitResult } from "../leaderboard/api";
import { MAX_HANDLE_LENGTH } from "../leaderboard/config";
import { calculateScore } from "../sim/scoring";
import { getCurrentWave } from "../sim/waves";
import type { GameState } from "../sim/types";

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
  onSubmitScore: ((handle: string) => Promise<SubmitResult>) | null;
  // UI clock gates. Before the run is started, a START cover holds the prep
  // timer; while paused, a PAUSE cover obscures the grid. Both take precedence
  // over the phase-driven overlays.
  runStarted: boolean;
  paused: boolean;
  onStartRun: () => void;
  onResume: () => void;
}>;

const HANDLE_STORAGE_KEY = "gridwatch.handle";

function loadStoredHandle(): string {
  try {
    return window.localStorage.getItem(HANDLE_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveStoredHandle(handle: string): void {
  try {
    window.localStorage.setItem(HANDLE_STORAGE_KEY, handle);
  } catch {
    // Storage is optional (e.g. Safari private mode); submission still works.
  }
}

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

// Builds the "submit to leaderboard" block. Submission state lives in this
// closure; the terminal panel is rebuilt only when its overlay key changes, so
// the in-flight/submitted state persists across animation frames.
function createSubmitSection(
  onSubmitScore: (handle: string) => Promise<SubmitResult>,
): HTMLElement {
  const section = document.createElement("form");
  const label = document.createElement("label");
  const inputRow = document.createElement("div");
  const input = document.createElement("input");
  const button = document.createElement("button");
  const status = document.createElement("p");

  section.className = "submit-section";
  label.className = "submit-label";
  label.textContent = "Log your score to the leaderboard";
  inputRow.className = "submit-row";
  input.type = "text";
  input.className = "submit-input";
  input.maxLength = MAX_HANDLE_LENGTH;
  input.placeholder = "OPERATOR HANDLE";
  input.value = loadStoredHandle();
  input.setAttribute("aria-label", "Operator handle");
  button.type = "submit";
  button.className = "neon-button neon-button-primary submit-button";
  button.textContent = "SUBMIT";
  status.className = "submit-status";

  let submitted = false;

  const submit = async (): Promise<void> => {
    if (submitted) {
      return;
    }
    const handle = input.value.trim() || "ANON";
    button.disabled = true;
    status.textContent = "Submitting run for validation…";

    const result = await onSubmitScore(handle);

    if (result.ok) {
      submitted = true;
      input.disabled = true;
      // Persist the handle the server actually accepted (after its stricter
      // sanitization), and reflect it back into the field, so the stored value
      // never drifts from what's on the board.
      saveStoredHandle(result.handle);
      input.value = result.handle;
      const placement = `Global #${result.globalRank} · Sector #${result.sectorRank}`;
      status.textContent = result.duplicate
        ? `Already submitted — ${placement}.`
        : `Logged! ${placement}.`;
    } else {
      button.disabled = false;
      status.textContent = result.error;
    }
  };

  section.addEventListener("submit", (event) => {
    event.preventDefault();
    void submit();
  });

  inputRow.append(input, button);
  section.append(label, inputRow, status);
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
