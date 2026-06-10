import { ICON_VIEWBOX, ICONS, type IconName } from "../render/iconPaths";

export function svgIcon(name: IconName, sizePx = 24, className = ""): string {
  const icon = ICONS[name];
  const classAttribute = className ? ` class="${className}"` : "";
  const filledPaths = icon.fill
    .map((pathData) => `<path d="${pathData}" fill="${icon.color}"></path>`)
    .join("");
  const strokedPaths = icon.stroke
    .map(
      (pathData) =>
        `<path d="${pathData}" fill="none" stroke="${icon.accent}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>`,
    )
    .join("");

  // Safe innerHTML source: icon paths/colors are app-authored constants, never user input.
  return `<svg${classAttribute} width="${sizePx}" height="${sizePx}" viewBox="0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}" aria-hidden="true" focusable="false" style="filter: drop-shadow(0 0 6px ${icon.color});">${filledPaths}${strokedPaths}</svg>`;
}
