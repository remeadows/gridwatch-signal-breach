import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { accountKit, currentHandle, initAccount, signInHref } from "../src/leaderboard/account";
import { leaderboardConfig } from "../src/leaderboard/config";
import { __setSupabaseForTests, SUPABASE_ANON_KEY, SUPABASE_URL } from "@gridwatch/account-kit";

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

// --- Race check: an out-of-order profile read must never clobber a newer session's handle, ---
// --- and a failed read must only fall back to a handle that belongs to the CURRENT user.    ---

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

type ProfileRow = { data: { handle: string | null } | null; error: { message: string } | null };

function makeSession(userId: string): Session {
  return {
    access_token: `token-${userId}`,
    refresh_token: `refresh-${userId}`,
    user: { id: userId, email: `${userId}@example.com` },
  } as unknown as Session;
}

// A tick that lets pending microtasks AND any setTimeout(0) deferrals (the kit's onChange
// callback never awaits directly, so it defers the real read via setTimeout) settle before
// the test inspects state.
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

let currentSession: Session | null = null;
let authChangeCallback: ((event: string, session: Session | null) => void) | null = null;
const profileReads: Array<Deferred<ProfileRow>> = [];

// Minimal fake client — only the methods account.ts's call path actually touches:
// auth.getSession (used both by accountKit.getSession() and internally by getProfile()),
// auth.onAuthStateChange (captures the callback the kit's onChange wraps), and
// from("profiles").select().eq().maybeSingle() (the profile read itself).
const fakeClient = {
  auth: {
    async getSession() {
      return { data: { session: currentSession }, error: null };
    },
    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
      authChangeCallback = callback;
      return { data: { subscription: { unsubscribe(): void {} } } };
    },
  },
  from(_table: string) {
    return {
      select(_columns: string) {
        return {
          eq(_column: string, _value: string) {
            return {
              maybeSingle(): Promise<ProfileRow> {
                const deferred = createDeferred<ProfileRow>();
                profileReads.push(deferred);
                return deferred.promise;
              },
            };
          },
        };
      },
    };
  },
} as unknown as SupabaseClient;

__setSupabaseForTests(fakeClient);

function emitSession(session: Session | null): void {
  currentSession = session;
  authChangeCallback?.("SIGNED_IN", session);
}

const u1 = makeSession("u1");
currentSession = u1;

void initAccount();
await flush();
expectEqual(profileReads.length, 1, "initAccount() must have a profile read in flight for u1.");

const u2 = makeSession("u2");
emitSession(u2);
await flush();
expectEqual(profileReads.length, 2, "The auth-change handler must start a second profile read for u2.");

// Resolve the NEWER (u2) read first.
profileReads[1].resolve({ data: { handle: "second" }, error: null });
await flush();
expectEqual(currentHandle(), "second", "The newer session's profile read should win immediately.");

// Now resolve the STALE (u1) read. It must not clobber the newer handle.
profileReads[0].resolve({ data: { handle: "first" }, error: null });
await flush();
expectEqual(currentHandle(), "second", "A stale, out-of-order profile read must not clobber a newer session's handle.");

// A failed read for the SAME user (e.g. a token refresh) must keep the last known handle.
emitSession(u2);
await flush();
expectEqual(profileReads.length, 3, "A repeat auth event for the same user must trigger another profile read.");
profileReads[2].reject(new Error("network blip"));
await flush();
expectEqual(currentHandle(), "second", "A failed read should keep the last known handle for the same user.");

// A failed read for a DIFFERENT user must not leak the previous user's handle.
const u3 = makeSession("u3");
emitSession(u3);
await flush();
expectEqual(profileReads.length, 4, "Switching to u3 must trigger another profile read.");
profileReads[3].reject(new Error("network blip"));
await flush();
expectEqual(currentHandle(), null, "A failed read for a new user must not fall back to another user's handle.");

console.log(
  "verify-account-kit: generation-guarded profile reads keep the newest session's handle and never leak a stale handle across users.",
);
