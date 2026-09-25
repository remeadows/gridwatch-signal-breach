import { leaderboardConfig } from "./config";
import { canonicalExpansionScoreReplay, expansionScoreCategory, MAX_EXPANSION_SCORE_BYTES } from "./expansionScoreProtocol";
import type { ExpansionReplayInput } from "../sim/expansion/types";
import type { FetchLeaderboardResult } from "./api";
import { createBoardReader } from "./boardReads";

// Compatible score function v10 deployed before this reviewed client activation.
export const EXPANSION_LEADERBOARDS_RELEASED = true;
// bestScore / levelRank are null when the server's read-back after a committed write failed
// (or the player sits outside the level's top 100); the score itself was still logged.
export type ExpansionSubmitResult = { ok: false; error: string } | {
  ok: true; improved: boolean; runScore: number; bestScore: number | null; levelRank: number | null;
  rating: string; handle: string; category: string; level: number; contentRevision: string;
};
const count = (value: unknown, min: number): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= min;
export function createExpansionScoreApi(config: { enabled: boolean; url: string; anonKey: string; gameSlug: string }, request: typeof fetch = fetch) {
  const boards = createBoardReader(config, request);
  async function post(path: string, body: unknown, token: string): Promise<{ ok: boolean; data: unknown }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await request(config.url + path, { method: "POST", headers: {
        "Content-Type": "application/json", apikey: config.anonKey, Authorization: `Bearer ${token}`,
      }, body: JSON.stringify(body), signal: controller.signal });
      return { ok: response.ok, data: await response.json() };
    } finally { clearTimeout(timeout); }
  }
  return {
    enabled: config.enabled,
    async submit(raw: ExpansionReplayInput, token: string): Promise<ExpansionSubmitResult> {
      if (!config.enabled) return { ok: false, error: "Expansion leaderboard is disabled in this build. Your run remains local." };
      try {
        const proof = canonicalExpansionScoreReplay(raw);
        if (new TextEncoder().encode(JSON.stringify(proof)).length > MAX_EXPANSION_SCORE_BYTES) return { ok: false, error: "Replay is too large to submit." };
        const response = await post("/functions/v1/submit-gridwatch-score", proof, token);
        const data = response.data as Record<string, unknown> | null;
        if (!response.ok || data?.ok !== true) return { ok: false, error: typeof data?.error === "string" ? data.error : "Score submission failed. Retry when online." };
        if (data.category !== expansionScoreCategory(proof.level) || data.contentRevision !== proof.contentRevision || data.level !== proof.level ||
          !count(data.runScore, 0) || (data.bestScore !== null && (!count(data.bestScore, 0) || data.bestScore < data.runScore)) ||
          (data.levelRank !== null && !count(data.levelRank, 1)) || typeof data.improved !== "boolean" || typeof data.rating !== "string" || typeof data.handle !== "string") {
          return { ok: false, error: "Invalid score response. Your pending run was retained." };
        }
        return data as ExpansionSubmitResult;
      } catch { return { ok: false, error: "Score not confirmed. Check your connection and retry." }; }
    },
    // Level ranking on the expansion / r4 board (entry `level:<n>`).
    async read(level: number): Promise<FetchLeaderboardResult> {
      if (!config.enabled) return { ok: false, error: "Expansion leaderboard is disabled in this build." };
      try { expansionScoreCategory(level); } catch { return { ok: false, error: "Rankings unavailable. Check your connection and retry." }; }
      return boards.expansionLevel(level);
    },
  };
}
export const expansionScoreApi = createExpansionScoreApi({ ...leaderboardConfig, enabled: leaderboardConfig.enabled && EXPANSION_LEADERBOARDS_RELEASED });
