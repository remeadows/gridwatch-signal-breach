import { getTileKind, positionKey, samePosition, setTileKind } from "./grid";
import type { GameState, GridPosition, GridState, IntrusionState } from "./types";

export function applyIntrusionCorruption(state: GameState): GameState {
  let grid = state.grid;
  let events = state.events;
  const intrusions: IntrusionState[] = [];

  for (const intrusion of state.intrusions) {
    if (!isCorruptiblePosition(state, grid, intrusion.position)) {
      intrusions.push({
        ...intrusion,
        corruption: null,
      });
      continue;
    }

    const requiredTicks = getRequiredCorruptionTicks(state, grid, intrusion);
    const previousContact = intrusion.corruption;
    const isSameContact =
      previousContact !== null &&
      positionKey(previousContact.position) === positionKey(intrusion.position);
    const progressTicks = isSameContact ? previousContact.progressTicks + 1 : 1;

    events = [
      ...events,
      {
        type: "corruptionProgress",
        tick: state.tickCount,
        intrusionId: intrusion.id,
        position: intrusion.position,
        progressTicks,
        requiredTicks,
      },
    ];

    if (progressTicks >= requiredTicks) {
      grid = setTileKind(grid, intrusion.position, "corrupted");
      events = [
        ...events,
        {
          type: "tileCorrupted",
          tick: state.tickCount,
          intrusionId: intrusion.id,
          position: intrusion.position,
        },
      ];
      intrusions.push({
        ...intrusion,
        corruption: null,
      });
      continue;
    }

    intrusions.push({
      ...intrusion,
      corruption: {
        position: intrusion.position,
        progressTicks,
        requiredTicks,
      },
    });
  }

  return {
    ...state,
    grid,
    intrusions,
    events,
  };
}

function isCorruptiblePosition(
  state: GameState,
  grid: GridState,
  position: GridPosition,
): boolean {
  if (getTileKind(grid, position) === "corrupted") {
    return false;
  }

  if (samePosition(position, state.config.source) || samePosition(position, state.config.core)) {
    return false;
  }

  const kind = getTileKind(grid, position);
  return kind === "relay" || kind === "firewall" || kind === "turret";
}

function getRequiredCorruptionTicks(
  state: GameState,
  grid: GridState,
  intrusion: IntrusionState,
): number {
  const definition = state.config.enemies[intrusion.kind];
  const tileKind = getTileKind(grid, intrusion.position);
  const firewallBonus =
    tileKind === "firewall" && intrusion.kind !== "spoof"
      ? state.config.firewallHardeningBonusTicks
      : 0;

  return definition.corruptionTicks + firewallBonus;
}
