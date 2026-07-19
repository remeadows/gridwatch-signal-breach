import { getCurrentExpansionWave } from "../sim/expansion/waves";
import { getExpansionTile } from "../sim/expansion/grid";
import type { ExpansionGameState, ExpansionHardwareKind, ExpansionPlayerTool } from "../sim/expansion/types";
import type { GridPosition } from "../sim/types";
import { getBoardMetrics } from "./canvas";
import { getExpansionSprite } from "./expansionAssetRegistry";
import { getPhase6BoardSprite, type Phase6BoardSpriteId } from "./assetRegistry";

export type ExpansionRenderFrame = Readonly<{
  hover: GridPosition | null;
  focus: GridPosition | null;
  selectedTool: ExpansionPlayerTool;
  buildMode: boolean;
  timeMs: number;
}>;

export function drawExpansionGrid(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: ExpansionGameState,
  frame: ExpansionRenderFrame,
): void {
  const size = { width: canvas.width, height: canvas.height };
  const metrics = getBoardMetrics(size);
  const { originX, originY, tileSize } = metrics;
  context.clearRect(0, 0, size.width, size.height);
  const background = context.createRadialGradient(size.width * 0.5, size.height * 0.45, 20, size.width * 0.5, size.height * 0.5, size.width * 0.72);
  background.addColorStop(0, "#102538");
  background.addColorStop(0.58, "#07141d");
  background.addColorStop(1, "#03080e");
  context.fillStyle = background;
  context.fillRect(0, 0, size.width, size.height);

  drawThreatEdges(context, state, originX, originY, tileSize, frame);
  for (let y = 0; y < state.grid.size; y += 1) {
    for (let x = 0; x < state.grid.size; x += 1) {
      drawTile(context, state, { x, y }, originX, originY, tileSize, frame);
    }
  }
  drawSignal(context, state, originX, originY, tileSize, frame.timeMs);
  drawMarker(context, "source", state.config.source, originX, originY, tileSize);
  drawMarker(context, "core", state.config.core, originX, originY, tileSize);
  for (const intrusion of state.intrusions) {
    drawIntrusion(context, intrusion.kind, intrusion.position, originX, originY, tileSize);
    drawHp(context, intrusion.hp, intrusion.maxHp, intrusion.position, originX, originY, tileSize);
  }
  context.strokeStyle = "rgba(34,224,196,.75)";
  context.lineWidth = 3;
  context.strokeRect(originX, originY, metrics.boardSize, metrics.boardSize);
}

function drawTile(context: CanvasRenderingContext2D, state: ExpansionGameState, position: GridPosition, ox: number, oy: number, size: number, frame: ExpansionRenderFrame): void {
  const x = ox + position.x * size;
  const y = oy + position.y * size;
  const tile = getExpansionTile(state.grid, position);
  context.fillStyle = tile.kind === "void" ? "rgba(1,3,8,.96)" : tile.kind === "corrupted" ? "rgba(120,22,64,.5)" : "rgba(8,25,36,.6)";
  context.fillRect(x + 2, y + 2, size - 4, size - 4);
  context.strokeStyle = "rgba(45,127,138,.28)";
  context.lineWidth = 1;
  context.strokeRect(x + 2, y + 2, size - 4, size - 4);

  if (frame.hover?.x === position.x && frame.hover?.y === position.y && frame.buildMode) {
    context.fillStyle = frame.selectedTool === "sell" ? "rgba(255,79,145,.18)" : "rgba(34,224,196,.18)";
    context.fillRect(x + 4, y + 4, size - 8, size - 8);
  }
  if (frame.focus?.x === position.x && frame.focus?.y === position.y) {
    context.strokeStyle = "#f3f7ff";
    context.lineWidth = Math.max(2, size * .035);
    context.strokeRect(x + 5, y + 5, size - 10, size - 10);
  }
  if (["relay", "firewall", "turret", "scrubber", "overclock"].includes(tile.kind)) {
    const hardwareKind = tile.kind as Exclude<ExpansionHardwareKind, "latencyTrap">;
    drawSprite(context, hardwareKind, x, y, size);
    const maxHp = state.config.units[hardwareKind].hp;
    const hp = tile.hp ?? maxHp;
    if (maxHp !== null && hp !== null && hp < maxHp) {
      drawHardwareHp(context, hp, maxHp, x, y, size);
    }
  } else if (tile.kind === "latencyTrap") {
    drawImageOrGlyph(context, getExpansionSprite("latencyTrap"), "LAT", "#b381ff", x, y, size);
    drawCharges(context, tile.charges ?? 0, x, y, size);
  } else if (tile.kind === "void") {
    context.strokeStyle = "rgba(255,79,145,.18)";
    context.beginPath(); context.moveTo(x + size * .25, y + size * .75); context.lineTo(x + size * .75, y + size * .25); context.stroke();
  }
}

function drawThreatEdges(context: CanvasRenderingContext2D, state: ExpansionGameState, ox: number, oy: number, size: number, frame: ExpansionRenderFrame): void {
  if (!frame.buildMode) return;
  const board = state.grid.size * size;
  const pulse = .35 + Math.sin(frame.timeMs / 260) * .12;
  context.strokeStyle = `rgba(255,79,145,${pulse})`;
  context.lineWidth = 5;
  for (const edge of getCurrentExpansionWave(state).spawnEdges) {
    context.beginPath();
    if (edge === "north") { context.moveTo(ox, oy); context.lineTo(ox + board, oy); }
    if (edge === "east") { context.moveTo(ox + board, oy); context.lineTo(ox + board, oy + board); }
    if (edge === "south") { context.moveTo(ox, oy + board); context.lineTo(ox + board, oy + board); }
    if (edge === "west") { context.moveTo(ox, oy); context.lineTo(ox, oy + board); }
    context.stroke();
  }
}

function drawSignal(context: CanvasRenderingContext2D, state: ExpansionGameState, ox: number, oy: number, size: number, time: number): void {
  if (state.signal.route.length < 2) return;
  context.save();
  context.strokeStyle = state.signal.status === "live" ? "#22e0c4" : "#ff4f91";
  context.shadowColor = context.strokeStyle;
  context.shadowBlur = 10 + Math.sin(time / 180) * 3;
  context.lineWidth = Math.max(3, size * .065);
  context.beginPath();
  state.signal.route.forEach((position, index) => {
    const x = ox + (position.x + .5) * size;
    const y = oy + (position.y + .5) * size;
    if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
  });
  context.stroke();
  context.restore();
}

function drawMarker(context: CanvasRenderingContext2D, id: "source" | "core", position: GridPosition, ox: number, oy: number, size: number): void {
  drawSprite(context, id, ox + position.x * size, oy + position.y * size, size);
}

function drawIntrusion(context: CanvasRenderingContext2D, kind: ExpansionGameState["intrusions"][number]["kind"], position: GridPosition, ox: number, oy: number, size: number): void {
  const x = ox + position.x * size;
  const y = oy + position.y * size;
  if (kind === "rusher") drawImageOrGlyph(context, getExpansionSprite("rusher"), "RSH", "#ff4f91", x, y, size);
  else drawSprite(context, kind, x, y, size);
}

function drawSprite(context: CanvasRenderingContext2D, id: Phase6BoardSpriteId, x: number, y: number, size: number): void {
  drawImageOrGlyph(context, getPhase6BoardSprite(id), id.slice(0, 3).toUpperCase(), id === "core" ? "#ff4f91" : "#22e0c4", x, y, size);
}

function drawImageOrGlyph(context: CanvasRenderingContext2D, image: HTMLImageElement | null, label: string, color: string, x: number, y: number, size: number): void {
  if (image) context.drawImage(image, x + size * .08, y + size * .08, size * .84, size * .84);
  else {
    context.fillStyle = color; context.font = `700 ${Math.max(9, size * .18)}px monospace`; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(label, x + size / 2, y + size / 2);
  }
}

function drawCharges(context: CanvasRenderingContext2D, charges: number, x: number, y: number, size: number): void {
  for (let index = 0; index < 3; index += 1) {
    context.fillStyle = index < charges ? "#b381ff" : "rgba(179,129,255,.2)";
    context.beginPath(); context.arc(x + size * (.36 + index * .14), y + size * .84, Math.max(2, size * .035), 0, Math.PI * 2); context.fill();
  }
}

function drawHardwareHp(context: CanvasRenderingContext2D, hp: number, maxHp: number, x: number, y: number, size: number): void {
  const width = size * .68;
  const height = Math.max(3, size * .05);
  const left = x + size * .16;
  const top = y + size * .88;
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  context.fillStyle = "rgba(0,0,0,.82)";
  context.fillRect(left, top, width, height);
  context.fillStyle = ratio > .4 ? "#ffd35a" : "#ff4f91";
  context.fillRect(left, top, width * ratio, height);
}

function drawHp(context: CanvasRenderingContext2D, hp: number, maxHp: number, position: GridPosition, ox: number, oy: number, size: number): void {
  const x = ox + position.x * size + size * .16;
  const y = oy + position.y * size + size * .1;
  context.fillStyle = "rgba(0,0,0,.75)"; context.fillRect(x, y, size * .68, 4);
  context.fillStyle = hp / maxHp > .4 ? "#22e0c4" : "#ff4f91"; context.fillRect(x, y, size * .68 * Math.max(0, hp / maxHp), 4);
}
