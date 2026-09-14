import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@gridwatch/account-kit";

// Slug of the row seeded in the shared `games` registry. GridWatchGamesDB hosts
// multiple games; this identifies ours when reading/writing the leaderboard.
export const GAME_SLUG = "gridwatch-signal-breach";

// Player handles are capped at this length both client-side and in the DB CHECK.
// Matches the account kit's HANDLE_RE (shared `profiles` table, one rule for all games).
export const MAX_HANDLE_LENGTH = 12;

// Top 20, matching the read RPC.
export const LEADERBOARD_LIMIT = 20;

// The account kit owns the Supabase project coordinates (publishable by design; RLS plus
// server-side replay validation are the security boundary). `enabled` is kept for callers
// that gate on it; the leaderboard is always configured now.
export const leaderboardConfig = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  gameSlug: GAME_SLUG,
  enabled: true,
} as const;
