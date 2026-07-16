// src/sim/grid.ts
var ORTHOGONAL_DELTAS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 }
];
function createGrid(size) {
  assertPositiveInteger(size, "Grid size");
  return {
    size,
    tiles: Array.from({ length: size * size }, () => ({
      kind: "empty"
    }))
  };
}
function isInBounds(grid, position) {
  return Number.isInteger(position.x) && Number.isInteger(position.y) && position.x >= 0 && position.y >= 0 && position.x < grid.size && position.y < grid.size;
}
function toIndex(grid, position) {
  assertInBounds(grid, position);
  return position.y * grid.size + position.x;
}
function getTileKind(grid, position) {
  return getTile(grid, position).kind;
}
function getTile(grid, position) {
  return grid.tiles[toIndex(grid, position)];
}
function setTileKind(grid, position, kind) {
  return setTile(grid, position, { kind });
}
function setTile(grid, position, tile) {
  assertInBounds(grid, position);
  const tiles = [...grid.tiles];
  tiles[toIndex(grid, position)] = tile;
  return {
    ...grid,
    tiles
  };
}
function listPositions(grid) {
  const positions = [];
  for (let y = 0; y < grid.size; y += 1) {
    for (let x = 0; x < grid.size; x += 1) {
      positions.push({ x, y });
    }
  }
  return positions;
}
function getPositionsByKind(grid, kind) {
  return listPositions(grid).filter((position) => getTileKind(grid, position) === kind);
}
function getOrthogonalNeighbors(grid, position) {
  return ORTHOGONAL_DELTAS.map((delta) => ({
    x: position.x + delta.x,
    y: position.y + delta.y
  })).filter((neighbor) => isInBounds(grid, neighbor));
}
function getPerimeterPositions(grid) {
  return listPositions(grid).filter(
    (position) => position.x === 0 || position.y === 0 || position.x === grid.size - 1 || position.y === grid.size - 1
  );
}
function manhattanDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
function samePosition(a, b) {
  return a.x === b.x && a.y === b.y;
}
function positionKey(position) {
  return `${position.x},${position.y}`;
}
function sortPositionsByReadingOrder(positions) {
  return [...positions].sort((a, b) => a.y - b.y || a.x - b.x);
}
function isCorrupted(grid, position) {
  return getTileKind(grid, position) === "corrupted";
}
function assertInBounds(grid, position) {
  if (!isInBounds(grid, position)) {
    throw new Error(`Grid position out of bounds: ${positionKey(position)}`);
  }
}
function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

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
    positionKey2(sector.source),
    positionKey2(sector.core)
  ]);
  const initialTileKeys = /* @__PURE__ */ new Set();
  const voidKeys = /* @__PURE__ */ new Set();
  for (const voidTile of sector.voidTiles) {
    const key = positionKey2(voidTile);
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
    const key = positionKey2(initialTile.position);
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
  const target = positionKey2(sector.core);
  const visited = /* @__PURE__ */ new Set([positionKey2(sector.source)]);
  const queue = [sector.source];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }
    if (positionKey2(current) === target) {
      return;
    }
    for (const candidate of carriers) {
      const key = positionKey2(candidate);
      if (visited.has(key) || manhattanDistance2(current, candidate) > UNIT_TUNING.relay.signalRange) {
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
    `Sector ${sector.id} ${label} out of bounds: ${positionKey2(position)}.`
  );
}
function isPerimeter(sector, position) {
  return position.x === 0 || position.y === 0 || position.x === sector.gridSize - 1 || position.y === sector.gridSize - 1;
}
function isInitialUnitKind(kind) {
  return kind === "relay" || kind === "firewall" || kind === "turret";
}
function manhattanDistance2(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
function positionKey2(position) {
  return `${position.x},${position.y}`;
}
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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

// src/sim/routing.ts
function computeSignalRoute(input) {
  assertRoutingInput(input);
  if (isCorrupted(input.grid, input.source) || isCorrupted(input.grid, input.core)) {
    return null;
  }
  const carriers = getSignalCarriers(input);
  const route = bfs({
    start: input.source,
    isGoal: (position) => samePosition(position, input.core),
    getNeighbors: (position) => getConnectedCarriers(position, carriers, input),
    toKey: positionKey
  });
  if (route) {
    assertRouteValidity(route, input);
  }
  return route;
}
function assertRouteValidity(route, input) {
  assert2(route.length > 0, "Signal route must contain at least one tile.");
  assert2(
    samePosition(route[0], input.source),
    "Signal route must begin at the Source tile."
  );
  assert2(
    samePosition(route[route.length - 1], input.core),
    "Signal route must end at the Core tile."
  );
  const visited = /* @__PURE__ */ new Set();
  for (const position of route) {
    const key = positionKey(position);
    assert2(!visited.has(key), `Signal route loops through ${key}.`);
    visited.add(key);
    assert2(isInBounds(input.grid, position), `Signal route leaves grid at ${key}.`);
    assert2(!isCorrupted(input.grid, position), `Signal route uses corrupted tile ${key}.`);
    assert2(
      isSignalCarrier(position, input),
      `Signal route uses non-carrier tile ${key}.`
    );
  }
  for (let index = 1; index < route.length; index += 1) {
    const previous = route[index - 1];
    const current = route[index];
    const distance = manhattanDistance(previous, current);
    assert2(
      distance <= input.relaySignalRange,
      `Signal route hop ${positionKey(previous)} -> ${positionKey(current)} exceeds relay range.`
    );
  }
}
function getSignalCarriers(input) {
  const carrierPositions = listPositions(input.grid).filter(
    (position) => !samePosition(position, input.source) && !samePosition(position, input.core) && !isCorrupted(input.grid, position) && isSignalCarrierKind(getTileKind(input.grid, position))
  );
  return [
    input.source,
    ...sortPositionsByReadingOrder(carrierPositions),
    input.core
  ];
}
function getConnectedCarriers(position, carriers, input) {
  return carriers.filter(
    (candidate) => !samePosition(candidate, position) && manhattanDistance(position, candidate) <= input.relaySignalRange
  );
}
function isSignalCarrier(position, input) {
  if (samePosition(position, input.source) || samePosition(position, input.core)) {
    return true;
  }
  return isSignalCarrierKind(getTileKind(input.grid, position));
}
function isSignalCarrierKind(kind) {
  return kind === "relay" || kind === "firewall";
}
function assertRoutingInput(input) {
  assert2(isInBounds(input.grid, input.source), "Source tile must be in bounds.");
  assert2(isInBounds(input.grid, input.core), "Core tile must be in bounds.");
  assert2(
    Number.isInteger(input.relaySignalRange) && input.relaySignalRange > 0,
    "Relay signal range must be a positive integer."
  );
}
function assert2(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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

// src/sim/waves.ts
function getCurrentWave(state) {
  const wave = state.config.waves[state.waveIndex];
  if (!wave) {
    throw new Error(`Missing wave at index ${state.waveIndex}.`);
  }
  return wave;
}
function startPrepPhase(state, waveIndex) {
  const wave = state.config.waves[waveIndex];
  if (!wave) {
    return {
      ...state,
      phase: "won",
      waveTick: 0,
      prepTicksRemaining: 0,
      activeTaunt: "",
      waveSpawnedCount: 0,
      events: []
    };
  }
  const tauntPick = nextInt(state.rng, 0, ANTAGONIST_TAUNTS.length);
  return {
    ...state,
    rng: tauntPick.rng,
    phase: "prep",
    waveIndex,
    waveTick: 0,
    prepTicksRemaining: wave.prepTicks,
    activeTaunt: ANTAGONIST_TAUNTS[tauntPick.value],
    bandwidth: state.bandwidth + wave.bandwidthGrant,
    waveSpawnedCount: 0,
    events: []
  };
}
function startActivePhase(state) {
  if (state.phase !== "prep") {
    return state;
  }
  return {
    ...state,
    phase: "active",
    waveTick: 0,
    prepTicksRemaining: 0,
    events: []
  };
}
function isCurrentWaveComplete(state) {
  const wave = getCurrentWave(state);
  return state.waveSpawnedCount >= wave.maxSpawnedIntrusions && state.intrusions.length === 0;
}
function isFinalWave(state) {
  return state.waveIndex >= state.config.waves.length - 1;
}

// src/sim/state.ts
function createGameState(options = {}) {
  const sector = getSectorDefinition(options.sector ?? 1);
  const config = createSimConfig(sector.id);
  let grid = createGrid(config.gridSize);
  for (const voidTile of sector.voidTiles) {
    grid = setTile(grid, voidTile, { kind: "void" });
  }
  const voidKeys = new Set(sector.voidTiles.map(positionKey));
  for (const initialTile of options.initialTiles ?? sector.initialTiles) {
    const key = positionKey(initialTile.position);
    if (voidKeys.has(key)) {
      throw new Error(`Initial tile overlaps sector void at ${key}.`);
    }
    grid = setTile(grid, initialTile.position, createInitialTile(config, initialTile.kind));
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
    signal: {
      status: "severed",
      route: [],
      routeTick: 0
    },
    intrusions: [],
    nextIntrusionId: 1,
    spawnedIntrusionCount: 0,
    neutralizedCount: 0,
    events: [],
    coreIntegrity: config.initialCoreIntegrity,
    uptimeTicks: 0,
    severedTicks: 0
  };
  return withRecomputedSignal(startPrepPhase(baseState, 0));
}
function withRecomputedSignal(state) {
  return {
    ...state,
    signal: deriveSignalState(state)
  };
}
function deriveSignalState(state) {
  const route = computeSignalRoute({
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
function isSignalLive(state) {
  return state.signal.status === "live";
}
function createSimConfig(sectorId) {
  const sector = getSectorDefinition(sectorId);
  return {
    gridSize: sector.gridSize,
    sectorId: sector.id,
    sectorName: sector.codename,
    source: {
      x: sector.source.x,
      y: sector.source.y
    },
    core: {
      x: sector.core.x,
      y: sector.core.y
    },
    relaySignalRange: UNIT_TUNING.relay.signalRange,
    turretRange: UNIT_TUNING.turret.range,
    turretDamagePerTick: UNIT_TUNING.turret.damagePerTick,
    toolsUnlocked: sector.toolsUnlocked,
    scrubberCleanseTicks: UNIT_TUNING.scrubber.cleanseTicks,
    overclockBonusDamage: UNIT_TUNING.overclock.bonusDamage,
    initialCoreIntegrity: CORE_TUNING.initialCoreIntegrity,
    coreIntegrityMax: CORE_TUNING.coreIntegrityMax,
    coreIntegrityDrainPerSeveredTick: CORE_TUNING.coreIntegrityDrainPerSeveredTick,
    coreIntegrityRegenPerLiveTick: CORE_TUNING.coreIntegrityRegenPerLiveTick,
    simulationTickMs: CORE_TUNING.simulationTickMs,
    defaultSeed: CORE_TUNING.defaultSeed,
    enemies: {
      probe: { ...ENEMY_TUNING.probe },
      crawler: { ...ENEMY_TUNING.crawler },
      spoof: { ...ENEMY_TUNING.spoof },
      hunter: { ...ENEMY_TUNING.hunter },
      splitter: { ...ENEMY_TUNING.splitter },
      goliath: { ...ENEMY_TUNING.goliath }
    },
    units: {
      relay: {
        cost: UNIT_TUNING.relay.cost,
        sellRefund: UNIT_TUNING.relay.sellRefund,
        hp: UNIT_TUNING.relay.hp
      },
      firewall: {
        cost: UNIT_TUNING.firewall.cost,
        sellRefund: UNIT_TUNING.firewall.sellRefund,
        hp: UNIT_TUNING.firewall.hp
      },
      turret: {
        cost: UNIT_TUNING.turret.cost,
        sellRefund: UNIT_TUNING.turret.sellRefund,
        hp: UNIT_TUNING.turret.hp
      },
      scrubber: {
        cost: UNIT_TUNING.scrubber.cost,
        sellRefund: UNIT_TUNING.scrubber.sellRefund,
        hp: UNIT_TUNING.scrubber.hp
      },
      overclock: {
        cost: UNIT_TUNING.overclock.cost,
        sellRefund: UNIT_TUNING.overclock.sellRefund,
        hp: UNIT_TUNING.overclock.hp
      }
    },
    waves: sector.waves
  };
}
function createInitialTile(config, kind) {
  if (!isUnitKind(kind)) {
    return { kind };
  }
  return {
    kind,
    hp: config.units[kind].hp,
    ...kind === "scrubber" ? { progress: 0 } : {}
  };
}
function isUnitKind(kind) {
  return kind === "relay" || kind === "firewall" || kind === "turret" || kind === "scrubber" || kind === "overclock";
}
function getSectorDefinition(sectorId) {
  const sector = SECTORS.find((candidate) => candidate.id === sectorId);
  if (!sector) {
    throw new Error(`Unknown sector id: ${sectorId}.`);
  }
  return sector;
}

// src/sim/commands.ts
function applyCommand(state, command) {
  switch (command.type) {
    case "setTileKind":
      assertSpecialTilePlacement(state, command.position, command.kind);
      return withRecomputedSignal({
        ...state,
        grid: setTile(state.grid, command.position, createTileForKind(state, command.kind))
      });
    case "clearTile":
      return withRecomputedSignal({
        ...state,
        grid: setTileKind(state.grid, command.position, "empty")
      });
    case "corruptTile":
      return withRecomputedSignal({
        ...state,
        grid: setTileKind(state.grid, command.position, "corrupted")
      });
    case "placeUnit":
      return placeUnit(state, command.position, command.unit);
    case "sellUnit":
      return sellUnit(state, command.position);
    case "skipPrep":
      return startActivePhase(state);
  }
}
function placeUnit(state, position, unit) {
  if (state.phase === "won" || state.phase === "lost") {
    return state;
  }
  if (!state.config.toolsUnlocked.includes(unit)) {
    return state;
  }
  if (isSpecialTile(state, position)) {
    return state;
  }
  const tileKind = getTileKind(state.grid, position);
  const canPlace = unit === "scrubber" ? tileKind === "corrupted" : tileKind === "empty";
  if (!canPlace) {
    return state;
  }
  if (state.intrusions.some((intrusion) => samePosition(intrusion.position, position))) {
    return state;
  }
  const cost = state.config.units[unit].cost;
  if (state.bandwidth < cost) {
    return state;
  }
  return withRecomputedSignal({
    ...state,
    bandwidth: state.bandwidth - cost,
    grid: setTile(state.grid, position, {
      kind: unit,
      hp: state.config.units[unit].hp,
      ...unit === "scrubber" ? { progress: 0 } : {}
    })
  });
}
function sellUnit(state, position) {
  if (state.phase === "won" || state.phase === "lost") {
    return state;
  }
  const kind = getTileKind(state.grid, position);
  if (!isUnitKind2(kind) || kind === "scrubber") {
    return state;
  }
  const definition = state.config.units[kind];
  const refund = state.phase === "prep" ? definition.cost : definition.sellRefund;
  return withRecomputedSignal({
    ...state,
    bandwidth: state.bandwidth + refund,
    grid: setTileKind(state.grid, position, "empty")
  });
}
function assertSpecialTilePlacement(state, position, kind) {
  const isOnSpecialTile = isSpecialTile(state, position);
  if (isOnSpecialTile && kind !== "empty" && kind !== "corrupted") {
    throw new Error("Source and Core tiles cannot hold player unit tile states.");
  }
}
function isSpecialTile(state, position) {
  return samePosition(position, state.config.source) || samePosition(position, state.config.core);
}
function isUnitKind2(kind) {
  return kind === "relay" || kind === "firewall" || kind === "turret" || kind === "scrubber" || kind === "overclock";
}
function createTileForKind(state, kind) {
  if (!isUnitKind2(kind)) {
    return { kind };
  }
  return {
    kind,
    hp: state.config.units[kind].hp,
    ...kind === "scrubber" ? { progress: 0 } : {}
  };
}

// src/sim/scoring.ts
var NEUTRALIZED_WEIGHT = 10;
var EFFICIENCY_DIVISOR = 2;
var EFFICIENCY_CAP = 60;
function calculateScore(state) {
  const measuredTicks = state.uptimeTicks + state.severedTicks;
  const uptimePercent = measuredTicks === 0 ? 0 : Math.round(state.uptimeTicks / measuredTicks * 100);
  const integrity = Math.max(0, state.coreIntegrity);
  const neutralized = state.neutralizedCount * NEUTRALIZED_WEIGHT;
  const uptimeScore = uptimePercent;
  const efficiencyBonus = Math.min(EFFICIENCY_CAP, Math.floor(state.bandwidth / EFFICIENCY_DIVISOR));
  const total = integrity + neutralized + uptimeScore + efficiencyBonus;
  return {
    integrity,
    neutralized,
    uptimePercent,
    uptimeScore,
    efficiencyBonus,
    total,
    rating: getOperatorRating(total, state.phase)
  };
}
function getOperatorRating(total, phase) {
  if (phase === "lost") {
    if (total >= 180) {
      return "Burned But Breathing";
    }
    return "Blackout Casualty";
  }
  if (total >= 360) {
    return "Ghostline Architect";
  }
  if (total >= 300) {
    return "Signal Warden";
  }
  if (total >= 240) {
    return "Relay Captain";
  }
  return "Patch Runner";
}

// src/sim/ruleset.ts
var SIM_RULESET_ID = "phase4-v1";

// src/sim/combat.ts
function applyTurretCombat(state) {
  if (state.config.turretDamagePerTick <= 0 || state.config.turretRange <= 0) {
    return state;
  }
  const turrets = getPositionsByKind(state.grid, "turret");
  if (turrets.length === 0 || state.intrusions.length === 0) {
    return state;
  }
  const hpById = new Map(
    state.intrusions.map((intrusion) => [intrusion.id, intrusion.hp])
  );
  let events = state.events;
  for (const turretPosition of turrets) {
    const damage = getTurretDamage(state, turretPosition);
    for (const intrusion of state.intrusions) {
      if (manhattanDistance(turretPosition, intrusion.position) > state.config.turretRange) {
        continue;
      }
      const currentHp = hpById.get(intrusion.id) ?? intrusion.hp;
      if (currentHp <= 0) {
        continue;
      }
      hpById.set(intrusion.id, currentHp - damage);
      events = [
        ...events,
        {
          type: "turretHit",
          tick: state.tickCount,
          turretPosition,
          targetId: intrusion.id,
          targetPosition: intrusion.position,
          damage
        }
      ];
    }
  }
  const survivingIntrusions = [];
  let neutralizedCount = state.neutralizedCount;
  let nextIntrusionId = state.nextIntrusionId;
  let spawnedIntrusionCount = state.spawnedIntrusionCount;
  let splitChildren = [];
  for (const intrusion of state.intrusions) {
    const hp = hpById.get(intrusion.id) ?? intrusion.hp;
    if (hp <= 0) {
      neutralizedCount += 1;
      events = [
        ...events,
        {
          type: "intrusionNeutralized",
          tick: state.tickCount,
          intrusionId: intrusion.id,
          position: intrusion.position
        }
      ];
      const split = createSplitChildren(state, intrusion, nextIntrusionId, splitChildren);
      if (split.children.length > 0) {
        nextIntrusionId += split.children.length;
        spawnedIntrusionCount += split.children.length;
        splitChildren = [...splitChildren, ...split.children];
        events = [
          ...events,
          {
            type: "intrusionSplit",
            tick: state.tickCount,
            parentId: intrusion.id,
            childIds: split.children.map((child) => child.id),
            position: intrusion.position
          },
          ...split.children.map((child) => ({
            type: "intrusionSpawned",
            tick: state.tickCount,
            intrusionId: child.id,
            kind: child.kind,
            position: child.position
          }))
        ];
      }
      continue;
    }
    survivingIntrusions.push({
      ...intrusion,
      hp
    });
  }
  return {
    ...state,
    intrusions: [...survivingIntrusions, ...splitChildren],
    nextIntrusionId,
    spawnedIntrusionCount,
    neutralizedCount,
    events
  };
}
function getTurretDamage(state, turretPosition) {
  const adjacentOverclocks = getOrthogonalNeighbors(state.grid, turretPosition).filter(
    (position) => getTileKind(state.grid, position) === "overclock"
  ).length;
  return state.config.turretDamagePerTick + adjacentOverclocks * state.config.overclockBonusDamage;
}
function createSplitChildren(state, intrusion, nextIntrusionId, existingSplitChildren) {
  const spawn = state.config.enemies[intrusion.kind].onDeathSpawn;
  if (!spawn) {
    return {
      children: []
    };
  }
  const definition = state.config.enemies[spawn.kind];
  const occupiedIntrusions = [
    ...state.intrusions.filter((candidate) => candidate.id !== intrusion.id),
    ...existingSplitChildren
  ];
  const positions = getSplitSpawnCandidates(intrusion.position).filter((position) => isInBounds(state.grid, position)).filter((position) => {
    const kind = getTileKind(state.grid, position);
    return kind === "empty" || kind === "corrupted";
  }).filter(
    (position) => !occupiedIntrusions.some((occupied) => samePosition(occupied.position, position))
  ).slice(0, spawn.count);
  return {
    children: positions.map((position, index) => ({
      id: nextIntrusionId + index,
      kind: spawn.kind,
      hp: definition.maxHp,
      maxHp: definition.maxHp,
      position,
      previousPosition: position,
      spawnedTick: state.tickCount,
      lastMoveTick: state.tickCount,
      corruption: null
    }))
  };
}
function getSplitSpawnCandidates(position) {
  return [
    position,
    { x: position.x, y: position.y - 1 },
    { x: position.x + 1, y: position.y },
    { x: position.x, y: position.y + 1 },
    { x: position.x - 1, y: position.y }
  ];
}

// src/sim/corruption.ts
function applyIntrusionCorruption(state) {
  let grid = state.grid;
  let events = state.events;
  const intrusions = [];
  for (const intrusion of state.intrusions) {
    if (!isCorruptiblePosition(state, grid, intrusion.position)) {
      intrusions.push({
        ...intrusion,
        corruption: null
      });
      continue;
    }
    const requiredTicks = getRequiredCorruptionTicks(state, intrusion);
    const previousContact = intrusion.corruption;
    const isSameContact = previousContact !== null && positionKey(previousContact.position) === positionKey(intrusion.position);
    const progressTicks = isSameContact ? previousContact.progressTicks + 1 : 1;
    events = [
      ...events,
      {
        type: "corruptionProgress",
        tick: state.tickCount,
        intrusionId: intrusion.id,
        position: intrusion.position,
        progressTicks,
        requiredTicks
      }
    ];
    if (progressTicks >= requiredTicks) {
      grid = setTileKind(grid, intrusion.position, "corrupted");
      events = [
        ...events,
        {
          type: "tileCorrupted",
          tick: state.tickCount,
          intrusionId: intrusion.id,
          position: intrusion.position
        }
      ];
      intrusions.push({
        ...intrusion,
        corruption: null
      });
      continue;
    }
    intrusions.push({
      ...intrusion,
      corruption: {
        position: intrusion.position,
        progressTicks,
        requiredTicks
      }
    });
  }
  return {
    ...state,
    grid,
    intrusions,
    events
  };
}
function isCorruptiblePosition(state, grid, position) {
  if (getTileKind(grid, position) === "corrupted") {
    return false;
  }
  if (samePosition(position, state.config.source) || samePosition(position, state.config.core)) {
    return false;
  }
  const kind = getTileKind(grid, position);
  return kind === "relay" || kind === "turret" || kind === "scrubber" || kind === "overclock";
}
function getRequiredCorruptionTicks(state, intrusion) {
  return state.config.enemies[intrusion.kind].corruptionTicks;
}

// src/sim/economy.ts
function applyBandwidthTrickle(state) {
  if (state.phase !== "active") {
    return state;
  }
  const wave = getCurrentWave(state);
  if (wave.bandwidthTricklePerTick <= 0 || state.waveTick % wave.bandwidthTrickleEveryTicks !== 0) {
    return state;
  }
  return {
    ...state,
    bandwidth: state.bandwidth + wave.bandwidthTricklePerTick
  };
}

// src/sim/intrusions.ts
var ENEMY_KIND_ORDER = [
  "probe",
  "crawler",
  "spoof",
  "hunter",
  "splitter",
  "goliath"
];
var ORTHOGONAL_DELTAS2 = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 }
];
function spawnIntrusions(state) {
  if (state.phase !== "active") {
    return state;
  }
  let nextState = spawnScriptedIntrusions(state);
  if (!shouldCadenceSpawn(nextState)) {
    return nextState;
  }
  const kindPick = pickEnemyKind(nextState);
  nextState = {
    ...nextState,
    rng: kindPick.rng
  };
  const definition = nextState.config.enemies[kindPick.kind];
  const wave = getCurrentWave(nextState);
  for (let spawnIndex = 0; spawnIndex < definition.spawnBatchSize; spawnIndex += 1) {
    if (nextState.intrusions.length >= wave.maxActiveIntrusions || nextState.waveSpawnedCount >= wave.maxSpawnedIntrusions) {
      break;
    }
    const spawnPick = pickSpawnPosition(nextState);
    nextState = {
      ...nextState,
      rng: spawnPick.rng
    };
    if (!spawnPick.position) {
      break;
    }
    nextState = spawnIntrusionAt(nextState, kindPick.kind, spawnPick.position, true);
  }
  return nextState;
}
function moveIntrusions(state) {
  const targetSets = getTargetSets(state);
  let grid = state.grid;
  let events = state.events;
  const intrusions = [];
  for (const intrusion of state.intrusions) {
    const definition = state.config.enemies[intrusion.kind];
    if (state.tickCount - intrusion.lastMoveTick < definition.moveEveryTicks) {
      intrusions.push({
        ...intrusion,
        previousPosition: intrusion.position
      });
      continue;
    }
    const workingState = {
      ...state,
      grid,
      events
    };
    const targets = getTargetsForIntrusion(definition, targetSets);
    const path = findPathToNearestTarget(workingState, intrusion, targets);
    if (path && path.length >= 2) {
      const nextPosition2 = path[1];
      events = [
        ...events,
        createMoveEvent(workingState, intrusion, nextPosition2)
      ];
      intrusions.push(moveIntrusion(state, intrusion, nextPosition2));
      continue;
    }
    const breachPath = findPathToNearestTarget(workingState, intrusion, targets, true);
    if (!breachPath || breachPath.length < 2) {
      intrusions.push({
        ...intrusion,
        previousPosition: intrusion.position,
        lastMoveTick: state.tickCount
      });
      continue;
    }
    const nextPosition = breachPath[1];
    const nextKind = getTileKind(grid, nextPosition);
    if (isUnitKind3(nextKind)) {
      const attack = attackUnitTile(
        workingState,
        grid,
        events,
        intrusion,
        definition,
        nextPosition,
        nextKind
      );
      grid = attack.grid;
      events = attack.events;
      intrusions.push({
        ...intrusion,
        previousPosition: intrusion.position,
        lastMoveTick: state.tickCount,
        corruption: null
      });
      continue;
    }
    events = [
      ...events,
      createMoveEvent(workingState, intrusion, nextPosition)
    ];
    intrusions.push(moveIntrusion(state, intrusion, nextPosition));
  }
  return {
    ...state,
    grid,
    intrusions,
    events
  };
}
function spawnScriptedIntrusions(state) {
  const wave = getCurrentWave(state);
  const scriptedSpawns = wave.scriptedSpawns?.filter(
    (entry) => entry.waveTick === state.waveTick
  ) ?? [];
  let nextState = state;
  for (const entry of scriptedSpawns) {
    if (nextState.waveSpawnedCount >= wave.maxSpawnedIntrusions) {
      break;
    }
    const spawnPick = pickSpawnPosition(nextState);
    nextState = {
      ...nextState,
      rng: spawnPick.rng
    };
    if (!spawnPick.position) {
      continue;
    }
    nextState = spawnIntrusionAt(nextState, entry.kind, spawnPick.position, true);
  }
  return nextState;
}
function spawnIntrusionAt(state, kind, position, countTowardWave) {
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
    waveSpawnedCount: state.waveSpawnedCount + (countTowardWave ? 1 : 0),
    events: [
      ...state.events,
      {
        type: "intrusionSpawned",
        tick: state.tickCount,
        intrusionId: intrusion.id,
        kind: intrusion.kind,
        position: intrusion.position
      }
    ]
  };
}
function shouldCadenceSpawn(state) {
  const wave = getCurrentWave(state);
  if (state.waveTick < wave.spawnFirstTick) {
    return false;
  }
  if (state.waveSpawnedCount >= wave.maxSpawnedIntrusions) {
    return false;
  }
  if (state.intrusions.length >= wave.maxActiveIntrusions) {
    return false;
  }
  if (getEnemyWeightTotal(wave.enemyWeights) <= 0) {
    return false;
  }
  return (state.waveTick - wave.spawnFirstTick) % wave.spawnEveryTicks === 0;
}
function pickEnemyKind(state) {
  const wave = getCurrentWave(state);
  const totalWeight = getEnemyWeightTotal(wave.enemyWeights);
  const pick = nextInt(state.rng, 0, totalWeight);
  let cursor = pick.value;
  for (const kind of ENEMY_KIND_ORDER) {
    cursor -= wave.enemyWeights[kind];
    if (cursor < 0) {
      return {
        rng: pick.rng,
        kind
      };
    }
  }
  return {
    rng: pick.rng,
    kind: ENEMY_KIND_ORDER[ENEMY_KIND_ORDER.length - 1]
  };
}
function getEnemyWeightTotal(weights) {
  return ENEMY_KIND_ORDER.reduce((total, kind) => total + weights[kind], 0);
}
function pickSpawnPosition(state) {
  const wave = getCurrentWave(state);
  const candidates = sortPositionsByReadingOrder(
    getPerimeterPositions(state.grid).filter(
      (position) => isOnSpawnEdge(state, position, wave.spawnEdges) && isSpawnable(state, position)
    )
  );
  if (candidates.length === 0) {
    return {
      rng: state.rng,
      position: null
    };
  }
  let rng = state.rng;
  for (let attempt = 0; attempt < wave.perimeterPickAttempts; attempt += 1) {
    const pick = nextInt(rng, 0, candidates.length);
    rng = pick.rng;
    const position = candidates[pick.value];
    if (isSpawnable(state, position)) {
      return {
        rng,
        position
      };
    }
  }
  return {
    rng,
    position: candidates[0]
  };
}
function isOnSpawnEdge(state, position, spawnEdges) {
  return spawnEdges.some((edge) => isOnEdge(state, position, edge));
}
function isOnEdge(state, position, edge) {
  switch (edge) {
    case "north":
      return position.y === 0;
    case "east":
      return position.x === state.grid.size - 1;
    case "south":
      return position.y === state.grid.size - 1;
    case "west":
      return position.x === 0;
  }
}
function isSpawnable(state, position) {
  if (samePosition(position, state.config.source) || samePosition(position, state.config.core)) {
    return false;
  }
  if (getTileKind(state.grid, position) !== "empty") {
    return false;
  }
  return !state.intrusions.some((intrusion) => samePosition(intrusion.position, position));
}
function getTargetSets(state) {
  const units = sortPositionsByReadingOrder(
    listPositions(state.grid).filter((position) => {
      const kind = getTileKind(state.grid, position);
      return kind === "relay" || kind === "turret" || kind === "scrubber" || kind === "overclock";
    })
  );
  if (state.signal.route.length > 0) {
    const inwardRouteTargets = state.signal.route.filter(
      (position) => !samePosition(position, state.config.source) && !samePosition(position, state.config.core) && getTileKind(state.grid, position) !== "firewall"
    );
    if (inwardRouteTargets.length > 0) {
      return {
        route: inwardRouteTargets,
        units
      };
    }
  }
  return {
    route: [state.config.core],
    units
  };
}
function getTargetsForIntrusion(definition, targetSets) {
  if (definition.targeting === "units" && targetSets.units.length > 0) {
    return targetSets.units;
  }
  return targetSets.route;
}
function findPathToNearestTarget(state, intrusion, targets, allowUnitSearch = false) {
  const targetKeys = new Set(targets.map(positionKey));
  return bfs({
    start: intrusion.position,
    isGoal: (position) => targetKeys.has(positionKey(position)),
    getNeighbors: (position) => getIntrusionNeighbors(
      state,
      intrusion.kind,
      position,
      targetKeys,
      allowUnitSearch
    ),
    toKey: positionKey
  });
}
function getIntrusionNeighbors(state, kind, position, targetKeys, allowUnitSearch) {
  const neighbors = getOrthogonalNeighbors(state.grid, position).filter(
    (neighbor) => allowUnitSearch ? canIntrusionSearchThrough(state, neighbor, targetKeys) : canIntrusionEnter(state, neighbor, targetKeys)
  );
  if (kind !== "spoof") {
    return neighbors;
  }
  const jumps = ORTHOGONAL_DELTAS2.map((delta) => ({
    blocker: {
      x: position.x + delta.x,
      y: position.y + delta.y
    },
    landing: {
      x: position.x + delta.x * 2,
      y: position.y + delta.y * 2
    }
  })).filter(
    ({ blocker, landing }) => isInBounds(state.grid, blocker) && isInBounds(state.grid, landing) && isBlocker(state, blocker, targetKeys) && canIntrusionEnter(state, landing, targetKeys)
  ).map(({ landing }) => landing);
  return [...neighbors, ...jumps];
}
function canIntrusionEnter(state, position, targetKeys) {
  const kind = getTileKind(state.grid, position);
  if (kind === "firewall" || kind === "void") {
    return false;
  }
  if (targetKeys.has(positionKey(position))) {
    return true;
  }
  return kind === "empty" || kind === "corrupted";
}
function canIntrusionSearchThrough(state, position, targetKeys) {
  if (canIntrusionEnter(state, position, targetKeys)) {
    return true;
  }
  return isUnitKind3(getTileKind(state.grid, position));
}
function isBlocker(state, position, targetKeys) {
  if (targetKeys.has(positionKey(position))) {
    return false;
  }
  const kind = getTileKind(state.grid, position);
  return isUnitKind3(kind);
}
function attackUnitTile(state, grid, events, intrusion, definition, position, unitKind) {
  const tile = getTile(grid, position);
  const currentHp = tile.hp ?? state.config.units[unitKind].hp;
  const nextHp = Math.max(0, currentHp - definition.chewDamage);
  const damagedEvent = {
    type: "unitDamaged",
    tick: state.tickCount,
    intrusionId: intrusion.id,
    position,
    unitKind,
    hp: nextHp
  };
  if (nextHp <= 0) {
    return {
      grid: setTile(grid, position, { kind: "corrupted" }),
      events: [
        ...events,
        damagedEvent,
        {
          type: "tileCorrupted",
          tick: state.tickCount,
          intrusionId: intrusion.id,
          position
        }
      ]
    };
  }
  return {
    grid: setTile(grid, position, {
      ...tile,
      hp: nextHp
    }),
    events: [...events, damagedEvent]
  };
}
function createMoveEvent(state, intrusion, nextPosition) {
  const jumped = Math.abs(nextPosition.x - intrusion.position.x) + Math.abs(nextPosition.y - intrusion.position.y) > 1;
  return {
    type: "intrusionMoved",
    tick: state.tickCount,
    intrusionId: intrusion.id,
    from: intrusion.position,
    to: nextPosition,
    jumped
  };
}
function moveIntrusion(state, intrusion, nextPosition) {
  return {
    ...intrusion,
    previousPosition: intrusion.position,
    position: nextPosition,
    lastMoveTick: state.tickCount,
    corruption: null
  };
}
function isUnitKind3(kind) {
  return kind === "relay" || kind === "firewall" || kind === "turret" || kind === "scrubber" || kind === "overclock";
}

// src/sim/scrubbing.ts
function applyScrubberProgress(state) {
  let grid = state.grid;
  let events = state.events;
  for (const position of listPositions(grid)) {
    const tile = getTile(grid, position);
    if (tile.kind !== "scrubber") {
      continue;
    }
    const progress = (tile.progress ?? 0) + 1;
    if (progress >= state.config.scrubberCleanseTicks) {
      grid = setTile(grid, position, { kind: "empty" });
      events = [
        ...events,
        {
          type: "tileCleansed",
          tick: state.tickCount,
          position
        }
      ];
      continue;
    }
    grid = setTile(grid, position, {
      ...tile,
      progress
    });
  }
  return {
    ...state,
    grid,
    events
  };
}

// src/sim/tick.ts
function tick(state) {
  if (state.phase === "won" || state.phase === "lost") {
    return {
      ...state,
      events: []
    };
  }
  const nextTickCount = state.tickCount + 1;
  const nextBaseState = {
    ...state,
    tickCount: nextTickCount,
    waveTick: state.waveTick + 1,
    events: []
  };
  if (state.phase === "prep") {
    const prepTicksRemaining = Math.max(0, state.prepTicksRemaining - 1);
    const prepState = {
      ...nextBaseState,
      prepTicksRemaining
    };
    return prepTicksRemaining === 0 ? startActivePhase(prepState) : prepState;
  }
  const withEconomy = applyBandwidthTrickle(nextBaseState);
  const withSpawns = spawnIntrusions(withEconomy);
  const withMovement = moveIntrusions(withSpawns);
  const withCombat = applyTurretCombat(withMovement);
  const withCorruption = applyIntrusionCorruption(withCombat);
  const withScrubbing = applyScrubberProgress(withCorruption);
  const signal = deriveSignalState(withScrubbing);
  const isLive = signal.status === "live";
  const drainAmount = isLive ? 0 : withScrubbing.config.coreIntegrityDrainPerSeveredTick;
  const regenAmount = isLive ? withScrubbing.config.coreIntegrityRegenPerLiveTick : 0;
  const coreIntegrityAfterSignal = isLive ? Math.min(
    withScrubbing.config.coreIntegrityMax,
    withScrubbing.coreIntegrity + regenAmount
  ) : Math.max(
    0,
    withScrubbing.coreIntegrity - drainAmount
  );
  const contactBreaches = withScrubbing.intrusions.filter((intrusion) => samePosition(intrusion.position, withScrubbing.config.core)).map((intrusion) => ({
    intrusionId: intrusion.id,
    amount: withScrubbing.config.enemies[intrusion.kind].coreContactDamage
  }));
  const contactDamage = contactBreaches.reduce(
    (total, breach) => total + breach.amount,
    0
  );
  const coreIntegrity = Math.max(
    0,
    Math.min(
      withScrubbing.config.coreIntegrityMax,
      coreIntegrityAfterSignal - contactDamage
    )
  );
  const routeDrainAmount = withScrubbing.coreIntegrity - coreIntegrityAfterSignal;
  const events = [
    ...withScrubbing.events,
    ...state.signal.status === "live" && signal.status === "severed" ? [
      {
        type: "routeSevered",
        tick: nextTickCount,
        previousRoute: state.signal.route
      }
    ] : [],
    ...routeDrainAmount > 0 ? [
      {
        type: "coreDamaged",
        tick: nextTickCount,
        amount: routeDrainAmount,
        integrity: coreIntegrity
      }
    ] : [],
    ...contactBreaches.map((breach) => ({
      type: "coreBreach",
      tick: nextTickCount,
      intrusionId: breach.intrusionId,
      amount: breach.amount,
      integrity: coreIntegrity
    }))
  ];
  const progressedState = {
    ...withScrubbing,
    events,
    signal,
    coreIntegrity,
    uptimeTicks: withCorruption.uptimeTicks + (isLive ? 1 : 0),
    severedTicks: withCorruption.severedTicks + (isLive ? 0 : 1)
  };
  if (progressedState.coreIntegrity <= 0) {
    return {
      ...progressedState,
      phase: "lost"
    };
  }
  if (isCurrentWaveComplete(progressedState)) {
    if (isFinalWave(progressedState)) {
      return {
        ...progressedState,
        phase: "won"
      };
    }
    return startPrepPhase(progressedState, progressedState.waveIndex + 1);
  }
  return progressedState;
}

// src/sim/replay.ts
var MAX_REPLAY_TICKS = 2e4;
var ReplayError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ReplayError";
  }
};
function replayRun(input) {
  let state = createGameState({ seed: input.seed, sector: input.sector });
  const commands = input.commands;
  let index = 0;
  let ticks = 0;
  while (state.phase !== "won" && state.phase !== "lost") {
    while (index < commands.length && commands[index].t === state.tickCount) {
      state = applyCommand(state, commands[index].c);
      index += 1;
    }
    if (index < commands.length && commands[index].t < state.tickCount) {
      throw new ReplayError("Command log is out of order.");
    }
    state = tick(state);
    ticks += 1;
    if (ticks > MAX_REPLAY_TICKS) {
      throw new ReplayError("Run exceeded the maximum tick budget.");
    }
  }
  if (index < commands.length) {
    throw new ReplayError("Command log contains commands after the run ended.");
  }
  return { state, score: calculateScore(state) };
}
export {
  MAX_REPLAY_TICKS,
  ReplayError,
  SIM_RULESET_ID,
  applyCommand,
  calculateScore,
  createGameState,
  deriveSignalState,
  isSignalLive,
  replayRun,
  tick,
  withRecomputedSignal
};
