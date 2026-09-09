import {
  SAPPER_PROTOTYPE,
  selectSapperPrototypeTarget,
  type SapperPrototypeEvent,
  type SapperPrototypeHardware,
  type SapperPrototypeState,
} from "../sim/expansion/sapperPrototype";

const GRID_SIZE = 8;
const CANVAS_SIZE = 640;
const BOARD_INSET = 32;
const TILE_SIZE = 72;

export function renderSapperPrototypeCanvas(
  context: CanvasRenderingContext2D,
  state: SapperPrototypeState,
  recentEvents: readonly SapperPrototypeEvent[],
  sapperSprite: CanvasImageSource | null = null,
): void {
  context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  drawFloor(context);

  for (const position of state.iceCoverage) {
    const frame = tileFrame(position.x, position.y);
    context.fillStyle = "rgba(77, 163, 255, 0.13)";
    context.fillRect(frame.x + 4, frame.y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    context.strokeStyle = "rgba(77, 163, 255, 0.72)";
    context.setLineDash([5, 5]);
    context.strokeRect(frame.x + 8, frame.y + 8, TILE_SIZE - 16, TILE_SIZE - 16);
    context.setLineDash([]);
  }

  const intrusion = state.intrusions[0];
  const selectedTarget = intrusion ? selectSapperPrototypeTarget(state, intrusion) : null;
  if (intrusion && selectedTarget) drawTargetPath(context, intrusion.position, selectedTarget.path);
  for (const item of state.hardware) drawHardware(context, item, selectedTarget?.position);
  drawCore(context, state.core.x, state.core.y);
  if (intrusion) drawSapper(context, intrusion.position.x, intrusion.position.y, intrusion.hp, sapperSprite);

  const pulse = [...recentEvents].reverse().find((event) => event.type === "sapperDeathPulse");
  if (pulse?.type === "sapperDeathPulse") drawPulse(context, pulse.position.x, pulse.position.y);
}

function drawFloor(context: CanvasRenderingContext2D): void {
  const gradient = context.createRadialGradient(320, 300, 40, 320, 320, 440);
  gradient.addColorStop(0, "#0b1e26");
  gradient.addColorStop(1, "#040b10");
  context.fillStyle = gradient;
  context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const frame = tileFrame(x, y);
      context.fillStyle = (x + y) % 2 === 0 ? "rgba(7, 24, 31, .92)" : "rgba(6, 18, 27, .94)";
      context.fillRect(frame.x + 2, frame.y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      context.strokeStyle = "rgba(80, 175, 172, .18)";
      context.strokeRect(frame.x + 3.5, frame.y + 3.5, TILE_SIZE - 7, TILE_SIZE - 7);
    }
  }
  context.strokeStyle = "rgba(255, 79, 145, .7)";
  context.lineWidth = 3;
  context.strokeRect(BOARD_INSET, BOARD_INSET, TILE_SIZE * GRID_SIZE, TILE_SIZE * GRID_SIZE);
}

function drawTargetPath(
  context: CanvasRenderingContext2D,
  from: Readonly<{ x: number; y: number }>,
  path: readonly Readonly<{ x: number; y: number }>[],
): void {
  context.save();
  context.strokeStyle = "rgba(242, 201, 76, .72)";
  context.lineWidth = 3;
  context.setLineDash([10, 8]);
  context.beginPath();
  const start = tileCenter(from.x, from.y);
  context.moveTo(start.x, start.y);
  for (const position of path.slice(1)) {
    const center = tileCenter(position.x, position.y);
    context.lineTo(center.x, center.y);
  }
  context.stroke();
  context.restore();
}

function drawHardware(
  context: CanvasRenderingContext2D,
  hardware: SapperPrototypeHardware,
  selected: Readonly<{ x: number; y: number }> | undefined,
): void {
  const center = tileCenter(hardware.position.x, hardware.position.y);
  const colors = {
    relay: "#22e0c4",
    firewall: "#f2c94c",
    turret: "#4da3ff",
    scrubber: "#63e68a",
    overclock: "#ffcc55",
  } as const;
  const color = colors[hardware.kind];
  context.save();
  context.fillStyle = "rgba(5, 14, 20, .92)";
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.fillRect(center.x - 25, center.y - 25, 50, 50);
  context.strokeRect(center.x - 25, center.y - 25, 50, 50);
  context.fillStyle = color;
  context.font = "700 14px ui-monospace, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(hardware.kind === "firewall" ? "FW" : hardware.kind.slice(0, 3).toUpperCase(), center.x, center.y - 2);
  context.font = "700 9px ui-monospace, monospace";
  context.fillText(`${hardware.hp} HP`, center.x, center.y + 16);
  if (selected && selected.x === hardware.position.x && selected.y === hardware.position.y) {
    context.strokeStyle = "#fff2a8";
    context.lineWidth = 3;
    context.setLineDash([6, 4]);
    context.strokeRect(center.x - 31, center.y - 31, 62, 62);
  }
  context.restore();
}

function drawSapper(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  hp: number,
  sprite: CanvasImageSource | null,
): void {
  const center = tileCenter(x, y);
  if (sprite) {
    context.save();
    context.fillStyle = "rgba(0, 0, 0, .48)";
    context.beginPath();
    context.ellipse(center.x, center.y + 15, 25, 10, 0, 0, Math.PI * 2);
    context.fill();
    context.drawImage(sprite, center.x - 31, center.y - 31, 62, 62);
    context.restore();
    drawHpBar(context, x, y, hp, SAPPER_PROTOTYPE.maxHp, "#ff4f91");
    return;
  }
  context.save();
  context.translate(center.x, center.y);
  context.fillStyle = "rgba(255, 79, 145, .18)";
  context.strokeStyle = "#ff4f91";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(27, 0);
  context.lineTo(-18, -23);
  context.lineTo(-9, 0);
  context.lineTo(-18, 23);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = "#fff";
  context.font = "800 12px ui-monospace, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("SAP", 0, 0);
  context.restore();
  drawHpBar(context, x, y, hp, SAPPER_PROTOTYPE.maxHp, "#ff4f91");
}

function drawCore(context: CanvasRenderingContext2D, x: number, y: number): void {
  const center = tileCenter(x, y);
  context.save();
  context.strokeStyle = "#ff4f91";
  context.fillStyle = "rgba(255, 79, 145, .12)";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(center.x, center.y, 25, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = "#ffc2d8";
  context.font = "700 11px ui-monospace, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("CORE", center.x, center.y);
  context.restore();
}

function drawPulse(context: CanvasRenderingContext2D, x: number, y: number): void {
  context.save();
  context.fillStyle = "rgba(255, 79, 145, .2)";
  context.strokeStyle = "#ff76a7";
  context.lineWidth = 4;
  context.shadowColor = "#ff4f91";
  context.shadowBlur = 22;
  for (const delta of [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ]) {
    const pulseX = x + delta.x;
    const pulseY = y + delta.y;
    if (pulseX < 0 || pulseY < 0 || pulseX >= GRID_SIZE || pulseY >= GRID_SIZE) continue;
    const frame = tileFrame(pulseX, pulseY);
    context.fillRect(frame.x + 6, frame.y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
    context.strokeRect(frame.x + 7, frame.y + 7, TILE_SIZE - 14, TILE_SIZE - 14);
  }
  context.restore();
}

function drawHpBar(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  hp: number,
  maxHp: number,
  color: string,
): void {
  const center = tileCenter(x, y);
  context.fillStyle = "rgba(0, 0, 0, .72)";
  context.fillRect(center.x - 25, center.y + 28, 50, 6);
  context.fillStyle = color;
  context.fillRect(center.x - 24, center.y + 29, 48 * hp / maxHp, 4);
}

function tileFrame(x: number, y: number): Readonly<{ x: number; y: number }> {
  return { x: BOARD_INSET + x * TILE_SIZE, y: BOARD_INSET + y * TILE_SIZE };
}

function tileCenter(x: number, y: number): Readonly<{ x: number; y: number }> {
  const frame = tileFrame(x, y);
  return { x: frame.x + TILE_SIZE / 2, y: frame.y + TILE_SIZE / 2 };
}
