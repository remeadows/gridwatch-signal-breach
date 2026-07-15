import type { SubmitResult } from "../leaderboard/api";
import { calculateScore } from "../sim/scoring";
import type { GameState } from "../sim/types";
import { createAccountPanel } from "./account";

export type OverlayOptions = Readonly<{
  root: HTMLElement;
  state: GameState;
  onRestart: () => void;
  onReturnToTitle: () => void;
  onSectorSelect: () => void;
  onNextSector: (() => void) | null;
  onViewLeaderboard: () => void;
  // Null when the leaderboard is unconfigured; the submit UI is then hidden.
  // Submits the current run for the signed-in player (identity comes from auth).
  onSubmitScore: (() => Promise<SubmitResult>) | null;
  // Persists the finished run before an OAuth sign-in redirect.
  onBeforeSignIn: () => void;
  // The Build phase is rendered by playUi.ts without covering the grid. Only a
  // true pause needs a full-board clock-gate cover here.
  paused: boolean;
  onResume: () => void;
}>;

export function renderOverlay(options: OverlayOptions): void {
  const { root, state, paused, onResume } = options;
  root.className = "overlay-root";

  if (paused) {
    root.hidden = false;
    renderPauseCover(root, onResume);
    return;
  }

  if (state.phase === "prep" || state.phase === "active") {
    root.hidden = true;
    root.dataset.overlayKey = state.phase;
    return;
  }

  root.hidden = false;
  renderTerminalOverlay(options);
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
    onBeforeSignIn,
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
    panel.append(createSubmitSection(onSubmitScore, onBeforeSignIn));
  }
  panel.append(actions);
  root.append(panel);
}

// Builds the "submit to leaderboard" block — an auth-aware account panel that
// handles sign-in, handle choice, and the SUBMIT action. The terminal panel is
// rebuilt only when its overlay key changes, so submission state persists.
function createSubmitSection(
  onSubmitScore: () => Promise<SubmitResult>,
  onBeforeSignIn: () => void,
): HTMLElement {
  const section = document.createElement("div");
  const label = document.createElement("p");

  section.className = "submit-section";
  label.className = "submit-label";
  label.textContent = "Log your score to the leaderboard";

  section.append(
    label,
    createAccountPanel({ mode: "submit", onSubmit: onSubmitScore, onBeforeSignIn }),
  );
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
