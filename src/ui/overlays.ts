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
}>;

export function renderOverlay(options: OverlayOptions): void {
  const { root, state, onSkipPrep } = options;
  root.className = "overlay-root";

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
    createActionButton("SECTOR SELECT", "secondary", onSectorSelect),
    createActionButton("TITLE", "secondary", onReturnToTitle),
  );

  panel.append(title, rating, detail, scoreList, actions);
  root.append(panel);
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
