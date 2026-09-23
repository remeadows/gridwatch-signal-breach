import { canonicalExpansionScoreReplay, expansionScoreCategory, ExpansionScoreError } from "../src/leaderboard/expansionScoreProtocol";
import { replayExpansionRun } from "../src/sim/expansion/replay";
export { ExpansionScoreError };

/** Freeze this bundle at publication; a later ruleset needs a separate artifact. */
export function validateExpansionScore(payload: unknown) {
  const proof = canonicalExpansionScoreReplay(payload);
  let result;
  try { result = replayExpansionRun(proof); }
  catch (error) { throw new ExpansionScoreError(error instanceof Error ? error.message : "Replay failed."); }
  if (result.state.phase !== "won") throw new ExpansionScoreError("Clear all five waves before submitting a score.");
  const { total, rating, integrity, neutralized, uptimePercent, efficiencyBonus } = result.score;
  if (!Number.isSafeInteger(total) || total < 0 || total > 100000) throw new ExpansionScoreError("Score out of bounds.");
  return { proof, category: expansionScoreCategory(proof.level), score: total, rating,
    metadata: { campaign: proof.campaign, ruleset: proof.ruleset, contentRevision: proof.contentRevision,
      contentHash: proof.contentHash, level: proof.level, phase: "won", integrity, neutralized, uptimePercent, efficiencyBonus } };
}
