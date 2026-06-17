import { getTile, listPositions, setTile } from "./grid";
import type { GameState } from "./types";

export function applyScrubberProgress(state: GameState): GameState {
  let grid = state.grid;
  let events = state.events;

  for (const position of listPositions(grid)) {
    const tile = getTile(grid, position);

    if (tile.kind !== "scrubber") {
      continue;
    }

    const progress = (tile.progress ?? 0) + 1;

    if (progress >= state.config.scrubberCleanseTicks) {
      grid = setTile(grid, position, { kind: "empty" });
      events = [
        ...events,
        {
          type: "tileCleansed",
          tick: state.tickCount,
          position,
        },
      ];
      continue;
    }

    grid = setTile(grid, position, {
      ...tile,
      progress,
    });
  }

  return {
    ...state,
    grid,
    events,
  };
}
