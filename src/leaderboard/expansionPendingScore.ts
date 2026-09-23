import type { ExpansionReplayInput } from "../sim/expansion/types";
import { canonicalExpansionScoreReplay, MAX_EXPANSION_SCORE_BYTES } from "./expansionScoreProtocol";
import type { ExpansionSubmitResult } from "./expansionScoreApi";

type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type PendingExpansionScore = { owner: string; proof: ExpansionReplayInput };
const key = (owner: string) => `gridwatch.expansion.pendingScore.r4:${encodeURIComponent(owner)}`;
export class ExpansionPendingScores {
  private generation = 0;
  private inFlight = false;
  constructor(private readonly storage: StoragePort | null, private readonly deps: {
    owner(): string | undefined;
    session(): Promise<{ user: { id: string }; access_token: string } | null>;
    submit(proof: ExpansionReplayInput, token: string): Promise<ExpansionSubmitResult>;
  }) {}
  invalidate(): void { this.generation++; }
  read(owner: string): PendingExpansionScore | null {
    try {
      const raw = this.storage?.getItem(key(owner));
      if (!raw || raw.length > MAX_EXPANSION_SCORE_BYTES + 1024) return null;
      const parsed = JSON.parse(raw);
      if (parsed.owner !== owner) return null;
      return { owner, proof: canonicalExpansionScoreReplay(parsed.proof) };
    } catch { return null; }
  }
  stage(proof: ExpansionReplayInput, owner: string): boolean {
    try {
      const canonical = canonicalExpansionScoreReplay(proof);
      if (new TextEncoder().encode(JSON.stringify(canonical)).length > MAX_EXPANSION_SCORE_BYTES || !this.storage) return false;
      this.storage.setItem(key(owner), JSON.stringify({ owner, proof: canonical }));
      return true;
    } catch { return false; }
  }
  /** Guest claiming happens only on an explicit Submit-as-current-account click. */
  async submit(pending: PendingExpansionScore): Promise<ExpansionSubmitResult> {
    const owner = this.deps.owner();
    if (!owner || owner === "guest" || (pending.owner !== "guest" && pending.owner !== owner)) return { ok: false, error: "Sign in with the account that owns this run." };
    if (this.inFlight) return { ok: false, error: "A score submission is already in progress." };
    const generation = this.generation;
    this.inFlight = true;
    const valid = () => this.generation === generation && this.deps.owner() === owner;
    try {
      const session = await this.deps.session();
      if (!valid() || session?.user.id !== owner) return { ok: false, error: "Account changed. Review the run before submitting again." };
      const source = this.read(pending.owner);
      if (!source || JSON.stringify(source.proof) !== JSON.stringify(pending.proof)) return { ok: false, error: "The pending run changed in another tab. Reload before submitting." };
      // Claim durably before the request. A failed/retried guest submission can
      // no longer be offered to a different account after this explicit choice.
      if (pending.owner === "guest") {
        const accountRun = this.read(owner);
        if (accountRun && JSON.stringify(accountRun.proof) !== JSON.stringify(pending.proof)) return { ok: false, error: "Submit your account's existing pending run first." };
        if (!this.stage(pending.proof, owner)) return { ok: false, error: "Could not preserve this pending score. Enable browser storage and retry." };
      }
      const claimed = this.storage?.getItem(key(owner));
      if (pending.owner === "guest") this.removeIfMatching("guest", pending.proof);
      const result = await this.deps.submit(pending.proof, session.access_token);
      if (!valid()) return { ok: false, error: "Account changed. Submission result belongs to the previous account." };
      if (result.ok && this.storage?.getItem(key(owner)) === claimed) this.storage?.removeItem(key(owner));
      return result;
    } catch { return { ok: false, error: "Score not confirmed. Your pending run is retained for retry." }; }
    finally { this.inFlight = false; }
  }
  private removeIfMatching(owner: string, proof: ExpansionReplayInput): void {
    const current = this.read(owner);
    if (current && JSON.stringify(current.proof) === JSON.stringify(proof)) this.storage?.removeItem(key(owner));
  }
}
