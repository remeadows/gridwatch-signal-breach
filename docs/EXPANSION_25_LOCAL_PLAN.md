# Expansion r4: three chapters, 25 levels

## Approved end state — 2026-09-11

The owner confirmed **25 total levels split 8 / 8 / 9**, five waves per level
(125 waves). Finish with a tested local playable build and consistent Blender
CLI-authored grid/hardware/enemies. CodeRabbit may receive the local diff.
No GitHub push, deployment, database write or release approval is implied.

This supersedes the older six-chapter/30-level roadmap and the completed
15-level local milestone for new work only. Original V2 stays three sectors and
twelve waves. Existing expansion r1/r2/r3 content, logs and progress remain valid.

## ADR: revision-scoped content and progress

Context: inserting levels inside chapters changes the meaning of numeric IDs.
The current simulator looks up a level in the current list even for old replays.

Decision: retain r1/r2/r3 registries and hashes; publish the new local layout as
`expansion-1-r4`. Resolve state by `(contentRevision, levelId)` before simulation.
Do not change `expansion-v1` mechanics. Reject unknown revisions and levels not
authored in the requested revision. Never edit retained evidence to make it pass.

Rejected alternatives: renumbering old definitions breaks saved runs; six
chapters contradicts the owner; adding new mechanics expands scope needlessly.

Progress uses `gridwatch.expansion-1.r4.progress.v1`, independent of the historical
root. Import earned access once: old 1–5 → 1–5, 6–10 → 9–13, 11–15 → 17–21.
Only previously cleared boards are marked cleared. Intermediate inserted levels
may be accessible, but are never auto-completed. Old next-level access 16 maps to
22; unsupported old future IDs do not invent completion. Never write old keys.
New progress caps at 25; invalid clears are ignored. Storage failures cannot stop
play. A valid r4 record takes precedence over later changes in historical storage.

Tradeoff: retained content and tests consume space, but give independently
verifiable compatibility. The new revision changes default seeds/hashes for
remapped levels; historical seeds/configurations remain exact.

## Scoped local checkpoints

1. Revision lookup and progress isolation, migration/boundary tests.
2. Latency Front: levels 1–8, retain five board designs, author three additional
   layouts/wave schedules and finite human build plans.
3. Demolition Front: levels 9–16, retain five designs, author three more.
4. Shield Front: levels 17–25, retain five designs, author four more and a finale.
5. Activate r4 navigation/progress, exact content manifest and full evidence.
6. Full Blender CLI rerender/provenance check of all 21 existing families,
   board-scale visual checks, production build, desktop/mobile browser checks.
7. CodeRabbit diff review; fix actionable findings, rerun affected gates, local
   commits and handoff. Owner/device subjective acceptance is separately pending.

Each chapter must have distinct additional geometry, authored five-wave pacing,
working initial signal routes, finite legal build plans, readable briefings and
strictly increasing within-chapter threat budgets. New chapters introduce their
counter at gentler traffic. No persistent units, bandwidth or damage across levels.

## Acceptance evidence

- Exactly 3 chapters / 25 levels / 125 waves and no unavailable chapter placeholders.
- 100 normal-policy runs (four seeds per level); all win and replay exactly.
  Report 100 delayed-input stress runs honestly; investigate failures, do not
  equate automated policy success with fun or physical-device performance.
- 100 no-action controls lose. Retain exact winning logs and per-wave metrics.
- Existing 116 r3 wins and 115 r1/r2 equivalence checks remain valid. Original
  validator bundle stays byte-identical; no shared leaderboard/backend edits.
- Progress reload, malformed/blocked storage, migration idempotency, 8→9,
  16→17 and terminal 25 (no 26) are tested.
- Blender generator/rig/source/master/runtime lineage verifies in full. Keep
  `ownerApproved: false` until owner contextual approval; release gate stays closed.
- Browser evidence includes menu, selection, route/build/launch, guide pause,
  loss/retry, chapter boundaries and completion. Cover 390×701 plus existing
  desktop/portrait/landscape breakpoint matrix with no hidden critical controls.
- No GitHub push or deployment. Preview uses 4391; reserve 4392/4393 for this
  game's phone/built previews. Never take ports 4175/4176/4177/4185 from other games.

## Local delivery checkpoint

Completed 2026-09-11 through local integration `f452bd3`, after separate
foundation/chapter checkpoints and full Blender rebuild `27c9a03`. See
`EXPANSION_R4_LOCAL_ACCEPTANCE.md` for measured results and
`reviews/EXPANSION_R4_LOCAL_REVIEW.md` for all review dispositions. Owner
gameplay-scale art/fun and physical-device acceptance remain explicit next
steps, not assumed consequences of the engineering checks.
