import { getCurrentWave } from "../sim/waves";
import type { GameState } from "../sim/types";

export type HudOptions = Readonly<{
  sectorName: string;
  onShowBriefing: () => void;
}>;

export function renderHud(root: HTMLElement, state: GameState, options: HudOptions): void {
  root.className = "hud";

  if (root.dataset.ready !== "true") {
    root.innerHTML = "";
    root.append(
      createHudHero(),
      createHudStatusRail(options.onShowBriefing),
    );
    root.dataset.ready = "true";
  }

  const wave = getCurrentWave(state);
  const phaseLabel = getPhaseLabel(state);

  updateHudMetric(root, "bandwidth", String(state.bandwidth));
  updateHudMetric(root, "core", String(state.coreIntegrity));
  updateHudMetric(root, "sector", options.sectorName);
  updateHudMetric(
    root,
    "wave",
    `WAVE ${wave.id} · ${state.waveIndex + 1}/${state.config.waves.length}`,
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

function createHudStatusRail(onShowBriefing: () => void): HTMLElement {
  const rail = document.createElement("section");
  const action = document.createElement("button");

  rail.className = "hud-rail";
  rail.append(
    createHudMetric("sector", "Sector", "secondary"),
    createHudMetric("wave", "Wave", "secondary"),
    createHudMetric("phase", "Phase", "secondary"),
    createHudMetric("signal", "Signal", "secondary"),
    createHudMetric("intrusions", "Intrusions", "secondary"),
    createHudMetric("neutralized", "Neutralized", "secondary"),
  );

  action.type = "button";
  action.className = "neon-button neon-button-secondary hud-briefing-button";
  action.textContent = "BRIEFING";
  action.addEventListener("click", onShowBriefing);
  rail.append(action);

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
