import recordedEvidence from "../docs/fixtures/expansion-1-r3-chapter-3-human-evidence.json";
import { getExpansionLevelContentHash } from "./retained-expansion";
import { applyExpansionCommand } from "../src/sim/expansion/commands";
import { getShieldLinks } from "../src/sim/expansion/shieldNetwork";
import { createExpansionGameState } from "./retained-expansion";
import { tickExpansion } from "../src/sim/expansion/tick";
import { CHAPTER_03_HUMAN_BUILD_PLANS } from "./expansion-chapter03-human-plans";
import { stableStringify } from "./expansion-content-report-lib";
import { buildHumanBalanceReport, HUMAN_BALANCE_SEEDS, sha256 } from "./expansion-human-balance-lib";
import { validateHumanBuildPlan } from "./expansion-human-plans";

const levelIds = [11, 12, 13, 14, 15];
for (const levelId of levelIds) validateHumanBuildPlan(levelId, CHAPTER_03_HUMAN_BUILD_PLANS[levelId]);

// The authored opening, not an injected scene: its only two north entry tiles
// produce a simultaneously visible Drone/Probe link before either can move.
for (const seed of HUMAN_BALANCE_SEEDS) {
  let state = applyExpansionCommand(createExpansionGameState({ levelId: 11, contentHash: getExpansionLevelContentHash(11), seed: `human-level-11-${seed}` }), { type: "skipPrep" });
  while (state.waveTick < 4) state = tickExpansion(state);
  const drone = state.intrusions.find((enemy) => enemy.kind === "shieldDrone");
  const probe = state.intrusions.find((enemy) => enemy.kind === "probe");
  assert(Boolean(drone && probe && drone.spawnedTick === probe.spawnedTick), "Level 11 did not introduce its authored pair together.");
  assert(getShieldLinks(state.intrusions).some((link) => link.sourceId === drone?.id && link.targetId === probe?.id), "Level 11 opening did not expose a living shield link.");
}

const report = await buildHumanBalanceReport({ levelIds, plans: CHAPTER_03_HUMAN_BUILD_PLANS });
const normal = report.runs.filter((run) => run.actionIntervalTicks === 3);
const stress = report.runs.filter((run) => run.actionIntervalTicks === 6);
assert(normal.length === 20 && normal.every((run) => run.phase === "won"), "Chapter 3 normal paced policy must clear all 20 fixed-seed runs.");
assert(stress.length === 20, "Chapter 3 stress policy must cover all 20 fixed-seed runs.");
assert(report.emptyRuns.length === 20 && report.emptyRuns.every((run) => run.phase === "lost"), "Chapter 3 must retain 20 losing no-action baselines.");
assert(report.runs.every((run) => run.phase !== "won" || (run.replayVerified && run.finalWave === 5 && run.waves.length === 5)), "Every Chapter 3 win must clear five waves and reproduce its exact score and final state.");
assert(normal.every((run) => run.successfulPlacements.arcIce > 0), "The normal policy must actually build Arc ICE, not silently skip the chapter mechanic.");

const evidence = {
  schema: 1, chapter: 3, campaign: report.runs[0].replay.campaign,
  contentRevision: report.runs[0].replay.contentRevision,
  model: report.model, limitations: report.limitations,
  groups: report.groups, noActionBaselines: report.emptyRuns,
  runs: report.runs.map(({ state: _state, ...run }) => run),
};
assert(stableStringify(evidence) === stableStringify(recordedEvidence), "Chapter 3 retained human evidence is stale. Run node scripts/generate-expansion-human-evidence.mjs --chapter 3 and review the result.");
console.table(report.groups.map(({ successfulPlacements: _placements, ...row }) => row));
console.log(JSON.stringify({ normalWins: normal.filter((run) => run.phase === "won").length, stressWins: stress.filter((run) => run.phase === "won").length, winningLogsReplayed: report.runs.filter((run) => run.replayVerified).length, noActionLosses: report.emptyRuns.length, evidenceHash: await sha256(stableStringify(evidence)), stressFailures: stress.filter((run) => run.phase !== "won").map((run) => ({ level: run.levelId, seed: run.seed, finalWave: run.finalWave, phase: run.phase })), limitations: report.limitations }, null, 2));

function assert(value: boolean, message: string): asserts value { if (!value) throw new Error(message); }
