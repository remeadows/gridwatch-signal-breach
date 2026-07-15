import { getGridPositionFromClientPoint } from "../render/canvas";
import type { SimCommand } from "../sim/commands";
import type { GameState, GridPosition, PlayerTool } from "../sim/types";

export type PointerInputOptions = Readonly<{
  canvas: HTMLCanvasElement;
  getState: () => GameState;
  getSelectedTool: () => PlayerTool;
  dispatch: (command: SimCommand) => void;
  isEnabled: () => boolean;
  onHover: (position: GridPosition | null) => void;
}>;

const TAP_MOVE_TOLERANCE_PX = 10;

export function installPointerInput(options: PointerInputOptions): void {
  let activePointerId: number | null = null;
  let pointerStart: Readonly<{ x: number; y: number }> | null = null;
  let pointerMoved = false;

  options.canvas.addEventListener("pointermove", (event) => {
    if (event.pointerId === activePointerId && pointerStart) {
      const distance = Math.hypot(
        event.clientX - pointerStart.x,
        event.clientY - pointerStart.y,
      );

      if (distance > TAP_MOVE_TOLERANCE_PX) {
        pointerMoved = true;
      }
    }

    if (!options.isEnabled() || event.pointerType !== "mouse") {
      options.onHover(null);
      return;
    }

    options.onHover(
      getGridPositionFromClientPoint(options.canvas, event.clientX, event.clientY),
    );
  });

  options.canvas.addEventListener("pointerleave", () => {
    if (activePointerId === null) {
      options.onHover(null);
    }
  });

  options.canvas.addEventListener("pointerdown", (event) => {
    if (
      !options.isEnabled() ||
      !event.isPrimary ||
      event.button !== 0 ||
      activePointerId !== null
    ) {
      return;
    }

    if (event.pointerType !== "mouse") {
      event.preventDefault();
    }

    activePointerId = event.pointerId;
    pointerStart = { x: event.clientX, y: event.clientY };
    pointerMoved = false;
    options.canvas.setPointerCapture(event.pointerId);
  });

  options.canvas.addEventListener("pointerup", (event) => {
    if (event.pointerId !== activePointerId) {
      return;
    }

    const shouldDispatch =
      options.isEnabled() &&
      !pointerMoved &&
      event.isPrimary &&
      event.button === 0;

    releaseActivePointer(event.pointerId);

    if (!shouldDispatch) {
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

  options.canvas.addEventListener("pointercancel", (event) => {
    if (event.pointerId === activePointerId) {
      releaseActivePointer(event.pointerId);
    }
  });

  options.canvas.addEventListener("lostpointercapture", (event) => {
    if (event.pointerId === activePointerId) {
      clearActivePointer();
    }
  });

  function releaseActivePointer(pointerId: number): void {
    if (options.canvas.hasPointerCapture(pointerId)) {
      options.canvas.releasePointerCapture(pointerId);
    }

    clearActivePointer();
  }

  function clearActivePointer(): void {
    activePointerId = null;
    pointerStart = null;
    pointerMoved = false;
    options.onHover(null);
  }
}
