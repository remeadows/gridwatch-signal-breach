import { getExpansionArtMode, getExpansionArtSprite, getExpansionArtUrl } from "./expansionBlenderRegistry";
import { getExpansionFloorAssetId, type ExpansionArtMode } from "./expansionArtCatalog";

// The original campaign shares authored art, not expansion gameplay or identities.
export type BoardArtMode = ExpansionArtMode;
export const BOARD_SPRITE_IDS = [
  "source", "core", "relay", "firewall", "turret", "scrubber", "overclock",
  "probe", "crawler", "spoof", "hunter", "splitter", "goliath",
] as const;
export type BoardSpriteId = typeof BOARD_SPRITE_IDS[number];

export function isBoardSpriteId(id: string): id is BoardSpriteId {
  return BOARD_SPRITE_IDS.some((candidate) => candidate === id);
}

export const getBoardArtMode = getExpansionArtMode;

export function getBoardSpriteUrl(id: BoardSpriteId, mode: BoardArtMode): string | null {
  return getExpansionArtUrl(id, mode);
}

export function getBoardSprite(id: BoardSpriteId, mode: BoardArtMode): HTMLImageElement | null {
  return getExpansionArtSprite(id, mode);
}

export function getBoardFloorSprite(sector: number, mode: BoardArtMode): HTMLImageElement | null {
  return mode === "blender-v2" ? getExpansionArtSprite(getExpansionFloorAssetId(sector), mode) : null;
}

export function preloadBoardSprites(mode: BoardArtMode): void {
  for (const id of BOARD_SPRITE_IDS) getBoardSprite(id, mode);
  for (const sector of [1, 2, 3]) getBoardFloorSprite(sector, mode);
}
