import type { SubmitResult } from "./api";

/* Player-facing copy for a V2 submission result, shared by the game-over panel ("panel") and
   the post-sign-in leaderboard notice ("notice"). Ranks and bests can be null when the
   server's read-back after a committed write failed or the player sits outside the top 100:
   the copy leaves them out instead of printing "#null". `settled` means the run needs no
   further action (logged, or deliberately not recorded) — the SUBMIT button stays done. */
export type SubmitResultText = Readonly<{ text: string; kind: "success" | "info" | "error"; settled: boolean }>;

export function describeSubmitResult(result: SubmitResult, where: "panel" | "notice"): SubmitResultText {
  if (!result.ok) {
    if ("recorded" in result && result.recorded === false) return { text: result.error, kind: "info", settled: true };
    return { text: where === "notice" ? `Couldn't log your last run: ${result.error}` : result.error, kind: "error", settled: false };
  }
  const ranks = [
    result.globalRank != null ? `Campaign #${result.globalRank}` : null,
    result.sectorRank != null ? `Sector #${result.sectorRank}` : null,
  ].filter((part): part is string => part !== null).join(" · ");
  const best = result.bestScore ?? (result.improved ? result.runScore : null);
  let text: string;
  if (result.improved) {
    const head = where === "notice" ? `Run logged — new best ${best}!` : `New best ${best}!`;
    text = ranks ? `${head} ${ranks}.` : head;
  } else {
    const stands = best !== null ? `Your best ${best} stands` : "Your best stands";
    const head = where === "notice" ? `Run logged. ${stands}` : `This run: ${result.runScore}. ${stands}`;
    text = ranks ? `${head} — ${ranks}.` : `${head}.`;
  }
  return { text, kind: "success", settled: true };
}
