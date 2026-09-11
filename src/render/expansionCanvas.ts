import type { BoardMetrics } from "./canvas";
import type { GridPosition } from "../sim/types";

/** Reserve CSS-space controls without changing the original renderer's metrics. */
export function getExpansionBoardMetrics(canvas: Pick<HTMLCanvasElement, "width" | "height" | "getBoundingClientRect">): BoardMetrics {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / Math.max(1, rect.width);
  const scaleY = canvas.height / Math.max(1, rect.height);
  const top = 62 * scaleY;
  const bottom = 30 * scaleY;
  const boardSize = Math.max(8, Math.min(canvas.width - 8 * scaleX, canvas.height - top - bottom));
  return { originX: (canvas.width - boardSize) / 2, originY: top + (canvas.height - top - bottom - boardSize) / 2, boardSize, tileSize: boardSize / 8 };
}

export function getExpansionGridPositionFromClientPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number): GridPosition | null {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const metrics = getExpansionBoardMetrics(canvas);
  const x = (clientX - rect.left) * canvas.width / rect.width - metrics.originX;
  const y = (clientY - rect.top) * canvas.height / rect.height - metrics.originY;
  if (x < 0 || y < 0 || x >= metrics.boardSize || y >= metrics.boardSize) return null;
  return { x: Math.floor(x / metrics.tileSize), y: Math.floor(y / metrics.tileSize) };
}
