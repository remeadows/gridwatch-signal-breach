import { build } from "esbuild";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const arguments_ = process.argv.slice(2);
if (arguments_.length !== 2 || arguments_[0] !== "--chapter" || !["1", "2", "3"].includes(arguments_[1])) throw new Error("Usage: node scripts/generate-expansion-human-evidence.mjs --chapter 1|2|3");
const chapter = Number(arguments_[1]);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = `
import { buildHumanBalanceReport } from "./scripts/expansion-human-balance-lib";
import { HUMAN_BUILD_PLANS } from "./scripts/expansion-human-plans";
import { CHAPTER_03_HUMAN_BUILD_PLANS } from "./scripts/expansion-chapter03-human-plans";
export async function buildEvidence(chapter: number) {
  const levelIds = Array.from({length: 5}, (_, index) => (chapter - 1) * 5 + index + 1);
  const report = await buildHumanBalanceReport({levelIds, plans: {...HUMAN_BUILD_PLANS, ...CHAPTER_03_HUMAN_BUILD_PLANS}});
  return {
    schema: 1, chapter, campaign: report.runs[0].replay.campaign,
    contentRevision: report.runs[0].replay.contentRevision,
    model: report.model, limitations: report.limitations,
    groups: report.groups, noActionBaselines: report.emptyRuns,
    runs: report.runs.map(({state: _state, ...run}) => run),
  };
}
`;
const bundled = await build({ absWorkingDir: root, stdin: { contents: source, resolveDir: root, sourcefile: "human-evidence-entry.ts", loader: "ts" }, bundle: true, format: "esm", platform: "node", target: "node24", write: false });
const moduleSource = bundled.outputFiles[0]?.text;
if (!moduleSource) throw new Error("Human evidence generator produced no executable module.");
const { buildEvidence } = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString("base64")}`);
const evidence = await buildEvidence(chapter);
const relativePath = `docs/fixtures/${evidence.contentRevision}-chapter-${chapter}-human-evidence.json`;
await writeFile(resolve(root, relativePath), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ output: relativePath, runs: evidence.runs.length, normalWins: evidence.runs.filter((run) => run.actionIntervalTicks === 3 && run.phase === "won").length, stressWins: evidence.runs.filter((run) => run.actionIntervalTicks === 6 && run.phase === "won").length, replayedWinningLogs: evidence.runs.filter((run) => run.replayVerified).length, noActionLosses: evidence.noActionBaselines.filter((run) => run.phase === "lost").length }, null, 2));
