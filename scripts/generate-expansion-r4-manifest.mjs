import { build } from "esbuild";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundled = await build({ absWorkingDir: root, entryPoints: ["scripts/expansion-r4-content-source.ts"], bundle: true, format: "esm", platform: "node", target: "node24", write: false });
const { buildR4Manifest } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
const manifest = await buildR4Manifest();
await writeFile(resolve(root, "src/data/campaigns/expansion/r4/manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`r4 manifest: ${Object.keys(manifest.levelHashes).length} levels, ${manifest.campaignHash}`);
