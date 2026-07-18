import "./latencyTrapVisualPreview.css";
import trapUrl from "../assets/board/expansion1/gw-expansion1-latency-trap-board-v1.png";
import rusherUrl from "../assets/board/expansion1/gw-expansion1-rusher-board-v1.png";
import coreUrl from "../assets/board/phase6/gw-phase6-core-board-v1.webp";
import firewallUrl from "../assets/board/phase6/gw-phase6-firewall-board-v1.png";
import relayUrl from "../assets/board/phase6/gw-phase6-relay-board-v1.png";
import sourceUrl from "../assets/board/phase6/gw-phase6-source-board-v1.png";
import turretUrl from "../assets/board/phase6/gw-phase6-turret-board-v1.png";

type PreviewSprite =
  | "trap"
  | "rusher"
  | "source"
  | "core"
  | "relay"
  | "firewall"
  | "turret";

const SPRITE_URLS: Readonly<Record<PreviewSprite, string>> = {
  trap: trapUrl,
  rusher: rusherUrl,
  source: sourceUrl,
  core: coreUrl,
  relay: relayUrl,
  firewall: firewallUrl,
  turret: turretUrl,
};

const CANVAS_SIZE = 720;
const BOARD_INSET = 40;
const TILE_SIZE = 80;

export async function mountLatencyTrapVisualPreview(parent: HTMLElement): Promise<void> {
  const preview = document.createElement("section");
  const motionInitiallyReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  preview.className = "latency-lab";
  preview.dataset.motion = motionInitiallyReduced ? "off" : "on";
  preview.setAttribute("aria-label", "Latency Trap visual quality assurance preview");
  preview.innerHTML = createPreviewMarkup();
  parent.append(preview);

  const siblingStates = Array.from(parent.children)
    .filter(
      (sibling): sibling is HTMLElement => sibling !== preview && sibling instanceof HTMLElement,
    )
    .map((element) => ({
      ariaHidden: element.getAttribute("aria-hidden"),
      element,
      inert: element.inert,
    }));

  for (const { element } of siblingStates) {
    element.inert = true;
    element.setAttribute("aria-hidden", "true");
  }

  const restoreApplication = () => {
    preview.remove();
    for (const { ariaHidden, element, inert } of siblingStates) {
      element.inert = inert;
      if (ariaHidden === null) element.removeAttribute("aria-hidden");
      else element.setAttribute("aria-hidden", ariaHidden);
    }
  };

  const canvas = preview.querySelector<HTMLCanvasElement>("[data-latency-canvas]");
  const motionButton = preview.querySelector<HTMLButtonElement>("[data-motion-toggle]");
  const status = preview.querySelector<HTMLElement>(".latency-lab__status");

  if (!canvas || !motionButton || !status) {
    restoreApplication();
    throw new Error("Latency Trap preview shell is incomplete.");
  }

  let setMotion: ((enabled: boolean) => void) | null = null;
  syncMotionButton(motionButton, motionInitiallyReduced);
  motionButton.addEventListener("click", () => {
    const next = preview.dataset.motion === "on" ? "off" : "on";
    preview.dataset.motion = next;
    syncMotionButton(motionButton, next === "off");
    setMotion?.(next === "on");
  });

  try {
    const sprites = await loadSprites();
    setMotion = createBoardAnimator(canvas, sprites);
    setMotion(preview.dataset.motion === "on");
  } catch (error: unknown) {
    restoreApplication();
    throw error;
  }
}

function syncMotionButton(button: HTMLButtonElement, reduced: boolean): void {
  button.textContent = reduced ? "ENABLE MOTION" : "REDUCE MOTION";
}

function createPreviewMarkup(): string {
  return `
    <div class="latency-lab__shell">
      <header class="latency-lab__header">
        <div>
          <p class="latency-lab__eyebrow">Expansion 1 · Local visual QA · Not playable</p>
          <h1>Latency Trap</h1>
          <p class="latency-lab__summary">
            Board-scale intake preview for the approved 10 BW, three-charge timing device.
            It delays intrusions for ICE; it carries no signal, deals no damage, and blocks nothing.
          </p>
        </div>
        <div class="latency-lab__actions">
          <button class="latency-lab__button" type="button" data-motion-toggle>REDUCE MOTION</button>
          <a class="latency-lab__button" href="/">OPEN CURRENT GAME</a>
        </div>
      </header>

      <div class="latency-lab__grid">
        <section class="latency-lab__panel latency-lab__panel--board" aria-labelledby="latency-board-title">
          <div class="latency-lab__panel-heading">
            <h2 id="latency-board-title">8×8 tactical context</h2>
            <p class="latency-lab__status">Presentation motion only</p>
          </div>
          <div class="latency-lab__canvas-wrap">
            <canvas class="latency-lab__canvas" data-latency-canvas width="${CANVAS_SIZE}" height="${CANVAS_SIZE}">
              Latency Trap board-scale visual preview.
            </canvas>
          </div>
          <div class="latency-lab__legend" aria-label="Preview legend">
            <span><b>Magenta lane</b> intrusion path</span>
            <span><b>Cyan route</b> signal only</span>
            <span><b>3 pips</b> remaining charges</span>
            <span><b>Blue field</b> ICE coverage</span>
          </div>
        </section>

        <section class="latency-lab__panel" aria-labelledby="latency-charge-title">
          <div class="latency-lab__panel-heading">
            <h2 id="latency-charge-title">Charge readability</h2>
            <p class="latency-lab__metric">55 / 43 / 32 CSS px</p>
          </div>
          <div class="latency-lab__charges">
            ${[3, 2, 1]
              .map((charges, index) => createChargeCard(charges, [55, 43, 32][index]))
              .join("")}
          </div>
        </section>

        <section class="latency-lab__panel" aria-labelledby="latency-contract-title">
          <div class="latency-lab__panel-heading">
            <h2 id="latency-contract-title">Player contract</h2>
            <p class="latency-lab__metric">Visual separation</p>
          </div>
          <ul class="latency-lab__rules">
            <li><b>Trap</b><span>Walk-through timing pad · delays first three entries · 0 damage.</span></li>
            <li><b>Firewall</b><span>Solid wall · blocks and reroutes · absorbs damage.</span></li>
            <li><b>ICE</b><span>Attacks inside the blue field · benefits from the added time.</span></li>
            <li><b>Signal</b><span>Cyan route stays separate; the trap never carries or severs it.</span></li>
          </ul>
        </section>
      </div>
    </div>`;
}

function createChargeCard(charges: number, size: number): string {
  const pips = Array.from({ length: 3 }, (_, index) =>
    `<i class="latency-lab__pip${index < charges ? " latency-lab__pip--live" : ""}"></i>`,
  ).join("");

  return `
    <div class="latency-lab__charge-card">
      <div class="latency-lab__device" style="--device-size:${size}px">
        <img src="${trapUrl}" alt="">
        <div class="latency-lab__pips" aria-hidden="true">${pips}</div>
      </div>
      <span>${charges} charge${charges === 1 ? "" : "s"}</span>
    </div>`;
}

async function loadSprites(): Promise<Readonly<Record<PreviewSprite, HTMLImageElement>>> {
  const entries = await Promise.all(
    (Object.entries(SPRITE_URLS) as [PreviewSprite, string][]).map(async ([id, url]) => {
      const image = new Image();
      image.decoding = "async";
      image.src = url;
      await image.decode();
      return [id, image] as const;
    }),
  );

  return Object.fromEntries(entries) as Record<PreviewSprite, HTMLImageElement>;
}

function createBoardAnimator(
  canvas: HTMLCanvasElement,
  sprites: Readonly<Record<PreviewSprite, HTMLImageElement>>,
): (enabled: boolean) => void {
  const context = canvas.getContext("2d");

  if (!context) throw new Error("Canvas2D is unavailable for the Latency Trap preview.");

  let frameId: number | null = null;
  let motionEnabled = false;
  const draw = (timeMs: number) => {
    drawBoard(context, sprites, timeMs);
    frameId = requestAnimationFrame(draw);
  };
  const setEnabled = (enabled: boolean) => {
    motionEnabled = enabled;
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = enabled ? requestAnimationFrame(draw) : null;
    if (!enabled) drawBoard(context, sprites, 0);
  };

  window.addEventListener("pagehide", () => {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) setEnabled(motionEnabled);
  });

  return setEnabled;
}

function drawBoard(
  context: CanvasRenderingContext2D,
  sprites: Readonly<Record<PreviewSprite, HTMLImageElement>>,
  timeMs: number,
): void {
  context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  drawFloor(context);
  drawIceRange(context, 4, 5);
  drawSignalRoute(context, timeMs);
  drawIntrusionLane(context, timeMs);
  drawCorruption(context, 1, 4);

  drawFramedSprite(context, sprites.source, 0, 1, 0.8, "#22e0c4", "SRC");
  for (const [x, y] of [[2, 1], [4, 1], [6, 1]] as const) {
    drawFramedSprite(context, sprites.relay, x, y, 0.84, "#22e0c4", "REL");
  }
  drawFramedSprite(context, sprites.core, 7, 2, 0.82, "#ff4f91", "CORE");
  drawFramedSprite(context, sprites.turret, 4, 5, 0.88, "#4da3ff", "ICE");
  drawFramedSprite(context, sprites.firewall, 5, 4, 0.94, "#f2c94c", "WALL");

  const pulse = timeMs === 0 ? 0.45 : (Math.sin(timeMs * 0.008) + 1) / 2;
  drawTrap(context, sprites.trap, 3, 6, 3, pulse);

  const travel = timeMs === 0 ? 0.18 : (timeMs * 0.0004) % 1;
  drawMovingRusher(context, sprites.rusher, 1.7 + travel * 3.2, 6, pulse);
  drawLabel(context, "RUSHER →", 2, 6, "#ff9dc1");
}

function drawFloor(context: CanvasRenderingContext2D): void {
  const gradient = context.createRadialGradient(360, 330, 40, 360, 360, 470);
  gradient.addColorStop(0, "#0b1c24");
  gradient.addColorStop(1, "#040b10");
  context.fillStyle = gradient;
  context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const left = BOARD_INSET + x * TILE_SIZE;
      const top = BOARD_INSET + y * TILE_SIZE;
      context.fillStyle = (x + y) % 2 === 0 ? "rgba(5, 24, 31, 0.9)" : "rgba(6, 18, 27, 0.92)";
      context.fillRect(left + 2, top + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      context.strokeStyle = "rgba(80, 175, 172, 0.16)";
      context.strokeRect(left + 3.5, top + 3.5, TILE_SIZE - 7, TILE_SIZE - 7);
    }
  }

  context.strokeStyle = "rgba(143, 113, 255, 0.74)";
  context.lineWidth = 3;
  context.strokeRect(BOARD_INSET, BOARD_INSET, TILE_SIZE * 8, TILE_SIZE * 8);
}

function drawSignalRoute(context: CanvasRenderingContext2D, timeMs: number): void {
  const route = [[0, 1], [2, 1], [4, 1], [6, 1], [7, 2]] as const;
  drawPolyline(context, route, "rgba(34, 224, 196, 0.24)", 12, []);
  drawPolyline(context, route, "#22e0c4", 3, [18, 12], timeMs === 0 ? 0 : -(timeMs * 0.035) % 30);
}

function drawIntrusionLane(context: CanvasRenderingContext2D, timeMs: number): void {
  const lane = [[-0.4, 6], [3, 6], [6, 6], [6, 3], [7, 2]] as const;
  drawPolyline(context, lane, "rgba(255, 79, 145, 0.18)", 10, []);
  drawPolyline(context, lane, "rgba(255, 79, 145, 0.78)", 2, [10, 9], timeMs === 0 ? 0 : -(timeMs * 0.025) % 19);
}

function drawPolyline(
  context: CanvasRenderingContext2D,
  points: readonly (readonly [number, number])[],
  color: string,
  width: number,
  dash: number[],
  dashOffset = 0,
): void {
  context.save();
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.setLineDash(dash);
  context.lineDashOffset = dashOffset;
  context.beginPath();
  points.forEach(([x, y], index) => {
    const center = tileCenter(x, y);
    if (index === 0) context.moveTo(center.x, center.y);
    else context.lineTo(center.x, center.y);
  });
  context.stroke();
  context.restore();
}

function drawIceRange(context: CanvasRenderingContext2D, centerX: number, centerY: number): void {
  context.save();
  context.fillStyle = "rgba(77, 163, 255, 0.07)";
  context.strokeStyle = "rgba(77, 163, 255, 0.18)";
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      if (Math.abs(x - centerX) + Math.abs(y - centerY) > 2) continue;
      const left = BOARD_INSET + x * TILE_SIZE + 7;
      const top = BOARD_INSET + y * TILE_SIZE + 7;
      context.fillRect(left, top, TILE_SIZE - 14, TILE_SIZE - 14);
      context.strokeRect(left, top, TILE_SIZE - 14, TILE_SIZE - 14);
    }
  }
  context.restore();
}

function drawCorruption(context: CanvasRenderingContext2D, x: number, y: number): void {
  const left = BOARD_INSET + x * TILE_SIZE + 5;
  const top = BOARD_INSET + y * TILE_SIZE + 5;
  context.fillStyle = "rgba(182, 140, 255, 0.18)";
  context.fillRect(left, top, TILE_SIZE - 10, TILE_SIZE - 10);
  context.strokeStyle = "rgba(255, 79, 145, 0.62)";
  context.setLineDash([5, 4]);
  context.strokeRect(left, top, TILE_SIZE - 10, TILE_SIZE - 10);
  context.setLineDash([]);
  drawLabel(context, "CORRUPT", x, y, "#d7bfff");
}

function drawTrap(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  charges: number,
  pulse: number,
): void {
  const center = tileCenter(x, y);
  const size = TILE_SIZE * 0.94;
  context.save();
  context.strokeStyle = `rgba(188, 167, 255, ${0.58 + pulse * 0.28})`;
  context.lineWidth = 2;
  context.setLineDash([7, 5]);
  context.strokeRect(center.x - 34, center.y - 34, 68, 68);
  context.beginPath();
  context.arc(center.x, center.y, 22 + pulse * 8, 0, Math.PI * 2);
  context.stroke();
  context.restore();
  drawSprite(context, image, center.x, center.y, size);
  drawChargePips(context, center.x, center.y + 28, charges);
  drawLabel(context, "TRAP · WALK-THROUGH", x, y, "#d9ceff");
}

function drawMovingRusher(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  pulse: number,
): void {
  const center = tileCenter(x, y);
  context.save();
  context.strokeStyle = `rgba(255, 79, 145, ${0.38 + pulse * 0.28})`;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(center.x, center.y, 21, 0, Math.PI * 2);
  context.stroke();
  context.restore();
  drawSprite(context, image, center.x, center.y, TILE_SIZE * 0.82);
}

function drawFramedSprite(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  scale: number,
  color: string,
  label: string,
): void {
  const center = tileCenter(x, y);
  const left = BOARD_INSET + x * TILE_SIZE + 6;
  const top = BOARD_INSET + y * TILE_SIZE + 6;
  context.fillStyle = "rgba(3, 9, 13, 0.5)";
  context.fillRect(left, top, TILE_SIZE - 12, TILE_SIZE - 12);
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.strokeRect(left, top, TILE_SIZE - 12, TILE_SIZE - 12);
  drawSprite(context, image, center.x, center.y, TILE_SIZE * scale);
  drawLabel(context, label, x, y, color);
}

function drawSprite(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  centerX: number,
  centerY: number,
  size: number,
): void {
  context.save();
  context.fillStyle = "rgba(0, 0, 0, 0.42)";
  context.beginPath();
  context.ellipse(centerX + 3, centerY + 17, size * 0.28, size * 0.09, 0, 0, Math.PI * 2);
  context.fill();
  context.drawImage(image, centerX - size / 2, centerY - size / 2, size, size);
  context.restore();
}

function drawChargePips(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  charges: number,
): void {
  for (let index = 0; index < 3; index += 1) {
    const x = centerX + (index - 1) * 10;
    context.save();
    context.translate(x, centerY);
    context.rotate(Math.PI / 4);
    context.fillStyle = index < charges ? "#8f71ff" : "rgba(7, 16, 23, 0.92)";
    context.strokeStyle = "#bca7ff";
    context.shadowColor = index < charges ? "#8f71ff" : "transparent";
    context.shadowBlur = index < charges ? 6 : 0;
    context.fillRect(-3.5, -3.5, 7, 7);
    context.strokeRect(-3.5, -3.5, 7, 7);
    context.restore();
  }
}

function drawLabel(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
): void {
  const center = tileCenter(x, y);
  context.fillStyle = color;
  context.font = '700 9px ui-monospace, "SF Mono", Consolas, monospace';
  context.textAlign = "center";
  context.textBaseline = "bottom";
  context.fillText(text, center.x, center.y + TILE_SIZE * 0.47);
}

function tileCenter(x: number, y: number): { x: number; y: number } {
  return {
    x: BOARD_INSET + x * TILE_SIZE + TILE_SIZE / 2,
    y: BOARD_INSET + y * TILE_SIZE + TILE_SIZE / 2,
  };
}
