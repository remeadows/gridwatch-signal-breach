/* Write side of the shared board registry for Signal Breach (Nexus spec
   docs/superpowers/specs/2026-09-24-nexus-leaderboards-rebuild-design.md §2, §5).
   Boards: gridwatch-signal-breach / campaign / r2 (kind sum; one entry per CLEARED sector,
   keyed `sector:<n>`; the database sums them into the campaign total) and
   gridwatch-signal-breach / expansion / r4 (kind sum; one entry per won level, `level:<n>`).
   A new ruleset or content revision means a new board (spec D7): change the constants here
   together with the Nexus migration that registers it — submit_score answers
   ruleset_mismatch until both agree. Pure TypeScript (no Deno or Supabase imports) so the
   Node verify scripts can load it. */

export const GAME_SLUG = "gridwatch-signal-breach";

export type BoardRef = Readonly<{ key: string; ruleset: string }>;

export const CAMPAIGN_BOARD: BoardRef = { key: "campaign", ruleset: "r2" };
export const EXPANSION_BOARD: BoardRef = { key: "expansion", ruleset: "r4" };

// Expansion content revision → board. Only r4 is published; a later revision registers a new
// board, so an unknown revision has none.
const EXPANSION_BOARDS: Readonly<Record<string, BoardRef>> = { "expansion-1-r4": EXPANSION_BOARD };

export function expansionBoardFor(contentRevision: string): BoardRef | null {
  return Object.prototype.hasOwnProperty.call(EXPANSION_BOARDS, contentRevision)
    ? EXPANSION_BOARDS[contentRevision]
    : null;
}

export function sectorEntryKey(sector: number): string {
  return `sector:${sector}`;
}

export function levelEntryKey(level: number): string {
  return `level:${level}`;
}

// submit_score rejects p_meta above 4 KB (octet_length of the jsonb text). Meta is a compact
// summary; the full proof (seed + every command) is covered by p_proof_hash, not stored.
export const MAX_META_BYTES = 4096;

export type CampaignMeta = Readonly<{
  v: 1;
  ruleset: string;
  sector: number;
  seed: string;
  commandCount: number;
  rating: string;
}>;

export type ExpansionMeta = Readonly<{
  v: 1;
  contentRevision: string;
  level: number;
  seed: string;
  commandCount: number;
  rating: string;
}>;

export function campaignMeta(input: {
  ruleset: string;
  sector: number;
  seed: string;
  commandCount: number;
  rating: string;
}): CampaignMeta {
  return {
    v: 1,
    ruleset: input.ruleset,
    sector: input.sector,
    seed: input.seed,
    commandCount: input.commandCount,
    rating: input.rating,
  };
}

export function expansionMeta(input: {
  contentRevision: string;
  level: number;
  seed: string;
  commandCount: number;
  rating: string;
}): ExpansionMeta {
  return {
    v: 1,
    contentRevision: input.contentRevision,
    level: input.level,
    seed: input.seed,
    commandCount: input.commandCount,
    rating: input.rating,
  };
}

export function metaBytes(meta: CampaignMeta | ExpansionMeta): number {
  return new TextEncoder().encode(JSON.stringify(meta)).length;
}

export type SubmitScoreArgs = Readonly<{
  p_user_id: string;
  p_game_slug: string;
  p_board_key: string;
  p_ruleset: string;
  p_entries: readonly Readonly<{ key: string; score: number }>[];
  p_achieved_at: string;
  p_request_id: string;
  p_proof_hash: string;
  p_meta: CampaignMeta | ExpansionMeta;
}>;

const PROOF_HASH_RE = /^[0-9a-f]{64}$/;

/* One call per accepted run. Replay is deterministic, so an identical proof is the same run:
   the proof's SHA-256 is both the request id (^[A-Za-z0-9_-]{16,64}$) and the proof hash.
   achieved_at is server time — the client sends no clock. */
export function submitArgs(input: {
  userId: string;
  board: BoardRef;
  entryKey: string;
  score: number;
  proofHash: string;
  achievedAt: Date;
  meta: CampaignMeta | ExpansionMeta;
}): SubmitScoreArgs {
  if (!PROOF_HASH_RE.test(input.proofHash)) {
    throw new Error("proofHash must be 64 lowercase hex characters.");
  }
  return {
    p_user_id: input.userId,
    p_game_slug: GAME_SLUG,
    p_board_key: input.board.key,
    p_ruleset: input.board.ruleset,
    p_entries: [{ key: input.entryKey, score: input.score }],
    p_achieved_at: input.achievedAt.toISOString(),
    p_request_id: input.proofHash,
    p_proof_hash: input.proofHash,
    p_meta: input.meta,
  };
}

export type SubmitOutcome =
  | Readonly<{ kind: "logged"; improved: boolean; total: number | null }>
  | Readonly<{ kind: "rejected"; status: number; error: string; log?: string }>;

/* submit_score status → outcome. `duplicate` (same proof, same achieved_at) and
   `request_conflict` (same proof re-sent later, so a different achieved_at) both mean this
   exact run is already on the board: an "already logged" success that improved nothing. The
   two registry statuses mean this function is out of step with the board registry — a deploy
   problem, logged loudly, not the player's fault. */
export function submitOutcome(result: unknown, board: BoardRef): SubmitOutcome {
  const r = typeof result === "object" && result !== null ? (result as Record<string, unknown>) : {};
  const status = r.status;
  if (status === "ok") return { kind: "logged", improved: r.improved === true, total: toCount(r.total) };
  if (status === "duplicate") return { kind: "logged", improved: false, total: toCount(r.total) };
  if (status === "request_conflict") return { kind: "logged", improved: false, total: null };
  if (status === "invalid_time") return { kind: "rejected", status: 422, error: "Run too old to log." };
  if (status === "invalid_entry" || status === "score_out_of_range") {
    return { kind: "rejected", status: 422, error: "Score rejected by the leaderboard." };
  }
  if (status === "invalid_request") return { kind: "rejected", status: 400, error: "Bad submission." };
  if (status === "unknown_board" || status === "ruleset_mismatch") {
    return {
      kind: "rejected",
      status: 503,
      error: "Leaderboard season changed — try again later.",
      log: `submit_score ${status} for ${GAME_SLUG}/${board.key}/${board.ruleset}`,
    };
  }
  return {
    kind: "rejected",
    status: 500,
    error: "Could not save score.",
    log: `submit_score unexpected result: ${JSON.stringify(result)}`,
  };
}

// A non-negative safe integer from a jsonb/PostgREST number (bigint may arrive as a string).
export function toCount(value: unknown): number | null {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isSafeInteger(n) && n >= 0 ? n : null;
}

export type NotRecordedReason = "not-cleared" | "retired-ruleset";

const NOT_RECORDED_COPY: Readonly<Record<NotRecordedReason, string>> = {
  "not-cleared": "Not recorded — sector not cleared. Only cleared sectors count on the leaderboard.",
  "retired-ruleset": "Not recorded — this run used retired rules. Replay the sector to rank.",
};

/* HTTP 200 with ok:false and nothing written. Bundles cached before this change take their
   ok:false path and show `error` verbatim (no field they read is missing or null); the
   current client recognises `recorded: false` and shows it as information, not a failure. */
export function notRecordedReply(reason: NotRecordedReason, runScore: number | null, rating: string | null) {
  return {
    ok: false as const,
    recorded: false as const,
    reason,
    runScore,
    rating,
    error: NOT_RECORDED_COPY[reason],
  };
}
