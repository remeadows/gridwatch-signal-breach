import { getExpansionHardwareCapabilities, isExpansionHardwareKind } from "./capabilities";
import { expansionPositionKey, getExpansionTileKind, sameExpansionPosition, setExpansionTileKind } from "./grid";
import type { ExpansionGameState, ExpansionIntrusionState } from "./types";

export function applyExpansionCorruption(state: ExpansionGameState): ExpansionGameState {
  let grid = state.grid;
  let events = state.events;
  const intrusions: ExpansionIntrusionState[] = [];

  for (const intrusion of state.intrusions) {
    const kind = getExpansionTileKind(grid, intrusion.position);
    const corruptible = !sameExpansionPosition(intrusion.position, state.config.source) &&
      !sameExpansionPosition(intrusion.position, state.config.core) &&
      isExpansionHardwareKind(kind) && getExpansionHardwareCapabilities(kind).corruptible;
    if (!corruptible) {
      intrusions.push({ ...intrusion, corruption: null });
      continue;
    }
    const previous = intrusion.corruption;
    const progressTicks = previous && expansionPositionKey(previous.position) === expansionPositionKey(intrusion.position) ? previous.progressTicks + 1 : 1;
    const requiredTicks = state.config.enemies[intrusion.kind].corruptionTicks;
    events = [...events, { type: "corruptionProgress", tick: state.tickCount, intrusionId: intrusion.id, position: intrusion.position, progressTicks, requiredTicks }];
    if (progressTicks >= requiredTicks) {
      grid = setExpansionTileKind(grid, intrusion.position, "corrupted");
      events = [...events, { type: "tileCorrupted", tick: state.tickCount, intrusionId: intrusion.id, position: intrusion.position }];
      intrusions.push({ ...intrusion, corruption: null });
    } else {
      intrusions.push({ ...intrusion, corruption: { position: intrusion.position, progressTicks, requiredTicks } });
    }
  }
  return { ...state, grid, intrusions, events };
}
