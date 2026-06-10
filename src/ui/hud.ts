import { getCurrentWave } from "../sim/waves";
import type { GameState } from "../sim/types";

export function renderHud(root: HTMLElement, state: GameState): void {
  const wave = getCurrentWave(state);
  const phaseLabel = getPhaseLabel(state);

  root.innerHTML = "";
  root.className = "hud";
  root.append(createHudHero(state), createHudStatusRail(state, wave.id, phaseLabel));
}

function createHudHero(state: GameState): HTMLElement {
  const hero = document.createElement("section");

  hero.className = "hud-hero";
  hero.append(
    createHudMetric("Bandwidth", String(state.bandwidth), "primary"),
    createHudMetric("Core", String(state.coreIntegrity), "primary"),
  );

  return hero;
}

function createHudStatusRail(state: GameState, waveId: number, phaseLabel: string): HTMLElement {
  const rail = document.createElement("section");

  rail.className = "hud-rail";
  rail.append(
    createHudMetric("Wave", `${waveId}/5`, "secondary"),
    createHudMetric("Phase", phaseLabel, "secondary"),
    createHudMetric("Signal", state.signal.status.toUpperCase(), "secondary", state.signal.status),
    createHudMetric("Intrusions", String(state.intrusions.length), "secondary"),
    createHudMetric("Neutralized", String(state.neutralizedCount), "secondary"),
  );

  return rail;
}

function createHudMetric(
  label: string,
  value: string,
  priority: "primary" | "secondary",
  status?: string,
): HTMLElement {
  const element = document.createElement("div");
  const labelElement = document.createElement("span");
  const valueElement = document.createElement("strong");

  element.className = `hud-metric hud-metric-${priority}`;
  if (status) {
    element.dataset.status = status;
  }

  labelElement.textContent = label;
  valueElement.textContent = value;
  element.append(labelElement, valueElement);

  return element;
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
