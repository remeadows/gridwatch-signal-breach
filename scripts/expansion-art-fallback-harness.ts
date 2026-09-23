/// <reference types="vite/client" />
// Build-only entry: exercise the real Vite glob transform and production code.
// It is never imported by the game and is built entirely in memory by the test.
export * from "../src/render/expansionBlenderRegistry";
export * from "../src/render/expansionArtCatalog";
export { drawExpansionGrid } from "../src/render/expansionRenderer";
export { EXPANSION_LEVELS } from "../src/data/campaigns/expansion";
export { createExpansionGameState } from "../src/sim/expansion/state";
export { createExpansionGrid, setExpansionTile } from "../src/sim/expansion/grid";
export * from "../src/render/assetRegistry";
export { drawGrid } from "../src/render/renderer";
export { createGameState } from "../src/sim/state";
export { getBoardBackgroundLayer } from "../src/render/background";
export { setTile } from "../src/sim/grid";
export { createGameplayIcon } from "../src/ui/gameplayIcon";
