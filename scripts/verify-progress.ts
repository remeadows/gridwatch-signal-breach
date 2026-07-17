import {
  DEFAULT_GAME_PROGRESS,
  getSignalBreachProgress,
  loadGameProgress,
  markSectorCleared,
  PROGRESS_STORAGE_KEY,
} from "../src/ui/progress";

class MemoryStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const legacyStorage = new MemoryStorage();
const legacyValue = JSON.stringify({
  highestUnlockedSector: 2,
  clearedSectors: [2, 1, 2, 99, "bad"],
});
legacyStorage.setItem("gridwatch.campaign.v1", legacyValue);

const migrated = loadGameProgress(legacyStorage);

expectDeepEqual(
  migrated,
  {
    schema: 2,
    campaigns: {
      "signal-breach": {
        highestUnlockedSector: 3,
        clearedSectors: [1, 2],
      },
      "expansion-1": {
        highestUnlockedLevel: 1,
        clearedLevels: [],
      },
    },
  },
  "Legacy progress did not migrate safely.",
);
expectEqual(
  legacyStorage.getItem("gridwatch.campaign.v1"),
  legacyValue,
  "Migration must retain the legacy progress key unchanged.",
);
expectDeepEqual(
  JSON.parse(legacyStorage.getItem(PROGRESS_STORAGE_KEY) ?? "{}"),
  migrated,
  "Migration did not write the versioned progress root.",
);

const malformedV2WithLegacy = new MemoryStorage();
malformedV2WithLegacy.setItem(
  PROGRESS_STORAGE_KEY,
  JSON.stringify({ schema: 2, campaigns: {} }),
);
malformedV2WithLegacy.setItem(
  "gridwatch.campaign.v1",
  JSON.stringify({ highestUnlockedSector: 3, clearedSectors: [1, 2, 3] }),
);
expectDeepEqual(
  getSignalBreachProgress(loadGameProgress(malformedV2WithLegacy)),
  { highestUnlockedSector: 3, clearedSectors: [1, 2, 3] },
  "Malformed V2 progress must recover intact legacy progress.",
);

const malformedOnly = new MemoryStorage();
malformedOnly.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ schema: 2, campaigns: [] }));
expectDeepEqual(
  loadGameProgress(malformedOnly),
  DEFAULT_GAME_PROGRESS,
  "Malformed storage must safely fall back to the default progress.",
);

const sanitizedV2 = new MemoryStorage();
sanitizedV2.setItem(
  PROGRESS_STORAGE_KEY,
  JSON.stringify({
    schema: 2,
    campaigns: {
      "signal-breach": {
        highestUnlockedSector: 2,
        clearedSectors: [3, 2, 2, -1],
      },
      "expansion-1": {
        highestUnlockedLevel: 2,
        clearedLevels: [1, 30, 30, 31, "bad"],
      },
    },
  }),
);
expectDeepEqual(
  loadGameProgress(sanitizedV2),
  {
    schema: 2,
    campaigns: {
      "signal-breach": {
        highestUnlockedSector: 3,
        clearedSectors: [2, 3],
      },
      "expansion-1": {
        highestUnlockedLevel: 30,
        clearedLevels: [1, 30],
      },
    },
  },
  "V2 progress sanitization drifted.",
);

const progressed = markSectorCleared(DEFAULT_GAME_PROGRESS, 1, legacyStorage);
expectDeepEqual(
  getSignalBreachProgress(progressed),
  { highestUnlockedSector: 2, clearedSectors: [1] },
  "Clearing a sector must only update the original campaign namespace.",
);
expectDeepEqual(
  progressed.campaigns["expansion-1"],
  DEFAULT_GAME_PROGRESS.campaigns["expansion-1"],
  "Clearing a sector must not create expansion progress.",
);

expectDeepEqual(
  loadGameProgress(null),
  DEFAULT_GAME_PROGRESS,
  "Unavailable storage must not block a fresh run.",
);

console.log("Progress migration verification passed.");

function expectEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${String(expected)}, received ${String(actual)}.`);
  }
}

function expectDeepEqual(actual: unknown, expected: unknown, message: string): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    throw new Error(`${message} Expected ${expectedJson}, received ${actualJson}.`);
  }
}
