import {
  BRIEFING_COPY,
  BRIEFING_THREATS,
  BRIEFING_UNITS,
} from "../data/briefing";

export type AppScreen = "title" | "briefing" | "playing";

export type ScreenOptions = Readonly<{
  root: HTMLElement;
  screen: AppScreen;
  onStart: () => void;
  onBriefingComplete: () => void;
  onShowBriefing: () => void;
}>;

const BRIEFING_STORAGE_KEY = "gridwatch.briefingSeen";
const BRIEFING_PANEL_COUNT = 3;

let activeScreen: AppScreen | null = null;
let briefingPanelIndex = 0;

export function hasSeenBriefing(): boolean {
  try {
    return window.localStorage.getItem(BRIEFING_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markBriefingSeen(): void {
  try {
    window.localStorage.setItem(BRIEFING_STORAGE_KEY, "1");
  } catch {
    // Safari private mode can throw on localStorage writes. The game still runs.
  }
}

export function renderScreens(options: ScreenOptions): void {
  const { root, screen } = options;
  root.className = "screen-root";

  if (activeScreen !== screen) {
    activeScreen = screen;
    briefingPanelIndex = 0;
    root.dataset.screenKey = "";
  }

  if (screen === "playing") {
    if (root.dataset.screenKey !== "playing") {
      root.innerHTML = "";
    }

    root.hidden = true;
    root.dataset.screenKey = "playing";
    root.setAttribute("aria-hidden", "true");
    return;
  }

  root.hidden = false;
  root.removeAttribute("aria-hidden");

  if (screen === "title") {
    renderTitleScreen(options);
    return;
  }

  renderBriefingScreen(options);
}

function renderTitleScreen(options: ScreenOptions): void {
  const { root, onStart, onShowBriefing } = options;

  if (root.dataset.screenKey === "title") {
    return;
  }

  const screen = document.createElement("section");
  const logo = document.createElement("div");
  const title = document.createElement("strong");
  const subtitle = document.createElement("span");
  const scanline = document.createElement("span");
  const tagline = document.createElement("p");
  const actions = document.createElement("div");
  const startButton = document.createElement("button");
  const briefingButton = document.createElement("button");
  const footer = document.createElement("p");

  root.innerHTML = "";
  root.dataset.screenKey = "title";
  screen.className = "screen screen-title";
  logo.className = "screen-logo";
  title.className = "screen-logo-main";
  title.dataset.text = "GRIDWATCH";
  title.textContent = "GRIDWATCH";
  subtitle.className = "screen-logo-subtitle";
  subtitle.textContent = "SIGNAL BREACH";
  scanline.className = "screen-logo-scanline";
  tagline.className = "screen-tagline";
  tagline.textContent = "Hold the uplink. Survive five waves.";
  actions.className = "screen-actions";
  startButton.type = "button";
  startButton.className = "neon-button neon-button-primary";
  startButton.textContent = "▸ JACK IN";
  startButton.addEventListener("click", onStart);
  briefingButton.type = "button";
  briefingButton.className = "neon-button neon-button-secondary";
  briefingButton.textContent = "MISSION BRIEFING";
  briefingButton.addEventListener("click", onShowBriefing);
  footer.className = "screen-footer";
  footer.textContent = "v1.0 // OPERATOR TERMINAL // GRIDWATCH NETSEC";

  logo.append(title, subtitle, scanline);
  actions.append(startButton, briefingButton);
  screen.append(logo, tagline, actions, footer);
  root.append(screen);
}

function renderBriefingScreen(options: ScreenOptions): void {
  const { root, onBriefingComplete } = options;
  const key = `briefing-${briefingPanelIndex}`;

  if (root.dataset.screenKey === key) {
    return;
  }

  const screen = document.createElement("section");
  const panel = document.createElement("article");
  const content = document.createElement("div");
  const dots = createProgressDots();
  const nav = document.createElement("div");
  const backButton = document.createElement("button");
  const nextButton = document.createElement("button");

  root.innerHTML = "";
  root.dataset.screenKey = key;
  screen.className = "screen screen-briefing";
  panel.className = "briefing-panel";
  content.className = "briefing-content";
  nav.className = "briefing-nav";
  backButton.type = "button";
  backButton.className = "neon-button neon-button-secondary";
  backButton.textContent = "BACK";
  backButton.disabled = briefingPanelIndex === 0;
  backButton.addEventListener("click", () => {
    briefingPanelIndex = Math.max(0, briefingPanelIndex - 1);
    root.dataset.screenKey = "";
  });
  nextButton.type = "button";
  nextButton.className = "neon-button neon-button-primary";
  nextButton.textContent =
    briefingPanelIndex === BRIEFING_PANEL_COUNT - 1
      ? "INITIALIZE UPLINK ▸"
      : "NEXT";
  nextButton.addEventListener("click", () => {
    if (briefingPanelIndex === BRIEFING_PANEL_COUNT - 1) {
      markBriefingSeen();
      onBriefingComplete();
      return;
    }

    briefingPanelIndex = Math.min(
      BRIEFING_PANEL_COUNT - 1,
      briefingPanelIndex + 1,
    );
    root.dataset.screenKey = "";
  });

  appendBriefingPanel(content, briefingPanelIndex);
  nav.append(backButton, nextButton);
  panel.append(content, dots, nav);
  screen.append(panel);
  root.append(screen);
}

function appendBriefingPanel(root: HTMLElement, panelIndex: number): void {
  if (panelIndex === 0) {
    appendSignalPanel(root);
    return;
  }

  if (panelIndex === 1) {
    appendArsenalPanel(root);
    return;
  }

  appendThreatPanel(root);
}

function appendSignalPanel(root: HTMLElement): void {
  const title = document.createElement("h2");
  const diagram = document.createElement("div");
  const source = createGlyphNode("source", "SRC");
  const line = document.createElement("span");
  const core = createGlyphNode("core", "CORE");
  const body = document.createElement("p");

  title.textContent = BRIEFING_COPY.signal.title;
  diagram.className = "briefing-signal-diagram";
  line.className = "briefing-signal-line";
  body.textContent = BRIEFING_COPY.signal.body;

  diagram.append(source, line, core);
  root.append(title, diagram, body);
}

function appendArsenalPanel(root: HTMLElement): void {
  const title = document.createElement("h2");
  const list = document.createElement("div");
  const intro = document.createElement("p");

  title.textContent = BRIEFING_COPY.arsenalTitle;
  list.className = "briefing-list";
  intro.textContent = BRIEFING_COPY.arsenalIntro;

  for (const unit of BRIEFING_UNITS) {
    list.append(
      createBriefingRow(
        unit.kind,
        unit.name,
        `(${unit.cost}) ${unit.summary}`,
      ),
    );
  }

  root.append(title, list, intro);
}

function appendThreatPanel(root: HTMLElement): void {
  const title = document.createElement("h2");
  const list = document.createElement("div");
  const intro = document.createElement("p");

  title.textContent = BRIEFING_COPY.threatsTitle;
  list.className = "briefing-list";
  intro.textContent = BRIEFING_COPY.threatsIntro;

  for (const threat of BRIEFING_THREATS) {
    list.append(createBriefingRow(threat.kind, threat.name, threat.summary));
  }

  root.append(title, list, intro);
}

function createBriefingRow(kind: string, name: string, summary: string): HTMLElement {
  const row = document.createElement("div");
  const glyph = createGlyphNode(kind, name.slice(0, 3).toUpperCase());
  const copy = document.createElement("div");
  const label = document.createElement("strong");
  const detail = document.createElement("span");

  row.className = "briefing-row";
  copy.className = "briefing-row-copy";
  label.textContent = name;
  detail.textContent = summary;
  copy.append(label, detail);
  row.append(glyph, copy);

  return row;
}

function createGlyphNode(kind: string, label: string): HTMLElement {
  const glyph = document.createElement("span");
  glyph.className = `briefing-glyph briefing-glyph-${kind}`;
  glyph.textContent = label;

  return glyph;
}

function createProgressDots(): HTMLElement {
  const dots = document.createElement("div");
  dots.className = "panel-dots";

  for (let index = 0; index < BRIEFING_PANEL_COUNT; index += 1) {
    const dot = document.createElement("span");
    dot.className = index === briefingPanelIndex ? "active" : "";
    dots.append(dot);
  }

  return dots;
}
