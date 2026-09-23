import { getExpansionBoardMetrics, getExpansionGridPositionFromClientPoint } from "../src/render/expansionCanvas";
import assert from "./assert";

for (const [width, height] of [[240, 240], [256, 256], [289, 289], [366, 366], [406, 406], [720, 720]]) {
  const canvas = { width: 800, height: 800, getBoundingClientRect: () => ({ left: 12, top: 18, width, height }) } as HTMLCanvasElement;
  const metrics = getExpansionBoardMetrics(canvas);
  const cssScale = width! / canvas.width;
  assert.equal(metrics.originY * cssScale >= 62 - 0.001, true, "Launch banner must not cover the first row");
  assert.equal((metrics.originY + metrics.boardSize) * cssScale <= height! - 30 + 0.001, true, "Readout must not cover the final row");
  for (let y = 0; y < 8; y += 1) for (let x = 0; x < 8; x += 1) {
    const clientX = 12 + (metrics.originX + (x + 0.5) * metrics.tileSize) * cssScale;
    const clientY = 18 + (metrics.originY + (y + 0.5) * metrics.tileSize) * cssScale;
    assert.deepEqual(getExpansionGridPositionFromClientPoint(canvas, clientX, clientY), { x, y }, "Draw and pointer coordinates disagree");
  }
  assert.equal(getExpansionGridPositionFromClientPoint(canvas, 12 + width! / 2, 18 + 20), null, "Toolbar margin must not issue a placement");
}
console.log("Expansion canvas: 384 tile-center mappings and reserved UI margins verified.");
