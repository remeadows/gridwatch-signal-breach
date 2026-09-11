import { getCurrentExpansionWave } from "../sim/expansion/waves";
import { getExpansionTile } from "../sim/expansion/grid";
import { getExpansionSapperTarget } from "../sim/expansion/intrusions";
import { ARC_ICE_RULES, getShieldLinks, type ShieldLink } from "../sim/expansion/shieldNetwork";
import type { ExpansionGameState, ExpansionHardwareKind, ExpansionPlayerTool } from "../sim/expansion/types";
import type { GridPosition } from "../sim/types";
import { getExpansionBoardMetrics } from "./expansionCanvas";
import { getExpansionArtSprite } from "./expansionBlenderRegistry";
import { getExpansionFloorAssetId, type ExpansionArtMode, type ExpansionVisualAssetId } from "./expansionArtCatalog";
import { getExpansionShotEndpoints, type ExpansionVisualSnapshot } from "./expansionVisualTimeline";

export type ExpansionRenderFrame = ExpansionVisualSnapshot & Readonly<{
  hover: GridPosition | null;
  focus: GridPosition | null;
  selectedTool: ExpansionPlayerTool;
  buildMode: boolean;
  rangePreviewEnabled: boolean;
  rangePreviewPosition: GridPosition | null;
  reducedMotion: boolean;
  lowQuality: boolean;
  artMode: ExpansionArtMode;
}>;

const sapperTargets = new WeakMap<ExpansionGameState, ReadonlyMap<number, GridPosition>>();
const shieldLinks = new WeakMap<ExpansionGameState, readonly ShieldLink[]>();
const floorLayers = new WeakMap<HTMLCanvasElement, { key: string; layer: HTMLCanvasElement }>();

export function drawExpansionGrid(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: ExpansionGameState,
  frame: ExpansionRenderFrame,
): void {
  const size = { width: canvas.width, height: canvas.height };
  const metrics = getExpansionBoardMetrics(canvas);
  const { originX, originY, tileSize } = metrics;
  context.clearRect(0, 0, size.width, size.height);
  const background = context.createRadialGradient(size.width * 0.5, size.height * 0.45, 20, size.width * 0.5, size.height * 0.5, size.width * 0.72);
  background.addColorStop(0, "#102538");
  background.addColorStop(0.58, "#07141d");
  background.addColorStop(1, "#03080e");
  context.fillStyle = background;
  context.fillRect(0, 0, size.width, size.height);
  drawFloorLayer(context, canvas, state, frame, originX, originY, tileSize);

  drawThreatEdges(context, state, originX, originY, tileSize, frame);
  for (let y = 0; y < state.grid.size; y += 1) {
    for (let x = 0; x < state.grid.size; x += 1) {
      drawTile(context, state, { x, y }, originX, originY, tileSize, frame);
    }
  }
  drawWeaponRange(context, state, frame, originX, originY, tileSize);
  drawSignal(context, state, originX, originY, tileSize, frame);
  drawMarker(context, "source", state.config.source, originX, originY, tileSize, frame);
  drawMarker(context, "core", state.config.core, originX, originY, tileSize, frame);
  drawSapperTelegraphs(context, state, originX, originY, tileSize, frame);
  drawShieldLinks(context, state, originX, originY, tileSize, frame);
  for (const intrusion of state.intrusions) {
    const position = frame.intrusionPositions.get(intrusion.id) ?? intrusion.position;
    drawIntrusion(context, intrusion.kind, position, originX, originY, tileSize, frame);
    drawHp(context, intrusion.hp, intrusion.maxHp, position, originX, originY, tileSize);
  }
  drawCombatEffects(context, frame, originX, originY, tileSize);
  context.strokeStyle = "rgba(34,224,196,.75)";
  context.lineWidth = 3;
  context.strokeRect(originX, originY, metrics.boardSize, metrics.boardSize);
}

function drawFloorLayer(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, state: ExpansionGameState, frame: ExpansionRenderFrame, ox: number, oy: number, size: number): void {
  if (frame.artMode !== "blender-v2") return;
  const floor = getExpansionArtSprite(getExpansionFloorAssetId(state.config.chapterId), frame.artMode);
  if (!floor) return;
  const key = `${floor.src}:${canvas.width}:${canvas.height}:${ox}:${oy}:${size}`;
  let cached = floorLayers.get(canvas);
  if (!cached || cached.key !== key) {
    const layer = document.createElement("canvas");
    layer.width = canvas.width;
    layer.height = canvas.height;
    const layerContext = layer.getContext("2d");
    if (!layerContext) return;
    for (let y = 0; y < state.grid.size; y += 1) for (let x = 0; x < state.grid.size; x += 1) {
      layerContext.drawImage(floor, ox + x * size, oy + y * size, size, size);
    }
    cached = { key, layer };
    floorLayers.set(canvas, cached);
  }
  context.drawImage(cached.layer, 0, 0);
}

function drawTile(context: CanvasRenderingContext2D, state: ExpansionGameState, position: GridPosition, ox: number, oy: number, size: number, frame: ExpansionRenderFrame): void {
  const x = ox + position.x * size;
  const y = oy + position.y * size;
  const tile = getExpansionTile(state.grid, position);
  context.fillStyle = tile.kind === "void" ? "rgba(1,3,8,.97)" : tile.kind === "corrupted" ? "rgba(120,22,64,.56)" : frame.artMode === "blender-v2" ? "rgba(8,25,36,.06)" : "rgba(8,25,36,.6)";
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
  if (["relay", "firewall", "turret", "scrubber", "overclock", "arcIce"].includes(tile.kind)) {
    const hardwareKind = tile.kind as Exclude<ExpansionHardwareKind, "latencyTrap">;
    drawSprite(context, hardwareKind, x, y, size, frame);
    const maxHp = state.config.units[hardwareKind].hp;
    const hp = tile.hp ?? maxHp;
    if (maxHp !== null && hp !== null && hp < maxHp) {
      drawHardwareHp(context, hp, maxHp, x, y, size);
    }
  } else if (tile.kind === "latencyTrap") {
    drawSprite(context, "latencyTrap", x, y, size, frame);
    drawCharges(context, tile.charges ?? 0, x, y, size);
  } else if (tile.kind === "void") {
    context.strokeStyle = "rgba(255,79,145,.18)";
    context.beginPath(); context.moveTo(x + size * .25, y + size * .75); context.lineTo(x + size * .75, y + size * .25); context.stroke();
  }
}

function drawWeaponRange(context: CanvasRenderingContext2D, state: ExpansionGameState, frame: ExpansionRenderFrame, ox: number, oy: number, size: number): void {
  const origin = (frame.rangePreviewEnabled ? frame.rangePreviewPosition : null) ?? frame.focus ?? frame.hover;
  if (!origin || (!frame.buildMode && !frame.rangePreviewEnabled) || (frame.selectedTool !== "turret" && frame.selectedTool !== "arcIce")) return;
  const range = frame.selectedTool === "arcIce" ? ARC_ICE_RULES.firstTargetRange : state.config.turretRange;
  context.save();
  context.strokeStyle = frame.selectedTool === "arcIce" ? "rgba(194,159,255,.6)" : "rgba(138,217,255,.55)";
  context.lineWidth = Math.max(1, size * .02);
  for (let y = 0; y < state.grid.size; y += 1) for (let x = 0; x < state.grid.size; x += 1) {
    if (Math.abs(origin.x - x) + Math.abs(origin.y - y) <= range) context.strokeRect(ox + (x + .09) * size, oy + (y + .09) * size, size * .82, size * .82);
  }
  if (frame.rangePreviewEnabled) {
    context.strokeStyle = "#f3f7ff";
    context.lineWidth = Math.max(2, size * .035);
    context.strokeRect(ox + (origin.x + .04) * size, oy + (origin.y + .04) * size, size * .92, size * .92);
  }
  context.restore();
}

function drawThreatEdges(context: CanvasRenderingContext2D, state: ExpansionGameState, ox: number, oy: number, size: number, frame: ExpansionRenderFrame): void {
  if (!frame.buildMode) return;
  const board = state.grid.size * size;
  const pulse = frame.reducedMotion ? .5 : .35 + Math.sin(frame.timeMs / 260) * .12;
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

function drawSignal(context: CanvasRenderingContext2D, state: ExpansionGameState, ox: number, oy: number, size: number, frame: ExpansionRenderFrame): void {
  if (state.signal.route.length < 2) return;
  context.save();
  context.strokeStyle = state.signal.status === "live" ? "#22e0c4" : "#ff4f91";
  context.shadowColor = context.strokeStyle;
  context.shadowBlur = frame.lowQuality ? 0 : frame.reducedMotion ? 8 : 10 + Math.sin(frame.timeMs / 180) * 3;
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

function drawMarker(context: CanvasRenderingContext2D, id: "source" | "core", position: GridPosition, ox: number, oy: number, size: number, frame: ExpansionRenderFrame): void {
  drawSprite(context, id, ox + position.x * size, oy + position.y * size, size, frame);
}

function drawIntrusion(context: CanvasRenderingContext2D, kind: ExpansionGameState["intrusions"][number]["kind"], position: GridPosition, ox: number, oy: number, size: number, frame: ExpansionRenderFrame): void {
  const x = ox + position.x * size;
  const y = oy + position.y * size;
  drawSprite(context, kind, x, y, size, frame);
}

function drawShieldLinks(context: CanvasRenderingContext2D, state: ExpansionGameState, ox: number, oy: number, size: number, frame: ExpansionRenderFrame): void {
  let links = shieldLinks.get(state);
  if (!links) { links = getShieldLinks(state.intrusions); shieldLinks.set(state, links); }
  context.save();
  context.strokeStyle = "rgba(179,129,255,.85)";
  context.lineWidth = Math.max(2, size * .028);
  context.setLineDash([size * .045, size * .055]);
  for (const link of links) {
    const from = frame.intrusionPositions.get(link.sourceId);
    const to = frame.intrusionPositions.get(link.targetId);
    if (!from || !to) continue;
    context.beginPath();
    context.moveTo(ox + (from.x + .5) * size, oy + (from.y + .5) * size);
    context.lineTo(ox + (to.x + .5) * size, oy + (to.y + .5) * size);
    context.stroke();
    context.strokeRect(ox + (to.x + .14) * size, oy + (to.y + .14) * size, size * .72, size * .72);
  }
  context.restore();
}

function drawSapperTelegraphs(context: CanvasRenderingContext2D, state: ExpansionGameState, ox: number, oy: number, size: number, frame: ExpansionRenderFrame): void {
  const pulse = frame.reducedMotion ? .62 : .48 + Math.sin(frame.timeMs / 240) * .12;
  let targets = sapperTargets.get(state);
  if (!targets) {
    const computed = new Map<number, GridPosition>();
    for (const intrusion of state.intrusions) {
      if (intrusion.kind !== "sapper") continue;
      const target = getExpansionSapperTarget(state, intrusion);
      if (target) computed.set(intrusion.id, target.position);
    }
    targets = computed;
    sapperTargets.set(state, targets);
  }
  context.save();
  context.strokeStyle = `rgba(255,79,145,${pulse})`;
  context.lineWidth = Math.max(2, size * .035);
  context.setLineDash([size * .12, size * .09]);
  for (const intrusion of state.intrusions) {
    if (intrusion.kind !== "sapper") continue;
    const target = targets.get(intrusion.id);
    if (!target) continue;
    const position = frame.intrusionPositions.get(intrusion.id) ?? intrusion.position;
    context.beginPath();
    context.moveTo(ox + (position.x + .5) * size, oy + (position.y + .5) * size);
    context.lineTo(ox + (target.x + .5) * size, oy + (target.y + .5) * size);
    context.stroke();
    context.strokeRect(ox + target.x * size + size * .12, oy + target.y * size + size * .12, size * .76, size * .76);
  }
  context.restore();
}

function drawCombatEffects(context: CanvasRenderingContext2D, frame: ExpansionRenderFrame, ox: number, oy: number, size: number): void {
  for (const { event, progress } of frame.effects) {
    context.save();
    context.globalAlpha = 1 - progress;
    context.lineWidth = Math.max(2, size * .035);
    if (event.type === "turretHit") {
      const { source, target } = getExpansionShotEndpoints(event, frame.intrusionPositions);
      const fromX = ox + (source.x + .5) * size;
      const fromY = oy + (source.y + .5) * size;
      const toX = ox + (target.x + .5) * size;
      const toY = oy + (target.y + .5) * size;
      context.strokeStyle = event.weapon === "arcIce" ? "#c6a2ff" : "#8ad9ff";
      context.shadowColor = event.weapon === "arcIce" ? "#a16aff" : "#60bfff";
      context.shadowBlur = frame.lowQuality ? 0 : size * .12;
      context.beginPath(); context.moveTo(fromX, fromY); context.lineTo(toX, toY); context.stroke();
      context.fillStyle = "#edfcff";
      const radius = size * (frame.reducedMotion ? .09 : .04 + progress * .13);
      context.beginPath(); context.arc(toX, toY, radius, 0, Math.PI * 2); context.fill();
    } else if (event.type === "sapperDeathPulse") {
      const x = ox + (event.position.x + .5) * size;
      const y = oy + (event.position.y + .5) * size;
      const radius = size * (frame.reducedMotion ? 1 : .2 + Math.min(1, progress * 2) * .8);
      context.strokeStyle = "#ff4f91";
      context.fillStyle = "rgba(255,79,145,.18)";
      context.shadowColor = "#ff4f91";
      context.shadowBlur = frame.lowQuality ? 0 : size * .12;
      context.lineWidth = Math.max(3, size * .055);
      context.beginPath();
      context.moveTo(x - radius, y); context.lineTo(x + radius, y);
      context.moveTo(x, y - radius); context.lineTo(x, y + radius);
      context.stroke();
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const tileX = event.position.x + dx!;
        const tileY = event.position.y + dy!;
        if (tileX < 0 || tileX >= 8 || tileY < 0 || tileY >= 8) continue;
        context.fillRect(ox + (tileX + .12) * size, oy + (tileY + .12) * size, size * .76, size * .76);
      }
    } else {
      const x = ox + (event.position.x + .5) * size;
      const y = oy + (event.position.y + .5) * size;
      const hostile = event.type === "intrusionNeutralized" || event.type === "unitDamaged" || event.type === "tileCorrupted";
      context.strokeStyle = hostile ? "#ff6c9f" : event.type === "latencyTrapTriggered" ? "#b381ff" : "#7dfcc0";
      if (event.type === "unitDamaged" || event.type === "tileCorrupted" || event.type === "tileCleansed") {
        context.strokeRect(x - size * .4, y - size * .4, size * .8, size * .8);
      } else {
        const radius = size * (frame.reducedMotion ? .25 : .12 + progress * .25);
        context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.stroke();
      }
    }
    context.restore();
  }
}

function drawSprite(context: CanvasRenderingContext2D, id: ExpansionVisualAssetId, x: number, y: number, size: number, frame: ExpansionRenderFrame): void {
  const hostile = ["probe", "crawler", "spoof", "hunter", "splitter", "goliath", "rusher", "sapper", "shieldDrone"].includes(id);
  const accent = hostile || id === "core" ? "#ff4f91" : id === "arcIce" || id === "latencyTrap" ? "#b381ff" : "#22e0c4";
  const label = id === "arcIce" ? "ARC" : id === "shieldDrone" ? "SHD" : id.slice(0, 3).toUpperCase();
  drawImageOrGlyph(context, getExpansionArtSprite(id, frame.artMode), label, accent, x, y, size, frame.artMode === "blender-v2");
}

function drawImageOrGlyph(context: CanvasRenderingContext2D, image: HTMLImageElement | null, label: string, color: string, x: number, y: number, size: number, fullTile: boolean): void {
  context.fillStyle = "rgba(0,0,0,.48)";
  context.beginPath();
  context.ellipse(x + size * .52, y + size * .69, size * .3, size * .12, 0, 0, Math.PI * 2);
  context.fill();
  if (image) {
    const margin = fullTile ? 0 : size * .08;
    context.drawImage(image, x + margin, y + margin, size - margin * 2, size - margin * 2);
  }
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
