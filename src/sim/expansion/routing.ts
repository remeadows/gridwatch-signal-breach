import { bfs } from "../pathing";
import type { GridPosition } from "../types";
import { getExpansionHardwareCapabilities, isExpansionHardwareKind } from "./capabilities";
import {
  expansionManhattanDistance,
  expansionPositionKey,
  getExpansionTileKind,
  isExpansionInBounds,
  listExpansionPositions,
  sameExpansionPosition,
  sortExpansionPositions,
} from "./grid";
import type { ExpansionGridState } from "./types";

export type ExpansionRoutingInput = Readonly<{
  grid: ExpansionGridState;
  source: GridPosition;
  core: GridPosition;
  relaySignalRange: number;
}>;

export function computeExpansionSignalRoute(
  input: ExpansionRoutingInput,
): GridPosition[] | null {
  assertExpansionRoutingInput(input);

  if (
    getExpansionTileKind(input.grid, input.source) === "corrupted" ||
    getExpansionTileKind(input.grid, input.core) === "corrupted"
  ) {
    return null;
  }

  const carriers = getSignalCarriers(input);
  return bfs({
    start: input.source,
    isGoal: (position) => sameExpansionPosition(position, input.core),
    getNeighbors: (position) =>
      carriers.filter(
        (candidate) =>
          !sameExpansionPosition(candidate, position) &&
          expansionManhattanDistance(position, candidate) <= input.relaySignalRange,
      ),
    toKey: expansionPositionKey,
  });
}

function getSignalCarriers(input: ExpansionRoutingInput): GridPosition[] {
  const hardware = listExpansionPositions(input.grid).filter((position) => {
    if (
      sameExpansionPosition(position, input.source) ||
      sameExpansionPosition(position, input.core)
    ) {
      return false;
    }

    const kind = getExpansionTileKind(input.grid, position);
    return (
      isExpansionHardwareKind(kind) &&
      getExpansionHardwareCapabilities(kind).carriesSignal
    );
  });

  return [input.source, ...sortExpansionPositions(hardware), input.core];
}

function assertExpansionRoutingInput(input: ExpansionRoutingInput): void {
  if (!isExpansionInBounds(input.grid, input.source)) {
    throw new Error("Expansion Source must be in bounds.");
  }
  if (!isExpansionInBounds(input.grid, input.core)) {
    throw new Error("Expansion Core must be in bounds.");
  }
  if (!Number.isInteger(input.relaySignalRange) || input.relaySignalRange <= 0) {
    throw new Error("Expansion relay range must be a positive integer.");
  }
}
