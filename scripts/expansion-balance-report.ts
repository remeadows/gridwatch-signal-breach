import { getExpansionLevelContentHash } from "../src/data/campaigns/expansion/contentManifest";
import { getExpansionLevelDefinition } from "../src/data/campaigns/expansion";
import { applyExpansionCommand } from "../src/sim/expansion/commands";
import { createExpansionGameState } from "../src/sim/expansion/state";
import { tickExpansion } from "../src/sim/expansion/tick";
import { getExpansionTileKind, listExpansionPositions } from "../src/sim/expansion/grid";
import type { ExpansionGameState, ExpansionHardwareKind } from "../src/sim/expansion/types";
import type { GridPosition } from "../src/sim/types";

const PLANS: Readonly<Record<number, Readonly<Record<"turret" | "latencyTrap" | "firewall", readonly GridPosition[]>>>> = {
  1: { turret: [{ x: 1, y: 3 }, { x: 5, y: 3 }, { x: 3, y: 5 }, { x: 5, y: 5 }, { x: 1, y: 5 }], latencyTrap: [{ x: 1, y: 4 }, { x: 3, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 5 }], firewall: [{ x: 2, y: 3 }, { x: 4, y: 5 }] },
  2: { turret: [{ x: 6, y: 1 }, { x: 3, y: 4 }, { x: 1, y: 4 }, { x: 4, y: 1 }, { x: 6, y: 3 }], latencyTrap: [{ x: 1, y: 3 }, { x: 3, y: 5 }, { x: 4, y: 3 }, { x: 6, y: 4 }, { x: 5, y: 1 }], firewall: [{ x: 1, y: 2 }, { x: 5, y: 2 }] },
  3: { turret: [{ x: 2, y: 2 }, { x: 5, y: 3 }, { x: 6, y: 4 }, { x: 4, y: 2 }, { x: 3, y: 1 }], latencyTrap: [{ x: 6, y: 3 }, { x: 5, y: 6 }, { x: 4, y: 4 }, { x: 3, y: 4 }, { x: 1, y: 2 }], firewall: [{ x: 6, y: 2 }, { x: 2, y: 4 }] },
  4: { turret: [{ x: 1, y: 2 }, { x: 6, y: 6 }, { x: 4, y: 2 }, { x: 5, y: 5 }, { x: 3, y: 1 }], latencyTrap: [{ x: 1, y: 1 }, { x: 3, y: 3 }, { x: 5, y: 2 }, { x: 4, y: 5 }, { x: 6, y: 2 }], firewall: [{ x: 1, y: 3 }, { x: 6, y: 4 }] },
  5: { turret: [{ x: 1, y: 2 }, { x: 4, y: 3 }, { x: 6, y: 5 }, { x: 3, y: 2 }, { x: 5, y: 4 }, { x: 2, y: 1 }], latencyTrap: [{ x: 6, y: 4 }, { x: 5, y: 6 }, { x: 4, y: 5 }, { x: 3, y: 4 }, { x: 2, y: 3 }], firewall: [{ x: 6, y: 2 }, { x: 1, y: 3 }] },
};

const rows = [];
for (let levelId = 1; levelId <= 5; levelId += 1) {
  for (const seed of ["alpha", "bravo", "charlie", "delta"]) {
    const state = runGuided(levelId, `chapter1-${levelId}-${seed}`);
    rows.push({ levelId, seed, phase: state.phase, ticks: state.tickCount, integrity: state.coreIntegrity, uptime: Math.round(state.uptimeTicks / Math.max(1, state.uptimeTicks + state.severedTicks) * 100), neutralized: state.neutralizedCount, bandwidth: state.bandwidth });
  }
}
console.table(rows);
const emptyRows = Array.from({ length: 5 }, (_, index) => runEmpty(index + 1));
console.table(emptyRows);
const reportHash = await sha256(JSON.stringify({ rows, emptyRows }));
console.log(`Deterministic report hash: ${reportHash}`);
if (rows.some((row) => row.phase !== "won")) throw new Error("A guided Chapter 1 plan failed a fixed seed.");
if (emptyRows.some((row) => row.phase !== "lost")) throw new Error("An empty-loadout baseline cleared a Chapter 1 level.");
if (reportHash !== "1cf49097f34151cfe0fdae7ba837056753c3d591eb29fc80faed2ca18194fe5b") throw new Error("Chapter 1 fixed balance metrics drifted.");
console.log("Expansion balance gate passed: 20/20 guided clears; 5/5 empty-loadout losses.");

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function runGuided(levelId: number, seed: string): ExpansionGameState {
  let state = createExpansionGameState({ levelId, contentHash: getExpansionLevelContentHash(levelId), seed });
  const plan = PLANS[levelId];
  let ticks = 0;
  while (state.phase !== "won" && state.phase !== "lost" && ticks < 12000) {
    if (state.phase === "prep") {
      state = addOne(state, plan.latencyTrap, "latencyTrap");
      state = addOne(state, plan.turret, "turret");
      state = addOne(state, plan.turret, "turret");
      state = addOne(state, plan.latencyTrap, "latencyTrap");
      state = repairCorruption(state);
      state = rebuildRoute(state, levelId);
      state = applyExpansionCommand(state, { type: "skipPrep" });
    }
    state = repairCorruption(state);
    state = rebuildRoute(state, levelId);
    state = tickExpansion(state);
    ticks += 1;
  }
  return state;
}

function runEmpty(levelId: number) {
  let state = createExpansionGameState({ levelId, contentHash: getExpansionLevelContentHash(levelId), seed: `chapter1-${levelId}-empty` });
  let ticks = 0;
  while (state.phase !== "won" && state.phase !== "lost" && ticks < 12000) {
    if (state.phase === "prep") state = applyExpansionCommand(state, { type: "skipPrep" });
    state = tickExpansion(state);
    ticks += 1;
  }
  return { levelId, phase: state.phase, ticks: state.tickCount, integrity: state.coreIntegrity, neutralized: state.neutralizedCount };
}

function rebuildRoute(state: ExpansionGameState, levelId: number): ExpansionGameState {
  const level = getExpansionLevelDefinition(levelId);
  if (!level || state.bandwidth < state.config.units.relay.cost) return state;
  for (const initial of level.initialTiles) {
    if (initial.kind !== "relay" || getExpansionTileKind(state.grid, initial.position) !== "empty") continue;
    const next = applyExpansionCommand(state, { type: "placeUnit", position: initial.position, unit: "relay" });
    if (next !== state) return next;
  }
  return state;
}

function repairCorruption(state: ExpansionGameState): ExpansionGameState {
  if (!state.config.toolsUnlocked.includes("scrubber") || state.bandwidth < state.config.units.scrubber.cost) return state;
  for (const position of listExpansionPositions(state.grid)) {
    if (getExpansionTileKind(state.grid, position) !== "corrupted") continue;
    const next = applyExpansionCommand(state, { type: "placeUnit", position, unit: "scrubber" });
    if (next !== state) return next;
  }
  return state;
}

function addOne(state: ExpansionGameState, positions: readonly GridPosition[], unit: ExpansionHardwareKind): ExpansionGameState {
  for (const position of positions) {
    if (state.bandwidth < state.config.units[unit].cost) return state;
    const next = applyExpansionCommand(state, { type: "placeUnit", position, unit });
    if (next !== state) return next;
  }
  return state;
}
