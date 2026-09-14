import { accountKit, signInHref } from "../src/leaderboard/account";
import { leaderboardConfig } from "../src/leaderboard/config";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@gridwatch/account-kit";

function expectEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) throw new Error(`${message}\n  expected: ${String(expected)}\n  actual:   ${String(actual)}`);
}

// The game lives at /play/breach/ on the Nexus origin; sign-in round-trips back there.
expectEqual(accountKit.config.returnPath, "/play/breach/", "Account kit return path drifted.");
expectEqual(accountKit.config.nexusOrigin, "https://nexus.warsignallabs.net", "Nexus origin drifted.");
expectEqual(
  signInHref(),
  "https://nexus.warsignallabs.net/account/sign-in?return=%2Fplay%2Fbreach%2F",
  "Sign-in link must point at the Nexus sign-in page with the encoded return path.",
);
// The leaderboard talks to the same project the kit owns; the config is no longer env-driven.
expectEqual(leaderboardConfig.url, SUPABASE_URL, "Leaderboard URL must come from the kit.");
expectEqual(leaderboardConfig.anonKey, SUPABASE_ANON_KEY, "Leaderboard anon key must come from the kit.");
expectEqual(leaderboardConfig.gameSlug, "gridwatch-signal-breach", "Canonical game slug drifted.");
expectEqual(leaderboardConfig.enabled, true, "Leaderboard is always configured now.");
console.log("verify-account-kit: return path, sign-in link, and leaderboard config are wired to the kit.");
