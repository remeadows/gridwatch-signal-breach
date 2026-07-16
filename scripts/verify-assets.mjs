import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "src/assets/board/asset-manifest.json");
const runtimeDirectory = "src/assets/board/phase6";
const releaseMode = process.argv.includes("--release");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const allowedDirectories = {
  source: "art/source/phase6",
  runtime: runtimeDirectory,
  prompt: "art/prompts/phase6",
};

if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
  throw new Error("Asset manifest must contain at least one asset.");
}

const seen = new Set();
const trackedRuntimeFiles = new Set();
let totalRuntimeBytes = 0;

for (const asset of manifest.assets) {
  const key = `${asset.id}:${asset.version}`;
  if (seen.has(key)) {
    throw new Error(`Duplicate manifest asset: ${key}`);
  }
  seen.add(key);

  const sourcePath = resolveAllowedPath(asset.source, allowedDirectories.source);
  const runtimePath = resolveAllowedPath(asset.runtime, allowedDirectories.runtime);
  const promptPath = resolveAllowedPath(asset.prompt, allowedDirectories.prompt);
  trackedRuntimeFiles.add(normalizePath(asset.runtime));

  const [source, runtime, prompt, sourceStats, runtimeStats] = await Promise.all([
    readFile(sourcePath),
    readFile(runtimePath),
    readFile(promptPath),
    stat(sourcePath),
    stat(runtimePath),
  ]);
  const sourceImage = inspectImage(source, asset.source);
  const runtimeImage = inspectImage(runtime, asset.runtime);

  assertDimensions(sourceImage, asset.sourceDimensions, asset.source);
  assertDimensions(runtimeImage, asset.runtimeDimensions, asset.runtime);
  if (!runtimeImage.hasAlpha || asset.hasAlpha !== true) {
    throw new Error(`Runtime asset must retain alpha: ${asset.runtime}`);
  }
  assertBudget(sourceStats.size, asset.maxSourceBytes, asset.source);
  assertBudget(runtimeStats.size, asset.maxBytes, asset.runtime);
  totalRuntimeBytes += runtimeStats.size;
  assertHash(source, asset.sourceSha256, asset.source);
  assertHash(runtime, asset.runtimeSha256, asset.runtime);
  assertHash(prompt, asset.promptSha256, asset.prompt);

  if (!asset.generator || !asset.generatedAt || !Array.isArray(asset.referenceAssets)) {
    throw new Error(`Missing generation provenance: ${asset.id}`);
  }
  if (releaseMode && asset.ownerApproved !== true) {
    throw new Error(`Release asset lacks owner approval: ${asset.id}`);
  }
}

if (!Number.isInteger(manifest.maxRuntimeBytes) || manifest.maxRuntimeBytes <= 0) {
  throw new Error("Asset manifest requires a positive maxRuntimeBytes budget.");
}

if (totalRuntimeBytes > manifest.maxRuntimeBytes) {
  throw new Error(`Phase 6 runtime asset budget exceeded: ${totalRuntimeBytes} bytes.`);
}

const runtimeFiles = await listRuntimeFiles(path.join(root, runtimeDirectory));
for (const file of runtimeFiles.filter((entry) => /\.(png|webp)$/i.test(entry))) {
  const relative = normalizePath(path.join(runtimeDirectory, file));
  if (!trackedRuntimeFiles.has(relative)) {
    throw new Error(`Runtime asset missing manifest entry: ${relative}`);
  }
}

console.log(
  `Verified ${manifest.assets.length} Phase 6 assets (${totalRuntimeBytes} runtime bytes${releaseMode ? ", release mode" : ""}).`,
);

function resolveAllowedPath(relativePath, allowedDirectory) {
  if (typeof relativePath !== "string") {
    throw new Error("Asset paths must be strings.");
  }

  const normalized = normalizePath(relativePath);
  const allowed = `${normalizePath(allowedDirectory)}/`;
  if (!normalized.startsWith(allowed)) {
    throw new Error(`Path is outside its approved directory: ${relativePath}`);
  }

  const resolved = path.resolve(root, normalized);
  const directory = path.resolve(root, allowedDirectory);
  if (!resolved.startsWith(`${directory}${path.sep}`)) {
    throw new Error(`Path traversal is not allowed: ${relativePath}`);
  }
  return resolved;
}

function inspectImage(buffer, label) {
  if (buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") {
    return inspectPng(buffer, label);
  }
  if (
    buffer.length >= 30 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return inspectWebp(buffer, label);
  }
  throw new Error(`Unsupported image format: ${label}`);
}

function inspectPng(buffer, label) {
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 26 || buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error(`Expected PNG asset: ${label}`);
  }
  if (buffer.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error(`PNG is missing IHDR: ${label}`);
  }
  const colorType = buffer[25];
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    hasAlpha: colorType === 4 || colorType === 6,
  };
}

function inspectWebp(buffer, label) {
  const chunk = buffer.subarray(12, 16).toString("ascii");
  if (chunk === "VP8X") {
    return {
      width: buffer.readUIntLE(24, 3) + 1,
      height: buffer.readUIntLE(27, 3) + 1,
      hasAlpha: (buffer[20] & 0x10) !== 0,
    };
  }
  if (chunk === "VP8L" && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
      hasAlpha: true,
    };
  }
  if (
    chunk === "VP8 " &&
    buffer[23] === 0x9d &&
    buffer[24] === 0x01 &&
    buffer[25] === 0x2a
  ) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
      hasAlpha: false,
    };
  }
  throw new Error(`Unsupported WebP image layout: ${label}`);
}

function assertDimensions(actual, expected, label) {
  if (!Array.isArray(expected) || expected.length !== 2) {
    throw new Error(`Expected dimensions missing for ${label}`);
  }
  if (actual.width !== expected[0] || actual.height !== expected[1]) {
    throw new Error(
      `Unexpected dimensions for ${label}: ${actual.width}x${actual.height}.`,
    );
  }
}

function assertBudget(bytes, maximum, label) {
  if (!Number.isInteger(maximum) || bytes > maximum) {
    throw new Error(`Asset budget exceeded for ${label}: ${bytes} bytes.`);
  }
}

function assertHash(contents, expected, label) {
  const actual = createHash("sha256").update(contents).digest("hex");
  if (actual !== expected) {
    throw new Error(`SHA-256 mismatch for ${label}`);
  }
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

async function listRuntimeFiles(directory, relativeDirectory = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(
        ...(await listRuntimeFiles(path.join(directory, entry.name), relativePath)),
      );
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}
