import { build } from "esbuild";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundled = await build({ absWorkingDir: root, entryPoints: ["scripts/expansion-r4-evidence-source.ts"], bundle: true, format: "esm", platform: "node", target: "node24", write: false });
const { generate } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
const result = await generate();
// Only new r4 filenames. Historical evidence is intentionally never rewritten.
for (const evidence of result.evidence) {
  await writeFile(resolve(root, `docs/fixtures/expansion-1-r4-chapter-${evidence.chapter}-human-evidence.json`), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ chapter: evidence.chapter, normalWins: evidence.runs.filter(r => r.actionIntervalTicks === 3 && r.phase === "won").length, stressWins: evidence.runs.filter(r => r.actionIntervalTicks === 6 && r.phase === "won").length, noActionLosses: evidence.noActionBaselines.length }));
}
await writeFile(resolve(root, "docs/fixtures/expansion-1-r4-content-report.json"), `${JSON.stringify(result.content, null, 2)}\n`);
