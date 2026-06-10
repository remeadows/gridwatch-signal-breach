import { getGridPositionFromClientPoint } from "../render/canvas";
import type { SimCommand } from "../sim/commands";
import type { GameState, PlayerTool } from "../sim/types";

export type PointerInputOptions = Readonly<{
  canvas: HTMLCanvasElement;
  getState: () => GameState;
  getSelectedTool: () => PlayerTool;
  dispatch: (command: SimCommand) => void;
  isEnabled: () => boolean;
}>;

export function installPointerInput(options: PointerInputOptions): void {
  options.canvas.addEventListener("pointerdown", (event) => {
    if (!options.isEnabled()) {
      return;
    }

    const state = options.getState();

    if (state.phase === "won" || state.phase === "lost") {
      return;
    }

    const position = getGridPositionFromClientPoint(
      options.canvas,
      event.clientX,
      event.clientY,
    );

    if (!position) {
      return;
    }

    const tool = options.getSelectedTool();
    options.dispatch(
      tool === "sell"
        ? {
            type: "sellUnit",
            position,
          }
        : {
            type: "placeUnit",
            position,
            unit: tool,
          },
    );
  });
}
