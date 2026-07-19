import type { GridPosition } from "../types";
import {
  EXPANSION_TILE_KINDS,
  type ExpansionGridState,
  type ExpansionTileKind,
  type ExpansionTileState,
} from "./types";

const ORTHOGONAL_DELTAS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
] as const;

export function createExpansionGrid(size: number): ExpansionGridState {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error("Expansion grid size must be a positive integer.");
  }

  return {
    size,
    tiles: Array.from({ length: size * size }, () => ({ kind: "empty" as const })),
  };
}

export function isExpansionTileKind(value: string): value is ExpansionTileKind {
  return (EXPANSION_TILE_KINDS as readonly string[]).includes(value);
}

export function isExpansionInBounds(
  grid: ExpansionGridState,
  position: GridPosition,
): boolean {
  return (
    Number.isInteger(position.x) &&
    Number.isInteger(position.y) &&
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < grid.size &&
    position.y < grid.size
  );
}

export function getExpansionTile(
  grid: ExpansionGridState,
  position: GridPosition,
): ExpansionTileState {
  return grid.tiles[toExpansionIndex(grid, position)];
}

export function getExpansionTileKind(
  grid: ExpansionGridState,
  position: GridPosition,
): ExpansionTileKind {
  return getExpansionTile(grid, position).kind;
}

export function setExpansionTile(
  grid: ExpansionGridState,
  position: GridPosition,
  tile: ExpansionTileState,
): ExpansionGridState {
  assertExpansionInBounds(grid, position);
  const tiles = [...grid.tiles];
  tiles[toExpansionIndex(grid, position)] = tile;
  return { ...grid, tiles };
}

export function setExpansionTileKind(
  grid: ExpansionGridState,
  position: GridPosition,
  kind: ExpansionTileKind,
): ExpansionGridState {
  return setExpansionTile(grid, position, { kind });
}

export function listExpansionPositions(grid: ExpansionGridState): GridPosition[] {
  const positions: GridPosition[] = [];

  for (let y = 0; y < grid.size; y += 1) {
    for (let x = 0; x < grid.size; x += 1) {
      positions.push({ x, y });
    }
  }

  return positions;
}

export function getExpansionPositionsByKind(
  grid: ExpansionGridState,
  kind: ExpansionTileKind,
): GridPosition[] {
  return listExpansionPositions(grid).filter(
    (position) => getExpansionTileKind(grid, position) === kind,
  );
}

export function getExpansionOrthogonalNeighbors(
  grid: ExpansionGridState,
  position: GridPosition,
): GridPosition[] {
  return ORTHOGONAL_DELTAS.map((delta) => ({
    x: position.x + delta.x,
    y: position.y + delta.y,
  })).filter((neighbor) => isExpansionInBounds(grid, neighbor));
}

export function getExpansionPerimeterPositions(grid: ExpansionGridState): GridPosition[] {
  return listExpansionPositions(grid).filter(
    (position) =>
      position.x === 0 ||
      position.y === 0 ||
      position.x === grid.size - 1 ||
      position.y === grid.size - 1,
  );
}

export function isExpansionPerimeter(
  grid: ExpansionGridState,
  position: GridPosition,
): boolean {
  return (
    position.x === 0 ||
    position.y === 0 ||
    position.x === grid.size - 1 ||
    position.y === grid.size - 1
  );
}

export function expansionManhattanDistance(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function sameExpansionPosition(a: GridPosition, b: GridPosition): boolean {
  return a.x === b.x && a.y === b.y;
}

export function expansionPositionKey(position: GridPosition): string {
  return `${position.x},${position.y}`;
}

export function sortExpansionPositions(
  positions: readonly GridPosition[],
): GridPosition[] {
  return [...positions].sort((a, b) => a.y - b.y || a.x - b.x);
}

export function assertExpansionInBounds(
  grid: ExpansionGridState,
  position: GridPosition,
): void {
  if (!isExpansionInBounds(grid, position)) {
    throw new Error(`Expansion grid position out of bounds: ${expansionPositionKey(position)}.`);
  }
}

function toExpansionIndex(grid: ExpansionGridState, position: GridPosition): number {
  assertExpansionInBounds(grid, position);
  return position.y * grid.size + position.x;
}
