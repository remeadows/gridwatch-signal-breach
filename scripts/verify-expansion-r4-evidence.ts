import chapter1 from "../docs/fixtures/expansion-1-r4-chapter-1-human-evidence.json";
import chapter2 from "../docs/fixtures/expansion-1-r4-chapter-2-human-evidence.json";
import chapter3 from "../docs/fixtures/expansion-1-r4-chapter-3-human-evidence.json";
import { EXPANSION_R4_CHAPTERS } from "../src/data/campaigns/expansion/r4";
import manifest from "../src/data/campaigns/expansion/r4/manifest.json";
import { buildHumanBalanceReport } from "./expansion-human-balance-lib";
import { R4_HUMAN_BUILD_PLANS } from "./expansion-r4-human-plans";
import assert from "./assert";

let normalWins = 0;
let stressWins = 0;
let replayedWins = 0;
let noActionLosses = 0;
for (const chapter of EXPANSION_R4_CHAPTERS) {
  const report = await buildHumanBalanceReport({ levelIds: chapter.levelIds, plans: R4_HUMAN_BUILD_PLANS, contentRevision: "expansion-1-r4" });
  const normal = report.runs.filter((run) => run.actionIntervalTicks === 3);
  assert.equal(normal.every((run) => run.phase === "won" && run.replayVerified && run.finalWave === 5 && run.waves.length === 5), true, `Chapter ${chapter.id} normal acceptance failed`);
  normalWins += normal.length;
  stressWins += report.runs.filter((run) => run.actionIntervalTicks === 6 && run.phase === "won").length;
  replayedWins += report.runs.filter((run) => run.replayVerified).length;
  noActionLosses += report.emptyRuns.filter((run) => run.phase === "lost").length;
  const actual = { schema: 1, chapter: chapter.id, campaign: "expansion-1", contentRevision: "expansion-1-r4", campaignHash: manifest.campaignHash,
    model: report.model, limitations: report.limitations, groups: report.groups, noActionBaselines: report.emptyRuns,
    runs: report.runs.map(({ state: _state, ...run }) => run) };
  assert.deepEqual(actual, [chapter1, chapter2, chapter3][chapter.id - 1], `Chapter ${chapter.id} r4 evidence drifted; investigate, do not blindly regenerate`);
}
assert.equal(normalWins, 100);
assert.equal(stressWins, 98);
assert.equal(replayedWins, 198);
assert.equal(noActionLosses, 100);
console.log(JSON.stringify({ normalWins, stressWins, replayedWins, noActionLosses, limitations: "Deterministic authored-policy evidence, not owner or physical-phone acceptance." }));
