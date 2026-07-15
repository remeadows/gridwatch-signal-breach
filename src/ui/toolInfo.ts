import { getTileKind, samePosition } from "../sim/grid";
import type { GameState, PlayerTool, SimCommand, UnitKind } from "../sim";

export type ToolInfo = Readonly<{
  label: string;
  purpose: string;
  description: string;
}>;

export type ToolAvailability = Readonly<{
  enabled: boolean;
  costLabel: string;
  reason: string | null;
}>;

export type CommandFeedback = Readonly<{
  message: string;
  tone: "good" | "bad" | "info";
}>;

export const TOOL_INFO: Readonly<Record<PlayerTool, ToolInfo>> = {
  relay: {
    label: "Relay",
    purpose: "Extend signal",
    description: "Extends the Source-to-Core signal by two tiles.",
  },
  firewall: {
    label: "Firewall",
    purpose: "Block enemies",
    description: "A durable wall that forces intrusions around it or makes them chew through.",
  },
  turret: {
    label: "ICE",
    purpose: "Attack adjacent",
    description: "Automatically attacks intrusions on adjacent tiles.",
  },
  scrubber: {
    label: "Scrubber",
    purpose: "Clean corruption",
    description: "Place directly on corruption to restore the tile over time.",
  },
  overclock: {
    label: "Overclock",
    purpose: "Boost ICE",
    description: "Increases the damage of adjacent ICE turrets.",
  },
  sell: {
    label: "Sell",
    purpose: "Recover BW",
    description: "Removes hardware and returns its listed refund.",
  },
};

export function getToolAvailability(
  state: GameState,
  tool: PlayerTool,
): ToolAvailability {
  if (tool === "sell") {
    const enabled = state.phase !== "won" && state.phase !== "lost";
    return {
      enabled,
      costLabel: "REFUND",
      reason: enabled ? null : "Run complete",
    };
  }

  const cost = state.config.units[tool].cost;

  if (state.phase === "won" || state.phase === "lost") {
    return {
      enabled: false,
      costLabel: `${cost} BW`,
      reason: "Run complete",
    };
  }

  if (tool === "scrubber" && !hasCorruptedTile(state)) {
    return {
      enabled: false,
      costLabel: "WAIT",
      reason: "Scrubber requires a corrupted tile",
    };
  }

  if (state.bandwidth < cost) {
    const shortage = cost - state.bandwidth;
    return {
      enabled: false,
      costLabel: `NEED ${shortage}`,
      reason: `Need ${shortage} more bandwidth`,
    };
  }

  return {
    enabled: true,
    costLabel: `${cost} BW`,
    reason: null,
  };
}

export function getToolReadout(state: GameState, tool: PlayerTool): string {
  const info = TOOL_INFO[tool];
  const availability = getToolAvailability(state, tool);

  return `${info.label} · ${info.purpose} · ${availability.costLabel}`;
}

export function getCommandFeedback(
  before: GameState,
  after: GameState,
  command: SimCommand,
): CommandFeedback | null {
  if (command.type === "placeUnit") {
    if (after !== before) {
      const spent = before.bandwidth - after.bandwidth;
      return {
        message: `${TOOL_INFO[command.unit].label} deployed · -${spent} BW`,
        tone: "good",
      };
    }

    return {
      message: getPlacementFailure(before, command.position, command.unit),
      tone: "bad",
    };
  }

  if (command.type === "sellUnit") {
    if (after !== before) {
      const refund = after.bandwidth - before.bandwidth;
      return {
        message: `Hardware sold · +${refund} BW`,
        tone: "good",
      };
    }

    const kind = getTileKind(before.grid, command.position);
    return {
      message: kind === "scrubber" ? "Scrubber runs until the tile is clean" : "Nothing to sell here",
      tone: "bad",
    };
  }

  return null;
}

function getPlacementFailure(
  state: GameState,
  position: Readonly<{ x: number; y: number }>,
  unit: UnitKind,
): string {
  const cost = state.config.units[unit].cost;

  if (!state.config.toolsUnlocked.includes(unit)) {
    return "Tool locked in this sector";
  }

  if (
    samePosition(position, state.config.source) ||
    samePosition(position, state.config.core)
  ) {
    return "Source and Core tiles are reserved";
  }

  const tileKind = getTileKind(state.grid, position);

  if (unit === "scrubber") {
    if (tileKind !== "corrupted") {
      return "Scrubber requires corruption";
    }
  } else if (tileKind === "void") {
    return "Void tiles cannot hold hardware";
  } else if (tileKind !== "empty") {
    return "Tile occupied";
  }

  if (state.intrusions.some((intrusion) => samePosition(intrusion.position, position))) {
    return "Intrusion occupies this tile";
  }

  if (state.bandwidth < cost) {
    return `Need ${cost - state.bandwidth} more BW`;
  }

  return "Placement blocked";
}

function hasCorruptedTile(state: GameState): boolean {
  return state.grid.tiles.some((tile) => tile.kind === "corrupted");
}
