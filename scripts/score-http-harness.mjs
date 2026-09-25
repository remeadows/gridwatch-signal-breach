import { build } from "esbuild";

// Loads the real submit-gridwatch-score HTTP entrypoint (index.ts) under Node with isolated
// Auth/DB ports. No Deno deployment, network call or production score write is involved:
// jsr:@supabase/supabase-js is replaced by a stub client and any https: import by a stub.

export const OWNER_ID = "authenticated-owner";
export const BOARD_IDS = {
  campaign: "00000000-0000-4000-8000-0000000000c2",
  expansion: "00000000-0000-4000-8000-0000000000e4",
};
export const REGISTRY = [
  { id: BOARD_IDS.campaign, game_slug: "gridwatch-signal-breach", key: "campaign", ruleset: "r2", status: "active" },
  { id: BOARD_IDS.expansion, game_slug: "gridwatch-signal-breach", key: "expansion", ruleset: "r4", status: "active" },
];

/* A registry-shaped RPC port: list_boards, submit_score (ok, improved, total = submitted
   score), get_board_entry (the caller at rank 1 with the last submitted score) and
   get_my_standing. `overrides[name](args, role)` replaces any one of them. */
export function boardRpc(overrides = {}) {
  let last = 0;
  return (name, args, role) => {
    if (name === "submit_score") last = args.p_entries[0].score;
    if (Object.prototype.hasOwnProperty.call(overrides, name)) return overrides[name](args, role);
    if (name === "list_boards") return { data: REGISTRY, error: null };
    if (name === "submit_score") return { data: { status: "ok", improved: true, total: last }, error: null };
    if (name === "get_board_entry") {
      return { data: [{ rank: 1, display_name: "Tester", score: last, achieved_at: "2026-09-25T12:00:00Z", is_you: true }], error: null };
    }
    if (name === "get_my_standing") return { data: [{ rank: 1, total: last, field: 1 }], error: null };
    return { data: null, error: { message: `unexpected rpc ${name}` } };
  };
}

let loads = 0;

export async function loadScoreHandler(rpc = boardRpc()) {
  const state = { authorized: true, handle: "Tester", profileError: null, rpc, calls: [], handler: null };
  globalThis.__scoreTestClient = (_url, _key, options) => {
    // The per-request user client carries the caller's bearer token; the admin client doesn't.
    const role = options?.global?.headers?.Authorization ? "user" : "admin";
    return {
      auth: {
        getUser: async () => state.authorized
          ? { data: { user: { id: OWNER_ID } }, error: null }
          : { data: { user: null }, error: "expired" },
      },
      from: (table) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => {
              state.calls.push({ role, table });
              return { data: table === "profiles" && state.handle ? { handle: state.handle } : null, error: state.profileError };
            },
          }),
        }),
      }),
      rpc: async (name, args) => {
        state.calls.push({ role, name, args });
        return state.rpc(name, args, role);
      },
    };
  };
  globalThis.Deno = { env: { get: () => "isolated-test-value" }, serve: (fn) => { state.handler = fn; } };
  const result = await build({
    entryPoints: ["supabase/functions/submit-gridwatch-score/index.ts"], bundle: true, write: false, format: "esm", platform: "node",
    plugins: [{ name: "isolated-auth-and-remote", setup(builder) {
      builder.onResolve({ filter: /^jsr:/ }, () => ({ path: "auth", namespace: "test" }));
      builder.onResolve({ filter: /^https:/ }, () => ({ path: "remote", namespace: "test" }));
      builder.onLoad({ filter: /.*/, namespace: "test" }, ({ path }) => ({ loader: "js", contents: path === "auth"
        ? "export const createClient = (...args) => globalThis.__scoreTestClient(...args);"
        : "export class ReplayError extends Error {} export function replayRun() { throw new ReplayError('Remote import not exercised in HTTP harness'); }" }));
    } }],
  });
  // A unique suffix gives every load its own module instance (and its own board-id cache).
  const source = `${result.outputFiles[0].text}\n// harness load ${++loads}\n`;
  await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const request = (body, headers = { Authorization: "Bearer isolated-token" }) => new Request("https://isolated.invalid/submit", {
    method: "POST",
    headers: { Origin: "https://nexus.warsignallabs.net", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return {
    state,
    request,
    send: (body, headers) => state.handler(request(body, headers)),
    rpcCalls: (name) => state.calls.filter((c) => c.name === name),
    close() { delete globalThis.Deno; delete globalThis.__scoreTestClient; },
  };
}
