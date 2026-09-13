import { emptyExpansionSave, parseExpansionSave, type ExpansionSave, type LocalExpansionSave } from "../ui/expansionSave";

export type CloudExpansionSave = Readonly<{ revision: number; save: ExpansionSave }>;
export interface ExpansionSaveTransport {
  read(): Promise<CloudExpansionSave | null>;
  write(baseRevision: number, save: ExpansionSave): Promise<Readonly<{ status: "saved" | "conflict"; current: CloudExpansionSave }>>;
}
export type SaveSyncStatus = "offline" | "syncing" | "synced" | "pending" | "conflict" | "error";

/** One instance per account. Disposing prevents stale requests publishing UI/cache state. */
export class ExpansionSaveSync {
  private value: LocalExpansionSave;
  private remote: CloudExpansionSave | null = null;
  private status: SaveSyncStatus;
  private disposed = false;
  private busy = false;
  private generation = 0;
  constructor(private readonly transport: ExpansionSaveTransport | null, initial: LocalExpansionSave | null, private readonly changed: (value: LocalExpansionSave, status: SaveSyncStatus) => void) {
    this.value = initial ?? { revision: 0, dirty: false, save: emptyExpansionSave() };
    this.status = transport ? "pending" : "offline";
  }
  snapshot(): Readonly<{ value: LocalExpansionSave; status: SaveSyncStatus; remote: CloudExpansionSave | null }> { return { value: this.value, status: this.status, remote: this.remote }; }
  dispose(): void { this.disposed = true; }
  update(save: ExpansionSave): void {
    if (this.disposed) return;
    this.value = { ...this.value, save: parseExpansionSave(save), dirty: true };
    this.generation += 1;
    this.publish(this.status === "conflict" ? "conflict" : this.transport ? "pending" : "offline");
  }
  /** Explicit user choice; never silently pick a checkpoint from another device. */
  resolveConflict(choice: "local" | "cloud"): void {
    if (this.disposed || this.status !== "conflict" || !this.remote) return;
    this.value = choice === "cloud"
      ? { ...this.remote, dirty: false }
      : { revision: this.remote.revision, dirty: true, save: this.value.save };
    this.remote = null;
    this.generation += 1;
    this.publish(choice === "cloud" ? "synced" : "pending");
  }
  async sync(): Promise<void> {
    if (!this.transport || this.disposed || this.busy || this.status === "conflict") return;
    this.busy = true;
    this.publish("syncing");
    try {
      const cloud = await this.transport.read();
      if (this.disposed) return;
      if (cloud) {
        const current = validateCloud(cloud);
        if (current.revision < this.value.revision) {
          this.remote = current; this.publish("conflict"); return;
        }
        if (!this.value.dirty || equal(current.save, this.value.save)) {
          this.value = { ...current, dirty: false };
        } else if (current.revision !== this.value.revision) {
          this.remote = current; this.publish("conflict"); return;
        }
      } else if (this.value.revision !== 0) {
        // A remote deletion/reset must not resurrect an old cache automatically.
        this.remote = { revision: 0, save: emptyExpansionSave() };
        this.publish("conflict"); return;
      }
      if (this.value.dirty) {
        const sent = this.value;
        const generation = this.generation;
        const result = await this.transport.write(sent.revision, sent.save);
        if (this.disposed) return;
        const current = validateCloud(result.current);
        if (result.status === "conflict") {
          this.remote = current; this.publish("conflict"); return;
        }
        if (!equal(current.save, sent.save) || current.revision <= sent.revision) throw new Error("Invalid cloud save acknowledgment.");
        this.value = { revision: current.revision, save: this.value.save, dirty: this.generation !== generation };
      }
      this.publish(this.value.dirty ? "pending" : "synced");
    } catch {
      if (!this.disposed) this.publish("error");
    } finally { this.busy = false; }
  }
  private publish(status: SaveSyncStatus): void {
    if (this.disposed) return;
    this.status = status;
    this.changed(this.value, status);
  }
}
function validateCloud(value: CloudExpansionSave): CloudExpansionSave {
  if (!Number.isSafeInteger(value.revision) || value.revision < 1) throw new Error("Invalid cloud save revision.");
  return { revision: value.revision, save: parseExpansionSave(value.save) };
}
function equal(a: ExpansionSave, b: ExpansionSave): boolean { return JSON.stringify(a) === JSON.stringify(b); }
