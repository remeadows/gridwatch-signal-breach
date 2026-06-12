import { UNIT_TUNING } from "./units";
import { WAVE_TUNING } from "./waves";
import type {
  GridPosition,
  InitialTileDefinition,
  PlayerTool,
  TileKind,
  WaveDefinition,
} from "../sim/types";

export type SectorDefinition = Readonly<{
  id: number;
  name: string;
  codename: string;
  gridSize: number;
  source: GridPosition;
  core: GridPosition;
  voidTiles: readonly GridPosition[];
  initialTiles: readonly InitialTileDefinition[];
  waves: readonly WaveDefinition[];
  toolsUnlocked: readonly PlayerTool[];
  tagline: string;
}>;

export const GRID_SIZE = 8;

export const CORE_TUNING = {
  initialCoreIntegrity: 150,
  coreIntegrityMax: 150,
  coreIntegrityDrainPerSeveredTick: 2,
  coreIntegrityRegenPerLiveTick: 1,
  simulationTickMs: 350,
  defaultSeed: "gridwatch-signal-breach-phase-3",
} as const;

const BASE_TOOLS = ["relay", "firewall", "turret", "sell"] as const;

export const SECTORS: readonly SectorDefinition[] = [
  {
    id: 1,
    name: "Perimeter Run",
    codename: "PERIMETER RUN",
    gridSize: GRID_SIZE,
    source: { x: 0, y: 3 },
    core: { x: 7, y: 4 },
    voidTiles: [],
    initialTiles: [
      { position: { x: 2, y: 3 }, kind: "relay" },
      { position: { x: 4, y: 3 }, kind: "relay" },
      { position: { x: 6, y: 3 }, kind: "relay" },
    ],
    waves: WAVE_TUNING.slice(0, 5),
    toolsUnlocked: BASE_TOOLS,
    tagline: "The first breach line. Learn the cadence, then hold it.",
  },
  {
    id: 2,
    name: "Relay Canyon",
    codename: "RELAY CANYON",
    gridSize: GRID_SIZE,
    source: { x: 1, y: 6 },
    core: { x: 6, y: 1 },
    voidTiles: [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 2, y: 3 },
      { x: 4, y: 4 },
      { x: 5, y: 4 },
      { x: 4, y: 5 },
    ],
    initialTiles: [
      { position: { x: 1, y: 4 }, kind: "relay" },
      { position: { x: 1, y: 2 }, kind: "relay" },
      { position: { x: 2, y: 1 }, kind: "relay" },
      { position: { x: 4, y: 1 }, kind: "relay" },
    ],
    waves: WAVE_TUNING.slice(5, 9),
    toolsUnlocked: [...BASE_TOOLS, "scrubber"],
    tagline: "Chasms block bodies, not signal. Reclaim the scars.",
  },
  {
    id: 3,
    name: "Core Vault",
    codename: "CORE VAULT",
    gridSize: GRID_SIZE,
    source: { x: 7, y: 7 },
    core: { x: 3, y: 4 },
    voidTiles: [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
      { x: 1, y: 3 },
      { x: 1, y: 4 },
      { x: 1, y: 5 },
      { x: 5, y: 3 },
      { x: 5, y: 4 },
      { x: 2, y: 6 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
    ],
    initialTiles: [
      { position: { x: 6, y: 6 }, kind: "relay" },
      { position: { x: 6, y: 4 }, kind: "relay" },
      { position: { x: 4, y: 4 }, kind: "relay" },
    ],
    waves: WAVE_TUNING.slice(9, 12),
    toolsUnlocked: [...BASE_TOOLS, "scrubber", "overclock"],
    tagline: "Two vault gates, one Core, no clean lane home.",
  },
];

for (const sector of SECTORS) {
  assertSectorInvariants(sector);
}

function assertSectorInvariants(sector: SectorDefinition): void {
  assert(sector.gridSize === GRID_SIZE, `Sector ${sector.id} grid must be ${GRID_SIZE}.`);
  assertPositionInBounds(sector, sector.source, "source");
  assertPositionInBounds(sector, sector.core, "core");

  const reserved = new Set([
    positionKey(sector.source),
    positionKey(sector.core),
  ]);
  const initialTileKeys = new Set<string>();
  const voidKeys = new Set<string>();

  for (const voidTile of sector.voidTiles) {
    const key = positionKey(voidTile);

    assertPositionInBounds(sector, voidTile, "void");
    assert(
      !isPerimeter(sector, voidTile),
      `Sector ${sector.id} void on perimeter ${key}.`,
    );
    assert(!reserved.has(key), `Sector ${sector.id} void overlaps source/core.`);
    assert(!voidKeys.has(key), `Sector ${sector.id} duplicate void tile at ${key}.`);
    voidKeys.add(key);
  }

  for (const initialTile of sector.initialTiles) {
    const key = positionKey(initialTile.position);

    assertPositionInBounds(sector, initialTile.position, initialTile.kind);
    assert(isInitialUnitKind(initialTile.kind), `Sector ${sector.id} initial tile must be a unit.`);
    assert(
      !reserved.has(key),
      `Sector ${sector.id} initial tile overlaps source/core.`,
    );
    assert(
      !voidKeys.has(key),
      `Sector ${sector.id} initial tile overlaps void.`,
    );
    assert(!initialTileKeys.has(key), `Sector ${sector.id} duplicate initial tile at ${key}.`);
    initialTileKeys.add(key);
  }

  assertInitialRouteLive(sector);
}

function assertInitialRouteLive(sector: SectorDefinition): void {
  const carriers = [
    sector.source,
    ...sector.initialTiles
      .filter((tile) => tile.kind === "relay" || tile.kind === "firewall")
      .map((tile) => tile.position),
    sector.core,
  ];
  const target = positionKey(sector.core);
  const visited = new Set<string>([positionKey(sector.source)]);
  const queue: GridPosition[] = [sector.source];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      break;
    }

    if (positionKey(current) === target) {
      return;
    }

    for (const candidate of carriers) {
      const key = positionKey(candidate);

      if (
        visited.has(key) ||
        manhattanDistance(current, candidate) > UNIT_TUNING.relay.signalRange
      ) {
        continue;
      }

      visited.add(key);
      queue.push(candidate);
    }
  }

  throw new Error(`Sector ${sector.id} initial route is not live.`);
}

function assertPositionInBounds(
  sector: SectorDefinition,
  position: GridPosition,
  label: string,
): void {
  assert(
    Number.isInteger(position.x) &&
      Number.isInteger(position.y) &&
      position.x >= 0 &&
      position.y >= 0 &&
      position.x < sector.gridSize &&
      position.y < sector.gridSize,
    `Sector ${sector.id} ${label} out of bounds: ${positionKey(position)}.`,
  );
}

function isPerimeter(sector: SectorDefinition, position: GridPosition): boolean {
  return (
    position.x === 0 ||
    position.y === 0 ||
    position.x === sector.gridSize - 1 ||
    position.y === sector.gridSize - 1
  );
}

function isInitialUnitKind(kind: TileKind): boolean {
  return kind === "relay" || kind === "firewall" || kind === "turret";
}

function manhattanDistance(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function positionKey(position: GridPosition): string {
  return `${position.x},${position.y}`;
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
