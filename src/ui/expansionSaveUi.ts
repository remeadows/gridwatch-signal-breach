import type { ExpansionLocalSave } from "./expansionLocalSave";
import type { ExpansionAccountSave, ExpansionCloudStatus } from "../leaderboard/expansionAccountSave";
import { nextDialogFocusIndex } from "./dialogFocus";

type SaveUiOptions = Readonly<{
  readonly saves: ExpansionLocalSave | ExpansionAccountSave;
  cloudStatus?: () => ExpansionCloudStatus;
  isBusy?: () => boolean;
  onRetry?: () => void;
  syncDeferred?: () => boolean;
  levelId: number;
  hud: HTMLElement;
  overlay: HTMLElement;
  canvas: HTMLCanvasElement;
  background: readonly HTMLElement[];
  onResume: () => void;
  onStartNew: () => void;
  onLevelSelect: () => void;
}>;

/** Save presentation only; run changes and persistence remain caller-owned. */
export class ExpansionSaveUi {
  private open: boolean;
  private readonly status: HTMLParagraphElement;
  private readonly reload: HTMLButtonElement;
  private readonly retry: HTMLButtonElement;
  private wasBusy = false;

  constructor(private readonly options: SaveUiOptions) {
    this.open = options.saves.save.checkpoint !== null || options.saves.status === "invalid";
    this.status = document.createElement("p");
    this.status.className = "expansion-save-status";
    this.status.dataset.saveStatus = "";
    this.status.setAttribute("role", "status");
    this.reload = action("RELOAD SAVED DATA", () => window.location.reload());
    this.reload.dataset.reloadSave = "";
    this.reload.hidden = true;
    this.retry = action("RETRY CLOUD SYNC", () => options.onRetry?.());
    this.retry.hidden = true;
    options.hud.append(this.status, this.reload, this.retry);
    // Reserve actual message height so long errors do not hide mobile build tools.
    const observer = new ResizeObserver(() => {
      const height = Math.ceil(this.status.getBoundingClientRect().height + this.reload.getBoundingClientRect().height + this.retry.getBoundingClientRect().height) + 20;
      document.documentElement.style.setProperty("--expansion-save-ui-height", `${height}px`);
    });
    observer.observe(this.status);
    observer.observe(this.reload);
    observer.observe(this.retry);
    this.setOpen(this.open);
  }

  get choiceOpen(): boolean { return this.open; }

  refreshChoice(): void {
    this.setOpen(this.options.saves.save.checkpoint !== null || this.options.saves.status === "invalid");
  }

  closeChoice(): void {
    this.setOpen(false);
    this.options.canvas.focus();
  }

  updateStatus(checkpointError: boolean): void {
    const message = this.message(checkpointError);
    if (this.status.textContent !== message) this.status.textContent = message;
    const cloud = this.options.cloudStatus?.() ?? "guest";
    this.reload.hidden = this.options.saves.status !== "conflict" && cloud !== "blocked";
    this.retry.hidden = this.open || !["error", "pending"].includes(cloud) || this.options.saves.status === "conflict";
    const busy = this.options.isBusy?.() ?? false;
    for (const element of this.options.background) element.inert = this.open || busy;
    // Child panels own their disabled state (release latch, pending requests).
    // Block the overlay as a whole during cloud operations without enabling
    // those controls again when syncing finishes.
    this.options.overlay.inert = busy;
    if (this.wasBusy && !busy && this.open) this.options.overlay.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    this.wasBusy = busy;
  }

  message(checkpointError: boolean): string {
    const { saves } = this.options;
    if (saves.status === "conflict") return "Another tab changed this browser save. This run is not saving. Reload saved data to use that version.";
    if (saves.status === "invalid") return "The previous browser save could not be read. Choose whether to discard it.";
    if (saves.status === "unavailable") return "Browser storage unavailable. Latest progress is in memory only and may be lost on reload. Cloud sync is not confirmed.";
    if (checkpointError || saves.status === "checkpoint-error") return "The latest wave could not be saved. Any earlier checkpoint is retained; this run is still playable.";
    const checkpoint = saves.save.checkpoint;
    const cloud = this.options.cloudStatus?.() ?? "guest";
    const prefix = this.options.syncDeferred?.() ? "Cloud sync queued for the next saved wave boundary."
      : cloud === "checking" ? "Checking this account’s cloud save…"
      : cloud === "syncing" ? "Saving to cloud…"
      : cloud === "synced" ? "Account cloud save up to date."
      : cloud === "pending" ? "Saved locally for this account. Cloud sync pending."
      : cloud === "blocked" ? "Cloud restore could not be applied safely. Local data kept; cloud writes stopped. Reload saved data before retrying."
      : cloud === "error" ? "Cloud sync not confirmed. Local progress kept; retry when online. If sign-in expired, sign in again."
      : "Guest · Browser only. Sign in through Nexus for a separate account save.";
    if (checkpoint) return `${prefix} Level ${checkpoint.replay.level}, Wave ${checkpoint.completedWaves + 1} build saved. Later changes save after the next completed wave.`;
    return `${prefix} Resume saves after each completed wave, not during combat.`;
  }

  /** True consumes the overlay slot; background game controls stay inert. */
  renderChoice(): boolean {
    if (!this.open) return false;
    const { overlay, saves, levelId, onResume, onStartNew, onLevelSelect } = this.options;
    overlay.hidden = false;
    const key = `save-choice:${this.options.cloudStatus?.() ?? "guest"}:${this.options.isBusy?.() ?? false}`;
    if (overlay.dataset.overlayKey === key) return true;
    overlay.dataset.overlayKey = key;
    const panel = document.createElement("section");
    panel.className = "overlay-panel terminal-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "save-choice-title");
    const title = document.createElement("h2");
    title.id = "save-choice-title";
    title.className = "overlay-title";
    title.textContent = saves.status === "invalid" ? "SAVE COULD NOT LOAD" : "RESUME YOUR DEFENSE";
    const detail = document.createElement("p");
    const checkpoint = saves.save.checkpoint;
    const cloudStatus = this.options.cloudStatus?.() ?? "guest";
    const scope = cloudStatus === "guest" ? "Stored in this browser only."
      : cloudStatus === "synced" ? "Account cloud copy confirmed."
      : "Cloud sync is not yet confirmed.";
    detail.textContent = checkpoint
      ? `Level ${checkpoint.replay.level} · ${checkpoint.completedWaves}/5 waves cleared. Resume at the Wave ${checkpoint.completedWaves + 1} build phase. Changes made after that checkpoint are not saved. ${scope}`
      : "The stored save is unreadable. It has not been overwritten. You can discard it and start a new run, or return to level select.";
    const actions = document.createElement("div");
    actions.className = "terminal-actions";
    if (checkpoint) actions.append(action(checkpoint.replay.level === levelId ? `RESUME WAVE ${checkpoint.completedWaves + 1}` : `OPEN SAVED LEVEL ${checkpoint.replay.level}`, onResume, true));
    actions.append(action(`DISCARD SAVE · START LEVEL ${levelId}`, onStartNew), action("LEVEL SELECT", onLevelSelect));
    panel.append(title, detail, actions);
    overlay.replaceChildren(panel);
    for (const button of actions.querySelectorAll<HTMLButtonElement>("button")) button.disabled = this.options.isBusy?.() ?? false;
    if (!this.options.isBusy?.()) actions.querySelector<HTMLButtonElement>("button")?.focus();
    return true;
  }

  handleKey(event: KeyboardEvent): boolean {
    if (!this.open) return false;
    if (event.key === "Tab") {
      const buttons = [...this.options.overlay.querySelectorAll<HTMLButtonElement>("button")];
      if (buttons.length) {
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        event.preventDefault();
        buttons[nextDialogFocusIndex(index, buttons.length, event.shiftKey)]?.focus();
      }
    }
    return true;
  }

  private setOpen(open: boolean): void {
    this.open = open;
    for (const element of this.options.background) element.inert = open || (this.options.isBusy?.() ?? false);
    this.options.overlay.dataset.overlayKey = "";
  }
}

function action(label: string, callback: () => void, primary = false): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `neon-button neon-button-${primary ? "primary" : "secondary"}`;
  button.textContent = label;
  button.addEventListener("click", callback);
  return button;
}
