import { GRID_SIZE } from "../data/level";
import type { GridPosition } from "../sim/types";

export type CanvasSize = {
  width: number;
  height: number;
};

export type BoardMetrics = Readonly<{
  originX: number;
  originY: number;
  boardSize: number;
  tileSize: number;
}>;

const BOARD_PADDING = 44;

export function getBoardMetrics(size: CanvasSize): BoardMetrics {
  const boardSize = Math.min(size.width, size.height) - BOARD_PADDING * 2;

  return {
    originX: (size.width - boardSize) / 2,
    originY: (size.height - boardSize) / 2,
    boardSize,
    tileSize: boardSize / GRID_SIZE,
  };
}

export function getGridPositionFromClientPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): GridPosition | null {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const canvasX = (clientX - rect.left) * scaleX;
  const canvasY = (clientY - rect.top) * scaleY;
  const metrics = getBoardMetrics({
    width: canvas.width,
    height: canvas.height,
  });

  if (
    canvasX < metrics.originX ||
    canvasY < metrics.originY ||
    canvasX >= metrics.originX + metrics.boardSize ||
    canvasY >= metrics.originY + metrics.boardSize
  ) {
    return null;
  }

  return {
    x: Math.floor((canvasX - metrics.originX) / metrics.tileSize),
    y: Math.floor((canvasY - metrics.originY) / metrics.tileSize),
  };
}
