import type { ExpansionLevelDefinition } from "../../../../sim/expansion/types";
import { CHAPTER_01_LEVELS } from "../chapter01";
import { LATENCY_TOOLS, points, retainDesign, tiles, waves } from "./authoring";

/** Three new tactical layouts extend the five retained Latency Front designs. */
export const R4_CHAPTER_01_LEVELS: readonly ExpansionLevelDefinition[] = [
  ...CHAPTER_01_LEVELS.map((level) => retainDesign(level, level.id)),
  {
    id: 6, chapterId: 1, codename: "SPLIT SECOND", tagline: "Two lanes. One clock.",
    briefing: "A broken center divides the firing lanes. Defend both relay rails and trap the gaps beside the island; a spare route keeps the signal alive.",
    gridSize: 8, source: { x: 0, y: 3 }, core: { x: 7, y: 3 },
    voidTiles: points([[3, 3], [4, 3], [3, 4], [4, 4], [1, 0], [6, 7]]),
    initialTiles: [...tiles("relay", [[1, 2], [3, 2], [5, 2], [6, 3], [1, 4], [2, 5], [4, 5], [6, 5]]), ...tiles("turret", [[2, 3], [5, 4]])],
    toolsUnlocked: LATENCY_TOOLS, difficultyIndex: 600, requiredMechanic: "latencyTrap",
    waves: waves([
      { label: "Forked Ping", briefing: "Westbound pressure splits around the center island.", grant: 112, count: 14, active: 5, cadence: 6, weights: { rusher: 8, crawler: 2, hunter: 2 }, edges: ["west", "north"] },
      { label: "Second Rail", briefing: "New southern entries threaten the backup route.", grant: 60, count: 18, active: 6, cadence: 5, weights: { rusher: 9, spoof: 3, hunter: 2 }, edges: ["west", "south", "east"] },
      { label: "Clock Skew", briefing: "Splitters can consume several trap charges at once.", grant: 64, count: 22, active: 8, cadence: 4, weights: { rusher: 10, splitter: 3, hunter: 2 } },
      { label: "Parallel Burst", briefing: "Overlap ICE coverage between the two rails.", grant: 66, count: 26, active: 9, cadence: 4, weights: { rusher: 11, splitter: 3, spoof: 3, crawler: 2 } },
      { label: "Split Second", briefing: "A heavy screen arrives at tick 10. Keep replacement traps ready.", grant: 72, count: 30, active: 10, cadence: 4, weights: { rusher: 12, splitter: 3, hunter: 3 }, scripts: [{ waveTick: 10, kind: "goliath" }] },
    ]),
  },
  {
    id: 7, chapterId: 1, codename: "NARROWCAST", tagline: "Own the crossing.",
    briefing: "Offset void shelves leave a central crossing. Place ICE in opposite pockets, then delay fast traffic before it reaches the northbound relay spine.",
    gridSize: 8, source: { x: 3, y: 7 }, core: { x: 4, y: 0 },
    voidTiles: points([[0, 2], [1, 2], [2, 2], [5, 5], [6, 5], [7, 5], [1, 5], [6, 2]]),
    initialTiles: [...tiles("relay", [[3, 5], [3, 3], [4, 2]]), ...tiles("turret", [[2, 4], [5, 3], [3, 1]])],
    toolsUnlocked: LATENCY_TOOLS, difficultyIndex: 700, requiredMechanic: "latencyTrap",
    waves: waves([
      { label: "Carrier Gap", briefing: "North and south traffic shares a narrow spine.", grant: 124, count: 17, active: 6, cadence: 5, weights: { rusher: 9, hunter: 3, crawler: 2 }, edges: ["north", "south"] },
      { label: "Sideband", briefing: "Side entries can bypass the first trap line.", grant: 68, count: 22, active: 7, cadence: 5, weights: { rusher: 10, spoof: 3, hunter: 2 } },
      { label: "Jitter Burst", briefing: "Guard both sides of the central relay.", grant: 70, count: 27, active: 9, cadence: 4, weights: { rusher: 11, splitter: 4, hunter: 3 } },
      { label: "Compression", briefing: "Repair between waves; keep a clean replacement pocket.", grant: 74, count: 32, active: 10, cadence: 4, weights: { rusher: 12, crawler: 3, splitter: 4, spoof: 3 } },
      { label: "Narrowcast", briefing: "Delay the Goliath's escort before it reaches Core.", grant: 80, count: 37, active: 11, cadence: 3, weights: { rusher: 13, hunter: 4, splitter: 4 }, scripts: [{ waveTick: 8, kind: "goliath" }] },
    ]),
  },
  {
    id: 8, chapterId: 1, codename: "LAST MILLISECOND", tagline: "Make every delay count.",
    briefing: "The chapter finale bends the route around three staggered void teeth. Protect the turning relays with overlapping ICE and reserve bandwidth for trap replacement.",
    gridSize: 8, source: { x: 7, y: 5 }, core: { x: 0, y: 2 },
    voidTiles: points([[2, 1], [2, 2], [4, 4], [4, 5], [6, 1], [6, 2], [2, 6], [5, 7]]),
    initialTiles: [...tiles("relay", [[6, 4], [5, 3], [3, 3], [1, 3]]), ...tiles("turret", [[6, 6], [4, 2], [1, 1]])],
    toolsUnlocked: LATENCY_TOOLS, difficultyIndex: 800, requiredMechanic: "latencyTrap",
    waves: waves([
      { label: "Final Handshake", briefing: "Cover both ends of the bent route before launch.", grant: 140, count: 20, active: 7, cadence: 5, weights: { rusher: 10, crawler: 3, hunter: 3 } },
      { label: "Lost Packet", briefing: "Hunters pull fire away from Rushers. Keep traps in the path.", grant: 76, count: 26, active: 8, cadence: 4, weights: { rusher: 11, hunter: 4, spoof: 3 } },
      { label: "No Retry", briefing: "Splitters need a second layer of delay.", grant: 80, count: 32, active: 10, cadence: 4, weights: { rusher: 12, splitter: 4, hunter: 3 } },
      { label: "Heavy Deadline", briefing: "A Goliath joins the burst at tick 8.", grant: 84, count: 38, active: 11, cadence: 3, weights: { rusher: 13, splitter: 4, crawler: 3 }, scripts: [{ waveTick: 8, kind: "goliath" }] },
      { label: "Last Millisecond", briefing: "Two heavy screens. Keep the source-to-core chain alive through the final burst.", grant: 90, count: 44, active: 12, cadence: 3, weights: { rusher: 14, splitter: 4, hunter: 4, spoof: 3 }, scripts: [{ waveTick: 8, kind: "goliath" }, { waveTick: 28, kind: "goliath" }] },
    ]),
  },
];
