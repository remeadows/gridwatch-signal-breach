import { accountKit, accountState, currentHandle, onAccountChange, onSaveOwnerChange, saveOwner, signInHref } from "../leaderboard/account";
import { expansionPendingScores } from "../leaderboard/expansionScoreClient";
import { expansionScoreApi } from "../leaderboard/expansionScoreApi";
import type { ExpansionReplayInput } from "../sim/expansion/types";
import type { PendingExpansionScore } from "../leaderboard/expansionPendingScore";
import { createAccountPanel } from "./account";

/** No automatic fetch or submission: every network action requires a button. */
export type ExpansionScoreOffer = { proof: ExpansionReplayInput; owner: string | undefined; staged: boolean };
export function createExpansionLeaderboardPanel(level: number, offer?: ExpansionScoreOffer) {
  const root = document.createElement("section");
  root.tabIndex = -1;
  root.className = "expansion-leaderboard account-panel";
  root.setAttribute("aria-label", `Expansion Level ${level} leaderboard`);
  let disposed = false;
  let busy = false;
  let generation = 0;
  let message = "";
  let submitted = false;
  const ownerAtCreation = saveOwner();
  let observedOwner = ownerAtCreation;
  const proof = offer && !offer.staged && offer.owner === ownerAtCreation ? offer.proof : undefined;
  let replacement: ExpansionReplayInput | undefined;
  if (proof && ownerAtCreation) {
    const existing = expansionPendingScores.read(ownerAtCreation);
    if (existing && JSON.stringify(existing.proof) !== JSON.stringify(proof)) {
      replacement = proof;
      message = `You already have a pending Level ${existing.proof.level} run. Keep it, or explicitly replace it with this clear.`;
    } else if (!expansionPendingScores.stage(proof, ownerAtCreation)) {
      replacement = proof;
      message = "Could not retain this score in browser storage. Keep this page open and retry.";
    } else if (offer) offer.staged = true;
  }
  const pending = (): PendingExpansionScore | null => {
    const owner = saveOwner();
    const own = owner ? expansionPendingScores.read(owner) : null;
    if (own?.proof.level === level) return own;
    const guest = expansionPendingScores.read("guest");
    return guest?.proof.level === level ? guest : null;
  };
  const status = document.createElement("p"); status.setAttribute("role", "status");
  const actions = document.createElement("div"); actions.className = "account-actions";
  const list = document.createElement("div"); list.setAttribute("aria-live", "polite");
  root.append(status, actions, list);
  function render() {
    if (disposed) return;
    const focused = document.activeElement;
    const restoreFocus = focused instanceof HTMLElement && actions.contains(focused);
    const focusedLabel = restoreFocus ? focused.textContent : null;
    actions.replaceChildren();
    status.textContent = message || (expansionScoreApi.enabled
      ? `Level ${level} rankings only. Scores are verified by replay; no campaign totals are mixed in.`
      : "Leaderboard disabled in this build. Gameplay and local saves remain available; no score is sent.");
    actions.append(button("VIEW LEVEL RANKINGS", async () => {
      const mine = generation;
      list.textContent = "Loading rankings…";
      const result = await expansionScoreApi.read(level);
      if (disposed || mine !== generation) return;
      list.replaceChildren();
      if (!result.ok) { list.textContent = result.error; return; }
      if (!result.entries.length) { list.textContent = "No verified clears yet for this level."; return; }
      const table = document.createElement("table"); table.className = "leaderboard-table";
      const caption = document.createElement("caption"); caption.textContent = `Level ${level} · Top 20`;
      const head = document.createElement("thead"); head.innerHTML = "<tr><th>Rank</th><th>Operator</th><th>Score</th></tr>";
      const body = document.createElement("tbody");
      for (const entry of result.entries) {
        const row = document.createElement("tr");
        for (const value of [entry.rank, entry.handle, entry.score]) { const td = document.createElement("td"); td.textContent = String(value); row.append(td); }
        body.append(row);
      }
      table.append(caption, head, body); list.append(table);
    }));
    if (replacement && saveOwner() === ownerAtCreation) {
      actions.append(button("KEEP THIS CLEAR FOR SUBMISSION", async () => {
        if (replacement && ownerAtCreation && saveOwner() === ownerAtCreation && expansionPendingScores.stage(replacement, ownerAtCreation)) {
          if (offer) offer.staged = true;
          replacement = undefined;
          message = "This clear is retained for explicit submission; the previous pending run was replaced.";
        } else message = "Could not retain this run. Check browser storage and retry.";
      }));
    }
    const run = pending();
    if (!submitted && run && accountState() === "needs-handle") {
      actions.append(createAccountPanel({ mode: "manage" }));
    } else if (!submitted && run && accountState() === "ready") {
      const submit = button(`SUBMIT AS ${currentHandle() ?? "OPERATOR"}`, async () => {
        const mine = generation;
        message = "Verifying score…"; render();
        const result = await expansionPendingScores.submit(run);
        if (disposed || mine !== generation) return;
        submitted = result.ok;
        message = result.ok ? verifiedMessage(result) : result.error;
        render();
      });
      submit.disabled = busy || !expansionScoreApi.enabled;
      actions.append(submit);
    } else if (!submitted && run && accountState() === "signed-out") {
      const link = document.createElement("a"); link.className = "neon-button neon-button-secondary";
      const onNexus = window.location.origin === accountKit.config.nexusOrigin;
      link.href = onNexus ? signInHref() : accountKit.config.nexusOrigin + "/play/breach/";
      link.textContent = onNexus ? "SIGN IN TO SUBMIT" : "PLAY ON NEXUS TO SUBMIT";
      actions.append(link);
      const note = document.createElement("p");
      note.textContent = onNexus ? "Your pending run stays here. After sign-in, explicitly confirm submission under your handle." : "Browser storage cannot transfer this local run to Nexus. Sign in there before playing a ranked run.";
      actions.append(note);
    }
    if (restoreFocus) {
      const match = [...actions.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled)")].find((item) => item.textContent === focusedLabel);
      (match ?? root).focus();
    }
  }
  function button(label: string, action: () => Promise<void>): HTMLButtonElement {
    const button = document.createElement("button"); button.type = "button"; button.className = "neon-button neon-button-secondary"; button.textContent = label; button.disabled = busy;
    button.addEventListener("click", () => {
      if (busy) return;
      busy = true; render();
      void action().catch(() => { message = "Action failed. Your pending run was retained; retry when ready."; }).finally(() => {
        busy = false;
        if (!disposed) {
          render();
          // Rebuilding the action row removes the clicked button. Restore its
          // focus only if the player has not moved to another control meanwhile.
          if (document.activeElement === document.body || document.activeElement === root) {
            [...actions.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent === label)?.focus();
          }
        }
      });
    });
    return button;
  }
  const changed = () => {
    const owner = saveOwner();
    if (owner !== observedOwner) {
      observedOwner = owner;
      generation++; message = ""; submitted = false; list.replaceChildren();
    }
    // Token/profile refreshes update controls without discarding this owner's
    // in-flight response or verified confirmation. Only an identity change fences it.
    render();
  };
  const unsubAccount = onAccountChange(changed);
  const unsubOwner = onSaveOwnerChange(changed);
  function dispose() { disposed = true; generation++; unsubAccount(); unsubOwner(); observer.disconnect(); }
  const observer = new MutationObserver(() => { if (!root.isConnected) dispose(); });
  observer.observe(document.body, { childList: true, subtree: true });
  render();
  return { element: root, dispose };
}

// Null best/rank (read-back unavailable after a committed write) are left out, never "#null".
function verifiedMessage(result: { runScore: number; bestScore: number | null; levelRank: number | null }): string {
  return [
    `Verified ${result.runScore}`,
    result.bestScore !== null ? `Best ${result.bestScore}` : null,
    result.levelRank !== null ? `Level rank #${result.levelRank}` : "Level rank updating",
  ].filter((part) => part !== null).join(" · ");
}

/** Nexus sign-in returns to the game root; offer an explicit pending submission. */
export function mountExpansionPendingScoreNotice(): void {
  if (!expansionScoreApi.enabled) return;
  let current: ReturnType<typeof createExpansionLeaderboardPanel> | null = null;
  let ownerKey = "";
  const host = document.createElement("aside"); host.className = "expansion-pending-score"; host.hidden = true; document.body.append(host);
  function refresh() {
    const owner = saveOwner();
    if (!owner || owner === "guest") { current?.dispose(); current = null; host.hidden = true; ownerKey = ""; return; }
    const pending = expansionPendingScores.read(owner) ?? expansionPendingScores.read("guest");
    const nextKey = `${owner}:${pending ? JSON.stringify(pending.proof) : "none"}`;
    if (nextKey === ownerKey) return;
    ownerKey = nextKey; current?.dispose(); current = null; host.replaceChildren(); host.hidden = !pending;
    if (!pending) return;
    const title = document.createElement("h2"); title.textContent = `Pending expansion score · Level ${pending.proof.level}`;
    const close = document.createElement("button"); close.type = "button"; close.className = "neon-button neon-button-secondary"; close.textContent = "CLOSE";
    close.addEventListener("click", () => { host.hidden = true; current?.dispose(); });
    current = createExpansionLeaderboardPanel(pending.proof.level);
    host.append(title, current.element, close);
  }
  onAccountChange(refresh); onSaveOwnerChange(refresh); refresh();
}
