import type { GameState, PlayerTool, UnitKind } from "../sim/types";

export type UnitPickerOptions = Readonly<{
  root: HTMLElement;
  state: GameState;
  selectedTool: PlayerTool;
  onSelect: (tool: PlayerTool) => void;
}>;

const UNIT_LABELS: Readonly<Record<UnitKind, string>> = {
  relay: "Relay",
  firewall: "Firewall",
  turret: "ICE",
};

export function renderUnitPicker(options: UnitPickerOptions): void {
  const { root, state, selectedTool, onSelect } = options;
  root.className = "unit-picker";

  if (!root.dataset.ready) {
    root.innerHTML = "";

    for (const unit of Object.keys(UNIT_LABELS) as UnitKind[]) {
      const button = document.createElement("button");

      button.type = "button";
      button.dataset.tool = unit;
      button.addEventListener("click", () => onSelect(unit));
      root.append(button);
    }

    const sellButton = document.createElement("button");
    sellButton.type = "button";
    sellButton.dataset.tool = "sell";
    sellButton.addEventListener("click", () => onSelect("sell"));
    root.append(sellButton);
    root.dataset.ready = "true";
  }

  for (const unit of Object.keys(UNIT_LABELS) as UnitKind[]) {
    const button = root.querySelector<HTMLButtonElement>(`button[data-tool="${unit}"]`);
    if (!button) {
      continue;
    }

    const cost = state.config.units[unit].cost;

    button.className = selectedTool === unit ? "tool-button selected" : "tool-button";
    button.disabled = state.phase === "won" || state.phase === "lost" || state.bandwidth < cost;
    button.textContent = `${UNIT_LABELS[unit]} ${cost}`;
  }

  const sellButton = root.querySelector<HTMLButtonElement>('button[data-tool="sell"]');
  if (!sellButton) {
    return;
  }

  sellButton.className = selectedTool === "sell" ? "tool-button selected" : "tool-button";
  sellButton.disabled = state.phase === "won" || state.phase === "lost";
  sellButton.textContent = "Sell";
}
