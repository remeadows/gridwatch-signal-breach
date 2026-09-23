import type { ExpansionAccountSave } from "../leaderboard/expansionAccountSave";

/** UI-only status. The caller owns progress refresh and account lifetimes. */
export function renderExpansionNavigationSaveStatus(root: HTMLElement, owner: string | undefined,
  saves: ExpansionAccountSave | null, onRetry: () => void): void {
  const panel = root.querySelector<HTMLElement>(".navigation-select-panel");
  if (!panel) return;
  let status = panel.querySelector<HTMLElement>("[data-expansion-sync]");
  if (!status) {
    status = document.createElement("section");
    status.dataset.expansionSync = "";
    const message = document.createElement("p");
    message.setAttribute("role", "status");
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "neon-button neon-button-secondary";
    retry.textContent = "RETRY CLOUD SYNC";
    retry.addEventListener("click", onRetry);
    status.append(message, retry);
    panel.querySelector(".navigation-grid")?.before(status);
  }
  const cloud = saves?.cloudStatus;
  const message = status.querySelector("p")!;
  const text = owner === undefined ? "Checking account…"
    : owner === "guest" ? "Guest progress stays in this browser. Sign in for a separate account cloud save."
    : !saves ? "Showing this account’s browser progress. Cloud initialization failed; reload to retry."
    : cloud === "synced" ? "Account cloud save up to date."
    : cloud === "checking" || cloud === "syncing" ? "Checking this account’s cloud save…"
    : cloud === "blocked" ? "Cloud restore could not be applied safely. Local data kept; cloud writes stopped. Reload before retrying."
    : saves.status === "invalid" ? "This account’s browser save could not load. Open a level to choose whether to discard it."
    : saves.status === "conflict" ? "Another tab changed this account’s save. Reload to use the saved data."
    : "Showing this account’s browser progress. Cloud sync not confirmed; retry when online.";
  if (message.textContent !== text) message.textContent = text;
  status.querySelector<HTMLButtonElement>("button")!.hidden = !saves || !["error", "pending"].includes(cloud ?? "") || ["invalid", "conflict"].includes(saves.status);
}
