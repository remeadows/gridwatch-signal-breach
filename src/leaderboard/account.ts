import type { Session } from "@supabase/supabase-js";
import { createAccountKit, type AccountKit } from "@gridwatch/account-kit";
import { MAX_HANDLE_LENGTH } from "./config";

// Where this game lives on the Nexus origin; sign-in on Nexus returns the player here.
export const PLAY_RETURN_PATH = "/play/breach/";

export const accountKit: AccountKit = createAccountKit({ returnPath: PLAY_RETURN_PATH });

// Cached auth/profile state. The render loop reads these synchronously every
// frame; mutations notify listeners so open UI can refresh in place.
let session: Session | null = null;
let handle: string | null = null;
let ready = false;
const listeners = new Set<() => void>();

// Each profile read gets a generation number; a slower, older read must never overwrite a
// newer one's result (mirrors the kit's own header bar — see dist/header.js `refresh`).
let generation = 0;
// The last successfully-read handle, keyed to the user it belongs to. A failed read falls
// back to this ONLY when it still matches the current user, so a transient error right after
// an account switch can never surface another player's handle.
let lastKnownProfile: { userId: string; handle: string | null } | null = null;

// "disabled" is kept for API compatibility; the kit is always configured so it is never returned.
export type AccountState = "disabled" | "loading" | "signed-out" | "needs-handle" | "ready";

function notify(): void {
  for (const listener of listeners) listener();
}

// Subscribe to auth/profile changes. Returns an unsubscribe function.
export function onAccountChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function accountState(): AccountState {
  if (!ready) return "loading";
  if (!session) return "signed-out";
  if (!handle) return "needs-handle";
  return "ready";
}

export function currentHandle(): string | null {
  return handle;
}

export function currentEmail(): string | null {
  return session?.user.email ?? null;
}

export function accessToken(): string | null {
  return session?.access_token ?? null;
}

// The Nexus sign-in page, which returns the player to /play/breach/ afterwards.
export function signInHref(): string {
  return accountKit.signInUrl();
}

// Loads the current session + profile handle, then keeps them in sync with auth
// state changes (sign-in completed on Nexus, sign-out from any game, token refresh).
export async function initAccount(): Promise<void> {
  // Registered BEFORE the initial load so an auth event that arrives while that load is
  // still in flight (e.g. a fast round-trip back from Nexus sign-in) is never missed. The
  // generation guard in loadHandle() below keeps the two reads' results correctly ordered.
  accountKit.onChange((nextSession) => {
    generation += 1; // any later-resolving read of an older snapshot (incl. the initial one) is now stale
    session = nextSession;
    // Never await a Supabase call inside the auth callback (kit contract); defer the read.
    setTimeout(() => {
      void loadHandle().then(notify);
    }, 0);
  });

  // Guard the initial read the same way: if an onChange event installs a newer session while
  // this is still in flight (a fast Nexus sign-in redirect racing a slow/refreshing initial
  // read), the stale result here must not overwrite it.
  const mine = ++generation;
  const initial = await accountKit.getSession(); // never rejects
  if (mine === generation) {
    session = initial; // no change event arrived while we waited
  } // else: onChange already installed the newer session; keep it
  await loadHandle(); // loadHandle takes its own generation and reads `session` now
  ready = true;
  notify();
}

async function loadHandle(): Promise<void> {
  const mine = ++generation;
  const current = session;
  if (!current) {
    handle = null;
    return;
  }
  const userId = current.user.id;
  try {
    const profile = await accountKit.getProfile();
    if (mine !== generation) return; // a newer read already superseded this one
    handle = profile.handle;
    lastKnownProfile = { userId, handle };
  } catch (error) {
    if (mine !== generation) return;
    // A failed read keeps the last known handle for THIS user only (matches the shared bar).
    handle = lastKnownProfile?.userId === userId ? lastKnownProfile.handle : null;
    console.warn("[signal-breach] profile read failed:", error instanceof Error ? error.message : String(error));
  }
}

export async function signOut(): Promise<void> {
  try {
    await accountKit.signOut();
  } catch (error) {
    console.warn("[signal-breach] sign-out failed:", error instanceof Error ? error.message : String(error));
    return;
  }
  session = null;
  handle = null;
  lastKnownProfile = null;
  notify();
}

export type SaveHandleResult =
  | Readonly<{ ok: true; handle: string }>
  | Readonly<{ ok: false; error: string }>;

// Creates or updates the signed-in player's display handle through the kit, which enforces
// the shared handle rule and maps the database's uniqueness violation to a friendly error.
export async function saveHandle(raw: string): Promise<SaveHandleResult> {
  if (!session) {
    return { ok: false, error: "Sign in first." };
  }
  const cleaned = raw.trim().slice(0, MAX_HANDLE_LENGTH);
  if (cleaned.length < 1) {
    return { ok: false, error: "Enter a handle." };
  }
  const error = await accountKit.saveHandle(cleaned);
  if (error) {
    return { ok: false, error };
  }
  handle = cleaned;
  // Keep the fallback in sync so a later failed read still surfaces the handle we just saved.
  lastKnownProfile = { userId: session.user.id, handle: cleaned };
  notify();
  return { ok: true, handle: cleaned };
}

/** @deprecated removed in the next commit — sign-in is a link to Nexus (see signInHref). */
export async function signIn(_provider: "google" | "github"): Promise<void> {
  window.location.assign(signInHref());
}
