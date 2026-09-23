import contentReportFixture from "../docs/fixtures/expansion-1-r3-content-report.json";
import { EXPANSION_CONTENT_MANIFEST } from "./retained-expansion";
import { stableStringify } from "./expansion-content-report-lib";
import { buildCurrentExpansionContentReport } from "./expansion-content-report-source";

const report = await buildCurrentExpansionContentReport();

console.log(JSON.stringify(report, null, 2));

if (report.campaignHash !== EXPANSION_CONTENT_MANIFEST.campaignHash || JSON.stringify(report.levelHashes) !== JSON.stringify(EXPANSION_CONTENT_MANIFEST.levelHashes)) {
  throw new Error("Committed expansion content hashes are stale. Regenerate the current content report.");
}

if (stableStringify(report) !== stableStringify(contentReportFixture)) {
  throw new Error("Committed expansion content report fixture is stale.");
}
