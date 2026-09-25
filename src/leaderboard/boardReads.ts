import type { FetchLeaderboardResult, LeaderboardEntry } from "./api";

/* In-game reads of the shared board registry (Nexus spec 2026-09-24 §3). Board ids come
   from list_boards and are pinned by key + ruleset — the same boards
   supabase/functions/submit-gridwatch-score/scoreBoard.ts writes. Reads use the public anon
   key (is_you is therefore never set; the in-game tables have no "you" slot). */
export type BoardRef = Readonly<{ key: string; ruleset: string }>;
export const CAMPAIGN_BOARD: BoardRef = { key: "campaign", ruleset: "r2" };
export const EXPANSION_BOARD: BoardRef = { key: "expansion", ruleset: "r4" };

// Top 20, matching the in-game tables (the RPCs clamp p_limit to [1, 100]).
export const BOARD_READ_LIMIT = 20;
const REQUEST_TIMEOUT_MS = 10_000;

export type BoardReaderConfig = Readonly<{ enabled: boolean; url: string; anonKey: string; gameSlug: string }>;

export type BoardReader = Readonly<{
  campaign(): Promise<FetchLeaderboardResult>;
  campaignSector(sector: number): Promise<FetchLeaderboardResult>;
  expansionLevel(level: number): Promise<FetchLeaderboardResult>;
}>;

export function createBoardReader(config: BoardReaderConfig, request: typeof fetch = fetch): BoardReader {
  let ids: ReadonlyMap<string, string> | null = null;
  const refKey = (board: BoardRef) => `${board.key}/${board.ruleset}`;

  async function rpc(fn: string, body: Record<string, unknown>): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await request(`${config.url}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: config.anonKey, Authorization: `Bearer ${config.anonKey}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`${fn} failed (${response.status}).`);
      // Inside the deadline: a stalled body aborts too.
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  // Cached only once the wanted board is found; a failed or incomplete registry read is retried.
  async function boardId(board: BoardRef): Promise<string | null> {
    const cached = ids?.get(refKey(board));
    if (cached) return cached;
    const rows = await rpc("list_boards", { p_game_slug: config.gameSlug });
    if (!Array.isArray(rows)) return null;
    const found = new Map<string, string>();
    for (const row of rows) {
      if (isRecord(row) && row.game_slug === config.gameSlug && typeof row.id === "string"
        && typeof row.key === "string" && typeof row.ruleset === "string") {
        found.set(`${row.key}/${row.ruleset}`, row.id);
      }
    }
    const id = found.get(refKey(board)) ?? null;
    if (id) ids = found;
    return id;
  }

  async function read(board: BoardRef, fn: "get_board" | "get_board_entry", args: Record<string, unknown>, scoreField: "total" | "score"): Promise<FetchLeaderboardResult> {
    if (!config.enabled) return { ok: false, error: "Leaderboard is offline." };
    try {
      const id = await boardId(board);
      if (!id) return { ok: false, error: "Rankings could not be loaded. Retry when online." };
      const data = await rpc(fn, { p_board_id: id, p_period_key: "all", ...args, p_limit: BOARD_READ_LIMIT });
      const entries = toEntries(data, scoreField);
      return entries ? { ok: true, entries } : { ok: false, error: "Invalid leaderboard response." };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof DOMException && error.name === "AbortError"
          ? "Leaderboard request timed out."
          : "Rankings could not be loaded. Retry when online.",
      };
    }
  }

  return {
    campaign: () => read(CAMPAIGN_BOARD, "get_board", {}, "total"),
    campaignSector: (sector) => read(CAMPAIGN_BOARD, "get_board_entry", { p_entry_key: `sector:${sector}` }, "score"),
    expansionLevel: (level) => read(EXPANSION_BOARD, "get_board_entry", { p_entry_key: `level:${level}` }, "score"),
  };
}

// Maps registry rows onto the in-game row shape; rejects the whole response if any row is
// malformed (the same guard the expansion reader always had).
function toEntries(data: unknown, scoreField: "total" | "score"): LeaderboardEntry[] | null {
  if (!Array.isArray(data) || data.length > BOARD_READ_LIMIT) return null;
  const entries: LeaderboardEntry[] = [];
  for (const row of data) {
    if (!isRecord(row)) return null;
    const rank = row.rank;
    const score = row[scoreField];
    const at = scoreField === "total" ? row.updated_at : row.achieved_at;
    if (typeof row.display_name !== "string" || typeof rank !== "number" || !Number.isSafeInteger(rank) || rank < 1
      || typeof score !== "number" || !Number.isSafeInteger(score) || score < 0) return null;
    entries.push({ rank, handle: row.display_name, score, rating: null, metadata: {}, created_at: typeof at === "string" ? at : "" });
  }
  return entries;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
