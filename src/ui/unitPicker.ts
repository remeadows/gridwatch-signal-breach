import type { GameState, PlayerTool, UnitKind } from "../sim/types";
import { svgIcon } from "./iconsSvg";
import { getToolAvailability, TOOL_INFO } from "./toolInfo";

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

export function renderUnitPicker(options: UnitPickerOptions): void {
  const { root, state, selectedTool, onSelect } = options;
  const toolsKey = state.config.toolsUnlocked.join(",");
  root.className = "unit-picker";
  root.dataset.toolCount = String(state.config.toolsUnlocked.length);

  if (root.dataset.ready !== toolsKey) {
    root.innerHTML = "";

    for (const unit of state.config.toolsUnlocked.filter(isUnitTool)) {
      const button = document.createElement("button");
      const name = document.createElement("span");
      const purpose = document.createElement("span");
      const cost = document.createElement("span");
      const info = TOOL_INFO[unit];

      button.type = "button";
      button.dataset.tool = unit;
      button.insertAdjacentHTML("afterbegin", svgIcon(unit, 28, "tool-icon"));
      name.className = "tool-name";
      name.textContent = UNIT_LABELS[unit];
      purpose.className = "tool-purpose";
      purpose.textContent = info.purpose;
      cost.className = "tool-cost";
      cost.dataset.toolCost = "true";
      button.append(name, purpose, cost);
      button.addEventListener("click", () => onSelect(unit));
      root.append(button);
    }

    if (state.config.toolsUnlocked.includes("sell")) {
      const sellButton = document.createElement("button");
      const sellName = document.createElement("span");
      const sellPurpose = document.createElement("span");
      const sellCost = document.createElement("span");
      sellButton.type = "button";
      sellButton.dataset.tool = "sell";
      sellButton.insertAdjacentHTML("afterbegin", svgIcon("sell", 28, "tool-icon"));
      sellName.className = "tool-name";
      sellName.textContent = "Sell";
      sellPurpose.className = "tool-purpose";
      sellPurpose.textContent = TOOL_INFO.sell.purpose;
      sellCost.className = "tool-cost";
      sellCost.dataset.toolCost = "true";
      sellCost.textContent = "refund";
      sellButton.append(sellName, sellPurpose, sellCost);
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

    const costElement = button.querySelector<HTMLElement>("[data-tool-cost]");
    const availability = getToolAvailability(state, unit);
    const info = TOOL_INFO[unit];

    const selected = selectedTool === unit;
    button.className = selected ? "tool-button selected" : "tool-button";
    button.setAttribute("aria-pressed", String(selected));
    button.disabled = !availability.enabled;
    button.title = availability.reason
      ? `${info.description} ${availability.reason}.`
      : `${info.description} Costs ${state.config.units[unit].cost} bandwidth.`;
    button.setAttribute(
      "aria-label",
      `${info.label}. ${info.description} ${availability.costLabel}${availability.reason ? `. ${availability.reason}` : ""}`,
    );

    if (costElement) {
      costElement.textContent = availability.costLabel;
    }
  }

  const sellButton = root.querySelector<HTMLButtonElement>('button[data-tool="sell"]');
  if (!sellButton) {
    return;
  }

  const sellSelected = selectedTool === "sell";
  const sellAvailability = getToolAvailability(state, "sell");
  const sellCost = sellButton.querySelector<HTMLElement>("[data-tool-cost]");
  sellButton.className = sellSelected ? "tool-button selected" : "tool-button";
  sellButton.setAttribute("aria-pressed", String(sellSelected));
  sellButton.disabled = !sellAvailability.enabled;
  sellButton.title = TOOL_INFO.sell.description;
  sellButton.setAttribute(
    "aria-label",
    `${TOOL_INFO.sell.label}. ${TOOL_INFO.sell.description} ${sellAvailability.costLabel}.`,
  );
  if (sellCost) {
    // The dock already labels the action as Sell; omitting the repeated word
    // "refund" keeps FULL/PARTIAL legible in the 568x320 landscape layout.
    sellCost.textContent = sellAvailability.costLabel.replace(" REFUND", "");
  }
}

function isUnitTool(tool: PlayerTool): tool is UnitKind {
  return tool !== "sell";
}
