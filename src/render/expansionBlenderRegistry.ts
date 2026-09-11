import type { ExpansionLevelDefinition } from "../sim/expansion/types";
import { EXPANSION_ART_FAMILIES, getExpansionLevelArtRoster, type ExpansionArtMode, type ExpansionVisualAssetId } from "./expansionArtCatalog";

const blenderUrls = import.meta.glob<string>("../assets/board/blender-v2/*-board.png", { eager: true, query: "?url", import: "default" });
const previousUrls = import.meta.glob<string>("../assets/board/{phase6,expansion1}/*-board-v1.{png,webp}", { eager: true, query: "?url", import: "default" });
type ImageRecord = { image: HTMLImageElement; state: "loading" | "ready" | "failed" };
const records = new Map<string, ImageRecord>();

export function getExpansionArtMode(): ExpansionArtMode {
  const requested = new URLSearchParams(window.location.search).get("art");
  return requested === "phase6" || requested === "glyphs" ? requested : "blender-v2";
}

export function getExpansionArtUrl(id: ExpansionVisualAssetId, mode: ExpansionArtMode): string | null {
  if (mode === "glyphs") return null;
  const family = EXPANSION_ART_FAMILIES[id];
  if (mode === "blender-v2") return blenderUrls[`../assets/board/blender-v2/gw-blender-v2-${family}-board.png`] ?? null;
  const expansionFamily = id === "latencyTrap" || id === "rusher" || id === "sapper";
  const group = expansionFamily ? "expansion1" : "phase6";
  const prefix = `../assets/board/${group}/gw-${group}-${family}-board-v1`;
  return previousUrls[`${prefix}.png`] ?? previousUrls[`${prefix}.webp`] ?? null;
}

export function getExpansionArtSprite(id: ExpansionVisualAssetId, mode: ExpansionArtMode): HTMLImageElement | null {
  const url = getExpansionArtUrl(id, mode);
  if (!url) return null;
  const cached = records.get(url);
  if (cached) return cached.state === "ready" ? cached.image : null;
  const image = new Image();
  image.decoding = "async";
  const record: ImageRecord = { image, state: "loading" };
  records.set(url, record);
  image.addEventListener("load", () => {
    const ready = () => { record.state = "ready"; };
    if (typeof image.decode === "function") void image.decode().then(ready, ready);
    else ready();
  }, { once: true });
  image.addEventListener("error", () => {
    record.state = "failed";
    console.warn(`GridWatch expansion sprite failed to load: ${id}`);
  }, { once: true });
  image.src = url;
  return null;
}

export function preloadExpansionLevelArt(level: ExpansionLevelDefinition, mode: ExpansionArtMode): void {
  for (const id of getExpansionLevelArtRoster(level)) getExpansionArtSprite(id, mode);
}
