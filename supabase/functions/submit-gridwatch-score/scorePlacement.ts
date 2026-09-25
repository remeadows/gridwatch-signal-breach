/* Read-back after a committed submit_score write, and the response bodies built from it.
   Reads run with the caller's user-scoped client so get_board_entry's is_you and
   get_my_standing resolve to that player (Nexus spec §3). They are best-effort: the write
   has already committed, so a failed read yields nulls, never a failed request. */
import {
  CAMPAIGN_BOARD,
  EXPANSION_BOARD,
  GAME_SLUG,
  levelEntryKey,
  sectorEntryKey,
  toCount,
  type BoardRef,
} from "./scoreBoard.ts";

// Structural match for supabase-js `client.rpc(fn, args)` (a thenable {data, error}).
export type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;

export type BoardIdCache = Readonly<{ resolve(rpc: Rpc, board: BoardRef): Promise<string | null> }>;

// Board ids come from list_boards. A found id is cached for the life of the isolate; a failed
// or incomplete registry read is not, so the next request tries again.
export function createBoardIdCache(): BoardIdCache {
  const ids = new Map<string, string>();
  const cacheKey = (board: BoardRef) => `${board.key}/${board.ruleset}`;
  return {
    async resolve(rpc, board) {
      const hit = ids.get(cacheKey(board));
      if (hit) return hit;
      try {
        const { data, error } = await rpc("list_boards", { p_game_slug: GAME_SLUG });
        if (error) {
          console.error(`[score] placement: list_boards failed: ${errorMessage(error)}`);
          return null;
        }
        if (!Array.isArray(data)) {
          console.error("[score] placement: list_boards failed: malformed response");
          return null;
        }
        for (const row of data) {
          if (isRecord(row) && row.game_slug === GAME_SLUG && typeof row.id === "string"
            && typeof row.key === "string" && typeof row.ruleset === "string") {
            ids.set(`${row.key}/${row.ruleset}`, row.id);
          }
        }
        return ids.get(cacheKey(board)) ?? null;
      } catch (err) {
        console.error(`[score] placement: list_boards failed: ${errorMessage(err)}`);
        return null;
      }
    },
  };
}

// get_board_entry clamps p_limit to [1, 100]; a player outside the top 100 reads as null.
export const PLACEMENT_LIMIT = 100;

export type EntryStanding = Readonly<{ rank: number; score: number }>;
export type BoardStanding = Readonly<{ rank: number; total: number; field: number }>;

export function yourEntry(rows: unknown): EntryStanding | null {
  if (!Array.isArray(rows)) return null;
  for (const row of rows) {
    if (!isRecord(row) || row.is_you !== true) continue;
    const rank = toCount(row.rank);
    const score = toCount(row.score);
    return rank !== null && rank >= 1 && score !== null ? { rank, score } : null;
  }
  return null;
}

export function yourStanding(rows: unknown): BoardStanding | null {
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!isRecord(row)) return null;
  const rank = toCount(row.rank);
  const total = toCount(row.total);
  const field = toCount(row.field);
  return rank !== null && rank >= 1 && total !== null && field !== null ? { rank, total, field } : null;
}

export type CampaignPlacement = Readonly<{
  bestScore: number | null;
  sectorRank: number | null;
  globalRank: number | null;
  campaignTotal: number | null;
}>;

export type ExpansionPlacement = Readonly<{ bestScore: number | null; levelRank: number | null }>;

export async function readCampaignPlacement(rpc: Rpc, boards: BoardIdCache, sector: number): Promise<CampaignPlacement> {
  const none: CampaignPlacement = { bestScore: null, sectorRank: null, globalRank: null, campaignTotal: null };
  try {
    const id = await boards.resolve(rpc, CAMPAIGN_BOARD);
    if (!id) return none;
    const [entry, standing] = await Promise.all([
      rpc("get_board_entry", { p_board_id: id, p_period_key: "all", p_entry_key: sectorEntryKey(sector), p_limit: PLACEMENT_LIMIT }),
      rpc("get_my_standing", { p_board_id: id, p_period_key: "all" }),
    ]);
    let mine: EntryStanding | null = null;
    if (entry.error) {
      console.error(`[score] placement: get_board_entry ${sectorEntryKey(sector)} failed: ${errorMessage(entry.error)}`);
    } else {
      mine = yourEntry(entry.data);
    }
    let overall: BoardStanding | null = null;
    if (standing.error) {
      console.error(`[score] placement: get_my_standing failed: ${errorMessage(standing.error)}`);
    } else {
      overall = yourStanding(standing.data);
    }
    return {
      bestScore: mine?.score ?? null,
      sectorRank: mine?.rank ?? null,
      globalRank: overall?.rank ?? null,
      campaignTotal: overall?.total ?? null,
    };
  } catch (err) {
    console.error(`[score] placement: campaign placement failed: ${errorMessage(err)}`);
    return none;
  }
}

export async function readExpansionPlacement(rpc: Rpc, boards: BoardIdCache, level: number): Promise<ExpansionPlacement> {
  const none: ExpansionPlacement = { bestScore: null, levelRank: null };
  try {
    const id = await boards.resolve(rpc, EXPANSION_BOARD);
    if (!id) return none;
    const entry = await rpc("get_board_entry", {
      p_board_id: id, p_period_key: "all", p_entry_key: levelEntryKey(level), p_limit: PLACEMENT_LIMIT,
    });
    let mine: EntryStanding | null = null;
    if (entry.error) {
      console.error(`[score] placement: get_board_entry ${levelEntryKey(level)} failed: ${errorMessage(entry.error)}`);
    } else {
      mine = yourEntry(entry.data);
    }
    return { bestScore: mine?.score ?? null, levelRank: mine?.rank ?? null };
  } catch (err) {
    console.error(`[score] placement: expansion placement failed: ${errorMessage(err)}`);
    return none;
  }
}

type Logged = Readonly<{ improved: boolean; total: number | null }>;

/* The V2 response keeps every field name bundles cached before this change read. globalRank
   is now the player's rank on the campaign board (sum of cleared-sector bests); sectorRank and
   bestScore come from the sector entry. When this run improved, it IS the stored best, so
   bestScore never reads null in that case even if the read-back failed. */
export function campaignReply(input: {
  outcome: Logged;
  placement: CampaignPlacement;
  runScore: number;
  ruleset: string;
  rating: string;
  handle: string;
}) {
  const { outcome, placement } = input;
  return {
    ok: true as const,
    improved: outcome.improved,
    runScore: input.runScore,
    bestScore: placement.bestScore ?? (outcome.improved ? input.runScore : null),
    campaignScore: outcome.total ?? placement.campaignTotal,
    ruleset: input.ruleset,
    rating: input.rating,
    globalRank: placement.globalRank,
    sectorRank: placement.sectorRank,
    handle: input.handle,
  };
}

// The expansion response echoes category/contentRevision/level exactly as before: cached
// clients reject a success whose echo does not match the proof they sent.
export function expansionReply(input: {
  outcome: Logged;
  placement: ExpansionPlacement;
  runScore: number;
  rating: string;
  handle: string;
  category: string;
  contentRevision: string;
  level: number;
}) {
  const { outcome, placement } = input;
  return {
    ok: true as const,
    improved: outcome.improved,
    runScore: input.runScore,
    bestScore: placement.bestScore ?? (outcome.improved ? input.runScore : null),
    levelRank: placement.levelRank,
    rating: input.rating,
    handle: input.handle,
    category: input.category,
    contentRevision: input.contentRevision,
    level: input.level,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Best-effort reads never fail the request, but every swallowed failure is logged so an
// outage is visible in function logs. Only the RPC name/entry key and the error's own message
// are logged — never tokens, ids, or payloads.
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (isRecord(err) && typeof err.message === "string") return err.message;
  return String(err);
}
