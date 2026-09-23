import {
  getBoardSprite,
  type BoardSpriteId,
  type BoardArtMode,
} from "./assetRegistry";

export function drawBoardSprite(
  context: CanvasRenderingContext2D,
  id: BoardSpriteId,
  centerX: number,
  centerY: number,
  drawSize: number,
  mode: BoardArtMode,
  rotation = 0,
): boolean {
  const image = getBoardSprite(id, mode);

  if (!image) {
    return false;
  }

  context.save();
  context.translate(centerX, centerY);
  context.rotate(rotation);
  context.drawImage(image, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
  context.restore();
  return true;
}
