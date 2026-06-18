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
    }>
  | Readonly<{ ok: false; error: string }>;

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
    const response = await fetch(
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
  } catch {
    return { ok: false, error: "Network error — score not submitted." };
  }
}

// Reads the Top 20. `sector` null → global board (all sectors); otherwise the
// per-sector board. Returns [] on any failure so the UI can show "unavailable".
export async function fetchLeaderboard(
  sector: number | null,
): Promise<LeaderboardEntry[]> {
  if (!leaderboardConfig.enabled) {
    return [];
  }

  try {
    const response = await fetch(
      `${leaderboardConfig.url}/rest/v1/rpc/get_leaderboard`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          p_game: leaderboardConfig.gameSlug,
          p_category: sector ? `sector:${sector}` : null,
        }),
      },
    );

    if (!response.ok) {
      return [];
    }

    const data = (await response.json().catch(() => null)) as
      | LeaderboardEntry[]
      | null;

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
