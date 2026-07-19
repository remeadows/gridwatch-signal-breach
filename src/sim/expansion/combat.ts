import {
  expansionManhattanDistance,
  getExpansionPositionsByKind,
  getExpansionTileKind,
  getExpansionOrthogonalNeighbors,
  isExpansionInBounds,
  sameExpansionPosition,
} from "./grid";
import type { ExpansionGameState, ExpansionIntrusionState } from "./types";

export function applyExpansionTurretCombat(state: ExpansionGameState): ExpansionGameState {
  const turrets = getExpansionPositionsByKind(state.grid, "turret");
  if (turrets.length === 0 || state.intrusions.length === 0) return state;
  const hp = new Map(state.intrusions.map((intrusion) => [intrusion.id, intrusion.hp] as const));
  let events = state.events;

  for (const turret of turrets) {
    const overclocks = getExpansionOrthogonalNeighbors(state.grid, turret).filter((position) => getExpansionTileKind(state.grid, position) === "overclock").length;
    const damage = state.config.turretDamagePerTick + overclocks * state.config.overclockBonusDamage;
    for (const intrusion of state.intrusions) {
      if (expansionManhattanDistance(turret, intrusion.position) > state.config.turretRange) continue;
      const current = hp.get(intrusion.id) ?? intrusion.hp;
      if (current <= 0) continue;
      hp.set(intrusion.id, current - damage);
      events = [...events, { type: "turretHit", tick: state.tickCount, turretPosition: turret, targetId: intrusion.id, targetPosition: intrusion.position, damage }];
    }
  }

  const survivors: ExpansionIntrusionState[] = [];
  let children: ExpansionIntrusionState[] = [];
  let nextIntrusionId = state.nextIntrusionId;
  let spawnedIntrusionCount = state.spawnedIntrusionCount;
  let neutralizedCount = state.neutralizedCount;

  for (const intrusion of state.intrusions) {
    const remaining = hp.get(intrusion.id) ?? intrusion.hp;
    if (remaining > 0) {
      survivors.push({ ...intrusion, hp: remaining });
      continue;
    }
    neutralizedCount += 1;
    events = [...events, { type: "intrusionNeutralized", tick: state.tickCount, intrusionId: intrusion.id, position: intrusion.position }];
    const spawn = state.config.enemies[intrusion.kind].onDeathSpawn;
    if (!spawn) continue;
    const definition = state.config.enemies[spawn.kind];
    const occupied = [
      ...state.intrusions.filter(
        (candidate) =>
          candidate.id !== intrusion.id &&
          (hp.get(candidate.id) ?? candidate.hp) > 0,
      ),
      ...children,
    ];
    const positions = [intrusion.position, ...getExpansionOrthogonalNeighbors(state.grid, intrusion.position)]
      .filter((position) => isExpansionInBounds(state.grid, position))
      .filter((position) => !sameExpansionPosition(position, state.config.source))
      .filter((position) => !sameExpansionPosition(position, state.config.core))
      .filter((position) => ["empty", "corrupted"].includes(getExpansionTileKind(state.grid, position)))
      .filter((position) => !occupied.some((candidate) => sameExpansionPosition(candidate.position, position)))
      .slice(0, spawn.count);
    const newChildren = positions.map((position, index): ExpansionIntrusionState => ({
      id: nextIntrusionId + index,
      kind: spawn.kind,
      hp: definition.maxHp,
      maxHp: definition.maxHp,
      position,
      previousPosition: position,
      spawnedTick: state.tickCount,
      lastMoveTick: state.tickCount,
      corruption: null,
    }));
    nextIntrusionId += newChildren.length;
    spawnedIntrusionCount += newChildren.length;
    children = [...children, ...newChildren];
    if (newChildren.length > 0) {
      events = [...events,
        { type: "intrusionSplit", tick: state.tickCount, parentId: intrusion.id, childIds: newChildren.map((child) => child.id), position: intrusion.position },
        ...newChildren.map((child) => ({ type: "intrusionSpawned" as const, tick: state.tickCount, intrusionId: child.id, kind: child.kind, position: child.position })),
      ];
    }
  }

  return { ...state, intrusions: [...survivors, ...children], nextIntrusionId, spawnedIntrusionCount, neutralizedCount, events };
}
