import {
  accountState,
  currentEmail,
  currentHandle,
  onAccountChange,
  saveHandle,
  signIn,
  signOut,
} from "../leaderboard/account";
import type { SubmitResult } from "../leaderboard/api";
import { MAX_HANDLE_LENGTH } from "../leaderboard/config";

// "submit" mode requires the submission callback; "manage" mode forbids it.
export type AccountPanelOptions =
  | Readonly<{ mode: "submit"; onSubmit: () => Promise<SubmitResult> }>
  | Readonly<{ mode: "manage"; onSubmit?: never }>;

// Builds an auth-aware control that renders the right state — signed out (OAuth
// buttons), needs a handle (picker), or ready — and refreshes itself when the
// account changes. Self-unsubscribes once detached from the DOM.
export function createAccountPanel(options: AccountPanelOptions): HTMLElement {
  const root = document.createElement("div");
  root.className = "account-panel";

  let editingHandle = false;
  let submitted = false;
  let status: { text: string; kind: "info" | "error" | "success" } | null = null;

  const render = (): void => {
    if (root.dataset.mounted === "true" && !root.isConnected) {
      unsubscribe();
      return;
    }
    root.dataset.mounted = "true";
    root.innerHTML = "";

    const state = accountState();
    if (state === "loading" || state === "disabled") {
      root.append(line("Connecting to the uplink…"));
      return;
    }
    if (state === "signed-out") {
      renderSignedOut();
      return;
    }
    if (state === "needs-handle" || editingHandle) {
      renderHandlePicker();
      return;
    }
    renderReady();
  };

  function renderSignedOut(): void {
    root.append(
      line(
        options.mode === "submit"
          ? "Sign in to log your score on the leaderboard."
          : "Sign in to claim your operator handle.",
      ),
    );
    const actions = document.createElement("div");
    actions.className = "account-actions";
    actions.append(
      button("Sign in with Google", "primary", () => void signIn("google")),
      button("Sign in with GitHub", "secondary", () => void signIn("github")),
    );
    root.append(actions);
  }

  function renderHandlePicker(): void {
    const label = currentHandle() ? "Change your operator handle" : "Choose your operator handle";
    root.append(line(label));

    const row = document.createElement("div");
    row.className = "account-row";
    const input = document.createElement("input");
    input.type = "text";
    input.className = "account-input";
    input.maxLength = MAX_HANDLE_LENGTH;
    input.placeholder = "OPERATOR HANDLE";
    input.value = currentHandle() ?? "";
    input.setAttribute("aria-label", "Operator handle");

    const save = button("SAVE", "primary", async () => {
      save.disabled = true;
      setStatus("Saving…", "info");
      const result = await saveHandle(input.value);
      if (result.ok) {
        editingHandle = false;
        status = null;
        render();
      } else {
        save.disabled = false;
        setStatus(result.error, "error");
      }
    });

    row.append(input, save);
    root.append(row);
    if (currentHandle()) {
      root.append(button("Cancel", "secondary", () => {
        editingHandle = false;
        status = null;
        render();
      }));
    }
    appendStatus();
  }

  function renderReady(): void {
    const handle = currentHandle() ?? "operator";
    root.append(line(`Signed in as ${handle}` + (currentEmail() ? ` · ${currentEmail()}` : "")));

    if (options.mode === "submit") {
      const onSubmit = options.onSubmit;
      const submit = button(submitted ? "SUBMITTED" : "SUBMIT SCORE", "primary", async () => {
        if (submitted) return;
        submit.disabled = true;
        setStatus("Submitting run for validation…", "info");
        const result = await onSubmit();
        if (result.ok) {
          submitted = true;
          const placement = `Global #${result.globalRank} · Sector #${result.sectorRank}`;
          setStatus(
            result.improved
              ? `New best ${result.bestScore}! ${placement}.`
              : `This run: ${result.runScore}. Your best ${result.bestScore} stands — ${placement}.`,
            "success",
          );
          render();
        } else {
          submit.disabled = false;
          setStatus(result.error, "error");
        }
      });
      submit.disabled = submitted;
      root.append(submit);
    }

    const controls = document.createElement("div");
    controls.className = "account-controls";
    controls.append(
      linkButton("Change handle", () => {
        editingHandle = true;
        status = null;
        render();
      }),
      linkButton("Sign out", () => void signOut()),
    );
    root.append(controls);
    appendStatus();
  }

  function setStatus(text: string, kind: "info" | "error" | "success"): void {
    status = { text, kind };
    appendStatus();
  }

  function appendStatus(): void {
    let el = root.querySelector<HTMLElement>(".account-status");
    if (!el) {
      el = document.createElement("p");
      el.className = "account-status";
      root.append(el);
    }
    el.textContent = status?.text ?? "";
    el.dataset.kind = status?.kind ?? "info";
  }

  const unsubscribe = onAccountChange(render);
  render();

  // Stop listening once the panel is detached, even if no further account event
  // fires (the in-render guard only triggers on the next render).
  const detachObserver = new MutationObserver(() => {
    if (root.dataset.mounted === "true" && !root.isConnected) {
      detachObserver.disconnect();
      unsubscribe();
    }
  });
  detachObserver.observe(document.body, { childList: true, subtree: true });

  return root;
}

function line(text: string): HTMLElement {
  const p = document.createElement("p");
  p.className = "account-line";
  p.textContent = text;
  return p;
}

function button(
  label: string,
  variant: "primary" | "secondary",
  onClick: () => void,
): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `neon-button neon-button-${variant} account-button`;
  el.textContent = label;
  el.addEventListener("click", onClick);
  return el;
}

function linkButton(label: string, onClick: () => void): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "account-link";
  el.textContent = label;
  el.addEventListener("click", onClick);
  return el;
}
