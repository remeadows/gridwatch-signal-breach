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
  6: { turret: [{ x: 1, y: 1 }, { x: 6, y: 1 }, { x: 1, y: 6 }, { x: 6, y: 6 }, { x: 3, y: 3 }, { x: 5, y: 5 }, { x: 1, y: 3 }, { x: 6, y: 3 }, { x: 3, y: 5 }, { x: 5, y: 3 }], latencyTrap: [{ x: 0, y: 2 }, { x: 7, y: 2 }, { x: 0, y: 6 }, { x: 7, y: 6 }, { x: 3, y: 0 }, { x: 4, y: 7 }], firewall: [{ x: 4, y: 2 }, { x: 7, y: 4 }, { x: 0, y: 7 }, { x: 4, y: 0 }] },
  7: { turret: [{ x: 0, y: 4 }, { x: 7, y: 1 }, { x: 3, y: 0 }, { x: 7, y: 7 }, { x: 1, y: 6 }, { x: 4, y: 0 }, { x: 7, y: 4 }, { x: 3, y: 6 }, { x: 1, y: 2 }, { x: 6, y: 2 }], latencyTrap: [{ x: 0, y: 3 }, { x: 7, y: 3 }, { x: 1, y: 7 }, { x: 6, y: 0 }, { x: 3, y: 5 }, { x: 5, y: 1 }], firewall: [{ x: 4, y: 6 }, { x: 0, y: 7 }, { x: 7, y: 0 }, { x: 3, y: 7 }] },
  8: { turret: [{ x: 7, y: 4 }, { x: 5, y: 4 }, { x: 3, y: 3 }, { x: 1, y: 3 }, { x: 6, y: 0 }, { x: 3, y: 7 }, { x: 0, y: 3 }, { x: 7, y: 7 }, { x: 4, y: 1 }, { x: 1, y: 5 }], latencyTrap: [{ x: 7, y: 5 }, { x: 5, y: 6 }, { x: 3, y: 6 }, { x: 1, y: 7 }, { x: 6, y: 4 }, { x: 0, y: 2 }], firewall: [{ x: 6, y: 6 }, { x: 7, y: 7 }, { x: 0, y: 0 }, { x: 4, y: 7 }] },
  9: { turret: [{ x: 0, y: 4 }, { x: 7, y: 4 }, { x: 4, y: 7 }, { x: 4, y: 0 }, { x: 1, y: 4 }, { x: 6, y: 4 }, { x: 3, y: 7 }, { x: 7, y: 1 }, { x: 0, y: 1 }, { x: 4, y: 2 }], latencyTrap: [{ x: 0, y: 6 }, { x: 7, y: 6 }, { x: 0, y: 2 }, { x: 7, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 6 }], firewall: [{ x: 3, y: 1 }, { x: 0, y: 0 }, { x: 7, y: 7 }, { x: 1, y: 3 }] },
  10: { turret: [{ x: 0, y: 3 }, { x: 7, y: 4 }, { x: 3, y: 7 }, { x: 4, y: 0 }, { x: 1, y: 4 }, { x: 6, y: 6 }, { x: 3, y: 0 }, { x: 7, y: 2 }, { x: 0, y: 5 }, { x: 5, y: 4 }], latencyTrap: [{ x: 0, y: 2 }, { x: 7, y: 5 }, { x: 2, y: 7 }, { x: 5, y: 0 }, { x: 3, y: 6 }, { x: 6, y: 2 }], firewall: [{ x: 6, y: 3 }, { x: 7, y: 7 }, { x: 0, y: 0 }, { x: 5, y: 6 }] },
};
const CLUSTERED_LEVEL_SIX_PLAN = {
  turret: [{ x: 4, y: 1 }, { x: 3, y: 2 }, { x: 5, y: 2 }, { x: 4, y: 3 }, { x: 3, y: 3 }, { x: 5, y: 3 }, { x: 2, y: 2 }, { x: 6, y: 2 }],
  latencyTrap: [{ x: 4, y: 0 }, { x: 3, y: 0 }, { x: 5, y: 0 }, { x: 2, y: 0 }],
  firewall: [{ x: 4, y: 2 }, { x: 3, y: 3 }, { x: 5, y: 3 }],
} as const;

const chapterOneRows = [];
for (let levelId = 1; levelId <= 5; levelId += 1) {
  for (const seed of ["alpha", "bravo", "charlie", "delta"]) {
    const state = runGuided(levelId, `chapter1-${levelId}-${seed}`);
    chapterOneRows.push({ levelId, seed, phase: state.phase, ticks: state.tickCount, integrity: state.coreIntegrity, uptime: Math.round(state.uptimeTicks / Math.max(1, state.uptimeTicks + state.severedTicks) * 100), neutralized: state.neutralizedCount, bandwidth: state.bandwidth });
  }
}
const chapterOneEmptyRows = Array.from({ length: 5 }, (_, index) => runEmpty(index + 1));
const chapterOneHash = await sha256(JSON.stringify({ rows: chapterOneRows, emptyRows: chapterOneEmptyRows }));
if (chapterOneRows.some((row) => row.phase !== "won")) throw new Error("A guided Chapter 1 plan failed a fixed seed.");
if (chapterOneEmptyRows.some((row) => row.phase !== "lost")) throw new Error("An empty-loadout baseline cleared a Chapter 1 level.");
if (chapterOneHash !== "1cf49097f34151cfe0fdae7ba837056753c3d591eb29fc80faed2ca18194fe5b") throw new Error("Chapter 1 fixed balance metrics drifted.");

const chapterTwoRows = [];
for (let levelId = 6; levelId <= 10; levelId += 1) {
  for (const seed of ["alpha", "bravo", "charlie", "delta"]) {
    const state = runGuided(levelId, `chapter2-${levelId}-${seed}`);
    chapterTwoRows.push({ levelId, seed, phase: state.phase, ticks: state.tickCount, integrity: state.coreIntegrity, uptime: Math.round(state.uptimeTicks / Math.max(1, state.uptimeTicks + state.severedTicks) * 100), neutralized: state.neutralizedCount, bandwidth: state.bandwidth, corruptTiles: listExpansionPositions(state.grid).filter((position) => getExpansionTileKind(state.grid, position) === "corrupted").length, remainingHardware: listExpansionPositions(state.grid).filter((position) => !["empty", "void", "corrupted"].includes(getExpansionTileKind(state.grid, position))).length });
  }
}
const chapterTwoEmptyRows = Array.from({ length: 5 }, (_, index) => runEmpty(index + 6));
const clusteredRows = ["alpha", "bravo", "charlie", "delta"].map((seed) => {
  const state = runGuided(6, `chapter2-6-${seed}`, CLUSTERED_LEVEL_SIX_PLAN);
  return { seed, phase: state.phase, integrity: state.coreIntegrity, uptime: Math.round(state.uptimeTicks / Math.max(1, state.uptimeTicks + state.severedTicks) * 100) };
});
console.table(chapterTwoRows);
console.table(chapterTwoEmptyRows);
console.table(clusteredRows);
const chapterTwoHash = await sha256(JSON.stringify({ rows: chapterTwoRows, emptyRows: chapterTwoEmptyRows, clusteredRows }));
console.log(`Chapter 1 deterministic report hash: ${chapterOneHash}`);
console.log(`Chapter 2 deterministic report hash: ${chapterTwoHash}`);
if (chapterTwoRows.some((row) => row.phase !== "won")) throw new Error("A guided Chapter 2 plan failed a fixed seed.");
if (chapterTwoEmptyRows.some((row) => row.phase !== "lost")) throw new Error("An empty-loadout baseline cleared a Chapter 2 level.");
const spacedLevelSix = chapterTwoRows.filter((row) => row.levelId === 6).reduce((total, row) => total + row.integrity, 0);
const clusteredLevelSix = clusteredRows.reduce((total, row) => total + row.integrity, 0);
if (clusteredLevelSix >= spacedLevelSix - 80) throw new Error("Level 6 clustered counter-negative plan was not materially worse than safe spacing.");
for (let levelId = 6; levelId <= 10; levelId += 1) {
  const integrity = chapterTwoRows.filter((row) => row.levelId === levelId).map((row) => row.integrity).sort((a, b) => a - b);
  const median = (integrity[1]! + integrity[2]!) / 2;
  if (median < 90) throw new Error(`Level ${levelId} median terminal integrity ${median} is below the 90-point safety floor.`);
}
if (chapterTwoHash !== "6c2c3d4a739d8b945bbf44a2ff0c237e65007fe77555533498d6bb21d3fd2690") throw new Error("Chapter 2 fixed balance metrics drifted.");
console.log("Historical deterministic solvability gate passed: Chapter 1 frozen; Chapter 2 20/20 fast-bot clears and 5/5 empty-loadout losses. Clustered comparison is a general-build regression, not isolated spacing evidence.");

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function runGuided(levelId: number, seed: string, planOverride?: Readonly<Record<"turret" | "latencyTrap" | "firewall", readonly GridPosition[]>>): ExpansionGameState {
  let state = createExpansionGameState({ levelId, contentHash: getExpansionLevelContentHash(levelId), seed });
  const plan = planOverride ?? PLANS[levelId];
  let ticks = 0;
  while (state.phase !== "won" && state.phase !== "lost" && ticks < 12000) {
    if (state.phase === "prep") {
      if (levelId >= 6) {
        state = addOne(state, plan.turret, "turret");
        state = addOne(state, plan.turret, "turret");
        state = addOne(state, plan.turret, "turret");
        state = addOne(state, plan.turret, "turret");
        state = addOne(state, plan.firewall, "firewall");
        state = addOne(state, plan.latencyTrap, "latencyTrap");
      } else {
        state = addOne(state, plan.latencyTrap, "latencyTrap");
        state = addOne(state, plan.turret, "turret");
        state = addOne(state, plan.turret, "turret");
        state = addOne(state, plan.latencyTrap, "latencyTrap");
      }
      state = repairCorruption(state);
      state = rebuildRoute(state, levelId);
      state = applyExpansionCommand(state, { type: "skipPrep" });
    }
    if (levelId >= 6) {
      state = addOne(state, plan.turret, "turret");
      state = addOne(state, plan.latencyTrap, "latencyTrap");
      state = addOne(state, plan.firewall, "firewall");
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
