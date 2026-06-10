import { ICON_VIEWBOX, ICONS, type IconName } from "./iconPaths";

const pathCache = new Map<string, Path2D>();
const spriteCache = new Map<string, HTMLCanvasElement>();

export function drawIcon(
  ctx: CanvasRenderingContext2D,
  name: IconName,
  centerX: number,
  centerY: number,
  sizePx: number,
  opts: Readonly<{ alpha?: number; rotation?: number; glow?: boolean }> = {},
): void {
  const icon = ICONS[name];
  const scale = sizePx / ICON_VIEWBOX;

  ctx.save();
  ctx.globalAlpha *= opts.alpha ?? 1;
  ctx.translate(centerX, centerY);
  ctx.rotate(opts.rotation ?? 0);
  ctx.scale(scale, scale);
  ctx.translate(-ICON_VIEWBOX / 2, -ICON_VIEWBOX / 2);

  if (opts.glow) {
    ctx.shadowColor = icon.color;
    ctx.shadowBlur = sizePx * 0.24;
  }

  ctx.fillStyle = icon.color;
  for (const pathData of icon.fill) {
    ctx.fill(getPath(pathData));
  }

  ctx.shadowBlur = 0;
  ctx.strokeStyle = icon.accent;
  ctx.lineWidth = 1.7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const pathData of icon.stroke) {
    ctx.stroke(getPath(pathData));
  }

  ctx.restore();
}

export function getGlowSprite(name: IconName, sizePx: number): HTMLCanvasElement {
  const spriteSize = Math.max(1, Math.round(sizePx));
  const key = `${name}:${spriteSize}`;
  const cached = spriteCache.get(key);

  if (cached) {
    return cached;
  }

  const padding = Math.ceil(spriteSize * 0.5);
  const canvas = document.createElement("canvas");
  canvas.width = spriteSize + padding * 2;
  canvas.height = spriteSize + padding * 2;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    const icon = ICONS[name];
    ctx.shadowColor = icon.color;
    ctx.shadowBlur = spriteSize * 0.28;
    drawIcon(
      ctx,
      name,
      canvas.width / 2,
      canvas.height / 2,
      spriteSize,
      {
        glow: true,
      },
    );
  }

  spriteCache.set(key, canvas);

  return canvas;
}

export function clearSpriteCaches(): void {
  pathCache.clear();
  spriteCache.clear();
}

function getPath(pathData: string): Path2D {
  const cached = pathCache.get(pathData);

  if (cached) {
    return cached;
  }

  const path = new Path2D(pathData);
  pathCache.set(pathData, path);

  return path;
}
