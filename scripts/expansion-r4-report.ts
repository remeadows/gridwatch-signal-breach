import { EXPANSION_R4_LEVELS } from "../src/data/campaigns/expansion/r4";
import { buildR4ContentReport } from "./expansion-r4-content-source";
import { buildHumanBalanceReport } from "./expansion-human-balance-lib";
import { R4_HUMAN_BUILD_PLANS } from "./expansion-r4-human-plans";

await buildR4ContentReport();
const report = await buildHumanBalanceReport({ levelIds: EXPANSION_R4_LEVELS.map((level) => level.id), plans: R4_HUMAN_BUILD_PLANS, contentRevision: "expansion-1-r4" });
console.table(report.groups.map(({ successfulPlacements: _placements, ...row }) => row));
console.log(JSON.stringify({ normalWins: report.runs.filter((r) => r.actionIntervalTicks === 3 && r.phase === "won").length, stressWins: report.runs.filter((r) => r.actionIntervalTicks === 6 && r.phase === "won").length, replayedWins: report.runs.filter((r) => r.replayVerified).length, noActionLosses: report.emptyRuns.length, failures: report.runs.filter((r) => r.phase !== "won").map((r) => ({ level: r.levelId, seed: r.seed, interval: r.actionIntervalTicks, wave: r.finalWave, integrity: r.integrity })) }, null, 2));
