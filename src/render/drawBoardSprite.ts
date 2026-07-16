import {
  getPhase6BoardSprite,
  type Phase6BoardSpriteId,
} from "./assetRegistry";

export function drawBoardSprite(
  context: CanvasRenderingContext2D,
  id: Phase6BoardSpriteId,
  centerX: number,
  centerY: number,
  drawSize: number,
  rotation = 0,
): boolean {
  const image = getPhase6BoardSprite(id);

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
