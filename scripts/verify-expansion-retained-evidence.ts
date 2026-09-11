import chapterOneEvidence from "../docs/fixtures/expansion-1-r3-chapter-1-human-evidence.json";
import chapterTwoEvidence from "../docs/fixtures/expansion-1-r3-chapter-2-human-evidence.json";
import chapterThreeEvidence from "../docs/fixtures/expansion-1-r3-chapter-3-human-evidence.json";
import { replayExpansionRun } from "../src/sim/expansion/replay";
import type { ExpansionContentRevision, ExpansionReplayInput, ExpansionReplayResult } from "../src/sim/expansion/types";
import { stableStringify } from "./expansion-content-report-lib";

type RetainedRun = Readonly<{
  levelId: number;
  seed: string;
  actionIntervalTicks: number;
  phase: string;
  finalWave: number;
  score: ExpansionReplayResult["score"];
  replay: ExpansionReplayInput;
  replayVerified: boolean;
  commandLogHash: string;
  finalStateHash: string;
}>;
type RetainedEvidence = Readonly<{
  schema: number;
  chapter: number;
  campaign: string;
  contentRevision: string;
  runs: readonly RetainedRun[];
}>;

// Consume retained commands directly: do not call the human-policy generator or
// replace recorded expectations with newly generated outcomes.
const chapters = [
  { chapter: 1, expectedWins: 39, evidence: chapterOneEvidence as unknown as RetainedEvidence },
  { chapter: 2, expectedWins: 37, evidence: chapterTwoEvidence as unknown as RetainedEvidence },
  { chapter: 3, expectedWins: 40, evidence: chapterThreeEvidence as unknown as RetainedEvidence },
] as const;
const retainedSeeds = ["alpha", "bravo", "charlie", "delta"] as const;
let savedWinsReplayed = 0;
let historicalEquivalenceChecks = 0;

for (const { chapter, expectedWins, evidence } of chapters) {
  assert(evidence.schema === 1 && evidence.chapter === chapter, `Chapter ${chapter}: evidence identity changed.`);
  assert(evidence.campaign === "expansion-1" && evidence.contentRevision === "expansion-1-r3", `Chapter ${chapter}: retained campaign/revision changed.`);
  assert(evidence.runs.length === 40, `Chapter ${chapter}: expected all 40 retained input-policy runs.`);
  const expectedKeys = new Set(Array.from({ length: 5 }, (_, offset) => (chapter - 1) * 5 + offset + 1)
    .flatMap((level) => retainedSeeds.flatMap((seed) => [3, 6].map((interval) => `${level}:human-level-${level}-${seed}:${interval}`))));
  const winningRuns = evidence.runs.filter((run) => run.phase === "won");
  assert(winningRuns.length === expectedWins, `Chapter ${chapter}: retained winning-run coverage changed.`);

  for (const run of evidence.runs) {
    const label = `${run.levelId}:${run.seed}:${run.actionIntervalTicks}`;
    assert(expectedKeys.delete(label), `Chapter ${chapter}: duplicate or unexpected retained run ${label}.`);
    assert(run.replay.level === run.levelId && run.replay.seed === run.seed, `${label}: run/replay identity differs.`);
    assert(run.replay.contentRevision === "expansion-1-r3", `${label}: expected the retained r3 identity.`);
    assert(await sha256(stableStringify(run.replay)) === run.commandLogHash, `${label}: saved command-log hash changed.`);
    if (run.phase !== "won") continue;

    const replayed = replayExpansionRun(run.replay);
    assert(run.replayVerified && run.finalWave === 5, `${label}: recorded win must clear five waves.`);
    assert(replayed.state.phase === "won" && replayed.state.waveIndex === 4, `${label}: retained commands no longer clear all five waves.`);
    assert(stableStringify(replayed.score) === stableStringify(run.score), `${label}: retained score changed.`);
    assert(await sha256(stableStringify(replayed.state)) === run.finalStateHash, `${label}: retained final-state hash changed.`);
    savedWinsReplayed += 1;

    const historicalRevisions: readonly ExpansionContentRevision[] = chapter === 1
      ? ["expansion-1-r1", "expansion-1-r2"]
      : chapter === 2 ? ["expansion-1-r2"] : [];
    for (const revision of historicalRevisions) {
      // Keep the exact seed, commands, level and content hash. Only revision
      // identity may differ; all gameplay and scoring must remain equivalent.
      const historical = replayExpansionRun({ ...run.replay, contentRevision: revision });
      assert(historical.state.config.contentRevision === revision, `${label}: replay lost ${revision} identity.`);
      assert(stableStringify(historical.score) === stableStringify(replayed.score), `${label}: ${revision} score differs from r3.`);
      const normalizedState = {
        ...historical.state,
        config: { ...historical.state.config, contentRevision: replayed.state.config.contentRevision },
      };
      assert(stableStringify(normalizedState) === stableStringify(replayed.state), `${label}: ${revision} final state differs after normalizing only config.contentRevision.`);
      historicalEquivalenceChecks += 1;
    }
  }
  assert(expectedKeys.size === 0, `Chapter ${chapter}: missing retained level/seed/cadence coverage.`);
}

assert(savedWinsReplayed === 116, "Expected 116 directly replayed saved r3 winning logs.");
assert(historicalEquivalenceChecks === 115, "Expected 115 historical r1/r2 winning-log equivalence checks.");
console.log(`Retained evidence passed: ${savedWinsReplayed} saved r3 wins, ${historicalEquivalenceChecks} historical r1/r2 equivalents, exact scores and state/command hashes.`);

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
