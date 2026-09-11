import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { build } from "esbuild";

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.join(root, "src/assets/board/blender-v2/manifest.json"), "utf8"));
const provenance = JSON.parse(await readFile(safePath(manifest.sourceProvenance, "art/source/blender-v2"), "utf8"));
const release = process.argv.includes("--release");
const compiled = await build({
  stdin: { contents: 'export { EXPANSION_LEVELS } from "./src/data/campaigns/expansion"; export { EXPANSION_ART_FAMILIES, getExpansionLevelArtRoster } from "./src/render/expansionArtCatalog";', resolveDir: root, loader: "ts" },
  bundle: true, write: false, platform: "node", format: "esm", target: "node24",
});
const { EXPANSION_LEVELS, EXPANSION_ART_FAMILIES, getExpansionLevelArtRoster } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
const families = Object.values(EXPANSION_ART_FAMILIES);
assert(new Set(manifest.families).size === families.length && families.every((family) => manifest.families.includes(family)), "Manifest/catalog family mismatch.");
assert(Array.isArray(provenance.assets) && provenance.assets.length === families.length, "Blender provenance must contain the complete candidate roster.");
for (const field of ["sourceScript", "rigScript"]) {
  const bytes = await readFile(safePath(provenance[field], "art/blender/expansion1"));
  assert(hash(bytes) === provenance[`${field}Sha256`], `${field} hash changed; rebuild the Blender candidate.`);
}
const byFamily = new Map();
for (const record of provenance.assets) {
  assert(families.includes(record.id) && !byFamily.has(record.id), `Unexpected/duplicate family ${record.id}.`);
  assert(record.status === "candidate" && typeof record.ownerApproved === "boolean", `Missing approval status for ${record.id}.`);
  if (!manifest.ownerApproved) assert(record.ownerApproved === false, `Unaccepted candidate ${record.id} must not claim approval.`);
  const expectedRuntime = `src/assets/board/blender-v2/gw-blender-v2-${record.id}-board.png`;
  assert(record.runtime === expectedRuntime, `Unexpected runtime path for ${record.id}.`);
  for (const field of ["model", "master", "runtime"]) {
    const bytes = await readFile(safePath(record[field], field === "runtime" ? "src/assets/board/blender-v2" : "art/source/blender-v2"));
    assert(hash(bytes) === record[`${field}Sha256`], `${record.id} ${field} hash mismatch.`);
    if (field === "model") assert(bytes.subarray(0, 7).toString() === "BLENDER" || bytes.readUInt32LE(0) === 0xfd2fb528, `${record.id} is not a native or Zstandard-compressed Blender source.`);
    if (field === "master") {
      const info = pngInfo(bytes);
      assert(info.width === 1024 && info.height === 1024, `${record.id} master must be 1024 square.`);
    }
    if (field === "runtime") {
      assert(bytes.length === record.runtimeBytes && bytes.length <= manifest.maxAssetBytes, `${record.id} runtime byte budget failed.`);
      const info = pngInfo(bytes);
      assert(info.width === manifest.runtimeDimensions[0] && info.height === manifest.runtimeDimensions[1], `${record.id} runtime dimensions differ.`);
      const alpha = readAlpha(bytes, info);
      const floor = record.id.startsWith("floor-");
      let visible = 0;
      for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
        const value = alpha[y * info.width + x];
        if (floor) assert(value === 255, `${record.id} floor has a transparent seam.`);
        else if (value > 2) {
          visible += 1;
          assert(x >= 29 && y >= 29 && x <= 226 && y <= 226, `${record.id} violates its 11% clear margin.`);
        }
      }
      if (!floor) assert(visible > 0, `${record.id} contains no visible sprite.`);
    }
  }
  byFamily.set(record.id, record);
}
const runtimeFiles = (await readdir(path.join(root, "src/assets/board/blender-v2"))).filter((file) => file.endsWith(".png"));
assert(runtimeFiles.length === families.length && runtimeFiles.every((file) => provenance.assets.some((asset) => path.basename(asset.runtime) === file)), "An untracked candidate runtime image exists.");
let maximumBytes = 0;
for (const level of EXPANSION_LEVELS) {
  const roster = getExpansionLevelArtRoster(level);
  const bytes = roster.reduce((sum, id) => sum + byFamily.get(EXPANSION_ART_FAMILIES[id]).runtimeBytes, 0);
  const decoded = roster.length * manifest.runtimeDimensions[0] * manifest.runtimeDimensions[1] * 4;
  assert(bytes <= manifest.maxActiveRosterBytes, `Level ${level.id} active art exceeds 1.5 MiB.`);
  assert(decoded <= manifest.maxActiveDecodedBytes, `Level ${level.id} decoded art exceeds 24 MiB.`);
  maximumBytes = Math.max(maximumBytes, bytes);
}
if (release) assert(manifest.ownerApproved === true && [...byFamily.values()].every((record) => record.ownerApproved === true), "Blender candidate lacks desktop/mobile owner acceptance for release.");
console.log(`Verified ${families.length} Blender families; maximum active level roster ${maximumBytes} bytes across ${EXPANSION_LEVELS.length} levels${release ? ", release approved" : ", candidate acceptance pending"}.`);

function safePath(relative, directory) {
  assert(typeof relative === "string", "Missing provenance path.");
  const resolved = path.resolve(root, relative);
  assert(resolved.startsWith(`${path.resolve(root, directory)}${path.sep}`), `Path outside ${directory}.`);
  return resolved;
}
function hash(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function pngInfo(bytes) {
  assert(bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "Invalid PNG header.");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), depth: bytes[24], color: bytes[25], interlace: bytes[28] };
}
function readAlpha(bytes, info) {
  assert(info.depth === 8 && info.color === 6 && info.interlace === 0, "Runtime PNG must be noninterlaced 8-bit RGBA.");
  const chunks = [];
  for (let offset = 8; offset < bytes.length;) {
    assert(offset + 12 <= bytes.length, "Truncated PNG chunk.");
    const length = bytes.readUInt32BE(offset);
    assert(offset + 12 + length <= bytes.length, "Truncated PNG payload.");
    if (bytes.toString("ascii", offset + 4, offset + 8) === "IDAT") chunks.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const rowSize = info.width * 4;
  const inflated = inflateSync(Buffer.concat(chunks), { maxOutputLength: (rowSize + 1) * info.height });
  assert(inflated.length === (rowSize + 1) * info.height, "Unexpected PNG raster length.");
  const pixels = Buffer.alloc(rowSize * info.height);
  const alpha = Buffer.alloc(info.width * info.height);
  for (let y = 0; y < info.height; y += 1) {
    const filter = inflated[y * (rowSize + 1)];
    assert(filter <= 4, "Unknown PNG filter.");
    for (let x = 0; x < rowSize; x += 1) {
      const left = x >= 4 ? pixels[y * rowSize + x - 4] : 0;
      const above = y > 0 ? pixels[(y - 1) * rowSize + x] : 0;
      const diagonal = y > 0 && x >= 4 ? pixels[(y - 1) * rowSize + x - 4] : 0;
      const predictor = filter === 1 ? left : filter === 2 ? above : filter === 3 ? Math.floor((left + above) / 2) : filter === 4 ? paeth(left, above, diagonal) : 0;
      pixels[y * rowSize + x] = (inflated[y * (rowSize + 1) + 1 + x] + predictor) & 255;
    }
    for (let x = 0; x < info.width; x += 1) alpha[y * info.width + x] = pixels[y * rowSize + x * 4 + 3];
  }
  return alpha;
}
function paeth(left, above, diagonal) {
  const prediction = left + above - diagonal;
  const a = Math.abs(prediction - left), b = Math.abs(prediction - above), c = Math.abs(prediction - diagonal);
  return a <= b && a <= c ? left : b <= c ? above : diagonal;
}
