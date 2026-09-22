import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { accessToken, accountKit, accountState, currentEmail, currentHandle, initAccount, saveHandle, signInHref, signOut } from "../src/leaderboard/account";
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

type SessionRow = { data: { session: Session | null }; error: null };
// Every call to auth.getSession() (both the direct one in initAccount() and the ones nested
// inside the kit's getProfile()->currentUserId()) is recorded here. By default each call
// resolves immediately with `currentSession` (matching the earlier, simpler fake) so the
// existing profile-ordering scenarios below don't need to manage it. The final race scenario
// flips `manualSessionReads` on to hold a specific getSession() call open long enough to
// control its resolution order against an in-flight auth change.
const sessionReads: Array<Deferred<SessionRow>> = [];
let manualSessionReads = false;

// The kit's own saveHandle() ends in `from("profiles").upsert({ user_id, handle })`, returning
// just `{ error }` (data is never read by the kit). Each call gets its own controllable
// deferred, same pattern as profileReads, so a test can hold a save open across an intervening
// auth event.
type UpsertRow = { data: null; error: { message: string; code?: string } | null };
const upsertCalls: Array<Deferred<UpsertRow>> = [];
const signOutScopes: unknown[] = [];

// Minimal fake client — only the methods account.ts's call path actually touches:
// auth.getSession (used both by accountKit.getSession() and internally by getProfile()),
// auth.onAuthStateChange (captures the callback the kit's onChange wraps), and
// from("profiles").select().eq().maybeSingle() (the profile read) / .upsert() (the profile save).
const fakeClient = {
  auth: {
    async signOut(options: unknown) {
      signOutScopes.push(options);
      return { error: null };
    },
    getSession(): Promise<SessionRow> {
      const deferred = createDeferred<SessionRow>();
      sessionReads.push(deferred);
      if (!manualSessionReads) {
        deferred.resolve({ data: { session: currentSession }, error: null });
      }
      return deferred.promise;
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
      upsert(_payload: { user_id: string; handle: string }): Promise<UpsertRow> {
        const deferred = createDeferred<UpsertRow>();
        upsertCalls.push(deferred);
        return deferred.promise;
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

// --- Race check 2: initAccount()'s OWN initial getSession() read must never clobber a ---
// --- newer session that arrived via onChange while that initial read was still in flight. ---

const sessionBase = sessionReads.length;
const profileBase = profileReads.length;

manualSessionReads = true;

void initAccount();
await flush();
expectEqual(sessionReads.length, sessionBase + 1, "initAccount() must have its initial getSession() read pending.");

// A fast Nexus sign-in redirect delivers u2 via onChange while the initial read is still parked.
emitSession(u2);
await flush();
expectEqual(sessionReads.length, sessionBase + 2, "The onChange-triggered loadHandle() must start its own getSession() read.");
sessionReads[sessionBase + 1].resolve({ data: { session: u2 }, error: null });
await flush();
expectEqual(profileReads.length, profileBase + 1, "The onChange-triggered loadHandle() must reach the profile read for u2.");
profileReads[profileBase].resolve({ data: { handle: "second" }, error: null });
await flush();

// NOW resolve the STALE initial read with u1. It arrived after u2's onChange event and must
// not be allowed to overwrite the session (or the handle it implies) that onChange installed.
sessionReads[sessionBase].resolve({ data: { session: u1 }, error: null });
await flush();
expectEqual(sessionReads.length, sessionBase + 3, "initAccount()'s trailing loadHandle() must still run its own getSession() read.");
sessionReads[sessionBase + 2].resolve({ data: { session: u2 }, error: null });
await flush();
expectEqual(profileReads.length, profileBase + 2, "initAccount()'s trailing loadHandle() must reach its own profile read.");
profileReads[profileBase + 1].resolve({ data: { handle: "second" }, error: null });
await flush();

manualSessionReads = false;

expectEqual(accountState(), "ready", "Account state must settle to ready once the initial load resolves.");
expectEqual(currentHandle(), "second", "The stale initial getSession() read must not have clobbered the newer session's handle.");
expectEqual(currentEmail(), "u2@example.com", "The stale initial getSession() read must not have clobbered the newer session.");
expectEqual(accessToken(), "token-u2", "The stale initial getSession() read must not have clobbered the newer session's access token.");

console.log(
  "verify-account-kit: a stale initial getSession() read can never clobber a session installed by a concurrent onChange event.",
);

// --- C1: switching users must clear the handle SYNCHRONOUSLY, in the onChange callback ---
// --- itself -- before the new user's deferred profile read settles. Otherwise a reader in ---
// --- between (accountState()/currentHandle()) sees the new session paired with the OLD ---
// --- user's handle, which accountState() would misreport as "ready" instead of "needs-handle". ---

{
  const switchUser1 = makeSession("switch-1");
  emitSession(switchUser1);
  await flush();
  let idx = profileReads.length - 1;
  profileReads[idx].resolve({ data: { handle: "first" }, error: null });
  await flush();
  expectEqual(currentHandle(), "first", "Priming: switch-1 should be signed in with handle 'first'.");

  const switchUser2 = makeSession("switch-2");
  emitSession(switchUser2); // switch-2's profile read has not started (or resolved) yet.
  expectEqual(
    currentHandle(),
    null,
    "Switching users must clear the handle synchronously, before the new user's profile read settles.",
  );
  expectEqual(
    accountState(),
    "needs-handle",
    "A session that just switched users, with the handle already cleared, must report needs-handle -- not a stale ready state.",
  );

  // A same-user refresh (e.g. a token refresh) arriving while the read for the NEW user is
  // still in flight must not resurrect a stale handle -- it stays null until a read for THIS
  // user actually settles.
  emitSession(makeSession("switch-2"));
  expectEqual(
    currentHandle(),
    null,
    "A same-user refresh must not resurrect a stale handle while the switched-to user's read is still pending.",
  );

  await flush();
  idx = profileReads.length - 1;
  profileReads[idx].resolve({ data: { handle: "second" }, error: null });
  await flush();
  expectEqual(currentHandle(), "second", "Once switch-2's profile read settles, the handle should reflect switch-2's saved handle.");

  console.log("verify-account-kit: switching users clears the handle synchronously before the deferred profile read settles.");
}

// --- C2: saveHandle() must be bound to the user who initiated it. If the account changes ---
// --- while the save's upsert is in flight, the LOCAL cache (handle, lastKnownProfile) must ---
// --- not adopt the result under whoever is current once the await resolves, and a slower, ---
// --- already-in-flight profile read must not be able to clobber a successfully saved handle. ---

{
  // -- Racing path: account changes while the upsert is in flight. --
  const save1 = makeSession("save-1");
  emitSession(save1); // handle cleared by the C1 switch-guard; save-1 never had a successful read.
  const savePromise = saveHandle("neo");
  await flush(); // let saveHandle() reach the kit's pending from("profiles").upsert(...) call.
  expectEqual(upsertCalls.length, 1, "saveHandle('neo') must reach the fake upsert call.");

  const save2 = makeSession("save-2");
  emitSession(save2); // account changes locally while save-1's upsert is still pending.
  await flush(); // let save-2's own (unrelated) profile read start, per the brief's scenario.

  upsertCalls[0].resolve({ data: null, error: null }); // the upsert itself succeeds (it wrote save-1's row).
  await flush();

  const result = await savePromise;
  expectEqual(result.ok, false, "A save whose account changed mid-flight must not report success.");
  expectEqual(
    (result as Readonly<{ ok: false; error: string }>).error,
    "Account changed while saving — try again.",
    "The account-changed error message must match exactly.",
  );
  expectEqual(currentHandle(), null, "The aborted save must not touch the handle now showing for the (different) current user.");

  // lastKnownProfile must not have been set for save-1 by the aborted save (it never had a
  // successful read before this, so if the code wrongly exposed "neo" for it, a later FAILING
  // read for save-1 would incorrectly fall back to "neo" instead of null).
  emitSession(makeSession("save-1"));
  await flush();
  const staleIdx = profileReads.length - 1;
  profileReads[staleIdx].reject(new Error("network blip"));
  await flush();
  expectEqual(
    currentHandle(),
    null,
    "A failing read for save-1, after its aborted save, must not resurrect the 'neo' handle that was never actually applied locally.",
  );

  // -- Plain path: no race. Save succeeds, and a stale read that started BEFORE the save must ---
  // -- not be able to overwrite the just-saved handle once it resolves after the save. --
  const save3 = makeSession("save-3");
  emitSession(save3);
  await flush(); // save-3's own (initial) profile read starts and is left pending -- the "stale" read.
  const staleReadIdx = profileReads.length - 1;

  const savePromise2 = saveHandle("neo");
  await flush();
  const upsertIdx = upsertCalls.length - 1;
  upsertCalls[upsertIdx].resolve({ data: null, error: null });
  await flush();

  const result2 = await savePromise2;
  expectEqual(result2.ok, true, "A save with no account change must succeed.");
  expectEqual((result2 as Readonly<{ ok: true; handle: string }>).handle, "neo", "A successful save must return the saved handle.");
  expectEqual(currentHandle(), "neo", "A successful save must update the handle immediately.");

  // Now resolve the stale read that started before the save. It must not clobber "neo".
  profileReads[staleReadIdx].resolve({ data: { handle: "old-stale" }, error: null });
  await flush();
  expectEqual(
    currentHandle(),
    "neo",
    "A profile read that started before a successful save must not overwrite the just-saved handle once it resolves.",
  );

  console.log(
    "verify-account-kit: saveHandle() is bound to its initiating user and its success supersedes any earlier in-flight profile read.",
  );
}

// --- Task 3: the signed-out panel is a link to Nexus, not an OAuth starter, and the shared ---
// --- account bar mounts in bootstrap.ts. ---

import { readFileSync } from "node:fs";
const accountUi = readFileSync("src/ui/account.ts", "utf8");
if (/github|signIn\(/i.test(accountUi)) throw new Error("src/ui/account.ts must not start OAuth or mention GitHub; sign-in is a link to Nexus.");
if (!accountUi.includes("signInHref()")) throw new Error("src/ui/account.ts must build the sign-in link from signInHref().");
if (!accountUi.includes("auxclick")) throw new Error("src/ui/account.ts must also stash the pending run on auxclick (middle-click) so it isn't lost.");
if (!accountUi.includes("Play on Nexus")) throw new Error("src/ui/account.ts must render a 'Play on Nexus' link for the old-host compatibility case.");
const bootstrap = readFileSync("src/bootstrap.ts", "utf8");
if (!bootstrap.includes("mountAccountHeader(")) throw new Error("src/bootstrap.ts must mount the shared account bar.");

console.log("verify-account-kit: sign-in is a Nexus link and the shared account bar is mounted.");

// v0.2.4: signing out here must not revoke another device's save session.
await signOut();
expectEqual(signOutScopes.length, 1, "Sign-out must reach the shared client once.");
expectEqual(JSON.stringify(signOutScopes[0]), JSON.stringify({ scope: "local" }), "Sign-out must be browser-local, never global.");
expectEqual(accountState(), "signed-out", "Account state must clear after sign-out.");
expectEqual(accessToken(), null, "Cached access token must clear after sign-out.");
expectEqual(accountKit.saves, undefined, "Do not enable expansion saves before Breach schema registration and server rollout.");
console.log("verify-account-kit: local sign-out preserves other devices; unpublished cloud saves remain disabled.");
