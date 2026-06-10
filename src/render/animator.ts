import type { GridPosition } from "../sim/types";

export function pulse01(timeMs: number, periodMs: number, phase = 0): number {
  return (Math.sin((timeMs / periodMs) * Math.PI * 2 + phase) + 1) / 2;
}

export function hashTile(x: number, y: number): number {
  return ((x * 73856093) ^ (y * 19349663)) >>> 0;
}

export function polylineLength(points: readonly GridPosition[]): number {
  let length = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    length += Math.hypot(current.x - previous.x, current.y - previous.y);
  }

  return length;
}

export function pointAlongPolyline(
  points: readonly GridPosition[],
  distance: number,
): GridPosition | null {
  if (points.length === 0) {
    return null;
  }

  if (points.length === 1) {
    return points[0];
  }

  let remaining = distance;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const segmentLength = Math.hypot(
      current.x - previous.x,
      current.y - previous.y,
    );

    if (remaining <= segmentLength) {
      const ratio = segmentLength === 0 ? 0 : remaining / segmentLength;

      return {
        x: previous.x + (current.x - previous.x) * ratio,
        y: previous.y + (current.y - previous.y) * ratio,
      };
    }

    remaining -= segmentLength;
  }

  return points[points.length - 1];
}
