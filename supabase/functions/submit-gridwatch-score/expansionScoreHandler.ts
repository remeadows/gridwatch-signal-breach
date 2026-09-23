import { validateExpansionScore, ExpansionScoreError } from "./expansion-r4.bundle.js";

type RecordInput = { p_user_id: string; p_slug: string; p_category: string; p_score: number; p_rating: string; p_metadata: Record<string, unknown>; p_proof: unknown; p_proof_hash: string };
export type ExpansionScoreDependencies = {
  profile(userId: string): Promise<{ handle: string | null; error: boolean }>;
  record(input: RecordInput): Promise<{ stored_score: number; improved: boolean; sector_rank: number } | null>;
};

/** Auth is checked by the HTTP entrypoint. This path never writes hub/global scores. */
export async function handleExpansionScore(payload: unknown, userId: string, deps: ExpansionScoreDependencies) {
  let validated;
  try { validated = validateExpansionScore(payload); }
  catch (error) {
    return { status: 422, body: { ok: false, error: error instanceof ExpansionScoreError ? error.message : "Replay failed." } };
  }
  try {
    const profile = await deps.profile(userId);
    if (profile.error) return { status: 500, body: { ok: false, error: "Could not load your profile." } };
    if (!profile.handle) return { status: 409, body: { ok: false, error: "Choose a handle before submitting." } };
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(validated.proof)));
    const proofHash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    const row = await deps.record({ p_user_id: userId, p_slug: "gridwatch-signal-breach",
      p_category: validated.category, p_score: validated.score, p_rating: validated.rating,
      p_metadata: validated.metadata, p_proof: validated.proof, p_proof_hash: proofHash });
    if (!row) return { status: 500, body: { ok: false, error: "Could not save score." } };
    return { status: 200, body: { ok: true, improved: row.improved, runScore: validated.score,
      bestScore: row.stored_score, levelRank: row.sector_rank, rating: validated.rating, handle: profile.handle,
      category: validated.category, contentRevision: validated.proof.contentRevision, level: validated.proof.level } };
  } catch { return { status: 500, body: { ok: false, error: "Could not save score. Retry when online." } }; }
}
