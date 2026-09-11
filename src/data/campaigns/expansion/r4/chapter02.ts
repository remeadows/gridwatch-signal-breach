import type { ExpansionLevelDefinition } from "../../../../sim/expansion/types";
import { CHAPTER_02_LEVELS } from "../chapter02";
import { LATENCY_TOOLS, points, retainDesign, tiles, waves } from "./authoring";

export const R4_CHAPTER_02_LEVELS: readonly ExpansionLevelDefinition[] = [
  ...CHAPTER_02_LEVELS.map((level) => retainDesign(level, level.id + 3)),
  {
    id: 14, chapterId: 2, codename: "BLAST DOORS", tagline: "Leave room for the blast.",
    briefing: "Two staggered shelves create exposed firing pockets. Put bait on the outer doors and leave empty tiles between the target and the relay turns.",
    gridSize: 8, source: { x: 0, y: 5 }, core: { x: 7, y: 2 },
    voidTiles: points([[2, 1], [3, 1], [4, 6], [5, 6], [2, 6], [5, 1]]),
    initialTiles: [...tiles("relay", [[1, 4], [3, 4], [4, 3], [6, 3]]), ...tiles("turret", [[1, 2], [5, 4], [6, 1]]), ...tiles("firewall", [[3, 6]])],
    toolsUnlocked: LATENCY_TOOLS, difficultyIndex: 1400, requiredMechanic: "sapperSpacing",
    waves: waves([
      { label: "Door Charge", briefing: "Sappers mark the southern bait first. Protect the upper turn.", grant: 212, count: 22, active: 7, cadence: 6, weights: { sapper: 10, rusher: 5, hunter: 3 }, edges: ["south", "east"] },
      { label: "Pressure Seal", briefing: "Hunters can ignore the bait. Keep ICE coverage on the route.", grant: 168, count: 28, active: 9, cadence: 5, weights: { sapper: 11, hunter: 4, crawler: 3, rusher: 5 } },
      { label: "Hinge Failure", briefing: "Replace bait in open pockets, never beside a damaged relay.", grant: 172, count: 34, active: 10, cadence: 4, weights: { sapper: 12, splitter: 4, spoof: 3, rusher: 6 } },
      { label: "Heavy Door", briefing: "A Goliath screens the next demolition wave.", grant: 176, count: 40, active: 12, cadence: 4, weights: { sapper: 13, hunter: 4, crawler: 4, rusher: 6 }, scripts: [{ waveTick: 8, kind: "goliath" }] },
      { label: "Blast Doors", briefing: "Keep the outer targets separated from the signal chain.", grant: 184, count: 46, active: 13, cadence: 3, weights: { sapper: 14, hunter: 4, splitter: 4, rusher: 7 }, scripts: [{ waveTick: 8, kind: "goliath" }, { waveTick: 30, kind: "goliath" }] },
    ]),
  },
  {
    id: 15, chapterId: 2, codename: "CIRCUIT BREAKER", tagline: "Lose a wall. Keep the circuit.",
    briefing: "Upper and lower relay rails can carry the signal independently. Do not fill every gap: empty pockets keep demolition pulses away from both rails.",
    gridSize: 8, source: { x: 7, y: 3 }, core: { x: 0, y: 4 },
    voidTiles: points([[3, 3], [4, 3], [3, 5], [4, 5], [1, 0], [6, 7]]),
    initialTiles: [...tiles("relay", [[6, 4], [4, 4], [2, 4], [6, 2], [4, 2], [2, 2], [1, 3]]), ...tiles("turret", [[2, 3], [5, 3], [1, 5]]), ...tiles("firewall", [[4, 0]])],
    toolsUnlocked: LATENCY_TOOLS, difficultyIndex: 1500, requiredMechanic: "sapperSpacing",
    waves: waves([
      { label: "Open Circuit", briefing: "The top bait draws Sappers away from the lower rail.", grant: 220, count: 26, active: 8, cadence: 5, weights: { sapper: 11, hunter: 4, rusher: 5 }, edges: ["north", "west", "east"] },
      { label: "Cross Current", briefing: "South entries pressure the backup. Cover both rails.", grant: 176, count: 33, active: 10, cadence: 4, weights: { sapper: 12, crawler: 4, hunter: 4, rusher: 6 } },
      { label: "Arc Gap", briefing: "Clear corruption during the build phase before placing new hardware.", grant: 180, count: 40, active: 11, cadence: 4, weights: { sapper: 13, splitter: 4, spoof: 4, rusher: 6 } },
      { label: "Overcurrent", briefing: "Heavy traffic tests whether the second rail really works.", grant: 186, count: 47, active: 13, cadence: 3, weights: { sapper: 14, hunter: 5, crawler: 4, rusher: 7 }, scripts: [{ waveTick: 10, kind: "goliath" }] },
      { label: "Circuit Breaker", briefing: "Two heavy escorts accompany demolition teams. Preserve at least one live rail.", grant: 192, count: 54, active: 14, cadence: 3, weights: { sapper: 15, hunter: 5, splitter: 5, rusher: 8 }, scripts: [{ waveTick: 8, kind: "goliath" }, { waveTick: 28, kind: "goliath" }] },
    ]),
  },
  {
    id: 16, chapterId: 2, codename: "CONTROLLED DEMOLITION", tagline: "Pick what breaks.",
    briefing: "The last demolition board funnels attacks across a diagonal relay spine. Keep the bait on the flank, stagger defenses, and rebuild from safe ground.",
    gridSize: 8, source: { x: 2, y: 0 }, core: { x: 5, y: 7 },
    voidTiles: points([[0, 3], [1, 3], [6, 4], [7, 4], [3, 1], [4, 6]]),
    initialTiles: [...tiles("relay", [[2, 2], [3, 3], [4, 4], [5, 5]]), ...tiles("turret", [[1, 1], [6, 6], [4, 2], [2, 5]]), ...tiles("firewall", [[6, 2]])],
    toolsUnlocked: LATENCY_TOOLS, difficultyIndex: 1600, requiredMechanic: "sapperSpacing",
    waves: waves([
      { label: "Clear Radius", briefing: "Check the four tiles beside every likely Sapper kill.", grant: 232, count: 30, active: 9, cadence: 5, weights: { sapper: 12, crawler: 4, rusher: 6 } },
      { label: "Sequenced Charges", briefing: "Do not replace a Firewall while its blast cross is crowded.", grant: 184, count: 38, active: 11, cadence: 4, weights: { sapper: 13, hunter: 5, spoof: 4, rusher: 6 } },
      { label: "Structural Load", briefing: "A Goliath joins a dense mixed wave.", grant: 190, count: 46, active: 12, cadence: 4, weights: { sapper: 14, splitter: 5, crawler: 4, rusher: 7 }, scripts: [{ waveTick: 10, kind: "goliath" }] },
      { label: "Final Fuse", briefing: "Keep the source end covered while the heavy screen advances.", grant: 196, count: 54, active: 14, cadence: 3, weights: { sapper: 15, hunter: 5, crawler: 5, rusher: 8 }, scripts: [{ waveTick: 8, kind: "goliath" }, { waveTick: 32, kind: "goliath" }] },
      { label: "Controlled Demolition", briefing: "Final hold: survive the breach team without sacrificing your signal spine.", grant: 204, count: 62, active: 15, cadence: 3, weights: { sapper: 16, splitter: 5, hunter: 5, rusher: 8 }, scripts: [{ waveTick: 6, kind: "goliath" }, { waveTick: 26, kind: "goliath" }, { waveTick: 46, kind: "goliath" }] },
    ]),
  },
];
