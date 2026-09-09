import "./sapperPrototypePreview.css";
import sapperUrl from "../assets/board/expansion1/gw-expansion1-sapper-board-v1.png";
import { renderSapperPrototypeCanvas } from "../render/sapperPrototypeCanvas";
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

type FormationMode = "safe" | "clustered";

export function mountSapperPrototypePreview(parent: HTMLElement): () => void {
  const preview = document.createElement("section");
  preview.className = "sapper-lab";
  preview.setAttribute("aria-label", "Sapper mechanic prototype preview");
  preview.innerHTML = createMarkup();
  parent.append(preview);

  const siblingStates = Array.from(parent.children)
    .filter((sibling): sibling is HTMLElement => sibling !== preview && sibling instanceof HTMLElement)
    .map((sibling) => ({
      sibling,
      inert: sibling.inert,
      ariaHidden: sibling.getAttribute("aria-hidden"),
    }));
  for (const { sibling } of siblingStates) {
    sibling.inert = true;
    sibling.setAttribute("aria-hidden", "true");
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
  let sapperSprite: HTMLImageElement | null = null;
  let disposed = false;

  const stopAuto = () => {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    autoButton.textContent = "AUTO RUN";
    autoButton.setAttribute("aria-pressed", "false");
  };

  const render = (recentEvents: readonly SapperPrototypeEvent[] = []) => {
    renderSapperPrototypeCanvas(context, state, recentEvents, sapperSprite);
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
    renderEvents(eventList, state.events.slice(-8));
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
    button.addEventListener("click", () => {
      const nextMode = button.dataset.mode;
      if (nextMode === "safe" || nextMode === "clustered") reset(nextMode);
    });
  }
  window.addEventListener("pagehide", stopAuto, { once: true });
  reset();
  void loadSapperSprite().then((image) => {
    if (disposed) return;
    sapperSprite = image;
    render();
  });

  return () => {
    disposed = true;
    stopAuto();
    window.removeEventListener("pagehide", stopAuto);
    preview.remove();
    for (const { sibling, inert, ariaHidden } of siblingStates) {
      sibling.inert = inert;
      if (ariaHidden === null) sibling.removeAttribute("aria-hidden");
      else sibling.setAttribute("aria-hidden", ariaHidden);
    }
  };
}

function createMarkup(): string {
  return `
    <div class="sapper-lab__shell">
      <header class="sapper-lab__header">
        <div>
          <p class="sapper-lab__eyebrow">Expansion 1 · Phase 9B · Blender visual intake</p>
          <h1>Sapper formation test</h1>
          <p class="sapper-lab__summary">
            The Sapper strictly targets a reachable Firewall, then releases a 6-damage
            orthogonal pulse when ICE neutralizes it. Compare identical combat timing
            with safe and clustered hardware placement. The Blender-built raster is isolated to this
            preview pending owner visual approval.
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

          <section class="sapper-lab__panel" aria-labelledby="sapper-scale-title">
            <div class="sapper-lab__panel-heading">
              <h2 id="sapper-scale-title">Board-scale read</h2>
              <span class="sapper-lab__tag">55 / 43 / 32 CSS PX</span>
            </div>
            <div class="sapper-lab__scale-row">
              ${[55, 43, 32].map((size) => `
                <div class="sapper-lab__scale-sample">
                  <img src="${sapperUrl}" alt="" width="${size}" height="${size}">
                  <span>${size} px</span>
                </div>`).join("")}
            </div>
          </section>

          <section class="sapper-lab__panel" aria-labelledby="sapper-events-title">
            <div class="sapper-lab__panel-heading">
              <h2 id="sapper-events-title">Recent sim events</h2>
              <span class="sapper-lab__tag">ID ORDER</span>
            </div>
            <ol class="sapper-lab__events" data-event-list></ol>
          </section>
        </aside>
      </div>
    </div>`;
}

async function loadSapperSprite(): Promise<HTMLImageElement | null> {
  const image = new Image();
  image.decoding = "async";
  image.src = sapperUrl;
  try {
    await image.decode();
    return image;
  } catch {
    console.warn("GridWatch Sapper preview sprite failed to load; using the procedural fallback.");
    return null;
  }
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

function renderEvents(list: HTMLOListElement, events: readonly SapperPrototypeEvent[]): void {
  const entries = events.length > 0 ? [...events].reverse().map(describeEvent) : ["Awaiting first deterministic tick."];
  list.replaceChildren(...entries.map((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    return item;
  }));
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

function requireElement<T extends Element>(
  parent: ParentNode,
  selector: string,
  constructor: { new (): T },
): T {
  const element = parent.querySelector(selector);
  if (!(element instanceof constructor)) throw new Error(`Missing Sapper preview element ${selector}.`);
  return element;
}
