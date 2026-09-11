# Chapter 3 content and paced-input disposition

Date: 2026-09-10. Scope: the local three-chapter, fifteen-level milestone.
This is deterministic content/replay evidence, not physical-phone, visual,
subjective-fun, publication, or deployment acceptance.

## Authored progression

Chapter 3 contains five fresh 8x8 starts and exactly five waves per level.
Each initial Source-to-Core route is live. The six-tool dock is Relay, Firewall,
normal ICE, Arc ICE, Scrubber, and Sell; no earlier chapter unlocks were changed.

- Level 11, LINK BREAK: a Drone and Probe enter the only two north gates together.
  A production-simulation check on all four seeds proves the living shield link
  exists before movement, rather than relying on an injected tutorial scene.
- Level 12, ARC TURN: the turning route and approach pockets teach the distinction
  between three-tile first-target reach and two-tile chain jumps.
- Level 13, TWIN CANOPY: northern and southern approaches require coverage in
  separate zones, with two available routing branches around the blocked center.
- Level 14, FUSE FIELD: Shield Drones and Sappers combine coverage and spacing.
- Level 15, SHIELD FRONT: shield focus, route recovery, Sapper spacing, and later
  scripted Goliaths combine. Copy does not claim Goliaths absorb other targets' hits.

Enemy counts, active limits, and cadence are authored per wave. Grants are
explicit; there is no hidden additive income adjustment. Teaching stays calm:
preparation is untimed and the fastest cadence is five simulation ticks.

## Evidence and pacing model

The same finite-plan policy used for Chapters 1–2 now supports Arc ICE. All plan
coordinates are validated before simulation, including initial-tile conflicts,
unavailable tools, void/Source/Core, cross-tool overlaps, and perimeter trap
restrictions. Normal play permits at most one intended live placement every
three ticks, using an observation three ticks old; stress uses six ticks for
both intervals. At the configured 350 ms tick, these are nominal 1.05 s and
2.10 s action/observation intervals. Prep visits a finite authored list without
advancing time. The policy knows the formation and remembers its own commands.

| Chapter | Normal clears | Stress clears | No-action losses | Exact winning replays |
| --- | --- | --- | --- | --- |
| 1, Levels 1–5 | 20/20 | 19/20 | 20/20 | 39/39 |
| 2, Levels 6–10 | 20/20 | 17/20 | 20/20 | 37/37 |
| 3, Levels 11–15 | 20/20 | 20/20 | 20/20 | 40/40 |
| Total | 60/60 | 56/60 | 60/60 | 116/116 |

Every win replays through `replayExpansionRun` and compares the complete final
state and score. Three retained JSON files under `docs/fixtures/` are named
`expansion-1-r3-chapter-{1,2,3}-human-evidence.json`. They contain all 120 paced
runs, full command logs (including rejected intended commands), per-wave
metrics, successful placements by type, final wave, hashes, and 60 no-action
baselines. There are no Chapter 3 stress failures. Existing stress failures
remain Level 2 charlie at W5 and Level 10 alpha/bravo at W5, delta at W4.

| Level | Mean active ticks, normal / stress | Nominal active minutes, normal / stress | Minimum integrity, normal / stress | Final BW range, normal / stress |
| --- | --- | --- | --- | --- |
| 11 | 687.25 / 687.25 | 4.01 / 4.01 | 180 / 180 | 238–267 / 238–267 |
| 12 | 742 / 742 | 4.33 / 4.33 | 180 / 180 | 290–291 / 290–291 |
| 13 | 799.25 / 789.5 | 4.66 / 4.61 | 180 / 180 | 235–278 / 245–278 |
| 14 | 881.5 / 882 | 5.14 / 5.15 | 172 / 169 | 88–149 / 74–178 |
| 15 | 952.5 / 951 | 5.56 / 5.55 | 135 / 120 | 3–179 / 6–179 |

Times are simulated active time at nominal tick duration. They exclude all
preparation, pauses, browser scheduling, and human deliberation; they are not
measured device timings or a guaranteed session length.

## Economy tuning and actual role use

The initial draft gave every tested run full final integrity and excessive
reserves. Only Chapter 3 grants were reduced; enemy counts, cadence, mechanics,
and Chapters 1–2 were not retuned. One overly tight trial left Level 15 delta
unable to scrub/rebuild at the end of W1 (19/20 enemies neutralized, 5–7 BW).
Restoring 24 initial BW fixed that concrete recovery cliff. Final initial grants
are 120/126/132/140/172; later grants are 44–74 BW.

The final tests actually place both weapons. At normal pace, each seed builds
five or six Arc units and three additional normal ICE in Levels 11–13. Level 14
requires 8–11 Arc placements and 0–4 relay replacements; Level 15 requires 8–13
Arc placements, 10–14 relay replacements, and 4–7 Scrubbers per run. Counts include
replacements and exclude initial hardware. Thus the finale exercises recovery,
not just a starting formation. Its final integrity is 180/180/180/148 at normal
pace and 157/180/180/180 at stress pace. Slower inputs need not always score
lower: sampling timing can select different lawful repairs.

No further enemy inflation or forced Core damage was added merely to make an
optimized known-plan policy look challenged. Early levels deliberately remain
safe when the taught formation is used correctly. This does not establish
that every real player will find the chapter easy, fun, or increasingly hard.

## Difficulty proxy boundary

Global authored difficulty indices still increase: 545, 590, 640, 700, 770.
The unchanged v2 numerical pressure model is required to rise within a chapter,
not across a new mechanic's introductory reset. Chapter 3 budgets are
8196, 9247, 10162, 13142, 15184; Level 10 ends at 12018.

That deliberate Level 10→11 decrease gives room to learn shields. The proxy
does not model Shield Drone aura protection or Arc effectiveness, so no invented
shield-pressure coefficient was added to force a smooth curve. Chapter 1–2
metric definitions/results remain historical. Pure production counter tests,
actual role use, delayed-input results, and eventual owner playtesting supplement
the proxy; it is not a measurement of perceived difficulty.

## Reproduction and compatibility

Generate retained logs with:

```sh
node scripts/generate-expansion-human-evidence.mjs --chapter 1
node scripts/generate-expansion-human-evidence.mjs --chapter 2
node scripts/generate-expansion-human-evidence.mjs --chapter 3
node scripts/run-typescript.mjs scripts/verify-chapter03-human-balance.ts
```

The verification command proves the authored visible pair, all twenty normal
clears, all twenty no-action losses, actual Arc placements, five-wave wins,
exact replays, and exact equality to the retained Chapter 3 evidence. Stress
results are reported honestly rather than required to fail.

- Current r3 campaign hash:
  `df1b0920da63f189bd7c83f745b4a511877db6162f3f92f47ee0afdc0eb58957`.
- Current Level 15 hash:
  `3ee45632978317eae12d8fae7b88f72c1d6d1905e124a7437f81e1e9048a1ec6`.
- Canonical Chapter 3 human evidence hash:
  `b2d75ab388c7faac5ce1bf460df2ffdd270456d0e86fbf412157a448afc545bf`.
- Canonical Chapter 1 human evidence hash:
  `5b622dbf0de29710d79f7dde78993ef9297a171813f7fe79c7dfef54b8b0e127`.
- Canonical Chapter 2 human evidence hash:
  `7ccee9cfc1a4ba5a5c120123d2c44253e08de42c2e62507c0a2e528ef7356e21`.

All three retained fixtures were regenerated after Arc continuation events gained
the optional `sourceIntrusionId` visualization field. The Chapter 3 evidence
hash and all reported outcomes, pacing, scores, and exact replay checks remained
unchanged. This does not claim that intermediate visualization events are
unchanged; the field identifies the previous target for a continuation beam.

A read-only esbuild comparison against local checkpoint `512d096` imported
the committed TypeScript/JSON through `git show` and ran all eighty earlier
paced scenarios. Commands, scores, grids, events, and complete states matched
after normalizing only additive `contentRevision` metadata. Both historical
fast-bot hashes also pass unchanged. The current earlier-chapter human matrix
still yields 40/40 normal, 36/40 stress, and 76 exact replayed wins.

## Remaining acceptance

Physical-phone play, desktop/mobile contextual Blender asset approval, visual
clarity of shield links and Arc chains, browser performance, and subjective
fun remain separate acceptance gates. These numerical results do not authorize
GitHub publication, production deployment, or changes to the shared leaderboard.
