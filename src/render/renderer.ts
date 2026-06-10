import { GRID_SIZE } from "../data/level";
import { getTileKind } from "../sim/grid";
import type { EnemyKind, GameState, GridPosition, SimEvent, TileKind } from "../sim/types";
import { type CanvasSize, getBoardMetrics } from "./canvas";
import { ICONS, type IconName } from "./iconPaths";
import { drawIcon, getGlowSprite } from "./icons";

export type RenderFrame = {
  interpolationAlpha: number;
  flashAlpha: number;
  shakeMagnitude: number;
};

const DEFAULT_RENDER_FRAME: RenderFrame = {
  interpolationAlpha: 1,
  flashAlpha: 0,
  shakeMagnitude: 0,
};

export function drawGrid(
  context: CanvasRenderingContext2D,
  size: CanvasSize,
  state: GameState,
  frame: RenderFrame = DEFAULT_RENDER_FRAME,
): void {
  const { originX, originY, boardSize, tileSize } = getBoardMetrics(size);
  const shake = getShakeOffset(state, frame);

  context.clearRect(0, 0, size.width, size.height);
  drawBackdrop(context, size);
  context.save();
  context.translate(shake.x, shake.y);
  drawTiles(context, originX, originY, tileSize, state);
  drawCorruptionFlashes(context, originX, originY, tileSize, state.events, frame);
  drawSignalRoute(context, originX, originY, tileSize, state.signal.route);
  drawRouteCuts(context, originX, originY, tileSize, state.events, frame);
  drawGridLines(context, originX, originY, boardSize, tileSize);
  drawMarkers(context, originX, originY, tileSize, state);
  drawHitFlashes(context, originX, originY, tileSize, state.events, frame);
  drawIntrusions(context, originX, originY, tileSize, state, frame);
  drawTitle(context, size);
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
  drawBackdrop(context, size);

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

function drawBackdrop(context: CanvasRenderingContext2D, size: CanvasSize): void {
  const gradient = context.createLinearGradient(0, 0, size.width, size.height);
  gradient.addColorStop(0, "#09141c");
  gradient.addColorStop(0.5, "#071018");
  gradient.addColorStop(1, "#0d1018");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size.width, size.height);
}

function drawTiles(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileSize: number,
  state: GameState,
): void {
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const position = { x, y };
      const kind = getTileKind(state.grid, position);
      const inset = 3;
      context.fillStyle = getTileFill(kind, x, y);
      context.fillRect(
        originX + x * tileSize + inset,
        originY + y * tileSize + inset,
        tileSize - inset * 2,
        tileSize - inset * 2,
      );

      drawTileUnitIcon(context, originX, originY, tileSize, position, kind);
    }
  }
}

function drawGridLines(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  boardSize: number,
  tileSize: number,
): void {
  context.strokeStyle = "rgba(117, 255, 235, 0.3)";
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

  context.strokeStyle = "rgba(255, 255, 255, 0.7)";
  context.lineWidth = 2;
  context.strokeRect(originX, originY, boardSize, boardSize);
}

function drawMarkers(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileSize: number,
  state: GameState,
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

function drawTitle(context: CanvasRenderingContext2D, size: CanvasSize): void {
  context.fillStyle = "rgba(215, 255, 247, 0.92)";
  context.font = "700 24px ui-sans-serif, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillText("GridWatch: Signal Breach", size.width / 2, 16);
}

function drawSignalRoute(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileSize: number,
  route: readonly GridPosition[],
): void {
  if (route.length < 2) {
    return;
  }

  context.strokeStyle = "rgba(34, 224, 196, 0.9)";
  context.lineWidth = 5;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();

  for (const [index, position] of route.entries()) {
    const centerX = originX + position.x * tileSize + tileSize / 2;
    const centerY = originY + position.y * tileSize + tileSize / 2;

    if (index === 0) {
      context.moveTo(centerX, centerY);
    } else {
      context.lineTo(centerX, centerY);
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
  events: readonly SimEvent[],
  frame: RenderFrame,
): void {
  const alpha = frame.flashAlpha;

  if (alpha <= 0) {
    return;
  }

  for (const event of events) {
    if (event.type !== "turretHit") {
      continue;
    }

    const from = getTileCenter(originX, originY, tileSize, event.turretPosition);
    const to = getTileCenter(originX, originY, tileSize, event.targetPosition);

    context.strokeStyle = `rgba(77, 163, 255, ${0.68 * alpha})`;
    context.lineWidth = 4;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
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

      context.strokeStyle = `rgba(255, 95, 110, ${Math.max(0.18, progressRatio) * alpha})`;
      context.lineWidth = 5;
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
    const radius = tileSize * 0.24;
    const iconName = getEnemyIconName(intrusion.kind);

    context.fillStyle = "rgba(3, 9, 13, 0.74)";
    context.strokeStyle = ICONS[iconName].accent;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    drawIcon(context, iconName, x, y, tileSize * 0.42, {
      glow: true,
    });

    const hpRatio = intrusion.hp / intrusion.maxHp;
    context.fillStyle = "rgba(3, 9, 13, 0.72)";
    context.fillRect(x - radius, y + radius + 5, radius * 2, 5);
    context.fillStyle = "rgba(164, 255, 243, 0.92)";
    context.fillRect(x - radius, y + radius + 5, radius * 2 * hpRatio, 5);

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
  context.font = "700 16px ui-sans-serif, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "bottom";
  context.fillText(statusText, size.width / 2, size.height - 16);
}

function getShakeOffset(
  state: GameState,
  frame: RenderFrame,
): Readonly<{ x: number; y: number }> {
  const hasCoreHit = state.events.some((event) => event.type === "coreDamaged");

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

function getTileIconName(kind: TileKind): IconName | null {
  switch (kind) {
    case "relay":
      return "relay";
    case "firewall":
      return "firewall";
    case "turret":
      return "turret";
    case "empty":
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
  }
}
