import { getCurrentWave } from "../sim/waves";
import type { GameState } from "../sim/types";

export function renderHud(root: HTMLElement, state: GameState): void {
  const wave = getCurrentWave(state);
  const phaseLabel = getPhaseLabel(state);

  root.innerHTML = "";
  root.className = "hud";
  root.append(
    createHudMetric("Wave", `${wave.id}/5`),
    createHudMetric("Phase", phaseLabel),
    createHudMetric("Bandwidth", String(state.bandwidth)),
    createHudMetric("Core", String(state.coreIntegrity)),
    createHudMetric("Signal", state.signal.status.toUpperCase()),
    createHudMetric("Intrusions", String(state.intrusions.length)),
    createHudMetric("Neutralized", String(state.neutralizedCount)),
  );
}

function createHudMetric(label: string, value: string): HTMLElement {
  const element = document.createElement("div");
  const labelElement = document.createElement("span");
  const valueElement = document.createElement("strong");

  element.className = "hud-metric";
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
