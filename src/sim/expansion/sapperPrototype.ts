import type { UnitKind, GridPosition } from "../types";
import { bfs } from "../pathing";
import { EXPANSION_1_R1_TUNING } from "../../data/campaigns/expansion/tuning";

/**
 * Expansion-only mechanic proof. This module is intentionally absent from the
 * playable expansion configuration, src/sim/index.ts, and validator bundle.
 */
export const SAPPER_PROTOTYPE = {
  id: "sapper",
  maxHp: 16,
  moveEveryTicks: 2,
  corruptionTicks: 4,
  spawnBatchSize: 1,
  chewDamage: 8,
  coreContactDamage: 2,
  deathPulseDamage: 6,
  deathPulseRange: 1,
  targeting: "firewallThenHardware",
  onDeathSpawn: null,
  specialMovement: null,
} as const;

export const CHAPTER_02_ENEMY_PROTOTYPES = {
  sapper: SAPPER_PROTOTYPE,
} as const;

export type SapperPrototypeHardwareKind = UnitKind;

export type SapperPrototypeHardware = Readonly<{
  kind: SapperPrototypeHardwareKind;
  position: GridPosition;
  hp: number;
}>;

export type SapperPrototypeIntrusion = Readonly<{
  id: number;
  kind: typeof SAPPER_PROTOTYPE.id;
  hp: number;
  maxHp: typeof SAPPER_PROTOTYPE.maxHp;
  position: GridPosition;
  previousPosition: GridPosition;
  lastMoveTick: number;
  moveEveryTicks: typeof SAPPER_PROTOTYPE.moveEveryTicks;
}>;

export type SapperPrototypeTarget = Readonly<{
  kind: SapperPrototypeHardwareKind | "core";
  position: GridPosition;
  path: readonly GridPosition[];
}>;

export type SapperPrototypeEvent =
  | Readonly<{
      type: "sapperMoved";
      tick: number;
      intrusionId: number;
      from: GridPosition;
      to: GridPosition;
      targetKind: SapperPrototypeHardwareKind | "core";
      targetPosition: GridPosition;
    }>
  | Readonly<{
      type: "sapperChewed";
      tick: number;
      intrusionId: number;
      position: GridPosition;
      unitKind: SapperPrototypeHardwareKind;
      damage: number;
      hp: number;
    }>
  | Readonly<{
      type: "sapperHit";
      tick: number;
      intrusionId: number;
      position: GridPosition;
      damage: number;
      hp: number;
    }>
  | Readonly<{
      type: "sapperNeutralized";
      tick: number;
      intrusionId: number;
      position: GridPosition;
    }>
  | Readonly<{
      type: "sapperDeathPulse";
      tick: number;
      intrusionId: number;
      position: GridPosition;
      damage: number;
      range: number;
      affectedHardware: number;
    }>
  | Readonly<{
      type: "hardwarePulseDamaged";
      tick: number;
      intrusionId: number;
      position: GridPosition;
      unitKind: SapperPrototypeHardwareKind;
      damage: number;
      hp: number;
    }>
  | Readonly<{
      type: "hardwareDestroyed";
      tick: number;
      intrusionId: number;
      position: GridPosition;
      unitKind: SapperPrototypeHardwareKind;
      cause: "chew" | "deathPulse";
    }>
  | Readonly<{
      type: "sapperReachedCore";
      tick: number;
      intrusionId: number;
      position: GridPosition;
      damage: number;
    }>;

export type SapperPrototypeState = Readonly<{
  gridSize: number;
  tickCount: number;
  core: GridPosition;
  voidTiles: readonly GridPosition[];
  hardware: readonly SapperPrototypeHardware[];
  iceCoverage: readonly GridPosition[];
  intrusions: readonly SapperPrototypeIntrusion[];
  events: readonly SapperPrototypeEvent[];
  neutralizedCount: number;
  coreDamage: number;
}>;

export function getChapter02EnemyPrototype(
  kind: string,
): typeof SAPPER_PROTOTYPE | undefined {
  return kind === SAPPER_PROTOTYPE.id ? SAPPER_PROTOTYPE : undefined;
}

export function createSapperPrototypeIntrusion(input: Readonly<{
  id: number;
  position: GridPosition;
  lastMoveTick: number;
}>): SapperPrototypeIntrusion {
  if (!Number.isInteger(input.id) || input.id < 1) {
    throw new Error("Sapper prototype intrusion ID must be a positive integer.");
  }

  return {
    id: input.id,
    kind: SAPPER_PROTOTYPE.id,
    hp: SAPPER_PROTOTYPE.maxHp,
    maxHp: SAPPER_PROTOTYPE.maxHp,
    position: input.position,
    previousPosition: input.position,
    lastMoveTick: input.lastMoveTick,
    moveEveryTicks: SAPPER_PROTOTYPE.moveEveryTicks,
  };
}

export function selectSapperPrototypeTarget(
  state: SapperPrototypeState,
  intrusion: SapperPrototypeIntrusion,
): SapperPrototypeTarget | null {
  const firewalls = state.hardware.filter((hardware) => hardware.kind === "firewall");
  const preferred = selectReachableHardware(state, intrusion.position, firewalls);
  if (preferred) return preferred;

  const otherHardware = state.hardware.filter((hardware) => hardware.kind !== "firewall");
  const fallbackHardware = selectReachableHardware(state, intrusion.position, otherHardware);
  if (fallbackHardware) return fallbackHardware;

  const path = findPath(state, intrusion.position, state.core);
  return path ? { kind: "core", position: state.core, path } : null;
}

/** Executes one deterministic prototype tick: movement/chew, then ICE/death pulse. */
export function stepSapperPrototype(state: SapperPrototypeState): SapperPrototypeState {
  assertValidState(state);

  let hardware = [...state.hardware];
  const tickEvents: SapperPrototypeEvent[] = [];
  const afterMovement: SapperPrototypeIntrusion[] = [];
  let coreDamage = state.coreDamage;

  for (const intrusion of [...state.intrusions].sort((a, b) => a.id - b.id)) {
    if (state.tickCount - intrusion.lastMoveTick < intrusion.moveEveryTicks) {
      afterMovement.push({ ...intrusion, previousPosition: intrusion.position });
      continue;
    }

    const workingState = { ...state, hardware };
    const target = selectSapperPrototypeTarget(workingState, intrusion);
    const nextPosition = target?.path[1];

    if (!target || !nextPosition) {
      afterMovement.push({
        ...intrusion,
        previousPosition: intrusion.position,
        lastMoveTick: state.tickCount,
      });
      continue;
    }

    const hardwareIndex = hardware.findIndex((candidate) =>
      samePosition(candidate.position, nextPosition),
    );

    if (hardwareIndex >= 0) {
      const targetHardware = hardware[hardwareIndex];
      if (!targetHardware) throw new Error("Sapper target hardware disappeared.");
      const hp = Math.max(0, targetHardware.hp - SAPPER_PROTOTYPE.chewDamage);
      tickEvents.push({
        type: "sapperChewed",
        tick: state.tickCount,
        intrusionId: intrusion.id,
        position: targetHardware.position,
        unitKind: targetHardware.kind,
        damage: SAPPER_PROTOTYPE.chewDamage,
        hp,
      });
      if (hp === 0) {
        hardware.splice(hardwareIndex, 1);
        tickEvents.push({
          type: "hardwareDestroyed",
          tick: state.tickCount,
          intrusionId: intrusion.id,
          position: targetHardware.position,
          unitKind: targetHardware.kind,
          cause: "chew",
        });
      } else {
        hardware[hardwareIndex] = { ...targetHardware, hp };
      }
      afterMovement.push({
        ...intrusion,
        previousPosition: intrusion.position,
        lastMoveTick: state.tickCount,
      });
      continue;
    }

    tickEvents.push({
      type: "sapperMoved",
      tick: state.tickCount,
      intrusionId: intrusion.id,
      from: intrusion.position,
      to: nextPosition,
      targetKind: target.kind,
      targetPosition: target.position,
    });

    if (target.kind === "core" && samePosition(nextPosition, state.core)) {
      coreDamage += SAPPER_PROTOTYPE.coreContactDamage;
      tickEvents.push({
        type: "sapperReachedCore",
        tick: state.tickCount,
        intrusionId: intrusion.id,
        position: state.core,
        damage: SAPPER_PROTOTYPE.coreContactDamage,
      });
      continue;
    }

    afterMovement.push({
      ...intrusion,
      previousPosition: intrusion.position,
      position: nextPosition,
      lastMoveTick: state.tickCount,
    });
  }

  const survivors: SapperPrototypeIntrusion[] = [];
  let neutralizedCount = state.neutralizedCount;

  for (const intrusion of afterMovement) {
    if (!state.iceCoverage.some((position) => samePosition(position, intrusion.position))) {
      survivors.push(intrusion);
      continue;
    }

    const damage = EXPANSION_1_R1_TUNING.turretDamagePerTick;
    const hp = Math.max(0, intrusion.hp - damage);
    tickEvents.push({
      type: "sapperHit",
      tick: state.tickCount,
      intrusionId: intrusion.id,
      position: intrusion.position,
      damage,
      hp,
    });

    if (hp > 0) {
      survivors.push({ ...intrusion, hp });
      continue;
    }

    neutralizedCount += 1;
    tickEvents.push({
      type: "sapperNeutralized",
      tick: state.tickCount,
      intrusionId: intrusion.id,
      position: intrusion.position,
    });

    const adjacent = hardware
      .filter((candidate) => {
        const distance = manhattan(candidate.position, intrusion.position);
        return distance > 0 && distance <= SAPPER_PROTOTYPE.deathPulseRange;
      })
      .sort(compareHardware);
    tickEvents.push({
      type: "sapperDeathPulse",
      tick: state.tickCount,
      intrusionId: intrusion.id,
      position: intrusion.position,
      damage: SAPPER_PROTOTYPE.deathPulseDamage,
      range: SAPPER_PROTOTYPE.deathPulseRange,
      affectedHardware: adjacent.length,
    });

    for (const targetHardware of adjacent) {
      const index = hardware.findIndex((candidate) =>
        samePosition(candidate.position, targetHardware.position),
      );
      if (index < 0) continue;
      const current = hardware[index];
      if (!current) continue;
      const nextHp = Math.max(0, current.hp - SAPPER_PROTOTYPE.deathPulseDamage);
      tickEvents.push({
        type: "hardwarePulseDamaged",
        tick: state.tickCount,
        intrusionId: intrusion.id,
        position: current.position,
        unitKind: current.kind,
        damage: SAPPER_PROTOTYPE.deathPulseDamage,
        hp: nextHp,
      });
      if (nextHp === 0) {
        hardware.splice(index, 1);
        tickEvents.push({
          type: "hardwareDestroyed",
          tick: state.tickCount,
          intrusionId: intrusion.id,
          position: current.position,
          unitKind: current.kind,
          cause: "deathPulse",
        });
      } else {
        hardware[index] = { ...current, hp: nextHp };
      }
    }
  }

  return {
    ...state,
    tickCount: state.tickCount + 1,
    hardware,
    intrusions: survivors,
    events: [...state.events, ...tickEvents],
    neutralizedCount,
    coreDamage,
  };
}

function selectReachableHardware(
  state: SapperPrototypeState,
  start: GridPosition,
  candidates: readonly SapperPrototypeHardware[],
): SapperPrototypeTarget | null {
  const reachable = candidates.flatMap((candidate) => {
    const path = findPath(state, start, candidate.position);
    return path ? [{ kind: candidate.kind, position: candidate.position, path }] : [];
  });

  return reachable.sort((left, right) =>
    left.path.length - right.path.length ||
    left.position.y - right.position.y ||
    left.position.x - right.position.x,
  )[0] ?? null;
}

function findPath(
  state: SapperPrototypeState,
  start: GridPosition,
  target: GridPosition,
): readonly GridPosition[] | null {
  return bfs({
    start,
    isGoal: (position) => samePosition(position, target),
    getNeighbors: (position) => ORTHOGONAL_DELTAS
      .map((delta) => ({ x: position.x + delta.x, y: position.y + delta.y }))
      .filter((candidate) =>
        isInBounds(state.gridSize, candidate) &&
        !state.voidTiles.some((position) => samePosition(position, candidate)) &&
        (!state.hardware.some((hardware) => samePosition(hardware.position, candidate)) ||
          samePosition(candidate, target)),
      ),
    toKey: positionKey,
  });
}

function assertValidState(state: SapperPrototypeState): void {
  if (!Number.isInteger(state.gridSize) || state.gridSize < 2) {
    throw new Error("Sapper prototype grid size must be an integer of at least two.");
  }
  if (!Number.isInteger(state.tickCount) || state.tickCount < 0) {
    throw new Error("Sapper prototype tick count must be a non-negative integer.");
  }
  if (!Number.isInteger(state.neutralizedCount) || state.neutralizedCount < 0 ||
    !Number.isInteger(state.coreDamage) || state.coreDamage < 0) {
    throw new Error("Sapper prototype counters must be non-negative integers.");
  }
  if (!isInBounds(state.gridSize, state.core)) {
    throw new Error("Sapper prototype Core is out of bounds.");
  }

  const voidPositions = new Set<string>();
  for (const position of state.voidTiles) {
    const key = positionKey(position);
    if (!isInBounds(state.gridSize, position) || voidPositions.has(key) || samePosition(position, state.core)) {
      throw new Error(`Invalid Sapper prototype void tile at ${key}.`);
    }
    voidPositions.add(key);
  }

  for (const position of state.iceCoverage) {
    if (!isInBounds(state.gridSize, position)) {
      throw new Error(`Sapper prototype ICE coverage is out of bounds at ${positionKey(position)}.`);
    }
  }

  const hardwarePositions = new Set<string>();
  for (const hardware of state.hardware) {
    const key = positionKey(hardware.position);
    if (!HARDWARE_KINDS.includes(hardware.kind) ||
      !isInBounds(state.gridSize, hardware.position) || hardwarePositions.has(key) ||
      voidPositions.has(key) || samePosition(hardware.position, state.core) ||
      !Number.isInteger(hardware.hp) || hardware.hp < 1) {
      throw new Error(`Invalid Sapper prototype hardware at ${key}.`);
    }
    hardwarePositions.add(key);
  }

  const intrusionIds = new Set<number>();
  for (const intrusion of state.intrusions) {
    if (
      intrusionIds.has(intrusion.id) ||
      intrusion.kind !== SAPPER_PROTOTYPE.id ||
      intrusion.maxHp !== SAPPER_PROTOTYPE.maxHp ||
      intrusion.moveEveryTicks !== SAPPER_PROTOTYPE.moveEveryTicks ||
      !Number.isInteger(intrusion.hp) ||
      intrusion.hp < 1 ||
      intrusion.hp > intrusion.maxHp ||
      !Number.isInteger(intrusion.lastMoveTick) ||
      !isInBounds(state.gridSize, intrusion.position) ||
      !isInBounds(state.gridSize, intrusion.previousPosition) ||
      voidPositions.has(positionKey(intrusion.position)) ||
      hardwarePositions.has(positionKey(intrusion.position))
    ) {
      throw new Error(`Invalid Sapper prototype intrusion ${intrusion.id}.`);
    }
    intrusionIds.add(intrusion.id);
  }
}

const ORTHOGONAL_DELTAS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
] as const;

const HARDWARE_KINDS: readonly SapperPrototypeHardwareKind[] = [
  "relay",
  "firewall",
  "turret",
  "scrubber",
  "overclock",
];

function isInBounds(gridSize: number, position: GridPosition): boolean {
  return Number.isInteger(position.x) && Number.isInteger(position.y) &&
    position.x >= 0 && position.y >= 0 && position.x < gridSize && position.y < gridSize;
}

function manhattan(left: GridPosition, right: GridPosition): number {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
}

function positionKey(position: GridPosition): string {
  return `${position.x},${position.y}`;
}

function samePosition(left: GridPosition, right: GridPosition): boolean {
  return left.x === right.x && left.y === right.y;
}

function compareHardware(left: SapperPrototypeHardware, right: SapperPrototypeHardware): number {
  return left.position.y - right.position.y || left.position.x - right.position.x;
}
