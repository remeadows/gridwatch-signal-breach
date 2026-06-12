import { CORE_TUNING, GRID_SIZE, SECTORS } from "./levels";

const SECTOR_ONE = SECTORS[0];

export const LEVEL_CONFIG = {
  gridSize: GRID_SIZE,
  source: SECTOR_ONE.source,
  core: SECTOR_ONE.core,
  ...CORE_TUNING,
} as const;

export { GRID_SIZE };

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
    x: SECTOR_ONE.source.x,
    y: SECTOR_ONE.source.y,
    fill: "#22e0c4",
    stroke: "#a4fff3",
  },
  {
    label: "CORE",
    x: SECTOR_ONE.core.x,
    y: SECTOR_ONE.core.y,
    fill: "#ff4f91",
    stroke: "#ffd1e0",
  },
];

export const LEVEL_INITIAL_TILES = SECTOR_ONE.initialTiles;
