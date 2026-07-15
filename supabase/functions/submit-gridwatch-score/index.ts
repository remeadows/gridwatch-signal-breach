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
  replayRun,
  ReplayError,
} from "https://raw.githubusercontent.com/remeadows/gridwatch-signal-breach/fa0a5df7a5bae70068772566913d13e99fe137f0/supabase/functions/submit-gridwatch-score/sim.bundle.js";

const GAME_SLUG = "gridwatch-signal-breach";
const MAX_COMMANDS = 5000;
const MAX_SCORE = 100000;
const ALLOWED_COMMAND_TYPES = new Set(["placeUnit", "sellUnit", "skipPrep"]);
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

function isValidCommandEnvelope(entry: unknown): boolean {
  if (typeof entry !== "object" || entry === null) return false;
  const { t, c } = entry as { t: unknown; c: unknown };
  if (typeof t !== "number" || !Number.isInteger(t) || t < 0) return false;
  if (typeof c !== "object" || c === null) return false;
  const type = (c as { type: unknown }).type;
  return typeof type === "string" && ALLOWED_COMMAND_TYPES.has(type);
}

function canonicalizePosition(raw: unknown): { x: number; y: number } | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { x, y } = raw as { x: unknown; y: unknown };
  if (
    typeof x !== "number" || !Number.isInteger(x) ||
    typeof y !== "number" || !Number.isInteger(y)
  ) return null;
  return { x, y };
}

// Rebuild the command log from only the fields the sim reads, in a fixed key
// order, so inert padding can't vary the proof hash.
function canonicalizeCommands(
  commands: readonly unknown[],
): Array<{ t: number; c: Record<string, unknown> }> {
  const out: Array<{ t: number; c: Record<string, unknown> }> = [];
  for (const entry of commands) {
    const { t, c } = entry as { t: number; c: { type: string } & Record<string, unknown> };
    switch (c.type) {
      case "skipPrep":
        out.push({ t, c: { type: "skipPrep" } });
        break;
      case "sellUnit": {
        const position = canonicalizePosition(c.position);
        if (!position) throw new ReplayError("Malformed command log.");
        out.push({ t, c: { type: "sellUnit", position } });
        break;
      }
      case "placeUnit": {
        const position = canonicalizePosition(c.position);
        if (!position || typeof c.unit !== "string") throw new ReplayError("Malformed command log.");
        out.push({ t, c: { type: "placeUnit", position, unit: c.unit } });
        break;
      }
      default:
        throw new ReplayError("Malformed command log.");
    }
  }
  return out;
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

  let payload: { seed?: unknown; sector?: unknown; commands?: unknown };
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
  if (!Array.isArray(commands) || commands.length > MAX_COMMANDS) {
    return json({ ok: false, error: "Invalid or oversized command log." }, 400, origin);
  }

  let previousTick = 0;
  for (const entry of commands) {
    if (!isValidCommandEnvelope(entry)) {
      return json({ ok: false, error: "Malformed command log." }, 400, origin);
    }
    const t = (entry as { t: number }).t;
    if (t < previousTick) {
      return json({ ok: false, error: "Command log is out of order." }, 400, origin);
    }
    previousTick = t;
  }

  let score: number;
  let rating: string;
  let phase: string;
  let metadata: Record<string, unknown>;
  let canonicalCommands: Array<{ t: number; c: Record<string, unknown> }>;
  try {
    canonicalCommands = canonicalizeCommands(commands);
    const result = replayRun({ seed, sector, commands: canonicalCommands });
    const breakdown = result.score;
    const state = result.state;
    score = breakdown.total;
    rating = breakdown.rating;
    phase = state.phase;
    metadata = {
      sector,
      phase,
      integrity: breakdown.integrity,
      neutralized: breakdown.neutralized,
      uptimePercent: breakdown.uptimePercent,
      efficiencyBonus: breakdown.efficiencyBonus,
    };
  } catch (err) {
    if (err instanceof ReplayError) {
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

  const category = `sector:${sector}`;
  const proof = { seed, sector, commands: canonicalCommands };
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

  // Command Nexus hub alignment: the hub reads the shared board via
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
  // Known follow-up (not fixed here, flagged for a product decision): the
  // in-game "global" leaderboard screen (src/leaderboard/api.ts) queries
  // get_leaderboard with p_category: null, which pools ALL categories for this
  // game — including standard/daily/weekly/sector-cleared:N. Once a player
  // clears 2+ sectors, the campaign total (`standard`) will exceed any single
  // sector score and start winning that null-pooled "best score" query,
  // silently changing what the existing global board displays. Fixing this
  // requires either an RPC change (get_leaderboard excluding aggregate
  // categories when p_category is null) or a frontend change (the global path
  // querying sectors explicitly) — out of scope for this alignment PR.
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
      const markerCategory = `sector-cleared:${sector}`;
      const { error: markerError } = await admin.rpc("record_score", {
        p_user_id: user.id,
        p_slug: GAME_SLUG,
        p_category: markerCategory,
        p_score: 1,
        p_rating: rating,
        p_metadata: { kind: "cleared-marker", sector },
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
      const [{ data: sectorRows, error: sectorError }, { data: clearedMarkerRows, error: clearedError }] =
        await Promise.all([
          admin.from("scores").select("category, score")
            .eq("game_id", gameId).eq("user_id", user.id)
            .in("category", ["sector:1", "sector:2", "sector:3"]),
          admin.from("scores").select("category")
            .eq("game_id", gameId).eq("user_id", user.id)
            .in("category", ["sector-cleared:1", "sector-cleared:2", "sector-cleared:3"]),
        ]);
      if (sectorError) console.error("hub-alignment: sector scores fetch error:", sectorError);
      if (clearedError) console.error("hub-alignment: cleared-marker fetch error:", clearedError);

      const clearedSectors = new Set(
        (clearedMarkerRows ?? []).map((r) => Number((r.category as string).split(":")[1])),
      );
      const sectorScoreRows = (sectorRows ?? []) as Array<{ category: string; score: number }>;
      const clearedRows = sectorScoreRows.filter((r) =>
        clearedSectors.has(Number(r.category.split(":")[1])),
      );
      campaignScore = clearedRows.reduce((sum, r) => sum + (r.score ?? 0), 0);
      clearedSectorCount = clearedRows.length;
    }

    const now = new Date();
    const aggProof = { kind: "aggregate", from: category };
    const aggHash = await sha256Hex(JSON.stringify({ user: user.id, ...aggProof }));
    const alignedWrites: Array<{ cat: string; sc: number; meta: Record<string, unknown>; agg: boolean }> = [
      ...(campaignScore !== null
        ? [{ cat: "standard", sc: campaignScore, meta: { kind: "campaign", sectors: clearedSectorCount }, agg: true }]
        : []),
      { cat: dailyCategory(now), sc: score, meta: metadata, agg: false },
      { cat: weeklyCategory(now), sc: score, meta: metadata, agg: false },
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
      rating,
      globalRank: row.global_rank,
      sectorRank: row.sector_rank,
      handle: profile.handle,
    },
    200,
    origin,
  );
});
