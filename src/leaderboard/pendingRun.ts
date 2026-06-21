import type { RecordedCommand } from "../sim";

// Holds a finished run across an OAuth sign-in redirect (a full page reload),
// so a signed-out player who signs in from the game-over screen doesn't lose the
// run they just completed. The run is auto-submitted once they're signed in with
// a handle.
const KEY = "gridwatch.pendingRun";

export type PendingRun = Readonly<{
  seed: string;
  sector: number;
  commands: RecordedCommand[];
}>;

export function savePendingRun(run: PendingRun): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(run));
  } catch {
    // Storage is optional; the player can still re-play and submit.
  }
}

// Reads and removes the pending run in one step, so it can never be submitted
// twice or loop.
export function takePendingRun(): PendingRun | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
    window.localStorage.removeItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingRun;
    if (
      typeof parsed?.seed === "string" &&
      typeof parsed?.sector === "number" &&
      Array.isArray(parsed?.commands)
    ) {
      return parsed;
    }
  } catch {
    // Corrupt entry — ignore.
  }
  return null;
}
