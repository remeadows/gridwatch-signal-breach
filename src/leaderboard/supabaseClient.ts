import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@gridwatch/account-kit";

// The ONE Supabase client for the page, owned by the account kit so the game shares the
// Nexus session (one origin ⇒ one browser-stored session). Sign-in happens on Nexus; this
// client only reads the session and the player's own profile / leaderboard rows.
export const supabase: SupabaseClient = getSupabase();
