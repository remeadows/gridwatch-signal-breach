import "./rusherVisualPreview.css";
import rusherUrl from "../assets/board/expansion1/gw-expansion1-rusher-board-v1.png";
import coreUrl from "../assets/board/phase6/gw-phase6-core-board-v1.webp";
import firewallUrl from "../assets/board/phase6/gw-phase6-firewall-board-v1.png";
import probeUrl from "../assets/board/phase6/gw-phase6-probe-board-v1.png";
import sourceUrl from "../assets/board/phase6/gw-phase6-source-board-v1.png";
import turretUrl from "../assets/board/phase6/gw-phase6-turret-board-v1.png";

type PreviewSprite = "rusher" | "probe" | "source" | "core" | "firewall" | "turret";

const SPRITE_URLS: Readonly<Record<PreviewSprite, string>> = {
  rusher: rusherUrl,
  probe: probeUrl,
  source: sourceUrl,
  core: coreUrl,
  firewall: firewallUrl,
  turret: turretUrl,
};

const GRID_SIZE = 8;
const CANVAS_SIZE = 720;
const BOARD_INSET = 40;
const TILE_SIZE = 80;

export function mountRusherVisualPreview(parent: HTMLElement): void {
  const preview = document.createElement("section");
  const motionInitiallyReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  preview.className = "rusher-lab";
  preview.dataset.motion = motionInitiallyReduced ? "off" : "on";
  preview.setAttribute("aria-label", "Rusher visual quality assurance preview");
  preview.innerHTML = createPreviewMarkup();
  parent.append(preview);

  for (const sibling of Array.from(parent.children)) {
    if (sibling !== preview && sibling instanceof HTMLElement) {
      sibling.inert = true;
      sibling.setAttribute("aria-hidden", "true");
    }
  }

  const canvas = preview.querySelector<HTMLCanvasElement>("[data-rusher-canvas]");
  const motionButton = preview.querySelector<HTMLButtonElement>("[data-motion-toggle]");
  const status = preview.querySelector<HTMLElement>(".rusher-lab__status");

  if (!canvas || !motionButton || !status) {
    throw new Error("Rusher preview shell is incomplete.");
  }

  let setMotion: ((enabled: boolean) => void) | null = null;
  syncMotionButton(motionButton, motionInitiallyReduced);
  motionButton.addEventListener("click", () => {
    const next = preview.dataset.motion === "on" ? "off" : "on";
    preview.dataset.motion = next;
    syncMotionButton(motionButton, next === "off");
    setMotion?.(next === "on");
  });

  void loadSprites()
    .then((sprites) => {
      setMotion = createBoardAnimator(canvas, sprites);
      setMotion(preview.dataset.motion === "on");
    })
    .catch((error: unknown) => {
      status.textContent = "Asset load failed";
      console.error("Rusher preview asset load failed.", error);
    });
}

function syncMotionButton(button: HTMLButtonElement, reduced: boolean): void {
  button.textContent = reduced ? "ENABLE MOTION" : "REDUCE MOTION";
  button.setAttribute("aria-pressed", String(reduced));
}

function createPreviewMarkup(): string {
  const directions = [
    ["E", "0deg"],
    ["S", "90deg"],
    ["W", "180deg"],
    ["N", "-90deg"],
  ] as const;

  return `
    <div class="rusher-lab__shell">
      <header class="rusher-lab__header">
        <div>
          <p class="rusher-lab__eyebrow">Expansion 1 · Local visual QA · Not playable</p>
          <h1>Rusher Interceptor</h1>
          <p class="rusher-lab__summary">
            Board-scale intake preview for the approved 6 HP fast/fragile hostile.
            This lab changes no campaign, replay, score, validator, or database behavior.
          </p>
        </div>
        <div class="rusher-lab__actions">
          <button class="rusher-lab__button" type="button" data-motion-toggle aria-pressed="false">REDUCE MOTION</button>
          <a class="rusher-lab__button" href="/">OPEN CURRENT GAME</a>
        </div>
      </header>

      <div class="rusher-lab__grid">
        <section class="rusher-lab__panel rusher-lab__panel--board" aria-labelledby="rusher-board-title">
          <div class="rusher-lab__panel-heading">
            <h2 id="rusher-board-title">8×8 tactical context</h2>
            <p class="rusher-lab__status">Presentation motion only</p>
          </div>
          <div class="rusher-lab__canvas-wrap">
            <canvas class="rusher-lab__canvas" data-rusher-canvas width="${CANVAS_SIZE}" height="${CANVAS_SIZE}">
              Rusher board-scale visual preview.
            </canvas>
          </div>
          <div class="rusher-lab__legend" aria-label="Preview legend">
            <span><b>RSH</b> Rusher</span>
            <span><b>PRO</b> Probe comparator</span>
            <span><b>6 HP</b> approved durability</span>
            <span><b>1×</b> every active tick</span>
          </div>
        </section>

        <section class="rusher-lab__panel" aria-labelledby="rusher-scale-title">
          <div class="rusher-lab__panel-heading">
            <h2 id="rusher-scale-title">Legibility floor</h2>
            <p class="rusher-lab__metric">55 / 43 / 32 CSS px</p>
          </div>
          <div class="rusher-lab__samples">
            ${[55, 43, 32]
              .map(
                (size) => `
                  <div class="rusher-lab__sample">
                    <img src="${rusherUrl}" alt="" style="--sprite-size:${size}px">
                    <span>${size}px</span>
                  </div>`,
              )
              .join("")}
          </div>
          <ul class="rusher-lab__notes">
            <li>Narrow delta silhouette separates it from the broad, round Probe.</li>
            <li>Magenta sensor and rear emitters remain accents, not the silhouette.</li>
            <li>Transparent master leaves trails, shadows, HP, and effects procedural.</li>
          </ul>
        </section>

        <section class="rusher-lab__panel" aria-labelledby="rusher-direction-title">
          <div class="rusher-lab__panel-heading">
            <h2 id="rusher-direction-title">Directional read</h2>
            <p class="rusher-lab__metric">Canvas rotation</p>
          </div>
          <div class="rusher-lab__directions">
            ${directions
              .map(
                ([label, rotation]) => `
                  <div class="rusher-lab__direction">
                    <img src="${rusherUrl}" alt="Rusher facing ${label}" style="--rotation:${rotation}">
                    <span>${label}</span>
                  </div>`,
              )
              .join("")}
          </div>
        </section>
      </div>
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

  if (!context) {
    throw new Error("Canvas2D is unavailable for the Rusher preview.");
  }

  let frameId: number | null = null;
  let motionEnabled = false;
  const draw = (timeMs: number) => {
    drawBoard(context, sprites, timeMs);
    frameId = requestAnimationFrame(draw);
  };

  const setEnabled = (enabled: boolean) => {
    motionEnabled = enabled;
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }

    if (enabled) {
      frameId = requestAnimationFrame(draw);
    } else {
      drawBoard(context, sprites, 0);
    }
  };

  window.addEventListener("pagehide", () => {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
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
  drawRoute(context, timeMs);

  drawTileFrame(context, 0, 6, "#22e0c4");
  drawSprite(context, sprites.source, 0, 6, 0.8);
  drawLabel(context, "SRC", 0, 6, "#bafff4");

  drawTileFrame(context, 7, 1, "#ff4f91");
  drawSprite(context, sprites.core, 7, 1, 0.82);
  drawLabel(context, "CORE", 7, 1, "#ffd3e3");

  drawTileFrame(context, 4, 4, "#f2c94c");
  drawSprite(context, sprites.firewall, 4, 4, 0.94);
  drawHp(context, 4, 4, 24, 24, "#f2c94c");

  drawTileFrame(context, 5, 4, "#4da3ff");
  drawSprite(context, sprites.turret, 5, 4, 0.88);

  drawEnemyFrame(context, 1, 2, "#f2c94c");
  drawSprite(context, sprites.probe, 1, 2, 0.82, 0);
  drawHp(context, 1, 2, 5, 5, "#f2c94c");
  drawLabel(context, "PRO", 1, 2, "#ffe694");

  const pulse = timeMs === 0 ? 0 : (Math.sin(timeMs * 0.006) + 1) / 2;
  drawRusher(context, sprites.rusher, 2, 6, 0, pulse);
  drawRusher(context, sprites.rusher, 6, 2, -Math.PI / 2, pulse);
  drawRusher(context, sprites.rusher, 7, 4, Math.PI / 2, pulse);
}

function drawFloor(context: CanvasRenderingContext2D): void {
  const gradient = context.createRadialGradient(360, 330, 40, 360, 360, 470);
  gradient.addColorStop(0, "#0b1c24");
  gradient.addColorStop(1, "#040b10");
  context.fillStyle = gradient;
  context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  context.fillStyle = "rgba(255, 79, 145, 0.08)";
  context.fillRect(BOARD_INSET, BOARD_INSET, TILE_SIZE * GRID_SIZE, TILE_SIZE * GRID_SIZE);

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const left = BOARD_INSET + x * TILE_SIZE;
      const top = BOARD_INSET + y * TILE_SIZE;
      context.fillStyle = (x + y) % 2 === 0 ? "rgba(5, 24, 31, 0.88)" : "rgba(6, 18, 27, 0.9)";
      context.fillRect(left + 2, top + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      context.strokeStyle = "rgba(80, 175, 172, 0.16)";
      context.lineWidth = 1;
      context.strokeRect(left + 3.5, top + 3.5, TILE_SIZE - 7, TILE_SIZE - 7);
    }
  }

  context.strokeStyle = "rgba(255, 79, 145, 0.72)";
  context.lineWidth = 3;
  context.strokeRect(BOARD_INSET, BOARD_INSET, TILE_SIZE * GRID_SIZE, TILE_SIZE * GRID_SIZE);
}

function drawRoute(context: CanvasRenderingContext2D, timeMs: number): void {
  const route = [
    [0, 6], [1, 6], [2, 6], [3, 6], [3, 5], [4, 5], [5, 5],
    [6, 5], [6, 4], [6, 3], [7, 3], [7, 2], [7, 1],
  ] as const;

  context.save();
  context.strokeStyle = "rgba(34, 224, 196, 0.24)";
  context.lineWidth = 12;
  context.lineJoin = "round";
  context.lineCap = "round";
  strokePath(context, route);

  context.strokeStyle = "#22e0c4";
  context.shadowColor = "#22e0c4";
  context.shadowBlur = 12;
  context.lineWidth = 3;
  context.setLineDash([18, 12]);
  context.lineDashOffset = timeMs === 0 ? 0 : -(timeMs * 0.035) % 30;
  strokePath(context, route);
  context.restore();
}

function strokePath(context: CanvasRenderingContext2D, route: readonly (readonly [number, number])[]): void {
  context.beginPath();
  route.forEach(([x, y], index) => {
    const center = tileCenter(x, y);
    if (index === 0) context.moveTo(center.x, center.y);
    else context.lineTo(center.x, center.y);
  });
  context.stroke();
}

function drawRusher(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  rotation: number,
  pulse: number,
): void {
  const center = tileCenter(x, y);
  const radius = TILE_SIZE * (0.31 + pulse * 0.015);

  context.save();
  context.strokeStyle = `rgba(255, 79, 145, ${0.52 + pulse * 0.22})`;
  context.lineWidth = 2;
  context.setLineDash([7, 6]);
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();

  drawEnemyFrame(context, x, y, "#ff4f91");
  drawSprite(context, image, x, y, 0.82, rotation);
  drawHp(context, x, y, 6, 6, "#ff4f91");
  drawLabel(context, "RSH", x, y, "#ffafd0");
}

function drawSprite(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  scale: number,
  rotation = 0,
): void {
  const center = tileCenter(x, y);
  const size = TILE_SIZE * scale;
  drawContactShadow(context, x, y, scale * 0.26);
  context.save();
  context.translate(center.x, center.y);
  context.rotate(rotation);
  context.drawImage(image, -size / 2, -size / 2, size, size);
  context.restore();
}

function drawContactShadow(context: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  const center = tileCenter(x, y);
  context.save();
  context.fillStyle = "rgba(0, 0, 0, 0.48)";
  context.beginPath();
  context.ellipse(center.x + 3, center.y + 17, TILE_SIZE * scale, TILE_SIZE * scale * 0.34, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawTileFrame(context: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  const left = BOARD_INSET + x * TILE_SIZE;
  const top = BOARD_INSET + y * TILE_SIZE;
  context.fillStyle = "rgba(3, 9, 13, 0.42)";
  context.fillRect(left + 6, top + 6, TILE_SIZE - 12, TILE_SIZE - 12);
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.strokeRect(left + 6, top + 6, TILE_SIZE - 12, TILE_SIZE - 12);
}

function drawEnemyFrame(context: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  const center = tileCenter(x, y);
  context.fillStyle = "rgba(3, 9, 13, 0.72)";
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(center.x, center.y, TILE_SIZE * 0.25, 0, Math.PI * 2);
  context.fill();
  context.stroke();
}

function drawHp(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  hp: number,
  maxHp: number,
  color: string,
): void {
  const center = tileCenter(x, y);
  const width = TILE_SIZE * 0.48;
  const top = center.y + TILE_SIZE * 0.27;
  context.fillStyle = "rgba(0, 0, 0, 0.8)";
  context.fillRect(center.x - width / 2, top, width, 4);
  context.fillStyle = color;
  context.fillRect(center.x - width / 2, top, width * (hp / maxHp), 4);
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
  context.font = '700 10px ui-monospace, "SF Mono", Consolas, monospace';
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
