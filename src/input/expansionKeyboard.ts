import type {
  ExpansionGameState,
  ExpansionPlayerTool,
  ExpansionSimCommand,
} from "../sim/expansion/types";
import type { GridPosition } from "../sim/types";

const MOVEMENT_KEYS: Readonly<Record<string, GridPosition>> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowRight: { x: 1, y: 0 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
};

export function installExpansionKeyboardInput(options: Readonly<{
  canvas: HTMLCanvasElement;
  getState: () => ExpansionGameState;
  getSelectedTool: () => ExpansionPlayerTool;
  dispatch: (command: ExpansionSimCommand) => void;
  isEnabled: () => boolean;
  onFocus: (position: GridPosition | null) => void;
}>): void {
  let focused: GridPosition = { x: 1, y: 1 };
  options.canvas.tabIndex = 0;
  options.canvas.setAttribute(
    "aria-label",
    "Expansion grid. Use arrow keys to move, Enter or Space to use the selected tool, and Delete to sell.",
  );

  options.canvas.addEventListener("focus", () => options.onFocus(focused));
  options.canvas.addEventListener("blur", () => options.onFocus(null));
  options.canvas.addEventListener("keydown", (event) => {
    const movement = MOVEMENT_KEYS[event.key];
    if (movement) {
      event.preventDefault();
      event.stopPropagation();
      const size = options.getState().grid.size;
      focused = {
        x: clamp(focused.x + movement.x, 0, size - 1),
        y: clamp(focused.y + movement.y, 0, size - 1),
      };
      options.onFocus(focused);
      return;
    }

    if (!options.isEnabled()) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      dispatchSelectedTool(options, focused);
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      event.stopPropagation();
      options.dispatch({ type: "sellUnit", position: focused });
    }
  });
}

function dispatchSelectedTool(
  options: Readonly<{
    getSelectedTool: () => ExpansionPlayerTool;
    dispatch: (command: ExpansionSimCommand) => void;
  }>,
  position: GridPosition,
): void {
  const tool = options.getSelectedTool();
  options.dispatch(
    tool === "sell"
      ? { type: "sellUnit", position }
      : { type: "placeUnit", position, unit: tool },
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
