import { buildHumanBalanceReport, runControlledSapperSpacingComparison, sha256 } from "./expansion-human-balance-lib";
import { stableStringify } from "./expansion-content-report-lib";
import { HUMAN_BUILD_PLANS, validateHumanBuildPlan } from "./expansion-human-plans";

// Prove malformed plans fail before a run instead of becoming silent no-ops.
for (const invalidPlan of [
  { ...HUMAN_BUILD_PLANS[6], latencyTrap: [{ x: 0, y: 2 }] },
  { ...HUMAN_BUILD_PLANS[6], firewall: [{ x: 7, y: 4 }] },
  { ...HUMAN_BUILD_PLANS[6], firewall: [{ x: 3, y: 1 }] },
  { ...HUMAN_BUILD_PLANS[6], firewall: [{ x: 1, y: 1 }] },
]) {
  let rejected = false;
  try { validateHumanBuildPlan(6, invalidPlan); } catch { rejected = true; }
  if (!rejected) throw new Error("Human plan validator accepted a perimeter trap, Core/void overlap, or conflicting planned unit.");
}

const report = await buildHumanBalanceReport();
const spacing = runControlledSapperSpacingComparison();
console.table(report.groups.map(({ successfulPlacements, ...group }) => ({ ...group, built: Object.entries(successfulPlacements).filter(([, count]) => count > 0).map(([unit, count]) => `${unit}:${count}`).join(" ") })));
console.log(JSON.stringify({ model: report.model, runCount: report.runs.length, winningLogsReplayed: report.runs.filter((run) => run.replayVerified).length, emptyLosses: report.emptyRuns.length, reportHash: await sha256(stableStringify(report.runs.map(({ state: _state, replay: _replay, attempts: _attempts, ...row }) => row))), spacing, limitations: report.limitations }, null, 2));
