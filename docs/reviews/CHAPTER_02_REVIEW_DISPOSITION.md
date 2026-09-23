# Chapter 2 review disposition

Date: 2026-09-10. Scope: local Chapters 1-2 implementation and deterministic
evidence. This document does not approve publication or physical-phone visuals.

## Corrected findings

- Generic enemies again capture their targets once per tick. A regression on
  authored Level 5 terrain proves that a Goliath destroying ICE before a Hunter
  moves does not change the frozen Hunter destination. Sapper-specific target
  selection still uses the working grid.
- Splitter child placement uses the grid after earlier ID-ordered Sapper pulses.
  Authored Level 9 fixtures cover both death-ID orders, reversed input arrays,
  and input-grid immutability.
- Production Sapper tests cover remaining stationary after one tick, movement
  after two, strict Firewall priority, chew damage, orthogonal pulse damage,
  and diagonal exclusion. Core contact remains two damage per active tick;
  three consecutive contact ticks are tested. The lab's one-shot arrival is
  a simplified demonstration rather than the production persistence contract.
- Level 10 briefings now describe simultaneous Goliath and Sapper pressure.
  They no longer teach that a Goliath absorbs attacks intended for other enemies;
  ordinary ICE damages every intrusion in range. Numerical content is unchanged.

## CodeRabbit balance findings

The historical fast-bot report is retained as a deterministic solvability
regression, with its original two report hashes. Its final message explicitly
identifies that limited purpose. Its older clustered comparison is a general
build regression, not a controlled spacing experiment.

The new primary input-policy lane rejects structurally impossible plans before
simulation. It corrects perimeter trap positions, the historical Core/void
placements, and cross-tool overlaps in its own plan registry. Validator-negative
fixtures prove these errors fail rather than silently becoming no-op commands.
The historical fixture is not rewritten merely to produce a new green hash.

## Human-paced policy evidence

Command: `node scripts/run-typescript.mjs scripts/expansion-human-balance.ts`.
The reusable runner is `scripts/expansion-human-balance-lib.ts`; authored plans
are in `scripts/expansion-human-plans.ts`.

Each of Levels 1-10 uses seeds alpha, bravo, charlie, and delta. Preparation
visits a finite authored build list without advancing time. Active play permits
at most one intended placement every three ticks and uses an observation from
one interval earlier. The stress policy uses six ticks for both action interval
and observation delay. The policy remembers its own actions and uses known
strategy coordinates; it is not a model of every human player's decisions.

| Evidence | Result |
| --- | --- |
| Three-tick action/observation policy | 40/40 clears |
| Six-tick stress policy | 36/40 clears |
| Same-seed no-action baselines | 40/40 losses |
| Winning recorded command logs replayed | 76/76 exact final states and scores |
| Stress failures | Level 2 charlie at W5; Level 10 alpha/bravo at W5, delta at W4 |

Per-wave results retain final/minimum integrity, active ticks, signal uptime,
bandwidth, neutralizations, score, successful placements by type, and rejected
intended commands. Run results retain every command attempt, the recorded replay,
the final wave, command-log hash, and final-state hash. Console output is a
compact summary; callers can retain the full returned report for deeper analysis.

These results establish solvability under stated timing assumptions. They do
not establish actual owner wins, fun, a monotonically harder felt experience,
or rendering performance on a phone. No tuning was changed to eliminate the
stress failures.

Chapter 2 grants are now written as explicit per-wave values rather than a
hidden `+120` helper adjustment. The evaluated level definitions and hashes are
unchanged. These grants are retained because the slower policy proves they
support deliberate repairs, while no-action losses and stress failures retain
consequences; they are not claimed to prove final subjective difficulty.

## Controlled spacing evidence

The separate production-mechanic experiment uses exactly one ICE, one Firewall,
and one Relay in both formations: 29 BW each. The Sapper receives identical
four-point ICE hits on ticks 1-4 and dies at `(4,3)` on tick 4 in both cases.
Only the Relay position changes. The adjacent Relay is destroyed, while the
spaced Relay survives; Firewall and ICE outcomes are identical. This isolates
spacing without changing weapon coverage, total cost, or kill timing.

## Compatibility and content identity

- Frozen Chapter 1 balance hash:
  `1cf49097f34151cfe0fdae7ba837056753c3d591eb29fc80faed2ca18194fe5b`.
- Historical Chapter 2 solvability hash:
  `6c2c3d4a739d8b945bbf44a2ff0c237e65007fe77555533498d6bb21d3fd2690`.
- Regenerated r2 campaign hash after the prose-only Level 10 correction:
  `c8020a21a276d35837bc13766d38d611a2e9499b71a3836b8d3803cc4dbd4796`.
- Current Level 10 hash:
  `91284b14429bd25c626eea8e1925f2ff0b367fead03b0bd7a894cfc5a8782449`.
- All five r1 per-level hashes and the r1 campaign hash are unchanged. Local r1
  replay dispatch remains available; r1 rejects later levels. Expansion has not
  been released publicly, so this is not a claim about migrated production rows.

`node scripts/generate-expansion-content-report.mjs` regenerates the current
JSON fixture and prints current manifest values for explicit review. It refuses
to regenerate if frozen Chapter 1 definitions have changed and never rewrites
historical manifests. Verification then compares both the manifest and fixture.

Passed checks: content/report, expansion simulator, Sapper, Rusher, Latency Trap,
progress, retained expansion revisions, legacy phase4 replay, historical balance,
human-paced policy/replays, and tools typecheck. No unresolved simulator or
evidence-code findings are known within this bounded package.

## Remaining acceptance

Physical-phone play and contextual visual acceptance remain pending. Owner
desktop/mobile acceptance, the broader Blender visual work, and publication
authorization are separate from this numerical review. The Level 10 stress
results remain visible for that playtest rather than being represented as a
universal difficulty guarantee.
