// Server-side score validator for "GridWatch: Signal Breach".
//
// Anti-cheat: the game simulation is pure and deterministic, so this function
// REPLAYS the submitted run with the exact game code (bundled from src/sim) and
// stores the score IT computes. The number a client claims is never trusted.
//
// Identity: the caller must be signed in (Supabase Auth). The score is attributed
// to their user id and displayed under the handle from their profile.
//
// Storage: one service-role submit_score call per accepted run on the shared board
// registry (Nexus spec 2026-09-24 §2): cleared V2 sectors → campaign / r2 entry
// `sector:<n>`, expansion wins → expansion / r4 entry `level:<n>`. The database
// keeps each entry's best and sums the campaign total. Lost and legacy-ruleset runs
// are answered "not recorded" and write nothing.
//
// verify_jwt is intentionally false so this function can handle the CORS preflight
// itself; the user's token is validated manually below.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { replayRun, ReplayError, SIM_RULESET_ID } from "./sim.bundle.js";
import {
  EXPANSION_RULESET_ID,
  ReplayValidationError,
  assertNoExpansionReplayIdentity,
  canonicalizeCommands,
  resolveRuleset,
  type CanonicalCommand,
  type ResolvedRuleset,
} from "./replayValidation.ts";
import { handleExpansionScore } from "./expansionScoreHandler.ts";
import { readReplayBody } from "./requestBody.ts";
import {
  CAMPAIGN_BOARD,
  campaignMeta,
  notRecordedReply,
  sectorEntryKey,
  submitArgs,
  submitOutcome,
} from "./scoreBoard.ts";
import {
  campaignReply,
  createBoardIdCache,
  readCampaignPlacement,
  readExpansionPlacement,
  type Rpc,
} from "./scorePlacement.ts";

const MAX_COMMANDS = 5000;
const MAX_SCORE = 100000;
const VALID_SECTORS = new Set([1, 2, 3]);

const ALLOWED_ORIGINS = new Set([
  "https://nexus.warsignallabs.net",
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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Board ids from list_boards, cached per isolate once found (never on failure).
const boardIds = createBoardIdCache();

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
  // Read-back after a write runs as the player, so is_you / get_my_standing resolve to them.
  const userRpc: Rpc = (fn, args) => userClient.rpc(fn, args);

  let payload: Record<string, unknown>;
  try {
    payload = await readReplayBody(req) as Record<string, unknown>;
  } catch (error) {
    const oversized = error instanceof Error && error.message === "Replay body too large.";
    return json({ ok: false, error: oversized ? "Replay body too large." : "Invalid JSON body." }, oversized ? 413 : 400, origin);
  }

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return json({ ok: false, error: "Invalid replay payload." }, 400, origin);
  }

  // A separate frozen r4 validator and board. Always return here: expansion must
  // never write the campaign board below.
  if (payload.ruleset === EXPANSION_RULESET_ID) {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const result = await handleExpansionScore(payload, user.id, {
      profile: async (userId) => {
        const { data, error } = await admin.from("profiles").select("handle").eq("user_id", userId).maybeSingle();
        return { handle: data?.handle ?? null, error: Boolean(error) };
      },
      submit: async (args) => {
        const { data, error } = await admin.rpc("submit_score", args);
        if (error) console.error("[score] submit_score call failed:", error);
        return error ? null : data;
      },
      placement: (level) => readExpansionPlacement(userRpc, boardIds, level),
    });
    if (result.log) console.error(`[score] ${result.log}`);
    return json(result.body, result.status, origin);
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
    assertNoExpansionReplayIdentity(payload);
    canonicalCommands = canonicalizeCommands(commands, MAX_COMMANDS);
  } catch (err) {
    if (err instanceof ReplayValidationError) {
      return json({ ok: false, error: err.message }, 400, origin);
    }
    return json({ ok: false, error: "Invalid replay payload." }, 400, origin);
  }

  // Pre-phase-4 (legacy-v1) runs belong to no board: the campaign board is r2 and scores
  // only current-ruleset clears. Answer before replaying anything; nothing is written.
  if (ruleset.legacy) {
    return json(notRecordedReply("retired-ruleset", null, null), 200, origin);
  }

  let score: number;
  let rating: string;
  let phase: string;
  try {
    const result = replayRun({ seed, sector, commands: canonicalCommands });
    score = result.score.total;
    rating = result.score.rating;
    phase = result.state.phase;
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
  // The campaign board counts cleared sectors only (spec §5): a lost run is not recorded.
  if (phase === "lost") {
    return json(notRecordedReply("not-cleared", score, rating), 200, origin);
  }

  const proof = { ruleset: ruleset.id, seed, sector, commands: canonicalCommands };
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

  // One write: the database keeps the sector best improve-only and re-sums the campaign
  // total for `all` and the ISO week of achieved_at.
  const { data: submitted, error: submitError } = await admin.rpc("submit_score", submitArgs({
    userId: user.id,
    board: CAMPAIGN_BOARD,
    entryKey: sectorEntryKey(sector),
    score,
    proofHash,
    achievedAt: new Date(),
    meta: campaignMeta({ ruleset: ruleset.id, sector, seed, commandCount: canonicalCommands.length, rating }),
  }));
  if (submitError) {
    console.error("[score] submit_score call failed:", submitError);
    return json({ ok: false, error: "Could not save score." }, 500, origin);
  }
  const outcome = submitOutcome(submitted, CAMPAIGN_BOARD);
  if (outcome.kind === "rejected") {
    if (outcome.log) console.error(`[score] ${outcome.log}`);
    return json({ ok: false, error: outcome.error }, outcome.status, origin);
  }

  const placement = await readCampaignPlacement(userRpc, boardIds, sector);
  return json(
    campaignReply({ outcome, placement, runScore: score, ruleset: ruleset.id, rating, handle: profile.handle }),
    200,
    origin,
  );
});
