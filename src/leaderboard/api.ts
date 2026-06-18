import type { RecordedCommand } from "../sim";
import { leaderboardConfig } from "./config";

export type LeaderboardEntry = Readonly<{
  rank: number;
  handle: string;
  score: number;
  rating: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}>;

export type SubmitScoreInput = Readonly<{
  seed: string;
  sector: number;
  commands: readonly RecordedCommand[];
  handle: string;
}>;

export type SubmitResult =
  | Readonly<{
      ok: true;
      duplicate: boolean;
      globalRank: number;
      sectorRank: number;
      score: number;
      rating: string;
      // The handle the server actually accepted after its own sanitization.
      handle: string;
    }>
  | Readonly<{ ok: false; error: string }>;

// A read either succeeds with entries (possibly empty — a genuinely empty board)
// or fails. Callers must distinguish the two so an outage isn't shown as
// "no scores yet".
export type FetchLeaderboardResult =
  | Readonly<{ ok: true; entries: LeaderboardEntry[] }>
  | Readonly<{ ok: false; error: string }>;

const REQUEST_TIMEOUT_MS = 10_000;

// Wraps fetch with an abort-based timeout so a stalled connection can't leave
// the submit button or the rankings list spinning forever.
async function fetchWithTimeout(
  input: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    apikey: leaderboardConfig.anonKey,
    Authorization: `Bearer ${leaderboardConfig.anonKey}`,
  };
}

// Submits a finished run for server-side validation. The server replays the run
// from {seed, sector, commands} and stores the score it computes itself — the
// client never reports a trusted number. Returns a typed result; network/parse
// failures degrade to { ok: false } rather than throwing.
export async function submitScore(input: SubmitScoreInput): Promise<SubmitResult> {
  if (!leaderboardConfig.enabled) {
    return { ok: false, error: "Leaderboard is offline." };
  }

  try {
    const response = await fetchWithTimeout(
      `${leaderboardConfig.url}/functions/v1/submit-gridwatch-score`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          seed: input.seed,
          sector: input.sector,
          commands: input.commands,
          handle: input.handle,
        }),
      },
    );

    const data = (await response.json().catch(() => null)) as
      | (SubmitResult & { error?: string })
      | null;

    if (!response.ok || !data) {
      return {
        ok: false,
        error: data?.error ?? `Submission failed (${response.status}).`,
      };
    }

    return data;
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof DOMException && err.name === "AbortError"
          ? "Submission timed out — score not submitted."
          : "Network error — score not submitted.",
    };
  }
}

// Reads the Top 20. `sector` null → global board (all sectors); otherwise the
// per-sector board. Returns { ok: false } on any transport/parse failure so the
// UI can show "unavailable" rather than a misleading "no scores yet".
export async function fetchLeaderboard(
  sector: number | null,
): Promise<FetchLeaderboardResult> {
  if (!leaderboardConfig.enabled) {
    return { ok: false, error: "Leaderboard is offline." };
  }

  try {
    const response = await fetchWithTimeout(
      `${leaderboardConfig.url}/rest/v1/rpc/get_leaderboard`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          p_game: leaderboardConfig.gameSlug,
          p_category: sector !== null ? `sector:${sector}` : null,
        }),
      },
    );

    if (!response.ok) {
      return { ok: false, error: `Leaderboard request failed (${response.status}).` };
    }

    const data = (await response.json().catch(() => null)) as
      | LeaderboardEntry[]
      | null;

    return Array.isArray(data)
      ? { ok: true, entries: data }
      : { ok: false, error: "Invalid leaderboard response." };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof DOMException && err.name === "AbortError"
          ? "Leaderboard request timed out."
          : "Network error.",
    };
  }
}
