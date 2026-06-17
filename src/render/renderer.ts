import { GRID_SIZE } from "../data/levels";
import { getOrthogonalNeighbors, getTile, getTileKind } from "../sim/grid";
import type {
  EnemyKind,
  GameState,
  GridPosition,
  PlayerTool,
  SignalState,
  SimEvent,
  TileKind,
  UnitKind,
} from "../sim/types";
import {
  hashTile,
  pointAlongPolyline,
  polylineLength,
  pulse01,
} from "./animator";
import { getBoardBackgroundLayer } from "./background";
import { type CanvasSize, getBoardMetrics } from "./canvas";
import { ICONS, type IconName } from "./iconPaths";
import { drawIcon, getGlowSprite } from "./icons";

export type RenderFrame = {
  interpolationAlpha: number;
  flashAlpha: number;
  shakeMagnitude: number;
  timeMs: number;
  hover: GridPosition | null;
  selectedTool: PlayerTool;
};

const DEFAULT_RENDER_FRAME: RenderFrame = {
  interpolationAlpha: 1,
  flashAlpha: 0,
  shakeMagnitude: 0,
  timeMs: 0,
  hover: null,
  selectedTool: "relay",
};

export function drawGrid(
  context: CanvasRenderingContext2D,
  size: CanvasSize,
  state: GameState,
  frame: RenderFrame = DEFAULT_RENDER_FRAME,
): void {
  const { originX, originY, tileSize } = getBoardMetrics(size);
  const shake = getShakeOffset(state, frame);

  context.clearRect(0, 0, size.width, size.height);
  context.drawImage(getBoardBackgroundLayer(size), 0, 0);
  context.save();
  context.translate(shake.x, shake.y);
  drawTiles(context, originX, originY, tileSize, state, frame);
  drawOverclockLinks(context, originX, originY, tileSize, state, frame);
  drawCorruptionFlashes(context, originX, originY, tileSize, state.events, frame);
  drawSignalRoute(context, originX, originY, tileSize, state.signal, frame);
  drawRouteCuts(context, originX, originY, tileSize, state.events, frame);
  drawMarkers(context, originX, originY, tileSize, state, frame);
  drawHoverGhost(context, originX, originY, tileSize, state, frame);
  drawHitFlashes(context, originX, originY, tileSize, state, frame);
  drawIntrusions(context, originX, originY, tileSize, state, frame);
  drawStatus(context, size, state);
  context.restore();
}

export function drawAmbientBackdrop(
  context: CanvasRenderingContext2D,
  size: CanvasSize,
  timeMs: number,
): void {
  const { originX, originY, boardSize, tileSize } = getBoardMetrics(size);
  const pulse = (timeMs * 0.04) % (boardSize + tileSize * 2);

  context.clearRect(0, 0, size.width, size.height);
  context.drawImage(getBoardBackgroundLayer(size), 0, 0);

  context.save();
  context.globalAlpha = 0.72;
  context.strokeStyle = "rgba(120, 255, 238, 0.13)";
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

  context.strokeStyle = "rgba(34, 224, 196, 0.34)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(originX - tileSize + pulse, originY + tileSize * 0.5);
  context.lineTo(originX + pulse, originY + tileSize * 0.5);
  context.lineTo(originX + pulse, originY + boardSize - tileSize * 0.5);
  context.stroke();

  context.strokeStyle = "rgba(255, 79, 145, 0.18)";
  context.lineWidth = 1;
  for (let y = 0; y < GRID_SIZE; y += 2) {
    const rowY = originY + y * tileSize + tileSize * 0.5;
    const drift = (timeMs * 0.015 + y * tileSize) % boardSize;
    context.beginPath();
    context.moveTo(originX + drift - tileSize, rowY);
    context.lineTo(originX + drift + tileSize * 1.5, rowY);
    context.stroke();
  }

  context.strokeStyle = "rgba(215, 255, 247, 0.22)";
  context.lineWidth = 2;
  context.strokeRect(originX, originY, boardSize, boardSize);
  context.restore();
}

function drawTiles(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileSize: number,
  state: GameState,
  frame: RenderFrame,
): void {
  for (let y = 0; y < state.grid.size; y += 1) {
    for (let x = 0; x < state.grid.size; x += 1) {
      const position = { x, y };
      const tile = getTile(state.grid, position);
      const kind = tile.kind;
      const inset = 3;

      if (kind === "corrupted") {
        drawCorruptedTile(context, originX, originY, tileSize, position, frame);
      } else if (kind === "void") {
        drawVoidTile(context, originX, originY, tileSize, position);
      } else {
        context.fillStyle = getTileFill(kind, x, y);
        context.fillRect(
          originX + x * tileSize + inset,
          originY + y * tileSize + inset,
          tileSize - inset * 2,
          tileSize - inset * 2,
        );
      }

      drawTileUnitIcon(context, originX, originY, tileSize, position, kind);
      drawUnitHpPips(context, originX, originY, tileSize, state, position, kind, tile.hp);
    }
  }
}

function drawOverclockLinks(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileSize: number,
  state: GameState,
  frame: RenderFrame,
): void {
  const pulse = 0.5 + pulse01(frame.timeMs, 1100) * 0.28;

  context.save();
  context.lineCap = "round";

  for (let y = 0; y < state.grid.size; y += 1) {
    for (let x = 0; x < state.grid.size; x += 1) {
      const position = { x, y };

      if (getTileKind(state.grid, position) !== "overclock") {
        continue;
      }

      const from = getTileCenter(originX, originY, tileSize, position);

      for (const neighbor of getOrthogonalNeighbors(state.grid, position)) {
        if (getTileKind(state.grid, neighbor) !== "turret") {
          continue;
        }

        const to = getTileCenter(originX, originY, tileSize, neighbor);
        context.strokeStyle = `rgba(242, 201, 76, ${pulse})`;
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();

        context.strokeStyle = `rgba(255, 241, 168, ${0.24 + pulse * 0.22})`;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
      }
    }
  }

  context.restore();
}

function drawVoidTile(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileSize: number,
  position: GridPosition,
): void {
  const left = originX + position.x * tileSize + 3;
  const top = originY + position.y * tileSize + 3;
  const size = tileSize - 6;
  const hash = hashTile(position.x, position.y);

  context.fillStyle = "#05080c";
  context.fillRect(left, top, size, size);
  context.strokeStyle = "rgba(120, 255, 238, 0.1)";
  context.lineWidth = 1;
  context.strokeRect(left + 1, top + 1, size - 2, size - 2);

  context.strokeStyle =
    (hash & 1) === 0
      ? "rgba(242, 201, 76, 0.26)"
      : "rgba(255, 79, 145, 0.22)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(left + size * 0.18, top + size * 0.72);
  context.lineTo(left + size * 0.72, top + size * 0.18);
  context.moveTo(left + size * 0.36, top + size * 0.88);
  context.lineTo(left + size * 0.88, top + size * 0.36);
  context.stroke();
}

function drawCorruptedTile(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileSize: number,
  position: GridPosition,
  frame: RenderFrame,
): void {
  const left = originX + position.x * tileSize + 3;
  const top = originY + position.y * tileSize + 3;
  const size = tileSize - 6;
  const hash = hashTile(position.x, position.y);
  const flickerStep = Math.floor(frame.timeMs / 120);

  context.fillStyle = "#35131e";
  context.fillRect(left, top, size, size);

  context.fillStyle = "rgba(255, 79, 145, 0.18)";
  for (let index = 0; index < 3; index += 1) {
    const rowSeed = hash + flickerStep * 97 + index * 53;
    const y = top + ((rowSeed >>> 3) % Math.max(1, Math.floor(size - 4)));
    const x = left + ((rowSeed >>> 7) % Math.max(1, Math.floor(size * 0.25)));
    const width = size * (0.42 + ((rowSeed >>> 11) & 3) * 0.1);
    context.fillRect(x, y, width, 2);
  }

  context.strokeStyle = "rgba(255, 95, 110, 0.44)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(left + size * 0.24, top + size * 0.24);
  context.lineTo(left + size * 0.76, top + size * 0.76);
  context.moveTo(left + size * 0.76, top + size * 0.24);
  context.lineTo(left + size * 0.24, top + size * 0.76);
  context.stroke();
}

function drawMarkers(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileSize: number,
  state: GameState,
  frame: RenderFrame,
): void {
  const markers = [
    {
      label: "SRC",
      icon: "source",
      position: state.config.source,
    },
    {
      label: "CORE",
      icon: "core",
      position: state.config.core,
    },
  ] satisfies readonly {
    label: string;
    icon: IconName;
    position: GridPosition;
  }[];

  for (const marker of markers) {
    const centerX = originX + marker.position.x * tileSize + tileSize / 2;
    const centerY = originY + marker.position.y * tileSize + tileSize * 0.45;
    const iconSize = tileSize * 0.5;
    const sprite = getGlowSprite(marker.icon, iconSize);
    const tileLeft = originX + marker.position.x * tileSize + 4;
    const tileTop = originY + marker.position.y * tileSize + 4;
    const iconColor = ICONS[marker.icon].color;

    context.fillStyle = "rgba(3, 9, 13, 0.42)";
    context.fillRect(tileLeft, tileTop, tileSize - 8, tileSize - 8);
    context.strokeStyle = iconColor;
    context.lineWidth = 2;
    context.strokeRect(tileLeft, tileTop, tileSize - 8, tileSize - 8);

    if (marker.icon === "source") {
      drawSourceBroadcastRings(context, centerX, centerY, tileSize, frame);
    } else {
      drawCoreRing(context, centerX, centerY, tileSize, state, frame);
    }

    context.drawImage(
      sprite,
      centerX - sprite.width / 2,
      centerY - sprite.height / 2,
    );

    context.fillStyle = "rgba(215, 255, 247, 0.9)";
    context.font = `700 ${Math.max(11, tileSize * 0.14)}px ui-monospace, "SF Mono", Consolas, monospace`;
    context.textAlign = "center";
    context.textBaseline = "top";
    context.fillText(
      marker.label,
      centerX,
      originY + marker.position.y * tileSize + tileSize * 0.7,
    );
  }
}

function drawSourceBroadcastRings(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  tileSize: number,
  frame: RenderFrame,
): void {
  for (let index = 0; index < 2; index += 1) {
    const radius = (frame.timeMs * 0.03 + index * tileSize * 0.5) % tileSize;
    const alpha = Math.max(0, 1 - radius / tileSize) * 0.34;

    context.strokeStyle = `rgba(34, 224, 196, ${alpha})`;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.stroke();
  }
}

function drawCoreRing(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  tileSize: number,
  state: GameState,
  frame: RenderFrame,
): void {
  const radius = tileSize * 0.38;
  const rotation = frame.timeMs * 0.0004;
  const integrityRatio = state.coreIntegrity / state.config.coreIntegrityMax;
  const arcColor =
    integrityRatio > 0.45
      ? "rgba(34, 224, 196, 0.82)"
      : "rgba(255, 95, 110, 0.88)";

  context.save();
  context.translate(centerX, centerY);
  context.rotate(rotation);
  context.strokeStyle = "rgba(255, 79, 145, 0.42)";
  context.lineWidth = 2;
  context.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * 2 * index) / 6;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.closePath();
  context.stroke();
  context.restore();

  context.strokeStyle = arcColor;
  context.lineWidth = 3;
  context.beginPath();
  context.arc(
    centerX,
    centerY,
    tileSize * 0.42,
    -Math.PI / 2,
    Math.PI * 2 * integrityRatio - Math.PI / 2,
  );
  context.stroke();
}

function drawHoverGhost(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileSize: number,
  state: GameState,
  frame: RenderFrame,
): void {
  const hover = frame.hover;

  if (!hover || (state.phase !== "prep" && state.phase !== "active")) {
    return;
  }

  const tileKind = getTileKind(state.grid, hover);
  const unitKind = getUnitKind(tileKind);
  const isMarkerTile =
    isSamePosition(hover, state.config.source) ||
    isSamePosition(hover, state.config.core);

  if (frame.selectedTool === "sell") {
    if (!unitKind || unitKind === "scrubber") {
      return;
    }

    drawSellGhost(context, originX, originY, tileSize, hover, state.config.units[unitKind].sellRefund);
    return;
  }

  const cost = state.config.units[frame.selectedTool].cost;
  const isValid =
    (frame.selectedTool === "scrubber"
      ? tileKind === "corrupted"
      : tileKind === "empty") &&
    !isMarkerTile &&
    !isIntrusionOccupied(state, hover) &&
    state.bandwidth >= cost;
  const pulse = pulse01(frame.timeMs, 900);
  const color = isValid
    ? `rgba(34, 224, 196, ${0.58 + pulse * 0.28})`
    : `rgba(255, 95, 110, ${0.58 + pulse * 0.24})`;
  const iconAlpha = isValid ? 0.45 : 0.25;
  const center = getTileCenter(originX, originY, tileSize, hover);

  drawToolRangeTelegraph(context, originX, originY, tileSize, state, hover, frame.selectedTool);

  context.strokeStyle = color;
  context.lineWidth = 2;
  context.setLineDash([]);
  context.strokeRect(
    originX + hover.x * tileSize + 5,
    originY + hover.y * tileSize + 5,
    tileSize - 10,
    tileSize - 10,
  );
  drawIcon(context, frame.selectedTool, center.x, center.y, tileSize * 0.48, {
    alpha: iconAlpha,
  });
}

function drawToolRangeTelegraph(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileSize: number,
  state: GameState,
  hover: GridPosition,
  tool: PlayerTool,
): void {
  if (tool === "sell" || tool === "firewall" || tool === "scrubber") {
    return;
  }

  if (tool === "overclock") {
    drawOverclockTelegraph(context, originX, originY, tileSize, state, hover);
    return;
  }

  const positions =
    tool === "relay"
      ? getRelayRangePositions(hover, state.config.relaySignalRange)
      : getTurretRangePositions(hover, state.config.turretRange);

  context.fillStyle =
    tool === "relay"
      ? "rgba(34, 224, 196, 0.08)"
      : "rgba(77, 163, 255, 0.1)";
  context.strokeStyle =
    tool === "relay"
      ? "rgba(34, 224, 196, 0.18)"
      : "rgba(77, 163, 255, 0.2)";
  context.lineWidth = 1;

  for (const position of positions) {
    if (!isInBounds(position, state.grid.size)) {
      continue;
    }

    const left = originX + position.x * tileSize + 8;
    const top = originY + position.y * tileSize + 8;

    context.fillRect(left, top, tileSize - 16, tileSize - 16);
    context.strokeRect(left, top, tileSize - 16, tileSize - 16);
  }
}

function drawOverclockTelegraph(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileSize: number,
  state: GameState,
  hover: GridPosition,
): void {
  const positions = getTurretRangePositions(hover, 1);

  context.lineWidth = 1;

  for (const position of positions) {
    if (!isInBounds(position, state.grid.size)) {
      continue;
    }

    const isTurret = getTileKind(state.grid, position) === "turret";
    const left = originX + position.x * tileSize + 8;
    const top = originY + position.y * tileSize + 8;

    context.fillStyle = isTurret
      ? "rgba(242, 201, 76, 0.18)"
      : "rgba(242, 201, 76, 0.06)";
    context.strokeStyle = isTurret
      ? "rgba(255, 241, 168, 0.38)"
      : "rgba(242, 201, 76, 0.14)";
    context.fillRect(left, top, tileSize - 16, tileSize - 16);
    context.strokeRect(left, top, tileSize - 16, tileSize - 16);
  }
}

function drawSellGhost(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileSize: number,
  hover: GridPosition,
  refund: number,
): void {
  const left = originX + hover.x * tileSize + 5;
  const top = originY + hover.y * tileSize + 5;
  const center = getTileCenter(originX, originY, tileSize, hover);

  context.strokeStyle = "rgba(255, 79, 145, 0.88)";
  context.lineWidth = 2;
  context.setLineDash([6, 5]);
  context.strokeRect(left, top, tileSize - 10, tileSize - 10);
  context.setLineDash([]);
  drawIcon(context, "sell", center.x, center.y, tileSize * 0.4, {
    alpha: 0.42,
  });
  context.fillStyle = "rgba(255, 209, 224, 0.94)";
  context.font = `700 ${Math.max(10, tileSize * 0.14)}px ui-monospace, "SF Mono", Consolas, monospace`;
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillText(`+${refund}`, center.x, top + tileSize * 0.62);
}

function getRelayRangePositions(
  center: GridPosition,
  range: number,
): readonly GridPosition[] {
  const positions: GridPosition[] = [];

  for (let dy = -range; dy <= range; dy += 1) {
    for (let dx = -range; dx <= range; dx += 1) {
      if (Math.abs(dx) + Math.abs(dy) > range || (dx === 0 && dy === 0)) {
        continue;
      }

      positions.push({
        x: center.x + dx,
        y: center.y + dy,
      });
    }
  }

  return positions;
}

function getTurretRangePositions(
  center: GridPosition,
  range: number,
): readonly GridPosition[] {
  const positions: GridPosition[] = [];
  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ] as const;

  for (const direction of directions) {
    for (let step = 1; step <= range; step += 1) {
      positions.push({
        x: center.x + direction.x * step,
        y: center.y + direction.y * step,
      });
    }
  }

  return positions;
}

function drawSignalRoute(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileSize: number,
  signal: SignalState,
  frame: RenderFrame,
): void {
  const route = signal.route;

  if (route.length < 2) {
    return;
  }

  const centers = route.map((position) =>
    getTileCenter(originX, originY, tileSize, position),
  );

  context.lineCap = "round";
  context.lineJoin = "round";

  if (signal.status === "severed") {
    context.strokeStyle = "rgba(255, 79, 145, 0.32)";
    context.lineWidth = 4;
    context.setLineDash([tileSize * 0.28, tileSize * 0.22]);
    strokePolyline(context, centers);
    context.setLineDash([]);
    return;
  }

  context.strokeStyle = "rgba(34, 224, 196, 0.14)";
  context.lineWidth = 12;
  strokePolyline(context, centers);

  context.strokeStyle = "rgba(34, 224, 196, 0.92)";
  context.lineWidth = 4;
  strokePolyline(context, centers);

  context.strokeStyle = "rgba(215, 255, 247, 0.94)";
  context.lineWidth = 2;
  context.setLineDash([6, tileSize]);
  context.lineDashOffset = -((frame.timeMs * 0.12) % (tileSize + 6));
  strokePolyline(context, centers);
  context.setLineDash([]);

  const routeLength = polylineLength(centers);
  const packet = pointAlongPolyline(
    centers,
    routeLength === 0 ? 0 : (frame.timeMs * 0.15) % routeLength,
  );

  if (packet) {
    context.fillStyle = "rgba(215, 255, 247, 0.96)";
    context.strokeStyle = "rgba(34, 224, 196, 0.48)";
    context.lineWidth = 5;
    context.beginPath();
    context.arc(packet.x, packet.y, tileSize * 0.08, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
}

function strokePolyline(
  context: CanvasRenderingContext2D,
  points: readonly GridPosition[],
): void {
  context.beginPath();

  for (const [index, point] of points.entries()) {
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  }

  context.stroke();
}

function drawRouteCuts(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileSize: number,
  events: readonly SimEvent[],
  frame: RenderFrame,
): void {
  const routeSevered = events.find((event) => event.type === "routeSevered");

  if (!routeSevered || frame.flashAlpha <= 0) {
    return;
  }

  context.strokeStyle = `rgba(255, 61, 129, ${0.78 * frame.flashAlpha})`;
  context.lineWidth = 4;
  context.setLineDash([8, 8]);
  context.beginPath();

  for (const [index, position] of routeSevered.previousRoute.entries()) {
    const center = getTileCenter(originX, originY, tileSize, position);

    if (index === 0) {
      context.moveTo(center.x, center.y);
    } else {
      context.lineTo(center.x, center.y);
    }
  }

  context.stroke();
  context.setLineDash([]);

  for (const event of events) {
    if (event.type !== "tileCorrupted") {
      continue;
    }

    const center = getTileCenter(originX, originY, tileSize, event.position);
    const radius = tileSize * 0.28;

    context.strokeStyle = `rgba(255, 209, 224, ${frame.flashAlpha})`;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(center.x - radius, center.y - radius);
    context.lineTo(center.x + radius, center.y + radius);
    context.moveTo(center.x + radius, center.y - radius);
    context.lineTo(center.x - radius, center.y + radius);
    context.stroke();
  }
}

function drawHitFlashes(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileSize: number,
  state: GameState,
  frame: RenderFrame,
): void {
  const alpha = frame.flashAlpha;

  if (alpha <= 0) {
    return;
  }

  for (const event of state.events) {
    if (event.type === "turretHit") {
      const from = getTileCenter(originX, originY, tileSize, event.turretPosition);
      const to = getTileCenter(originX, originY, tileSize, event.targetPosition);
      const isBoosted = event.damage > state.config.turretDamagePerTick;

      context.lineCap = "round";
      context.strokeStyle = isBoosted
        ? `rgba(242, 201, 76, ${0.26 * alpha})`
        : `rgba(77, 163, 255, ${0.22 * alpha})`;
      context.lineWidth = 9;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();

      context.strokeStyle = isBoosted
        ? `rgba(255, 241, 168, ${0.86 * alpha})`
        : `rgba(213, 236, 255, ${0.82 * alpha})`;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    }

    if (event.type === "intrusionNeutralized") {
      const center = getTileCenter(originX, originY, tileSize, event.position);
      const radius = tileSize * (0.16 + (1 - alpha) * 0.34);

      context.strokeStyle = `rgba(34, 224, 196, ${0.7 * alpha})`;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(center.x, center.y, radius, 0, Math.PI * 2);
      context.stroke();
    }

    if (event.type === "unitDamaged") {
      const center = getTileCenter(originX, originY, tileSize, event.position);
      const left = originX + event.position.x * tileSize + 5;
      const top = originY + event.position.y * tileSize + 5;

      context.fillStyle = `rgba(242, 201, 76, ${0.22 * alpha})`;
      context.fillRect(left, top, tileSize - 10, tileSize - 10);
      context.strokeStyle = `rgba(255, 241, 168, ${0.82 * alpha})`;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(center.x - tileSize * 0.22, center.y - tileSize * 0.18);
      context.lineTo(center.x + tileSize * 0.22, center.y + tileSize * 0.18);
      context.moveTo(center.x + tileSize * 0.18, center.y - tileSize * 0.22);
      context.lineTo(center.x - tileSize * 0.18, center.y + tileSize * 0.22);
      context.stroke();
    }

    if (event.type === "tileCleansed") {
      const center = getTileCenter(originX, originY, tileSize, event.position);
      const radius = tileSize * (0.14 + (1 - alpha) * 0.32);

      context.strokeStyle = `rgba(94, 224, 138, ${0.78 * alpha})`;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(center.x, center.y, radius, 0, Math.PI * 2);
      context.stroke();

      context.strokeStyle = `rgba(199, 255, 214, ${0.62 * alpha})`;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(center.x - tileSize * 0.16, center.y);
      context.lineTo(center.x - tileSize * 0.03, center.y + tileSize * 0.14);
      context.lineTo(center.x + tileSize * 0.2, center.y - tileSize * 0.16);
      context.stroke();
    }

    if (event.type === "intrusionSplit") {
      const center = getTileCenter(originX, originY, tileSize, event.position);

      context.strokeStyle = `rgba(182, 140, 255, ${0.82 * alpha})`;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(center.x - tileSize * 0.3, center.y);
      context.lineTo(center.x + tileSize * 0.3, center.y);
      context.moveTo(center.x, center.y - tileSize * 0.3);
      context.lineTo(center.x, center.y + tileSize * 0.3);
      context.stroke();
    }

    if (event.type === "coreBreach") {
      const center = getTileCenter(originX, originY, tileSize, state.config.core);
      const radius = tileSize * (0.42 + (1 - alpha) * 0.28);

      context.strokeStyle = `rgba(255, 95, 110, ${0.86 * alpha})`;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(center.x, center.y, radius, 0, Math.PI * 2);
      context.stroke();
    }
  }
}

function drawCorruptionFlashes(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileSize: number,
  events: readonly SimEvent[],
  frame: RenderFrame,
): void {
  const alpha = frame.flashAlpha;

  if (alpha <= 0) {
    return;
  }

  for (const event of events) {
    if (event.type === "corruptionProgress") {
      const center = getTileCenter(originX, originY, tileSize, event.position);
      const progressRatio = event.progressTicks / event.requiredTicks;

      context.strokeStyle = `rgba(255, 95, 110, ${0.16 * alpha})`;
      context.lineWidth = 9;
      context.beginPath();
      context.arc(
        center.x,
        center.y,
        tileSize * 0.38,
        -Math.PI / 2,
        Math.PI * 2 * progressRatio - Math.PI / 2,
      );
      context.stroke();

      context.strokeStyle = `rgba(255, 209, 224, ${Math.max(0.18, progressRatio) * alpha})`;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(
        center.x,
        center.y,
        tileSize * 0.38,
        -Math.PI / 2,
        Math.PI * 2 * progressRatio - Math.PI / 2,
      );
      context.stroke();
    }

    if (event.type === "tileCorrupted") {
      context.fillStyle = `rgba(255, 41, 87, ${0.42 * alpha})`;
      context.fillRect(
        originX + event.position.x * tileSize + 3,
        originY + event.position.y * tileSize + 3,
        tileSize - 6,
        tileSize - 6,
      );
    }
  }
}

function drawIntrusions(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileSize: number,
  state: GameState,
  frame: RenderFrame,
): void {
  for (const intrusion of state.intrusions) {
    const current = getTileCenter(originX, originY, tileSize, intrusion.position);
    const previous = getTileCenter(originX, originY, tileSize, intrusion.previousPosition);
    const alpha =
      intrusion.lastMoveTick === state.tickCount ? frame.interpolationAlpha : 1;
    const x = previous.x + (current.x - previous.x) * alpha;
    const y = previous.y + (current.y - previous.y) * alpha;
    const radius = tileSize * (intrusion.kind === "goliath" ? 0.32 : 0.24);
    const iconName = getEnemyIconName(intrusion.kind);
    const movementAngle =
      current.x === previous.x && current.y === previous.y
        ? 0
        : Math.atan2(current.y - previous.y, current.x - previous.x);
    const breath =
      intrusion.kind === "crawler"
        ? 1 + 0.06 * Math.sin(frame.timeMs * 0.004 + intrusion.id)
        : intrusion.kind === "goliath"
          ? 1 + 0.04 * Math.sin(frame.timeMs * 0.003 + intrusion.id)
          : 1;
    const bob =
      intrusion.kind === "goliath"
        ? Math.sin(frame.timeMs * 0.006 + intrusion.id) * tileSize * 0.025
        : 0;

    context.fillStyle = "rgba(3, 9, 13, 0.74)";
    context.strokeStyle = ICONS[iconName].accent;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    if (intrusion.kind === "probe") {
      drawProbeSpinRing(context, x, y, tileSize, frame);
    }

    if (intrusion.kind === "spoof") {
      const jitter = Math.sin(frame.timeMs * 0.02 + intrusion.id * 3) * 2;
      drawIcon(context, iconName, x - 2 - jitter, y, tileSize * 0.42, {
        alpha: 0.38,
      });
      drawIcon(context, iconName, x + 2 + jitter, y, tileSize * 0.42, {
        alpha: 0.38,
      });
    }

    drawIcon(
      context,
      iconName,
      x,
      y + bob,
      tileSize * getEnemyIconScale(intrusion.kind) * breath,
      {
        glow: true,
        rotation: intrusion.kind === "probe" ? movementAngle : 0,
      },
    );

    const hpRatio = intrusion.hp / intrusion.maxHp;
    drawHpBar(context, x, y + radius + 5, radius * 2, hpRatio);

    if (intrusion.corruption) {
      context.strokeStyle = "rgba(255, 95, 110, 0.88)";
      context.lineWidth = 3;
      context.beginPath();
      context.arc(
        x,
        y,
        radius + 8,
        -Math.PI / 2,
        Math.PI * 2 *
          (intrusion.corruption.progressTicks / intrusion.corruption.requiredTicks) -
          Math.PI / 2,
      );
      context.stroke();
    }
  }
}

function drawProbeSpinRing(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  tileSize: number,
  frame: RenderFrame,
): void {
  const radius = tileSize * 0.29;
  const start = frame.timeMs * 0.008;

  context.strokeStyle = "rgba(242, 201, 76, 0.72)";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x, y, radius, start, start + Math.PI * 1.25);
  context.stroke();
}

function drawHpBar(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  hpRatio: number,
): void {
  const clampedRatio = Math.max(0, Math.min(1, hpRatio));
  const red = Math.round(255 * (1 - clampedRatio) + 164 * clampedRatio);
  const green = Math.round(95 * (1 - clampedRatio) + 255 * clampedRatio);
  const blue = Math.round(110 * (1 - clampedRatio) + 243 * clampedRatio);
  const height = 5;
  const left = x - width / 2;

  context.fillStyle = "rgba(3, 9, 13, 0.78)";
  context.beginPath();
  context.roundRect(left, y, width, height, height / 2);
  context.fill();

  if (clampedRatio > 0) {
    context.fillStyle = `rgba(${red}, ${green}, ${blue}, 0.92)`;
    context.beginPath();
    context.roundRect(left, y, width * clampedRatio, height, height / 2);
    context.fill();
  }
}

function drawStatus(
  context: CanvasRenderingContext2D,
  size: CanvasSize,
  state: GameState,
): void {
  const statusText =
    state.signal.status === "live"
      ? `SIGNAL LIVE / CORE ${state.coreIntegrity} / INTRUSIONS ${state.intrusions.length} / ICE ${state.neutralizedCount}`
      : `SIGNAL SEVERED / CORE ${state.coreIntegrity} / INTRUSIONS ${state.intrusions.length} / ICE ${state.neutralizedCount}`;

  context.fillStyle =
    state.signal.status === "live"
      ? "rgba(164, 255, 243, 0.92)"
      : "rgba(255, 209, 224, 0.92)";
  context.font = "700 16px ui-monospace, \"SF Mono\", Consolas, monospace";
  context.textAlign = "center";
  context.textBaseline = "bottom";
  context.fillText(statusText, size.width / 2, size.height - 16);
}

function getShakeOffset(
  state: GameState,
  frame: RenderFrame,
): Readonly<{ x: number; y: number }> {
  const hasCoreHit = state.events.some(
    (event) => event.type === "coreDamaged" || event.type === "coreBreach",
  );

  if (!hasCoreHit || frame.shakeMagnitude <= 0) {
    return {
      x: 0,
      y: 0,
    };
  }

  const phase = state.tickCount * 1.73;

  return {
    x: Math.sin(phase) * frame.shakeMagnitude,
    y: Math.cos(phase * 1.31) * frame.shakeMagnitude,
  };
}

function getTileCenter(
  originX: number,
  originY: number,
  tileSize: number,
  position: GridPosition,
): GridPosition {
  return {
    x: originX + position.x * tileSize + tileSize / 2,
    y: originY + position.y * tileSize + tileSize / 2,
  };
}

function getTileFill(kind: TileKind, x: number, y: number): string {
  switch (kind) {
    case "relay":
      return "#12332f";
    case "firewall":
      return "#302711";
    case "turret":
      return "#122536";
    case "scrubber":
      return "#123329";
    case "overclock":
      return "#332a12";
    case "void":
      return "#05080c";
    case "corrupted":
      return "#35131e";
    case "empty":
      return (x + y) % 2 === 0 ? "#0e1c24" : "#101f2a";
  }
}

function drawTileUnitIcon(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileSize: number,
  position: GridPosition,
  kind: TileKind,
): void {
  const iconName = getTileIconName(kind);

  if (!iconName) {
    return;
  }

  const centerX = originX + position.x * tileSize + tileSize / 2;
  const centerY = originY + position.y * tileSize + tileSize / 2;
  const sprite = getGlowSprite(iconName, tileSize * 0.55);
  const tileLeft = originX + position.x * tileSize + 7;
  const tileTop = originY + position.y * tileSize + 7;

  context.strokeStyle = ICONS[iconName].accent;
  context.lineWidth = 1;
  context.strokeRect(tileLeft, tileTop, tileSize - 14, tileSize - 14);
  context.drawImage(
    sprite,
    centerX - sprite.width / 2,
    centerY - sprite.height / 2,
  );
}

function drawUnitHpPips(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileSize: number,
  state: GameState,
  position: GridPosition,
  kind: TileKind,
  hp: number | undefined,
): void {
  const unitKind = getUnitKind(kind);

  if (!unitKind) {
    return;
  }

  const maxHp = state.config.units[unitKind].hp;
  const currentHp = hp ?? maxHp;

  if (currentHp >= maxHp) {
    return;
  }

  const pipCount = 4;
  const filledPips = Math.ceil(Math.max(0, currentHp / maxHp) * pipCount);
  const pipSize = Math.max(3, tileSize * 0.07);
  const gap = Math.max(2, tileSize * 0.035);
  const totalWidth = pipCount * pipSize + (pipCount - 1) * gap;
  const left = originX + position.x * tileSize + (tileSize - totalWidth) / 2;
  const top = originY + position.y * tileSize + tileSize - pipSize - 9;
  const fillColor =
    currentHp <= maxHp / 2
      ? "rgba(255, 95, 110, 0.92)"
      : "rgba(242, 201, 76, 0.94)";

  for (let index = 0; index < pipCount; index += 1) {
    const x = left + index * (pipSize + gap);

    context.fillStyle = "rgba(3, 9, 13, 0.82)";
    context.fillRect(x, top, pipSize, pipSize);
    context.strokeStyle = "rgba(215, 255, 247, 0.24)";
    context.lineWidth = 1;
    context.strokeRect(x, top, pipSize, pipSize);

    if (index < filledPips) {
      context.fillStyle = fillColor;
      context.fillRect(x + 1, top + 1, pipSize - 2, pipSize - 2);
    }
  }
}

function getTileIconName(kind: TileKind): IconName | null {
  switch (kind) {
    case "relay":
      return "relay";
    case "firewall":
      return "firewall";
    case "turret":
      return "turret";
    case "scrubber":
      return "scrubber";
    case "overclock":
      return "overclock";
    case "empty":
    case "void":
    case "corrupted":
      return null;
  }
}

function getEnemyIconName(kind: EnemyKind): IconName {
  switch (kind) {
    case "probe":
      return "probe";
    case "crawler":
      return "crawler";
    case "spoof":
      return "spoof";
    case "hunter":
      return "hunter";
    case "splitter":
      return "splitter";
    case "goliath":
      return "goliath";
  }
}

function getEnemyIconScale(kind: EnemyKind): number {
  switch (kind) {
    case "goliath":
      return 0.58;
    case "probe":
    case "crawler":
    case "spoof":
    case "hunter":
    case "splitter":
      return 0.42;
  }
}

function getUnitKind(kind: TileKind): UnitKind | null {
  switch (kind) {
    case "relay":
    case "firewall":
    case "turret":
    case "scrubber":
    case "overclock":
      return kind;
    case "empty":
    case "void":
    case "corrupted":
      return null;
  }
}

function isSamePosition(a: GridPosition, b: GridPosition): boolean {
  return a.x === b.x && a.y === b.y;
}

function isIntrusionOccupied(state: GameState, position: GridPosition): boolean {
  return state.intrusions.some((intrusion) =>
    isSamePosition(intrusion.position, position),
  );
}

function isInBounds(position: GridPosition, gridSize: number): boolean {
  return (
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < gridSize &&
    position.y < gridSize
  );
}
