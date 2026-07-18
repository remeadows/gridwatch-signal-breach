import { UNIT_TUNING } from "../../data/units";
import type { GridPosition } from "../types";
import {
  applyLatencyTrapEntries,
  getNextEligibleMoveTick,
  type LatencyTrapTile,
  type LatencyTrapTriggeredEvent,
} from "./latencyTrapPrototype";

/**
 * Expansion-only prototype data. This module is intentionally absent from
 * src/sim/index.ts and therefore from the live game and validator bundle.
 */
export const RUSHER_PROTOTYPE = {
  id: "rusher",
  maxHp: 6,
  moveEveryTicks: 1,
  corruptionTicks: 6,
  spawnBatchSize: 1,
  chewDamage: 1,
  coreContactDamage: 1,
  targeting: "route",
  onDeathSpawn: null,
  specialMovement: null,
} as const;

export const EXPANSION_ENEMY_PROTOTYPES = {
  rusher: RUSHER_PROTOTYPE,
} as const;

export type ExpansionEnemyPrototypeKind = keyof typeof EXPANSION_ENEMY_PROTOTYPES;

export type RusherPrototypeIntrusion = Readonly<{
  id: number;
  kind: typeof RUSHER_PROTOTYPE.id;
  hp: number;
  maxHp: typeof RUSHER_PROTOTYPE.maxHp;
  position: GridPosition;
  previousPosition: GridPosition;
  routeIndex: number;
  lastMoveTick: number;
  moveEveryTicks: typeof RUSHER_PROTOTYPE.moveEveryTicks;
}>;

export type RusherPrototypeFirewall = Readonly<{
  position: GridPosition;
  hp: number;
}>;

export type RusherPrototypeEvent =
  | Readonly<{
      type: "rusherMoved";
      tick: number;
      intrusionId: number;
      from: GridPosition;
      to: GridPosition;
    }>
  | LatencyTrapTriggeredEvent
  | Readonly<{
      type: "rusherHit";
      tick: number;
      intrusionId: number;
      position: GridPosition;
      damage: number;
      hp: number;
    }>
  | Readonly<{
      type: "rusherNeutralized";
      tick: number;
      intrusionId: number;
      position: GridPosition;
    }>
  | Readonly<{
      type: "firewallDamaged";
      tick: number;
      intrusionId: number;
      position: GridPosition;
      damage: number;
      hp: number;
    }>;

export type RusherPrototypeState = Readonly<{
  tickCount: number;
  route: readonly GridPosition[];
  traps: readonly LatencyTrapTile[];
  iceCoverage: readonly GridPosition[];
  firewall: RusherPrototypeFirewall | null;
  intrusions: readonly RusherPrototypeIntrusion[];
  events: readonly RusherPrototypeEvent[];
  neutralizedCount: number;
}>;

export function getExpansionEnemyPrototype(kind: string): typeof RUSHER_PROTOTYPE | undefined {
  return kind === RUSHER_PROTOTYPE.id ? RUSHER_PROTOTYPE : undefined;
}

export function createRusherPrototypeIntrusion(input: Readonly<{
  id: number;
  route: readonly GridPosition[];
  routeIndex?: number;
  lastMoveTick: number;
}>): RusherPrototypeIntrusion {
  const routeIndex = input.routeIndex ?? 0;
  const position = input.route[routeIndex];

  if (!position) {
    throw new Error("Rusher prototype route index is out of bounds.");
  }

  if (!Number.isInteger(input.id) || input.id < 1) {
    throw new Error("Rusher prototype intrusion ID must be a positive integer.");
  }

  return {
    id: input.id,
    kind: RUSHER_PROTOTYPE.id,
    hp: RUSHER_PROTOTYPE.maxHp,
    maxHp: RUSHER_PROTOTYPE.maxHp,
    position,
    previousPosition: position,
    routeIndex,
    lastMoveTick: input.lastMoveTick,
    moveEveryTicks: RUSHER_PROTOTYPE.moveEveryTicks,
  };
}

/**
 * Executes one active expansion prototype tick in the approved order:
 * movement/chew -> Latency Trap entry -> ICE combat.
 */
export function stepRusherPrototype(state: RusherPrototypeState): RusherPrototypeState {
  assertValidState(state);

  let firewall = state.firewall;
  const movementEvents: RusherPrototypeEvent[] = [];
  const movedIntrusions: RusherPrototypeIntrusion[] = [];

  for (const intrusion of state.intrusions) {
    if (getNextEligibleMoveTick(intrusion) > state.tickCount) {
      movedIntrusions.push({
        ...intrusion,
        previousPosition: intrusion.position,
      });
      continue;
    }

    const nextPosition = state.route[intrusion.routeIndex + 1];

    if (!nextPosition) {
      movedIntrusions.push({
        ...intrusion,
        previousPosition: intrusion.position,
        lastMoveTick: state.tickCount,
      });
      continue;
    }

    if (firewall && samePosition(firewall.position, nextPosition)) {
      const hp = Math.max(0, firewall.hp - RUSHER_PROTOTYPE.chewDamage);
      movementEvents.push({
        type: "firewallDamaged",
        tick: state.tickCount,
        intrusionId: intrusion.id,
        position: firewall.position,
        damage: RUSHER_PROTOTYPE.chewDamage,
        hp,
      });
      firewall = hp > 0 ? { ...firewall, hp } : null;
      movedIntrusions.push({
        ...intrusion,
        previousPosition: intrusion.position,
        lastMoveTick: state.tickCount,
      });
      continue;
    }

    movementEvents.push({
      type: "rusherMoved",
      tick: state.tickCount,
      intrusionId: intrusion.id,
      from: intrusion.position,
      to: nextPosition,
    });
    movedIntrusions.push({
      ...intrusion,
      position: nextPosition,
      previousPosition: intrusion.position,
      routeIndex: intrusion.routeIndex + 1,
      lastMoveTick: state.tickCount,
    });
  }

  const trapped = applyLatencyTrapEntries({
    tickCount: state.tickCount,
    traps: state.traps,
    intrusions: movedIntrusions,
  });
  const combatEvents: RusherPrototypeEvent[] = [];
  const survivingIntrusions: RusherPrototypeIntrusion[] = [];
  let neutralizedCount = state.neutralizedCount;

  for (const intrusion of trapped.intrusions) {
    if (!state.iceCoverage.some((position) => samePosition(position, intrusion.position))) {
      survivingIntrusions.push(intrusion);
      continue;
    }

    const damage = UNIT_TUNING.turret.damagePerTick;
    const hp = Math.max(0, intrusion.hp - damage);
    combatEvents.push({
      type: "rusherHit",
      tick: state.tickCount,
      intrusionId: intrusion.id,
      position: intrusion.position,
      damage,
      hp,
    });

    if (hp === 0) {
      combatEvents.push({
        type: "rusherNeutralized",
        tick: state.tickCount,
        intrusionId: intrusion.id,
        position: intrusion.position,
      });
      neutralizedCount += 1;
      continue;
    }

    survivingIntrusions.push({ ...intrusion, hp });
  }

  return {
    ...state,
    tickCount: state.tickCount + 1,
    traps: trapped.traps,
    firewall,
    intrusions: survivingIntrusions,
    events: [...movementEvents, ...trapped.events, ...combatEvents],
    neutralizedCount,
  };
}

function assertValidState(state: RusherPrototypeState): void {
  if (!Number.isInteger(state.tickCount) || state.tickCount < 0) {
    throw new Error("Rusher prototype tick count must be a non-negative integer.");
  }

  if (state.route.length === 0) {
    throw new Error("Rusher prototype route cannot be empty.");
  }

  const ids = new Set<number>();

  for (const intrusion of state.intrusions) {
    const routePosition = state.route[intrusion.routeIndex];

    if (ids.has(intrusion.id)) {
      throw new Error(`Duplicate Rusher prototype intrusion ID ${intrusion.id}.`);
    }
    ids.add(intrusion.id);

    if (
      intrusion.kind !== RUSHER_PROTOTYPE.id ||
      intrusion.maxHp !== RUSHER_PROTOTYPE.maxHp ||
      intrusion.moveEveryTicks !== RUSHER_PROTOTYPE.moveEveryTicks ||
      !Number.isInteger(intrusion.hp) ||
      intrusion.hp < 1 ||
      intrusion.hp > intrusion.maxHp ||
      !Number.isInteger(intrusion.routeIndex) ||
      !Number.isInteger(intrusion.lastMoveTick) ||
      !routePosition ||
      !samePosition(routePosition, intrusion.position)
    ) {
      throw new Error(`Invalid Rusher prototype intrusion ${intrusion.id}.`);
    }
  }

  if (state.firewall && (!Number.isInteger(state.firewall.hp) || state.firewall.hp < 1)) {
    throw new Error("Rusher prototype Firewall must have positive integer HP.");
  }
}

function samePosition(left: GridPosition, right: GridPosition): boolean {
  return left.x === right.x && left.y === right.y;
}
