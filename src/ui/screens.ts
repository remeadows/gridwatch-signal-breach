import {
  BRIEFING_PAGES,
  type BriefingPage,
} from "../data/briefing";
import { SECTORS } from "../data/levels";
import type { IconName } from "../render/iconPaths";
import { svgIcon } from "./iconsSvg";

export type AppScreen = "title" | "sectorSelect" | "briefing" | "playing";

export type CampaignProgress = Readonly<{
  highestUnlockedSector: number;
  clearedSectors: readonly number[];
}>;

export type ScreenOptions = Readonly<{
  root: HTMLElement;
  screen: AppScreen;
  progress: CampaignProgress;
  briefingMaxSector: number;
  briefingFromPlay: boolean;
  onStart: () => void;
  onBriefingComplete: () => void;
  onShowBriefing: () => void;
  onSelectSector: (sectorId: number) => void;
  onBackToTitle: () => void;
}>;

const BRIEFING_STORAGE_KEY = "gridwatch.briefingSeen";
const CAMPAIGN_STORAGE_KEY = "gridwatch.campaign.v1";
const DEFAULT_PROGRESS: CampaignProgress = {
  highestUnlockedSector: 1,
  clearedSectors: [],
};
const MAX_SECTOR_ID = SECTORS.length;

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

export function loadCampaignProgress(): CampaignProgress {
  try {
    const raw = window.localStorage.getItem(CAMPAIGN_STORAGE_KEY);

    if (!raw) {
      return DEFAULT_PROGRESS;
    }

    return sanitizeCampaignProgress(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function markSectorCleared(
  current: CampaignProgress,
  sectorId: number,
): CampaignProgress {
  const sector = clampSectorId(sectorId);
  const cleared = [...new Set([...current.clearedSectors, sector])].sort((a, b) => a - b);
  const progress: CampaignProgress = {
    highestUnlockedSector: Math.min(
      MAX_SECTOR_ID,
      Math.max(current.highestUnlockedSector, sector + 1),
    ),
    clearedSectors: cleared,
  };

  saveCampaignProgress(progress);
  return progress;
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

  if (screen === "sectorSelect") {
    renderSectorSelectScreen(options);
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
  tagline.textContent = "Hold the uplink. Take back the grid.";
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
  footer.textContent = "v2.0 // OPERATOR TERMINAL // GRIDWATCH NETSEC";

  logo.append(title, subtitle, scanline);
  actions.append(startButton, briefingButton);
  screen.append(logo, tagline, actions, footer);
  root.append(screen);
}

function renderSectorSelectScreen(options: ScreenOptions): void {
  const { root, progress, onSelectSector, onBackToTitle } = options;
  const key = `sectorSelect-${progress.highestUnlockedSector}-${progress.clearedSectors.join(".")}`;

  if (root.dataset.screenKey === key) {
    return;
  }

  const screen = document.createElement("section");
  const panel = document.createElement("article");
  const header = document.createElement("div");
  const eyebrow = document.createElement("span");
  const title = document.createElement("h2");
  const copy = document.createElement("p");
  const grid = document.createElement("div");
  const backButton = document.createElement("button");

  root.innerHTML = "";
  root.dataset.screenKey = key;
  screen.className = "screen screen-sector-select";
  panel.className = "sector-select-panel";
  header.className = "sector-select-header";
  eyebrow.className = "screen-footer";
  eyebrow.textContent = "CAMPAIGN ROUTER";
  title.textContent = "Select sector";
  copy.textContent = "Each sector starts fresh. Cleared sectors unlock the next breach zone.";
  grid.className = "sector-grid";

  for (const sector of SECTORS) {
    grid.append(createSectorCard(sector.id, progress, onSelectSector));
  }

  backButton.type = "button";
  backButton.className = "neon-button neon-button-secondary";
  backButton.textContent = "BACK";
  backButton.addEventListener("click", onBackToTitle);

  header.append(eyebrow, title, copy);
  panel.append(header, grid, backButton);
  screen.append(panel);
  root.append(screen);
}

function createSectorCard(
  sectorId: number,
  progress: CampaignProgress,
  onSelectSector: (sectorId: number) => void,
): HTMLButtonElement {
  const sector = SECTORS[sectorId - 1];
  const button = document.createElement("button");
  const index = document.createElement("span");
  const title = document.createElement("strong");
  const name = document.createElement("span");
  const tagline = document.createElement("p");
  const meta = document.createElement("span");
  const status = document.createElement("span");
  const isUnlocked = sector.id <= progress.highestUnlockedSector;
  const isCleared = progress.clearedSectors.includes(sector.id);
  const firstWave = sector.waves[0]?.id ?? 0;
  const lastWave = sector.waves[sector.waves.length - 1]?.id ?? firstWave;

  button.type = "button";
  button.className = `sector-card ${isUnlocked ? "unlocked" : "locked"} ${isCleared ? "cleared" : ""}`;
  button.disabled = !isUnlocked;
  button.addEventListener("click", () => onSelectSector(sector.id));

  index.className = "sector-card-index";
  index.textContent = `SECTOR ${String(sector.id).padStart(2, "0")}`;
  title.className = "sector-card-title";
  title.textContent = isUnlocked ? sector.codename : "LOCKED SECTOR";
  name.className = "sector-card-name";
  name.textContent = isUnlocked ? sector.name : "SIGNAL ENCRYPTED";
  tagline.className = "sector-card-tagline";
  tagline.textContent = isUnlocked ? sector.tagline : "SIGNAL ENCRYPTED";
  meta.className = "sector-card-meta";
  meta.textContent = isUnlocked ? `WAVES ${firstWave}-${lastWave}` : "WAVES LOCKED";
  status.className = "sector-card-status";
  status.textContent = isCleared ? "CLEARED" : isUnlocked ? "UNLOCKED" : "LOCKED";

  button.append(index, title, name, tagline, meta, status);
  return button;
}

function renderBriefingScreen(options: ScreenOptions): void {
  const { root, onBriefingComplete, briefingFromPlay } = options;
  const pages = getVisibleBriefingPages(options.briefingMaxSector);
  const maxIndex = Math.max(0, pages.length - 1);

  briefingPanelIndex = Math.min(briefingPanelIndex, maxIndex);

  const key = `briefing-${options.briefingMaxSector}-${briefingFromPlay ? "play" : "flow"}-${briefingPanelIndex}`;

  if (root.dataset.screenKey === key) {
    return;
  }

  const screen = document.createElement("section");
  const panel = document.createElement("article");
  const content = document.createElement("div");
  const dots = createProgressDots(pages.length);
  const nav = document.createElement("div");
  const navLeft = document.createElement("div");
  const closeButton = document.createElement("button");
  const backButton = document.createElement("button");
  const nextButton = document.createElement("button");

  root.innerHTML = "";
  root.dataset.screenKey = key;
  screen.className = "screen screen-briefing";
  panel.className = "briefing-panel";
  content.className = "briefing-content";
  nav.className = "briefing-nav";
  navLeft.className = "briefing-nav-left";

  if (briefingFromPlay) {
    closeButton.type = "button";
    closeButton.className = "neon-button neon-button-secondary";
    closeButton.textContent = "CLOSE ✕";
    closeButton.addEventListener("click", onBriefingComplete);
    navLeft.append(closeButton);
  }

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
    briefingPanelIndex === maxIndex
      ? briefingFromPlay
        ? "RESUME UPLINK ▸"
        : "INITIALIZE UPLINK ▸"
      : "NEXT";
  nextButton.addEventListener("click", () => {
    if (briefingPanelIndex === maxIndex) {
      if (!briefingFromPlay) {
        markBriefingSeen();
      }

      onBriefingComplete();
      return;
    }

    briefingPanelIndex = Math.min(maxIndex, briefingPanelIndex + 1);
    root.dataset.screenKey = "";
  });

  navLeft.append(backButton);
  appendBriefingPanel(content, pages[briefingPanelIndex], options.briefingMaxSector);
  nav.append(navLeft, nextButton);
  panel.append(content, dots, nav);
  screen.append(panel);
  root.append(screen);
}

function getVisibleBriefingPages(maxSector: number): readonly BriefingPage[] {
  return BRIEFING_PAGES.filter((page) => (page.minSector ?? 1) <= maxSector);
}

function appendBriefingPanel(
  root: HTMLElement,
  page: BriefingPage | undefined,
  maxSector: number,
): void {
  if (!page) {
    return;
  }

  if (page.kind === "signal") {
    appendSignalPanel(root, page);
    return;
  }

  appendRowsPanel(root, page, maxSector);
}

function appendSignalPanel(root: HTMLElement, page: BriefingPage): void {
  const title = document.createElement("h2");
  const diagram = document.createElement("div");
  const source = createGlyphNode("source", "SRC");
  const line = document.createElement("span");
  const core = createGlyphNode("core", "CORE");
  const body = document.createElement("p");

  title.textContent = page.title;
  diagram.className = "briefing-signal-diagram";
  line.className = "briefing-signal-line";
  body.textContent = page.body ?? "";

  diagram.append(source, line, core);
  root.append(title, diagram, body);
}

function appendRowsPanel(root: HTMLElement, page: BriefingPage, maxSector: number): void {
  const title = document.createElement("h2");
  const list = document.createElement("div");

  title.textContent = page.title;
  list.className = "briefing-list";

  const visibleRows = page.rows?.filter(
    (candidate) => (candidate.minSector ?? 1) <= maxSector,
  ) ?? [];

  for (const row of visibleRows) {
    list.append(createBriefingRow(row.icon as IconName, row.name, row.summary));
  }

  if (!page.body) {
    root.append(title, list);
    return;
  }

  const intro = document.createElement("p");
  intro.textContent = page.body;
  root.append(title, list, intro);
}

function createBriefingRow(kind: IconName, name: string, summary: string): HTMLElement {
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

function createGlyphNode(kind: IconName, label: string): HTMLElement {
  const glyph = document.createElement("span");
  const caption = document.createElement("small");

  glyph.className = `briefing-glyph briefing-glyph-${kind}`;
  glyph.insertAdjacentHTML("afterbegin", svgIcon(kind, 34, "briefing-icon"));
  caption.textContent = label;
  glyph.append(caption);

  return glyph;
}

function createProgressDots(count: number): HTMLElement {
  const dots = document.createElement("div");
  dots.className = "panel-dots";

  for (let index = 0; index < count; index += 1) {
    const dot = document.createElement("span");
    dot.className = index === briefingPanelIndex ? "active" : "";
    dots.append(dot);
  }

  return dots;
}

function sanitizeCampaignProgress(value: unknown): CampaignProgress {
  if (!isRecord(value)) {
    return DEFAULT_PROGRESS;
  }

  const clearedSource = Array.isArray(value.clearedSectors)
    ? value.clearedSectors
    : [];
  const cleared = [...new Set(
    clearedSource
      .filter(isValidStoredSectorId),
  )].sort((a, b) => a - b);
  const highestFromCleared = cleared.reduce(
    (highest, sectorId) => Math.max(highest, Math.min(MAX_SECTOR_ID, sectorId + 1)),
    DEFAULT_PROGRESS.highestUnlockedSector,
  );

  return {
    highestUnlockedSector: Math.max(
      highestFromCleared,
      isValidStoredSectorId(value.highestUnlockedSector)
        ? value.highestUnlockedSector
        : DEFAULT_PROGRESS.highestUnlockedSector,
    ),
    clearedSectors: cleared,
  };
}

function saveCampaignProgress(progress: CampaignProgress): void {
  try {
    window.localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Persistence is optional. The campaign still runs if storage is unavailable.
  }
}

function clampSectorId(value: number): number {
  return Math.min(MAX_SECTOR_ID, Math.max(1, Math.floor(value)));
}

function isValidStoredSectorId(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_SECTOR_ID
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
