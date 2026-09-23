// src/sim/expansion/types.ts
var EXPANSION_RULESET_ID = "expansion-v1";
var EXPANSION_CAMPAIGN_ID = "expansion-1";
var EXPANSION_R3_CONTENT_REVISION = "expansion-1-r3";
var EXPANSION_R4_CONTENT_REVISION = "expansion-1-r4";
var EXPANSION_CONTENT_REVISION = EXPANSION_R4_CONTENT_REVISION;
var EXPANSION_CHAPTER_01_CONTENT_REVISION = "expansion-1-r1";
var EXPANSION_CHAPTER_02_CONTENT_REVISION = "expansion-1-r2";

// src/data/campaigns/expansion/r4/manifest.json
var manifest_default = {
  revision: "expansion-1-r4",
  campaignHash: "8396227a089752e59da3b197530829b91ae039eaeb128ae57209844c2f0838d4",
  levelHashes: {
    "1": "397cb0822d3c6115371b145274b2373fb02c077a53ff037fc989b87e975c8094",
    "2": "5f23fed421eb8966e63e4909002b5dd731401b3d3b5bc6b47f5dbb63539f19da",
    "3": "1c8e72631b9e2b42b27201105aa7dc4504e01f32ce6cf9b086dd4f7b70b5194e",
    "4": "d96230a658f10dbea0f714d0520137b172fa5f33a464b568f625e80256535579",
    "5": "27c9077f08efa1527c0687bc1577b0066b47c3b617fa228e1a618b4cd597448d",
    "6": "4fed73db4ddade83a286bb8a2c8ab2a555c247cccb9990881192fafe2b45ed58",
    "7": "baae50616c4d2b3b62c5b3bce22fa71e576d61ff66ef7bfd8c41a5c3d421016b",
    "8": "ca5b87ca50b2de11b882f280812565647276521657b72293711d32bcf877b58b",
    "9": "d342fd3c0f0a852013050183400587c91a1e9c6f10f2eae180997a26c14ebd8a",
    "10": "2487257ce6fb3dea1d67acd23159b8daaec56c9fb79596ec5600dfb6718f7436",
    "11": "56d24c55cf259cd520e90cf68cce62f4b613e7d79d57b903c7690401f493e2d0",
    "12": "ba149638a13116d9a7b384d48711e131c2c31556b5dc8da44e8152e2d69b8945",
    "13": "2ed063c649b299292a7fbdd32d6be7017fb6fc5fc4432fc82b022d24ec50b241",
    "14": "26386ab1797b6edf9624d9cfc4416918b27f07a6934d5abf7e43a6065cd041a3",
    "15": "74addc1dc5e637d1ebf7d9fc72a90c2ca6234e9a3a890714bc6bf0250332fa29",
    "16": "84646e6e63c042ca8a666ae01d05250f070c169e8f168f082797c40004637ef0",
    "17": "f2c6c82b74ca4cc8892c80ec4df281c6320f2ce096db022c1060517da9285caf",
    "18": "84a4c58e55ae9d101e6cabebe7e8fd1b08e1f09f43b99be1337b90dd894ced64",
    "19": "5fd16a489e890ea53eceda14a6fc82d86e0ac7c826bfce8ded67647057cc2554",
    "20": "5f119adc6567ba3a419cafb4cf94b6b873e261cea1d9ca720d2cb193bf0f6de6",
    "21": "458b287efdb65c90a7bdf41e01a74abdb7588df4c74e09d810bc896d79249fd0",
    "22": "e242a122f877e408ff923b30f925198d90014e16504213c4d79aa2ae51470bf8",
    "23": "a907f8f52b0bca9ed93d244ff68278a27d653beccb554c0394fbab0738b4d7ff",
    "24": "43689f9177ed3560b8aa4ca37ca95c5c4a195124f7f9f61bc6c1544f0c18dd93",
    "25": "8b29d43ab5e8e71c1e0ccfe5a29357146a984057b0c3b2013c572740cefe7291"
  }
};

// src/data/campaigns/expansion/contentManifest.ts
var EXPANSION_CHAPTER_01_CONTENT_MANIFEST = {
  revision: EXPANSION_CHAPTER_01_CONTENT_REVISION,
  campaignHash: "bdf03c4361f59cae61c34466e3c2b90f93c1788c242b99ceb3d5b54f12129a33",
  levelHashes: {
    1: "f35da0796b40ab420ea3f341479f96b1afe3020623cfdb860669a0c0c4cc7aaa",
    2: "5c72a1ce4c8a930292d6038afab3e22c19fe6dd4664e4bcfe8181e24747725cd",
    3: "40141ce01f88b09273dd02e8bacf60319a986a77bbf26922cc68cf1fae24032e",
    4: "159d86b40eb5bb6bbc3f26b05880836279eea1cd7a2d9556472d95b36ad366db",
    5: "ca93798b40d8d69637d5c38349bcb2b227a610b385ad99c21b8fd41ee341a584"
  }
};
var EXPANSION_CHAPTER_02_CONTENT_MANIFEST = {
  revision: EXPANSION_CHAPTER_02_CONTENT_REVISION,
  campaignHash: "c8020a21a276d35837bc13766d38d611a2e9499b71a3836b8d3803cc4dbd4796",
  levelHashes: {
    ...EXPANSION_CHAPTER_01_CONTENT_MANIFEST.levelHashes,
    6: "9b97bd2f40a3da0f10df8f52be8908450c3071934830c6d2cf1596dc132f6917",
    7: "ab072f4b3bc463c1bd2f6552eada8b5ff2f204e4b2304aef151e0d4874d36fbc",
    8: "9ae65b56441e702a9ec6bca6e3d8402c9e7fe4fc1164579194474c43e2c329da",
    9: "b1689464bc53d69c9fb5462b897ea74d39f3eec6918a22dc5953210cc6b88189",
    10: "91284b14429bd25c626eea8e1925f2ff0b367fead03b0bd7a894cfc5a8782449"
  }
};
var EXPANSION_R3_CONTENT_MANIFEST = {
  revision: EXPANSION_R3_CONTENT_REVISION,
  campaignHash: "df1b0920da63f189bd7c83f745b4a511877db6162f3f92f47ee0afdc0eb58957",
  levelHashes: {
    ...EXPANSION_CHAPTER_02_CONTENT_MANIFEST.levelHashes,
    11: "4d179d245bdaff8972de44ce4aef0d95649a0c087e5670de097a33a6498e8c01",
    12: "faffd83329928d5d9a02c1862c64189a8d41246cf708e6462e0b66f7809dbe85",
    13: "f2fb1fb4513914141f85f5a80621ccd9fcb3a516f1285a6ef0e23fc776c9b967",
    14: "eaea3b61081c0747716fe83d9b197efa9b1911703112c10a2fa09c98eab62751",
    15: "3ee45632978317eae12d8fae7b88f72c1d6d1905e124a7437f81e1e9048a1ec6"
  }
};
var EXPANSION_CONTENT_MANIFEST = { ...manifest_default, revision: EXPANSION_CONTENT_REVISION };
var REVISION_MANIFESTS = {
  [EXPANSION_CHAPTER_01_CONTENT_REVISION]: EXPANSION_CHAPTER_01_CONTENT_MANIFEST,
  [EXPANSION_CHAPTER_02_CONTENT_REVISION]: EXPANSION_CHAPTER_02_CONTENT_MANIFEST,
  [EXPANSION_R3_CONTENT_REVISION]: EXPANSION_R3_CONTENT_MANIFEST,
  [EXPANSION_CONTENT_REVISION]: EXPANSION_CONTENT_MANIFEST
};
function getExpansionContentManifest(revision) {
  if (!Object.prototype.hasOwnProperty.call(REVISION_MANIFESTS, revision)) {
    throw new Error(`Unknown expansion content revision: ${revision}.`);
  }
  return REVISION_MANIFESTS[revision];
}
function getExpansionLevelContentHash(levelId, revision = EXPANSION_CONTENT_REVISION) {
  const manifest = getExpansionContentManifest(revision);
  const hash = Number.isInteger(levelId) ? manifest.levelHashes[levelId] : void 0;
  if (!hash) throw new Error(`No content hash for expansion level ${levelId} in ${revision}.`);
  return hash;
}

// src/leaderboard/expansionScoreProtocol.ts
var EXPANSION_SCORE_REVISION = "expansion-1-r4";
var EXPANSION_SCORE_UNITS = ["relay", "firewall", "turret", "scrubber", "overclock", "latencyTrap", "arcIce"];
var ExpansionScoreError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ExpansionScoreError";
  }
};
function expansionScoreCategory(level) {
  if (!Number.isInteger(level) || level < 1 || level > 25) throw new ExpansionScoreError("Invalid expansion level.");
  return `expansion-v1:expansion-1-r4:level:${level}`;
}
function canonicalExpansionScoreReplay(raw) {
  if (!record(raw) || "sector" in raw || raw.schema !== 2 || raw.ruleset !== "expansion-v1" || raw.campaign !== "expansion-1") fail("Invalid expansion replay identity.");
  if (raw.contentRevision !== EXPANSION_SCORE_REVISION) fail("Expansion content is not published.");
  const level = raw.level;
  if (typeof level !== "number") fail("Invalid expansion level.");
  expansionScoreCategory(level);
  if (raw.contentHash !== getExpansionLevelContentHash(level, EXPANSION_SCORE_REVISION)) fail("Expansion content hash mismatch.");
  if (typeof raw.seed !== "string" || raw.seed.length < 1 || raw.seed.length > 200) fail("Invalid seed.");
  if (!Array.isArray(raw.commands) || raw.commands.length > 5e3) fail("Invalid or oversized command log.");
  let previous = 0;
  const commands = raw.commands.map((entry) => {
    if (!record(entry) || typeof entry.t !== "number" || !Number.isInteger(entry.t) || entry.t < previous || entry.t > 12e3 || !record(entry.c)) fail("Invalid command tick or order.");
    previous = entry.t;
    const c = entry.c;
    if (c.type === "skipPrep") return { t: entry.t, c: { type: "skipPrep" } };
    if (c.type !== "placeUnit" && c.type !== "sellUnit") fail("Invalid command type.");
    if (!record(c.position) || !coordinate(c.position.x) || !coordinate(c.position.y)) fail("Invalid command position.");
    const position = { x: c.position.x, y: c.position.y };
    if (c.type === "sellUnit") return { t: entry.t, c: { type: "sellUnit", position } };
    if (!EXPANSION_SCORE_UNITS.some((unit2) => unit2 === c.unit)) fail("Invalid expansion unit.");
    return { t: entry.t, c: { type: "placeUnit", position, unit: c.unit } };
  });
  return {
    schema: 2,
    ruleset: "expansion-v1",
    campaign: "expansion-1",
    contentRevision: EXPANSION_SCORE_REVISION,
    level,
    contentHash: raw.contentHash,
    seed: raw.seed,
    commands
  };
}
function record(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function coordinate(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 8;
}
function fail(message) {
  throw new ExpansionScoreError(message);
}

// src/sim/expansion/capabilities.ts
var CAPABILITIES = {
  relay: {
    carriesSignal: true,
    blocksMovement: true,
    targetable: true,
    chewable: true,
    corruptible: true,
    traversable: false
  },
  firewall: {
    carriesSignal: true,
    blocksMovement: true,
    targetable: false,
    chewable: true,
    corruptible: false,
    traversable: false
  },
  turret: {
    carriesSignal: false,
    blocksMovement: true,
    targetable: true,
    chewable: true,
    corruptible: true,
    traversable: false
  },
  arcIce: {
    carriesSignal: false,
    blocksMovement: true,
    targetable: true,
    chewable: true,
    corruptible: true,
    traversable: false
  },
  scrubber: {
    carriesSignal: false,
    blocksMovement: true,
    targetable: true,
    chewable: true,
    corruptible: true,
    traversable: false
  },
  overclock: {
    carriesSignal: false,
    blocksMovement: true,
    targetable: true,
    chewable: true,
    corruptible: true,
    traversable: false
  },
  latencyTrap: {
    carriesSignal: false,
    blocksMovement: false,
    targetable: false,
    chewable: false,
    corruptible: false,
    traversable: true
  }
};
function getExpansionHardwareCapabilities(kind) {
  return CAPABILITIES[kind];
}
function isExpansionHardwareKind(value) {
  return Object.prototype.hasOwnProperty.call(CAPABILITIES, value);
}
function isTargetableExpansionHardwareKind(kind) {
  return CAPABILITIES[kind].targetable;
}

// src/sim/expansion/grid.ts
var ORTHOGONAL_DELTAS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 }
];
function createExpansionGrid(size) {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error("Expansion grid size must be a positive integer.");
  }
  return {
    size,
    tiles: Array.from({ length: size * size }, () => ({ kind: "empty" }))
  };
}
function isExpansionInBounds(grid, position) {
  return Number.isInteger(position.x) && Number.isInteger(position.y) && position.x >= 0 && position.y >= 0 && position.x < grid.size && position.y < grid.size;
}
function getExpansionTile(grid, position) {
  return grid.tiles[toExpansionIndex(grid, position)];
}
function getExpansionTileKind(grid, position) {
  return getExpansionTile(grid, position).kind;
}
function setExpansionTile(grid, position, tile) {
  assertExpansionInBounds(grid, position);
  const tiles2 = [...grid.tiles];
  tiles2[toExpansionIndex(grid, position)] = tile;
  return { ...grid, tiles: tiles2 };
}
function setExpansionTileKind(grid, position, kind) {
  return setExpansionTile(grid, position, { kind });
}
function listExpansionPositions(grid) {
  const positions = [];
  for (let y = 0; y < grid.size; y += 1) {
    for (let x = 0; x < grid.size; x += 1) {
      positions.push({ x, y });
    }
  }
  return positions;
}
function getExpansionPositionsByKind(grid, kind) {
  return listExpansionPositions(grid).filter(
    (position) => getExpansionTileKind(grid, position) === kind
  );
}
function getExpansionOrthogonalNeighbors(grid, position) {
  return ORTHOGONAL_DELTAS.map((delta) => ({
    x: position.x + delta.x,
    y: position.y + delta.y
  })).filter((neighbor) => isExpansionInBounds(grid, neighbor));
}
function getExpansionPerimeterPositions(grid) {
  return listExpansionPositions(grid).filter(
    (position) => position.x === 0 || position.y === 0 || position.x === grid.size - 1 || position.y === grid.size - 1
  );
}
function isExpansionPerimeter(grid, position) {
  return position.x === 0 || position.y === 0 || position.x === grid.size - 1 || position.y === grid.size - 1;
}
function expansionManhattanDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
function sameExpansionPosition(a, b) {
  return a.x === b.x && a.y === b.y;
}
function expansionPositionKey(position) {
  return `${position.x},${position.y}`;
}
function sortExpansionPositions(positions) {
  return [...positions].sort((a, b) => a.y - b.y || a.x - b.x);
}
function assertExpansionInBounds(grid, position) {
  if (!isExpansionInBounds(grid, position)) {
    throw new Error(`Expansion grid position out of bounds: ${expansionPositionKey(position)}.`);
  }
}
function toExpansionIndex(grid, position) {
  assertExpansionInBounds(grid, position);
  return position.y * grid.size + position.x;
}

// src/sim/pathing.ts
function bfs(options) {
  const queue = [options.start];
  const startKey = options.toKey(options.start);
  const cameFrom = /* @__PURE__ */ new Map([[startKey, null]]);
  const nodesByKey = /* @__PURE__ */ new Map([[startKey, options.start]]);
  for (let readIndex = 0; readIndex < queue.length; readIndex += 1) {
    const current = queue[readIndex];
    const currentKey = options.toKey(current);
    if (options.isGoal(current)) {
      return reconstructPath(currentKey, cameFrom, nodesByKey);
    }
    for (const neighbor of options.getNeighbors(current)) {
      const neighborKey = options.toKey(neighbor);
      if (cameFrom.has(neighborKey)) {
        continue;
      }
      cameFrom.set(neighborKey, currentKey);
      nodesByKey.set(neighborKey, neighbor);
      queue.push(neighbor);
    }
  }
  return null;
}
function reconstructPath(goalKey, cameFrom, nodesByKey) {
  const reversedPath = [];
  let currentKey = goalKey;
  while (currentKey !== null) {
    const node = nodesByKey.get(currentKey);
    if (!node) {
      throw new Error(`BFS path reconstruction lost node ${currentKey}.`);
    }
    reversedPath.push(node);
    currentKey = cameFrom.get(currentKey) ?? null;
  }
  return reversedPath.reverse();
}

// src/sim/rng.ts
var FNV_OFFSET_BASIS = 2166136261;
var FNV_PRIME = 16777619;
var UINT32_RANGE = 4294967296;
var FALLBACK_NONZERO_SEED = 2779096485;
function createRng(seed) {
  return {
    seed: String(seed),
    state: hashSeed(String(seed))
  };
}
function nextUint32(rng) {
  let nextState = rng.state;
  nextState += 1831565813;
  let mixed = nextState;
  mixed = Math.imul(mixed ^ mixed >>> 15, mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ mixed >>> 7, mixed | 61);
  const value = (mixed ^ mixed >>> 14) >>> 0;
  return {
    rng: {
      seed: rng.seed,
      state: nextState >>> 0
    },
    value
  };
}
function nextFloat(rng) {
  const next = nextUint32(rng);
  return {
    rng: next.rng,
    value: next.value / UINT32_RANGE
  };
}
function nextInt(rng, minInclusive, maxExclusive) {
  if (!Number.isInteger(minInclusive) || !Number.isInteger(maxExclusive)) {
    throw new Error("nextInt bounds must be integers.");
  }
  if (maxExclusive <= minInclusive) {
    throw new Error("nextInt maxExclusive must be greater than minInclusive.");
  }
  const next = nextFloat(rng);
  return {
    rng: next.rng,
    value: Math.floor(next.value * (maxExclusive - minInclusive)) + minInclusive
  };
}
function hashSeed(seed) {
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0 || FALLBACK_NONZERO_SEED;
}

// src/data/taunts.ts
var ANTAGONIST_TAUNTS = [
  "Your lattice is readable from orbit.",
  "Every relay is another place to bleed.",
  "I only need one corrupted tile.",
  "Single-lane defense is a confession.",
  "The Core already answered my handshake.",
  "Your walls are a chew toy.",
  "Double the wall. Double the bill.",
  "Route around me. I will route around you.",
  "I don't want your route. I want your toys.",
  "Split the packet. Split your focus."
];

// src/sim/expansion/waves.ts
function getCurrentExpansionWave(state) {
  const wave4 = state.config.waves[state.waveIndex];
  if (!wave4) throw new Error(`Missing expansion wave at index ${state.waveIndex}.`);
  return wave4;
}
function startExpansionPrepPhase(state, waveIndex) {
  const wave4 = state.config.waves[waveIndex];
  if (!wave4) {
    return { ...state, phase: "won", waveTick: 0, prepTicksRemaining: 0, activeTaunt: "", waveSpawnedCount: 0, waveScriptedSpawnIndex: 0, events: [] };
  }
  const pick = nextInt(state.rng, 0, ANTAGONIST_TAUNTS.length);
  return {
    ...state,
    rng: pick.rng,
    phase: "prep",
    waveIndex,
    waveTick: 0,
    prepTicksRemaining: wave4.prepTicks,
    activeTaunt: ANTAGONIST_TAUNTS[pick.value],
    bandwidth: state.bandwidth + wave4.bandwidthGrant,
    waveSpawnedCount: 0,
    waveScriptedSpawnIndex: 0
  };
}
function startExpansionActivePhase(state) {
  if (state.phase !== "prep") return state;
  return { ...state, phase: "active", waveTick: 0, prepTicksRemaining: 0, events: [] };
}
function isCurrentExpansionWaveComplete(state) {
  const wave4 = getCurrentExpansionWave(state);
  return state.waveSpawnedCount >= wave4.maxSpawnedIntrusions && state.intrusions.length === 0;
}
function isFinalExpansionWave(state) {
  return state.waveIndex >= state.config.waves.length - 1;
}

// src/sim/expansion/intrusions.ts
var ENEMY_ORDER = ["probe", "crawler", "spoof", "hunter", "splitter", "goliath", "rusher", "sapper", "shieldDrone"];
var JUMP_DELTAS = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
function spawnExpansionIntrusions(state) {
  if (state.phase !== "active") return state;
  let next = spawnScripted(state);
  if (!shouldCadenceSpawn(next)) return next;
  const pick = pickKind(next);
  next = { ...next, rng: pick.rng };
  const definition = next.config.enemies[pick.kind];
  const wave4 = getCurrentExpansionWave(next);
  for (let index = 0; index < definition.spawnBatchSize; index += 1) {
    if (next.intrusions.length >= wave4.maxActiveIntrusions || next.waveSpawnedCount >= getCadenceSpawnLimit(next)) break;
    const positionPick = pickSpawnPosition(next);
    next = { ...next, rng: positionPick.rng };
    if (!positionPick.position) break;
    next = spawnAt(next, pick.kind, positionPick.position, true);
  }
  return next;
}
function moveExpansionIntrusions(state) {
  const targets = getTargetSets(state);
  let grid = state.grid;
  let events = state.events;
  const intrusions = [];
  for (const intrusion of [...state.intrusions].sort((a, b) => a.id - b.id)) {
    const definition = state.config.enemies[intrusion.kind];
    if (state.tickCount - intrusion.lastMoveTick < definition.moveEveryTicks) {
      intrusions.push({ ...intrusion, previousPosition: intrusion.position });
      continue;
    }
    const working = { ...state, grid, events };
    if (intrusion.kind === "sapper") {
      const target = getExpansionSapperTarget(working, intrusion);
      const nextPosition2 = target?.path[1];
      if (!target || !nextPosition2) {
        intrusions.push({ ...intrusion, previousPosition: intrusion.position, lastMoveTick: state.tickCount });
        continue;
      }
      const kind2 = getExpansionTileKind(grid, nextPosition2);
      if (isExpansionHardwareKind(kind2) && kind2 !== "latencyTrap") {
        const attacked = attackHardware(working, grid, events, intrusion, definition, nextPosition2, kind2, false);
        grid = attacked.grid;
        events = attacked.events;
        intrusions.push({ ...intrusion, previousPosition: intrusion.position, lastMoveTick: state.tickCount, corruption: null });
        continue;
      }
      events = [...events, moveEvent(state, intrusion, nextPosition2)];
      intrusions.push(moved(state, intrusion, nextPosition2));
      continue;
    }
    const targetPositions = definition.targeting === "units" && targets.units.length > 0 ? targets.units : targets.route;
    const path = findPath(working, intrusion, targetPositions, false);
    if (path && path.length >= 2) {
      const to = path[1];
      events = [...events, moveEvent(state, intrusion, to)];
      intrusions.push(moved(state, intrusion, to));
      continue;
    }
    const breach = findPath(working, intrusion, targetPositions, true);
    if (!breach || breach.length < 2) {
      intrusions.push({ ...intrusion, previousPosition: intrusion.position, lastMoveTick: state.tickCount });
      continue;
    }
    const nextPosition = breach[1];
    const kind = getExpansionTileKind(grid, nextPosition);
    if (isExpansionHardwareKind(kind) && getExpansionHardwareCapabilities(kind).chewable) {
      const attacked = attackHardware(working, grid, events, intrusion, definition, nextPosition, kind);
      grid = attacked.grid;
      events = attacked.events;
      intrusions.push({ ...intrusion, previousPosition: intrusion.position, lastMoveTick: state.tickCount, corruption: null });
      continue;
    }
    events = [...events, moveEvent(state, intrusion, nextPosition)];
    intrusions.push(moved(state, intrusion, nextPosition));
  }
  return { ...state, grid, events, intrusions };
}
function getExpansionSapperTarget(state, intrusion) {
  if (intrusion.kind !== "sapper") return null;
  const positions = listExpansionPositions(state.grid);
  const firewalls = positions.filter((position) => getExpansionTileKind(state.grid, position) === "firewall");
  const preferred = selectReachableSapperHardware(state, intrusion, firewalls);
  if (preferred) return preferred;
  const hardware = positions.filter((position) => {
    const kind = getExpansionTileKind(state.grid, position);
    return isExpansionHardwareKind(kind) && kind !== "firewall" && kind !== "latencyTrap" && isTargetableExpansionHardwareKind(kind);
  });
  const fallback = selectReachableSapperHardware(state, intrusion, hardware);
  if (fallback) return fallback;
  const path = findPath(state, intrusion, [state.config.core], false);
  return path ? { kind: "core", position: state.config.core, path } : null;
}
function selectReachableSapperHardware(state, intrusion, positions) {
  const candidates = positions.flatMap((position) => {
    const path = findPath(state, intrusion, [position], false);
    if (!path) return [];
    const kind = getExpansionTileKind(state.grid, position);
    if (!isExpansionHardwareKind(kind)) return [];
    return [{ kind, position, path }];
  });
  candidates.sort((left, right) => left.path.length - right.path.length || left.position.y - right.position.y || left.position.x - right.position.x);
  return candidates[0] ?? null;
}
function spawnScripted(state) {
  const entries = getCurrentExpansionWave(state).scriptedSpawns ?? [];
  let next = state;
  while (next.waveScriptedSpawnIndex < entries.length) {
    const entry = entries[next.waveScriptedSpawnIndex];
    if (!entry || entry.waveTick > next.waveTick) break;
    const wave4 = getCurrentExpansionWave(next);
    if (next.waveSpawnedCount >= wave4.maxSpawnedIntrusions || next.intrusions.length >= wave4.maxActiveIntrusions) break;
    const pick = pickSpawnPosition(next);
    next = { ...next, rng: pick.rng };
    if (!pick.position) break;
    next = {
      ...spawnAt(next, entry.kind, pick.position, true),
      waveScriptedSpawnIndex: next.waveScriptedSpawnIndex + 1
    };
  }
  return next;
}
function spawnAt(state, kind, position, count) {
  const definition = state.config.enemies[kind];
  const intrusion = {
    id: state.nextIntrusionId,
    kind,
    hp: definition.maxHp,
    maxHp: definition.maxHp,
    position,
    previousPosition: position,
    spawnedTick: state.tickCount,
    lastMoveTick: state.tickCount,
    corruption: null
  };
  return {
    ...state,
    intrusions: [...state.intrusions, intrusion],
    nextIntrusionId: state.nextIntrusionId + 1,
    spawnedIntrusionCount: state.spawnedIntrusionCount + 1,
    waveSpawnedCount: state.waveSpawnedCount + (count ? 1 : 0),
    events: [...state.events, { type: "intrusionSpawned", tick: state.tickCount, intrusionId: intrusion.id, kind, position }]
  };
}
function shouldCadenceSpawn(state) {
  const wave4 = getCurrentExpansionWave(state);
  return state.waveTick >= wave4.spawnFirstTick && state.waveSpawnedCount < getCadenceSpawnLimit(state) && state.intrusions.length < wave4.maxActiveIntrusions && totalWeight(wave4.enemyWeights) > 0 && (state.waveTick - wave4.spawnFirstTick) % wave4.spawnEveryTicks === 0;
}
function getCadenceSpawnLimit(state) {
  const wave4 = getCurrentExpansionWave(state);
  const remainingScriptedSpawns = Math.max(
    0,
    (wave4.scriptedSpawns?.length ?? 0) - state.waveScriptedSpawnIndex
  );
  return Math.max(0, wave4.maxSpawnedIntrusions - remainingScriptedSpawns);
}
function pickKind(state) {
  const weights = getCurrentExpansionWave(state).enemyWeights;
  const pick = nextInt(state.rng, 0, totalWeight(weights));
  let cursor = pick.value;
  for (const kind of ENEMY_ORDER) {
    cursor -= weights[kind] ?? 0;
    if (cursor < 0) return { rng: pick.rng, kind };
  }
  return { rng: pick.rng, kind: "rusher" };
}
function totalWeight(weights) {
  return ENEMY_ORDER.reduce((total, kind) => total + (weights[kind] ?? 0), 0);
}
function pickSpawnPosition(state) {
  const candidates = getOpenExpansionSpawnPositions(state).filter(
    (position) => !state.intrusions.some((intrusion) => sameExpansionPosition(intrusion.position, position))
  );
  if (candidates.length === 0) return { rng: state.rng, position: null };
  const pick = nextInt(state.rng, 0, candidates.length);
  return { rng: pick.rng, position: candidates[pick.value] };
}
function getOpenExpansionSpawnPositions(state, spawnEdges = getCurrentExpansionWave(state).spawnEdges) {
  return sortExpansionPositions(getExpansionPerimeterPositions(state.grid).filter(
    (position) => spawnEdges.some((edge) => isPositionOnSpawnEdge(state.grid.size, position, edge)) && isOpenSpawnPosition(state, position)
  ));
}
function isOpenSpawnPosition(state, position) {
  return !sameExpansionPosition(position, state.config.source) && !sameExpansionPosition(position, state.config.core) && getExpansionTileKind(state.grid, position) === "empty";
}
function isPositionOnSpawnEdge(gridSize, position, edge) {
  if (edge === "north") return position.y === 0;
  if (edge === "east") return position.x === gridSize - 1;
  if (edge === "south") return position.y === gridSize - 1;
  return position.x === 0;
}
function getTargetSets(state) {
  const units = sortExpansionPositions(listExpansionPositions(state.grid).filter((position) => {
    const kind = getExpansionTileKind(state.grid, position);
    return isExpansionHardwareKind(kind) && isTargetableExpansionHardwareKind(kind);
  }));
  const route = state.signal.route.filter(
    (position) => !sameExpansionPosition(position, state.config.source) && !sameExpansionPosition(position, state.config.core) && getExpansionTileKind(state.grid, position) !== "firewall"
  );
  return { route: route.length > 0 ? route : [state.config.core], units };
}
function findPath(state, intrusion, targets, allowHardware) {
  const targetKeys = new Set(targets.map(expansionPositionKey));
  return bfs({
    start: intrusion.position,
    isGoal: (position) => targetKeys.has(expansionPositionKey(position)),
    getNeighbors: (position) => neighbors(state, intrusion.kind, position, targetKeys, allowHardware),
    toKey: expansionPositionKey
  });
}
function neighbors(state, enemy, position, targets, allowHardware) {
  const normal = getExpansionOrthogonalNeighbors(state.grid, position).filter((candidate) => canEnter(state, candidate, targets, allowHardware));
  if (enemy !== "spoof") return normal;
  const jumps = JUMP_DELTAS.map((delta) => ({
    blocker: { x: position.x + delta.x, y: position.y + delta.y },
    landing: { x: position.x + delta.x * 2, y: position.y + delta.y * 2 }
  })).filter(({ blocker, landing }) => isExpansionInBounds(state.grid, blocker) && isExpansionInBounds(state.grid, landing) && isBlocker(state, blocker, targets) && canEnter(state, landing, targets, false)).map(({ landing }) => landing);
  return [...normal, ...jumps];
}
function canEnter(state, position, targets, allowHardware) {
  const kind = getExpansionTileKind(state.grid, position);
  if (kind === "void") return false;
  if (targets.has(expansionPositionKey(position))) return true;
  if (kind === "empty" || kind === "corrupted" || kind === "latencyTrap") return true;
  return allowHardware && isExpansionHardwareKind(kind) && getExpansionHardwareCapabilities(kind).chewable;
}
function isBlocker(state, position, targets) {
  if (targets.has(expansionPositionKey(position))) return false;
  const kind = getExpansionTileKind(state.grid, position);
  return isExpansionHardwareKind(kind) && getExpansionHardwareCapabilities(kind).blocksMovement;
}
function attackHardware(state, grid, events, intrusion, definition, position, unitKind, corruptOnDestroy = true) {
  const tile = getExpansionTile(grid, position);
  const fallback = state.config.units[unitKind].hp ?? 0;
  const hp = Math.max(0, (tile.hp ?? fallback) - definition.chewDamage);
  if (unitKind === "latencyTrap") return { grid, events };
  const event = { type: "unitDamaged", tick: state.tickCount, intrusionId: intrusion.id, position, unitKind, hp };
  return hp <= 0 ? corruptOnDestroy ? { grid: setExpansionTile(grid, position, { kind: "corrupted" }), events: [...events, event, { type: "tileCorrupted", tick: state.tickCount, intrusionId: intrusion.id, position }] } : { grid: setExpansionTile(grid, position, { kind: "empty" }), events: [...events, event, { type: "hardwareDestroyed", tick: state.tickCount, intrusionId: intrusion.id, position, unitKind, cause: "chew" }] } : { grid: setExpansionTile(grid, position, { ...tile, hp }), events: [...events, event] };
}
function moveEvent(state, intrusion, to) {
  return { type: "intrusionMoved", tick: state.tickCount, intrusionId: intrusion.id, from: intrusion.position, to, jumped: Math.abs(to.x - intrusion.position.x) + Math.abs(to.y - intrusion.position.y) > 1 };
}
function moved(state, intrusion, position) {
  return { ...intrusion, previousPosition: intrusion.position, position, lastMoveTick: state.tickCount, corruption: null };
}

// src/data/campaigns/expansion/chapter01.ts
var INTRO_TOOLS = ["relay", "firewall", "turret", "latencyTrap", "sell"];
var TOOLS = ["relay", "firewall", "turret", "scrubber", "latencyTrap", "sell"];
var ALL_EDGES = ["west", "north", "east", "south"];
function wave(input) {
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
      rusher: input.weights.rusher ?? 0
    },
    ...input.scriptedSpawns ? { scriptedSpawns: input.scriptedSpawns } : {},
    spawnEdges: input.edges ?? ALL_EDGES
  };
}
var CHAPTER_01_LEVELS = [
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
      { position: { x: 3, y: 3 }, kind: "turret" }
    ],
    toolsUnlocked: INTRO_TOOLS,
    waves: [
      wave({ id: 1, label: "Quick Ping", briefing: "One Rusher. Trap the center lane.", grant: 48, count: 2, active: 1, cadence: 11, weights: { rusher: 4, probe: 2 }, edges: ["west"] }),
      wave({ id: 2, label: "Double Time", briefing: "Two lanes probe the route.", grant: 19, count: 4, active: 2, cadence: 9, weights: { rusher: 5, probe: 3 }, edges: ["west", "north"] }),
      wave({ id: 3, label: "Redline", briefing: "Rushers arrive closer together.", grant: 18, count: 5, active: 3, cadence: 7, weights: { rusher: 6, probe: 2 }, edges: ["west", "north"] }),
      wave({ id: 4, label: "Mixed Clock", briefing: "A Crawler screens the fast lane.", grant: 18, count: 6, active: 3, cadence: 7, weights: { rusher: 5, probe: 2, crawler: 1 }, edges: ["west", "north", "south"] }),
      wave({ id: 5, label: "Latency Check", briefing: "Hold every edge and keep the signal live.", grant: 20, count: 8, active: 4, cadence: 6, weights: { rusher: 6, probe: 2, crawler: 1 }, edges: ALL_EDGES })
    ],
    difficultyIndex: 110,
    requiredMechanic: "latencyTrap"
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
      { position: { x: 6, y: 2 }, kind: "relay" }
    ],
    toolsUnlocked: TOOLS,
    waves: [
      wave({ id: 1, label: "Hairpin", briefing: "West and south entries test the bend.", grant: 45, count: 4, active: 2, cadence: 9, weights: { rusher: 4, probe: 3 }, edges: ["west", "south"] }),
      wave({ id: 2, label: "Blind Corner", briefing: "Spoofs skip a wall; traps still catch their landing.", grant: 22, count: 6, active: 3, cadence: 8, weights: { rusher: 4, spoof: 2, probe: 2 }, edges: ["west", "north", "south"] }),
      wave({ id: 3, label: "Cross Traffic", briefing: "Pressure now comes from both ends.", grant: 20, count: 7, active: 4, cadence: 7, weights: { rusher: 5, probe: 2, crawler: 1 }, edges: ALL_EDGES }),
      wave({ id: 4, label: "Fast Detour", briefing: "Protect the route without sealing every lane.", grant: 20, count: 9, active: 5, cadence: 6, weights: { rusher: 6, spoof: 2, crawler: 1 }, edges: ALL_EDGES }),
      wave({ id: 5, label: "Switchback Surge", briefing: "Layer traps; a single charge line will not hold.", grant: 22, count: 11, active: 5, cadence: 5, weights: { rusher: 7, spoof: 2, crawler: 2 }, edges: ALL_EDGES })
    ],
    difficultyIndex: 135,
    requiredMechanic: "latencyTrap"
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
      { position: { x: 2, y: 1 }, kind: "relay" }
    ],
    toolsUnlocked: TOOLS,
    waves: [
      wave({ id: 1, label: "Echo Pair", briefing: "Rushers cross the board diagonally.", grant: 50, count: 6, active: 3, cadence: 8, weights: { rusher: 5, probe: 2 }, edges: ["east", "south"] }),
      wave({ id: 2, label: "Hunter Noise", briefing: "A Hunter targets hardware while Rushers seek signal.", grant: 24, count: 7, active: 4, cadence: 7, weights: { rusher: 5, hunter: 2, probe: 1 }, edges: ["west", "east", "south"] }),
      wave({ id: 3, label: "Phase Collision", briefing: "Spoofs and Rushers attack different assumptions.", grant: 22, count: 9, active: 5, cadence: 6, weights: { rusher: 6, hunter: 2, spoof: 2 }, edges: ALL_EDGES }),
      wave({ id: 4, label: "Noisy Channel", briefing: "Use firewalls to buy time for trap reloads.", grant: 22, count: 11, active: 6, cadence: 5, weights: { rusher: 7, hunter: 2, crawler: 2 }, edges: ALL_EDGES }),
      wave({ id: 5, label: "Crosstalk Storm", briefing: "The route is the target. Build defense in depth.", grant: 24, count: 13, active: 6, cadence: 5, weights: { rusher: 8, hunter: 2, spoof: 2, crawler: 1 }, edges: ALL_EDGES })
    ],
    difficultyIndex: 165,
    requiredMechanic: "latencyTrap"
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
      { position: { x: 6, y: 5 }, kind: "relay" }
    ],
    toolsUnlocked: TOOLS,
    waves: [
      wave({ id: 1, label: "Hot Lane", briefing: "Fast pressure with little room to reroute.", grant: 58, count: 7, active: 4, cadence: 7, weights: { rusher: 6, crawler: 2 }, edges: ["west", "north"] }),
      wave({ id: 2, label: "Split Clock", briefing: "A Splitter seeds extra probes on death.", grant: 26, count: 9, active: 5, cadence: 6, weights: { rusher: 6, splitter: 2, probe: 1 }, edges: ["west", "north", "south"] }),
      wave({ id: 3, label: "Packet Burst", briefing: "Short cadence punishes uncovered approaches.", grant: 24, count: 12, active: 6, cadence: 5, weights: { rusher: 8, splitter: 2, spoof: 2 }, edges: ALL_EDGES }),
      wave({ id: 4, label: "Heat Sink", briefing: "Stagger traps instead of stacking one tile.", grant: 24, count: 14, active: 7, cadence: 4, weights: { rusher: 9, splitter: 2, hunter: 2, crawler: 1 }, edges: ALL_EDGES }),
      wave({ id: 5, label: "Alley Burn", briefing: "Keep enough bandwidth to replace spent traps live.", grant: 27, count: 16, active: 8, cadence: 4, weights: { rusher: 10, splitter: 3, hunter: 2, spoof: 2 }, edges: ALL_EDGES })
    ],
    difficultyIndex: 200,
    requiredMechanic: "latencyTrap"
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
      { position: { x: 1, y: 2 }, kind: "turret" }
    ],
    toolsUnlocked: TOOLS,
    waves: [
      wave({ id: 1, label: "Closing Bell", briefing: "All edges open immediately.", grant: 66, count: 9, active: 5, cadence: 6, weights: { rusher: 7, probe: 2, crawler: 1 } }),
      wave({ id: 2, label: "Hard Limit", briefing: "Mixed threats force a layered defense.", grant: 28, count: 12, active: 6, cadence: 5, weights: { rusher: 8, hunter: 2, spoof: 2, crawler: 1 } }),
      wave({ id: 3, label: "Zero Slack", briefing: "Trap charges disappear quickly under a burst.", grant: 27, count: 15, active: 8, cadence: 4, weights: { rusher: 10, splitter: 2, hunter: 2, spoof: 2 } }),
      wave({ id: 4, label: "Final Notice", briefing: "Replace spent traps without severing the route.", grant: 28, count: 18, active: 9, cadence: 4, weights: { rusher: 11, splitter: 3, hunter: 2, crawler: 2 } }),
      wave({ id: 5, label: "Deadline", briefing: "The Goliath is the screen. The Rushers are the breach.", grant: 34, count: 20, active: 10, cadence: 4, weights: { rusher: 12, splitter: 3, hunter: 2, spoof: 2 }, scriptedSpawns: [{ waveTick: 8, kind: "goliath" }] })
    ],
    difficultyIndex: 245,
    requiredMechanic: "latencyTrap"
  }
];

// src/data/campaigns/expansion/chapter02.ts
var TOOLS2 = ["relay", "firewall", "turret", "scrubber", "latencyTrap", "sell"];
var ALL_EDGES2 = ["west", "north", "east", "south"];
function wave2(input) {
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
      sapper: input.weights.sapper ?? 0
    },
    ...input.scriptedSpawns ? { scriptedSpawns: input.scriptedSpawns } : {},
    spawnEdges: input.edges ?? ALL_EDGES2
  };
}
var CHAPTER_02_LEVELS = [
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
      { position: { x: 2, y: 2 }, kind: "turret" }
    ],
    toolsUnlocked: TOOLS2,
    waves: [
      wave2({ id: 1, label: "Marked Charge", briefing: "One scripted Sapper reveals its Firewall lock. Watch the dashed target line.", grant: 172, count: 9, active: 3, cadence: 10, weights: { probe: 3, rusher: 2 }, edges: ["north"], scriptedSpawns: [{ waveTick: 4, kind: "sapper" }] }),
      wave2({ id: 2, label: "Safe Radius", briefing: "Separate the bait Firewall from ICE before the Sapper reaches it.", grant: 144, count: 12, active: 5, cadence: 8, weights: { sapper: 3, probe: 3, rusher: 2 }, edges: ["north", "west"] }),
      wave2({ id: 3, label: "Cross Fuse", briefing: "Two entry edges create two possible demolition lanes.", grant: 144, count: 15, active: 6, cadence: 7, weights: { sapper: 4, rusher: 3, crawler: 1 }, edges: ["north", "south"] }),
      wave2({ id: 4, label: "Loose Formation", briefing: "Spread important hardware; replace exposed bait between attacks.", grant: 145, count: 18, active: 7, cadence: 6, weights: { sapper: 5, hunter: 2, rusher: 3 }, edges: ["north", "west", "south"] }),
      wave2({ id: 5, label: "Standoff", briefing: "Every edge is live. Read each target before the formation closes.", grant: 148, count: 21, active: 8, cadence: 6, weights: { sapper: 6, hunter: 2, rusher: 4 }, edges: ALL_EDGES2 })
    ],
    difficultyIndex: 280,
    requiredMechanic: "sapperSpacing"
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
      { position: { x: 4, y: 6 }, kind: "firewall" }
    ],
    toolsUnlocked: TOOLS2,
    waves: [
      wave2({ id: 1, label: "Air Gap", briefing: "Use the open pockets as deliberate pulse buffers.", grant: 178, count: 11, active: 5, cadence: 8, weights: { sapper: 4, rusher: 3, probe: 2 }, edges: ["west", "south"] }),
      wave2({ id: 2, label: "Hard Coupling", briefing: "Hunters punish hardware that sits outside ICE coverage.", grant: 146, count: 14, active: 6, cadence: 7, weights: { sapper: 5, hunter: 3, rusher: 3 }, edges: ["west", "north", "south"] }),
      wave2({ id: 3, label: "Split Rail", briefing: "Spoofs jump walls while Sappers stay committed to them.", grant: 146, count: 17, active: 7, cadence: 6, weights: { sapper: 6, spoof: 3, rusher: 3 }, edges: ALL_EDGES2 }),
      wave2({ id: 4, label: "Cascade Check", briefing: "A pulse cannot chain, but clustered hardware can still vanish together.", grant: 147, count: 20, active: 8, cadence: 5, weights: { sapper: 7, hunter: 3, crawler: 2, rusher: 3 }, edges: ALL_EDGES2 }),
      wave2({ id: 5, label: "Decoupler", briefing: "Maintain two defended lanes and a clean signal spine.", grant: 150, count: 24, active: 10, cadence: 5, weights: { sapper: 8, hunter: 3, spoof: 2, rusher: 4 }, edges: ALL_EDGES2 })
    ],
    difficultyIndex: 325,
    requiredMechanic: "sapperSpacing"
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
      { position: { x: 3, y: 7 }, kind: "turret" }
    ],
    toolsUnlocked: TOOLS2,
    waves: [
      wave2({ id: 1, label: "Bait Signal", briefing: "The eastern Firewall is expendable; the diagonal relay chain is not.", grant: 182, count: 13, active: 6, cadence: 7, weights: { sapper: 6, probe: 3, rusher: 3 }, edges: ["east", "south"] }),
      wave2({ id: 2, label: "Priority Lock", briefing: "Sappers ignore nearer relays while any reachable Firewall remains.", grant: 148, count: 16, active: 7, cadence: 6, weights: { sapper: 7, hunter: 3, rusher: 3 }, edges: ["east", "north", "south"] }),
      wave2({ id: 3, label: "Wall Feint", briefing: "Rebuild bait only when it does not expose the signal chain.", grant: 148, count: 19, active: 8, cadence: 5, weights: { sapper: 8, spoof: 3, rusher: 4 }, edges: ALL_EDGES2 }),
      wave2({ id: 4, label: "Double Bluff", briefing: "Sappers and Hunters choose hardware for different reasons.", grant: 149, count: 23, active: 10, cadence: 5, weights: { sapper: 9, hunter: 4, crawler: 2, rusher: 4 }, edges: ALL_EDGES2 }),
      wave2({ id: 5, label: "False Wall", briefing: "Hold the decoy lane while mixed traffic closes from every edge.", grant: 152, count: 27, active: 11, cadence: 4, weights: { sapper: 10, hunter: 4, spoof: 3, rusher: 5 }, edges: ALL_EDGES2 })
    ],
    difficultyIndex: 375,
    requiredMechanic: "sapperSpacing"
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
      { position: { x: 1, y: 4 }, kind: "turret" }
    ],
    toolsUnlocked: TOOLS2,
    waves: [
      wave2({ id: 1, label: "Four Point", briefing: "Inspect every tile beside the targeted Firewall before launch.", grant: 186, count: 15, active: 7, cadence: 6, weights: { sapper: 7, rusher: 4, crawler: 2 }, edges: ["west", "north", "south"] }),
      wave2({ id: 2, label: "Blast Lane", briefing: "Corruption reduces the safe pockets available for spacing.", grant: 150, count: 19, active: 8, cadence: 5, weights: { sapper: 8, crawler: 3, hunter: 3, rusher: 4 }, edges: ALL_EDGES2 }),
      wave2({ id: 3, label: "Tight Pattern", briefing: "Splitters increase traffic without changing the Sapper pulse radius.", grant: 150, count: 23, active: 10, cadence: 4, weights: { sapper: 9, splitter: 3, hunter: 3, rusher: 5 }, edges: ALL_EDGES2 }),
      wave2({ id: 4, label: "Grid Shock", briefing: "Keep replacement hardware outside active blast crosses.", grant: 151, count: 27, active: 11, cadence: 4, weights: { sapper: 10, splitter: 3, crawler: 3, rusher: 5 }, edges: ALL_EDGES2 }),
      wave2({ id: 5, label: "Blast Grid", briefing: "High concurrency tests target reading, spacing, and rebuild discipline.", grant: 155, count: 32, active: 13, cadence: 4, weights: { sapper: 12, hunter: 4, splitter: 3, rusher: 6 }, edges: ALL_EDGES2 })
    ],
    difficultyIndex: 435,
    requiredMechanic: "sapperSpacing"
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
      { position: { x: 1, y: 4 }, kind: "turret" }
    ],
    toolsUnlocked: TOOLS2,
    waves: [
      wave2({ id: 1, label: "Demo Team", briefing: "Sappers arrive with durable Crawlers. Cover both approaches with ICE.", grant: 192, count: 14, active: 7, cadence: 6, weights: { sapper: 8, crawler: 3, rusher: 4 }, edges: ["west", "north", "east"] }),
      wave2({ id: 2, label: "Breach Stack", briefing: "Stacked threats force a choice between delay and spacing.", grant: 152, count: 18, active: 9, cadence: 5, weights: { sapper: 10, hunter: 4, crawler: 3, rusher: 5 }, edges: ALL_EDGES2 }),
      wave2({ id: 3, label: "Cross Charge", briefing: "Spoofs cross walls while Sappers dismantle them.", grant: 152, count: 21, active: 10, cadence: 4, weights: { sapper: 11, spoof: 4, splitter: 3, rusher: 6 }, edges: ALL_EDGES2 }),
      wave2({ id: 4, label: "Heavy Cover", briefing: "A Goliath pressures the route while Sappers dismantle hardware.", grant: 155, count: 24, active: 12, cadence: 4, weights: { sapper: 12, crawler: 3, hunter: 4, rusher: 6 }, edges: ALL_EDGES2, scriptedSpawns: [{ waveTick: 8, kind: "goliath" }] }),
      wave2({ id: 5, label: "Demolition Line", briefing: "Final hold: isolate the marked target and stop heavy enemies before Core contact.", grant: 160, count: 28, active: 13, cadence: 3, weights: { sapper: 14, hunter: 4, splitter: 4, rusher: 7 }, edges: ALL_EDGES2, scriptedSpawns: [{ waveTick: 6, kind: "goliath" }, { waveTick: 24, kind: "goliath" }] })
    ],
    difficultyIndex: 505,
    requiredMechanic: "sapperSpacing"
  }
];

// src/data/campaigns/expansion/chapter03.ts
var TOOLS3 = ["relay", "firewall", "turret", "arcIce", "scrubber", "sell"];
var ALL_EDGES3 = ["north", "east", "south", "west"];
function wave3(input) {
  return { id: input.id, label: input.label, briefing: input.briefing, prepTicks: 18, bandwidthGrant: input.grant, bandwidthTricklePerTick: 1, bandwidthTrickleEveryTicks: 6, spawnFirstTick: 6, spawnEveryTicks: input.cadence, maxActiveIntrusions: input.active, maxSpawnedIntrusions: input.count, perimeterPickAttempts: 16, enemyWeights: { ...input.weights }, spawnEdges: input.edges ?? ALL_EDGES3, ...input.scripts ? { scriptedSpawns: input.scripts } : {} };
}
var CHAPTER_03_LEVELS = [
  {
    id: 11,
    chapterId: 3,
    codename: "LINK BREAK",
    tagline: "Find the shield's source.",
    briefing: "Violet links protect attackers. Arc ICE reaches three tiles, focuses the Shield Drone, and chains through nearby targets. Normal ICE hits harder when shields are down.",
    gridSize: 8,
    source: { x: 0, y: 4 },
    core: { x: 7, y: 4 },
    voidTiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }, { x: 7, y: 0 }, { x: 3, y: 6 }],
    initialTiles: [{ position: { x: 2, y: 4 }, kind: "relay" }, { position: { x: 4, y: 4 }, kind: "relay" }, { position: { x: 6, y: 4 }, kind: "relay" }, { position: { x: 2, y: 3 }, kind: "turret" }, { position: { x: 6, y: 3 }, kind: "turret" }],
    toolsUnlocked: TOOLS3,
    waves: [
      wave3({ id: 1, label: "Visible Link", briefing: "A Drone and Probe enter the two north gates together. Watch the violet link and place Arc ICE within reach.", grant: 120, count: 12, active: 4, cadence: 9, weights: { probe: 2, rusher: 2 }, edges: ["north"], scripts: [{ waveTick: 4, kind: "shieldDrone" }, { waveTick: 4, kind: "probe" }] }),
      wave3({ id: 2, label: "Cut The Link", briefing: "Arc ICE selects the Drone first. Ordinary ICE finishes exposed attackers.", grant: 44, count: 16, active: 5, cadence: 8, weights: { shieldDrone: 3, rusher: 5, probe: 2 }, edges: ["north"] }),
      wave3({ id: 3, label: "West Approach", briefing: "Extend coverage west without crowding the relay spine.", grant: 48, count: 20, active: 6, cadence: 7, weights: { shieldDrone: 4, crawler: 3, rusher: 5 }, edges: ["north", "west"] }),
      wave3({ id: 4, label: "Shared Canopy", briefing: "Two Drones do not stack protection. Cover their approach with both weapon types.", grant: 52, count: 25, active: 7, cadence: 6, weights: { shieldDrone: 4, hunter: 3, rusher: 6 }, edges: ["north", "south"] }),
      wave3({ id: 5, label: "Link Break", briefing: "Every edge is live. Break shield links while keeping a continuous signal.", grant: 56, count: 30, active: 8, cadence: 6, weights: { shieldDrone: 5, hunter: 3, crawler: 3, rusher: 7 } })
    ],
    difficultyIndex: 545,
    requiredMechanic: "shieldNetwork"
  },
  {
    id: 12,
    chapterId: 3,
    codename: "ARC TURN",
    tagline: "Reach the first target. Bridge the next gap.",
    briefing: "The turning route creates separate approach pockets. Arc ICE reaches three tiles to its first target, then jumps at most two tiles between nearby enemies.",
    gridSize: 8,
    source: { x: 0, y: 6 },
    core: { x: 7, y: 1 },
    voidTiles: [{ x: 1, y: 2 }, { x: 2, y: 2 }, { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }],
    initialTiles: [{ position: { x: 2, y: 6 }, kind: "relay" }, { position: { x: 3, y: 5 }, kind: "relay" }, { position: { x: 3, y: 3 }, kind: "relay" }, { position: { x: 4, y: 2 }, kind: "relay" }, { position: { x: 6, y: 2 }, kind: "relay" }, { position: { x: 1, y: 4 }, kind: "turret" }, { position: { x: 5, y: 5 }, kind: "turret" }],
    toolsUnlocked: TOOLS3,
    waves: [
      wave3({ id: 1, label: "Outside Bend", briefing: "Cover the western bend before the first shielded group arrives.", grant: 126, count: 14, active: 4, cadence: 8, weights: { shieldDrone: 3, rusher: 5, probe: 2 }, edges: ["west", "south"] }),
      wave3({ id: 2, label: "Jump Reach", briefing: "A chain may travel beyond its emitter, but a gap greater than two tiles ends it.", grant: 46, count: 19, active: 5, cadence: 7, weights: { shieldDrone: 4, spoof: 3, rusher: 5 }, edges: ["west", "north"] }),
      wave3({ id: 3, label: "Elbow Room", briefing: "Keep ordinary ICE near the route while Arc covers the open approach.", grant: 50, count: 24, active: 6, cadence: 6, weights: { shieldDrone: 4, crawler: 3, hunter: 2, rusher: 6 }, edges: ["west", "north", "east"] }),
      wave3({ id: 4, label: "Broken Span", briefing: "Spoofs and Hunters separate from the group. A second coverage pocket catches them.", grant: 54, count: 29, active: 8, cadence: 6, weights: { shieldDrone: 5, spoof: 3, hunter: 3, rusher: 7 } }),
      wave3({ id: 5, label: "Arc Turn", briefing: "Defend both ends of the turn and restore damaged relay links.", grant: 58, count: 34, active: 9, cadence: 5, weights: { shieldDrone: 6, crawler: 3, hunter: 3, rusher: 8 } })
    ],
    difficultyIndex: 590,
    requiredMechanic: "shieldNetwork"
  },
  {
    id: 13,
    chapterId: 3,
    codename: "TWIN CANOPY",
    tagline: "One arc cannot watch two fronts.",
    briefing: "Upper and lower routes offer recovery options around a blocked center. Build separate coverage zones before shielded groups arrive from opposite sides.",
    gridSize: 8,
    source: { x: 0, y: 3 },
    core: { x: 7, y: 3 },
    voidTiles: [{ x: 3, y: 0 }, { x: 3, y: 7 }, { x: 3, y: 3 }, { x: 4, y: 3 }],
    initialTiles: [{ position: { x: 1, y: 2 }, kind: "relay" }, { position: { x: 3, y: 2 }, kind: "relay" }, { position: { x: 5, y: 2 }, kind: "relay" }, { position: { x: 1, y: 4 }, kind: "relay" }, { position: { x: 3, y: 4 }, kind: "relay" }, { position: { x: 5, y: 4 }, kind: "relay" }, { position: { x: 6, y: 3 }, kind: "relay" }, { position: { x: 1, y: 1 }, kind: "turret" }, { position: { x: 6, y: 5 }, kind: "turret" }],
    toolsUnlocked: TOOLS3,
    waves: [
      wave3({ id: 1, label: "Upper Shield", briefing: "Start with the upper network; preserve a lower fallback route.", grant: 132, count: 16, active: 5, cadence: 8, weights: { shieldDrone: 4, rusher: 6, probe: 2 }, edges: ["north"] }),
      wave3({ id: 2, label: "Lower Shield", briefing: "The approach switches south. Reposition only what the upper front can spare.", grant: 48, count: 21, active: 6, cadence: 7, weights: { shieldDrone: 5, crawler: 3, rusher: 6 }, edges: ["south"] }),
      wave3({ id: 3, label: "Two Networks", briefing: "Both fronts arrive together. Each needs a Drone-focusing emitter.", grant: 52, count: 26, active: 7, cadence: 6, weights: { shieldDrone: 6, hunter: 3, rusher: 7 }, edges: ["north", "south"] }),
      wave3({ id: 4, label: "Split Cloud", briefing: "Splitters add nearby targets for a chain; ordinary ICE still covers the whole group.", grant: 56, count: 32, active: 9, cadence: 5, weights: { shieldDrone: 6, splitter: 3, hunter: 3, rusher: 8 } }),
      wave3({ id: 5, label: "Twin Canopy", briefing: "Maintain two defended zones and repair the route that remains usable.", grant: 60, count: 38, active: 10, cadence: 5, weights: { shieldDrone: 7, splitter: 4, crawler: 3, rusher: 9 } })
    ],
    difficultyIndex: 640,
    requiredMechanic: "shieldNetwork"
  },
  {
    id: 14,
    chapterId: 3,
    codename: "FUSE FIELD",
    tagline: "Break the shield without feeding the blast.",
    briefing: "Shield Drones protect Rushers while Sappers hunt hardware. Keep Arc coils and relays away from a marked Firewall's likely blast tile.",
    gridSize: 8,
    source: { x: 7, y: 6 },
    core: { x: 0, y: 1 },
    voidTiles: [{ x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 6 }],
    initialTiles: [{ position: { x: 6, y: 5 }, kind: "relay" }, { position: { x: 5, y: 4 }, kind: "relay" }, { position: { x: 4, y: 3 }, kind: "relay" }, { position: { x: 3, y: 2 }, kind: "relay" }, { position: { x: 1, y: 2 }, kind: "relay" }, { position: { x: 6, y: 1 }, kind: "firewall" }, { position: { x: 2, y: 1 }, kind: "turret" }, { position: { x: 1, y: 5 }, kind: "turret" }, { position: { x: 6, y: 3 }, kind: "turret" }],
    toolsUnlocked: TOOLS3,
    waves: [
      wave3({ id: 1, label: "Marked Canopy", briefing: "One Sapper announces the spacing risk while Drones protect the approach.", grant: 140, count: 18, active: 5, cadence: 8, weights: { shieldDrone: 4, rusher: 6, crawler: 2 }, edges: ["north", "east"], scripts: [{ waveTick: 20, kind: "sapper" }] }),
      wave3({ id: 2, label: "Charged Bait", briefing: "Isolated Firewalls draw demolition away from your Arc coverage.", grant: 52, count: 24, active: 6, cadence: 7, weights: { shieldDrone: 4, sapper: 3, hunter: 2, rusher: 6 }, edges: ["north", "east", "south"] }),
      wave3({ id: 3, label: "Fuse Gap", briefing: "Protect the Drone approach without filling every safe blast gap.", grant: 56, count: 30, active: 8, cadence: 6, weights: { shieldDrone: 5, sapper: 4, hunter: 3, rusher: 7 } }),
      wave3({ id: 4, label: "Broken Circuit", briefing: "Scrub corruption and restore empty relay sites before replacing exposed bait.", grant: 60, count: 36, active: 9, cadence: 5, weights: { shieldDrone: 5, sapper: 5, splitter: 3, rusher: 8 } }),
      wave3({ id: 5, label: "Fuse Field", briefing: "Read the shield links and Sapper locks together; preserve a repair reserve.", grant: 64, count: 42, active: 11, cadence: 5, weights: { shieldDrone: 6, sapper: 6, hunter: 3, rusher: 9 } })
    ],
    difficultyIndex: 700,
    requiredMechanic: "shieldNetwork"
  },
  {
    id: 15,
    chapterId: 3,
    codename: "SHIELD FRONT",
    tagline: "Hold the line through every kind of pressure.",
    briefing: "The finale combines shield focus, formation spacing, and signal recovery. Goliaths threaten the route directly; they do not absorb attacks intended for other enemies.",
    gridSize: 8,
    source: { x: 0, y: 7 },
    core: { x: 7, y: 0 },
    voidTiles: [{ x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 }],
    initialTiles: [{ position: { x: 1, y: 6 }, kind: "relay" }, { position: { x: 2, y: 5 }, kind: "relay" }, { position: { x: 3, y: 4 }, kind: "relay" }, { position: { x: 4, y: 3 }, kind: "relay" }, { position: { x: 5, y: 2 }, kind: "relay" }, { position: { x: 6, y: 1 }, kind: "relay" }, { position: { x: 0, y: 3 }, kind: "firewall" }, { position: { x: 1, y: 3 }, kind: "turret" }, { position: { x: 6, y: 4 }, kind: "turret" }, { position: { x: 4, y: 7 }, kind: "turret" }, { position: { x: 5, y: 4 }, kind: "arcIce" }],
    toolsUnlocked: TOOLS3,
    waves: [
      wave3({ id: 1, label: "Frontline Link", briefing: "Use the starting Arc to break Drones and place normal ICE over the relay approaches.", grant: 172, count: 20, active: 6, cadence: 8, weights: { shieldDrone: 5, sapper: 3, crawler: 3, rusher: 7 } }),
      wave3({ id: 2, label: "Crossed Orders", briefing: "Shield focus and Firewall locks create different target priorities. Keep both visible.", grant: 56, count: 26, active: 7, cadence: 7, weights: { shieldDrone: 5, sapper: 4, hunter: 3, rusher: 8 } }),
      wave3({ id: 3, label: "Recovery Window", briefing: "Leave bandwidth for Scrubbers and relay replacements when a route segment falls.", grant: 62, count: 32, active: 9, cadence: 6, weights: { shieldDrone: 6, sapper: 5, splitter: 3, rusher: 9 } }),
      wave3({ id: 4, label: "Heavy Front", briefing: "A Goliath adds direct route pressure while Drones and Sappers demand coverage and spacing.", grant: 68, count: 38, active: 10, cadence: 5, weights: { shieldDrone: 6, sapper: 5, hunter: 3, rusher: 10 }, scripts: [{ waveTick: 20, kind: "goliath" }] }),
      wave3({ id: 5, label: "Shield Front", briefing: "Final hold: break shield networks, isolate blast targets, and restore the signal when it drops.", grant: 74, count: 46, active: 12, cadence: 5, weights: { shieldDrone: 7, sapper: 6, splitter: 4, rusher: 11 }, scripts: [{ waveTick: 20, kind: "goliath" }, { waveTick: 60, kind: "goliath" }] })
    ],
    difficultyIndex: 770,
    requiredMechanic: "shieldNetwork"
  }
];

// src/data/campaigns/expansion/retained.ts
var EXPANSION_R3_LEVELS = [
  ...CHAPTER_01_LEVELS,
  ...CHAPTER_02_LEVELS,
  ...CHAPTER_03_LEVELS
];
var RETAINED_LEVELS = {
  "expansion-1-r1": CHAPTER_01_LEVELS,
  "expansion-1-r2": [...CHAPTER_01_LEVELS, ...CHAPTER_02_LEVELS],
  "expansion-1-r3": EXPANSION_R3_LEVELS
};
function getRetainedExpansionLevel(levelId, revision) {
  if (!Number.isInteger(levelId) || !Object.prototype.hasOwnProperty.call(RETAINED_LEVELS, revision)) return void 0;
  return RETAINED_LEVELS[revision]?.find((level) => level.id === levelId);
}

// src/data/campaigns/expansion/r4/authoring.ts
var ALL_EDGES4 = ["west", "north", "east", "south"];
var LATENCY_TOOLS = ["relay", "firewall", "turret", "scrubber", "latencyTrap", "sell"];
var SHIELD_TOOLS = ["relay", "firewall", "turret", "arcIce", "scrubber", "sell"];
var points = (values) => values.map(([x, y]) => ({ x, y }));
var tiles = (kind, values) => points(values).map((position) => ({ kind, position }));
function retainDesign(level, id) {
  return {
    ...level,
    id,
    difficultyIndex: id * 100,
    ...level.id === 5 ? { tagline: "The first hard checkpoint.", briefing: "The Goliath absorbs fire while Rushers race around it. Keep your relay chain alive through five holds before the outer lanes open." } : {},
    ...level.id === 10 ? { tagline: "Read the lock before the line collapses.", briefing: "Isolate bait, overlap ICE, and preserve a rebuild lane. Heavy enemies screen Sappers at this checkpoint before the final demolition tests." } : {},
    ...level.id === 15 ? { tagline: "Break the canopy. Keep the route.", briefing: "Combine Arc ICE and normal ICE to break linked formations. This checkpoint prepares you for four final shield-network challenges." } : {}
  };
}
var R4_WAVE_DEFAULTS = { prepTicks: 18, bandwidthTricklePerTick: 1, bandwidthTrickleEveryTicks: 6, spawnFirstTick: 3, perimeterPickAttempts: 16 };
function waves(inputs) {
  if (inputs.length !== 5) throw new Error("r4 levels require exactly five authored waves");
  return inputs.map((input, index) => ({
    id: index + 1,
    label: input.label,
    briefing: input.briefing,
    ...R4_WAVE_DEFAULTS,
    bandwidthGrant: input.grant,
    spawnEveryTicks: input.cadence,
    maxActiveIntrusions: input.active,
    maxSpawnedIntrusions: input.count,
    enemyWeights: input.weights,
    spawnEdges: input.edges ?? ALL_EDGES4,
    ...input.scripts ? { scriptedSpawns: input.scripts } : {}
  }));
}

// src/data/campaigns/expansion/r4/chapter01.ts
var R4_CHAPTER_01_LEVELS = [
  ...CHAPTER_01_LEVELS.map((level) => retainDesign(level, level.id)),
  {
    id: 6,
    chapterId: 1,
    codename: "SPLIT SECOND",
    tagline: "Two lanes. One clock.",
    briefing: "A broken center divides the firing lanes. Defend both relay rails and trap the gaps beside the island; a spare route keeps the signal alive.",
    gridSize: 8,
    source: { x: 0, y: 3 },
    core: { x: 7, y: 3 },
    voidTiles: points([[3, 3], [4, 3], [3, 4], [4, 4], [1, 0], [6, 7]]),
    initialTiles: [...tiles("relay", [[1, 2], [3, 2], [5, 2], [6, 3], [1, 4], [2, 5], [4, 5], [6, 5]]), ...tiles("turret", [[2, 3], [5, 4]])],
    toolsUnlocked: LATENCY_TOOLS,
    difficultyIndex: 600,
    requiredMechanic: "latencyTrap",
    waves: waves([
      { label: "Forked Ping", briefing: "Westbound pressure splits around the center island.", grant: 112, count: 14, active: 5, cadence: 6, weights: { rusher: 8, crawler: 2, hunter: 2 }, edges: ["west", "north"] },
      { label: "Second Rail", briefing: "New southern entries threaten the backup route.", grant: 60, count: 18, active: 6, cadence: 5, weights: { rusher: 9, spoof: 3, hunter: 2 }, edges: ["west", "south", "east"] },
      { label: "Clock Skew", briefing: "Splitters can consume several trap charges at once.", grant: 64, count: 22, active: 8, cadence: 4, weights: { rusher: 10, splitter: 3, hunter: 2 } },
      { label: "Parallel Burst", briefing: "Overlap ICE coverage between the two rails.", grant: 66, count: 26, active: 9, cadence: 4, weights: { rusher: 11, splitter: 3, spoof: 3, crawler: 2 } },
      { label: "Split Second", briefing: "A heavy screen arrives at tick 10. Keep replacement traps ready.", grant: 72, count: 30, active: 10, cadence: 4, weights: { rusher: 12, splitter: 3, hunter: 3 }, scripts: [{ waveTick: 10, kind: "goliath" }] }
    ])
  },
  {
    id: 7,
    chapterId: 1,
    codename: "NARROWCAST",
    tagline: "Own the crossing.",
    briefing: "Offset void shelves leave a central crossing. Place ICE in opposite pockets, then delay fast traffic before it reaches the northbound relay spine.",
    gridSize: 8,
    source: { x: 3, y: 7 },
    core: { x: 4, y: 0 },
    voidTiles: points([[0, 2], [1, 2], [2, 2], [5, 5], [6, 5], [7, 5], [1, 5], [6, 2]]),
    initialTiles: [...tiles("relay", [[3, 5], [3, 3], [4, 2]]), ...tiles("turret", [[2, 4], [5, 3], [3, 1]])],
    toolsUnlocked: LATENCY_TOOLS,
    difficultyIndex: 700,
    requiredMechanic: "latencyTrap",
    waves: waves([
      { label: "Carrier Gap", briefing: "North and south traffic shares a narrow spine.", grant: 124, count: 17, active: 6, cadence: 5, weights: { rusher: 9, hunter: 3, crawler: 2 }, edges: ["north", "south"] },
      { label: "Sideband", briefing: "Side entries can bypass the first trap line.", grant: 68, count: 22, active: 7, cadence: 5, weights: { rusher: 10, spoof: 3, hunter: 2 } },
      { label: "Jitter Burst", briefing: "Guard both sides of the central relay.", grant: 70, count: 27, active: 9, cadence: 4, weights: { rusher: 11, splitter: 4, hunter: 3 } },
      { label: "Compression", briefing: "Repair between waves; keep a clean replacement pocket.", grant: 74, count: 32, active: 10, cadence: 4, weights: { rusher: 12, crawler: 3, splitter: 4, spoof: 3 } },
      { label: "Narrowcast", briefing: "Delay the Goliath's escort before it reaches Core.", grant: 80, count: 37, active: 11, cadence: 3, weights: { rusher: 13, hunter: 4, splitter: 4 }, scripts: [{ waveTick: 8, kind: "goliath" }] }
    ])
  },
  {
    id: 8,
    chapterId: 1,
    codename: "LAST MILLISECOND",
    tagline: "Make every delay count.",
    briefing: "The chapter finale bends the route around three staggered void teeth. Protect the turning relays with overlapping ICE and reserve bandwidth for trap replacement.",
    gridSize: 8,
    source: { x: 7, y: 5 },
    core: { x: 0, y: 2 },
    voidTiles: points([[2, 1], [2, 2], [4, 4], [4, 5], [6, 1], [6, 2], [2, 6], [5, 7]]),
    initialTiles: [...tiles("relay", [[6, 4], [5, 3], [3, 3], [1, 3]]), ...tiles("turret", [[6, 6], [4, 2], [1, 1]])],
    toolsUnlocked: LATENCY_TOOLS,
    difficultyIndex: 800,
    requiredMechanic: "latencyTrap",
    waves: waves([
      { label: "Final Handshake", briefing: "Cover both ends of the bent route before launch.", grant: 140, count: 20, active: 7, cadence: 5, weights: { rusher: 10, crawler: 3, hunter: 3 } },
      { label: "Lost Packet", briefing: "Hunters pull fire away from Rushers. Keep traps in the path.", grant: 76, count: 26, active: 8, cadence: 4, weights: { rusher: 11, hunter: 4, spoof: 3 } },
      { label: "No Retry", briefing: "Splitters need a second layer of delay.", grant: 80, count: 32, active: 10, cadence: 4, weights: { rusher: 12, splitter: 4, hunter: 3 } },
      { label: "Heavy Deadline", briefing: "A Goliath joins the burst at tick 8.", grant: 84, count: 38, active: 11, cadence: 3, weights: { rusher: 13, splitter: 4, crawler: 3 }, scripts: [{ waveTick: 8, kind: "goliath" }] },
      { label: "Last Millisecond", briefing: "Two heavy screens. Keep the source-to-core chain alive through the final burst.", grant: 90, count: 44, active: 12, cadence: 3, weights: { rusher: 14, splitter: 4, hunter: 4, spoof: 3 }, scripts: [{ waveTick: 8, kind: "goliath" }, { waveTick: 28, kind: "goliath" }] }
    ])
  }
];

// src/data/campaigns/expansion/r4/chapter02.ts
var R4_CHAPTER_02_LEVELS = [
  ...CHAPTER_02_LEVELS.map((level) => retainDesign(level, level.id + 3)),
  {
    id: 14,
    chapterId: 2,
    codename: "BLAST DOORS",
    tagline: "Leave room for the blast.",
    briefing: "Two staggered shelves create exposed firing pockets. Put bait on the outer doors and leave empty tiles between the target and the relay turns.",
    gridSize: 8,
    source: { x: 0, y: 5 },
    core: { x: 7, y: 2 },
    voidTiles: points([[2, 1], [3, 1], [4, 6], [5, 6], [2, 6], [5, 1]]),
    initialTiles: [...tiles("relay", [[1, 4], [3, 4], [4, 3], [6, 3]]), ...tiles("turret", [[1, 2], [5, 4], [6, 1]]), ...tiles("firewall", [[3, 6]])],
    toolsUnlocked: LATENCY_TOOLS,
    difficultyIndex: 1400,
    requiredMechanic: "sapperSpacing",
    waves: waves([
      { label: "Door Charge", briefing: "Sappers mark the southern bait first. Protect the upper turn.", grant: 212, count: 22, active: 7, cadence: 6, weights: { sapper: 10, rusher: 5, hunter: 3 }, edges: ["south", "east"] },
      { label: "Pressure Seal", briefing: "Hunters can ignore the bait. Keep ICE coverage on the route.", grant: 168, count: 28, active: 9, cadence: 5, weights: { sapper: 11, hunter: 4, crawler: 3, rusher: 5 } },
      { label: "Hinge Failure", briefing: "Replace bait in open pockets, never beside a damaged relay.", grant: 172, count: 34, active: 10, cadence: 4, weights: { sapper: 12, splitter: 4, spoof: 3, rusher: 6 } },
      { label: "Heavy Door", briefing: "A Goliath screens the next demolition wave.", grant: 176, count: 40, active: 12, cadence: 4, weights: { sapper: 13, hunter: 4, crawler: 4, rusher: 6 }, scripts: [{ waveTick: 8, kind: "goliath" }] },
      { label: "Blast Doors", briefing: "Keep the outer targets separated from the signal chain.", grant: 184, count: 46, active: 13, cadence: 3, weights: { sapper: 14, hunter: 4, splitter: 4, rusher: 7 }, scripts: [{ waveTick: 8, kind: "goliath" }, { waveTick: 30, kind: "goliath" }] }
    ])
  },
  {
    id: 15,
    chapterId: 2,
    codename: "CIRCUIT BREAKER",
    tagline: "Lose a wall. Keep the circuit.",
    briefing: "Upper and lower relay rails can carry the signal independently. Do not fill every gap: empty pockets keep demolition pulses away from both rails.",
    gridSize: 8,
    source: { x: 7, y: 3 },
    core: { x: 0, y: 4 },
    voidTiles: points([[3, 3], [4, 3], [3, 5], [4, 5], [1, 0], [6, 7]]),
    initialTiles: [...tiles("relay", [[6, 4], [4, 4], [2, 4], [6, 2], [4, 2], [2, 2], [1, 3]]), ...tiles("turret", [[2, 3], [5, 3], [1, 5]]), ...tiles("firewall", [[4, 0]])],
    toolsUnlocked: LATENCY_TOOLS,
    difficultyIndex: 1500,
    requiredMechanic: "sapperSpacing",
    waves: waves([
      { label: "Open Circuit", briefing: "The top bait draws Sappers away from the lower rail.", grant: 220, count: 26, active: 8, cadence: 5, weights: { sapper: 11, hunter: 4, rusher: 5 }, edges: ["north", "west", "east"] },
      { label: "Cross Current", briefing: "South entries pressure the backup. Cover both rails.", grant: 176, count: 33, active: 10, cadence: 4, weights: { sapper: 12, crawler: 4, hunter: 4, rusher: 6 } },
      { label: "Arc Gap", briefing: "Clear corruption during the build phase before placing new hardware.", grant: 180, count: 40, active: 11, cadence: 4, weights: { sapper: 13, splitter: 4, spoof: 4, rusher: 6 } },
      { label: "Overcurrent", briefing: "Heavy traffic tests whether the second rail really works.", grant: 186, count: 47, active: 13, cadence: 3, weights: { sapper: 14, hunter: 5, crawler: 4, rusher: 7 }, scripts: [{ waveTick: 10, kind: "goliath" }] },
      { label: "Circuit Breaker", briefing: "Two heavy escorts accompany demolition teams. Preserve at least one live rail.", grant: 192, count: 54, active: 14, cadence: 3, weights: { sapper: 15, hunter: 5, splitter: 5, rusher: 8 }, scripts: [{ waveTick: 8, kind: "goliath" }, { waveTick: 28, kind: "goliath" }] }
    ])
  },
  {
    id: 16,
    chapterId: 2,
    codename: "CONTROLLED DEMOLITION",
    tagline: "Pick what breaks.",
    briefing: "The last demolition board funnels attacks across a diagonal relay spine. Keep the bait on the flank, stagger defenses, and rebuild from safe ground.",
    gridSize: 8,
    source: { x: 2, y: 0 },
    core: { x: 5, y: 7 },
    voidTiles: points([[0, 3], [1, 3], [6, 4], [7, 4], [3, 1], [4, 6]]),
    initialTiles: [...tiles("relay", [[2, 2], [3, 3], [4, 4], [5, 5]]), ...tiles("turret", [[1, 1], [6, 6], [4, 2], [2, 5]]), ...tiles("firewall", [[6, 2]])],
    toolsUnlocked: LATENCY_TOOLS,
    difficultyIndex: 1600,
    requiredMechanic: "sapperSpacing",
    waves: waves([
      { label: "Clear Radius", briefing: "Check the four tiles beside every likely Sapper kill.", grant: 232, count: 30, active: 9, cadence: 5, weights: { sapper: 12, crawler: 4, rusher: 6 } },
      { label: "Sequenced Charges", briefing: "Do not replace a Firewall while its blast cross is crowded.", grant: 184, count: 38, active: 11, cadence: 4, weights: { sapper: 13, hunter: 5, spoof: 4, rusher: 6 } },
      { label: "Structural Load", briefing: "A Goliath joins a dense mixed wave.", grant: 190, count: 46, active: 12, cadence: 4, weights: { sapper: 14, splitter: 5, crawler: 4, rusher: 7 }, scripts: [{ waveTick: 10, kind: "goliath" }] },
      { label: "Final Fuse", briefing: "Keep the source end covered while the heavy screen advances.", grant: 196, count: 54, active: 14, cadence: 3, weights: { sapper: 15, hunter: 5, crawler: 5, rusher: 8 }, scripts: [{ waveTick: 8, kind: "goliath" }, { waveTick: 32, kind: "goliath" }] },
      { label: "Controlled Demolition", briefing: "Final hold: survive the breach team without sacrificing your signal spine.", grant: 204, count: 62, active: 15, cadence: 3, weights: { sapper: 16, splitter: 5, hunter: 5, rusher: 8 }, scripts: [{ waveTick: 6, kind: "goliath" }, { waveTick: 26, kind: "goliath" }, { waveTick: 46, kind: "goliath" }] }
    ])
  }
];

// src/data/campaigns/expansion/r4/chapter03.ts
var R4_CHAPTER_03_LEVELS = [
  ...CHAPTER_03_LEVELS.map((level) => retainDesign(level, level.id + 6)),
  {
    id: 22,
    chapterId: 3,
    codename: "BROKEN HALO",
    tagline: "Find the link behind the armor.",
    briefing: "The dogleg relay chain leaves separate Arc firing pockets. Break the Shield Drone before its escort crosses the turn, then use ordinary ICE to cover survivors.",
    gridSize: 8,
    source: { x: 0, y: 2 },
    core: { x: 7, y: 5 },
    voidTiles: points([[2, 5], [3, 5], [4, 1], [5, 1], [1, 6], [6, 1]]),
    initialTiles: [...tiles("relay", [[2, 2], [3, 3], [4, 4], [6, 4]]), ...tiles("turret", [[1, 3], [5, 5], [6, 3]]), ...tiles("arcIce", [[3, 1]]), ...tiles("firewall", [[7, 1]])],
    toolsUnlocked: SHIELD_TOOLS,
    difficultyIndex: 2200,
    requiredMechanic: "shieldNetwork",
    waves: waves([
      { label: "Halo Edge", briefing: "Drones shelter fast escorts. Overlap Arc and ordinary ICE.", grant: 184, count: 24, active: 7, cadence: 7, weights: { shieldDrone: 6, sapper: 3, rusher: 8 }, edges: ["west", "north", "east"] },
      { label: "Fractured Link", briefing: "The southern approach opens. Add a second Arc pocket.", grant: 84, count: 31, active: 8, cadence: 6, weights: { shieldDrone: 6, sapper: 4, hunter: 4, rusher: 9 } },
      { label: "Armor Wake", briefing: "Keep Sapper bait away from the Arc batteries.", grant: 88, count: 38, active: 10, cadence: 5, weights: { shieldDrone: 7, sapper: 5, splitter: 4, rusher: 10 } },
      { label: "Heavy Halo", briefing: "A heavy screen arrives at tick 20; clear its shield support.", grant: 94, count: 46, active: 11, cadence: 5, weights: { shieldDrone: 7, sapper: 5, hunter: 4, rusher: 11 }, scripts: [{ waveTick: 20, kind: "goliath" }] },
      { label: "Broken Halo", briefing: "Destroy support networks before the two heavy screens reach the turn.", grant: 100, count: 54, active: 13, cadence: 4, weights: { shieldDrone: 8, sapper: 6, splitter: 4, rusher: 12 }, scripts: [{ waveTick: 20, kind: "goliath" }, { waveTick: 60, kind: "goliath" }] }
    ])
  },
  {
    id: 23,
    chapterId: 3,
    codename: "PHASE BRIDGE",
    tagline: "Control the bridge, not the crowd.",
    briefing: "A segmented central barrier concentrates crossings near the middle relay. Cover the bridge from two sides; do not crowd the route with bait.",
    gridSize: 8,
    source: { x: 1, y: 7 },
    core: { x: 6, y: 0 },
    voidTiles: points([[3, 1], [3, 2], [3, 5], [3, 6], [5, 6], [1, 1]]),
    initialTiles: [...tiles("relay", [[1, 5], [2, 4], [4, 4], [5, 3], [6, 2]]), ...tiles("turret", [[1, 3], [5, 5], [6, 1]]), ...tiles("arcIce", [[4, 2]]), ...tiles("firewall", [[0, 0]])],
    toolsUnlocked: SHIELD_TOOLS,
    difficultyIndex: 2300,
    requiredMechanic: "shieldNetwork",
    waves: waves([
      { label: "Bridgehead", briefing: "Cover the central gap before the first network arrives.", grant: 196, count: 28, active: 8, cadence: 7, weights: { shieldDrone: 6, sapper: 4, hunter: 3, rusher: 9 }, edges: ["west", "east"] },
      { label: "Linked Crossing", briefing: "Northern entries threaten the final relay.", grant: 92, count: 36, active: 9, cadence: 6, weights: { shieldDrone: 7, sapper: 4, hunter: 4, rusher: 10 } },
      { label: "Bridge Load", briefing: "Splitters can leave surviving probes behind a broken shield.", grant: 96, count: 44, active: 11, cadence: 5, weights: { shieldDrone: 7, sapper: 5, splitter: 5, rusher: 11 } },
      { label: "Heavy Crossing", briefing: "Keep both firing pockets intact under heavy pressure.", grant: 102, count: 52, active: 12, cadence: 4, weights: { shieldDrone: 8, sapper: 6, hunter: 4, rusher: 12 }, scripts: [{ waveTick: 16, kind: "goliath" }] },
      { label: "Phase Bridge", briefing: "Restore corrupted relay sites before replacing exposed bait.", grant: 110, count: 60, active: 14, cadence: 4, weights: { shieldDrone: 9, sapper: 6, splitter: 5, rusher: 13 }, scripts: [{ waveTick: 16, kind: "goliath" }, { waveTick: 52, kind: "goliath" }] }
    ])
  },
  {
    id: 24,
    chapterId: 3,
    codename: "DARK QUORUM",
    tagline: "Break their agreement.",
    briefing: "Two offset void columns split your firing zones. The enemy fields larger support groups; position Arc ICE near each approach while preserving blast gaps.",
    gridSize: 8,
    source: { x: 7, y: 1 },
    core: { x: 0, y: 6 },
    voidTiles: points([[4, 1], [4, 2], [3, 5], [3, 6], [1, 2], [6, 5]]),
    initialTiles: [...tiles("relay", [[6, 2], [5, 3], [3, 3], [2, 4], [1, 5]]), ...tiles("turret", [[6, 3], [2, 2], [4, 4]]), ...tiles("arcIce", [[2, 5]]), ...tiles("firewall", [[7, 6]])],
    toolsUnlocked: SHIELD_TOOLS,
    difficultyIndex: 2400,
    requiredMechanic: "shieldNetwork",
    waves: waves([
      { label: "Quorum Call", briefing: "Larger Drone groups approach from both ends.", grant: 208, count: 32, active: 9, cadence: 6, weights: { shieldDrone: 8, sapper: 4, hunter: 3, rusher: 10 }, edges: ["north", "south", "east"] },
      { label: "Shared Armor", briefing: "One Arc is not enough to cover the entire route.", grant: 100, count: 41, active: 10, cadence: 5, weights: { shieldDrone: 9, sapper: 5, hunter: 4, rusher: 11 } },
      { label: "Heavy Vote", briefing: "Heavy traffic screens the support group. Keep ordinary ICE firing too.", grant: 106, count: 50, active: 12, cadence: 5, weights: { shieldDrone: 9, sapper: 6, splitter: 5, rusher: 12 }, scripts: [{ waveTick: 20, kind: "goliath" }] },
      { label: "Deadlock", briefing: "Rebuild only on clean, unoccupied ground outside the blast cross.", grant: 112, count: 59, active: 13, cadence: 4, weights: { shieldDrone: 10, sapper: 6, hunter: 5, rusher: 13 }, scripts: [{ waveTick: 16, kind: "goliath" }, { waveTick: 50, kind: "goliath" }] },
      { label: "Dark Quorum", briefing: "Break the support network in both firing zones.", grant: 120, count: 68, active: 15, cadence: 4, weights: { shieldDrone: 11, sapper: 7, splitter: 5, rusher: 14 }, scripts: [{ waveTick: 12, kind: "goliath" }, { waveTick: 44, kind: "goliath" }] }
    ])
  },
  {
    id: 25,
    chapterId: 3,
    codename: "SIGNAL UNBROKEN",
    tagline: "Hold the last link.",
    briefing: "The final grid has a diagonal main route and a lower backup loop. Defend both ends, break shield support, isolate Sapper bait, and keep enough bandwidth to recover.",
    gridSize: 8,
    source: { x: 0, y: 0 },
    core: { x: 7, y: 7 },
    voidTiles: points([[3, 1], [4, 1], [5, 2], [2, 6], [3, 6]]),
    initialTiles: [...tiles("relay", [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [1, 3], [1, 5], [3, 5]]), ...tiles("turret", [[2, 1], [6, 5], [3, 4]]), ...tiles("arcIce", [[4, 3]]), ...tiles("firewall", [[0, 7]])],
    toolsUnlocked: SHIELD_TOOLS,
    difficultyIndex: 2500,
    requiredMechanic: "shieldNetwork",
    waves: waves([
      { label: "Final Uplink", briefing: "Prepare both routes; the finale attacks from every edge.", grant: 224, count: 36, active: 10, cadence: 6, weights: { shieldDrone: 9, sapper: 5, hunter: 4, rusher: 11 } },
      { label: "Storm Protocol", briefing: "Splitters crowd the shield network. Overlap Arc and ICE.", grant: 110, count: 46, active: 11, cadence: 5, weights: { shieldDrone: 10, sapper: 6, splitter: 5, rusher: 12 } },
      { label: "Last Reserve", briefing: "A heavy pair joins the attack. Protect the last relay before Core.", grant: 116, count: 56, active: 13, cadence: 4, weights: { shieldDrone: 10, sapper: 6, hunter: 5, rusher: 13 }, scripts: [{ waveTick: 20, kind: "goliath" }, { waveTick: 56, kind: "goliath" }] },
      { label: "Breakwater", briefing: "Use the backup loop if the diagonal route becomes corrupted.", grant: 124, count: 66, active: 14, cadence: 4, weights: { shieldDrone: 11, sapper: 7, splitter: 6, rusher: 14 }, scripts: [{ waveTick: 16, kind: "goliath" }, { waveTick: 48, kind: "goliath" }] },
      { label: "Signal Unbroken", briefing: "Final wave of the campaign: break their shields, survive the heavy screen, keep the signal live.", grant: 132, count: 78, active: 16, cadence: 3, weights: { shieldDrone: 12, sapper: 8, splitter: 6, rusher: 15 }, scripts: [{ waveTick: 12, kind: "goliath" }, { waveTick: 44, kind: "goliath" }, { waveTick: 76, kind: "goliath" }] }
    ])
  }
];

// src/data/campaigns/expansion/r4/index.ts
var EXPANSION_R4_LEVELS = Object.freeze([
  ...R4_CHAPTER_01_LEVELS,
  ...R4_CHAPTER_02_LEVELS,
  ...R4_CHAPTER_03_LEVELS
]);
var EXPANSION_R4_CHAPTERS = [
  { id: 1, codename: "LATENCY FRONT", visualThemeId: "latency-front", levelIds: R4_CHAPTER_01_LEVELS.map((level) => level.id) },
  { id: 2, codename: "DEMOLITION FRONT", visualThemeId: "demolition-front", levelIds: R4_CHAPTER_02_LEVELS.map((level) => level.id) },
  { id: 3, codename: "SHIELD FRONT", visualThemeId: "shield-front", levelIds: R4_CHAPTER_03_LEVELS.map((level) => level.id) }
];

// src/data/campaigns/expansion.ts
function getExpansionLevelDefinition(levelId, contentRevision = EXPANSION_CONTENT_REVISION) {
  if (contentRevision === "expansion-1-r4") return EXPANSION_R4_LEVELS.find((level) => level.id === levelId);
  return getRetainedExpansionLevel(levelId, contentRevision);
}

// src/data/campaigns/expansion/tuning.ts
var EXPANSION_1_R1_TUNING = {
  turretDamagePerTick: 4,
  scrubberCleanseTicks: 6,
  initialCoreIntegrity: 180,
  coreIntegrityMax: 180,
  coreIntegrityDrainPerSeveredTick: 1,
  coreIntegrityRegenPerLiveTick: 2,
  scoring: {
    neutralizedWeight: 10,
    efficiencyBonusCap: 60,
    zeroLatencyWardenMinScore: 440,
    trafficControllerMinScore: 340
  }
};
var SAPPER_TUNING = {
  maxHp: 16,
  moveEveryTicks: 2,
  corruptionTicks: 4,
  spawnBatchSize: 1,
  chewDamage: 8,
  coreContactDamage: 2,
  deathPulseDamage: 6,
  deathPulseRange: 1,
  targeting: "firewallThenHardware",
  onDeathSpawn: null
};
var ARC_ICE_RULES = {
  cost: 20,
  sellRefund: 10,
  hp: 10,
  firstTargetRange: 3,
  chainJumpRange: 2,
  chainDamage: [3, 2, 1]
};
var SHIELD_DRONE_RULES = {
  maxHp: 12,
  moveEveryTicks: 3,
  corruptionTicks: 8,
  spawnBatchSize: 1,
  chewDamage: 1,
  coreContactDamage: 1,
  targeting: "route",
  onDeathSpawn: null,
  shieldRange: 2,
  shieldReduction: 2
};

// src/data/enemies.ts
var ENEMY_TUNING = {
  probe: {
    maxHp: 8,
    moveEveryTicks: 2,
    corruptionTicks: 6,
    spawnBatchSize: 1,
    chewDamage: 2,
    coreContactDamage: 1,
    targeting: "route",
    onDeathSpawn: null
  },
  crawler: {
    maxHp: 26,
    moveEveryTicks: 3,
    corruptionTicks: 3,
    spawnBatchSize: 1,
    chewDamage: 6,
    coreContactDamage: 2,
    targeting: "route",
    onDeathSpawn: null
  },
  spoof: {
    maxHp: 14,
    moveEveryTicks: 2,
    corruptionTicks: 4,
    spawnBatchSize: 1,
    chewDamage: 2,
    coreContactDamage: 1,
    targeting: "route",
    onDeathSpawn: null
  },
  hunter: {
    maxHp: 18,
    moveEveryTicks: 2,
    corruptionTicks: 3,
    spawnBatchSize: 1,
    chewDamage: 5,
    coreContactDamage: 1,
    targeting: "units",
    onDeathSpawn: null
  },
  splitter: {
    maxHp: 16,
    moveEveryTicks: 3,
    corruptionTicks: 5,
    spawnBatchSize: 1,
    chewDamage: 3,
    coreContactDamage: 1,
    targeting: "route",
    onDeathSpawn: {
      kind: "probe",
      count: 2
    }
  },
  goliath: {
    maxHp: 90,
    moveEveryTicks: 4,
    corruptionTicks: 2,
    spawnBatchSize: 1,
    chewDamage: 24,
    coreContactDamage: 6,
    targeting: "route",
    onDeathSpawn: null
  }
};

// src/data/units.ts
var UNIT_TUNING = {
  relay: {
    cost: 7,
    sellRefund: 3,
    hp: 6,
    signalRange: 2
  },
  firewall: {
    cost: 8,
    sellRefund: 4,
    hp: 24
  },
  turret: {
    cost: 14,
    sellRefund: 8,
    hp: 10,
    range: 2,
    damagePerTick: 3
  },
  scrubber: {
    cost: 9,
    sellRefund: 0,
    hp: 8,
    cleanseTicks: 12
  },
  overclock: {
    cost: 14,
    sellRefund: 6,
    hp: 8,
    bonusDamage: 3
  }
};

// src/data/waves.ts
var WAVE_TUNING = [
  {
    id: 1,
    label: "Probe Trace",
    prepTicks: 14,
    bandwidthGrant: 30,
    bandwidthTricklePerTick: 0,
    bandwidthTrickleEveryTicks: 1,
    spawnFirstTick: 2,
    spawnEveryTicks: 12,
    maxActiveIntrusions: 1,
    maxSpawnedIntrusions: 1,
    perimeterPickAttempts: 8,
    enemyWeights: {
      probe: 10,
      crawler: 0,
      spoof: 0,
      hunter: 0,
      splitter: 0,
      goliath: 0
    },
    spawnEdges: ["west"]
  },
  {
    id: 2,
    label: "Crawler Pressure",
    prepTicks: 14,
    bandwidthGrant: 26,
    bandwidthTricklePerTick: 0,
    bandwidthTrickleEveryTicks: 1,
    spawnFirstTick: 2,
    spawnEveryTicks: 8,
    maxActiveIntrusions: 3,
    maxSpawnedIntrusions: 3,
    perimeterPickAttempts: 8,
    enemyWeights: {
      probe: 8,
      crawler: 2,
      spoof: 0,
      hunter: 0,
      splitter: 0,
      goliath: 0
    },
    spawnEdges: ["west", "north"]
  },
  {
    id: 3,
    label: "Spoof Injection",
    prepTicks: 14,
    bandwidthGrant: 24,
    bandwidthTricklePerTick: 1,
    bandwidthTrickleEveryTicks: 6,
    spawnFirstTick: 2,
    spawnEveryTicks: 7,
    maxActiveIntrusions: 4,
    maxSpawnedIntrusions: 4,
    perimeterPickAttempts: 10,
    enemyWeights: {
      probe: 4,
      crawler: 1,
      spoof: 1,
      hunter: 0,
      splitter: 0,
      goliath: 0
    },
    spawnEdges: ["north", "south"]
  },
  {
    id: 4,
    label: "Cross-Edge Breach",
    prepTicks: 14,
    bandwidthGrant: 20,
    bandwidthTricklePerTick: 1,
    bandwidthTrickleEveryTicks: 5,
    spawnFirstTick: 1,
    spawnEveryTicks: 5,
    maxActiveIntrusions: 5,
    maxSpawnedIntrusions: 7,
    perimeterPickAttempts: 12,
    enemyWeights: {
      probe: 5,
      crawler: 2,
      spoof: 2,
      hunter: 0,
      splitter: 0,
      goliath: 0
    },
    spawnEdges: ["west", "north", "south"]
  },
  {
    id: 5,
    label: "Signal Breach",
    prepTicks: 14,
    bandwidthGrant: 20,
    bandwidthTricklePerTick: 1,
    bandwidthTrickleEveryTicks: 4,
    spawnFirstTick: 1,
    spawnEveryTicks: 4,
    maxActiveIntrusions: 6,
    maxSpawnedIntrusions: 9,
    perimeterPickAttempts: 14,
    enemyWeights: {
      probe: 6,
      crawler: 3,
      spoof: 3,
      hunter: 0,
      splitter: 0,
      goliath: 0
    },
    spawnEdges: ["west", "north", "east", "south"]
  },
  {
    id: 6,
    label: "Hunter Protocol",
    prepTicks: 20,
    bandwidthGrant: 42,
    bandwidthTricklePerTick: 1,
    bandwidthTrickleEveryTicks: 6,
    spawnFirstTick: 2,
    spawnEveryTicks: 7,
    maxActiveIntrusions: 4,
    maxSpawnedIntrusions: 6,
    perimeterPickAttempts: 12,
    enemyWeights: {
      probe: 5,
      crawler: 2,
      spoof: 0,
      hunter: 3,
      splitter: 0,
      goliath: 0
    },
    scriptedSpawns: [
      {
        waveTick: 4,
        kind: "hunter"
      }
    ],
    spawnEdges: ["east", "south"]
  },
  {
    id: 7,
    label: "Split Decision",
    prepTicks: 14,
    bandwidthGrant: 24,
    bandwidthTricklePerTick: 1,
    bandwidthTrickleEveryTicks: 6,
    spawnFirstTick: 2,
    spawnEveryTicks: 6,
    maxActiveIntrusions: 5,
    maxSpawnedIntrusions: 8,
    perimeterPickAttempts: 12,
    enemyWeights: {
      probe: 4,
      crawler: 2,
      spoof: 0,
      hunter: 0,
      splitter: 3,
      goliath: 0
    },
    scriptedSpawns: [
      {
        waveTick: 4,
        kind: "splitter"
      }
    ],
    spawnEdges: ["north", "east"]
  },
  {
    id: 8,
    label: "Pack Tactics",
    prepTicks: 14,
    bandwidthGrant: 22,
    bandwidthTricklePerTick: 1,
    bandwidthTrickleEveryTicks: 5,
    spawnFirstTick: 1,
    spawnEveryTicks: 5,
    maxActiveIntrusions: 6,
    maxSpawnedIntrusions: 10,
    perimeterPickAttempts: 12,
    enemyWeights: {
      probe: 4,
      crawler: 3,
      spoof: 2,
      hunter: 2,
      splitter: 2,
      goliath: 0
    },
    spawnEdges: ["north", "east", "south"]
  },
  {
    id: 9,
    label: "Canyon Storm",
    prepTicks: 14,
    bandwidthGrant: 20,
    bandwidthTricklePerTick: 1,
    bandwidthTrickleEveryTicks: 4,
    spawnFirstTick: 1,
    spawnEveryTicks: 4,
    maxActiveIntrusions: 7,
    maxSpawnedIntrusions: 12,
    perimeterPickAttempts: 12,
    enemyWeights: {
      probe: 5,
      crawler: 3,
      spoof: 3,
      hunter: 3,
      splitter: 2,
      goliath: 0
    },
    spawnEdges: ["west", "north", "east", "south"]
  },
  {
    id: 10,
    label: "Vault Siege",
    prepTicks: 20,
    bandwidthGrant: 56,
    bandwidthTricklePerTick: 1,
    bandwidthTrickleEveryTicks: 5,
    spawnFirstTick: 2,
    spawnEveryTicks: 5,
    maxActiveIntrusions: 6,
    maxSpawnedIntrusions: 10,
    perimeterPickAttempts: 14,
    enemyWeights: {
      probe: 4,
      crawler: 3,
      spoof: 3,
      hunter: 2,
      splitter: 0,
      goliath: 0
    },
    spawnEdges: ["west", "north", "east", "south"]
  },
  {
    id: 11,
    label: "Total Breach",
    prepTicks: 14,
    bandwidthGrant: 24,
    bandwidthTricklePerTick: 1,
    bandwidthTrickleEveryTicks: 4,
    spawnFirstTick: 1,
    spawnEveryTicks: 4,
    maxActiveIntrusions: 8,
    maxSpawnedIntrusions: 14,
    perimeterPickAttempts: 14,
    enemyWeights: {
      probe: 5,
      crawler: 4,
      spoof: 3,
      hunter: 3,
      splitter: 3,
      goliath: 0
    },
    spawnEdges: ["west", "north", "east", "south"]
  },
  {
    id: 12,
    label: "Goliath Handshake",
    prepTicks: 16,
    bandwidthGrant: 28,
    bandwidthTricklePerTick: 1,
    bandwidthTrickleEveryTicks: 4,
    spawnFirstTick: 1,
    spawnEveryTicks: 5,
    maxActiveIntrusions: 7,
    maxSpawnedIntrusions: 10,
    perimeterPickAttempts: 14,
    enemyWeights: {
      probe: 4,
      crawler: 2,
      spoof: 2,
      hunter: 2,
      splitter: 2,
      goliath: 0
    },
    scriptedSpawns: [
      {
        waveTick: 6,
        kind: "goliath"
      }
    ],
    spawnEdges: ["west", "north", "east", "south"]
  }
];

// src/data/levels.ts
var GRID_SIZE = 8;
var CORE_TUNING = {
  initialCoreIntegrity: 150,
  coreIntegrityMax: 150,
  coreIntegrityDrainPerSeveredTick: 2,
  coreIntegrityRegenPerLiveTick: 1,
  simulationTickMs: 350,
  defaultSeed: "gridwatch-signal-breach-phase-3"
};
var BASE_TOOLS = ["relay", "firewall", "turret", "sell"];
var SECTORS = [
  {
    id: 1,
    name: "Perimeter Run",
    codename: "PERIMETER RUN",
    gridSize: GRID_SIZE,
    source: { x: 0, y: 3 },
    core: { x: 7, y: 4 },
    voidTiles: [],
    initialTiles: [
      { position: { x: 2, y: 3 }, kind: "relay" },
      { position: { x: 4, y: 3 }, kind: "relay" },
      { position: { x: 6, y: 3 }, kind: "relay" }
    ],
    waves: WAVE_TUNING.slice(0, 5),
    toolsUnlocked: BASE_TOOLS,
    tagline: "The first breach line. Learn the cadence, then hold it."
  },
  {
    id: 2,
    name: "Relay Canyon",
    codename: "RELAY CANYON",
    gridSize: GRID_SIZE,
    source: { x: 1, y: 6 },
    core: { x: 6, y: 1 },
    voidTiles: [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 2, y: 3 },
      { x: 4, y: 4 },
      { x: 5, y: 4 },
      { x: 4, y: 5 }
    ],
    initialTiles: [
      { position: { x: 1, y: 4 }, kind: "relay" },
      { position: { x: 1, y: 2 }, kind: "relay" },
      { position: { x: 2, y: 1 }, kind: "relay" },
      { position: { x: 4, y: 1 }, kind: "relay" }
    ],
    waves: WAVE_TUNING.slice(5, 9),
    toolsUnlocked: [...BASE_TOOLS, "scrubber"],
    tagline: "Chasms block bodies, not signal. Reclaim the scars."
  },
  {
    id: 3,
    name: "Core Vault",
    codename: "CORE VAULT",
    gridSize: GRID_SIZE,
    source: { x: 7, y: 7 },
    core: { x: 3, y: 4 },
    voidTiles: [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
      { x: 1, y: 3 },
      { x: 1, y: 4 },
      { x: 1, y: 5 },
      { x: 5, y: 3 },
      { x: 5, y: 4 },
      { x: 2, y: 6 },
      { x: 4, y: 6 },
      { x: 5, y: 6 }
    ],
    initialTiles: [
      { position: { x: 6, y: 6 }, kind: "relay" },
      { position: { x: 6, y: 4 }, kind: "relay" },
      { position: { x: 4, y: 4 }, kind: "relay" }
    ],
    waves: WAVE_TUNING.slice(9, 12),
    toolsUnlocked: [...BASE_TOOLS, "scrubber", "overclock"],
    tagline: "Two vault gates, one Core, no clean lane home."
  }
];
for (const sector of SECTORS) {
  assertSectorInvariants(sector);
}
function assertSectorInvariants(sector) {
  assert(sector.gridSize === GRID_SIZE, `Sector ${sector.id} grid must be ${GRID_SIZE}.`);
  assertPositionInBounds(sector, sector.source, "source");
  assertPositionInBounds(sector, sector.core, "core");
  const reserved = /* @__PURE__ */ new Set([
    positionKey(sector.source),
    positionKey(sector.core)
  ]);
  const initialTileKeys = /* @__PURE__ */ new Set();
  const voidKeys = /* @__PURE__ */ new Set();
  for (const voidTile of sector.voidTiles) {
    const key = positionKey(voidTile);
    assertPositionInBounds(sector, voidTile, "void");
    assert(
      !isPerimeter(sector, voidTile),
      `Sector ${sector.id} void on perimeter ${key}.`
    );
    assert(!reserved.has(key), `Sector ${sector.id} void overlaps source/core.`);
    assert(!voidKeys.has(key), `Sector ${sector.id} duplicate void tile at ${key}.`);
    voidKeys.add(key);
  }
  for (const initialTile of sector.initialTiles) {
    const key = positionKey(initialTile.position);
    assertPositionInBounds(sector, initialTile.position, initialTile.kind);
    assert(isInitialUnitKind(initialTile.kind), `Sector ${sector.id} initial tile must be a unit.`);
    assert(
      !reserved.has(key),
      `Sector ${sector.id} initial tile overlaps source/core.`
    );
    assert(
      !voidKeys.has(key),
      `Sector ${sector.id} initial tile overlaps void.`
    );
    assert(!initialTileKeys.has(key), `Sector ${sector.id} duplicate initial tile at ${key}.`);
    initialTileKeys.add(key);
  }
  assertInitialRouteLive(sector);
}
function assertInitialRouteLive(sector) {
  const carriers = [
    sector.source,
    ...sector.initialTiles.filter((tile) => tile.kind === "relay" || tile.kind === "firewall").map((tile) => tile.position),
    sector.core
  ];
  const target = positionKey(sector.core);
  const visited = /* @__PURE__ */ new Set([positionKey(sector.source)]);
  const queue = [sector.source];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }
    if (positionKey(current) === target) {
      return;
    }
    for (const candidate of carriers) {
      const key = positionKey(candidate);
      if (visited.has(key) || manhattanDistance(current, candidate) > UNIT_TUNING.relay.signalRange) {
        continue;
      }
      visited.add(key);
      queue.push(candidate);
    }
  }
  throw new Error(`Sector ${sector.id} initial route is not live.`);
}
function assertPositionInBounds(sector, position, label) {
  assert(
    Number.isInteger(position.x) && Number.isInteger(position.y) && position.x >= 0 && position.y >= 0 && position.x < sector.gridSize && position.y < sector.gridSize,
    `Sector ${sector.id} ${label} out of bounds: ${positionKey(position)}.`
  );
}
function isPerimeter(sector, position) {
  return position.x === 0 || position.y === 0 || position.x === sector.gridSize - 1 || position.y === sector.gridSize - 1;
}
function isInitialUnitKind(kind) {
  return kind === "relay" || kind === "firewall" || kind === "turret";
}
function manhattanDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
function positionKey(position) {
  return `${position.x},${position.y}`;
}
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// src/sim/expansion/latencyTrapPrototype.ts
var LATENCY_TRAP_PROTOTYPE = {
  activeSaleRefund: 4,
  charges: 3,
  cost: 10,
  extraMoveDelayTicks: 3
};

// src/sim/expansion/routing.ts
function computeExpansionSignalRoute(input) {
  assertExpansionRoutingInput(input);
  if (getExpansionTileKind(input.grid, input.source) === "corrupted" || getExpansionTileKind(input.grid, input.core) === "corrupted") {
    return null;
  }
  const carriers = getSignalCarriers(input);
  return bfs({
    start: input.source,
    isGoal: (position) => sameExpansionPosition(position, input.core),
    getNeighbors: (position) => carriers.filter(
      (candidate) => !sameExpansionPosition(candidate, position) && expansionManhattanDistance(position, candidate) <= input.relaySignalRange
    ),
    toKey: expansionPositionKey
  });
}
function getSignalCarriers(input) {
  const hardware = listExpansionPositions(input.grid).filter((position) => {
    if (sameExpansionPosition(position, input.source) || sameExpansionPosition(position, input.core)) {
      return false;
    }
    const kind = getExpansionTileKind(input.grid, position);
    return isExpansionHardwareKind(kind) && getExpansionHardwareCapabilities(kind).carriesSignal;
  });
  return [input.source, ...sortExpansionPositions(hardware), input.core];
}
function assertExpansionRoutingInput(input) {
  if (!isExpansionInBounds(input.grid, input.source)) {
    throw new Error("Expansion Source must be in bounds.");
  }
  if (!isExpansionInBounds(input.grid, input.core)) {
    throw new Error("Expansion Core must be in bounds.");
  }
  if (!Number.isInteger(input.relaySignalRange) || input.relaySignalRange <= 0) {
    throw new Error("Expansion relay range must be a positive integer.");
  }
}

// src/sim/expansion/rusherPrototype.ts
var RUSHER_PROTOTYPE = {
  id: "rusher",
  maxHp: 6,
  moveEveryTicks: 1,
  corruptionTicks: 6,
  spawnBatchSize: 1,
  chewDamage: 1,
  coreContactDamage: 1,
  targeting: "route",
  onDeathSpawn: null,
  specialMovement: null
};

// src/sim/expansion/shieldNetwork.ts
var distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
function getShieldLinks(enemies) {
  const alive = enemies.filter((enemy) => enemy.hp > 0).sort((a, b) => a.id - b.id);
  return alive.filter((enemy) => enemy.kind === "shieldDrone").flatMap(
    (source) => alive.filter((target) => target.kind !== "shieldDrone" && distance(source.position, target.position) <= SHIELD_DRONE_RULES.shieldRange).map((target) => ({ sourceId: source.id, targetId: target.id }))
  );
}
function normalIceDamage(damage, targetId, links) {
  return links.some((link) => link.targetId === targetId) ? Math.max(1, damage - SHIELD_DRONE_RULES.shieldReduction) : damage;
}
function selectArcChain(origin, enemies) {
  const alive = enemies.filter((enemy) => enemy.hp > 0);
  const priority = (enemy) => enemy.kind === "shieldDrone" ? 0 : 1;
  const first = alive.filter((enemy) => distance(origin, enemy.position) <= ARC_ICE_RULES.firstTargetRange).sort((a, b) => priority(a) - priority(b) || distance(origin, a.position) - distance(origin, b.position) || a.id - b.id)[0];
  if (!first) return [];
  const chain = [first.id];
  let previous = first;
  while (chain.length < ARC_ICE_RULES.chainDamage.length) {
    const next = alive.filter((enemy) => !chain.includes(enemy.id) && distance(previous.position, enemy.position) <= ARC_ICE_RULES.chainJumpRange).sort((a, b) => distance(previous.position, a.position) - distance(previous.position, b.position) || a.id - b.id)[0];
    if (!next) break;
    chain.push(next.id);
    previous = next;
  }
  return chain;
}

// src/sim/expansion/state.ts
function createExpansionGameState(options) {
  const revision = options.contentRevision ?? EXPANSION_CONTENT_REVISION;
  const level = getRequiredExpansionLevel(options.levelId, revision);
  const config = createExpansionSimConfig(level, options.contentHash, revision);
  let grid = createExpansionGrid(config.gridSize);
  for (const position of level.voidTiles) {
    grid = setExpansionTile(grid, position, { kind: "void" });
  }
  const reserved = new Set(level.voidTiles.map(expansionPositionKey));
  for (const initialTile of level.initialTiles) {
    const key = expansionPositionKey(initialTile.position);
    if (reserved.has(key)) {
      throw new Error(`Expansion initial tile overlaps void at ${key}.`);
    }
    grid = setExpansionTile(
      grid,
      initialTile.position,
      createInitialExpansionTile(config, initialTile.kind)
    );
  }
  const baseState = {
    tickCount: 0,
    rng: createRng(options.seed ?? config.defaultSeed),
    grid,
    config,
    phase: "prep",
    waveIndex: 0,
    waveTick: 0,
    prepTicksRemaining: 0,
    activeTaunt: "",
    bandwidth: 0,
    waveSpawnedCount: 0,
    waveScriptedSpawnIndex: 0,
    signal: { status: "severed", route: [], routeTick: 0 },
    intrusions: [],
    nextIntrusionId: 1,
    spawnedIntrusionCount: 0,
    neutralizedCount: 0,
    events: [],
    coreIntegrity: config.initialCoreIntegrity,
    uptimeTicks: 0,
    severedTicks: 0
  };
  return withRecomputedExpansionSignal(startExpansionPrepPhase(baseState, 0));
}
function withRecomputedExpansionSignal(state) {
  return { ...state, signal: deriveExpansionSignalState(state) };
}
function deriveExpansionSignalState(state) {
  const route = computeExpansionSignalRoute({
    grid: state.grid,
    source: state.config.source,
    core: state.config.core,
    relaySignalRange: state.config.relaySignalRange
  });
  return {
    status: route ? "live" : "severed",
    route: route ?? [],
    routeTick: state.tickCount
  };
}
function createExpansionSimConfig(level, contentHash, contentRevision) {
  if (contentHash.trim().length < 8) {
    throw new Error("Expansion content hash is required.");
  }
  return {
    campaignId: EXPANSION_CAMPAIGN_ID,
    ruleset: EXPANSION_RULESET_ID,
    contentRevision,
    contentHash,
    levelId: level.id,
    chapterId: level.chapterId,
    levelName: level.codename,
    difficultyIndex: level.difficultyIndex,
    requiredMechanic: level.requiredMechanic,
    gridSize: level.gridSize,
    source: { ...level.source },
    core: { ...level.core },
    relaySignalRange: UNIT_TUNING.relay.signalRange,
    turretRange: UNIT_TUNING.turret.range,
    turretDamagePerTick: EXPANSION_1_R1_TUNING.turretDamagePerTick,
    toolsUnlocked: level.toolsUnlocked,
    scrubberCleanseTicks: EXPANSION_1_R1_TUNING.scrubberCleanseTicks,
    overclockBonusDamage: UNIT_TUNING.overclock.bonusDamage,
    initialCoreIntegrity: EXPANSION_1_R1_TUNING.initialCoreIntegrity,
    coreIntegrityMax: EXPANSION_1_R1_TUNING.coreIntegrityMax,
    coreIntegrityDrainPerSeveredTick: EXPANSION_1_R1_TUNING.coreIntegrityDrainPerSeveredTick,
    coreIntegrityRegenPerLiveTick: EXPANSION_1_R1_TUNING.coreIntegrityRegenPerLiveTick,
    simulationTickMs: CORE_TUNING.simulationTickMs,
    defaultSeed: `${EXPANSION_CAMPAIGN_ID}-chapter-${level.chapterId}-level-${level.id}`,
    enemies: {
      probe: { ...ENEMY_TUNING.probe },
      crawler: { ...ENEMY_TUNING.crawler },
      spoof: { ...ENEMY_TUNING.spoof },
      hunter: { ...ENEMY_TUNING.hunter },
      splitter: { ...ENEMY_TUNING.splitter },
      goliath: { ...ENEMY_TUNING.goliath },
      rusher: { ...RUSHER_PROTOTYPE },
      sapper: { ...SAPPER_TUNING },
      shieldDrone: { ...SHIELD_DRONE_RULES }
    },
    units: {
      relay: unit(UNIT_TUNING.relay),
      firewall: unit(UNIT_TUNING.firewall),
      turret: unit(UNIT_TUNING.turret),
      arcIce: unit(ARC_ICE_RULES),
      scrubber: unit(UNIT_TUNING.scrubber),
      overclock: unit(UNIT_TUNING.overclock),
      latencyTrap: {
        cost: LATENCY_TRAP_PROTOTYPE.cost,
        sellRefund: LATENCY_TRAP_PROTOTYPE.activeSaleRefund,
        hp: null,
        charges: LATENCY_TRAP_PROTOTYPE.charges,
        extraMoveDelayTicks: LATENCY_TRAP_PROTOTYPE.extraMoveDelayTicks
      }
    },
    waves: level.waves
  };
}
function unit(definition) {
  return { cost: definition.cost, sellRefund: definition.sellRefund, hp: definition.hp };
}
function createInitialExpansionTile(config, kind) {
  const definition = config.units[kind];
  return {
    kind,
    ...definition.hp === null ? {} : { hp: definition.hp },
    ...definition.charges === void 0 ? {} : { charges: definition.charges },
    ...kind === "scrubber" ? { progress: 0 } : {}
  };
}
function getRequiredExpansionLevel(levelId, revision) {
  const level = getExpansionLevelDefinition(levelId, revision);
  if (!level) throw new Error(`Unknown expansion level id: ${levelId} in ${revision}.`);
  return level;
}

// src/sim/expansion/commands.ts
function applyExpansionCommand(state, command) {
  switch (command.type) {
    case "placeUnit":
      return placeExpansionUnit(state, command.position, command.unit);
    case "sellUnit":
      return sellExpansionUnit(state, command.position);
    case "skipPrep":
      return startExpansionActivePhase(state);
  }
}
function placeExpansionUnit(state, position, unit2) {
  if (state.phase === "won" || state.phase === "lost") return state;
  if (!state.config.toolsUnlocked.includes(unit2)) return state;
  if (!isExpansionInBounds(state.grid, position)) return state;
  if (isSpecialPosition(state, position)) return state;
  if (unit2 === "latencyTrap" && isExpansionPerimeter(state.grid, position)) return state;
  if (wouldCloseRemainingSpawnEdge(state, position)) return state;
  const tileKind = getExpansionTileKind(state.grid, position);
  if (unit2 === "scrubber" ? tileKind !== "corrupted" : tileKind !== "empty") return state;
  if (state.intrusions.some((intrusion) => sameExpansionPosition(intrusion.position, position))) return state;
  const definition = state.config.units[unit2];
  if (state.bandwidth < definition.cost) return state;
  return withRecomputedExpansionSignal({
    ...state,
    bandwidth: state.bandwidth - definition.cost,
    grid: setExpansionTile(state.grid, position, {
      kind: unit2,
      ...definition.hp === null ? {} : { hp: definition.hp },
      ...definition.charges === void 0 ? {} : { charges: definition.charges },
      ...unit2 === "scrubber" ? { progress: 0 } : {}
    })
  });
}
function wouldCloseRemainingSpawnEdge(state, position) {
  return state.config.waves.slice(state.waveIndex).some((wave4) => {
    const openPositions = getOpenExpansionSpawnPositions(state, wave4.spawnEdges);
    return openPositions.length === 1 && sameExpansionPosition(openPositions[0], position);
  });
}
function sellExpansionUnit(state, position) {
  if (state.phase === "won" || state.phase === "lost") return state;
  if (!isExpansionInBounds(state.grid, position)) return state;
  const kind = getExpansionTileKind(state.grid, position);
  if (!isSellableHardwareKind(kind)) return state;
  const definition = state.config.units[kind];
  const refund = state.phase === "prep" ? definition.cost : definition.sellRefund;
  return withRecomputedExpansionSignal({
    ...state,
    bandwidth: state.bandwidth + refund,
    grid: setExpansionTileKind(state.grid, position, "empty")
  });
}
function isSpecialPosition(state, position) {
  return sameExpansionPosition(position, state.config.source) || sameExpansionPosition(position, state.config.core);
}
function isSellableHardwareKind(value) {
  return value === "relay" || value === "firewall" || value === "turret" || value === "arcIce" || value === "overclock" || value === "latencyTrap";
}

// src/sim/expansion/scoring.ts
function calculateExpansionScore(state) {
  const measured = state.uptimeTicks + state.severedTicks;
  const uptimePercent = measured === 0 ? 0 : Math.round(state.uptimeTicks / measured * 100);
  const integrity = Math.max(0, state.coreIntegrity);
  const neutralized = state.neutralizedCount * EXPANSION_1_R1_TUNING.scoring.neutralizedWeight;
  const efficiencyBonus = Math.min(EXPANSION_1_R1_TUNING.scoring.efficiencyBonusCap, Math.floor(state.bandwidth / 2));
  const total = integrity + neutralized + uptimePercent + efficiencyBonus;
  return {
    integrity,
    neutralized,
    uptimePercent,
    uptimeScore: uptimePercent,
    efficiencyBonus,
    total,
    rating: state.phase === "lost" ? "Deadline Missed" : total >= EXPANSION_1_R1_TUNING.scoring.zeroLatencyWardenMinScore ? "Zero-Latency Warden" : total >= EXPANSION_1_R1_TUNING.scoring.trafficControllerMinScore ? "Traffic Controller" : "Route Keeper"
  };
}

// src/sim/expansion/combat.ts
function applyExpansionTurretCombat(state) {
  const turrets = getExpansionPositionsByKind(state.grid, "turret");
  const arcTurrets = getExpansionPositionsByKind(state.grid, "arcIce");
  if (turrets.length === 0 && arcTurrets.length === 0 || state.intrusions.length === 0) return state;
  const hp = new Map(state.intrusions.map((intrusion) => [intrusion.id, intrusion.hp]));
  const shieldLinks = getShieldLinks(state.intrusions);
  let events = state.events;
  for (const turret of turrets) {
    const overclocks = getExpansionOrthogonalNeighbors(state.grid, turret).filter((position) => getExpansionTileKind(state.grid, position) === "overclock").length;
    const damage = state.config.turretDamagePerTick + overclocks * state.config.overclockBonusDamage;
    for (const intrusion of state.intrusions) {
      if (expansionManhattanDistance(turret, intrusion.position) > state.config.turretRange) continue;
      const current = hp.get(intrusion.id) ?? intrusion.hp;
      if (current <= 0) continue;
      const effectiveDamage = normalIceDamage(damage, intrusion.id, shieldLinks);
      hp.set(intrusion.id, current - effectiveDamage);
      events = [...events, { type: "turretHit", tick: state.tickCount, turretPosition: turret, targetId: intrusion.id, targetPosition: intrusion.position, damage: effectiveDamage }];
    }
  }
  for (const turret of arcTurrets) {
    let origin = turret;
    const chain = selectArcChain(turret, state.intrusions);
    for (const [index, targetId] of chain.entries()) {
      const target = state.intrusions.find((intrusion) => intrusion.id === targetId);
      const damage = ARC_ICE_RULES.chainDamage[index];
      hp.set(targetId, (hp.get(targetId) ?? target.hp) - damage);
      events = [...events, { type: "turretHit", weapon: "arcIce", ...index > 0 ? { sourceIntrusionId: chain[index - 1] } : {}, tick: state.tickCount, turretPosition: origin, targetId, targetPosition: target.position, damage }];
      origin = target.position;
    }
  }
  const survivors = [];
  let children = [];
  let nextIntrusionId = state.nextIntrusionId;
  let spawnedIntrusionCount = state.spawnedIntrusionCount;
  let neutralizedCount = state.neutralizedCount;
  let grid = state.grid;
  for (const intrusion of [...state.intrusions].sort((left, right) => left.id - right.id)) {
    const remaining = hp.get(intrusion.id) ?? intrusion.hp;
    if (remaining > 0) {
      survivors.push({ ...intrusion, hp: remaining });
      continue;
    }
    neutralizedCount += 1;
    events = [...events, { type: "intrusionNeutralized", tick: state.tickCount, intrusionId: intrusion.id, position: intrusion.position }];
    if (intrusion.kind === "sapper") {
      const pulsed = applySapperDeathPulse(state, grid, events, intrusion);
      grid = pulsed.grid;
      events = pulsed.events;
    }
    const spawn = state.config.enemies[intrusion.kind].onDeathSpawn;
    if (!spawn) continue;
    const definition = state.config.enemies[spawn.kind];
    const occupied = [
      ...state.intrusions.filter(
        (candidate) => candidate.id !== intrusion.id && (hp.get(candidate.id) ?? candidate.hp) > 0
      ),
      ...children
    ];
    const positions = [intrusion.position, ...getExpansionOrthogonalNeighbors(grid, intrusion.position)].filter((position) => isExpansionInBounds(grid, position)).filter((position) => !sameExpansionPosition(position, state.config.source)).filter((position) => !sameExpansionPosition(position, state.config.core)).filter((position) => ["empty", "corrupted"].includes(getExpansionTileKind(grid, position))).filter((position) => !occupied.some((candidate) => sameExpansionPosition(candidate.position, position))).slice(0, spawn.count);
    const newChildren = positions.map((position, index) => ({
      id: nextIntrusionId + index,
      kind: spawn.kind,
      hp: definition.maxHp,
      maxHp: definition.maxHp,
      position,
      previousPosition: position,
      spawnedTick: state.tickCount,
      lastMoveTick: state.tickCount,
      corruption: null
    }));
    nextIntrusionId += newChildren.length;
    spawnedIntrusionCount += newChildren.length;
    children = [...children, ...newChildren];
    if (newChildren.length > 0) {
      events = [
        ...events,
        { type: "intrusionSplit", tick: state.tickCount, parentId: intrusion.id, childIds: newChildren.map((child) => child.id), position: intrusion.position },
        ...newChildren.map((child) => ({ type: "intrusionSpawned", tick: state.tickCount, intrusionId: child.id, kind: child.kind, position: child.position }))
      ];
    }
  }
  return { ...state, grid, intrusions: [...survivors, ...children], nextIntrusionId, spawnedIntrusionCount, neutralizedCount, events };
}
function applySapperDeathPulse(state, initialGrid, initialEvents, intrusion) {
  const definition = state.config.enemies.sapper;
  const damage = definition.deathPulseDamage ?? 0;
  const range = definition.deathPulseRange ?? 0;
  if (damage <= 0) return { grid: initialGrid, events: initialEvents };
  if (range !== 1) throw new Error(`Unsupported Sapper death-pulse range: ${range}. Expected 1.`);
  let grid = initialGrid;
  let events = initialEvents;
  let affectedHardware = 0;
  for (const position of sortExpansionPositions(getExpansionOrthogonalNeighbors(grid, intrusion.position))) {
    const tile = getExpansionTileKind(grid, position);
    if (!isExpansionHardwareKind(tile) || tile === "latencyTrap") continue;
    const hardware = state.config.units[tile];
    const current = getExpansionTile(grid, position);
    const hp = Math.max(0, (current?.hp ?? hardware.hp ?? 0) - damage);
    affectedHardware += 1;
    events = [...events, { type: "unitDamaged", tick: state.tickCount, intrusionId: intrusion.id, position, unitKind: tile, hp }];
    grid = hp <= 0 ? setExpansionTile(grid, position, { kind: "empty" }) : setExpansionTile(grid, position, { ...current, kind: tile, hp });
    if (hp <= 0) events = [...events, { type: "hardwareDestroyed", tick: state.tickCount, intrusionId: intrusion.id, position, unitKind: tile, cause: "deathPulse" }];
  }
  events = [...events, { type: "sapperDeathPulse", tick: state.tickCount, intrusionId: intrusion.id, position: intrusion.position, damage, range, affectedHardware }];
  return { grid, events };
}

// src/sim/expansion/corruption.ts
function applyExpansionCorruption(state) {
  let grid = state.grid;
  let events = state.events;
  const intrusions = [];
  for (const intrusion of state.intrusions) {
    const kind = getExpansionTileKind(grid, intrusion.position);
    const corruptible = !sameExpansionPosition(intrusion.position, state.config.source) && !sameExpansionPosition(intrusion.position, state.config.core) && isExpansionHardwareKind(kind) && getExpansionHardwareCapabilities(kind).corruptible;
    if (!corruptible) {
      intrusions.push({ ...intrusion, corruption: null });
      continue;
    }
    const previous = intrusion.corruption;
    const progressTicks = previous && expansionPositionKey(previous.position) === expansionPositionKey(intrusion.position) ? previous.progressTicks + 1 : 1;
    const requiredTicks = state.config.enemies[intrusion.kind].corruptionTicks;
    events = [...events, { type: "corruptionProgress", tick: state.tickCount, intrusionId: intrusion.id, position: intrusion.position, progressTicks, requiredTicks }];
    if (progressTicks >= requiredTicks) {
      grid = setExpansionTileKind(grid, intrusion.position, "corrupted");
      events = [...events, { type: "tileCorrupted", tick: state.tickCount, intrusionId: intrusion.id, position: intrusion.position }];
      intrusions.push({ ...intrusion, corruption: null });
    } else {
      intrusions.push({ ...intrusion, corruption: { position: intrusion.position, progressTicks, requiredTicks } });
    }
  }
  return { ...state, grid, intrusions, events };
}

// src/sim/expansion/economy.ts
function applyExpansionBandwidthTrickle(state) {
  if (state.phase !== "active") return state;
  const wave4 = getCurrentExpansionWave(state);
  if (wave4.bandwidthTricklePerTick <= 0 || state.waveTick % wave4.bandwidthTrickleEveryTicks !== 0) return state;
  return { ...state, bandwidth: state.bandwidth + wave4.bandwidthTricklePerTick };
}

// src/sim/expansion/latency.ts
function applyExpansionLatencyTraps(state) {
  let grid = state.grid;
  let intrusions = [...state.intrusions];
  let events = state.events;
  for (const position of listExpansionPositions(grid)) {
    const tile = getExpansionTile(grid, position);
    if (tile.kind !== "latencyTrap") continue;
    let charges = tile.charges ?? state.config.units.latencyTrap.charges ?? 0;
    const entrants = intrusions.filter((intrusion) => intrusion.position.x === position.x && intrusion.position.y === position.y).filter((intrusion) => intrusion.previousPosition.x !== position.x || intrusion.previousPosition.y !== position.y).sort((a, b) => a.id - b.id);
    for (const entrant of entrants) {
      if (charges <= 0) break;
      charges -= 1;
      const extraMoveDelayTicks = state.config.units.latencyTrap.extraMoveDelayTicks ?? 0;
      intrusions = intrusions.map((intrusion) => intrusion.id === entrant.id ? { ...intrusion, lastMoveTick: state.tickCount + extraMoveDelayTicks } : intrusion);
      events = [...events, {
        type: "latencyTrapTriggered",
        tick: state.tickCount,
        intrusionId: entrant.id,
        position,
        remainingCharges: charges,
        extraMoveDelayTicks
      }];
    }
    grid = charges > 0 ? setExpansionTile(grid, position, { ...tile, charges }) : setExpansionTileKind(grid, position, "empty");
  }
  return { ...state, grid, intrusions, events };
}

// src/sim/expansion/scrubbing.ts
function applyExpansionScrubberProgress(state) {
  let grid = state.grid;
  let events = state.events;
  for (const position of listExpansionPositions(grid)) {
    const tile = getExpansionTile(grid, position);
    if (tile.kind !== "scrubber") continue;
    const progress = (tile.progress ?? 0) + 1;
    if (progress >= state.config.scrubberCleanseTicks) {
      grid = setExpansionTile(grid, position, { kind: "empty" });
      events = [...events, { type: "tileCleansed", tick: state.tickCount, position }];
    } else {
      grid = setExpansionTile(grid, position, { ...tile, progress });
    }
  }
  return { ...state, grid, events };
}

// src/sim/expansion/tick.ts
function tickExpansion(state) {
  if (state.phase === "won" || state.phase === "lost") return { ...state, events: [] };
  const tickCount = state.tickCount + 1;
  const base = { ...state, tickCount, waveTick: state.waveTick + 1, events: [] };
  if (state.phase === "prep") {
    const prepTicksRemaining = Math.max(0, state.prepTicksRemaining - 1);
    const prep = { ...base, prepTicksRemaining };
    return prepTicksRemaining === 0 ? startExpansionActivePhase(prep) : prep;
  }
  const economy = applyExpansionBandwidthTrickle(base);
  const spawned = spawnExpansionIntrusions(economy);
  const moved2 = moveExpansionIntrusions(spawned);
  const trapped = applyExpansionLatencyTraps(moved2);
  const combat = applyExpansionTurretCombat(trapped);
  const corrupted = applyExpansionCorruption(combat);
  const scrubbed = applyExpansionScrubberProgress(corrupted);
  const signal = deriveExpansionSignalState(scrubbed);
  const live = signal.status === "live";
  const afterSignal = live ? Math.min(scrubbed.config.coreIntegrityMax, scrubbed.coreIntegrity + scrubbed.config.coreIntegrityRegenPerLiveTick) : Math.max(0, scrubbed.coreIntegrity - scrubbed.config.coreIntegrityDrainPerSeveredTick);
  const breaches = scrubbed.intrusions.filter((intrusion) => sameExpansionPosition(intrusion.position, scrubbed.config.core));
  const contactDamage = breaches.reduce((total, intrusion) => total + scrubbed.config.enemies[intrusion.kind].coreContactDamage, 0);
  const coreIntegrity = Math.max(0, afterSignal - contactDamage);
  const routeDamage = scrubbed.coreIntegrity - afterSignal;
  const events = [
    ...scrubbed.events,
    ...state.signal.status === "live" && signal.status === "severed" ? [{ type: "routeSevered", tick: tickCount, previousRoute: state.signal.route }] : [],
    ...routeDamage > 0 ? [{ type: "coreDamaged", tick: tickCount, amount: routeDamage, integrity: coreIntegrity }] : [],
    ...breaches.map((intrusion) => ({ type: "coreBreach", tick: tickCount, intrusionId: intrusion.id, amount: scrubbed.config.enemies[intrusion.kind].coreContactDamage, integrity: coreIntegrity }))
  ];
  const progressed = {
    ...scrubbed,
    events,
    signal,
    coreIntegrity,
    uptimeTicks: scrubbed.uptimeTicks + (live ? 1 : 0),
    severedTicks: scrubbed.severedTicks + (live ? 0 : 1)
  };
  if (coreIntegrity <= 0) return { ...progressed, phase: "lost" };
  if (isCurrentExpansionWaveComplete(progressed)) {
    if (isFinalExpansionWave(progressed)) return { ...progressed, phase: "won" };
    return startExpansionPrepPhase(progressed, progressed.waveIndex + 1);
  }
  return progressed;
}

// src/sim/expansion/replay.ts
var MAX_EXPANSION_REPLAY_TICKS = 12e3;
var MAX_EXPANSION_REPLAY_COMMANDS = 5e3;
var ExpansionReplayError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ExpansionReplayError";
  }
};
function replayExpansionRun(input) {
  if (!input || typeof input !== "object" || "sector" in input || input.schema !== 2 || input.ruleset !== EXPANSION_RULESET_ID || input.campaign !== EXPANSION_CAMPAIGN_ID || typeof input.contentRevision !== "string") throw new ExpansionReplayError("Expansion replay identity mismatch.");
  if (typeof input.seed !== "string") throw new ExpansionReplayError("Expansion replay seed must be a string.");
  let expectedContentHash;
  try {
    expectedContentHash = getExpansionLevelContentHash(input.level, input.contentRevision);
  } catch {
    throw new ExpansionReplayError("Expansion replay revision or level is not authored.");
  }
  if (input.contentHash !== expectedContentHash) throw new ExpansionReplayError("Expansion content hash mismatch.");
  const commands = validateExpansionCommands(input.commands, input.contentRevision);
  let state = createExpansionGameState({ levelId: input.level, contentHash: input.contentHash, contentRevision: input.contentRevision, seed: input.seed });
  let index = 0;
  let ticks = 0;
  while (state.phase !== "won" && state.phase !== "lost") {
    while (index < commands.length && commands[index].t === state.tickCount) {
      state = applyExpansionCommand(state, commands[index].c);
      index += 1;
    }
    if (index < commands.length && commands[index].t < state.tickCount) throw new ExpansionReplayError("Command log is out of order.");
    state = tickExpansion(state);
    ticks += 1;
    if (ticks > MAX_EXPANSION_REPLAY_TICKS) throw new ExpansionReplayError("Expansion run exceeded the maximum tick budget.");
  }
  if (index < commands.length) throw new ExpansionReplayError("Command log contains commands after the run ended.");
  return { state, score: calculateExpansionScore(state) };
}
function validateExpansionCommands(value, revision) {
  if (!Array.isArray(value)) throw new ExpansionReplayError("Expansion command log must be an array.");
  if (value.length > MAX_EXPANSION_REPLAY_COMMANDS) throw new ExpansionReplayError("Expansion command log exceeds the maximum command count.");
  return value.map((entry) => validateExpansionRecordedCommand(entry, revision));
}
function validateExpansionRecordedCommand(value, revision) {
  if (!isRecord(value) || !Number.isInteger(value.t) || value.t < 0 || value.t > MAX_EXPANSION_REPLAY_TICKS) {
    throw new ExpansionReplayError("Expansion command has an invalid tick.");
  }
  return { t: value.t, c: validateExpansionCommand(value.c, revision) };
}
function validateExpansionCommand(value, revision) {
  if (!isRecord(value) || typeof value.type !== "string") throw new ExpansionReplayError("Expansion command is malformed.");
  if (value.type === "skipPrep") return { type: "skipPrep" };
  if (value.type === "sellUnit") return { type: "sellUnit", position: validatePosition(value.position) };
  if (value.type === "placeUnit") {
    if (typeof value.unit !== "string" || !isExpansionHardwareKind(value.unit)) throw new ExpansionReplayError("Expansion placement command has an invalid unit.");
    if (value.unit === "arcIce" && revision !== "expansion-1-r3" && revision !== "expansion-1-r4") throw new ExpansionReplayError("Arc ICE is not part of this replay revision.");
    return { type: "placeUnit", position: validatePosition(value.position), unit: value.unit };
  }
  throw new ExpansionReplayError("Expansion command type is unknown.");
}
function validatePosition(value) {
  if (!isRecord(value) || !Number.isInteger(value.x) || !Number.isInteger(value.y)) throw new ExpansionReplayError("Expansion command position is invalid.");
  return { x: value.x, y: value.y };
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// scripts/expansion-score-validator-entry.ts
function validateExpansionScore(payload) {
  const proof = canonicalExpansionScoreReplay(payload);
  let result;
  try {
    result = replayExpansionRun(proof);
  } catch (error) {
    throw new ExpansionScoreError(error instanceof Error ? error.message : "Replay failed.");
  }
  if (result.state.phase !== "won") throw new ExpansionScoreError("Clear all five waves before submitting a score.");
  const { total, rating, integrity, neutralized, uptimePercent, efficiencyBonus } = result.score;
  if (!Number.isSafeInteger(total) || total < 0 || total > 1e5) throw new ExpansionScoreError("Score out of bounds.");
  return {
    proof,
    category: expansionScoreCategory(proof.level),
    score: total,
    rating,
    metadata: {
      campaign: proof.campaign,
      ruleset: proof.ruleset,
      contentRevision: proof.contentRevision,
      contentHash: proof.contentHash,
      level: proof.level,
      phase: "won",
      integrity,
      neutralized,
      uptimePercent,
      efficiencyBonus
    }
  };
}
export {
  ExpansionScoreError,
  validateExpansionScore
};
