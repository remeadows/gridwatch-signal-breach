import type {
  ExpansionEnemyKind,
  ExpansionLevelDefinition,
  ExpansionWaveDefinition,
} from "../../../sim/expansion/types";

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
    // Explicit per-wave rebuild budget. The slower three-tick action policy
    // clears all four seeds without the fast-bot's immediate replacement loop.
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
      sapper: input.weights.sapper ?? 0,
    },
    ...(input.scriptedSpawns ? { scriptedSpawns: input.scriptedSpawns } : {}),
    spawnEdges: input.edges ?? ALL_EDGES,
  };
}

/**
 * Chapter 2 teaches one idea in five escalating boards: a Sapper announces a
 * hardware target, prioritizes reachable Firewalls, and punishes clusters with
 * a one-tile orthogonal pulse when ICE destroys it.
 */
export const CHAPTER_02_LEVELS: readonly ExpansionLevelDefinition[] = [
  {
    id: 6,
    chapterId: 2,
    codename: "STANDOFF",
    tagline: "Give the blast somewhere harmless to land.",
    briefing: "Sappers mark reachable Firewalls first. Keep ICE and relays out of the four tiles beside the likely kill zone.",
    gridSize: 8,
    source: { x: 0, y: 4 },
    core: { x: 7, y: 4 },
    voidTiles: [{ x: 3, y: 1 }, { x: 3, y: 6 }],
    initialTiles: [
      { position: { x: 2, y: 4 }, kind: "relay" },
      { position: { x: 4, y: 4 }, kind: "relay" },
      { position: { x: 6, y: 4 }, kind: "relay" },
      { position: { x: 4, y: 2 }, kind: "firewall" },
      { position: { x: 2, y: 2 }, kind: "turret" },
    ],
    toolsUnlocked: TOOLS,
    waves: [
      wave({ id: 1, label: "Marked Charge", briefing: "One scripted Sapper reveals its Firewall lock. Watch the dashed target line.", grant: 172, count: 9, active: 3, cadence: 10, weights: { probe: 3, rusher: 2 }, edges: ["north"], scriptedSpawns: [{ waveTick: 4, kind: "sapper" }] }),
      wave({ id: 2, label: "Safe Radius", briefing: "Separate the bait Firewall from ICE before the Sapper reaches it.", grant: 144, count: 12, active: 5, cadence: 8, weights: { sapper: 3, probe: 3, rusher: 2 }, edges: ["north", "west"] }),
      wave({ id: 3, label: "Cross Fuse", briefing: "Two entry edges create two possible demolition lanes.", grant: 144, count: 15, active: 6, cadence: 7, weights: { sapper: 4, rusher: 3, crawler: 1 }, edges: ["north", "south"] }),
      wave({ id: 4, label: "Loose Formation", briefing: "Spread important hardware; replace exposed bait between attacks.", grant: 145, count: 18, active: 7, cadence: 6, weights: { sapper: 5, hunter: 2, rusher: 3 }, edges: ["north", "west", "south"] }),
      wave({ id: 5, label: "Standoff", briefing: "Every edge is live. Read each target before the formation closes.", grant: 148, count: 21, active: 8, cadence: 6, weights: { sapper: 6, hunter: 2, rusher: 4 }, edges: ALL_EDGES }),
    ],
    difficultyIndex: 280,
    requiredMechanic: "sapperSpacing",
  },
  {
    id: 7,
    chapterId: 2,
    codename: "DECOUPLER",
    tagline: "One empty tile is armor.",
    briefing: "The split board tempts compact builds. Preserve blast gaps while Rushers pressure the signal spine.",
    gridSize: 8,
    source: { x: 0, y: 1 },
    core: { x: 7, y: 6 },
    voidTiles: [{ x: 2, y: 3 }, { x: 2, y: 4 }, { x: 5, y: 3 }, { x: 6, y: 4 }],
    initialTiles: [
      { position: { x: 2, y: 1 }, kind: "relay" },
      { position: { x: 3, y: 2 }, kind: "relay" },
      { position: { x: 4, y: 3 }, kind: "relay" },
      { position: { x: 5, y: 4 }, kind: "relay" },
      { position: { x: 6, y: 5 }, kind: "relay" },
      { position: { x: 4, y: 6 }, kind: "firewall" },
    ],
    toolsUnlocked: TOOLS,
    waves: [
      wave({ id: 1, label: "Air Gap", briefing: "Use the open pockets as deliberate pulse buffers.", grant: 178, count: 11, active: 5, cadence: 8, weights: { sapper: 4, rusher: 3, probe: 2 }, edges: ["west", "south"] }),
      wave({ id: 2, label: "Hard Coupling", briefing: "Hunters punish hardware that sits outside ICE coverage.", grant: 146, count: 14, active: 6, cadence: 7, weights: { sapper: 5, hunter: 3, rusher: 3 }, edges: ["west", "north", "south"] }),
      wave({ id: 3, label: "Split Rail", briefing: "Spoofs jump walls while Sappers stay committed to them.", grant: 146, count: 17, active: 7, cadence: 6, weights: { sapper: 6, spoof: 3, rusher: 3 }, edges: ALL_EDGES }),
      wave({ id: 4, label: "Cascade Check", briefing: "A pulse cannot chain, but clustered hardware can still vanish together.", grant: 147, count: 20, active: 8, cadence: 5, weights: { sapper: 7, hunter: 3, crawler: 2, rusher: 3 }, edges: ALL_EDGES }),
      wave({ id: 5, label: "Decoupler", briefing: "Maintain two defended lanes and a clean signal spine.", grant: 150, count: 24, active: 10, cadence: 5, weights: { sapper: 8, hunter: 3, spoof: 2, rusher: 4 }, edges: ALL_EDGES }),
    ],
    difficultyIndex: 325,
    requiredMechanic: "sapperSpacing",
  },
  {
    id: 8,
    chapterId: 2,
    codename: "FALSE WALL",
    tagline: "Bait the lock. Defend the real route.",
    briefing: "A reachable Firewall can pull Sappers away from the relay chain. Place bait where its pulse has nothing valuable to hit.",
    gridSize: 8,
    source: { x: 7, y: 1 },
    core: { x: 0, y: 6 },
    voidTiles: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 5 }, { x: 5, y: 5 }],
    initialTiles: [
      { position: { x: 6, y: 2 }, kind: "relay" },
      { position: { x: 5, y: 3 }, kind: "relay" },
      { position: { x: 4, y: 4 }, kind: "relay" },
      { position: { x: 3, y: 5 }, kind: "relay" },
      { position: { x: 2, y: 6 }, kind: "relay" },
      { position: { x: 6, y: 6 }, kind: "firewall" },
      { position: { x: 4, y: 2 }, kind: "turret" },
      { position: { x: 7, y: 4 }, kind: "turret" },
      { position: { x: 5, y: 4 }, kind: "turret" },
      { position: { x: 3, y: 3 }, kind: "turret" },
      { position: { x: 1, y: 3 }, kind: "turret" },
      { position: { x: 3, y: 7 }, kind: "turret" },
    ],
    toolsUnlocked: TOOLS,
    waves: [
      wave({ id: 1, label: "Bait Signal", briefing: "The eastern Firewall is expendable; the diagonal relay chain is not.", grant: 182, count: 13, active: 6, cadence: 7, weights: { sapper: 6, probe: 3, rusher: 3 }, edges: ["east", "south"] }),
      wave({ id: 2, label: "Priority Lock", briefing: "Sappers ignore nearer relays while any reachable Firewall remains.", grant: 148, count: 16, active: 7, cadence: 6, weights: { sapper: 7, hunter: 3, rusher: 3 }, edges: ["east", "north", "south"] }),
      wave({ id: 3, label: "Wall Feint", briefing: "Rebuild bait only when it does not expose the signal chain.", grant: 148, count: 19, active: 8, cadence: 5, weights: { sapper: 8, spoof: 3, rusher: 4 }, edges: ALL_EDGES }),
      wave({ id: 4, label: "Double Bluff", briefing: "Sappers and Hunters choose hardware for different reasons.", grant: 149, count: 23, active: 10, cadence: 5, weights: { sapper: 9, hunter: 4, crawler: 2, rusher: 4 }, edges: ALL_EDGES }),
      wave({ id: 5, label: "False Wall", briefing: "Hold the decoy lane while mixed traffic closes from every edge.", grant: 152, count: 27, active: 11, cadence: 4, weights: { sapper: 10, hunter: 4, spoof: 3, rusher: 5 }, edges: ALL_EDGES }),
    ],
    difficultyIndex: 375,
    requiredMechanic: "sapperSpacing",
  },
  {
    id: 9,
    chapterId: 2,
    codename: "BLAST GRID",
    tagline: "Four neighbors. Four liabilities.",
    briefing: "Tight channels make every orthogonal neighbor count. Stage isolated Firewalls and stagger ICE coverage.",
    gridSize: 8,
    source: { x: 1, y: 7 },
    core: { x: 6, y: 0 },
    voidTiles: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 5 }, { x: 5, y: 2 }, { x: 5, y: 5 }, { x: 5, y: 6 }],
    initialTiles: [
      { position: { x: 2, y: 6 }, kind: "relay" },
      { position: { x: 3, y: 5 }, kind: "relay" },
      { position: { x: 4, y: 4 }, kind: "relay" },
      { position: { x: 5, y: 3 }, kind: "relay" },
      { position: { x: 6, y: 2 }, kind: "relay" },
      { position: { x: 3, y: 1 }, kind: "firewall" },
      { position: { x: 0, y: 4 }, kind: "turret" },
      { position: { x: 7, y: 4 }, kind: "turret" },
      { position: { x: 4, y: 7 }, kind: "turret" },
      { position: { x: 4, y: 0 }, kind: "turret" },
      { position: { x: 1, y: 4 }, kind: "turret" },
    ],
    toolsUnlocked: TOOLS,
    waves: [
      wave({ id: 1, label: "Four Point", briefing: "Inspect every tile beside the targeted Firewall before launch.", grant: 186, count: 15, active: 7, cadence: 6, weights: { sapper: 7, rusher: 4, crawler: 2 }, edges: ["west", "north", "south"] }),
      wave({ id: 2, label: "Blast Lane", briefing: "Corruption reduces the safe pockets available for spacing.", grant: 150, count: 19, active: 8, cadence: 5, weights: { sapper: 8, crawler: 3, hunter: 3, rusher: 4 }, edges: ALL_EDGES }),
      wave({ id: 3, label: "Tight Pattern", briefing: "Splitters increase traffic without changing the Sapper pulse radius.", grant: 150, count: 23, active: 10, cadence: 4, weights: { sapper: 9, splitter: 3, hunter: 3, rusher: 5 }, edges: ALL_EDGES }),
      wave({ id: 4, label: "Grid Shock", briefing: "Keep replacement hardware outside active blast crosses.", grant: 151, count: 27, active: 11, cadence: 4, weights: { sapper: 10, splitter: 3, crawler: 3, rusher: 5 }, edges: ALL_EDGES }),
      wave({ id: 5, label: "Blast Grid", briefing: "High concurrency tests target reading, spacing, and rebuild discipline.", grant: 155, count: 32, active: 13, cadence: 4, weights: { sapper: 12, hunter: 4, splitter: 3, rusher: 6 }, edges: ALL_EDGES }),
    ],
    difficultyIndex: 435,
    requiredMechanic: "sapperSpacing",
  },
  {
    id: 10,
    chapterId: 2,
    codename: "DEMOLITION LINE",
    tagline: "Read the lock before the line collapses.",
    briefing: "The chapter finale mixes hardware-targeting Sappers with durable enemies. Isolate bait, overlap ICE, and preserve a rebuild lane.",
    gridSize: 8,
    source: { x: 0, y: 7 },
    core: { x: 7, y: 0 },
    voidTiles: [{ x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 5 }, { x: 5, y: 5 }, { x: 6, y: 5 }],
    initialTiles: [
      { position: { x: 1, y: 6 }, kind: "relay" },
      { position: { x: 2, y: 5 }, kind: "relay" },
      { position: { x: 3, y: 4 }, kind: "relay" },
      { position: { x: 4, y: 3 }, kind: "relay" },
      { position: { x: 5, y: 2 }, kind: "relay" },
      { position: { x: 6, y: 1 }, kind: "relay" },
      { position: { x: 6, y: 3 }, kind: "firewall" },
      { position: { x: 2, y: 3 }, kind: "turret" },
      { position: { x: 0, y: 3 }, kind: "turret" },
      { position: { x: 7, y: 4 }, kind: "turret" },
      { position: { x: 3, y: 7 }, kind: "turret" },
      { position: { x: 4, y: 0 }, kind: "turret" },
      { position: { x: 1, y: 4 }, kind: "turret" },
    ],
    toolsUnlocked: TOOLS,
    waves: [
      wave({ id: 1, label: "Demo Team", briefing: "Sappers arrive with durable Crawlers. Cover both approaches with ICE.", grant: 192, count: 14, active: 7, cadence: 6, weights: { sapper: 8, crawler: 3, rusher: 4 }, edges: ["west", "north", "east"] }),
      wave({ id: 2, label: "Breach Stack", briefing: "Stacked threats force a choice between delay and spacing.", grant: 152, count: 18, active: 9, cadence: 5, weights: { sapper: 10, hunter: 4, crawler: 3, rusher: 5 }, edges: ALL_EDGES }),
      wave({ id: 3, label: "Cross Charge", briefing: "Spoofs cross walls while Sappers dismantle them.", grant: 152, count: 21, active: 10, cadence: 4, weights: { sapper: 11, spoof: 4, splitter: 3, rusher: 6 }, edges: ALL_EDGES }),
      wave({ id: 4, label: "Heavy Cover", briefing: "A Goliath pressures the route while Sappers dismantle hardware.", grant: 155, count: 24, active: 12, cadence: 4, weights: { sapper: 12, crawler: 3, hunter: 4, rusher: 6 }, edges: ALL_EDGES, scriptedSpawns: [{ waveTick: 8, kind: "goliath" }] }),
      wave({ id: 5, label: "Demolition Line", briefing: "Final hold: isolate the marked target and stop heavy enemies before Core contact.", grant: 160, count: 28, active: 13, cadence: 3, weights: { sapper: 14, hunter: 4, splitter: 4, rusher: 7 }, edges: ALL_EDGES, scriptedSpawns: [{ waveTick: 6, kind: "goliath" }, { waveTick: 24, kind: "goliath" }] }),
    ],
    difficultyIndex: 505,
    requiredMechanic: "sapperSpacing",
  },
] as const;
