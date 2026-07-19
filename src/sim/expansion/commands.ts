import {
  getExpansionTileKind,
  isExpansionInBounds,
  isExpansionPerimeter,
  sameExpansionPosition,
  setExpansionTile,
  setExpansionTileKind,
} from "./grid";
import { getOpenExpansionSpawnPositions } from "./intrusions";
import { withRecomputedExpansionSignal } from "./state";
import type {
  ExpansionGameState,
  ExpansionHardwareKind,
  ExpansionSimCommand,
} from "./types";
import { startExpansionActivePhase } from "./waves";

export function applyExpansionCommand(
  state: ExpansionGameState,
  command: ExpansionSimCommand,
): ExpansionGameState {
  switch (command.type) {
    case "placeUnit":
      return placeExpansionUnit(state, command.position, command.unit);
    case "sellUnit":
      return sellExpansionUnit(state, command.position);
    case "skipPrep":
      return startExpansionActivePhase(state);
  }
}

function placeExpansionUnit(
  state: ExpansionGameState,
  position: Readonly<{ x: number; y: number }>,
  unit: ExpansionHardwareKind,
): ExpansionGameState {
  if (state.phase === "won" || state.phase === "lost") return state;
  if (!state.config.toolsUnlocked.includes(unit)) return state;
  if (!isExpansionInBounds(state.grid, position)) return state;
  if (isSpecialPosition(state, position)) return state;
  if (unit === "latencyTrap" && isExpansionPerimeter(state.grid, position)) return state;
  if (wouldCloseRemainingSpawnEdge(state, position)) return state;
  const tileKind = getExpansionTileKind(state.grid, position);
  if (unit === "scrubber" ? tileKind !== "corrupted" : tileKind !== "empty") return state;
  if (state.intrusions.some((intrusion) => sameExpansionPosition(intrusion.position, position))) return state;

  const definition = state.config.units[unit];
  if (state.bandwidth < definition.cost) return state;

  return withRecomputedExpansionSignal({
    ...state,
    bandwidth: state.bandwidth - definition.cost,
    grid: setExpansionTile(state.grid, position, {
      kind: unit,
      ...(definition.hp === null ? {} : { hp: definition.hp }),
      ...(definition.charges === undefined ? {} : { charges: definition.charges }),
      ...(unit === "scrubber" ? { progress: 0 } : {}),
    }),
  });
}

function wouldCloseRemainingSpawnEdge(
  state: ExpansionGameState,
  position: Readonly<{ x: number; y: number }>,
): boolean {
  return state.config.waves.slice(state.waveIndex).some((wave) => {
    const openPositions = getOpenExpansionSpawnPositions(state, wave.spawnEdges);
    return openPositions.length === 1 && sameExpansionPosition(openPositions[0], position);
  });
}

function sellExpansionUnit(
  state: ExpansionGameState,
  position: Readonly<{ x: number; y: number }>,
): ExpansionGameState {
  if (state.phase === "won" || state.phase === "lost") return state;
  if (!isExpansionInBounds(state.grid, position)) return state;
  const kind = getExpansionTileKind(state.grid, position);
  if (!isSellableHardwareKind(kind)) return state;

  const definition = state.config.units[kind];
  const refund = state.phase === "prep" ? definition.cost : definition.sellRefund;
  return withRecomputedExpansionSignal({
    ...state,
    bandwidth: state.bandwidth + refund,
    grid: setExpansionTileKind(state.grid, position, "empty"),
  });
}

function isSpecialPosition(
  state: ExpansionGameState,
  position: Readonly<{ x: number; y: number }>,
): boolean {
  return sameExpansionPosition(position, state.config.source) || sameExpansionPosition(position, state.config.core);
}

function isSellableHardwareKind(value: string): value is ExpansionHardwareKind {
  return value === "relay" || value === "firewall" || value === "turret" || value === "overclock" || value === "latencyTrap";
}
