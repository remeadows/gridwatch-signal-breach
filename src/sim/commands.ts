import { getTileKind, samePosition, setTile, setTileKind } from "./grid";
import { withRecomputedSignal } from "./state";
import { startActivePhase } from "./waves";
import type { GameState, GridPosition, TileKind, TileState, UnitKind } from "./types";

export type SetTileKindCommand = Readonly<{
  type: "setTileKind";
  position: GridPosition;
  kind: TileKind;
}>;

export type ClearTileCommand = Readonly<{
  type: "clearTile";
  position: GridPosition;
}>;

export type CorruptTileCommand = Readonly<{
  type: "corruptTile";
  position: GridPosition;
}>;

export type PlaceUnitCommand = Readonly<{
  type: "placeUnit";
  position: GridPosition;
  unit: UnitKind;
}>;

export type SellUnitCommand = Readonly<{
  type: "sellUnit";
  position: GridPosition;
}>;

export type SkipPrepCommand = Readonly<{
  type: "skipPrep";
}>;

export type SimCommand =
  | SetTileKindCommand
  | ClearTileCommand
  | CorruptTileCommand
  | PlaceUnitCommand
  | SellUnitCommand
  | SkipPrepCommand;

export function applyCommand(state: GameState, command: SimCommand): GameState {
  switch (command.type) {
    case "setTileKind":
      assertSpecialTilePlacement(state, command.position, command.kind);
      return withRecomputedSignal({
        ...state,
        grid: setTile(state.grid, command.position, createTileForKind(state, command.kind)),
      });

    case "clearTile":
      return withRecomputedSignal({
        ...state,
        grid: setTileKind(state.grid, command.position, "empty"),
      });

    case "corruptTile":
      return withRecomputedSignal({
        ...state,
        grid: setTileKind(state.grid, command.position, "corrupted"),
      });

    case "placeUnit":
      return placeUnit(state, command.position, command.unit);

    case "sellUnit":
      return sellUnit(state, command.position);

    case "skipPrep":
      return startActivePhase(state);
  }
}

function placeUnit(state: GameState, position: GridPosition, unit: UnitKind): GameState {
  if (state.phase === "won" || state.phase === "lost") {
    return state;
  }

  if (isSpecialTile(state, position)) {
    return state;
  }

  if (getTileKind(state.grid, position) !== "empty") {
    return state;
  }

  if (state.intrusions.some((intrusion) => samePosition(intrusion.position, position))) {
    return state;
  }

  const cost = state.config.units[unit].cost;

  if (state.bandwidth < cost) {
    return state;
  }

  return withRecomputedSignal({
    ...state,
    bandwidth: state.bandwidth - cost,
    grid: setTile(state.grid, position, {
      kind: unit,
      hp: state.config.units[unit].hp,
    }),
  });
}

function sellUnit(state: GameState, position: GridPosition): GameState {
  if (state.phase === "won" || state.phase === "lost") {
    return state;
  }

  const kind = getTileKind(state.grid, position);

  if (!isUnitKind(kind)) {
    return state;
  }

  return withRecomputedSignal({
    ...state,
    bandwidth: state.bandwidth + state.config.units[kind].sellRefund,
    grid: setTileKind(state.grid, position, "empty"),
  });
}

function assertSpecialTilePlacement(
  state: GameState,
  position: GridPosition,
  kind: TileKind,
): void {
  const isOnSpecialTile =
    isSpecialTile(state, position);

  if (isOnSpecialTile && kind !== "empty" && kind !== "corrupted") {
    throw new Error("Source and Core tiles cannot hold player unit tile states.");
  }
}

function isSpecialTile(state: GameState, position: GridPosition): boolean {
  return samePosition(position, state.config.source) || samePosition(position, state.config.core);
}

function isUnitKind(kind: TileKind): kind is UnitKind {
  return kind === "relay" || kind === "firewall" || kind === "turret";
}

function createTileForKind(state: GameState, kind: TileKind): TileState {
  if (!isUnitKind(kind)) {
    return { kind };
  }

  return {
    kind,
    hp: state.config.units[kind].hp,
  };
}
