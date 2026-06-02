import {
  getTileKind,
  isCorrupted,
  isInBounds,
  listPositions,
  manhattanDistance,
  positionKey,
  samePosition,
  sortPositionsByReadingOrder,
} from "./grid";
import { bfs } from "./pathing";
import type { GridPosition, GridState, TileKind } from "./types";

export type RoutingInput = Readonly<{
  grid: GridState;
  source: GridPosition;
  core: GridPosition;
  relaySignalRange: number;
}>;

export function computeSignalRoute(input: RoutingInput): GridPosition[] | null {
  assertRoutingInput(input);

  if (isCorrupted(input.grid, input.source) || isCorrupted(input.grid, input.core)) {
    return null;
  }

  const carriers = getSignalCarriers(input);
  const route = bfs({
    start: input.source,
    isGoal: (position) => samePosition(position, input.core),
    getNeighbors: (position) => getConnectedCarriers(position, carriers, input),
    toKey: positionKey,
  });

  if (route) {
    assertRouteValidity(route, input);
  }

  return route;
}

export function assertRouteValidity(
  route: readonly GridPosition[],
  input: RoutingInput,
): void {
  assert(route.length > 0, "Signal route must contain at least one tile.");
  assert(
    samePosition(route[0], input.source),
    "Signal route must begin at the Source tile.",
  );
  assert(
    samePosition(route[route.length - 1], input.core),
    "Signal route must end at the Core tile.",
  );

  const visited = new Set<string>();

  for (const position of route) {
    const key = positionKey(position);
    assert(!visited.has(key), `Signal route loops through ${key}.`);
    visited.add(key);
    assert(isInBounds(input.grid, position), `Signal route leaves grid at ${key}.`);
    assert(!isCorrupted(input.grid, position), `Signal route uses corrupted tile ${key}.`);
    assert(
      isSignalCarrier(position, input),
      `Signal route uses non-carrier tile ${key}.`,
    );
  }

  for (let index = 1; index < route.length; index += 1) {
    const previous = route[index - 1];
    const current = route[index];
    const distance = manhattanDistance(previous, current);

    assert(
      distance <= input.relaySignalRange,
      `Signal route hop ${positionKey(previous)} -> ${positionKey(current)} exceeds relay range.`,
    );
  }
}

function getSignalCarriers(input: RoutingInput): GridPosition[] {
  const carrierPositions = listPositions(input.grid).filter(
    (position) =>
      !samePosition(position, input.source) &&
      !samePosition(position, input.core) &&
      !isCorrupted(input.grid, position) &&
      isSignalCarrierKind(getTileKind(input.grid, position)),
  );

  return [
    input.source,
    ...sortPositionsByReadingOrder(carrierPositions),
    input.core,
  ];
}

function getConnectedCarriers(
  position: GridPosition,
  carriers: readonly GridPosition[],
  input: RoutingInput,
): GridPosition[] {
  return carriers.filter(
    (candidate) =>
      !samePosition(candidate, position) &&
      manhattanDistance(position, candidate) <= input.relaySignalRange,
  );
}

function isSignalCarrier(position: GridPosition, input: RoutingInput): boolean {
  if (samePosition(position, input.source) || samePosition(position, input.core)) {
    return true;
  }

  return isSignalCarrierKind(getTileKind(input.grid, position));
}

function isSignalCarrierKind(kind: TileKind): boolean {
  return kind === "relay" || kind === "firewall";
}

function assertRoutingInput(input: RoutingInput): void {
  assert(isInBounds(input.grid, input.source), "Source tile must be in bounds.");
  assert(isInBounds(input.grid, input.core), "Core tile must be in bounds.");
  assert(
    Number.isInteger(input.relaySignalRange) && input.relaySignalRange > 0,
    "Relay signal range must be a positive integer.",
  );
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
