# Expansion r4 local acceptance — 2026-09-11

Approved deliverable: three chapters / 25 standalone levels / 125 waves, split
8 / 8 / 9. This is local engineering evidence, not public release approval.

## Content and compatibility

- Campaign hash: `8396227a089752e59da3b197530829b91ae039eaeb128ae57209844c2f0838d4`.
- 100/100 normal-paced policy runs win (four seeds per level).
- 98/100 delayed-input stress runs win. The failures are Level 2 and Level 13,
  seed `charlie`, six-tick action interval, wave five. They are reported, not
  removed; normal policies and no-action controls use the same authored data.
- All 198 winning command logs replay exactly. All 100 no-action controls lose.
- Existing 116 r3 winning logs and 115 r1/r2 equivalence checks pass unchanged.
- Progress migration preserves old data, remaps earned board identities, and
  tests reload, malformed/blocked storage, 8→9 and 16→17 access, and terminal 25.
- Original validator SHA-256 remains
  `48a3ecf68be9d05e57ccabb2c90e335669a1a1808fbda814ac7ea81a952dafa6`.
  No diff in `supabase/`, `src/leaderboard/`, or retained chapter definitions.

## Blender provenance

Blender CLI fully rerendered all 21 existing families using the checked-in
generator, camera, materials and lighting rig. Each family has editable `.blend`
source, a master render, optimized runtime sprite and verified provenance.
The roster includes three chapter floors, all hardware and all existing enemies.
The full Blender verification, clear-margin boundary tests, contact-sheet build,
runtime asset verification and failed/pending-image fallback tests pass.

Combined runtime sprites: 1,058,037 bytes, below the 1,572,864-byte budget.
The candidate remains `ownerApproved: false`; automatic release approval was
not inferred from successful generation or tests.

## Browser checks

Development preview: `http://127.0.0.1:4391/`.
Compiled static preview: `http://127.0.0.1:4393/`.
Append `?expansion-nav=1` to start through the chapter menu. Direct level links
are local-only playtest conveniences; no server scoring is enabled.

The compiled build has no page console warnings/errors in the inspected run.
Menu checks show exactly three chapter cards and eight first-chapter levels.
The finale's mobile Field Guide loads all 14 relevant unit/enemy images, and
the board/picker/guide use the same Blender families.

| Viewport | Canvas CSS width | Document overflow | Off-screen buttons |
| --- | ---: | --- | --- |
| 320×568 | 256 | None | None |
| 375×667 | 355 | None | None |
| 390×700 | 374 | None | None |
| 390×701 | 374 | None | None |
| 390×820 | 374 | None | None |
| 390×821 | 374 | None | None |
| 430×932 | 414 | None | None |
| 568×320 | 296 | None | None |
| 667×375 | 351 | None | None |
| 844×390 | 366 | None | None |
| 932×430 | 406 | None | None |
| 1440×900 | 720 | None | None |

All canvases remain square. The board now reserves space for its launch bar
and bottom tactical readout; 384 tile-center tests verify pointer/render agreement.
At 390×701 the compact HUD preserves the larger board instead of shrinking at
the old 700px threshold. Mobile sprites still need physical-device evaluation.

Actual browser input verified free range preview (224 BW unchanged), Arc ICE
placement (204 BW), full build-phase sale (224 BW), launch, guide pause/resume,
low effects, a real no-build loss, and retry restoring 224 BW / 180 Core / wave
one / live signal. No injected simulation state or fabricated scoring was used.
Chapter-boundary gating has automated progress/navigation coverage; an owner
should still play through both boundaries on their physical phone.

The finale was also won through normal browser input across all five waves:
342 enemies neutralized, 180 Core, 86% signal uptime, local score 3746. Signal
relays were repaired after wave two and overlapping defenses added. The final
screen offers Retry and Level Select, not Level 26. Returning to the menu loads
nine Chapter 3 levels and marks Level 25 CLEARED from persisted progress.
That run exposed a results-panel positioning defect, corrected with an
expansion-specific fixed overlay; the real win controls then fit on desktop.
The compiled no-build loss subsequently verified result positioning at
320×568, 390×701, 568×320, 844×390 and 1440×900. At the shortest landscape
size the panel scrolls safely; its Level Select action was exercised and
returned to the campaign menu. This is deliberate modal scrolling, not a
clipped or unreachable result control.

## Checks and limits

All 28 commands in the local closeout suite passed: tools typecheck, build,
asset and fallback checks, original replays/balance/progress, all expansion
mechanic and revision checks, current content/geometry/evidence, retained
content/evidence, preview-host policy and canvas mapping. Dependency audit
reported zero vulnerabilities. `.env.example` is the only `.env*` file found.

Review dispositions are in `reviews/EXPANSION_R4_LOCAL_REVIEW.md`.
Still separate: owner gameplay-scale art approval, subjective fun/difficulty,
physical phone touch/performance/heat, and any GitHub/public release decision.
No push, deployment, DB migration or leaderboard submission was performed.
