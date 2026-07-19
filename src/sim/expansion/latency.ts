import { getExpansionTile, listExpansionPositions, setExpansionTile, setExpansionTileKind } from "./grid";
import type { ExpansionGameState } from "./types";

export function applyExpansionLatencyTraps(state: ExpansionGameState): ExpansionGameState {
  let grid = state.grid;
  let intrusions = [...state.intrusions];
  let events = state.events;

  for (const position of listExpansionPositions(grid)) {
    const tile = getExpansionTile(grid, position);
    if (tile.kind !== "latencyTrap") continue;

    let charges = tile.charges ?? state.config.units.latencyTrap.charges ?? 0;
    const entrants = intrusions
      .filter((intrusion) => intrusion.position.x === position.x && intrusion.position.y === position.y)
      .filter((intrusion) => intrusion.previousPosition.x !== position.x || intrusion.previousPosition.y !== position.y)
      .sort((a, b) => a.id - b.id);

    for (const entrant of entrants) {
      if (charges <= 0) break;
      charges -= 1;
      const extraMoveDelayTicks = state.config.units.latencyTrap.extraMoveDelayTicks ?? 0;
      intrusions = intrusions.map((intrusion) => intrusion.id === entrant.id
        ? { ...intrusion, lastMoveTick: state.tickCount + extraMoveDelayTicks }
        : intrusion);
      events = [...events, {
        type: "latencyTrapTriggered",
        tick: state.tickCount,
        intrusionId: entrant.id,
        position,
        remainingCharges: charges,
        extraMoveDelayTicks,
      }];
    }

    grid = charges > 0
      ? setExpansionTile(grid, position, { ...tile, charges })
      : setExpansionTileKind(grid, position, "empty");
  }

  return { ...state, grid, intrusions, events };
}
