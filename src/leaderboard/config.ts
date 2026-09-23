import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@gridwatch/account-kit";

declare const __EXPANSION_LAN_PREVIEW__: boolean;
// Dedicated trusted-LAN playtests stay network-free, even though the kit owns
// the project coordinates now. `typeof` also permits DOM-free Node verifiers.
export const accountNetworkingEnabled = typeof __EXPANSION_LAN_PREVIEW__ === "undefined" || !__EXPANSION_LAN_PREVIEW__;

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
// that gate on it; the dedicated LAN preview disables network features.
export const leaderboardConfig = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  gameSlug: GAME_SLUG,
  enabled: accountNetworkingEnabled,
} as const;
