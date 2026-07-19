import { bfs } from "../pathing";
import { nextInt } from "../rng";
import {
  getExpansionHardwareCapabilities,
  isExpansionHardwareKind,
  isTargetableExpansionHardwareKind,
} from "./capabilities";
import {
  expansionPositionKey,
  getExpansionOrthogonalNeighbors,
  getExpansionPerimeterPositions,
  getExpansionTile,
  getExpansionTileKind,
  isExpansionInBounds,
  listExpansionPositions,
  sameExpansionPosition,
  setExpansionTile,
  sortExpansionPositions,
} from "./grid";
import type {
  ExpansionEnemyDefinition,
  ExpansionEnemyKind,
  ExpansionGameState,
  ExpansionGridState,
  ExpansionHardwareKind,
  ExpansionIntrusionState,
} from "./types";
import type { SpawnEdge } from "../types";
import { getCurrentExpansionWave } from "./waves";

const ENEMY_ORDER: readonly ExpansionEnemyKind[] = ["probe", "crawler", "spoof", "hunter", "splitter", "goliath", "rusher"];
const JUMP_DELTAS = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }] as const;

type TargetSets = Readonly<{ route: readonly Readonly<{ x: number; y: number }>[]; units: readonly Readonly<{ x: number; y: number }>[] }>;

export function spawnExpansionIntrusions(state: ExpansionGameState): ExpansionGameState {
  if (state.phase !== "active") return state;
  let next = spawnScripted(state);
  if (!shouldCadenceSpawn(next)) return next;
  const pick = pickKind(next);
  next = { ...next, rng: pick.rng };
  const definition = next.config.enemies[pick.kind];
  const wave = getCurrentExpansionWave(next);

  for (let index = 0; index < definition.spawnBatchSize; index += 1) {
    if (next.intrusions.length >= wave.maxActiveIntrusions || next.waveSpawnedCount >= getCadenceSpawnLimit(next)) break;
    const positionPick = pickSpawnPosition(next);
    next = { ...next, rng: positionPick.rng };
    if (!positionPick.position) break;
    next = spawnAt(next, pick.kind, positionPick.position, true);
  }
  return next;
}

export function moveExpansionIntrusions(state: ExpansionGameState): ExpansionGameState {
  const targets = getTargetSets(state);
  let grid = state.grid;
  let events = state.events;
  const intrusions: ExpansionIntrusionState[] = [];

  for (const intrusion of [...state.intrusions].sort((a, b) => a.id - b.id)) {
    const definition = state.config.enemies[intrusion.kind];
    if (state.tickCount - intrusion.lastMoveTick < definition.moveEveryTicks) {
      intrusions.push({ ...intrusion, previousPosition: intrusion.position });
      continue;
    }

    const working = { ...state, grid, events };
    const targetPositions = definition.targeting === "units" && targets.units.length > 0 ? targets.units : targets.route;
    const path = findPath(working, intrusion, targetPositions, false);
    if (path && path.length >= 2) {
      const to = path[1];
      events = [...events, moveEvent(state, intrusion, to)];
      intrusions.push(moved(state, intrusion, to));
      continue;
    }

    const breach = findPath(working, intrusion, targetPositions, true);
    if (!breach || breach.length < 2) {
      intrusions.push({ ...intrusion, previousPosition: intrusion.position, lastMoveTick: state.tickCount });
      continue;
    }

    const nextPosition = breach[1];
    const kind = getExpansionTileKind(grid, nextPosition);
    if (isExpansionHardwareKind(kind) && getExpansionHardwareCapabilities(kind).chewable) {
      const attacked = attackHardware(working, grid, events, intrusion, definition, nextPosition, kind);
      grid = attacked.grid;
      events = attacked.events;
      intrusions.push({ ...intrusion, previousPosition: intrusion.position, lastMoveTick: state.tickCount, corruption: null });
      continue;
    }

    events = [...events, moveEvent(state, intrusion, nextPosition)];
    intrusions.push(moved(state, intrusion, nextPosition));
  }

  return { ...state, grid, events, intrusions };
}

function spawnScripted(state: ExpansionGameState): ExpansionGameState {
  const entries = getCurrentExpansionWave(state).scriptedSpawns ?? [];
  let next = state;
  while (next.waveScriptedSpawnIndex < entries.length) {
    const entry = entries[next.waveScriptedSpawnIndex];
    if (!entry || entry.waveTick > next.waveTick) break;
    const wave = getCurrentExpansionWave(next);
    if (
      next.waveSpawnedCount >= wave.maxSpawnedIntrusions ||
      next.intrusions.length >= wave.maxActiveIntrusions
    ) break;
    const pick = pickSpawnPosition(next);
    next = { ...next, rng: pick.rng };
    if (!pick.position) break;
    next = {
      ...spawnAt(next, entry.kind, pick.position, true),
      waveScriptedSpawnIndex: next.waveScriptedSpawnIndex + 1,
    };
  }
  return next;
}

function spawnAt(state: ExpansionGameState, kind: ExpansionEnemyKind, position: Readonly<{ x: number; y: number }>, count: boolean): ExpansionGameState {
  const definition = state.config.enemies[kind];
  const intrusion: ExpansionIntrusionState = {
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
    waveSpawnedCount: state.waveSpawnedCount + (count ? 1 : 0),
    events: [...state.events, { type: "intrusionSpawned", tick: state.tickCount, intrusionId: intrusion.id, kind, position }],
  };
}

function shouldCadenceSpawn(state: ExpansionGameState): boolean {
  const wave = getCurrentExpansionWave(state);
  return state.waveTick >= wave.spawnFirstTick &&
    state.waveSpawnedCount < getCadenceSpawnLimit(state) &&
    state.intrusions.length < wave.maxActiveIntrusions &&
    totalWeight(wave.enemyWeights) > 0 &&
    (state.waveTick - wave.spawnFirstTick) % wave.spawnEveryTicks === 0;
}

function getCadenceSpawnLimit(state: ExpansionGameState): number {
  const wave = getCurrentExpansionWave(state);
  const remainingScriptedSpawns = Math.max(
    0,
    (wave.scriptedSpawns?.length ?? 0) - state.waveScriptedSpawnIndex,
  );
  return Math.max(0, wave.maxSpawnedIntrusions - remainingScriptedSpawns);
}

function pickKind(state: ExpansionGameState) {
  const weights = getCurrentExpansionWave(state).enemyWeights;
  const pick = nextInt(state.rng, 0, totalWeight(weights));
  let cursor = pick.value;
  for (const kind of ENEMY_ORDER) {
    cursor -= weights[kind];
    if (cursor < 0) return { rng: pick.rng, kind };
  }
  return { rng: pick.rng, kind: "rusher" as const };
}

function totalWeight(weights: Readonly<Record<ExpansionEnemyKind, number>>): number {
  return ENEMY_ORDER.reduce((total, kind) => total + weights[kind], 0);
}

function pickSpawnPosition(state: ExpansionGameState) {
  const candidates = getOpenExpansionSpawnPositions(state).filter((position) =>
    !state.intrusions.some((intrusion) => sameExpansionPosition(intrusion.position, position)),
  );
  if (candidates.length === 0) return { rng: state.rng, position: null };
  const pick = nextInt(state.rng, 0, candidates.length);
  return { rng: pick.rng, position: candidates[pick.value] };
}

export function getOpenExpansionSpawnPositions(
  state: ExpansionGameState,
  spawnEdges: readonly SpawnEdge[] = getCurrentExpansionWave(state).spawnEdges,
): readonly Readonly<{ x: number; y: number }>[] {
  return sortExpansionPositions(getExpansionPerimeterPositions(state.grid).filter((position) =>
    spawnEdges.some((edge) => isPositionOnSpawnEdge(state.grid.size, position, edge)) &&
    isOpenSpawnPosition(state, position),
  ));
}

function isOpenSpawnPosition(state: ExpansionGameState, position: Readonly<{ x: number; y: number }>): boolean {
  return !sameExpansionPosition(position, state.config.source) &&
    !sameExpansionPosition(position, state.config.core) &&
    getExpansionTileKind(state.grid, position) === "empty";
}

function isPositionOnSpawnEdge(
  gridSize: number,
  position: Readonly<{ x: number; y: number }>,
  edge: SpawnEdge,
): boolean {
  if (edge === "north") return position.y === 0;
  if (edge === "east") return position.x === gridSize - 1;
  if (edge === "south") return position.y === gridSize - 1;
  return position.x === 0;
}

function getTargetSets(state: ExpansionGameState): TargetSets {
  const units = sortExpansionPositions(listExpansionPositions(state.grid).filter((position) => {
    const kind = getExpansionTileKind(state.grid, position);
    return isExpansionHardwareKind(kind) && isTargetableExpansionHardwareKind(kind);
  }));
  const route = state.signal.route.filter((position) =>
    !sameExpansionPosition(position, state.config.source) &&
    !sameExpansionPosition(position, state.config.core) &&
    getExpansionTileKind(state.grid, position) !== "firewall",
  );
  return { route: route.length > 0 ? route : [state.config.core], units };
}

function findPath(state: ExpansionGameState, intrusion: ExpansionIntrusionState, targets: readonly Readonly<{ x: number; y: number }>[], allowHardware: boolean) {
  const targetKeys = new Set(targets.map(expansionPositionKey));
  return bfs({
    start: intrusion.position,
    isGoal: (position) => targetKeys.has(expansionPositionKey(position)),
    getNeighbors: (position) => neighbors(state, intrusion.kind, position, targetKeys, allowHardware),
    toKey: expansionPositionKey,
  });
}

function neighbors(state: ExpansionGameState, enemy: ExpansionEnemyKind, position: Readonly<{ x: number; y: number }>, targets: ReadonlySet<string>, allowHardware: boolean) {
  const normal = getExpansionOrthogonalNeighbors(state.grid, position).filter((candidate) => canEnter(state, candidate, targets, allowHardware));
  if (enemy !== "spoof") return normal;
  const jumps = JUMP_DELTAS.map((delta) => ({
    blocker: { x: position.x + delta.x, y: position.y + delta.y },
    landing: { x: position.x + delta.x * 2, y: position.y + delta.y * 2 },
  })).filter(({ blocker, landing }) => isExpansionInBounds(state.grid, blocker) && isExpansionInBounds(state.grid, landing) && isBlocker(state, blocker, targets) && canEnter(state, landing, targets, false)).map(({ landing }) => landing);
  return [...normal, ...jumps];
}

function canEnter(state: ExpansionGameState, position: Readonly<{ x: number; y: number }>, targets: ReadonlySet<string>, allowHardware: boolean): boolean {
  const kind = getExpansionTileKind(state.grid, position);
  if (kind === "void") return false;
  if (targets.has(expansionPositionKey(position))) return true;
  if (kind === "empty" || kind === "corrupted" || kind === "latencyTrap") return true;
  return allowHardware && isExpansionHardwareKind(kind) && getExpansionHardwareCapabilities(kind).chewable;
}

function isBlocker(state: ExpansionGameState, position: Readonly<{ x: number; y: number }>, targets: ReadonlySet<string>): boolean {
  if (targets.has(expansionPositionKey(position))) return false;
  const kind = getExpansionTileKind(state.grid, position);
  return isExpansionHardwareKind(kind) && getExpansionHardwareCapabilities(kind).blocksMovement;
}

function attackHardware(state: ExpansionGameState, grid: ExpansionGridState, events: ExpansionGameState["events"], intrusion: ExpansionIntrusionState, definition: ExpansionEnemyDefinition, position: Readonly<{ x: number; y: number }>, unitKind: ExpansionHardwareKind) {
  const tile = getExpansionTile(grid, position);
  const fallback = state.config.units[unitKind].hp ?? 0;
  const hp = Math.max(0, (tile.hp ?? fallback) - definition.chewDamage);
  if (unitKind === "latencyTrap") return { grid, events };
  const event = { type: "unitDamaged" as const, tick: state.tickCount, intrusionId: intrusion.id, position, unitKind, hp };
  return hp <= 0
    ? { grid: setExpansionTile(grid, position, { kind: "corrupted" }), events: [...events, event, { type: "tileCorrupted" as const, tick: state.tickCount, intrusionId: intrusion.id, position }] }
    : { grid: setExpansionTile(grid, position, { ...tile, hp }), events: [...events, event] };
}

function moveEvent(state: ExpansionGameState, intrusion: ExpansionIntrusionState, to: Readonly<{ x: number; y: number }>) {
  return { type: "intrusionMoved" as const, tick: state.tickCount, intrusionId: intrusion.id, from: intrusion.position, to, jumped: Math.abs(to.x - intrusion.position.x) + Math.abs(to.y - intrusion.position.y) > 1 };
}

function moved(state: ExpansionGameState, intrusion: ExpansionIntrusionState, position: Readonly<{ x: number; y: number }>): ExpansionIntrusionState {
  return { ...intrusion, previousPosition: intrusion.position, position, lastMoveTick: state.tickCount, corruption: null };
}
