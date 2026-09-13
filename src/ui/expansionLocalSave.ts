import { emptyExpansionSave, expansionSaveKey, parseExpansionSave, readLocalExpansionSave, writeLocalExpansionSave, type ExpansionSave, type LocalExpansionSave } from "./expansionSave";
import type { ProgressStorage } from "./progress";

export type LocalSaveStatus = "ready" | "saved" | "unavailable" | "conflict" | "invalid" | "checkpoint-error";

/** Browser-only adapter. It never authenticates, uploads or silently imports guest data into an account. */
export class ExpansionLocalSave {
  private value: LocalExpansionSave;
  private expectedRaw: string | null | undefined;
  private currentStatus: LocalSaveStatus = "ready";
  private readonly key: string;

  constructor(private readonly storage: ProgressStorage | null, private readonly owner: string, guestClears: readonly number[] = []) {
    this.key = expansionSaveKey(owner);
    try {
      if (!storage) throw new Error("Storage unavailable");
      this.expectedRaw = storage.getItem(this.key);
    } catch { this.currentStatus = "unavailable"; }
    // Parse the exact bytes read above, so our stale-write guard and initial value agree.
    const initial = readLocalExpansionSave({ getItem: () => this.expectedRaw ?? null, setItem: () => {} }, owner);
    if (this.expectedRaw !== null && this.expectedRaw !== undefined && !initial) this.currentStatus = "invalid";
    this.value = initial ?? { revision: 0, dirty: false, save: parseExpansionSave({ ...emptyExpansionSave(), clearedLevels: owner === "guest" ? guestClears : [] }) };
    if (initial) this.currentStatus = "saved";
  }

  get save(): ExpansionSave { return this.value.save; }
  get status(): LocalSaveStatus { return this.currentStatus; }

  clearLevel(levelId: number): boolean {
    const clearedLevels = this.save.clearedLevels.includes(levelId)
      ? this.save.clearedLevels : [...this.save.clearedLevels, levelId];
    return this.update({ ...this.save, clearedLevels, checkpoint: null });
  }

  update(save: ExpansionSave): boolean {
    if (this.currentStatus === "invalid" || this.currentStatus === "conflict") return false;
    try {
      this.value = { ...this.value, dirty: true, save: parseExpansionSave(save) };
    } catch { this.currentStatus = "checkpoint-error"; return false; }
    try {
      if (!this.storage) throw new Error("Storage unavailable");
      const current = this.storage.getItem(this.key);
      if (current !== (this.expectedRaw ?? null)) {
        // Best-effort stale-tab detection, not a cross-tab atomic transaction.
        // Cloud writes use the separately tested server revision/CAS boundary.
        this.currentStatus = "conflict";
        return false;
      }
      if (!writeLocalExpansionSave(this.storage, this.owner, this.value)) throw new Error("Storage write failed");
      // Track our canonical bytes, not a post-write read that could already
      // contain another tab's update. Never adopt those bytes without its data.
      this.expectedRaw = JSON.stringify(this.value);
      this.currentStatus = "saved";
      return true;
    } catch { this.currentStatus = "unavailable"; return false; }
  }

  /** Only a deliberate UI choice may replace a malformed stored save. */
  discardUnreadable(): boolean {
    if (this.currentStatus !== "invalid") return false;
    this.currentStatus = "ready";
    return this.update(this.value.save);
  }
}
