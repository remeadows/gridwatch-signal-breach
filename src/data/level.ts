import type { InitialTileDefinition } from "../sim/types";

export const LEVEL_CONFIG = {
  gridSize: 8,
  source: {
    x: 0,
    y: 3,
  },
  core: {
    x: 7,
    y: 4,
  },
  initialCoreIntegrity: 150,
  coreIntegrityMax: 150,
  coreIntegrityDrainPerSeveredTick: 2,
  coreIntegrityRegenPerLiveTick: 1,
  simulationTickMs: 350,
  defaultSeed: "gridwatch-signal-breach-phase-3",
} as const;

export const GRID_SIZE = LEVEL_CONFIG.gridSize;

export type GridMarker = {
  label: string;
  x: number;
  y: number;
  fill: string;
  stroke: string;
};

export const INITIAL_GRID_MARKERS: GridMarker[] = [
  {
    label: "SRC",
    x: LEVEL_CONFIG.source.x,
    y: LEVEL_CONFIG.source.y,
    fill: "#22e0c4",
    stroke: "#a4fff3",
  },
  {
    label: "CORE",
    x: LEVEL_CONFIG.core.x,
    y: LEVEL_CONFIG.core.y,
    fill: "#ff4f91",
    stroke: "#ffd1e0",
  },
];

export const LEVEL_INITIAL_TILES: readonly InitialTileDefinition[] = [
  {
    position: { x: 2, y: 3 },
    kind: "relay",
  },
  {
    position: { x: 4, y: 3 },
    kind: "relay",
  },
  {
    position: { x: 6, y: 3 },
    kind: "relay",
  },
] as const;
