import { createSavesClient, createSaveStateStore, createTransport, getSupabase, type SavesClient, type PromptHost } from "@gridwatch/account-kit";
import { resolveSaveGame } from "@gridwatch/account-kit/saves-schema";
import { accountKit, saveOwner } from "./account";
import { accountNetworkingEnabled, GAME_SLUG } from "./config";
import { ExpansionAccountSave } from "./expansionAccountSave";
import { ExpansionLocalSave } from "../ui/expansionLocalSave";
import { EXPANSION_SAVE_SLOT } from "../ui/expansionSave";

/** Use the shared kit transport/CAS/prompts, but bind its lifetime to one account.
 * The kit's global ownership hint describes a single unpartitioned local save;
 * our caches are already partitioned, so their own revision/dirty envelope is
 * authoritative. Keep this instance's sync bookkeeping in memory and persist
 * confirmations with the payload through ExpansionLocalSave, atomically. */
export function createExpansionCloudSave(local: ExpansionLocalSave, owner: string, onAdopt: () => void, prompt: PromptHost): ExpansionAccountSave {
  if (!accountNetworkingEnabled || owner === "guest") throw new Error("Cloud saves require an account.");
  const registered = resolveSaveGame("breach");
  if (!registered || registered.slug !== GAME_SLUG || !registered.slots.includes(EXPANSION_SAVE_SLOT)) throw new Error("Breach save schema is unavailable.");
  let active = true;
  let record = { revision: local.revision, dirty: local.dirty };
  let storage: Storage | null = null;
  try { storage = window.localStorage; } catch { /* In-memory fallback. */ }
  const sharedState = createSaveStateStore(GAME_SLUG, storage);
  const sameOwner = () => active && saveOwner() === owner;
  const client = createSavesClient({
    game: { gameSlug: registered.slug, routeAlias: "breach", slots: registered.slots, schemaVersion: registered.schemaVersion },
    getSession: async () => {
      if (!sameOwner()) return null;
      const session = await accountKit.getSession();
      return sameOwner() && session?.user.id === owner ? session : null;
    },
    refreshSession: async () => {
      if (!sameOwner()) return null;
      try {
        const { data, error } = await getSupabase().auth.refreshSession();
        return !error && sameOwner() && data.session?.user.id === owner ? data.session : null;
      } catch { return null; }
    },
    state: {
      readRecord: (user) => user === owner ? record : null,
      writeRecord: (user, _slot, next) => { if (active && user === owner) record = next; },
      readOwner: () => owner,
      writeOwner: () => {}, // The local key, not a cross-account hint, owns this save.
      deviceId: () => sharedState.deviceId(),
    },
    transport: createTransport(`${accountKit.config.nexusOrigin}/api/saves/breach`),
    prompt,
    onBackgroundStored: (slot, payload, revision, user) => { if (sameOwner()) adapter.backgroundStored(slot, payload, revision, user); },
  });
  const bound: SavesClient = { ...client, dispose: () => { active = false; client.dispose(); } };
  const adapter = new ExpansionAccountSave(local, owner, bound, onAdopt);
  return adapter;
}
