import { getExpansionGridPositionFromClientPoint } from "../render/expansionCanvas";
import type { ExpansionGameState, ExpansionPlayerTool, ExpansionSimCommand } from "../sim/expansion/types";
import type { GridPosition } from "../sim/types";

export function installExpansionPointerInput(options: Readonly<{
  canvas: HTMLCanvasElement;
  getState: () => ExpansionGameState;
  getSelectedTool: () => ExpansionPlayerTool;
  dispatch: (command: ExpansionSimCommand) => void;
  isEnabled: () => boolean;
  onHover: (position: GridPosition | null) => void;
  isRangePreviewEnabled: () => boolean;
  onRangePreview: (position: GridPosition) => void;
}>): void {
  let down: { id: number; x: number; y: number; preview: boolean } | null = null;
  options.canvas.addEventListener("pointermove", (event) => {
    if (!options.isEnabled() || event.pointerType !== "mouse") return options.onHover(null);
    options.onHover(getExpansionGridPositionFromClientPoint(options.canvas, event.clientX, event.clientY));
  });
  options.canvas.addEventListener("pointerleave", () => options.onHover(null));
  options.canvas.addEventListener("pointerdown", (event) => {
    if (!options.isEnabled() || !event.isPrimary || event.button !== 0 || down) return;
    if (event.pointerType !== "mouse") event.preventDefault();
    down = { id: event.pointerId, x: event.clientX, y: event.clientY, preview: options.isRangePreviewEnabled() };
    options.canvas.setPointerCapture(event.pointerId);
  });
  options.canvas.addEventListener("pointerup", (event) => {
    const start = down;
    down = null;
    if (!start || start.id !== event.pointerId || !options.isEnabled() || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) return;
    const position = getExpansionGridPositionFromClientPoint(options.canvas, event.clientX, event.clientY);
    if (!position || ["won", "lost"].includes(options.getState().phase)) return;
    // A gesture that began as inspection must never become a purchase, even
    // if another pointer or the keyboard exits preview before release.
    if (start.preview || options.isRangePreviewEnabled()) {
      options.onRangePreview(position);
      return;
    }
    const tool = options.getSelectedTool();
    options.dispatch(tool === "sell" ? { type: "sellUnit", position } : { type: "placeUnit", position, unit: tool });
  });
  options.canvas.addEventListener("pointercancel", () => { down = null; });
}
