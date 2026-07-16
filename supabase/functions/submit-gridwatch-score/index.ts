// Server-side score validator for "GridWatch: Signal Breach".
//
// Anti-cheat: the game simulation is pure and deterministic, so this function
// REPLAYS the submitted run with the exact game code (bundled from src/sim) and
// stores the score IT computes. The number a client claims is never trusted.
//
// Identity: the caller must be signed in (Supabase Auth). The score is attributed
// to their user id, displayed under the handle from their profile, and only their
// personal best per board is kept (record_score upsert).
//
// verify_jwt is intentionally false so this function can handle the CORS preflight
// itself; the user's token is validated manually below.
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  SIM_RULESET_ID,
  replayRun as replayCurrentRun,
  ReplayError as CurrentReplayError,
} from "./sim.bundle.js";
import {
  replayRun as replayLegacyRun,
  ReplayError as LegacyReplayError,
} from "https://raw.githubusercontent.com/remeadows/gridwatch-signal-breach/fa0a5df7a5bae70068772566913d13e99fe137f0/supabase/functions/submit-gridwatch-score/sim.bundle.js";
import {
  ReplayValidationError,
  canonicalizeCommands,
  categoryForRuleset,
  resolveRuleset,
  type CanonicalCommand,
  type ResolvedRuleset,
} from "./replayValidation.ts";

const GAME_SLUG = "gridwatch-signal-breach";
const MAX_COMMANDS = 5000;
const MAX_SCORE = 100000;
const VALID_SECTORS = new Set([1, 2, 3]);

const ALLOWED_ORIGINS = new Set([
  "https://GridWatch-SignalBreach.warsignallabs.net",
  "https://gridwatch-signalbreach.warsignallabs.net",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// UTC ISO-8601 period stamps for the hub's Today / This Week boards. Byte-identical
// in logic to the other GridWatch games' score workers and the Command Nexus hub's
// src/lib/periods.ts — change together.
function dailyCategory(now: Date): string {
  return "daily-" + now.toISOString().slice(0, 10);
}
function weeklyCategory(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `weekly-${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, 405, origin);
  }

  // Authenticate the caller. The browser sends the signed-in user's access token.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ ok: false, error: "Sign in to submit a score." }, 401, origin);
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return json({ ok: false, error: "Your session has expired — sign in again." }, 401, origin);
  }

  let payload: {
    ruleset?: unknown;
    seed?: unknown;
    sector?: unknown;
    commands?: unknown;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body." }, 400, origin);
  }

  const seed = payload.seed;
  const sector = payload.sector;
  const commands = payload.commands;

  if (typeof seed !== "string" || seed.length === 0 || seed.length > 200) {
    return json({ ok: false, error: "Invalid seed." }, 400, origin);
  }
  if (typeof sector !== "number" || !VALID_SECTORS.has(sector)) {
    return json({ ok: false, error: "Invalid sector." }, 400, origin);
  }
  let ruleset: ResolvedRuleset;
  let canonicalCommands: CanonicalCommand[];
  try {
    ruleset = resolveRuleset(payload.ruleset, SIM_RULESET_ID);
    canonicalCommands = canonicalizeCommands(commands, MAX_COMMANDS);
  } catch (err) {
    if (err instanceof ReplayValidationError) {
      return json({ ok: false, error: err.message }, 400, origin);
    }
    return json({ ok: false, error: "Invalid replay payload." }, 400, origin);
  }

  let score: number;
  let rating: string;
  let phase: string;
  let metadata: Record<string, unknown>;
  try {
    const replay = ruleset.legacy ? replayLegacyRun : replayCurrentRun;
    const result = replay({ seed, sector, commands: canonicalCommands });
    const breakdown = result.score;
    const state = result.state;
    score = breakdown.total;
    rating = breakdown.rating;
    phase = state.phase;
    metadata = {
      sector,
      ruleset: ruleset.id,
      phase,
      integrity: breakdown.integrity,
      neutralized: breakdown.neutralized,
      uptimePercent: breakdown.uptimePercent,
      efficiencyBonus: breakdown.efficiencyBonus,
    };
  } catch (err) {
    if (err instanceof LegacyReplayError || err instanceof CurrentReplayError) {
      return json({ ok: false, error: `Rejected: ${err.message}` }, 422, origin);
    }
    return json({ ok: false, error: "Replay failed." }, 422, origin);
  }

  if (phase !== "won" && phase !== "lost") {
    return json({ ok: false, error: "Run did not reach a finished state." }, 422, origin);
  }
  if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
    return json({ ok: false, error: "Score out of bounds." }, 422, origin);
  }

  const category = categoryForRuleset(ruleset, `sector:${sector}`);
  const proof = ruleset.legacy
    ? { seed, sector, commands: canonicalCommands }
    : { ruleset: ruleset.id, seed, sector, commands: canonicalCommands };
  const proofHash = await sha256Hex(JSON.stringify(proof));

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // The player must have chosen a handle (display name) before submitting.
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("handle")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError) {
    return json({ ok: false, error: "Could not load your profile." }, 500, origin);
  }
  if (!profile?.handle) {
    return json({ ok: false, error: "Choose a handle before submitting." }, 409, origin);
  }

  // Atomic keep-best upsert + ranking, in the database.
  const { data: recorded, error: recordError } = await admin.rpc("record_score", {
    p_user_id: user.id,
    p_slug: GAME_SLUG,
    p_category: category,
    p_score: score,
    p_rating: rating,
    p_metadata: metadata,
    p_proof: proof,
    p_proof_hash: proofHash,
  });
  if (recordError || !recorded || recorded.length === 0) {
    return json({ ok: false, error: "Could not save score." }, 500, origin);
  }
  const row = recorded[0] as {
    stored_score: number;
    improved: boolean;
    global_rank: number;
    sector_rank: number;
  };

  // Command Nexus hub alignment: the hub reads the legacy shared board via
  // get_leaderboard(game, 'standard' | 'daily-*' | 'weekly-*'). #25 originally wrote
  // only sector:N rows, so the hub's Signal Breach board stayed empty. Feed it here:
  //   standard    = campaign total = sum of best scores for CLEARED sectors only
  //   daily/weekly = this run's score (best single-sector run of the period,
  //                 win or lose — unchanged from the original alignment)
  //
  // "Cleared" is tracked via a separate, append-only sector-cleared:N marker
  // (fixed score of 1, written only when phase === "won") rather than derived
  // from sector:N's stored metadata.phase. sector:N is a pure keep-best-by-raw-
  // score row shared by wins and losses: a later, higher-scoring LOSS can
  // overwrite a previously WON row (flipping metadata.phase back to "lost"), and
  // a later, lower-scoring WIN never overwrites an existing higher-scoring LOSS
  // (so the win would never be recorded at all). Neither direction may ever
  // un-clear or silently drop a real clear, so "cleared" must be a monotonic
  // fact independent of whichever attempt currently holds the best-score slot.
  //
  // The companion migration constrains a null-category leaderboard read to the
  // three legacy sector categories. New rulesets prefix every category, so they
  // remain additive and cannot overwrite or leak into historical rankings.
  //
  // BEST-EFFORT: every write here is wrapped so a failure never fails the
  // primary sector submission above; every Supabase {error} is logged
  // explicitly (v2's .rpc()/query builder return {data,error} and do not
  // throw by default, so a silent failure here would otherwise be invisible).
  //
  // record_score resolves the target game from p_slug internally, so it does
  // NOT need our locally-fetched gameId — only the direct .from("scores")
  // reads below (which filter by game_id, not slug) do. Keeping the marker
  // write and the daily/weekly writes ungated means a transient `games`
  // lookup failure can never silently drop them; only the `standard` write
  // (which needs campaignScore, computed from those gated reads) is skipped
  // when the lookup fails.
  let campaignScore: number | null = null;
  try {
    if (phase === "won") {
      const markerCategory = categoryForRuleset(ruleset, `sector-cleared:${sector}`);
      const { error: markerError } = await admin.rpc("record_score", {
        p_user_id: user.id,
        p_slug: GAME_SLUG,
        p_category: markerCategory,
        p_score: 1,
        p_rating: rating,
        p_metadata: { kind: "cleared-marker", sector, ruleset: ruleset.id },
        p_proof: proof,
        p_proof_hash: proofHash,
      });
      if (markerError) console.error(`hub-alignment: ${markerCategory} marker write error:`, markerError);
    }

    const { data: gameRow, error: gameError } = await admin
      .from("games").select("id").eq("slug", GAME_SLUG).maybeSingle();
    if (gameError) console.error("hub-alignment: games lookup error:", gameError);
    const gameId = gameRow?.id as string | undefined;

    let clearedSectorCount = 0;
    if (gameId) {
      const sectorCategories = [1, 2, 3].map((id) =>
        categoryForRuleset(ruleset, `sector:${id}`)
      );
      const clearedCategories = [1, 2, 3].map((id) =>
        categoryForRuleset(ruleset, `sector-cleared:${id}`)
      );
      const [{ data: sectorRows, error: sectorError }, { data: clearedMarkerRows, error: clearedError }] =
        await Promise.all([
          admin.from("scores").select("category, score")
            .eq("game_id", gameId).eq("user_id", user.id)
            .in("category", sectorCategories),
          admin.from("scores").select("category")
            .eq("game_id", gameId).eq("user_id", user.id)
            .in("category", clearedCategories),
        ]);
      if (sectorError) console.error("hub-alignment: sector scores fetch error:", sectorError);
      if (clearedError) console.error("hub-alignment: cleared-marker fetch error:", clearedError);

      const clearedSectors = new Set(
        (clearedMarkerRows ?? []).map((r) =>
          Number((r.category as string).split(":").at(-1))
        ),
      );
      const sectorScoreRows = (sectorRows ?? []) as Array<{ category: string; score: number }>;
      const clearedRows = sectorScoreRows.filter((r) =>
        clearedSectors.has(Number(r.category.split(":").at(-1))),
      );
      campaignScore = clearedRows.reduce((sum, r) => sum + (r.score ?? 0), 0);
      clearedSectorCount = clearedRows.length;
    }

    const now = new Date();
    const aggProof = { kind: "aggregate", ruleset: ruleset.id, from: category };
    const aggHash = await sha256Hex(JSON.stringify({ user: user.id, ...aggProof }));
    const alignedWrites: Array<{ cat: string; sc: number; meta: Record<string, unknown>; agg: boolean }> = [
      ...(campaignScore !== null
        ? [{
            cat: categoryForRuleset(ruleset, "standard"),
            sc: campaignScore,
            meta: { kind: "campaign", ruleset: ruleset.id, sectors: clearedSectorCount },
            agg: true,
          }]
        : []),
      {
        cat: categoryForRuleset(ruleset, dailyCategory(now)),
        sc: score,
        meta: metadata,
        agg: false,
      },
      {
        cat: categoryForRuleset(ruleset, weeklyCategory(now)),
        sc: score,
        meta: metadata,
        agg: false,
      },
    ];
    await Promise.all(alignedWrites.map(async (w) => {
      const { error: writeError } = await admin.rpc("record_score", {
        p_user_id: user.id,
        p_slug: GAME_SLUG,
        p_category: w.cat,
        p_score: w.sc,
        p_rating: rating,
        p_metadata: w.meta,
        p_proof: w.agg ? aggProof : proof,
        p_proof_hash: w.agg ? aggHash : proofHash,
      });
      if (writeError) console.error(`hub-alignment: ${w.cat} write error:`, writeError);
    }));
  } catch (err) {
    console.error("hub-alignment writes failed (non-fatal):", err);
  }

  return json(
    {
      ok: true,
      improved: row.improved,
      runScore: score,
      bestScore: row.stored_score,
      campaignScore,
      ruleset: ruleset.id,
      rating,
      globalRank: row.global_rank,
      sectorRank: row.sector_rank,
      handle: profile.handle,
    },
    200,
    origin,
  );
});
