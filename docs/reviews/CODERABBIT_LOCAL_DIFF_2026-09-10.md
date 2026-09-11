# Authorized local-diff CodeRabbit review

The owner explicitly authorized sending this game's diff to CodeRabbit.
`coderabbit review --agent --uncommitted --include-untracked --base main`
completed successfully with 14 findings. This was a local CLI review, not a
GitHub push, PR approval, or merge. Findings were evaluated against the game
contract rather than applied mechanically.

| Finding | Disposition and evidence |
| --- | --- |
| Global r2 identity loses r1 replay compatibility | Fixed with retained revision manifests, explicit revision/level/hash dispatch and preserved input revision; `verify:expansion-revisions`. |
| Complete all six chapters before any chapter is available | Rejected: directly conflicts with the approved three-chapter milestone and one-chapter-at-a-time delivery. Unauthored chapters remain unavailable. |
| Sapper teaching copy omits fallback and overstates four hits | Fixed: reachable Firewall priority, hardware/Core fallback, and up to four orthogonal neighbors are explicit. |
| Splitter uses the grid from before a Sapper death | Fixed; both ID orders and reversed arrays tested in `verify:expansion-sim`. |
| Spacing comparison changes cost/formation as well as spacing | Replaced as primary evidence by an equal-29-BW controlled experiment with identical attacks and kill timing. Historical comparison is labeled general build regression. |
| Missing diagonal pulse exclusion test | Added to the production Sapper tests. |
| Fast repair bot is not human-paced balance evidence | Added three-tick and six-tick action/observation policies, full command logs, replay equality and no-action controls. Old fast report is only deterministic solvability. |
| Missing Chapter 2 unlock boundary at Levels 5/6 | Added both boundary assertions. |
| Mechanic label does not guarantee Sapper content | Added an assertion for actual weighted or scripted Sapper spawns. |
| Source approval is represented as contextual approval | Corrected machine metadata and docs: source/integration authorization is recorded, desktop/mobile owner acceptance remains false. |
| Cadence test misses the stationary first tick | Added explicit elapsed-one-tick exclusion before elapsed-two-tick movement. |
| Sapper specification status is stale | Split historical lab/source approval from current production contract and pending contextual acceptance. |
| Guided plans include illegal perimeter trap positions | New primary paced-plan registry validates bounds, perimeter, Core/void and conflicting placements; malformed plans fail. Historical hashes stay frozen and limitations are documented. |
| Earlier review defects require code fixes, not just new hashes | Restored frozen generic target ordering and updated death-grid behavior, with failure-first regression tests. Existing solvability hashes remain unchanged because those sampled runs do not exercise the defects. |

Detailed simulator and balance evidence is in
`CHAPTER_02_REVIEW_DISPOSITION.md`. Subsequent Chapter 3 and Blender additions
require a fresh final diff review; this record is not approval of later code.
