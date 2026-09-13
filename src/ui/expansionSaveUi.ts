import type { ExpansionLocalSave } from "./expansionLocalSave";
import { nextDialogFocusIndex } from "./dialogFocus";

type SaveUiOptions = Readonly<{
  saves: ExpansionLocalSave;
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

  constructor(private readonly options: SaveUiOptions) {
    this.open = options.saves.save.checkpoint !== null || options.saves.status === "invalid";
    this.status = document.createElement("p");
    this.status.className = "expansion-save-status";
    this.status.dataset.saveStatus = "";
    this.status.setAttribute("role", "status");
    this.reload = action("RELOAD SAVED DATA", () => window.location.reload());
    this.reload.dataset.reloadSave = "";
    this.reload.hidden = true;
    options.hud.append(this.status, this.reload);
    // Reserve actual message height so long errors do not hide mobile build tools.
    const observer = new ResizeObserver(() => {
      const height = Math.ceil(this.status.getBoundingClientRect().height + this.reload.getBoundingClientRect().height) + 20;
      document.documentElement.style.setProperty("--expansion-save-ui-height", `${height}px`);
    });
    observer.observe(this.status);
    observer.observe(this.reload);
    this.setOpen(this.open);
  }

  get choiceOpen(): boolean { return this.open; }

  closeChoice(): void {
    this.setOpen(false);
    this.options.canvas.focus();
  }

  updateStatus(checkpointError: boolean): void {
    const message = this.message(checkpointError);
    if (this.status.textContent !== message) this.status.textContent = message;
    this.reload.hidden = this.options.saves.status !== "conflict";
  }

  message(checkpointError: boolean): string {
    const { saves } = this.options;
    if (saves.status === "conflict") return "Another tab changed this browser save. This run is not saving. Reload saved data to use that version.";
    if (saves.status === "invalid") return "The previous browser save could not be read. Choose whether to discard it.";
    if (saves.status === "unavailable") return "Browser storage unavailable. Latest progress is in memory only and will be lost on reload. Cloud saves are not connected yet.";
    if (checkpointError || saves.status === "checkpoint-error") return "The latest wave could not be saved. Any earlier checkpoint is retained; this run is still playable.";
    const checkpoint = saves.save.checkpoint;
    if (checkpoint) return `Browser only · Level ${checkpoint.replay.level}, Wave ${checkpoint.completedWaves + 1} build saved. Later changes save after the next completed wave.`;
    return saves.status === "saved" ? "Progress/settings saved in this browser only. Cloud saves are not connected yet." : "Browser only · Resume saves after each completed wave, not during combat.";
  }

  /** True consumes the overlay slot; background game controls stay inert. */
  renderChoice(): boolean {
    if (!this.open) return false;
    const { overlay, saves, levelId, onResume, onStartNew, onLevelSelect } = this.options;
    overlay.hidden = false;
    if (overlay.dataset.overlayKey === "save-choice") return true;
    overlay.dataset.overlayKey = "save-choice";
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
    detail.textContent = checkpoint
      ? `Level ${checkpoint.replay.level} · ${checkpoint.completedWaves}/5 waves cleared. Resume at the Wave ${checkpoint.completedWaves + 1} build phase. Changes made after that checkpoint are not saved. This save is on this browser only.`
      : "The stored save is unreadable. It has not been overwritten. You can discard it and start a new run, or return to level select.";
    const actions = document.createElement("div");
    actions.className = "terminal-actions";
    if (checkpoint) actions.append(action(checkpoint.replay.level === levelId ? `RESUME WAVE ${checkpoint.completedWaves + 1}` : `OPEN SAVED LEVEL ${checkpoint.replay.level}`, onResume, true));
    actions.append(action(`DISCARD SAVE · START LEVEL ${levelId}`, onStartNew), action("LEVEL SELECT", onLevelSelect));
    panel.append(title, detail, actions);
    overlay.replaceChildren(panel);
    actions.querySelector<HTMLButtonElement>("button")?.focus();
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
    for (const element of this.options.background) element.inert = open;
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
