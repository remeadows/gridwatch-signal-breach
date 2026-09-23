# Expansion r4 local review — 2026-09-11

Scope: local diff from `b77203f` on `codex/expansion-25-local`. The owner
authorized sending this game's diff to CodeRabbit, not GitHub publication.
The approved contract is exactly three chapters, 25 levels split 8 / 8 / 9,
and five waves per level. See `../EXPANSION_25_LOCAL_PLAN.md`.

## CodeRabbit review evidence

The initial full CLI review completed with 11 findings. A second full upload
was rejected as `payload_too_large`; that attempt is not a successful review.
Follow-up reviews scoped to `src` and `scripts` both completed, with seven and
five findings respectively. These local reviews are not GitHub approvals,
resolved PR conversations, or green required status checks.

A final uncommitted-source review, supplied with the clarified current plan,
completed with one finding: equal-specificity result styles could override
the native `hidden` rule. Moved the hidden rule after those states so hiding
remains authoritative, preserving the verified visible layout. This finding
was fixed and the production build and fallback/canvas checks rerun.

Initial review dispositions:

| Finding | Disposition |
| --- | --- |
| Heading spacing in old goal plan, CONTEXT and SKILLS (3) | Fixed all three missing blank lines. |
| Repeated progress limits | Introduced named current/retained limits without changing migration behavior. |
| Change “owner” to “player” in generated evidence | Rejected: it correctly distinguishes simulated wins from owner acceptance; retained terminology stays consistent. |
| Numeric ordering of new human plans | Reordered explicit entries without altering plans. |
| Untyped inline generator implementation | Moved generation into checked TypeScript entry points; both generators share definition/hash validation. |
| Hardcoded retained revision defaults | Use `EXPANSION_R3_CONTENT_REVISION`; historical defaults remain pinned. |
| Repeated retained-helper imports | Consolidated imports. |
| Inline common wave defaults | Extracted immutable defaults; all hashes/evidence remain identical. |
| Alleged duplicate `blocked` declaration | False positive: exactly one declaration exists; tools typecheck and blocked-storage tests pass. No test removed. |

Source follow-up dispositions:

- Five findings request restoring 30 levels/six chapters, including changing
  the progress cap, adding Levels 26–30, and reverting campaign copy. Rejected:
  each contradicts the owner's latest explicit approval. Historical rulesets
  remain retained; their existence does not define the new r4 layout.
- Two findings duplicate the request to runtime-freeze the current level
  registry. Accepted as a small integrity hardening; retain readonly typing
  and test that the registry is frozen, without changing content or ordering.

All five script follow-up findings likewise request 30 levels/six chapters
in plans, evidence imports or assertions. Rejected for the same scope reason.
Authoritative AGENTS/CONTEXT/SKILLS lead sections have been synchronized to the
25-level approval so a future executor does not encounter conflicting targets.

## Independent Codex findings

- Wide phone landscape above the original 760px breakpoint overflowed.
  Added expansion-only three-column layouts through 1100px at short heights.
- The launch bar obscured the top grid row at small sizes. Drawing and pointer
  mapping now share CSS-space top/bottom reserves; all 384 tested tile centers
  round-trip correctly. The original campaign's geometry is untouched.
- The 700→701 portrait breakpoint unnecessarily shrank the board. Extended
  compact portrait controls through 820px, with both breakpoint edges checked.
- The fallback rendering mock lacked the canvas DOM rectangle required by
  the new metrics. Updated only the mock and reran the full fallback verifier.
- Actual finale completion exposed an unanchored results panel: expansion did
  not invoke the original builder that assigns the overlay-root class. Added
  expansion-scoped root/result overlay styling, including safe scrolling at
  short heights. Verified the real win panel and no Level 26 action.
- Historical test helpers needed explicit r3 selection after r4 activation.
  Retained fixtures and original backend validator bytes were not regenerated
  to conceal mismatches.

## Release boundary

No production deployment, GitHub push, DB migration, Edge Function deployment,
token extraction, or leaderboard submission occurred. The 21 Blender families
remain a local candidate with `ownerApproved: false`. Owner art/fun acceptance
and physical-phone performance are separate from browser viewport checks.
