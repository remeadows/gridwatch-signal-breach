import {
  BRIEFING_PAGES,
  type BriefingPage,
} from "../data/briefing";
import {
  CAMPAIGNS,
  EXPANSION_CAMPAIGN,
  getExpansionLevelDefinition,
  getExpansionNavigationPlaceholderLevel,
  isExpansionChapterAuthored,
  type CampaignId,
  type ChapterDefinition,
} from "../data/campaigns";
import { SECTORS } from "../data/levels";
import { fetchLeaderboard, type LeaderboardEntry } from "../leaderboard/api";
import { leaderboardConfig } from "../leaderboard/config";
import type { IconName } from "../render/iconPaths";
import { createAccountPanel } from "./account";
import { svgIcon } from "./iconsSvg";
import {
  getSignalBreachProgress,
  type GameProgress,
  type SignalBreachProgress,
} from "./progress";

export type AppScreen =
  | "title"
  | "sectorSelect"
  | "campaignSelect"
  | "chapterSelect"
  | "levelSelect"
  | "briefing"
  | "playing"
  | "leaderboard";

export type CampaignProgress = SignalBreachProgress;

export type ScreenOptions = Readonly<{
  root: HTMLElement;
  screen: AppScreen;
  progress: GameProgress;
  expansionNavigationEnabled: boolean;
  selectedExpansionChapterId: number;
  briefingMaxSector: number;
  briefingFromPlay: boolean;
  onStart: () => void;
  onBriefingComplete: () => void;
  onShowBriefing: () => void;
  onSelectSector: (sectorId: number) => void;
  onSelectCampaign: (campaignId: CampaignId) => void;
  onSelectExpansionChapter: (chapterId: number) => void;
  onSelectExpansionLevel: (levelId: number) => void;
  onBackToCampaignSelect: () => void;
  onBackToChapterSelect: () => void;
  onBackToTitle: () => void;
  onShowLeaderboard: () => void;
  onCloseLeaderboard: () => void;
  // Optional banner shown on the leaderboard (e.g. result of an auto-submitted
  // run after sign-in).
  leaderboardNotice?: string | null;
}>;

const BRIEFING_STORAGE_KEY = "gridwatch.briefingSeen";

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

  if (screen === "sectorSelect") {
    renderSectorSelectScreen(options);
    return;
  }

  if (!options.expansionNavigationEnabled && isExpansionNavigationScreen(screen)) {
    renderSectorSelectScreen(options);
    return;
  }

  if (screen === "campaignSelect") {
    renderCampaignSelectScreen(options);
    return;
  }

  if (screen === "chapterSelect") {
    renderChapterSelectScreen(options);
    return;
  }

  if (screen === "levelSelect") {
    renderLevelSelectScreen(options);
    return;
  }

  if (screen === "leaderboard") {
    renderLeaderboardScreen(options);
    return;
  }

  renderBriefingScreen(options);
}

function renderTitleScreen(options: ScreenOptions): void {
  const { root, onStart, onShowBriefing, onShowLeaderboard } = options;

  if (root.dataset.screenKey === "title") {
    return;
  }

  const screen = document.createElement("section");
  const kicker = document.createElement("span");
  const logo = document.createElement("div");
  const title = document.createElement("strong");
  const subtitle = document.createElement("span");
  const scanline = document.createElement("span");
  const tagline = document.createElement("p");
  const actions = document.createElement("div");
  const startButton = document.createElement("button");
  const briefingButton = document.createElement("button");
  const leaderboardButton = document.createElement("button");
  const footer = document.createElement("p");

  root.innerHTML = "";
  root.dataset.screenKey = "title";
  screen.className = "screen screen-title";
  kicker.className = "screen-title-kicker";
  kicker.textContent = "OPERATOR LINK // LIVE";
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
  leaderboardButton.type = "button";
  leaderboardButton.className = "neon-button neon-button-secondary";
  leaderboardButton.textContent = "LEADERBOARD";
  leaderboardButton.addEventListener("click", onShowLeaderboard);
  footer.className = "screen-footer";
  footer.textContent = "v2.0 // OPERATOR TERMINAL // GRIDWATCH NETSEC";

  logo.append(title, subtitle, scanline);
  actions.append(startButton, briefingButton, leaderboardButton);
  screen.append(kicker, logo, tagline, actions, footer);
  root.append(screen);
}

function renderSectorSelectScreen(options: ScreenOptions): void {
  const { root, onSelectSector, onBackToTitle } = options;
  const progress = getSignalBreachProgress(options.progress);
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
  button.dataset.sector = String(sector.id);
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

function renderCampaignSelectScreen(options: ScreenOptions): void {
  const { root, onBackToTitle, onSelectCampaign } = options;

  if (root.dataset.screenKey === "campaignSelect") {
    return;
  }

  const screen = document.createElement("section");
  const panel = document.createElement("article");
  const header = createNavigationHeader(
    "CAMPAIGN ROUTER",
    "Select campaign",
    "Signal Breach remains production-active. Expansion 1 Chapter 1 is available here only for localhost acceptance testing.",
  );
  const grid = document.createElement("div");
  const backButton = createNavigationButton("BACK", "secondary", onBackToTitle);

  root.innerHTML = "";
  root.dataset.screenKey = "campaignSelect";
  screen.className = "screen screen-navigation-select";
  panel.className = "navigation-select-panel";
  grid.className = "navigation-grid navigation-grid-campaigns";

  for (const campaign of CAMPAIGNS) {
    const isExpansion = campaign.id === "expansion-1";
    const button = createNavigationCard({
      index: isExpansion ? "EXPANSION 01" : "CURRENT CAMPAIGN",
      title: isExpansion ? "EXPANSION UPLINK" : "SIGNAL BREACH",
      name: isExpansion ? "CHAPTER 1 LOCAL PLAYTEST" : "THREE SECTORS // TWELVE WAVES",
      detail: isExpansion
        ? "Five authored levels and 25 waves. Progress stays isolated; leaderboard submission remains disabled."
        : "The frozen V2 campaign continues using its original sector progress and replay identity.",
      meta: isExpansion ? "LEVELS 01–05" : "SECTORS 01–03",
      status: isExpansion ? "LOCAL ONLY" : "ACTIVE",
      disabled: false,
      onSelect: () => onSelectCampaign(campaign.id),
      testId: `campaign-${campaign.id}`,
    });

    grid.append(button);
  }

  screen.append(panel);
  panel.append(header, grid, backButton);
  root.append(screen);
}

function renderChapterSelectScreen(options: ScreenOptions): void {
  const { root, onBackToCampaignSelect, onSelectExpansionChapter } = options;
  const expansionProgress = options.progress.campaigns["expansion-1"];

  if (root.dataset.screenKey === `chapterSelect-${expansionProgress.highestUnlockedLevel}`) {
    return;
  }

  const screen = document.createElement("section");
  const panel = document.createElement("article");
  const header = createNavigationHeader(
    "EXPANSION ROUTER",
    "Select chapter",
    "Six chapter slots are reserved. Latency Front is the only authored batch; Chapters 2–6 remain locked and spoiler-safe.",
  );
  const grid = document.createElement("div");
  const backButton = createNavigationButton("BACK", "secondary", onBackToCampaignSelect);

  root.innerHTML = "";
  root.dataset.screenKey = `chapterSelect-${expansionProgress.highestUnlockedLevel}`;
  screen.className = "screen screen-navigation-select";
  panel.className = "navigation-select-panel";
  grid.className = "navigation-grid navigation-grid-chapters";

  for (const chapter of EXPANSION_CAMPAIGN.chapters) {
    const firstLevelId = chapter.levelIds[0] ?? 1;
    const isUnlocked = isExpansionChapterAuthored(chapter.id) &&
      firstLevelId <= expansionProgress.highestUnlockedLevel;
    const button = createNavigationCard({
      index: `CHAPTER ${String(chapter.id).padStart(2, "0")}`,
      title: isUnlocked ? chapter.codename : "ENCRYPTED CHAPTER",
      name: isUnlocked ? "FIVE LEVELS // 25 WAVES" : "SIGNAL LOCKED",
      detail: isUnlocked
        ? "Local acceptance build with Latency Trap, Rusher, and fresh starting conditions per level."
        : "This chapter stays spoiler-safe until an earlier chapter is cleared.",
      meta: isUnlocked ? `LEVELS ${formatChapterLevels(chapter)}` : "LEVELS LOCKED",
      status: isUnlocked ? "LOCAL PLAYTEST" : "LOCKED",
      disabled: !isUnlocked,
      onSelect: () => onSelectExpansionChapter(chapter.id),
      testId: `chapter-${chapter.id}`,
    });

    grid.append(button);
  }

  screen.append(panel);
  panel.append(header, grid, backButton);
  root.append(screen);
}

function renderLevelSelectScreen(options: ScreenOptions): void {
  const { root, selectedExpansionChapterId, onBackToChapterSelect, onSelectExpansionLevel } = options;
  const chapter = getExpansionNavigationChapter(selectedExpansionChapterId);
  const expansionProgress = options.progress.campaigns["expansion-1"];
  const key = `levelSelect-${chapter.id}-${expansionProgress.highestUnlockedLevel}-${expansionProgress.clearedLevels.join(".")}`;

  if (root.dataset.screenKey === key) {
    return;
  }

  const screen = document.createElement("section");
  const panel = document.createElement("article");
  const header = createNavigationHeader(
    "EXPANSION ROUTER",
    `${chapter.codename} // Levels`,
    chapter.id === 1
      ? "Five local-review levels. Each starts fresh and contains five waves; no score leaves this browser."
      : "This chapter is reserved for a later reviewed content batch.",
  );
  const grid = document.createElement("div");
  const backButton = createNavigationButton("BACK", "secondary", onBackToChapterSelect);

  root.innerHTML = "";
  root.dataset.screenKey = key;
  screen.className = "screen screen-navigation-select";
  panel.className = "navigation-select-panel";
  grid.className = "navigation-grid navigation-grid-levels";

  for (const levelId of chapter.levelIds) {
    const placeholder = getExpansionNavigationPlaceholderLevel(levelId);
    const level = getExpansionLevelDefinition(levelId);
    const isUnlocked = Boolean(level && levelId <= expansionProgress.highestUnlockedLevel);
    const isCleared = expansionProgress.clearedLevels.includes(levelId);
    const button = createNavigationCard({
      index: `LEVEL ${String(levelId).padStart(2, "0")}`,
      title: isUnlocked ? level?.codename ?? "ENCRYPTED LEVEL" : "ENCRYPTED LEVEL",
      name: isUnlocked ? level?.tagline ?? "LOCAL REVIEW" : level ? "CLEAR PREVIOUS LEVEL" : placeholder ? "NOT PLAYABLE" : "SIGNAL LOCKED",
      detail: isUnlocked
        ? level?.briefing ?? "Local review content."
        : level
        ? "Authored and ready. Clear the previous level to unlock this route."
        : placeholder
        ? "This record has no board, tools, waves, replay payload, score, or launch action."
        : "No authored expansion level is available in this slot.",
      meta: isUnlocked ? "5 WAVES // FRESH LOADOUT" : placeholder ? "CONTENT PENDING" : "CONTENT LOCKED",
      status: isCleared ? "CLEARED" : isUnlocked ? "LOCAL PLAYTEST" : placeholder ? "PENDING" : "LOCKED",
      disabled: !isUnlocked,
      onSelect: () => onSelectExpansionLevel(levelId),
      testId: `level-${levelId}`,
    });

    grid.append(button);
  }

  screen.append(panel);
  panel.append(header, grid, backButton);
  root.append(screen);
}

function createNavigationHeader(
  eyebrowText: string,
  titleText: string,
  copyText: string,
): HTMLElement {
  const header = document.createElement("div");
  const eyebrow = document.createElement("span");
  const title = document.createElement("h2");
  const copy = document.createElement("p");

  header.className = "navigation-select-header";
  eyebrow.className = "screen-footer";
  eyebrow.textContent = eyebrowText;
  title.textContent = titleText;
  copy.textContent = copyText;
  header.append(eyebrow, title, copy);
  return header;
}

function createNavigationCard(options: Readonly<{
  index: string;
  title: string;
  name: string;
  detail: string;
  meta: string;
  status: string;
  disabled: boolean;
  onSelect: () => void;
  testId: string;
}>): HTMLButtonElement {
  const button = document.createElement("button");
  const index = document.createElement("span");
  const title = document.createElement("strong");
  const name = document.createElement("span");
  const detail = document.createElement("p");
  const meta = document.createElement("span");
  const status = document.createElement("span");

  button.type = "button";
  button.className = "navigation-card";
  button.dataset.navigation = options.testId;
  button.disabled = options.disabled;
  button.addEventListener("click", options.onSelect);
  index.className = "navigation-card-index";
  index.textContent = options.index;
  title.className = "navigation-card-title";
  title.textContent = options.title;
  name.className = "navigation-card-name";
  name.textContent = options.name;
  detail.className = "navigation-card-detail";
  detail.textContent = options.detail;
  meta.className = "navigation-card-meta";
  meta.textContent = options.meta;
  status.className = "navigation-card-status";
  status.textContent = options.status;
  button.append(index, title, name, detail, meta, status);
  return button;
}

function createNavigationButton(
  label: string,
  variant: "primary" | "secondary",
  onClick: () => void,
): HTMLButtonElement {
  const button = document.createElement("button");

  button.type = "button";
  button.className = `neon-button neon-button-${variant}`;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function getExpansionNavigationChapter(chapterId: number): ChapterDefinition {
  return EXPANSION_CAMPAIGN.chapters.find((chapter) => chapter.id === chapterId)
    ?? EXPANSION_CAMPAIGN.chapters[0]
    ?? {
      id: 1,
      codename: "CHAPTER 01",
      levelIds: [],
      visualThemeId: "pending",
    };
}

function formatChapterLevels(chapter: ChapterDefinition): string {
  const firstLevel = chapter.levelIds[0] ?? 0;
  const lastLevel = chapter.levelIds[chapter.levelIds.length - 1] ?? firstLevel;
  return `${String(firstLevel).padStart(2, "0")}–${String(lastLevel).padStart(2, "0")}`;
}

function isExpansionNavigationScreen(screen: AppScreen): boolean {
  return (
    screen === "campaignSelect" ||
    screen === "chapterSelect" ||
    screen === "levelSelect"
  );
}

const LEADERBOARD_FILTERS: readonly { label: string; value: number | null }[] = [
  { label: "ALL", value: null },
  { label: "SECTOR 1", value: 1 },
  { label: "SECTOR 2", value: 2 },
  { label: "SECTOR 3", value: 3 },
];

let leaderboardFilter: number | null = null;
// Guards against a slow earlier fetch overwriting a newer tab selection.
let leaderboardRequestId = 0;

function renderLeaderboardScreen(options: ScreenOptions): void {
  const { root, onCloseLeaderboard } = options;

  if (root.dataset.screenKey === "leaderboard") {
    return;
  }

  const screen = document.createElement("section");
  const panel = document.createElement("article");
  const header = document.createElement("div");
  const eyebrow = document.createElement("span");
  const title = document.createElement("h2");
  const tabs = document.createElement("div");
  const list = document.createElement("div");
  const back = document.createElement("button");

  root.innerHTML = "";
  root.dataset.screenKey = "leaderboard";
  screen.className = "screen screen-leaderboard";
  panel.className = "leaderboard-panel";
  header.className = "leaderboard-header";
  eyebrow.className = "screen-footer";
  eyebrow.textContent = "GLOBAL UPLINK RANKINGS";
  title.textContent = "Leaderboard // Top 20";
  tabs.className = "leaderboard-tabs";
  list.className = "leaderboard-list";

  const tabButtons: HTMLButtonElement[] = [];

  const load = (): void => {
    const requestId = (leaderboardRequestId += 1);
    tabButtons.forEach((button, index) => {
      button.classList.toggle(
        "active",
        LEADERBOARD_FILTERS[index].value === leaderboardFilter,
      );
    });
    renderLeaderboardMessage(
      list,
      leaderboardConfig.enabled ? "Loading rankings…" : "Leaderboard is offline.",
    );

    if (!leaderboardConfig.enabled) {
      return;
    }

    void fetchLeaderboard(leaderboardFilter).then((result) => {
      // Ignore stale responses and responses that arrive after navigating away.
      if (requestId !== leaderboardRequestId || root.dataset.screenKey !== "leaderboard") {
        return;
      }
      if (!result.ok) {
        renderLeaderboardMessage(list, "Rankings unavailable — try again later.");
        return;
      }
      renderLeaderboardRows(list, result.entries, leaderboardFilter === null);
    });
  };

  for (const filter of LEADERBOARD_FILTERS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "leaderboard-tab";
    button.textContent = filter.label;
    button.addEventListener("click", () => {
      leaderboardFilter = filter.value;
      load();
    });
    tabButtons.push(button);
    tabs.append(button);
  }

  back.type = "button";
  back.className = "neon-button neon-button-secondary";
  back.textContent = "BACK";
  back.addEventListener("click", onCloseLeaderboard);

  header.append(eyebrow, title);
  panel.append(header);
  if (options.leaderboardNotice) {
    const notice = document.createElement("p");
    notice.className = "leaderboard-notice";
    notice.textContent = options.leaderboardNotice;
    panel.append(notice);
  }
  panel.append(tabs, list);
  if (leaderboardConfig.enabled) {
    const account = createAccountPanel({ mode: "manage" });
    account.classList.add("leaderboard-account");
    panel.append(account);
  }
  panel.append(back);
  screen.append(panel);
  root.append(screen);
  load();
}

function renderLeaderboardMessage(list: HTMLElement, message: string): void {
  list.innerHTML = "";
  const note = document.createElement("p");
  note.className = "leaderboard-empty";
  note.textContent = message;
  list.append(note);
}

function renderLeaderboardRows(
  list: HTMLElement,
  entries: readonly LeaderboardEntry[],
  showSector: boolean,
): void {
  if (entries.length === 0) {
    renderLeaderboardMessage(list, "No scores yet. Be the first to hold the grid.");
    return;
  }

  list.innerHTML = "";
  const table = document.createElement("table");
  table.className = "leaderboard-table";

  for (const entry of entries) {
    const row = document.createElement("tr");
    const rank = document.createElement("td");
    const handle = document.createElement("td");
    const detail = document.createElement("td");
    const score = document.createElement("td");

    rank.className = "leaderboard-rank";
    rank.textContent = `#${entry.rank}`;
    handle.className = "leaderboard-handle";
    handle.textContent = entry.handle;
    detail.className = "leaderboard-detail";
    const sector = showSector ? sectorLabelFromMetadata(entry.metadata) : "";
    detail.textContent = [sector, entry.rating ?? ""].filter(Boolean).join(" · ");
    score.className = "leaderboard-score";
    score.textContent = String(entry.score);

    row.append(rank, handle, detail, score);
    table.append(row);
  }

  list.append(table);
}

function sectorLabelFromMetadata(metadata: Record<string, unknown>): string {
  const sector = metadata?.sector;
  return typeof sector === "number" ? `Sector ${sector}` : "";
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
  panel.dataset.sector = String(options.briefingMaxSector);
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
