import type { GridPosition } from "../types";

/**
 * Expansion-only prototype constants. This module is intentionally not exported
 * from src/sim/index.ts or imported by the live game/validator bundle.
 */
export const LATENCY_TRAP_PROTOTYPE = {
  activeSaleRefund: 4,
  charges: 3,
  cost: 10,
  extraMoveDelayTicks: 3,
} as const;

export type LatencyTrapPlacementFailure =
  | "terminal"
  | "locked"
  | "insufficient-bandwidth"
  | "out-of-bounds"
  | "perimeter"
  | "source"
  | "core"
  | "void"
  | "corrupted"
  | "hardware-occupied"
  | "intrusion-occupied";

export type LatencyTrapPlacementInput = Readonly<{
  gridSize: number;
  phase: "prep" | "active" | "won" | "lost";
  unlocked: boolean;
  bandwidth: number;
  position: GridPosition;
  source: GridPosition;
  core: GridPosition;
  tile: "empty" | "void" | "corrupted" | "hardware";
  intrusionPositions: readonly GridPosition[];
}>;

export type LatencyTrapTile = Readonly<{
  position: GridPosition;
  charges: number;
}>;

export type LatencyTrapIntrusion = Readonly<{
  id: number;
  position: GridPosition;
  previousPosition: GridPosition;
  lastMoveTick: number;
  moveEveryTicks: number;
}>;

export type LatencyTrapTriggeredEvent = Readonly<{
  type: "latencyTrapTriggered";
  tick: number;
  intrusionId: number;
  position: GridPosition;
  remainingCharges: number;
  extraMoveDelayTicks: typeof LATENCY_TRAP_PROTOTYPE.extraMoveDelayTicks;
}>;

export type LatencyTrapPrototypeState<
  TIntrusion extends LatencyTrapIntrusion = LatencyTrapIntrusion,
> = Readonly<{
  tickCount: number;
  traps: readonly LatencyTrapTile[];
  intrusions: readonly TIntrusion[];
}>;

type WithLatencyTrapTiming<TIntrusion extends LatencyTrapIntrusion> =
  Omit<TIntrusion, "lastMoveTick"> & Readonly<{ lastMoveTick: number }>;

export type LatencyTrapPrototypeResult<
  TIntrusion extends LatencyTrapIntrusion = LatencyTrapIntrusion,
> = Readonly<{
  traps: readonly LatencyTrapTile[];
  intrusions: readonly WithLatencyTrapTiming<TIntrusion>[];
  events: readonly LatencyTrapTriggeredEvent[];
}>;

export const LATENCY_TRAP_CAPABILITIES = {
  carriesSignal: false,
  blocksMovement: false,
  targetable: false,
  chewable: false,
  corruptible: false,
  traversable: true,
} as const;

export function getLatencyTrapPlacementFailure(
  input: LatencyTrapPlacementInput,
): LatencyTrapPlacementFailure | null {
  if (input.phase === "won" || input.phase === "lost") {
    return "terminal";
  }

  if (!input.unlocked) {
    return "locked";
  }

  if (input.bandwidth < LATENCY_TRAP_PROTOTYPE.cost) {
    return "insufficient-bandwidth";
  }

  if (!isInBounds(input.gridSize, input.position)) {
    return "out-of-bounds";
  }

  if (samePosition(input.position, input.source)) {
    return "source";
  }

  if (samePosition(input.position, input.core)) {
    return "core";
  }

  if (isPerimeter(input.gridSize, input.position)) {
    return "perimeter";
  }

  if (input.tile === "void") {
    return "void";
  }

  if (input.tile === "corrupted") {
    return "corrupted";
  }

  if (input.tile === "hardware") {
    return "hardware-occupied";
  }

  if (input.intrusionPositions.some((position) => samePosition(position, input.position))) {
    return "intrusion-occupied";
  }

  return null;
}

export function getLatencyTrapSaleRefund(phase: "prep" | "active"): number {
  return phase === "prep"
    ? LATENCY_TRAP_PROTOTYPE.cost
    : LATENCY_TRAP_PROTOTYPE.activeSaleRefund;
}

/**
 * Applies only entries that occurred during the current movement step. The
 * caller owns movement/pathing; this helper keeps latency state and ordering
 * deterministic without introducing a browser timer or global enemy modifier.
 */
export function applyLatencyTrapEntries<TIntrusion extends LatencyTrapIntrusion>(
  state: LatencyTrapPrototypeState<TIntrusion>,
): LatencyTrapPrototypeResult<TIntrusion> {
  const chargesByPosition = new Map<string, number>();

  for (const trap of state.traps) {
    assertValidTrap(trap);
    const key = positionKey(trap.position);

    if (chargesByPosition.has(key)) {
      throw new Error(`Duplicate latency trap at ${key}.`);
    }

    chargesByPosition.set(key, trap.charges);
  }

  const nextIntrusions = new Map<number, WithLatencyTrapTiming<TIntrusion>>();
  const events: LatencyTrapTriggeredEvent[] = [];

  for (const intrusion of [...state.intrusions].sort((a, b) => a.id - b.id)) {
    assertValidIntrusion(intrusion);

    if (nextIntrusions.has(intrusion.id)) {
      throw new Error(`Duplicate latency-trap intrusion ID ${intrusion.id}.`);
    }

    const key = positionKey(intrusion.position);
    const charges = chargesByPosition.get(key);

    if (charges === undefined || charges <= 0 || samePosition(intrusion.position, intrusion.previousPosition)) {
      nextIntrusions.set(intrusion.id, intrusion);
      continue;
    }

    const remainingCharges = charges - 1;
    chargesByPosition.set(key, remainingCharges);
    nextIntrusions.set(intrusion.id, {
      ...intrusion,
      lastMoveTick: state.tickCount + LATENCY_TRAP_PROTOTYPE.extraMoveDelayTicks,
    });
    events.push({
      type: "latencyTrapTriggered",
      tick: state.tickCount,
      intrusionId: intrusion.id,
      position: intrusion.position,
      remainingCharges,
      extraMoveDelayTicks: LATENCY_TRAP_PROTOTYPE.extraMoveDelayTicks,
    });
  }

  return {
    traps: state.traps.flatMap((trap) => {
      const charges = chargesByPosition.get(positionKey(trap.position));

      return charges && charges > 0 ? [{ ...trap, charges }] : [];
    }),
    intrusions: state.intrusions.map((intrusion) => {
      const updated = nextIntrusions.get(intrusion.id);

      if (!updated) {
        throw new Error(`Missing latency-trap intrusion ${intrusion.id}.`);
      }

      return updated;
    }),
    events,
  };
}

export function getNextEligibleMoveTick(intrusion: LatencyTrapIntrusion): number {
  return intrusion.lastMoveTick + intrusion.moveEveryTicks;
}

function assertValidTrap(trap: LatencyTrapTile): void {
  if (!Number.isInteger(trap.charges) || trap.charges < 1 || trap.charges > LATENCY_TRAP_PROTOTYPE.charges) {
    throw new Error(`Invalid latency trap charges at ${positionKey(trap.position)}.`);
  }
}

function assertValidIntrusion(intrusion: LatencyTrapIntrusion): void {
  if (!Number.isInteger(intrusion.id) || intrusion.id < 1) {
    throw new Error("Latency-trap intrusion ID must be a positive integer.");
  }

  if (!Number.isInteger(intrusion.moveEveryTicks) || intrusion.moveEveryTicks < 1) {
    throw new Error(`Invalid move cadence for intrusion ${intrusion.id}.`);
  }
}

function isInBounds(gridSize: number, position: GridPosition): boolean {
  return (
    Number.isInteger(gridSize) &&
    gridSize > 0 &&
    Number.isInteger(position.x) &&
    Number.isInteger(position.y) &&
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < gridSize &&
    position.y < gridSize
  );
}

function isPerimeter(gridSize: number, position: GridPosition): boolean {
  return (
    position.x === 0 ||
    position.y === 0 ||
    position.x === gridSize - 1 ||
    position.y === gridSize - 1
  );
}

function samePosition(a: GridPosition, b: GridPosition): boolean {
  return a.x === b.x && a.y === b.y;
}

function positionKey(position: GridPosition): string {
  return `${position.x},${position.y}`;
}
