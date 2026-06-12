import { getOrthogonalNeighbors, getPositionsByKind, getTileKind, manhattanDistance } from "./grid";
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
      continue;
    }

    survivingIntrusions.push({
      ...intrusion,
      hp,
    });
  }

  return {
    ...state,
    intrusions: survivingIntrusions,
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
