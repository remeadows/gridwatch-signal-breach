import type { ExpansionEnemyKind, ExpansionLevelDefinition, ExpansionWaveDefinition } from "../../../sim/expansion/types";

const TOOLS = ["relay", "firewall", "turret", "arcIce", "scrubber", "sell"] as const;
const ALL_EDGES = ["north", "east", "south", "west"] as const;
type WaveInput = Readonly<{ id: number; label: string; briefing: string; grant: number; count: number; active: number; cadence: number; weights: Partial<Record<ExpansionEnemyKind, number>>; edges?: ExpansionWaveDefinition["spawnEdges"]; scripts?: ExpansionWaveDefinition["scriptedSpawns"] }>;

function wave(input: WaveInput): ExpansionWaveDefinition {
  return { id: input.id, label: input.label, briefing: input.briefing, prepTicks: 18, bandwidthGrant: input.grant, bandwidthTricklePerTick: 1, bandwidthTrickleEveryTicks: 6, spawnFirstTick: 6, spawnEveryTicks: input.cadence, maxActiveIntrusions: input.active, maxSpawnedIntrusions: input.count, perimeterPickAttempts: 16, enemyWeights: { ...input.weights }, spawnEdges: input.edges ?? ALL_EDGES, ...(input.scripts ? { scriptedSpawns: input.scripts } : {}) };
}

/** Shield Front teaches reach, chain coverage, split defense, and Sapper spacing. */
export const CHAPTER_03_LEVELS: readonly ExpansionLevelDefinition[] = [
  {
    id: 11, chapterId: 3, codename: "LINK BREAK", tagline: "Find the shield's source.",
    briefing: "Violet links protect attackers. Arc ICE reaches three tiles, focuses the Shield Drone, and chains through nearby targets. Normal ICE hits harder when shields are down.",
    gridSize: 8, source: { x: 0, y: 4 }, core: { x: 7, y: 4 },
    voidTiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }, { x: 7, y: 0 }, { x: 3, y: 6 }],
    initialTiles: [{ position: { x: 2, y: 4 }, kind: "relay" }, { position: { x: 4, y: 4 }, kind: "relay" }, { position: { x: 6, y: 4 }, kind: "relay" }, { position: { x: 2, y: 3 }, kind: "turret" }, { position: { x: 6, y: 3 }, kind: "turret" }],
    toolsUnlocked: TOOLS,
    waves: [
      wave({ id: 1, label: "Visible Link", briefing: "A Drone and Probe enter the two north gates together. Watch the violet link and place Arc ICE within reach.", grant: 120, count: 12, active: 4, cadence: 9, weights: { probe: 2, rusher: 2 }, edges: ["north"], scripts: [{ waveTick: 4, kind: "shieldDrone" }, { waveTick: 4, kind: "probe" }] }),
      wave({ id: 2, label: "Cut The Link", briefing: "Arc ICE selects the Drone first. Ordinary ICE finishes exposed attackers.", grant: 44, count: 16, active: 5, cadence: 8, weights: { shieldDrone: 3, rusher: 5, probe: 2 }, edges: ["north"] }),
      wave({ id: 3, label: "West Approach", briefing: "Extend coverage west without crowding the relay spine.", grant: 48, count: 20, active: 6, cadence: 7, weights: { shieldDrone: 4, crawler: 3, rusher: 5 }, edges: ["north", "west"] }),
      wave({ id: 4, label: "Shared Canopy", briefing: "Two Drones do not stack protection. Cover their approach with both weapon types.", grant: 52, count: 25, active: 7, cadence: 6, weights: { shieldDrone: 4, hunter: 3, rusher: 6 }, edges: ["north", "south"] }),
      wave({ id: 5, label: "Link Break", briefing: "Every edge is live. Break shield links while keeping a continuous signal.", grant: 56, count: 30, active: 8, cadence: 6, weights: { shieldDrone: 5, hunter: 3, crawler: 3, rusher: 7 } }),
    ], difficultyIndex: 545, requiredMechanic: "shieldNetwork",
  },
  {
    id: 12, chapterId: 3, codename: "ARC TURN", tagline: "Reach the first target. Bridge the next gap.",
    briefing: "The turning route creates separate approach pockets. Arc ICE reaches three tiles to its first target, then jumps at most two tiles between nearby enemies.",
    gridSize: 8, source: { x: 0, y: 6 }, core: { x: 7, y: 1 },
    voidTiles: [{ x: 1, y: 2 }, { x: 2, y: 2 }, { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }],
    initialTiles: [{ position: { x: 2, y: 6 }, kind: "relay" }, { position: { x: 3, y: 5 }, kind: "relay" }, { position: { x: 3, y: 3 }, kind: "relay" }, { position: { x: 4, y: 2 }, kind: "relay" }, { position: { x: 6, y: 2 }, kind: "relay" }, { position: { x: 1, y: 4 }, kind: "turret" }, { position: { x: 5, y: 5 }, kind: "turret" }],
    toolsUnlocked: TOOLS,
    waves: [
      wave({ id: 1, label: "Outside Bend", briefing: "Cover the western bend before the first shielded group arrives.", grant: 126, count: 14, active: 4, cadence: 8, weights: { shieldDrone: 3, rusher: 5, probe: 2 }, edges: ["west", "south"] }),
      wave({ id: 2, label: "Jump Reach", briefing: "A chain may travel beyond its emitter, but a gap greater than two tiles ends it.", grant: 46, count: 19, active: 5, cadence: 7, weights: { shieldDrone: 4, spoof: 3, rusher: 5 }, edges: ["west", "north"] }),
      wave({ id: 3, label: "Elbow Room", briefing: "Keep ordinary ICE near the route while Arc covers the open approach.", grant: 50, count: 24, active: 6, cadence: 6, weights: { shieldDrone: 4, crawler: 3, hunter: 2, rusher: 6 }, edges: ["west", "north", "east"] }),
      wave({ id: 4, label: "Broken Span", briefing: "Spoofs and Hunters separate from the group. A second coverage pocket catches them.", grant: 54, count: 29, active: 8, cadence: 6, weights: { shieldDrone: 5, spoof: 3, hunter: 3, rusher: 7 } }),
      wave({ id: 5, label: "Arc Turn", briefing: "Defend both ends of the turn and restore damaged relay links.", grant: 58, count: 34, active: 9, cadence: 5, weights: { shieldDrone: 6, crawler: 3, hunter: 3, rusher: 8 } }),
    ], difficultyIndex: 590, requiredMechanic: "shieldNetwork",
  },
  {
    id: 13, chapterId: 3, codename: "TWIN CANOPY", tagline: "One arc cannot watch two fronts.",
    briefing: "Upper and lower routes offer recovery options around a blocked center. Build separate coverage zones before shielded groups arrive from opposite sides.",
    gridSize: 8, source: { x: 0, y: 3 }, core: { x: 7, y: 3 },
    voidTiles: [{ x: 3, y: 0 }, { x: 3, y: 7 }, { x: 3, y: 3 }, { x: 4, y: 3 }],
    initialTiles: [{ position: { x: 1, y: 2 }, kind: "relay" }, { position: { x: 3, y: 2 }, kind: "relay" }, { position: { x: 5, y: 2 }, kind: "relay" }, { position: { x: 1, y: 4 }, kind: "relay" }, { position: { x: 3, y: 4 }, kind: "relay" }, { position: { x: 5, y: 4 }, kind: "relay" }, { position: { x: 6, y: 3 }, kind: "relay" }, { position: { x: 1, y: 1 }, kind: "turret" }, { position: { x: 6, y: 5 }, kind: "turret" }],
    toolsUnlocked: TOOLS,
    waves: [
      wave({ id: 1, label: "Upper Shield", briefing: "Start with the upper network; preserve a lower fallback route.", grant: 132, count: 16, active: 5, cadence: 8, weights: { shieldDrone: 4, rusher: 6, probe: 2 }, edges: ["north"] }),
      wave({ id: 2, label: "Lower Shield", briefing: "The approach switches south. Reposition only what the upper front can spare.", grant: 48, count: 21, active: 6, cadence: 7, weights: { shieldDrone: 5, crawler: 3, rusher: 6 }, edges: ["south"] }),
      wave({ id: 3, label: "Two Networks", briefing: "Both fronts arrive together. Each needs a Drone-focusing emitter.", grant: 52, count: 26, active: 7, cadence: 6, weights: { shieldDrone: 6, hunter: 3, rusher: 7 }, edges: ["north", "south"] }),
      wave({ id: 4, label: "Split Cloud", briefing: "Splitters add nearby targets for a chain; ordinary ICE still covers the whole group.", grant: 56, count: 32, active: 9, cadence: 5, weights: { shieldDrone: 6, splitter: 3, hunter: 3, rusher: 8 } }),
      wave({ id: 5, label: "Twin Canopy", briefing: "Maintain two defended zones and repair the route that remains usable.", grant: 60, count: 38, active: 10, cadence: 5, weights: { shieldDrone: 7, splitter: 4, crawler: 3, rusher: 9 } }),
    ], difficultyIndex: 640, requiredMechanic: "shieldNetwork",
  },
  {
    id: 14, chapterId: 3, codename: "FUSE FIELD", tagline: "Break the shield without feeding the blast.",
    briefing: "Shield Drones protect Rushers while Sappers hunt hardware. Keep Arc coils and relays away from a marked Firewall's likely blast tile.",
    gridSize: 8, source: { x: 7, y: 6 }, core: { x: 0, y: 1 },
    voidTiles: [{ x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 6 }],
    initialTiles: [{ position: { x: 6, y: 5 }, kind: "relay" }, { position: { x: 5, y: 4 }, kind: "relay" }, { position: { x: 4, y: 3 }, kind: "relay" }, { position: { x: 3, y: 2 }, kind: "relay" }, { position: { x: 1, y: 2 }, kind: "relay" }, { position: { x: 6, y: 1 }, kind: "firewall" }, { position: { x: 2, y: 1 }, kind: "turret" }, { position: { x: 1, y: 5 }, kind: "turret" }, { position: { x: 6, y: 3 }, kind: "turret" }],
    toolsUnlocked: TOOLS,
    waves: [
      wave({ id: 1, label: "Marked Canopy", briefing: "One Sapper announces the spacing risk while Drones protect the approach.", grant: 140, count: 18, active: 5, cadence: 8, weights: { shieldDrone: 4, rusher: 6, crawler: 2 }, edges: ["north", "east"], scripts: [{ waveTick: 20, kind: "sapper" }] }),
      wave({ id: 2, label: "Charged Bait", briefing: "Isolated Firewalls draw demolition away from your Arc coverage.", grant: 52, count: 24, active: 6, cadence: 7, weights: { shieldDrone: 4, sapper: 3, hunter: 2, rusher: 6 }, edges: ["north", "east", "south"] }),
      wave({ id: 3, label: "Fuse Gap", briefing: "Protect the Drone approach without filling every safe blast gap.", grant: 56, count: 30, active: 8, cadence: 6, weights: { shieldDrone: 5, sapper: 4, hunter: 3, rusher: 7 } }),
      wave({ id: 4, label: "Broken Circuit", briefing: "Scrub corruption and restore empty relay sites before replacing exposed bait.", grant: 60, count: 36, active: 9, cadence: 5, weights: { shieldDrone: 5, sapper: 5, splitter: 3, rusher: 8 } }),
      wave({ id: 5, label: "Fuse Field", briefing: "Read the shield links and Sapper locks together; preserve a repair reserve.", grant: 64, count: 42, active: 11, cadence: 5, weights: { shieldDrone: 6, sapper: 6, hunter: 3, rusher: 9 } }),
    ], difficultyIndex: 700, requiredMechanic: "shieldNetwork",
  },
  {
    id: 15, chapterId: 3, codename: "SHIELD FRONT", tagline: "Hold the line through every kind of pressure.",
    briefing: "The finale combines shield focus, formation spacing, and signal recovery. Goliaths threaten the route directly; they do not absorb attacks intended for other enemies.",
    gridSize: 8, source: { x: 0, y: 7 }, core: { x: 7, y: 0 },
    voidTiles: [{ x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 }],
    initialTiles: [{ position: { x: 1, y: 6 }, kind: "relay" }, { position: { x: 2, y: 5 }, kind: "relay" }, { position: { x: 3, y: 4 }, kind: "relay" }, { position: { x: 4, y: 3 }, kind: "relay" }, { position: { x: 5, y: 2 }, kind: "relay" }, { position: { x: 6, y: 1 }, kind: "relay" }, { position: { x: 0, y: 3 }, kind: "firewall" }, { position: { x: 1, y: 3 }, kind: "turret" }, { position: { x: 6, y: 4 }, kind: "turret" }, { position: { x: 4, y: 7 }, kind: "turret" }, { position: { x: 5, y: 4 }, kind: "arcIce" }],
    toolsUnlocked: TOOLS,
    waves: [
      wave({ id: 1, label: "Frontline Link", briefing: "Use the starting Arc to break Drones and place normal ICE over the relay approaches.", grant: 172, count: 20, active: 6, cadence: 8, weights: { shieldDrone: 5, sapper: 3, crawler: 3, rusher: 7 } }),
      wave({ id: 2, label: "Crossed Orders", briefing: "Shield focus and Firewall locks create different target priorities. Keep both visible.", grant: 56, count: 26, active: 7, cadence: 7, weights: { shieldDrone: 5, sapper: 4, hunter: 3, rusher: 8 } }),
      wave({ id: 3, label: "Recovery Window", briefing: "Leave bandwidth for Scrubbers and relay replacements when a route segment falls.", grant: 62, count: 32, active: 9, cadence: 6, weights: { shieldDrone: 6, sapper: 5, splitter: 3, rusher: 9 } }),
      wave({ id: 4, label: "Heavy Front", briefing: "A Goliath adds direct route pressure while Drones and Sappers demand coverage and spacing.", grant: 68, count: 38, active: 10, cadence: 5, weights: { shieldDrone: 6, sapper: 5, hunter: 3, rusher: 10 }, scripts: [{ waveTick: 20, kind: "goliath" }] }),
      wave({ id: 5, label: "Shield Front", briefing: "Final hold: break shield networks, isolate blast targets, and restore the signal when it drops.", grant: 74, count: 46, active: 12, cadence: 5, weights: { shieldDrone: 7, sapper: 6, splitter: 4, rusher: 11 }, scripts: [{ waveTick: 20, kind: "goliath" }, { waveTick: 60, kind: "goliath" }] }),
    ], difficultyIndex: 770, requiredMechanic: "shieldNetwork",
  },
] as const;
