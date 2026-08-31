import "./sapperPrototypePreview.css";
import {
  SAPPER_PROTOTYPE,
  createSapperPrototypeIntrusion,
  selectSapperPrototypeTarget,
  stepSapperPrototype,
  type SapperPrototypeEvent,
  type SapperPrototypeHardware,
  type SapperPrototypeState,
} from "../sim/expansion/sapperPrototype";

const GRID_SIZE = 8;
const CANVAS_SIZE = 640;
const BOARD_INSET = 32;
const TILE_SIZE = 72;

type FormationMode = "safe" | "clustered";

export function mountSapperPrototypePreview(parent: HTMLElement): void {
  const preview = document.createElement("section");
  preview.className = "sapper-lab";
  preview.setAttribute("aria-label", "Sapper mechanic prototype preview");
  preview.innerHTML = createMarkup();
  parent.append(preview);

  for (const sibling of Array.from(parent.children)) {
    if (sibling !== preview && sibling instanceof HTMLElement) {
      sibling.inert = true;
      sibling.setAttribute("aria-hidden", "true");
    }
  }

  const canvas = requireElement(preview, "[data-sapper-canvas]", HTMLCanvasElement);
  const status = requireElement(preview, "[data-status]", HTMLElement);
  const target = requireElement(preview, "[data-target]", HTMLElement);
  const result = requireElement(preview, "[data-result]", HTMLElement);
  const eventList = requireElement(preview, "[data-event-list]", HTMLOListElement);
  const stepButton = requireElement(preview, "[data-step]", HTMLButtonElement);
  const autoButton = requireElement(preview, "[data-auto]", HTMLButtonElement);
  const resetButton = requireElement(preview, "[data-reset]", HTMLButtonElement);
  const modeButtons = Array.from(preview.querySelectorAll<HTMLButtonElement>("[data-mode]"));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas2D is unavailable for the Sapper prototype.");

  let mode: FormationMode = "safe";
  let state = createFormation(mode);
  let timer: number | null = null;

  const stopAuto = () => {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    autoButton.textContent = "AUTO RUN";
    autoButton.setAttribute("aria-pressed", "false");
  };

  const render = (recentEvents: readonly SapperPrototypeEvent[] = []) => {
    drawPrototype(context, state, recentEvents);
    const intrusion = state.intrusions[0];
    const selectedTarget = intrusion ? selectSapperPrototypeTarget(state, intrusion) : null;
    status.textContent = intrusion
      ? `TICK ${state.tickCount} · ${intrusion.hp}/${intrusion.maxHp} HP`
      : `TICK ${state.tickCount} · NEUTRALIZED`;
    target.textContent = selectedTarget
      ? `${selectedTarget.kind.toUpperCase()} @ ${selectedTarget.position.x},${selectedTarget.position.y}`
      : "NONE";
    const pulse = [...state.events].reverse().find((event) => event.type === "sapperDeathPulse");
    result.textContent = pulse
      ? pulse.affectedHardware === 0
        ? "COUNTER PROVEN · ZERO HARDWARE HIT"
        : `FORMATION FAILED · ${pulse.affectedHardware} HARDWARE HIT`
      : "PENDING · ADVANCE THE PROTOTYPE";
    result.dataset.outcome = pulse ? (pulse.affectedHardware === 0 ? "safe" : "failed") : "pending";
    eventList.innerHTML = formatEvents(state.events.slice(-8));
    const complete = state.intrusions.length === 0;
    stepButton.disabled = complete;
    autoButton.disabled = complete;
    if (complete) stopAuto();
  };

  const reset = (nextMode = mode) => {
    stopAuto();
    mode = nextMode;
    state = createFormation(mode);
    for (const button of modeButtons) {
      const selected = button.dataset.mode === mode;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
    render();
  };

  const step = () => {
    if (state.intrusions.length === 0) return;
    const eventCount = state.events.length;
    state = stepSapperPrototype(state);
    render(state.events.slice(eventCount));
  };

  stepButton.addEventListener("click", step);
  resetButton.addEventListener("click", () => reset());
  autoButton.addEventListener("click", () => {
    if (timer !== null) {
      stopAuto();
      return;
    }
    autoButton.textContent = "PAUSE";
    autoButton.setAttribute("aria-pressed", "true");
    timer = window.setInterval(step, 520);
  });
  for (const button of modeButtons) {
    button.addEventListener("click", () => reset(button.dataset.mode as FormationMode));
  }
  window.addEventListener("pagehide", stopAuto, { once: true });
  reset();
}

function createMarkup(): string {
  return `
    <div class="sapper-lab__shell">
      <header class="sapper-lab__header">
        <div>
          <p class="sapper-lab__eyebrow">Expansion 1 · Phase 9A · Local mechanic proof</p>
          <h1>Sapper formation test</h1>
          <p class="sapper-lab__summary">
            The Sapper strictly targets a reachable Firewall, then releases a 6-damage
            orthogonal pulse when ICE neutralizes it. Compare identical combat timing
            with safe and clustered hardware placement. Procedural glyph only—production art is not approved.
          </p>
        </div>
        <a class="sapper-lab__button" href="/">OPEN CURRENT GAME</a>
      </header>

      <div class="sapper-lab__layout">
        <section class="sapper-lab__panel sapper-lab__panel--board" aria-labelledby="sapper-board-title">
          <div class="sapper-lab__panel-heading">
            <h2 id="sapper-board-title">Deterministic 8×8 lab</h2>
            <p class="sapper-lab__status" data-status>INITIALIZING</p>
          </div>
          <div class="sapper-lab__canvas-wrap">
            <canvas class="sapper-lab__canvas" data-sapper-canvas width="${CANVAS_SIZE}" height="${CANVAS_SIZE}">
              Sapper formation mechanic preview.
            </canvas>
          </div>
          <div class="sapper-lab__controls" aria-label="Prototype controls">
            <button class="sapper-lab__button selected" type="button" data-mode="safe" aria-pressed="true">SAFE SPACING</button>
            <button class="sapper-lab__button" type="button" data-mode="clustered" aria-pressed="false">CLUSTERED</button>
            <button class="sapper-lab__button" type="button" data-step>STEP +1</button>
            <button class="sapper-lab__button" type="button" data-auto aria-pressed="false">AUTO RUN</button>
            <button class="sapper-lab__button" type="button" data-reset>RESET</button>
          </div>
        </section>

        <aside class="sapper-lab__stack">
          <section class="sapper-lab__panel" aria-labelledby="sapper-contract-title">
            <div class="sapper-lab__panel-heading">
              <h2 id="sapper-contract-title">Proposed contract</h2>
              <span class="sapper-lab__tag">NOT PRODUCTION</span>
            </div>
            <dl class="sapper-lab__metrics">
              <div><dt>Target</dt><dd data-target>—</dd></div>
              <div><dt>Durability</dt><dd>${SAPPER_PROTOTYPE.maxHp} HP · 4 ICE HITS</dd></div>
              <div><dt>Cadence</dt><dd>1 TILE / ${SAPPER_PROTOTYPE.moveEveryTicks} TICKS</dd></div>
              <div><dt>Chew</dt><dd>${SAPPER_PROTOTYPE.chewDamage} DAMAGE</dd></div>
              <div><dt>Death pulse</dt><dd>${SAPPER_PROTOTYPE.deathPulseDamage} DAMAGE · ORTHOGONAL 1</dd></div>
            </dl>
            <p class="sapper-lab__result" data-result data-outcome="pending">PENDING</p>
          </section>

          <section class="sapper-lab__panel" aria-labelledby="sapper-read-title">
            <h2 id="sapper-read-title">What to read</h2>
            <ul class="sapper-lab__notes">
              <li><b>Amber target brackets</b> stay on the Firewall even when other hardware is closer.</li>
              <li><b>Cyan cells</b> are identical ICE coverage in both formations.</li>
              <li><b>Magenta pulse</b> appears once on death and reaches only orthogonal neighbors.</li>
              <li>Safe spacing should preserve every unit; clustering should destroy the Relay and wound ICE/Firewall.</li>
            </ul>
          </section>

          <section class="sapper-lab__panel" aria-labelledby="sapper-events-title">
            <div class="sapper-lab__panel-heading">
              <h2 id="sapper-events-title">Recent sim events</h2>
              <span class="sapper-lab__tag">ID ORDER</span>
            </div>
            <ol class="sapper-lab__events" data-event-list aria-live="polite"></ol>
          </section>
        </aside>
      </div>
    </div>`;
}

function createFormation(mode: FormationMode): SapperPrototypeState {
  const clustered = mode === "clustered";
  return {
    gridSize: GRID_SIZE,
    tickCount: 0,
    core: { x: 7, y: 3 },
    voidTiles: [],
    hardware: clustered
      ? [
          hardware("relay", 3, 2, 6),
          hardware("firewall", 4, 3, 24),
          hardware("turret", 3, 4, 10),
        ]
      : [
          hardware("relay", 5, 1, 6),
          hardware("firewall", 5, 3, 24),
          hardware("turret", 5, 5, 10),
        ],
    iceCoverage: [{ x: 2, y: 3 }, { x: 3, y: 3 }],
    intrusions: [createSapperPrototypeIntrusion({ id: 1, position: { x: 0, y: 3 }, lastMoveTick: 0 })],
    events: [],
    neutralizedCount: 0,
    coreDamage: 0,
  };
}

function hardware(
  kind: SapperPrototypeHardware["kind"],
  x: number,
  y: number,
  hp: number,
): SapperPrototypeHardware {
  return { kind, position: { x, y }, hp };
}

function drawPrototype(
  context: CanvasRenderingContext2D,
  state: SapperPrototypeState,
  recentEvents: readonly SapperPrototypeEvent[],
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
  if (intrusion) drawSapper(context, intrusion.position.x, intrusion.position.y, intrusion.hp);

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

function drawSapper(context: CanvasRenderingContext2D, x: number, y: number, hp: number): void {
  const center = tileCenter(x, y);
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

function formatEvents(events: readonly SapperPrototypeEvent[]): string {
  if (events.length === 0) return "<li>Awaiting first deterministic tick.</li>";
  return [...events].reverse().map((event) => `<li>${describeEvent(event)}</li>`).join("");
}

function describeEvent(event: SapperPrototypeEvent): string {
  switch (event.type) {
    case "sapperMoved": return `T${event.tick} · SAP moved to ${event.to.x},${event.to.y} → ${event.targetKind.toUpperCase()}`;
    case "sapperChewed": return `T${event.tick} · ${event.unitKind.toUpperCase()} chewed for ${event.damage} · ${event.hp} HP`;
    case "sapperHit": return `T${event.tick} · ICE hit SAP for ${event.damage} · ${event.hp} HP`;
    case "sapperNeutralized": return `T${event.tick} · SAP neutralized at ${event.position.x},${event.position.y}`;
    case "sapperDeathPulse": return `T${event.tick} · DEATH PULSE · ${event.affectedHardware} hardware affected`;
    case "hardwarePulseDamaged": return `T${event.tick} · ${event.unitKind.toUpperCase()} pulse damage · ${event.hp} HP`;
    case "hardwareDestroyed": return `T${event.tick} · ${event.unitKind.toUpperCase()} destroyed by ${event.cause}`;
    case "sapperReachedCore": return `T${event.tick} · Core contact · ${event.damage} damage`;
  }
}

function tileFrame(x: number, y: number): Readonly<{ x: number; y: number }> {
  return { x: BOARD_INSET + x * TILE_SIZE, y: BOARD_INSET + y * TILE_SIZE };
}

function tileCenter(x: number, y: number): Readonly<{ x: number; y: number }> {
  const frame = tileFrame(x, y);
  return { x: frame.x + TILE_SIZE / 2, y: frame.y + TILE_SIZE / 2 };
}

function requireElement<T extends Element>(
  parent: ParentNode,
  selector: string,
  constructor: { new (): T },
): T {
  const element = parent.querySelector(selector);
  if (!(element instanceof constructor)) throw new Error(`Missing Sapper preview element ${selector}.`);
  return element;
}
