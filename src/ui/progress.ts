const LEGACY_PROGRESS_STORAGE_KEY = "gridwatch.campaign.v1";
export const PROGRESS_STORAGE_KEY = "gridwatch.progress.v2";
export const PROGRESS_SCHEMA_VERSION = 2;

const MAX_SECTOR_ID = 3;
const MAX_EXPANSION_LEVEL_ID = 30;

export type SignalBreachProgress = Readonly<{
  highestUnlockedSector: number;
  clearedSectors: readonly number[];
}>;

export type ExpansionProgress = Readonly<{
  highestUnlockedLevel: number;
  clearedLevels: readonly number[];
}>;

export type GameProgress = Readonly<{
  schema: typeof PROGRESS_SCHEMA_VERSION;
  campaigns: Readonly<{
    "signal-breach": SignalBreachProgress;
    "expansion-1": ExpansionProgress;
  }>;
}>;

export type ProgressStorage = Pick<Storage, "getItem" | "setItem">;

const DEFAULT_SIGNAL_BREACH_PROGRESS: SignalBreachProgress = {
  highestUnlockedSector: 1,
  clearedSectors: [],
};

const DEFAULT_EXPANSION_PROGRESS: ExpansionProgress = {
  highestUnlockedLevel: 1,
  clearedLevels: [],
};

export const DEFAULT_GAME_PROGRESS: GameProgress = {
  schema: PROGRESS_SCHEMA_VERSION,
  campaigns: {
    "signal-breach": DEFAULT_SIGNAL_BREACH_PROGRESS,
    "expansion-1": DEFAULT_EXPANSION_PROGRESS,
  },
};

/**
 * Prefer the versioned root. If it is missing or malformed, recover the
 * original V2 campaign progress and write a sanitized V2 root without deleting
 * the legacy key. Storage failures always leave the game safely at Level 1.
 */
export function loadGameProgress(storage = getBrowserStorage()): GameProgress {
  if (!storage) {
    return DEFAULT_GAME_PROGRESS;
  }

  const storedProgress = parseGameProgress(readStorage(storage, PROGRESS_STORAGE_KEY));

  if (storedProgress) {
    return storedProgress;
  }

  const legacyProgress = parseSignalBreachProgress(
    readStorage(storage, LEGACY_PROGRESS_STORAGE_KEY),
  );

  if (!legacyProgress) {
    return DEFAULT_GAME_PROGRESS;
  }

  const migrated: GameProgress = {
    schema: PROGRESS_SCHEMA_VERSION,
    campaigns: {
      "signal-breach": legacyProgress,
      "expansion-1": DEFAULT_EXPANSION_PROGRESS,
    },
  };

  saveGameProgress(migrated, storage);
  return migrated;
}

export function markSectorCleared(
  current: GameProgress,
  sectorId: number,
  storage = getBrowserStorage(),
): GameProgress {
  const sector = clampId(sectorId, MAX_SECTOR_ID);
  const signalBreach = current.campaigns["signal-breach"];
  const clearedSectors = sortUnique([
    ...signalBreach.clearedSectors,
    sector,
  ]);
  const next: GameProgress = {
    schema: PROGRESS_SCHEMA_VERSION,
    campaigns: {
      "signal-breach": {
        highestUnlockedSector: Math.min(
          MAX_SECTOR_ID,
          Math.max(signalBreach.highestUnlockedSector, sector + 1),
        ),
        clearedSectors,
      },
      "expansion-1": current.campaigns["expansion-1"],
    },
  };

  if (storage) {
    saveGameProgress(next, storage);
  }
  return next;
}

export function getSignalBreachProgress(progress: GameProgress): SignalBreachProgress {
  return progress.campaigns["signal-breach"];
}

function parseGameProgress(raw: string | null): GameProgress | null {
  if (!raw) {
    return null;
  }

  try {
    const value = JSON.parse(raw) as unknown;

    if (!isRecord(value) || value.schema !== PROGRESS_SCHEMA_VERSION || !isRecord(value.campaigns)) {
      return null;
    }

    const campaigns = value.campaigns;

    if (
      !hasOwn(campaigns, "signal-breach") ||
      !hasOwn(campaigns, "expansion-1")
    ) {
      return null;
    }

    return {
      schema: PROGRESS_SCHEMA_VERSION,
      campaigns: {
        "signal-breach": sanitizeSignalBreachProgress(campaigns["signal-breach"]),
        "expansion-1": sanitizeExpansionProgress(campaigns["expansion-1"]),
      },
    };
  } catch {
    return null;
  }
}

function parseSignalBreachProgress(raw: string | null): SignalBreachProgress | null {
  if (!raw) {
    return null;
  }

  try {
    const value = JSON.parse(raw) as unknown;
    return isRecord(value) ? sanitizeSignalBreachProgress(value) : null;
  } catch {
    return null;
  }
}

function sanitizeSignalBreachProgress(value: unknown): SignalBreachProgress {
  if (!isRecord(value)) {
    return DEFAULT_SIGNAL_BREACH_PROGRESS;
  }

  const clearedSectors = sanitizeIds(value.clearedSectors, MAX_SECTOR_ID);
  const highestFromCleared = clearedSectors.reduce(
    (highest, sectorId) => Math.max(highest, Math.min(MAX_SECTOR_ID, sectorId + 1)),
    DEFAULT_SIGNAL_BREACH_PROGRESS.highestUnlockedSector,
  );

  return {
    highestUnlockedSector: Math.max(
      highestFromCleared,
      isStoredId(value.highestUnlockedSector, MAX_SECTOR_ID)
        ? value.highestUnlockedSector
        : DEFAULT_SIGNAL_BREACH_PROGRESS.highestUnlockedSector,
    ),
    clearedSectors,
  };
}

function sanitizeExpansionProgress(value: unknown): ExpansionProgress {
  if (!isRecord(value)) {
    return DEFAULT_EXPANSION_PROGRESS;
  }

  const clearedLevels = sanitizeIds(value.clearedLevels, MAX_EXPANSION_LEVEL_ID);
  const highestFromCleared = clearedLevels.reduce(
    (highest, levelId) => Math.max(highest, Math.min(MAX_EXPANSION_LEVEL_ID, levelId + 1)),
    DEFAULT_EXPANSION_PROGRESS.highestUnlockedLevel,
  );

  return {
    highestUnlockedLevel: Math.max(
      highestFromCleared,
      isStoredId(value.highestUnlockedLevel, MAX_EXPANSION_LEVEL_ID)
        ? value.highestUnlockedLevel
        : DEFAULT_EXPANSION_PROGRESS.highestUnlockedLevel,
    ),
    clearedLevels,
  };
}

function saveGameProgress(progress: GameProgress, storage: ProgressStorage): void {
  try {
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Persistence is optional. The game remains fully playable without it.
  }
}

function getBrowserStorage(): ProgressStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStorage(storage: ProgressStorage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function sanitizeIds(value: unknown, maximum: number): readonly number[] {
  return Array.isArray(value)
    ? sortUnique(value.filter((candidate) => isStoredId(candidate, maximum)))
    : [];
}

function sortUnique(ids: readonly number[]): readonly number[] {
  return [...new Set(ids)].sort((left, right) => left - right);
}

function clampId(value: number, maximum: number): number {
  return Math.min(maximum, Math.max(1, Math.floor(value)));
}

function isStoredId(value: unknown, maximum: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= maximum;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}
