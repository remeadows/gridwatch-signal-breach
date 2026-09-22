/** Reconnection must not replace unfinished combat or an edited build phase.
 * Finish the wave first, capture its checkpoint, then reconcile that payload. */
export function mayReconcileExpansionSave(phase: "prep" | "active" | "won" | "lost", unsavedRunChanges: boolean): boolean {
  return phase !== "active" && !(phase === "prep" && unsavedRunChanges);
}
