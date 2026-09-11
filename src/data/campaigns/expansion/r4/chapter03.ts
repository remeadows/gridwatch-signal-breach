import type { ExpansionLevelDefinition } from "../../../../sim/expansion/types";
import { CHAPTER_03_LEVELS } from "../chapter03";
import { SHIELD_TOOLS, points, retainDesign, tiles, waves } from "./authoring";

export const R4_CHAPTER_03_LEVELS: readonly ExpansionLevelDefinition[] = [
  ...CHAPTER_03_LEVELS.map((level) => retainDesign(level, level.id + 6)),
  {
    id: 22, chapterId: 3, codename: "BROKEN HALO", tagline: "Find the link behind the armor.",
    briefing: "The dogleg relay chain leaves separate Arc firing pockets. Break the Shield Drone before its escort crosses the turn, then use ordinary ICE to cover survivors.",
    gridSize: 8, source: { x: 0, y: 2 }, core: { x: 7, y: 5 },
    voidTiles: points([[2, 5], [3, 5], [4, 1], [5, 1], [1, 6], [6, 1]]),
    initialTiles: [...tiles("relay", [[2, 2], [3, 3], [4, 4], [6, 4]]), ...tiles("turret", [[1, 3], [5, 5], [6, 3]]), ...tiles("arcIce", [[3, 1]]), ...tiles("firewall", [[7, 1]])],
    toolsUnlocked: SHIELD_TOOLS, difficultyIndex: 2200, requiredMechanic: "shieldNetwork",
    waves: waves([
      { label: "Halo Edge", briefing: "Drones shelter fast escorts. Overlap Arc and ordinary ICE.", grant: 184, count: 24, active: 7, cadence: 7, weights: { shieldDrone: 6, sapper: 3, rusher: 8 }, edges: ["west", "north", "east"] },
      { label: "Fractured Link", briefing: "The southern approach opens. Add a second Arc pocket.", grant: 84, count: 31, active: 8, cadence: 6, weights: { shieldDrone: 6, sapper: 4, hunter: 4, rusher: 9 } },
      { label: "Armor Wake", briefing: "Keep Sapper bait away from the Arc batteries.", grant: 88, count: 38, active: 10, cadence: 5, weights: { shieldDrone: 7, sapper: 5, splitter: 4, rusher: 10 } },
      { label: "Heavy Halo", briefing: "A heavy screen arrives at tick 20; clear its shield support.", grant: 94, count: 46, active: 11, cadence: 5, weights: { shieldDrone: 7, sapper: 5, hunter: 4, rusher: 11 }, scripts: [{ waveTick: 20, kind: "goliath" }] },
      { label: "Broken Halo", briefing: "Destroy support networks before the two heavy screens reach the turn.", grant: 100, count: 54, active: 13, cadence: 4, weights: { shieldDrone: 8, sapper: 6, splitter: 4, rusher: 12 }, scripts: [{ waveTick: 20, kind: "goliath" }, { waveTick: 60, kind: "goliath" }] },
    ]),
  },
  {
    id: 23, chapterId: 3, codename: "PHASE BRIDGE", tagline: "Control the bridge, not the crowd.",
    briefing: "A segmented central barrier concentrates crossings near the middle relay. Cover the bridge from two sides; do not crowd the route with bait.",
    gridSize: 8, source: { x: 1, y: 7 }, core: { x: 6, y: 0 },
    voidTiles: points([[3, 1], [3, 2], [3, 5], [3, 6], [5, 6], [1, 1]]),
    initialTiles: [...tiles("relay", [[1, 5], [2, 4], [4, 4], [5, 3], [6, 2]]), ...tiles("turret", [[1, 3], [5, 5], [6, 1]]), ...tiles("arcIce", [[4, 2]]), ...tiles("firewall", [[0, 0]])],
    toolsUnlocked: SHIELD_TOOLS, difficultyIndex: 2300, requiredMechanic: "shieldNetwork",
    waves: waves([
      { label: "Bridgehead", briefing: "Cover the central gap before the first network arrives.", grant: 196, count: 28, active: 8, cadence: 7, weights: { shieldDrone: 6, sapper: 4, hunter: 3, rusher: 9 }, edges: ["west", "east"] },
      { label: "Linked Crossing", briefing: "Northern entries threaten the final relay.", grant: 92, count: 36, active: 9, cadence: 6, weights: { shieldDrone: 7, sapper: 4, hunter: 4, rusher: 10 } },
      { label: "Bridge Load", briefing: "Splitters can leave surviving probes behind a broken shield.", grant: 96, count: 44, active: 11, cadence: 5, weights: { shieldDrone: 7, sapper: 5, splitter: 5, rusher: 11 } },
      { label: "Heavy Crossing", briefing: "Keep both firing pockets intact under heavy pressure.", grant: 102, count: 52, active: 12, cadence: 4, weights: { shieldDrone: 8, sapper: 6, hunter: 4, rusher: 12 }, scripts: [{ waveTick: 16, kind: "goliath" }] },
      { label: "Phase Bridge", briefing: "Restore corrupted relay sites before replacing exposed bait.", grant: 110, count: 60, active: 14, cadence: 4, weights: { shieldDrone: 9, sapper: 6, splitter: 5, rusher: 13 }, scripts: [{ waveTick: 16, kind: "goliath" }, { waveTick: 52, kind: "goliath" }] },
    ]),
  },
  {
    id: 24, chapterId: 3, codename: "DARK QUORUM", tagline: "Break their agreement.",
    briefing: "Two offset void columns split your firing zones. The enemy fields larger support groups; position Arc ICE near each approach while preserving blast gaps.",
    gridSize: 8, source: { x: 7, y: 1 }, core: { x: 0, y: 6 },
    voidTiles: points([[4, 1], [4, 2], [3, 5], [3, 6], [1, 2], [6, 5]]),
    initialTiles: [...tiles("relay", [[6, 2], [5, 3], [3, 3], [2, 4], [1, 5]]), ...tiles("turret", [[6, 3], [2, 2], [4, 4]]), ...tiles("arcIce", [[2, 5]]), ...tiles("firewall", [[7, 6]])],
    toolsUnlocked: SHIELD_TOOLS, difficultyIndex: 2400, requiredMechanic: "shieldNetwork",
    waves: waves([
      { label: "Quorum Call", briefing: "Larger Drone groups approach from both ends.", grant: 208, count: 32, active: 9, cadence: 6, weights: { shieldDrone: 8, sapper: 4, hunter: 3, rusher: 10 }, edges: ["north", "south", "east"] },
      { label: "Shared Armor", briefing: "One Arc is not enough to cover the entire route.", grant: 100, count: 41, active: 10, cadence: 5, weights: { shieldDrone: 9, sapper: 5, hunter: 4, rusher: 11 } },
      { label: "Heavy Vote", briefing: "Heavy traffic screens the support group. Keep ordinary ICE firing too.", grant: 106, count: 50, active: 12, cadence: 5, weights: { shieldDrone: 9, sapper: 6, splitter: 5, rusher: 12 }, scripts: [{ waveTick: 20, kind: "goliath" }] },
      { label: "Deadlock", briefing: "Rebuild only on clean, unoccupied ground outside the blast cross.", grant: 112, count: 59, active: 13, cadence: 4, weights: { shieldDrone: 10, sapper: 6, hunter: 5, rusher: 13 }, scripts: [{ waveTick: 16, kind: "goliath" }, { waveTick: 50, kind: "goliath" }] },
      { label: "Dark Quorum", briefing: "Break the support network in both firing zones.", grant: 120, count: 68, active: 15, cadence: 4, weights: { shieldDrone: 11, sapper: 7, splitter: 5, rusher: 14 }, scripts: [{ waveTick: 12, kind: "goliath" }, { waveTick: 44, kind: "goliath" }] },
    ]),
  },
  {
    id: 25, chapterId: 3, codename: "SIGNAL UNBROKEN", tagline: "Hold the last link.",
    briefing: "The final grid has a diagonal main route and a lower backup loop. Defend both ends, break shield support, isolate Sapper bait, and keep enough bandwidth to recover.",
    gridSize: 8, source: { x: 0, y: 0 }, core: { x: 7, y: 7 },
    voidTiles: points([[3, 1], [4, 1], [5, 2], [2, 6], [3, 6]]),
    initialTiles: [...tiles("relay", [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [1, 3], [1, 5], [3, 5]]), ...tiles("turret", [[2, 1], [6, 5], [3, 4]]), ...tiles("arcIce", [[4, 3]]), ...tiles("firewall", [[0, 7]])],
    toolsUnlocked: SHIELD_TOOLS, difficultyIndex: 2500, requiredMechanic: "shieldNetwork",
    waves: waves([
      { label: "Final Uplink", briefing: "Prepare both routes; the finale attacks from every edge.", grant: 224, count: 36, active: 10, cadence: 6, weights: { shieldDrone: 9, sapper: 5, hunter: 4, rusher: 11 } },
      { label: "Storm Protocol", briefing: "Splitters crowd the shield network. Overlap Arc and ICE.", grant: 110, count: 46, active: 11, cadence: 5, weights: { shieldDrone: 10, sapper: 6, splitter: 5, rusher: 12 } },
      { label: "Last Reserve", briefing: "A heavy pair joins the attack. Protect the last relay before Core.", grant: 116, count: 56, active: 13, cadence: 4, weights: { shieldDrone: 10, sapper: 6, hunter: 5, rusher: 13 }, scripts: [{ waveTick: 20, kind: "goliath" }, { waveTick: 56, kind: "goliath" }] },
      { label: "Breakwater", briefing: "Use the backup loop if the diagonal route becomes corrupted.", grant: 124, count: 66, active: 14, cadence: 4, weights: { shieldDrone: 11, sapper: 7, splitter: 6, rusher: 14 }, scripts: [{ waveTick: 16, kind: "goliath" }, { waveTick: 48, kind: "goliath" }] },
      { label: "Signal Unbroken", briefing: "Final wave of the campaign: break their shields, survive the heavy screen, keep the signal live.", grant: 132, count: 78, active: 16, cadence: 3, weights: { shieldDrone: 12, sapper: 8, splitter: 6, rusher: 15 }, scripts: [{ waveTick: 12, kind: "goliath" }, { waveTick: 44, kind: "goliath" }, { waveTick: 76, kind: "goliath" }] },
    ]),
  },
];
