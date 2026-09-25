import { validateExpansionScore, ExpansionScoreError } from "./expansion-r4.bundle.js";
import { expansionBoardFor, expansionMeta, levelEntryKey, submitArgs, submitOutcome, type SubmitScoreArgs } from "./scoreBoard.ts";
import { expansionReply, type ExpansionPlacement } from "./scorePlacement.ts";

export type ExpansionScoreDependencies = {
  profile(userId: string): Promise<{ handle: string | null; error: boolean }>;
  // The raw submit_score jsonb result, or null when the RPC call itself failed.
  submit(args: SubmitScoreArgs): Promise<unknown>;
  // Best-effort read-back with the caller's own client; never throws.
  placement(level: number): Promise<ExpansionPlacement>;
};

export type ExpansionScoreResult = { status: number; body: Record<string, unknown>; log?: string };

/** Auth is checked by the HTTP entrypoint. One submit_score call to expansion / r4; never the campaign board. */
export async function handleExpansionScore(payload: unknown, userId: string, deps: ExpansionScoreDependencies): Promise<ExpansionScoreResult> {
  let validated;
  try { validated = validateExpansionScore(payload); }
  catch (error) {
    return { status: 422, body: { ok: false, error: error instanceof ExpansionScoreError ? error.message : "Replay failed." } };
  }
  try {
    const board = expansionBoardFor(validated.proof.contentRevision);
    if (!board) {
      return { status: 503, body: { ok: false, error: "Leaderboard season changed — try again later." },
        log: `no expansion board for ${validated.proof.contentRevision}` };
    }
    const profile = await deps.profile(userId);
    if (profile.error) return { status: 500, body: { ok: false, error: "Could not load your profile." } };
    if (!profile.handle) return { status: 409, body: { ok: false, error: "Choose a handle before submitting." } };
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(validated.proof)));
    const proofHash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    const meta = expansionMeta({ contentRevision: validated.proof.contentRevision, level: validated.proof.level,
      seed: validated.proof.seed, commandCount: validated.proof.commands.length, rating: validated.rating });
    const raw = await deps.submit(submitArgs({ userId, board, entryKey: levelEntryKey(validated.proof.level),
      score: validated.score, proofHash, achievedAt: new Date(), meta }));
    if (raw === null) return { status: 500, body: { ok: false, error: "Could not save score." } };
    const outcome = submitOutcome(raw, board);
    if (outcome.kind === "rejected") return { status: outcome.status, body: { ok: false, error: outcome.error }, log: outcome.log };
    const placement = await deps.placement(validated.proof.level);
    return { status: 200, body: expansionReply({ outcome, placement, runScore: validated.score, rating: validated.rating,
      handle: profile.handle, category: validated.category, contentRevision: validated.proof.contentRevision, level: validated.proof.level }) };
  } catch { return { status: 500, body: { ok: false, error: "Could not save score. Retry when online." } }; }
}
