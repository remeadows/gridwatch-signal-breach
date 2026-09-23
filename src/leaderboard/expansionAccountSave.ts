import type { SavesClient, ReconcileResult, StoreResult } from "@gridwatch/account-kit";
import type { SavePayload } from "@gridwatch/account-kit/saves-schema";
import { ExpansionLocalSave } from "../ui/expansionLocalSave";
import { emptyExpansionSave, EXPANSION_SAVE_SLOT, type ExpansionSave } from "../ui/expansionSave";
import { decodeExpansionSave, encodeExpansionSave } from "./expansionSaveCodec";

export type ExpansionCloudStatus = "guest" | "checking" | "syncing" | "synced" | "pending" | "error" | "blocked";

/** One immutable owner per instance. Dispose before changing accounts. Never pass a guest cache. */
export class ExpansionAccountSave {
  private disposed = false;
  private reconciled = false;
  private cloudBlocked = false;
  private operation: Promise<void> | null = null;
  cloudStatus: ExpansionCloudStatus = "pending";

  constructor(readonly local: ExpansionLocalSave, readonly owner: string, private readonly client: SavesClient,
    private readonly adopted: () => void = () => {}) {
    if (owner === "guest" || local.owner !== owner) throw new Error("Cloud save owner must match the account cache.");
  }
  get save(): ExpansionSave { return this.local.save; }
  get status() { return this.local.status; }
  get busy(): boolean { return this.operation !== null; }
  settled(): Promise<void> { return this.operation ?? Promise.resolve(); }
  dispose(): void { this.disposed = true; this.client.dispose(); }

  clearLevel(level: number): boolean {
    return this.update({ ...this.save, clearedLevels: [...new Set([...this.save.clearedLevels, level])], checkpoint: null });
  }
  update(save: ExpansionSave): boolean {
    if (this.disposed) return false;
    const saved = this.local.update(save);
    if (saved && this.reconciled && !this.busy) this.start(false);
    else if (this.cloudStatus === "synced") this.cloudStatus = "pending";
    return saved;
  }
  discardUnreadable(): boolean {
    const saved = this.local.discardUnreadable();
    if (saved) void this.retry();
    return saved;
  }
  retry(): Promise<void> {
    if (this.disposed || this.cloudBlocked || this.busy || this.status === "invalid" || this.status === "conflict") return this.settled();
    this.start(true);
    return this.settled();
  }
  backgroundStored(slot: string, payload: SavePayload, revision: number, owner: string): void {
    if (this.disposed || this.cloudBlocked || owner !== this.owner || slot !== EXPANSION_SAVE_SLOT) return;
    try {
      const sent = decodeExpansionSave(payload);
      if (this.local.acknowledge(revision, sent)) this.cloudStatus = this.local.dirty ? "pending" : "synced";
    } catch { this.cloudStatus = "error"; }
  }
  private start(reconcile: boolean): void {
    this.cloudStatus = reconcile ? "checking" : "syncing";
    // Set the operation before invoking the async work so callbacks cannot start a second write.
    this.operation = Promise.resolve().then(() => this.perform(reconcile)).finally(() => { this.operation = null; });
  }
  private async perform(reconcile: boolean): Promise<void> {
    if (this.disposed) return;
    let sent = this.save;
    try {
      const payload = this.local.hasSave ? encodeExpansionSave(sent) : null;
      const result = reconcile
        ? await this.client.reconcile(EXPANSION_SAVE_SLOT, payload, { localChanged: this.local.dirty,
          current: () => { sent = this.save; return this.local.hasSave ? encodeExpansionSave(sent) : null; } })
        : await this.client.store(EXPANSION_SAVE_SLOT, encodeExpansionSave(sent));
      if (this.disposed) return;
      this.accept(result, sent);
    } catch { if (!this.disposed) { this.reconciled = false; this.cloudStatus = "error"; } }
  }
  private accept(result: ReconcileResult | StoreResult, sent: ExpansionSave): void {
    if (result.status === "error" || result.status === "signed_out") {
      // Includes kit's "discarded" result: never report it as a successful upload.
      this.reconciled = false;
      this.cloudStatus = "error";
      return;
    }
    if (result.status === "use_cloud" || result.status === "fresh") {
      let value: ExpansionSave;
      try { value = result.status === "fresh" ? emptyExpansionSave() : decodeExpansionSave(result.save.payload); }
      catch { this.blockCloud(); return; }
      const revision = result.status === "fresh" ? 0 : result.save.revision;
      if (!this.local.adopt(value, revision)) { this.blockCloud(); return; }
      this.adopted();
    } else if (result.status === "stored" || result.status === "uploaded") {
      if (!this.local.acknowledge(result.revision, sent)) { this.reconciled = false; this.cloudStatus = "error"; return; }
    }
    this.reconciled = true;
    this.cloudStatus = this.local.dirty ? "pending" : "synced";
  }
  private blockCloud(): void {
    // The kit already confirmed the selected cloud revision. If local adoption
    // fails, reusing that clean record could call the old local copy "current"
    // and overwrite the chosen cloud copy later. A reload must reseed the kit
    // from the still-truthful durable local envelope before it may write again.
    this.cloudBlocked = true;
    this.reconciled = false;
    this.cloudStatus = "blocked";
    this.client.dispose();
  }
}
