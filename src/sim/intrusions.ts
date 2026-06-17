import {
  getTile,
  getOrthogonalNeighbors,
  getPerimeterPositions,
  getTileKind,
  isInBounds,
  listPositions,
  positionKey,
  samePosition,
  setTile,
  sortPositionsByReadingOrder,
} from "./grid";
import { bfs } from "./pathing";
import { nextInt } from "./rng";
import type {
  EnemyKind,
  EnemyDefinition,
  GameState,
  GridState,
  GridPosition,
  IntrusionState,
  RngState,
  SpawnEdge,
  UnitKind,
} from "./types";
import { getCurrentWave } from "./waves";

const ENEMY_KIND_ORDER: readonly EnemyKind[] = [
  "probe",
  "crawler",
  "spoof",
  "hunter",
  "splitter",
  "goliath",
];
const ORTHOGONAL_DELTAS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
] as const;

type TargetSets = Readonly<{
  route: readonly GridPosition[];
  units: readonly GridPosition[];
}>;

export function spawnIntrusions(state: GameState): GameState {
  if (state.phase !== "active") {
    return state;
  }

  let nextState = spawnScriptedIntrusions(state);

  if (!shouldCadenceSpawn(nextState)) {
    return nextState;
  }

  const kindPick = pickEnemyKind(nextState);
  nextState = {
    ...nextState,
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

    nextState = spawnIntrusionAt(nextState, kindPick.kind, spawnPick.position, true);
  }

  return nextState;
}

export function moveIntrusions(state: GameState): GameState {
  const targetSets = getTargetSets(state);
  let grid = state.grid;
  let events = state.events;
  const intrusions: IntrusionState[] = [];

  for (const intrusion of state.intrusions) {
    const definition = state.config.enemies[intrusion.kind];

    if (state.tickCount - intrusion.lastMoveTick < definition.moveEveryTicks) {
      intrusions.push({
        ...intrusion,
        previousPosition: intrusion.position,
      });
      continue;
    }

    const workingState = {
      ...state,
      grid,
      events,
    };
    const targets = getTargetsForIntrusion(definition, targetSets);
    const path = findPathToNearestTarget(workingState, intrusion, targets);

    if (path && path.length >= 2) {
      const nextPosition = path[1];
      events = [
        ...events,
        createMoveEvent(workingState, intrusion, nextPosition),
      ];
      intrusions.push(moveIntrusion(state, intrusion, nextPosition));
      continue;
    }

    const breachPath = findPathToNearestTarget(workingState, intrusion, targets, true);

    if (!breachPath || breachPath.length < 2) {
      intrusions.push({
        ...intrusion,
        previousPosition: intrusion.position,
        lastMoveTick: state.tickCount,
      });
      continue;
    }

    const nextPosition = breachPath[1];
    const nextKind = getTileKind(grid, nextPosition);

    if (isUnitKind(nextKind)) {
      const attack = attackUnitTile(
        workingState,
        grid,
        events,
        intrusion,
        definition,
        nextPosition,
        nextKind,
      );
      grid = attack.grid;
      events = attack.events;
      intrusions.push({
        ...intrusion,
        previousPosition: intrusion.position,
        lastMoveTick: state.tickCount,
        corruption: null,
      });
      continue;
    }

    events = [
      ...events,
      createMoveEvent(workingState, intrusion, nextPosition),
    ];
    intrusions.push(moveIntrusion(state, intrusion, nextPosition));
  }

  return {
    ...state,
    grid,
    intrusions,
    events,
  };
}

function spawnScriptedIntrusions(state: GameState): GameState {
  const wave = getCurrentWave(state);
  const scriptedSpawns = wave.scriptedSpawns?.filter(
    (entry) => entry.waveTick === state.waveTick,
  ) ?? [];

  let nextState = state;

  for (const entry of scriptedSpawns) {
    if (nextState.waveSpawnedCount >= wave.maxSpawnedIntrusions) {
      break;
    }

    const spawnPick = pickSpawnPosition(nextState);
    nextState = {
      ...nextState,
      rng: spawnPick.rng,
    };

    if (!spawnPick.position) {
      continue;
    }

    nextState = spawnIntrusionAt(nextState, entry.kind, spawnPick.position, true);
  }

  return nextState;
}

function spawnIntrusionAt(
  state: GameState,
  kind: EnemyKind,
  position: GridPosition,
  countTowardWave: boolean,
): GameState {
  const definition = state.config.enemies[kind];
  const intrusion: IntrusionState = {
    id: state.nextIntrusionId,
    kind,
    hp: definition.maxHp,
    maxHp: definition.maxHp,
    position,
    previousPosition: position,
    spawnedTick: state.tickCount,
    lastMoveTick: state.tickCount,
    corruption: null,
  };

  return {
    ...state,
    intrusions: [...state.intrusions, intrusion],
    nextIntrusionId: state.nextIntrusionId + 1,
    spawnedIntrusionCount: state.spawnedIntrusionCount + 1,
    waveSpawnedCount: state.waveSpawnedCount + (countTowardWave ? 1 : 0),
    events: [
      ...state.events,
      {
        type: "intrusionSpawned",
        tick: state.tickCount,
        intrusionId: intrusion.id,
        kind: intrusion.kind,
        position: intrusion.position,
      },
    ],
  };
}

function shouldCadenceSpawn(state: GameState): boolean {
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

  if (getEnemyWeightTotal(wave.enemyWeights) <= 0) {
    return false;
  }

  return (state.waveTick - wave.spawnFirstTick) % wave.spawnEveryTicks === 0;
}

function pickEnemyKind(state: GameState): Readonly<{
  rng: RngState;
  kind: EnemyKind;
}> {
  const wave = getCurrentWave(state);
  const totalWeight = getEnemyWeightTotal(wave.enemyWeights);
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

function getEnemyWeightTotal(weights: Readonly<Record<EnemyKind, number>>): number {
  return ENEMY_KIND_ORDER.reduce((total, kind) => total + weights[kind], 0);
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

function getTargetSets(state: GameState): TargetSets {
  const units = sortPositionsByReadingOrder(
    listPositions(state.grid).filter((position) => {
      const kind = getTileKind(state.grid, position);
      return kind === "relay" || kind === "turret" || kind === "scrubber" || kind === "overclock";
    }),
  );

  if (state.signal.route.length > 0) {
    const inwardRouteTargets = state.signal.route.filter(
      (position) =>
        !samePosition(position, state.config.source) &&
        !samePosition(position, state.config.core) &&
        getTileKind(state.grid, position) !== "firewall",
    );

    if (inwardRouteTargets.length > 0) {
      return {
        route: inwardRouteTargets,
        units,
      };
    }
  }

  return {
    route: [state.config.core],
    units,
  };
}

function getTargetsForIntrusion(
  definition: EnemyDefinition,
  targetSets: TargetSets,
): readonly GridPosition[] {
  if (definition.targeting === "units" && targetSets.units.length > 0) {
    return targetSets.units;
  }

  return targetSets.route;
}

function findPathToNearestTarget(
  state: GameState,
  intrusion: IntrusionState,
  targets: readonly GridPosition[],
  allowUnitSearch = false,
): GridPosition[] | null {
  const targetKeys = new Set(targets.map(positionKey));

  return bfs({
    start: intrusion.position,
    isGoal: (position) => targetKeys.has(positionKey(position)),
    getNeighbors: (position) =>
      getIntrusionNeighbors(
        state,
        intrusion.kind,
        position,
        targetKeys,
        allowUnitSearch,
      ),
    toKey: positionKey,
  });
}

function getIntrusionNeighbors(
  state: GameState,
  kind: EnemyKind,
  position: GridPosition,
  targetKeys: ReadonlySet<string>,
  allowUnitSearch: boolean,
): GridPosition[] {
  const neighbors = getOrthogonalNeighbors(state.grid, position).filter((neighbor) =>
    allowUnitSearch
      ? canIntrusionSearchThrough(state, neighbor, targetKeys)
      : canIntrusionEnter(state, neighbor, targetKeys),
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
  const kind = getTileKind(state.grid, position);

  if (kind === "firewall" || kind === "void") {
    return false;
  }

  if (targetKeys.has(positionKey(position))) {
    return true;
  }

  return kind === "empty" || kind === "corrupted";
}

function canIntrusionSearchThrough(
  state: GameState,
  position: GridPosition,
  targetKeys: ReadonlySet<string>,
): boolean {
  if (canIntrusionEnter(state, position, targetKeys)) {
    return true;
  }

  return isUnitKind(getTileKind(state.grid, position));
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
  return isUnitKind(kind);
}

function attackUnitTile(
  state: GameState,
  grid: GridState,
  events: GameState["events"],
  intrusion: IntrusionState,
  definition: EnemyDefinition,
  position: GridPosition,
  unitKind: UnitKind,
): Readonly<{
  grid: GridState;
  events: GameState["events"];
}> {
  const tile = getTile(grid, position);
  const currentHp = tile.hp ?? state.config.units[unitKind].hp;
  const nextHp = Math.max(0, currentHp - definition.chewDamage);
  const damagedEvent = {
    type: "unitDamaged" as const,
    tick: state.tickCount,
    intrusionId: intrusion.id,
    position,
    unitKind,
    hp: nextHp,
  };

  if (nextHp <= 0) {
    return {
      grid: setTile(grid, position, { kind: "corrupted" }),
      events: [
        ...events,
        damagedEvent,
        {
          type: "tileCorrupted" as const,
          tick: state.tickCount,
          intrusionId: intrusion.id,
          position,
        },
      ],
    };
  }

  return {
    grid: setTile(grid, position, {
      ...tile,
      hp: nextHp,
    }),
    events: [...events, damagedEvent],
  };
}

function createMoveEvent(
  state: GameState,
  intrusion: IntrusionState,
  nextPosition: GridPosition,
): Extract<GameState["events"][number], { type: "intrusionMoved" }> {
  const jumped =
    Math.abs(nextPosition.x - intrusion.position.x) +
      Math.abs(nextPosition.y - intrusion.position.y) >
    1;

  return {
    type: "intrusionMoved",
    tick: state.tickCount,
    intrusionId: intrusion.id,
    from: intrusion.position,
    to: nextPosition,
    jumped,
  };
}

function moveIntrusion(
  state: GameState,
  intrusion: IntrusionState,
  nextPosition: GridPosition,
): IntrusionState {
  return {
    ...intrusion,
    previousPosition: intrusion.position,
    position: nextPosition,
    lastMoveTick: state.tickCount,
    corruption: null,
  };
}

function isUnitKind(kind: string): kind is UnitKind {
  return (
    kind === "relay" ||
    kind === "firewall" ||
    kind === "turret" ||
    kind === "scrubber" ||
    kind === "overclock"
  );
}
