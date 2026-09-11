import assert from "./assert";
import { R4_CHAPTER_01_LEVELS } from "../src/data/campaigns/expansion/r4/chapter01";
import { R4_CHAPTER_02_LEVELS } from "../src/data/campaigns/expansion/r4/chapter02";
import { createExpansionGrid, setExpansionTile } from "../src/sim/expansion/grid";
import { computeExpansionSignalRoute } from "../src/sim/expansion/routing";
import { validateHumanBuildPlanDefinition } from "./expansion-human-plans";
import { R4_HUMAN_BUILD_PLANS } from "./expansion-r4-human-plans";

const chapters = [R4_CHAPTER_01_LEVELS, R4_CHAPTER_02_LEVELS];
for (const levels of chapters) {
  for (const level of levels) {
    assert.equal(level.waves.length, 5);
    const occupied = new Set<string>();
    let grid = createExpansionGrid(8);
    for (const [position, kind] of [...level.voidTiles.map((p) => [p, "void"] as const), ...level.initialTiles.map((t) => [t.position, t.kind] as const)]) {
      const key = `${position.x},${position.y}`;
      assert.equal(occupied.has(key), false, `Level ${level.id} overlapping initial tiles`);
      occupied.add(key);
      grid = setExpansionTile(grid, position, { kind });
    }
    const route = computeExpansionSignalRoute({ grid, source: level.source, core: level.core, relaySignalRange: 2 });
    assert.equal(Boolean(route), true, `Level ${level.id} has no starting signal route`);
    const plan = R4_HUMAN_BUILD_PLANS[level.id];
    if (!plan) throw new Error(`Missing r4 human plan ${level.id}`);
    validateHumanBuildPlanDefinition(level, plan);
  }
}
console.log(`r4 draft geometry and finite plans pass for ${chapters.flat().length} levels.`);
