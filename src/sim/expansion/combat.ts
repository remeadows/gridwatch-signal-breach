import {
  expansionManhattanDistance,
  getExpansionTile,
  getExpansionPositionsByKind,
  getExpansionTileKind,
  getExpansionOrthogonalNeighbors,
  isExpansionInBounds,
  sameExpansionPosition,
  setExpansionTile,
  sortExpansionPositions,
} from "./grid";
import { isExpansionHardwareKind } from "./capabilities";
import { ARC_ICE_RULES, getShieldLinks, normalIceDamage, selectArcChain } from "./shieldNetwork";
import type { ExpansionGameState, ExpansionGridState, ExpansionIntrusionState, ExpansionSimEvent } from "./types";

export function applyExpansionTurretCombat(state: ExpansionGameState): ExpansionGameState {
  const turrets = getExpansionPositionsByKind(state.grid, "turret");
  const arcTurrets = getExpansionPositionsByKind(state.grid, "arcIce");
  if ((turrets.length === 0 && arcTurrets.length === 0) || state.intrusions.length === 0) return state;
  const hp = new Map(state.intrusions.map((intrusion) => [intrusion.id, intrusion.hp] as const));
  const shieldLinks = getShieldLinks(state.intrusions);
  let events = state.events;

  for (const turret of turrets) {
    const overclocks = getExpansionOrthogonalNeighbors(state.grid, turret).filter((position) => getExpansionTileKind(state.grid, position) === "overclock").length;
    const damage = state.config.turretDamagePerTick + overclocks * state.config.overclockBonusDamage;
    for (const intrusion of state.intrusions) {
      if (expansionManhattanDistance(turret, intrusion.position) > state.config.turretRange) continue;
      const current = hp.get(intrusion.id) ?? intrusion.hp;
      if (current <= 0) continue;
      const effectiveDamage = normalIceDamage(damage, intrusion.id, shieldLinks);
      hp.set(intrusion.id, current - effectiveDamage);
      events = [...events, { type: "turretHit", tick: state.tickCount, turretPosition: turret, targetId: intrusion.id, targetPosition: intrusion.position, damage: effectiveDamage }];
    }
  }

  // Arc selection uses the same start-of-combat snapshot for every emitter.
  // Shields do not attenuate it and Overclock deliberately affects normal ICE only.
  for (const turret of arcTurrets) {
    let origin = turret;
    const chain = selectArcChain(turret, state.intrusions);
    for (const [index, targetId] of chain.entries()) {
      const target = state.intrusions.find((intrusion) => intrusion.id === targetId)!;
      const damage = ARC_ICE_RULES.chainDamage[index];
      hp.set(targetId, (hp.get(targetId) ?? target.hp) - damage);
      events = [...events, { type: "turretHit", weapon: "arcIce", tick: state.tickCount, turretPosition: origin, targetId, targetPosition: target.position, damage }];
      origin = target.position;
    }
  }

  const survivors: ExpansionIntrusionState[] = [];
  let children: ExpansionIntrusionState[] = [];
  let nextIntrusionId = state.nextIntrusionId;
  let spawnedIntrusionCount = state.spawnedIntrusionCount;
  let neutralizedCount = state.neutralizedCount;
  let grid = state.grid;

  for (const intrusion of [...state.intrusions].sort((left, right) => left.id - right.id)) {
    const remaining = hp.get(intrusion.id) ?? intrusion.hp;
    if (remaining > 0) {
      survivors.push({ ...intrusion, hp: remaining });
      continue;
    }
    neutralizedCount += 1;
    events = [...events, { type: "intrusionNeutralized", tick: state.tickCount, intrusionId: intrusion.id, position: intrusion.position }];
    if (intrusion.kind === "sapper") {
      const pulsed = applySapperDeathPulse(state, grid, events, intrusion);
      grid = pulsed.grid;
      events = pulsed.events;
    }
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
    const positions = [intrusion.position, ...getExpansionOrthogonalNeighbors(grid, intrusion.position)]
      .filter((position) => isExpansionInBounds(grid, position))
      .filter((position) => !sameExpansionPosition(position, state.config.source))
      .filter((position) => !sameExpansionPosition(position, state.config.core))
      .filter((position) => ["empty", "corrupted"].includes(getExpansionTileKind(grid, position)))
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

  return { ...state, grid, intrusions: [...survivors, ...children], nextIntrusionId, spawnedIntrusionCount, neutralizedCount, events };
}

function applySapperDeathPulse(
  state: ExpansionGameState,
  initialGrid: ExpansionGridState,
  initialEvents: readonly ExpansionSimEvent[],
  intrusion: ExpansionIntrusionState,
): Readonly<{ grid: ExpansionGridState; events: readonly ExpansionSimEvent[] }> {
  const definition = state.config.enemies.sapper;
  const damage = definition.deathPulseDamage ?? 0;
  const range = definition.deathPulseRange ?? 0;
  if (damage <= 0 || range !== 1) return { grid: initialGrid, events: initialEvents };
  let grid = initialGrid;
  let events = initialEvents;
  let affectedHardware = 0;
  for (const position of sortExpansionPositions(getExpansionOrthogonalNeighbors(grid, intrusion.position))) {
    const tile = getExpansionTileKind(grid, position);
    if (!isExpansionHardwareKind(tile) || tile === "latencyTrap") continue;
    const hardware = state.config.units[tile];
    const current = getExpansionTile(grid, position);
    const hp = Math.max(0, (current?.hp ?? hardware.hp ?? 0) - damage);
    affectedHardware += 1;
    events = [...events, { type: "unitDamaged", tick: state.tickCount, intrusionId: intrusion.id, position, unitKind: tile, hp }];
    grid = hp <= 0 ? setExpansionTile(grid, position, { kind: "empty" }) : setExpansionTile(grid, position, { ...current, kind: tile, hp });
    if (hp <= 0) events = [...events, { type: "hardwareDestroyed", tick: state.tickCount, intrusionId: intrusion.id, position, unitKind: tile, cause: "deathPulse" }];
  }
  events = [...events, { type: "sapperDeathPulse", tick: state.tickCount, intrusionId: intrusion.id, position: intrusion.position, damage, range, affectedHardware }];
  return { grid, events };
}
