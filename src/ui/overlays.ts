import { calculateScore } from "../sim/scoring";
import { getCurrentWave } from "../sim/waves";
import type { GameState } from "../sim/types";

export type OverlayOptions = Readonly<{
  root: HTMLElement;
  state: GameState;
  onSkipPrep: () => void;
  onRestart: () => void;
}>;

export function renderOverlay(options: OverlayOptions): void {
  const { root, state, onSkipPrep, onRestart } = options;
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

  renderTerminalOverlay(root, state, onRestart);
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
    panel.className = "overlay-panel";
    title.dataset.overlayTitle = "true";
    taunt.dataset.overlayTaunt = "true";
    countdown.className = "overlay-countdown";
    countdown.dataset.overlayCountdown = "true";
    button.type = "button";
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
    taunt.textContent = state.activeTaunt;
  }

  if (countdown) {
    countdown.textContent = `${Math.ceil((state.prepTicksRemaining * state.config.simulationTickMs) / 1000)}s`;
  }
}

function renderTerminalOverlay(
  root: HTMLElement,
  state: GameState,
  onRestart: () => void,
): void {
  const key = state.phase;
  if (root.dataset.overlayKey === key) {
    return;
  }

  const panel = document.createElement("section");
  const title = document.createElement("h2");
  const rating = document.createElement("strong");
  const detail = document.createElement("p");
  const scoreList = document.createElement("dl");
  const button = document.createElement("button");
  const score = calculateScore(state);

  root.innerHTML = "";
  root.dataset.overlayKey = key;
  panel.className = "overlay-panel terminal-panel";
  title.textContent = state.phase === "won" ? "Core held" : "Core collapsed";
  rating.className = "operator-rating";
  rating.textContent = score.rating;
  detail.textContent =
    state.phase === "won"
      ? "All five waves survived."
      : `Integrity reached ${state.coreIntegrity}.`;
  scoreList.className = "score-breakdown";
  appendScoreRow(scoreList, "Core integrity", score.integrity);
  appendScoreRow(scoreList, `Neutralized x10 (${state.neutralizedCount})`, score.neutralized);
  appendScoreRow(scoreList, `Signal uptime (${score.uptimePercent}%)`, score.uptimeScore);
  appendScoreRow(scoreList, "Bandwidth efficiency", score.efficiencyBonus);
  appendScoreRow(scoreList, "Score", score.total);
  button.type = "button";
  button.textContent = "Restart";
  button.addEventListener("click", onRestart);

  panel.append(title, rating, detail, scoreList, button);
  root.append(panel);
}

function appendScoreRow(root: HTMLElement, label: string, value: number): void {
  const term = document.createElement("dt");
  const detail = document.createElement("dd");

  term.textContent = label;
  detail.textContent = String(value);
  root.append(term, detail);
}
