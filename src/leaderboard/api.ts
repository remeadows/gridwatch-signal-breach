import type { RecordedCommand } from "../sim";
import { createBoardReader } from "./boardReads";
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
  ruleset: string;
  seed: string;
  sector: number;
  commands: readonly RecordedCommand[];
  // The signed-in player's Supabase access token; the Edge Function derives the
  // user identity (and their handle) from it.
  accessToken: string;
}>;

export type SubmitResult =
  | Readonly<{
      ok: true;
      // True when this run beat the player's previous best for the sector.
      improved: boolean;
      // The score this run earned vs. the player's stored best for the sector.
      runScore: number;
      bestScore: number | null;
      // The player's campaign total (sum of cleared-sector bests).
      campaignScore: number | null;
      ruleset: string;
      rating: string;
      // Rank on the campaign board, and on this sector's entry ranking. Null when the
      // server could not read them back after a committed write.
      globalRank: number | null;
      sectorRank: number | null;
      // The handle the score is stored under (from the player's profile).
      handle: string;
    }>
  // A lost or retired-ruleset run: validated, deliberately not written (HTTP 200).
  | Readonly<{ ok: false; recorded: false; reason: string; error: string }>
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

// Submits a finished run for server-side validation. The server authenticates
// the player from their access token, replays the run from {ruleset, seed,
// sector, commands}, stores the score it computes itself (never a client-claimed
// number), and keeps only their personal best. Network/parse failures degrade
// to { ok: false } rather than throwing.
export async function submitScore(input: SubmitScoreInput): Promise<SubmitResult> {
  if (!leaderboardConfig.enabled) {
    return { ok: false, error: "Leaderboard is offline." };
  }

  try {
    const response = await fetchWithTimeout(
      `${leaderboardConfig.url}/functions/v1/submit-gridwatch-score`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: leaderboardConfig.anonKey,
          Authorization: `Bearer ${input.accessToken}`,
        },
        body: JSON.stringify({
          ruleset: input.ruleset,
          seed: input.seed,
          sector: input.sector,
          commands: input.commands,
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

// Reads the Top 20 from the shared board registry: `sector` null is the campaign board
// (each player's sum of cleared-sector bests), otherwise that sector's entry ranking on the
// same board (cleared runs only).
const boards = createBoardReader(leaderboardConfig);

export function fetchLeaderboard(sector: number | null): Promise<FetchLeaderboardResult> {
  return sector === null ? boards.campaign() : boards.campaignSector(sector);
}
