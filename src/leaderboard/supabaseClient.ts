import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { leaderboardConfig } from "./config";

// A single Supabase client for auth (OAuth sign-in + session) and reading the
// player's own profile. Null when the leaderboard is unconfigured, so the game
// still runs fully offline with no auth dependency.
export const supabase: SupabaseClient | null = leaderboardConfig.enabled
  ? createClient(leaderboardConfig.url, leaderboardConfig.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Completes the OAuth redirect (?code=…) when the provider sends the
        // player back to the app, then cleans the URL.
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    })
  : null;
