import { GRID_SIZE } from "../data/levels";
import type { CanvasSize } from "./canvas";
import { getBoardMetrics } from "./canvas";
import { hashTile } from "./animator";
import {
  getSectorVisualTheme,
  type EffectsQuality,
  type SectorVisualTheme,
} from "./visualTheme";

const backgroundCache = new Map<string, HTMLCanvasElement>();

export function getBoardBackgroundLayer(
  size: CanvasSize,
  sectorId: number,
  quality: EffectsQuality,
): HTMLCanvasElement {
  const key = `${size.width}:${size.height}:${sectorId}:${quality}`;
  const cached = backgroundCache.get(key);

  if (cached) {
    return cached;
  }

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext("2d");
  if (context) {
    drawBackgroundLayer(context, size, sectorId, quality);
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
  sectorId: number,
  quality: EffectsQuality,
): void {
  const { originX, originY, boardSize, tileSize } = getBoardMetrics(size);
  const theme = getSectorVisualTheme(sectorId);

  drawBackdrop(context, size, theme);
  drawSectorFloor(context, originX, originY, boardSize, tileSize, theme, quality);
  drawCircuitTexture(context, originX, originY, tileSize, quality);
  drawGridLines(context, originX, originY, boardSize, tileSize, theme);
  drawCornerBrackets(context, originX, originY, boardSize, tileSize, theme);
  drawVignette(context, size);
}

function drawBackdrop(
  context: CanvasRenderingContext2D,
  size: CanvasSize,
  theme: SectorVisualTheme,
): void {
  const gradient = context.createLinearGradient(0, 0, size.width, size.height);
  gradient.addColorStop(0, theme.backgroundStart);
  gradient.addColorStop(0.5, theme.backgroundMid);
  gradient.addColorStop(1, theme.backgroundEnd);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size.width, size.height);
}

function drawSectorFloor(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  boardSize: number,
  tileSize: number,
  theme: SectorVisualTheme,
  quality: EffectsQuality,
): void {
  context.save();
  context.beginPath();
  context.rect(originX, originY, boardSize, boardSize);
  context.clip();

  if (theme.floor === "lanes") {
    const laneCount = quality === "high" ? 8 : 4;
    context.lineWidth = Math.max(1, tileSize * 0.025);

    for (let index = 0; index < laneCount; index += 1) {
      const offset = ((index + 0.5) / laneCount) * boardSize;
      context.strokeStyle =
        index % 2 === 0 ? "rgba(34, 224, 196, 0.075)" : "rgba(255, 79, 145, 0.05)";
      context.beginPath();
      context.moveTo(originX, originY + offset);
      context.lineTo(originX + boardSize, originY + offset - tileSize * 0.45);
      context.stroke();
    }
  } else if (theme.floor === "canyon") {
    const fractureCount = quality === "high" ? 11 : 6;
    context.lineCap = "round";

    for (let index = 0; index < fractureCount; index += 1) {
      const hash = hashTile(index, 17);
      const startX = originX + ((hash & 255) / 255) * boardSize;
      const drift = (((hash >> 8) & 127) / 127 - 0.5) * tileSize * 1.8;
      context.strokeStyle =
        index % 3 === 0 ? "rgba(255, 137, 76, 0.08)" : "rgba(98, 199, 225, 0.07)";
      context.lineWidth = index % 3 === 0 ? 2 : 1;
      context.beginPath();
      context.moveTo(startX, originY - tileSize);
      context.lineTo(startX + drift, originY + boardSize * 0.36);
      context.lineTo(startX - drift * 0.45, originY + boardSize * 0.7);
      context.lineTo(startX + drift * 0.72, originY + boardSize + tileSize);
      context.stroke();
    }
  } else {
    const centerX = originX + boardSize / 2;
    const centerY = originY + boardSize / 2;
    const ringCount = quality === "high" ? 7 : 4;

    for (let index = 1; index <= ringCount; index += 1) {
      context.strokeStyle =
        index % 2 === 0 ? "rgba(182, 140, 255, 0.07)" : "rgba(255, 41, 87, 0.045)";
      context.lineWidth = index % 2 === 0 ? 2 : 1;
      context.beginPath();
      context.arc(centerX, centerY, (boardSize * 0.1 * index), 0, Math.PI * 2);
      context.stroke();
    }

    context.strokeStyle = "rgba(182, 140, 255, 0.06)";
    context.beginPath();
    context.moveTo(centerX, originY);
    context.lineTo(centerX, originY + boardSize);
    context.moveTo(originX, centerY);
    context.lineTo(originX + boardSize, centerY);
    context.stroke();
  }

  context.restore();
}

function drawCircuitTexture(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileSize: number,
  quality: EffectsQuality,
): void {
  context.save();
  context.lineWidth = 1;
  const stride = quality === "high" ? 1 : 2;

  for (let y = 0; y < GRID_SIZE; y += stride) {
    for (let x = 0; x < GRID_SIZE; x += stride) {
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
  theme: SectorVisualTheme,
): void {
  context.strokeStyle = theme.grid;
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
  theme: SectorVisualTheme,
): void {
  const length = tileSize * 0.44;
  const corners = [
    { x: originX, y: originY, sx: 1, sy: 1 },
    { x: originX + boardSize, y: originY, sx: -1, sy: 1 },
    { x: originX, y: originY + boardSize, sx: 1, sy: -1 },
    { x: originX + boardSize, y: originY + boardSize, sx: -1, sy: -1 },
  ] as const;

  context.strokeStyle = theme.accent;
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
