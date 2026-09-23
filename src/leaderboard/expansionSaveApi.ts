// Historical standalone-RPC prototype, exercised only by isolated tests.
// Production uses expansionAccountSave/expansionCloudClient and the Nexus kit.
// Never deploy the prototype RPC fixture or wire this transport into the game.
import { parseExpansionSave, type ExpansionSave } from "../ui/expansionSave";
import type { CloudExpansionSave, ExpansionSaveTransport } from "./expansionSaveSync";

/** Capture this account's token. Never reuse a transport after an auth change. */
export function createExpansionSaveTransport(
  config: Readonly<{ enabled: boolean; url: string; anonKey: string }>,
  accessToken: string,
  request: typeof fetch = fetch,
): ExpansionSaveTransport | null {
  if (!config.enabled || !accessToken) return null;
  async function rpc(name: string, body: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await request(`${config.url}/rest/v1/rpc/${name}`, {
        method: "POST", signal: controller.signal,
        headers: { "Content-Type": "application/json", apikey: config.anonKey, Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`Cloud save request failed (${response.status}).`);
      return await response.json();
    } finally { clearTimeout(timer); }
  }
  return {
    async read() {
      const result = await rpc("get_signal_breach_expansion_save", {});
      return result === null ? null : parseCloud(result);
    },
    async write(baseRevision: number, save: ExpansionSave) {
      if (!Number.isSafeInteger(baseRevision) || baseRevision < 0) throw new Error("Invalid save revision.");
      const result = await rpc("put_signal_breach_expansion_save", { p_base_revision: baseRevision, p_payload: parseExpansionSave(save) });
      if (!record(result) || (result.status !== "saved" && result.status !== "conflict")) throw new Error("Invalid cloud save response.");
      return { status: result.status, current: parseCloud(result.current) };
    },
  };
}
function parseCloud(value: unknown): CloudExpansionSave {
  if (!record(value) || !Number.isSafeInteger(value.revision) || (value.revision as number) < 1) throw new Error("Invalid cloud save revision.");
  return { revision: value.revision as number, save: parseExpansionSave(value.save) };
}
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
