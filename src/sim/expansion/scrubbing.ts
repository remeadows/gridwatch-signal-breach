import { getExpansionTile, listExpansionPositions, setExpansionTile } from "./grid";
import type { ExpansionGameState } from "./types";

export function applyExpansionScrubberProgress(state: ExpansionGameState): ExpansionGameState {
  let grid = state.grid;
  let events = state.events;
  for (const position of listExpansionPositions(grid)) {
    const tile = getExpansionTile(grid, position);
    if (tile.kind !== "scrubber") continue;
    const progress = (tile.progress ?? 0) + 1;
    if (progress >= state.config.scrubberCleanseTicks) {
      grid = setExpansionTile(grid, position, { kind: "empty" });
      events = [...events, { type: "tileCleansed", tick: state.tickCount, position }];
    } else {
      grid = setExpansionTile(grid, position, { ...tile, progress });
    }
  }
  return { ...state, grid, events };
}
