import { build } from "esbuild";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundled = await build({ absWorkingDir: root, entryPoints: ["scripts/expansion-content-report-source.ts"], bundle: true, format: "esm", platform: "node", target: "node24", write: false });
const source = bundled.outputFiles[0]?.text;
if (!source) throw new Error("Content report generator produced no executable module.");
const { buildCurrentExpansionContentReport } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const report = await buildCurrentExpansionContentReport();
const relativePath = `docs/fixtures/${report.contentRevision}-content-report.json`;
await writeFile(resolve(root, relativePath), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Generated ${relativePath}; frozen Chapter 1 hashes verified.`);
console.log("Review and apply these values to the current manifest; historical manifests are never rewritten by this command:");
console.log(JSON.stringify({ campaignHash: report.campaignHash, levelHashes: report.levelHashes }, null, 2));
