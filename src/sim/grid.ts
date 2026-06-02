import { TILE_KINDS, type GridPosition, type GridState, type TileKind } from "./types";

const ORTHOGONAL_DELTAS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
] as const;

export function createGrid(size: number): GridState {
  assertPositiveInteger(size, "Grid size");

  return {
    size,
    tiles: Array.from({ length: size * size }, () => ({
      kind: "empty",
    })),
  };
}

export function isTileKind(value: string): value is TileKind {
  return (TILE_KINDS as readonly string[]).includes(value);
}

export function isInBounds(grid: GridState, position: GridPosition): boolean {
  return (
    Number.isInteger(position.x) &&
    Number.isInteger(position.y) &&
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < grid.size &&
    position.y < grid.size
  );
}

export function toIndex(grid: GridState, position: GridPosition): number {
  assertInBounds(grid, position);
  return position.y * grid.size + position.x;
}

export function getTileKind(grid: GridState, position: GridPosition): TileKind {
  return grid.tiles[toIndex(grid, position)].kind;
}

export function setTileKind(
  grid: GridState,
  position: GridPosition,
  kind: TileKind,
): GridState {
  assertInBounds(grid, position);

  const tiles = [...grid.tiles];
  tiles[toIndex(grid, position)] = { kind };

  return {
    ...grid,
    tiles,
  };
}

export function listPositions(grid: GridState): GridPosition[] {
  const positions: GridPosition[] = [];

  for (let y = 0; y < grid.size; y += 1) {
    for (let x = 0; x < grid.size; x += 1) {
      positions.push({ x, y });
    }
  }

  return positions;
}

export function getPositionsByKind(grid: GridState, kind: TileKind): GridPosition[] {
  return listPositions(grid).filter((position) => getTileKind(grid, position) === kind);
}

export function getOrthogonalNeighbors(
  grid: GridState,
  position: GridPosition,
): GridPosition[] {
  return ORTHOGONAL_DELTAS.map((delta) => ({
    x: position.x + delta.x,
    y: position.y + delta.y,
  })).filter((neighbor) => isInBounds(grid, neighbor));
}

export function getPerimeterPositions(grid: GridState): GridPosition[] {
  return listPositions(grid).filter(
    (position) =>
      position.x === 0 ||
      position.y === 0 ||
      position.x === grid.size - 1 ||
      position.y === grid.size - 1,
  );
}

export function manhattanDistance(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function samePosition(a: GridPosition, b: GridPosition): boolean {
  return a.x === b.x && a.y === b.y;
}

export function positionKey(position: GridPosition): string {
  return `${position.x},${position.y}`;
}

export function sortPositionsByReadingOrder(positions: readonly GridPosition[]): GridPosition[] {
  return [...positions].sort((a, b) => a.y - b.y || a.x - b.x);
}

export function isCorrupted(grid: GridState, position: GridPosition): boolean {
  return getTileKind(grid, position) === "corrupted";
}

export function assertInBounds(grid: GridState, position: GridPosition): void {
  if (!isInBounds(grid, position)) {
    throw new Error(`Grid position out of bounds: ${positionKey(position)}`);
  }
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}
