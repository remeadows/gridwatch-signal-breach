import { accountKit, onSaveOwnerChange, saveOwner } from "./account";
import { ExpansionPendingScores } from "./expansionPendingScore";
import { expansionScoreApi } from "./expansionScoreApi";
let storage: Storage | null = null;
try { storage = window.localStorage; } catch { /* Optional score persistence. */ }
export const expansionPendingScores = new ExpansionPendingScores(storage, {
  owner: saveOwner, session: () => accountKit.getSession(), submit: expansionScoreApi.submit,
});
onSaveOwnerChange(() => expansionPendingScores.invalidate());
