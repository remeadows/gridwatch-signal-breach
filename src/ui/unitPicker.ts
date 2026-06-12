import { BRIEFING_UNITS } from "../data/briefing";
import type { GameState, PlayerTool, UnitKind } from "../sim/types";
import { svgIcon } from "./iconsSvg";

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
  scrubber: "Scrubber",
  overclock: "Overclock",
};

const UNIT_TOOLTIPS: Readonly<Record<UnitKind, string>> = {
  relay: BRIEFING_UNITS.find((unit) => unit.kind === "relay")?.summary ?? "",
  firewall: BRIEFING_UNITS.find((unit) => unit.kind === "firewall")?.summary ?? "",
  turret: BRIEFING_UNITS.find((unit) => unit.kind === "turret")?.summary ?? "",
  scrubber: "Cleanses a corrupted tile - place ON corruption.",
  overclock: "Amplifier node for adjacent ICE turrets.",
};

export function renderUnitPicker(options: UnitPickerOptions): void {
  const { root, state, selectedTool, onSelect } = options;
  const toolsKey = state.config.toolsUnlocked.join(",");
  root.className = "unit-picker";

  if (root.dataset.ready !== toolsKey) {
    root.innerHTML = "";

    for (const unit of state.config.toolsUnlocked.filter(isUnitTool)) {
      const button = document.createElement("button");
      const name = document.createElement("span");
      const cost = document.createElement("span");

      button.type = "button";
      button.dataset.tool = unit;
      button.title = UNIT_TOOLTIPS[unit];
      button.insertAdjacentHTML("afterbegin", svgIcon(unit, 28, "tool-icon"));
      name.className = "tool-name";
      name.textContent = UNIT_LABELS[unit];
      cost.className = "tool-cost";
      cost.dataset.toolCost = "true";
      button.append(name, cost);
      button.addEventListener("click", () => onSelect(unit));
      root.append(button);
    }

    if (state.config.toolsUnlocked.includes("sell")) {
      const sellButton = document.createElement("button");
      const sellName = document.createElement("span");
      const sellCost = document.createElement("span");
      sellButton.type = "button";
      sellButton.dataset.tool = "sell";
      sellButton.title = "Sell a placed unit for its refund value.";
      sellButton.insertAdjacentHTML("afterbegin", svgIcon("sell", 28, "tool-icon"));
      sellName.className = "tool-name";
      sellName.textContent = "Sell";
      sellCost.className = "tool-cost";
      sellCost.dataset.toolCost = "true";
      sellCost.textContent = "refund";
      sellButton.append(sellName, sellCost);
      sellButton.addEventListener("click", () => onSelect("sell"));
      root.append(sellButton);
    }

    root.dataset.ready = toolsKey;
  }

  for (const unit of state.config.toolsUnlocked.filter(isUnitTool)) {
    const button = root.querySelector<HTMLButtonElement>(`button[data-tool="${unit}"]`);
    if (!button) {
      continue;
    }

    const cost = state.config.units[unit].cost;
    const costElement = button.querySelector<HTMLElement>("[data-tool-cost]");

    button.className = selectedTool === unit ? "tool-button selected" : "tool-button";
    button.disabled =
      state.phase === "won" ||
      state.phase === "lost" ||
      state.bandwidth < cost ||
      (unit === "scrubber" && !hasCorruptedTile(state));

    if (costElement) {
      costElement.textContent = String(cost);
    }
  }

  const sellButton = root.querySelector<HTMLButtonElement>('button[data-tool="sell"]');
  if (!sellButton) {
    return;
  }

  sellButton.className = selectedTool === "sell" ? "tool-button selected" : "tool-button";
  sellButton.disabled = state.phase === "won" || state.phase === "lost";
}

function isUnitTool(tool: PlayerTool): tool is UnitKind {
  return tool !== "sell";
}

function hasCorruptedTile(state: GameState): boolean {
  return state.grid.tiles.some((tile) => tile.kind === "corrupted");
}
