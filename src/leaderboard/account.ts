import type { Session } from "@supabase/supabase-js";
import { MAX_HANDLE_LENGTH } from "./config";
import { supabase } from "./supabaseClient";

// Cached auth/profile state. The render loop reads these synchronously every
// frame; mutations notify listeners so open UI can refresh in place.
let session: Session | null = null;
let handle: string | null = null;
let ready = false;
const listeners = new Set<() => void>();

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
  if (!supabase) return "disabled";
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

// Loads the current session + profile handle, then keeps them in sync with auth
// state changes (sign-in, sign-out, token refresh, OAuth redirect completion).
export async function initAccount(): Promise<void> {
  if (!supabase) {
    ready = true;
    notify();
    return;
  }

  const { data } = await supabase.auth.getSession();
  session = data.session;
  await loadHandle();
  ready = true;
  notify();

  supabase.auth.onAuthStateChange(async (_event, nextSession) => {
    session = nextSession;
    handle = null;
    await loadHandle();
    notify();
  });
}

async function loadHandle(): Promise<void> {
  if (!supabase || !session) {
    handle = null;
    return;
  }
  const { data } = await supabase
    .from("profiles")
    .select("handle")
    .eq("user_id", session.user.id)
    .maybeSingle();
  handle = data?.handle ?? null;
}

export async function signIn(provider: "google" | "github"): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
  session = null;
  handle = null;
  notify();
}

export type SaveHandleResult =
  | Readonly<{ ok: true; handle: string }>
  | Readonly<{ ok: false; error: string }>;

// Creates or updates the signed-in player's display handle. Uniqueness is
// enforced case-insensitively by the database; a collision returns a friendly
// "taken" error.
export async function saveHandle(raw: string): Promise<SaveHandleResult> {
  if (!supabase || !session) {
    return { ok: false, error: "Sign in first." };
  }
  const cleaned = raw.replace(/\s+/g, " ").trim().slice(0, MAX_HANDLE_LENGTH);
  if (cleaned.length < 1) {
    return { ok: false, error: "Enter a handle." };
  }

  const { error } = await supabase.from("profiles").upsert(
    { user_id: session.user.id, handle: cleaned, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That handle is already taken." };
    }
    return { ok: false, error: "Could not save handle." };
  }

  handle = cleaned;
  notify();
  return { ok: true, handle: cleaned };
}
