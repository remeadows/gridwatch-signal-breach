import { getCurrentWave } from "../sim/waves";
import type { GameState } from "../sim/types";

export type HudOptions = Readonly<{
  sectorName: string;
  onShowBriefing: () => void;
  onPause: () => void;
  // Pause is only offered while a wave is in progress (not started, not paused,
  // not on the terminal screen).
  canPause: boolean;
}>;

export function renderHud(root: HTMLElement, state: GameState, options: HudOptions): void {
  root.className = "hud";

  if (root.dataset.ready !== "true") {
    root.innerHTML = "";
    root.append(
      createHudHero(),
      createHudStatusRail(options.onShowBriefing, options.onPause),
    );
    root.dataset.ready = "true";
  }

  const pauseButton = root.querySelector<HTMLButtonElement>("[data-hud-pause]");
  if (pauseButton) {
    pauseButton.hidden = !options.canPause;
  }

  const wave = getCurrentWave(state);
  const phaseLabel = getPhaseLabel(state);

  updateHudMetric(root, "bandwidth", String(state.bandwidth));
  updateHudMetric(root, "core", String(state.coreIntegrity));
  updateHudMetric(root, "sector", options.sectorName);
  updateHudMetric(
    root,
    "wave",
    `W${wave.id} · ${state.waveIndex + 1}/${state.config.waves.length}`,
  );
  updateHudMetric(root, "phase", phaseLabel);
  updateHudMetric(root, "signal", state.signal.status.toUpperCase(), state.signal.status);
  updateHudMetric(root, "intrusions", String(state.intrusions.length));
  updateHudMetric(root, "neutralized", String(state.neutralizedCount));
}

function createHudHero(): HTMLElement {
  const hero = document.createElement("section");

  hero.className = "hud-hero";
  hero.append(
    createHudMetric("bandwidth", "Bandwidth", "primary"),
    createHudMetric("core", "Core", "primary"),
  );

  return hero;
}

function createHudStatusRail(
  onShowBriefing: () => void,
  onPause: () => void,
): HTMLElement {
  const rail = document.createElement("section");
  const actions = document.createElement("div");
  const pauseButton = document.createElement("button");
  const briefingButton = document.createElement("button");

  rail.className = "hud-rail";
  rail.append(
    createHudMetric("sector", "Sector", "secondary"),
    createHudMetric("wave", "Wave", "secondary"),
    createHudMetric("phase", "Phase", "secondary"),
    createHudMetric("signal", "Signal", "secondary"),
    createHudMetric("intrusions", "Intrusions", "secondary"),
    createHudMetric("neutralized", "Neutralized", "secondary"),
  );

  actions.className = "hud-actions";
  pauseButton.type = "button";
  pauseButton.className = "neon-button neon-button-secondary hud-pause-button";
  pauseButton.dataset.hudPause = "true";
  pauseButton.textContent = "PAUSE";
  pauseButton.addEventListener("click", onPause);
  briefingButton.type = "button";
  briefingButton.className = "neon-button neon-button-secondary hud-briefing-button";
  briefingButton.textContent = "BRIEFING";
  briefingButton.addEventListener("click", onShowBriefing);

  actions.append(pauseButton, briefingButton);
  rail.append(actions);

  return rail;
}

function createHudMetric(
  key: string,
  label: string,
  priority: "primary" | "secondary",
): HTMLElement {
  const element = document.createElement("div");
  const labelElement = document.createElement("span");
  const valueElement = document.createElement("strong");

  element.className = `hud-metric hud-metric-${priority}`;
  element.dataset.hudMetric = key;
  labelElement.textContent = label;
  valueElement.dataset.hudValue = "true";
  element.append(labelElement, valueElement);

  return element;
}

function updateHudMetric(
  root: HTMLElement,
  key: string,
  value: string,
  status?: string,
): void {
  const element = root.querySelector<HTMLElement>(`[data-hud-metric="${key}"]`);
  const valueElement = element?.querySelector<HTMLElement>("[data-hud-value]");

  if (!element || !valueElement) {
    return;
  }

  valueElement.textContent = value;

  if (status) {
    element.dataset.status = status;
  } else {
    delete element.dataset.status;
  }
}

function getPhaseLabel(state: GameState): string {
  switch (state.phase) {
    case "prep":
      return `PREP ${Math.ceil((state.prepTicksRemaining * state.config.simulationTickMs) / 1000)}s`;
    case "active":
      return "LIVE";
    case "won":
      return "WIN";
    case "lost":
      return "LOSS";
  }
}
