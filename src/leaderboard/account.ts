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
  session = await accountKit.getSession();
  await loadHandle();
  ready = true;
  notify();

  accountKit.onChange((nextSession) => {
    session = nextSession;
    // Never await a Supabase call inside the auth callback (kit contract); defer the read.
    setTimeout(() => {
      void loadHandle().then(notify);
    }, 0);
  });
}

async function loadHandle(): Promise<void> {
  if (!session) {
    handle = null;
    return;
  }
  try {
    handle = (await accountKit.getProfile()).handle;
  } catch (error) {
    // A failed read keeps the last known handle for this session (matches the shared bar).
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
  notify();
  return { ok: true, handle: cleaned };
}

/** @deprecated removed in the next commit — sign-in is a link to Nexus (see signInHref). */
export async function signIn(_provider: "google" | "github"): Promise<void> {
  window.location.assign(signInHref());
}
