import { EXPANSION_R4_CHAPTERS } from "../src/data/campaigns/expansion/r4";
import { buildHumanBalanceReport } from "./expansion-human-balance-lib";
import { R4_HUMAN_BUILD_PLANS } from "./expansion-r4-human-plans";
import { buildR4ContentReport } from "./expansion-r4-content-source";

/** Checked authoring code; the .mjs launcher only bundles and writes artifacts. */
export async function generate() {
  const content = await buildR4ContentReport();
  const evidence = [];
  for (const chapter of EXPANSION_R4_CHAPTERS) {
    const report = await buildHumanBalanceReport({ levelIds: chapter.levelIds, plans: R4_HUMAN_BUILD_PLANS, contentRevision: "expansion-1-r4" });
    if (report.runs.some((run) => run.actionIntervalTicks === 3 && run.phase !== "won")) throw new Error("Normal-policy failure; evidence publication refused.");
    evidence.push({ schema: 1, chapter: chapter.id, campaign: "expansion-1", contentRevision: "expansion-1-r4", campaignHash: content.campaignHash,
      model: report.model, limitations: report.limitations, groups: report.groups, noActionBaselines: report.emptyRuns,
      runs: report.runs.map(({ state: _state, ...run }) => run) });
  }
  return { evidence, content };
}
