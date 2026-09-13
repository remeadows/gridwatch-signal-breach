# Playable local checkpoint review — 2026-09-13

## Scope and boundary

Browser-only guest save/resume integration on top of the reviewed save foundation.
No auth initialization, Supabase calls, leaderboard submission, public activation,
database migration or deployment. The optional cloud sync controller and RPCs are
not connected in this package. Guest data is never implicitly assigned to an account.

## CodeRabbit review

CodeRabbit CLI 0.7.6, authenticated owner Team seat, reviewed the uncommitted
implementation plus untracked source/tests. First pass: eight files, two findings.

1. **Minor — verification count in handoff:** clarified the historical dependency
   merge had 25 verifiers and the new package has 26, including run-session and
   chapter03-human. Both snapshots now carry explicit counts.
2. **Trivial — read back storage after writing to set the stale-tab baseline:**
   not applied. The save value is canonical and deeply frozen before both the
   actual write and the baseline serialization, so those bytes are identical.
   A post-write read can observe another tab's intervening update and adopt its
   bytes while retaining our older in-memory data, allowing a subsequent overwrite.
   Added an explanatory comment and an interleaved-write regression proving the
   original baseline detects that case. This is best-effort stale-tab detection;
   cloud persistence must use the server CAS, not pretend localStorage is atomic.

Second pass: eleven files, four findings covering two distinct issues (each
reported twice). Both are corrected:

3. **Major — dual-writing clears after a canonical save failure:** removed the
   legacy clear write entirely. Level select now reads canonical guest save clears
   together with retained historical access. Added tests that a rejected stale-tab
   clear cannot appear in navigation and that new clears never write the old key.
4. **Major — save UI in the orchestration module:** moved save messages, reload
   controls, height measurement, resume/discard dialog state, inert background and
   focus handling into `src/ui/expansionSaveUi.ts`. The entrypoint coordinates its
   small API and owns gameplay/persistence actions.

Third pass: fourteen files, three findings covering two distinct minor issues.
Both are corrected:

5. Shift+Tab entering from outside the dialog controls should focus the last
   button. Corrected with a DOM-free focus-index helper and tests for outside
   focus, both wrap directions, middle buttons and empty lists.
6. Replaying after all 25 levels are cleared must not create a 26-element array
   before validation. Completion now goes through `clearLevel`, which deduplicates
   before saving and still clears the checkpoint. A completed-campaign replay
   regression passes. This finding was reported twice.

Fourth pass (lightweight): fifteen files, one major finding that a failed victory
save needs a retry path. Corrected with an explicit **Retry save** result action,
plus a regression that a transient storage failure can recover and persist the
clear. The suggested per-animation-frame retry was not adopted: it would repeatedly
hit unavailable storage and cannot resolve a genuine conflict. The flag is now
named `clearAttempted`, not `clearRecorded`; a failure is never labeled saved.
Conflicts retain an explicit reload-saved-data action.

Fifth pass (lightweight): all fifteen changed files reviewed, **zero findings**.
Final build, tools typecheck and all 26 verification scripts pass. Local review
is complete; this does not replace the protected GitHub PR gates for publication.

## Local inspection / corrections

- Rejected no-op commands do not consume the replay budget. Effective commands
  are copied, capped and retained through resume; exceeding the cap fails save/
  replay export explicitly without ending play.
- Invalid or empty stored bytes require explicit discard; storage failures remain
  memory-only. Another level's checkpoint requires a player choice before replacement.
- Low-effects toggles clear the URL override so a new preference survives reload.
- Browser testing found a tool-dock clipping regression at 528x782 when a conflict
  warning appeared. Save-message height is now included in the mobile board size;
  the final dock bottom is 769px within the 782px viewport. Landscape HUD can scroll.

## Verification

- Build, tools typecheck, all 26 `verify:*` scripts; unchanged original validator.
- 25 sessions / 100 persisted wave-boundary reloads, exact continued winning
  replays, settings/clear persistence, account-key isolation, invalid input,
  unavailable storage, bounded recording and stale-tab protection.
- Built localhost at 127.0.0.1:4393: real Wave 1 clear → reload → Wave 2 resume
  (23 bandwidth, 180 core, 2 neutralized), then Wave 2 clear → Wave 3 checkpoint.
- Continued that resumed browser run to a five-wave win: 180 core, 25 neutralized,
  100% signal uptime, local score 536. Level select shows the clear; reopening the
  level starts Wave 1 without offering the now-cleared checkpoint.
- Post-checkpoint sale → 37 bandwidth → reload resumes the saved 23, as specified.
- Different-level prompt preserves the existing saved level. Two real browser tabs
  detect a stale save and reload the newer checkpoint. No console errors observed.
- Viewports: 1280x900, 390x844, 320x700, 844x390 and 528x782. Modal focus trap,
  inert background, saved low-effects setting and visible controls checked.
- This is local Codex inspection and CodeRabbit CLI review, not independent GitHub
  approval, production cloud/auth evidence, or physical-phone acceptance.
