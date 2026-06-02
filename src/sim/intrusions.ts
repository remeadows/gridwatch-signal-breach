import {
  getOrthogonalNeighbors,
  getPerimeterPositions,
  getTileKind,
  isInBounds,
  positionKey,
  samePosition,
  sortPositionsByReadingOrder,
} from "./grid";
import { bfs } from "./pathing";
import { nextInt } from "./rng";
import type {
  EnemyKind,
  GameState,
  GridPosition,
  IntrusionState,
  RngState,
  SpawnEdge,
} from "./types";
import { getCurrentWave } from "./waves";

const ENEMY_KIND_ORDER: readonly EnemyKind[] = ["probe", "crawler", "spoof"];
const ORTHOGONAL_DELTAS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
] as const;

export function spawnIntrusions(state: GameState): GameState {
  if (!shouldSpawn(state)) {
    return state;
  }

  const kindPick = pickEnemyKind(state);
  let nextState = {
    ...state,
    rng: kindPick.rng,
  };
  const definition = nextState.config.enemies[kindPick.kind];
  const wave = getCurrentWave(nextState);

  for (let spawnIndex = 0; spawnIndex < definition.spawnBatchSize; spawnIndex += 1) {
    if (
      nextState.intrusions.length >= wave.maxActiveIntrusions ||
      nextState.waveSpawnedCount >= wave.maxSpawnedIntrusions
    ) {
      break;
    }

    const spawnPick = pickSpawnPosition(nextState);

    nextState = {
      ...nextState,
      rng: spawnPick.rng,
    };

    if (!spawnPick.position) {
      break;
    }

    const intrusion: IntrusionState = {
      id: nextState.nextIntrusionId,
      kind: kindPick.kind,
      hp: definition.maxHp,
      maxHp: definition.maxHp,
      position: spawnPick.position,
      previousPosition: spawnPick.position,
      spawnedTick: nextState.tickCount,
      lastMoveTick: nextState.tickCount,
      corruption: null,
    };

    nextState = {
      ...nextState,
      intrusions: [...nextState.intrusions, intrusion],
      nextIntrusionId: nextState.nextIntrusionId + 1,
      spawnedIntrusionCount: nextState.spawnedIntrusionCount + 1,
      waveSpawnedCount: nextState.waveSpawnedCount + 1,
      events: [
        ...nextState.events,
        {
          type: "intrusionSpawned",
          tick: nextState.tickCount,
          intrusionId: intrusion.id,
          kind: intrusion.kind,
          position: intrusion.position,
        },
      ],
    };
  }

  return nextState;
}

export function moveIntrusions(state: GameState): GameState {
  const targets = getIntrusionTargets(state);
  let events = state.events;

  const intrusions = state.intrusions.map((intrusion) => {
    const definition = state.config.enemies[intrusion.kind];

    if (state.tickCount - intrusion.lastMoveTick < definition.moveEveryTicks) {
      return {
        ...intrusion,
        previousPosition: intrusion.position,
      };
    }

    const path = findPathToNearestTarget(state, intrusion, targets);

    if (!path || path.length < 2) {
      return {
        ...intrusion,
        previousPosition: intrusion.position,
        lastMoveTick: state.tickCount,
      };
    }

    const nextPosition = path[1];
    const jumped = Math.abs(nextPosition.x - intrusion.position.x) +
      Math.abs(nextPosition.y - intrusion.position.y) > 1;

    events = [
      ...events,
      {
        type: "intrusionMoved",
        tick: state.tickCount,
        intrusionId: intrusion.id,
        from: intrusion.position,
        to: nextPosition,
        jumped,
      },
    ];

    return {
      ...intrusion,
      previousPosition: intrusion.position,
      position: nextPosition,
      lastMoveTick: state.tickCount,
      corruption: null,
    };
  });

  return {
    ...state,
    intrusions,
    events,
  };
}

function shouldSpawn(state: GameState): boolean {
  if (state.phase !== "active") {
    return false;
  }

  const wave = getCurrentWave(state);

  if (state.waveTick < wave.spawnFirstTick) {
    return false;
  }

  if (state.waveSpawnedCount >= wave.maxSpawnedIntrusions) {
    return false;
  }

  if (state.intrusions.length >= wave.maxActiveIntrusions) {
    return false;
  }

  return (state.waveTick - wave.spawnFirstTick) % wave.spawnEveryTicks === 0;
}

function pickEnemyKind(state: GameState): Readonly<{
  rng: RngState;
  kind: EnemyKind;
}> {
  const wave = getCurrentWave(state);
  const totalWeight = ENEMY_KIND_ORDER.reduce(
    (total, kind) => total + wave.enemyWeights[kind],
    0,
  );
  const pick = nextInt(state.rng, 0, totalWeight);
  let cursor = pick.value;

  for (const kind of ENEMY_KIND_ORDER) {
    cursor -= wave.enemyWeights[kind];

    if (cursor < 0) {
      return {
        rng: pick.rng,
        kind,
      };
    }
  }

  return {
    rng: pick.rng,
    kind: ENEMY_KIND_ORDER[ENEMY_KIND_ORDER.length - 1],
  };
}

function pickSpawnPosition(state: GameState): Readonly<{
  rng: RngState;
  position: GridPosition | null;
}> {
  const wave = getCurrentWave(state);
  const candidates = sortPositionsByReadingOrder(
    getPerimeterPositions(state.grid).filter(
      (position) =>
        isOnSpawnEdge(state, position, wave.spawnEdges) &&
        isSpawnable(state, position),
    ),
  );

  if (candidates.length === 0) {
    return {
      rng: state.rng,
      position: null,
    };
  }

  let rng = state.rng;

  for (
    let attempt = 0;
    attempt < wave.perimeterPickAttempts;
    attempt += 1
  ) {
    const pick = nextInt(rng, 0, candidates.length);
    rng = pick.rng;
    const position = candidates[pick.value];

    if (isSpawnable(state, position)) {
      return {
        rng,
        position,
      };
    }
  }

  return {
    rng,
    position: candidates[0],
  };
}

function isOnSpawnEdge(
  state: GameState,
  position: GridPosition,
  spawnEdges: readonly SpawnEdge[],
): boolean {
  return spawnEdges.some((edge) => isOnEdge(state, position, edge));
}

function isOnEdge(state: GameState, position: GridPosition, edge: SpawnEdge): boolean {
  switch (edge) {
    case "north":
      return position.y === 0;
    case "east":
      return position.x === state.grid.size - 1;
    case "south":
      return position.y === state.grid.size - 1;
    case "west":
      return position.x === 0;
  }
}

function isSpawnable(state: GameState, position: GridPosition): boolean {
  if (samePosition(position, state.config.source) || samePosition(position, state.config.core)) {
    return false;
  }

  if (getTileKind(state.grid, position) !== "empty") {
    return false;
  }

  return !state.intrusions.some((intrusion) => samePosition(intrusion.position, position));
}

function getIntrusionTargets(state: GameState): readonly GridPosition[] {
  if (state.signal.route.length > 0) {
    const inwardRouteTargets = state.signal.route.filter(
      (position) =>
        !samePosition(position, state.config.source) &&
        !samePosition(position, state.config.core),
    );

    if (inwardRouteTargets.length > 0) {
      return inwardRouteTargets;
    }
  }

  return [state.config.core];
}

function findPathToNearestTarget(
  state: GameState,
  intrusion: IntrusionState,
  targets: readonly GridPosition[],
): GridPosition[] | null {
  const targetKeys = new Set(targets.map(positionKey));

  return bfs({
    start: intrusion.position,
    isGoal: (position) => targetKeys.has(positionKey(position)),
    getNeighbors: (position) =>
      getIntrusionNeighbors(state, intrusion.kind, position, targetKeys),
    toKey: positionKey,
  });
}

function getIntrusionNeighbors(
  state: GameState,
  kind: EnemyKind,
  position: GridPosition,
  targetKeys: ReadonlySet<string>,
): GridPosition[] {
  const neighbors = getOrthogonalNeighbors(state.grid, position).filter((neighbor) =>
    canIntrusionEnter(state, neighbor, targetKeys),
  );

  if (kind !== "spoof") {
    return neighbors;
  }

  const jumps = ORTHOGONAL_DELTAS.map((delta) => ({
    blocker: {
      x: position.x + delta.x,
      y: position.y + delta.y,
    },
    landing: {
      x: position.x + delta.x * 2,
      y: position.y + delta.y * 2,
    },
  }))
    .filter(
      ({ blocker, landing }) =>
        isInBounds(state.grid, blocker) &&
        isInBounds(state.grid, landing) &&
        isBlocker(state, blocker, targetKeys) &&
        canIntrusionEnter(state, landing, targetKeys),
    )
    .map(({ landing }) => landing);

  return [...neighbors, ...jumps];
}

function canIntrusionEnter(
  state: GameState,
  position: GridPosition,
  targetKeys: ReadonlySet<string>,
): boolean {
  if (targetKeys.has(positionKey(position))) {
    return true;
  }

  const kind = getTileKind(state.grid, position);
  return kind === "empty" || kind === "corrupted";
}

function isBlocker(
  state: GameState,
  position: GridPosition,
  targetKeys: ReadonlySet<string>,
): boolean {
  if (targetKeys.has(positionKey(position))) {
    return false;
  }

  const kind = getTileKind(state.grid, position);
  return kind === "relay" || kind === "firewall" || kind === "turret";
}
