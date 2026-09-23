import { getBoardArtMode, getBoardSpriteUrl, isBoardSpriteId } from "../render/assetRegistry";
import type { IconName } from "../render/iconPaths";
import { svgIcon } from "./iconsSvg";

/** Use the board's art in teaching/picker UI; keep glyphs visible until load. */
export function createGameplayIcon(name: IconName, size: number, className: string): HTMLElement {
  const container = document.createElement("span");
  container.className = className;
  container.setAttribute("aria-hidden", "true");
  container.style.cssText = `display:inline-block;position:relative;width:${size}px;height:${size}px;flex-shrink:0`;
  container.innerHTML = svgIcon(name, size);
  const url = isBoardSpriteId(name) ? getBoardSpriteUrl(name, getBoardArtMode()) : null;
  if (url) {
    const fallback = container.firstElementChild as SVGElement;
    const image = document.createElement("img");
    image.alt = "";
    image.width = size;
    image.height = size;
    image.decoding = "async";
    image.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:contain;visibility:hidden";
    image.addEventListener("load", () => {
      image.style.visibility = "visible";
      fallback.style.visibility = "hidden";
    }, { once: true });
    image.addEventListener("error", () => image.remove(), { once: true });
    image.src = url;
    container.append(image);
  }
  return container;
}
