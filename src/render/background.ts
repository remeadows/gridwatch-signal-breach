import { GRID_SIZE } from "../data/level";
import type { CanvasSize } from "./canvas";
import { getBoardMetrics } from "./canvas";
import { hashTile } from "./animator";

const backgroundCache = new Map<string, HTMLCanvasElement>();

export function getBoardBackgroundLayer(size: CanvasSize): HTMLCanvasElement {
  const key = `${size.width}:${size.height}`;
  const cached = backgroundCache.get(key);

  if (cached) {
    return cached;
  }

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext("2d");
  if (context) {
    drawBackgroundLayer(context, size);
  }

  backgroundCache.set(key, canvas);

  return canvas;
}

export function clearBackgroundCache(): void {
  backgroundCache.clear();
}

function drawBackgroundLayer(
  context: CanvasRenderingContext2D,
  size: CanvasSize,
): void {
  const { originX, originY, boardSize, tileSize } = getBoardMetrics(size);

  drawBackdrop(context, size);
  drawCircuitTexture(context, originX, originY, tileSize);
  drawGridLines(context, originX, originY, boardSize, tileSize);
  drawCornerBrackets(context, originX, originY, boardSize, tileSize);
  drawVignette(context, size);
}

function drawBackdrop(context: CanvasRenderingContext2D, size: CanvasSize): void {
  const gradient = context.createLinearGradient(0, 0, size.width, size.height);
  gradient.addColorStop(0, "#09141c");
  gradient.addColorStop(0.5, "#071018");
  gradient.addColorStop(1, "#0d1018");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size.width, size.height);
}

function drawCircuitTexture(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileSize: number,
): void {
  context.save();
  context.lineWidth = 1;

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const hash = hashTile(x, y);
      const left = originX + x * tileSize;
      const top = originY + y * tileSize;
      const startX = left + tileSize * (0.2 + ((hash & 3) * 0.08));
      const startY = top + tileSize * (0.2 + (((hash >> 2) & 3) * 0.08));
      const midX = left + tileSize * (0.42 + (((hash >> 4) & 3) * 0.09));
      const endY = top + tileSize * (0.48 + (((hash >> 6) & 3) * 0.08));
      const viaX = left + tileSize * (0.24 + (((hash >> 8) & 3) * 0.13));
      const viaY = top + tileSize * (0.24 + (((hash >> 10) & 3) * 0.13));

      context.strokeStyle =
        (hash & 1) === 0
          ? "rgba(120, 255, 238, 0.07)"
          : "rgba(255, 79, 145, 0.05)";
      context.beginPath();
      context.moveTo(startX, startY);
      context.lineTo(midX, startY);
      context.lineTo(midX, endY);
      context.stroke();

      context.fillStyle = "rgba(120, 255, 238, 0.1)";
      context.beginPath();
      context.arc(viaX, viaY, Math.max(1, tileSize * 0.025), 0, Math.PI * 2);
      context.fill();
    }
  }

  context.restore();
}

function drawGridLines(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  boardSize: number,
  tileSize: number,
): void {
  context.strokeStyle = "rgba(117, 255, 235, 0.18)";
  context.lineWidth = 1;

  for (let index = 0; index <= GRID_SIZE; index += 1) {
    const offset = index * tileSize;

    context.beginPath();
    context.moveTo(originX + offset, originY);
    context.lineTo(originX + offset, originY + boardSize);
    context.stroke();

    context.beginPath();
    context.moveTo(originX, originY + offset);
    context.lineTo(originX + boardSize, originY + offset);
    context.stroke();
  }

  context.strokeStyle = "rgba(215, 255, 247, 0.62)";
  context.lineWidth = 2;
  context.strokeRect(originX, originY, boardSize, boardSize);
}

function drawCornerBrackets(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  boardSize: number,
  tileSize: number,
): void {
  const length = tileSize * 0.44;
  const corners = [
    { x: originX, y: originY, sx: 1, sy: 1 },
    { x: originX + boardSize, y: originY, sx: -1, sy: 1 },
    { x: originX, y: originY + boardSize, sx: 1, sy: -1 },
    { x: originX + boardSize, y: originY + boardSize, sx: -1, sy: -1 },
  ] as const;

  context.strokeStyle = "rgba(34, 224, 196, 0.45)";
  context.lineWidth = 3;

  for (const corner of corners) {
    context.beginPath();
    context.moveTo(corner.x, corner.y + corner.sy * length);
    context.lineTo(corner.x, corner.y);
    context.lineTo(corner.x + corner.sx * length, corner.y);
    context.stroke();
  }
}

function drawVignette(context: CanvasRenderingContext2D, size: CanvasSize): void {
  const radius = Math.max(size.width, size.height) * 0.72;
  const vignette = context.createRadialGradient(
    size.width / 2,
    size.height / 2,
    radius * 0.2,
    size.width / 2,
    size.height / 2,
    radius,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.38)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, size.width, size.height);
}
