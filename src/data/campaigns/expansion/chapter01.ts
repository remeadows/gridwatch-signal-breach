import type {
  ExpansionEnemyKind,
  ExpansionLevelDefinition,
  ExpansionWaveDefinition,
} from "../../../sim/expansion/types";

const INTRO_TOOLS = ["relay", "firewall", "turret", "latencyTrap", "sell"] as const;
const TOOLS = ["relay", "firewall", "turret", "scrubber", "latencyTrap", "sell"] as const;
const ALL_EDGES = ["west", "north", "east", "south"] as const;

type WaveInput = Readonly<{
  id: number;
  label: string;
  briefing: string;
  grant: number;
  count: number;
  active: number;
  cadence: number;
  weights: Partial<Record<ExpansionEnemyKind, number>>;
  edges?: ExpansionWaveDefinition["spawnEdges"];
  trickleEvery?: number;
  scriptedSpawns?: ExpansionWaveDefinition["scriptedSpawns"];
}>;

function wave(input: WaveInput): ExpansionWaveDefinition {
  return {
    id: input.id,
    label: input.label,
    briefing: input.briefing,
    prepTicks: 18,
    bandwidthGrant: input.grant,
    bandwidthTricklePerTick: 1,
    bandwidthTrickleEveryTicks: input.trickleEvery ?? 6,
    spawnFirstTick: 3,
    spawnEveryTicks: input.cadence,
    maxActiveIntrusions: input.active,
    maxSpawnedIntrusions: input.count,
    perimeterPickAttempts: 16,
    enemyWeights: {
      probe: input.weights.probe ?? 0,
      crawler: input.weights.crawler ?? 0,
      spoof: input.weights.spoof ?? 0,
      hunter: input.weights.hunter ?? 0,
      splitter: input.weights.splitter ?? 0,
      goliath: input.weights.goliath ?? 0,
      rusher: input.weights.rusher ?? 0,
    },
    ...(input.scriptedSpawns ? { scriptedSpawns: input.scriptedSpawns } : {}),
    spawnEdges: input.edges ?? ALL_EDGES,
  };
}

export const CHAPTER_01_LEVELS: readonly ExpansionLevelDefinition[] = [
  {
    id: 1,
    chapterId: 1,
    codename: "FIRST CONTACT",
    tagline: "Route fast. Trap faster.",
    briefing: "Rushers move every tick. Put Latency Traps in their lane, then let ICE finish the hold.",
    gridSize: 8,
    source: { x: 0, y: 4 },
    core: { x: 7, y: 4 },
    voidTiles: [],
    initialTiles: [
      { position: { x: 2, y: 4 }, kind: "relay" },
      { position: { x: 4, y: 4 }, kind: "relay" },
      { position: { x: 6, y: 4 }, kind: "relay" },
      { position: { x: 3, y: 3 }, kind: "turret" },
    ],
    toolsUnlocked: INTRO_TOOLS,
    waves: [
      wave({ id: 1, label: "Quick Ping", briefing: "One Rusher. Trap the center lane.", grant: 48, count: 2, active: 1, cadence: 11, weights: { rusher: 4, probe: 2 }, edges: ["west"] }),
      wave({ id: 2, label: "Double Time", briefing: "Two lanes probe the route.", grant: 19, count: 4, active: 2, cadence: 9, weights: { rusher: 5, probe: 3 }, edges: ["west", "north"] }),
      wave({ id: 3, label: "Redline", briefing: "Rushers arrive closer together.", grant: 18, count: 5, active: 3, cadence: 7, weights: { rusher: 6, probe: 2 }, edges: ["west", "north"] }),
      wave({ id: 4, label: "Mixed Clock", briefing: "A Crawler screens the fast lane.", grant: 18, count: 6, active: 3, cadence: 7, weights: { rusher: 5, probe: 2, crawler: 1 }, edges: ["west", "north", "south"] }),
      wave({ id: 5, label: "Latency Check", briefing: "Hold every edge and keep the signal live.", grant: 20, count: 8, active: 4, cadence: 6, weights: { rusher: 6, probe: 2, crawler: 1 }, edges: ALL_EDGES }),
    ],
    difficultyIndex: 110,
    requiredMechanic: "latencyTrap",
  },
  {
    id: 2,
    chapterId: 1,
    codename: "SWITCHBACK",
    tagline: "The shortest route is the hottest route.",
    briefing: "Void channels narrow movement. Shape the approach before the fast packets converge.",
    gridSize: 8,
    source: { x: 0, y: 6 },
    core: { x: 7, y: 1 },
    voidTiles: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 5, y: 3 }, { x: 2, y: 5 }, { x: 4, y: 5 }],
    initialTiles: [
      { position: { x: 1, y: 5 }, kind: "relay" },
      { position: { x: 2, y: 4 }, kind: "relay" },
      { position: { x: 3, y: 3 }, kind: "relay" },
      { position: { x: 4, y: 2 }, kind: "relay" },
      { position: { x: 6, y: 2 }, kind: "relay" },
    ],
    toolsUnlocked: TOOLS,
    waves: [
      wave({ id: 1, label: "Hairpin", briefing: "West and south entries test the bend.", grant: 45, count: 4, active: 2, cadence: 9, weights: { rusher: 4, probe: 3 }, edges: ["west", "south"] }),
      wave({ id: 2, label: "Blind Corner", briefing: "Spoofs skip a wall; traps still catch their landing.", grant: 22, count: 6, active: 3, cadence: 8, weights: { rusher: 4, spoof: 2, probe: 2 }, edges: ["west", "north", "south"] }),
      wave({ id: 3, label: "Cross Traffic", briefing: "Pressure now comes from both ends.", grant: 20, count: 7, active: 4, cadence: 7, weights: { rusher: 5, probe: 2, crawler: 1 }, edges: ALL_EDGES }),
      wave({ id: 4, label: "Fast Detour", briefing: "Protect the route without sealing every lane.", grant: 20, count: 9, active: 5, cadence: 6, weights: { rusher: 6, spoof: 2, crawler: 1 }, edges: ALL_EDGES }),
      wave({ id: 5, label: "Switchback Surge", briefing: "Layer traps; a single charge line will not hold.", grant: 22, count: 11, active: 5, cadence: 5, weights: { rusher: 7, spoof: 2, crawler: 2 }, edges: ALL_EDGES }),
    ],
    difficultyIndex: 135,
    requiredMechanic: "latencyTrap",
  },
  {
    id: 3,
    chapterId: 1,
    codename: "CROSSTALK",
    tagline: "Every edge is an attack surface.",
    briefing: "Hunters pull defenses off-plan while Rushers cut directly toward the live route.",
    gridSize: 8,
    source: { x: 7, y: 6 },
    core: { x: 1, y: 1 },
    voidTiles: [{ x: 2, y: 3 }, { x: 3, y: 3 }, { x: 5, y: 2 }, { x: 4, y: 5 }, { x: 5, y: 5 }],
    initialTiles: [
      { position: { x: 6, y: 5 }, kind: "relay" },
      { position: { x: 5, y: 4 }, kind: "relay" },
      { position: { x: 4, y: 3 }, kind: "relay" },
      { position: { x: 3, y: 2 }, kind: "relay" },
      { position: { x: 2, y: 1 }, kind: "relay" },
    ],
    toolsUnlocked: TOOLS,
    waves: [
      wave({ id: 1, label: "Echo Pair", briefing: "Rushers cross the board diagonally.", grant: 50, count: 6, active: 3, cadence: 8, weights: { rusher: 5, probe: 2 }, edges: ["east", "south"] }),
      wave({ id: 2, label: "Hunter Noise", briefing: "A Hunter targets hardware while Rushers seek signal.", grant: 24, count: 7, active: 4, cadence: 7, weights: { rusher: 5, hunter: 2, probe: 1 }, edges: ["west", "east", "south"] }),
      wave({ id: 3, label: "Phase Collision", briefing: "Spoofs and Rushers attack different assumptions.", grant: 22, count: 9, active: 5, cadence: 6, weights: { rusher: 6, hunter: 2, spoof: 2 }, edges: ALL_EDGES }),
      wave({ id: 4, label: "Noisy Channel", briefing: "Use firewalls to buy time for trap reloads.", grant: 22, count: 11, active: 6, cadence: 5, weights: { rusher: 7, hunter: 2, crawler: 2 }, edges: ALL_EDGES }),
      wave({ id: 5, label: "Crosstalk Storm", briefing: "The route is the target. Build defense in depth.", grant: 24, count: 13, active: 6, cadence: 5, weights: { rusher: 8, hunter: 2, spoof: 2, crawler: 1 }, edges: ALL_EDGES }),
    ],
    difficultyIndex: 165,
    requiredMechanic: "latencyTrap",
  },
  {
    id: 4,
    chapterId: 1,
    codename: "OVERCLOCK ALLEY",
    tagline: "Speed is a weapon on both sides.",
    briefing: "Splitters turn one target into three. Traps must cover the lane before the split reaches ICE.",
    gridSize: 8,
    source: { x: 0, y: 1 },
    core: { x: 7, y: 6 },
    voidTiles: [{ x: 2, y: 3 }, { x: 2, y: 4 }, { x: 4, y: 1 }, { x: 5, y: 3 }, { x: 6, y: 4 }],
    initialTiles: [
      { position: { x: 2, y: 1 }, kind: "relay" },
      { position: { x: 3, y: 2 }, kind: "relay" },
      { position: { x: 4, y: 3 }, kind: "relay" },
      { position: { x: 5, y: 4 }, kind: "relay" },
      { position: { x: 6, y: 5 }, kind: "relay" },
    ],
    toolsUnlocked: TOOLS,
    waves: [
      wave({ id: 1, label: "Hot Lane", briefing: "Fast pressure with little room to reroute.", grant: 58, count: 7, active: 4, cadence: 7, weights: { rusher: 6, crawler: 2 }, edges: ["west", "north"] }),
      wave({ id: 2, label: "Split Clock", briefing: "A Splitter seeds extra probes on death.", grant: 26, count: 9, active: 5, cadence: 6, weights: { rusher: 6, splitter: 2, probe: 1 }, edges: ["west", "north", "south"] }),
      wave({ id: 3, label: "Packet Burst", briefing: "Short cadence punishes uncovered approaches.", grant: 24, count: 12, active: 6, cadence: 5, weights: { rusher: 8, splitter: 2, spoof: 2 }, edges: ALL_EDGES }),
      wave({ id: 4, label: "Heat Sink", briefing: "Stagger traps instead of stacking one tile.", grant: 24, count: 14, active: 7, cadence: 4, weights: { rusher: 9, splitter: 2, hunter: 2, crawler: 1 }, edges: ALL_EDGES }),
      wave({ id: 5, label: "Alley Burn", briefing: "Keep enough bandwidth to replace spent traps live.", grant: 27, count: 16, active: 8, cadence: 4, weights: { rusher: 10, splitter: 3, hunter: 2, spoof: 2 }, edges: ALL_EDGES }),
    ],
    difficultyIndex: 200,
    requiredMechanic: "latencyTrap",
  },
  {
    id: 5,
    chapterId: 1,
    codename: "DEADLINE",
    tagline: "The chapter closes at full speed.",
    briefing: "The Goliath absorbs fire while Rushers race around it. Preserve signal through five escalating holds.",
    gridSize: 8,
    source: { x: 7, y: 7 },
    core: { x: 0, y: 0 },
    voidTiles: [{ x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 1 }, { x: 4, y: 6 }, { x: 5, y: 3 }, { x: 6, y: 3 }],
    initialTiles: [
      { position: { x: 6, y: 6 }, kind: "relay" },
      { position: { x: 5, y: 5 }, kind: "relay" },
      { position: { x: 4, y: 4 }, kind: "relay" },
      { position: { x: 3, y: 3 }, kind: "relay" },
      { position: { x: 2, y: 2 }, kind: "relay" },
      { position: { x: 1, y: 1 }, kind: "relay" },
      { position: { x: 1, y: 2 }, kind: "turret" },
    ],
    toolsUnlocked: TOOLS,
    waves: [
      wave({ id: 1, label: "Closing Bell", briefing: "All edges open immediately.", grant: 66, count: 9, active: 5, cadence: 6, weights: { rusher: 7, probe: 2, crawler: 1 } }),
      wave({ id: 2, label: "Hard Limit", briefing: "Mixed threats force a layered defense.", grant: 28, count: 12, active: 6, cadence: 5, weights: { rusher: 8, hunter: 2, spoof: 2, crawler: 1 } }),
      wave({ id: 3, label: "Zero Slack", briefing: "Trap charges disappear quickly under a burst.", grant: 27, count: 15, active: 8, cadence: 4, weights: { rusher: 10, splitter: 2, hunter: 2, spoof: 2 } }),
      wave({ id: 4, label: "Final Notice", briefing: "Replace spent traps without severing the route.", grant: 28, count: 18, active: 9, cadence: 4, weights: { rusher: 11, splitter: 3, hunter: 2, crawler: 2 } }),
      wave({ id: 5, label: "Deadline", briefing: "The Goliath is the screen. The Rushers are the breach.", grant: 34, count: 20, active: 10, cadence: 4, weights: { rusher: 12, splitter: 3, hunter: 2, spoof: 2 }, scriptedSpawns: [{ waveTick: 8, kind: "goliath" }] }),
    ],
    difficultyIndex: 245,
    requiredMechanic: "latencyTrap",
  },
] as const;
