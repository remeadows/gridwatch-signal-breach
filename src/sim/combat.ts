import {
  getOrthogonalNeighbors,
  getPositionsByKind,
  getTileKind,
  isInBounds,
  manhattanDistance,
  samePosition,
} from "./grid";
import type { GameState, IntrusionState } from "./types";

export function applyTurretCombat(state: GameState): GameState {
  if (state.config.turretDamagePerTick <= 0 || state.config.turretRange <= 0) {
    return state;
  }

  const turrets = getPositionsByKind(state.grid, "turret");

  if (turrets.length === 0 || state.intrusions.length === 0) {
    return state;
  }

  const hpById = new Map(
    state.intrusions.map((intrusion) => [intrusion.id, intrusion.hp] as const),
  );
  let events = state.events;

  for (const turretPosition of turrets) {
    const damage = getTurretDamage(state, turretPosition);

    for (const intrusion of state.intrusions) {
      if (manhattanDistance(turretPosition, intrusion.position) > state.config.turretRange) {
        continue;
      }

      const currentHp = hpById.get(intrusion.id) ?? intrusion.hp;

      if (currentHp <= 0) {
        continue;
      }

      hpById.set(intrusion.id, currentHp - damage);
      events = [
        ...events,
        {
          type: "turretHit",
          tick: state.tickCount,
          turretPosition,
          targetId: intrusion.id,
          targetPosition: intrusion.position,
          damage,
        },
      ];
    }
  }

  const survivingIntrusions: IntrusionState[] = [];
  let neutralizedCount = state.neutralizedCount;
  let nextIntrusionId = state.nextIntrusionId;
  let spawnedIntrusionCount = state.spawnedIntrusionCount;
  let splitChildren: IntrusionState[] = [];

  for (const intrusion of state.intrusions) {
    const hp = hpById.get(intrusion.id) ?? intrusion.hp;

    if (hp <= 0) {
      neutralizedCount += 1;
      events = [
        ...events,
        {
          type: "intrusionNeutralized",
          tick: state.tickCount,
          intrusionId: intrusion.id,
          position: intrusion.position,
        },
      ];

      const split = createSplitChildren(state, intrusion, nextIntrusionId, splitChildren);

      if (split.children.length > 0) {
        nextIntrusionId += split.children.length;
        spawnedIntrusionCount += split.children.length;
        splitChildren = [...splitChildren, ...split.children];
        events = [
          ...events,
          {
            type: "intrusionSplit",
            tick: state.tickCount,
            parentId: intrusion.id,
            childIds: split.children.map((child) => child.id),
            position: intrusion.position,
          },
          ...split.children.map((child) => ({
            type: "intrusionSpawned" as const,
            tick: state.tickCount,
            intrusionId: child.id,
            kind: child.kind,
            position: child.position,
          })),
        ];
      }

      continue;
    }

    survivingIntrusions.push({
      ...intrusion,
      hp,
    });
  }

  return {
    ...state,
    intrusions: [...survivingIntrusions, ...splitChildren],
    nextIntrusionId,
    spawnedIntrusionCount,
    neutralizedCount,
    events,
  };
}

function getTurretDamage(state: GameState, turretPosition: Readonly<{ x: number; y: number }>): number {
  const adjacentOverclocks = getOrthogonalNeighbors(state.grid, turretPosition).filter(
    (position) => getTileKind(state.grid, position) === "overclock",
  ).length;

  return state.config.turretDamagePerTick +
    adjacentOverclocks * state.config.overclockBonusDamage;
}

function createSplitChildren(
  state: GameState,
  intrusion: IntrusionState,
  nextIntrusionId: number,
  existingSplitChildren: readonly IntrusionState[],
): Readonly<{
  children: readonly IntrusionState[];
}> {
  const spawn = state.config.enemies[intrusion.kind].onDeathSpawn;

  if (!spawn) {
    return {
      children: [],
    };
  }

  const definition = state.config.enemies[spawn.kind];
  const occupiedIntrusions = [
    ...state.intrusions.filter((candidate) => candidate.id !== intrusion.id),
    ...existingSplitChildren,
  ];
  const positions = getSplitSpawnCandidates(intrusion.position)
    .filter((position) => isInBounds(state.grid, position))
    .filter((position) => {
      const kind = getTileKind(state.grid, position);
      return kind === "empty" || kind === "corrupted";
    })
    .filter((position) =>
      !occupiedIntrusions.some((occupied) => samePosition(occupied.position, position)),
    )
    .slice(0, spawn.count);

  return {
    children: positions.map((position, index) => ({
      id: nextIntrusionId + index,
      kind: spawn.kind,
      hp: definition.maxHp,
      maxHp: definition.maxHp,
      position,
      previousPosition: position,
      spawnedTick: state.tickCount,
      lastMoveTick: state.tickCount,
      corruption: null,
    })),
  };
}

function getSplitSpawnCandidates(position: Readonly<{ x: number; y: number }>): readonly Readonly<{
  x: number;
  y: number;
}>[] {
  return [
    position,
    { x: position.x, y: position.y - 1 },
    { x: position.x + 1, y: position.y },
    { x: position.x, y: position.y + 1 },
    { x: position.x - 1, y: position.y },
  ];
}
