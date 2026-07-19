import trapUrl from "../assets/board/expansion1/gw-expansion1-latency-trap-board-v1.png";
import rusherUrl from "../assets/board/expansion1/gw-expansion1-rusher-board-v1.png";

export type ExpansionSpriteId = "latencyTrap" | "rusher";

const URLS: Readonly<Record<ExpansionSpriteId, string>> = {
  latencyTrap: trapUrl,
  rusher: rusherUrl,
};
const images = new Map<ExpansionSpriteId, HTMLImageElement>();

export function preloadExpansionSprites(): void {
  getExpansionSprite("latencyTrap");
  getExpansionSprite("rusher");
}

export function getExpansionSprite(id: ExpansionSpriteId): HTMLImageElement | null {
  const cached = images.get(id);
  if (cached) return cached.complete && cached.naturalWidth > 0 ? cached : null;
  const image = new Image();
  image.decoding = "async";
  image.src = URLS[id];
  images.set(id, image);
  return null;
}
