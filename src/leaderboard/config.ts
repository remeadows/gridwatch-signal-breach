// Slug of the row seeded in the shared `games` registry. GridWatchGamesDB hosts
// multiple games; this identifies ours when reading/writing the leaderboard.
export const GAME_SLUG = "gridwatch-signal-breach";

// Player handles are capped at this length both client-side and in the DB CHECK.
export const MAX_HANDLE_LENGTH = 12;

// Top 20, matching the read RPC.
export const LEADERBOARD_LIMIT = 20;

const rawUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

// Both values are publishable; the leaderboard's protection comes from RLS plus
// server-side replay validation, not from hiding these.
export const leaderboardConfig = {
  url: rawUrl.replace(/\/+$/, ""),
  anonKey,
  gameSlug: GAME_SLUG,
  // When unconfigured (e.g. a local build without env vars), leaderboard calls
  // are skipped so the game still runs fully offline.
  enabled: Boolean(rawUrl && anonKey),
} as const;
